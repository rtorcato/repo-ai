import os from 'node:os'
import path from 'node:path'
import chalk from 'chalk'
import fs from 'fs-extra'
import { checkAgentUser } from '../../base/agent-user.js'
import { checkClaudeSkills, checkRequiredSkills } from '../../base/checks.js'
import { checkLoopLabels } from '../../base/labels.js'
import { checkStatusline } from '../../base/statusline.js'
import type { CheckResult } from '../../base/types.js'
import { configuredAgentUser } from './loop-guard.js'

/**
 * The loop's own audit — the four checks that used to ride along in
 * `repo-tooling doctor`, plus the statusline (#11). Same config file, same verdicts, same exit rule:
 * `drift` / `missing` fail, everything else is informational.
 */
export async function runDoctor(dir: string, skillsDir?: string): Promise<CheckResult[]> {
	const agentUser = await configuredAgentUser(dir)
	const results = [
		await checkLoopLabels(dir),
		await checkAgentUser(dir, agentUser),
		await checkClaudeSkills(skillsDir),
		await checkStatusline(os.homedir()),
	]
	// Gated on agentUser: that key is the "this repo runs the pipeline" signal.
	const required = await requiredSkills(dir)
	if (agentUser && required.length > 0) results.push(await checkRequiredSkills(required, skillsDir))
	return results
}

async function requiredSkills(dir: string): Promise<string[]> {
	const raw = await fs.readJson(path.join(dir, '.repo-tooling.json')).catch(() => null)
	const names = raw?.rules?.requiredSkills
	return Array.isArray(names) ? names.filter((n): n is string => typeof n === 'string') : []
}

const ICON: Record<CheckResult['status'], string> = {
	ok: chalk.green('✓'),
	drift: chalk.yellow('⚠'),
	missing: chalk.red('✗'),
	'optional-missing': chalk.gray('○'),
	declared: chalk.blue('◇'),
}

export function printResults(results: CheckResult[]): void {
	for (const r of results) {
		console.log(`${ICON[r.status]} ${r.check}: ${r.detail}`)
		if (r.hint && r.status !== 'ok') console.log(chalk.dim(`   ${r.hint}`))
	}
}

export async function doctorCommand(options: {
	dir: string
	json?: boolean
	skillsDir?: string
}): Promise<void> {
	const directory = path.resolve(options.dir)
	const results = await runDoctor(directory, options.skillsDir)
	if (options.json) {
		console.log(JSON.stringify({ directory, results }, null, 2))
	} else {
		printResults(results)
	}
	process.exitCode = results.some((r) => r.status === 'drift' || r.status === 'missing') ? 1 : 0
}
