import os from 'node:os'
import path from 'node:path'
import chalk from 'chalk'
import { checkAgentUser } from '../../base/agent-user.js'
import { checkClaudeSkills, checkRequiredSkills } from '../../base/checks.js'
import { CONFIG_FILE, readConfig } from '../../base/config.js'
import { checkLoopLabels } from '../../base/labels.js'
import { checkStatusline } from '../../base/statusline.js'
import type { CheckResult } from '../../base/types.js'

/**
 * The loop's own audit — the four checks that used to ride along in
 * `repo-tooling doctor`, plus the statusline (#11). Same config file, same verdicts, same exit rule:
 * `drift` / `missing` fail, everything else is informational.
 */
export async function runDoctor(dir: string, skillsDir?: string): Promise<CheckResult[]> {
	const config = await readConfig(dir)
	const results = [
		await checkLoopLabels(dir),
		await checkAgentUser(dir, config.agentUser),
		await checkClaudeSkills(skillsDir),
		await checkStatusline(os.homedir()),
	]
	if (config.source === 'repo-tooling.json') {
		results.push({
			check: 'Loop config',
			status: 'drift',
			detail: `agentUser/requiredSkills still read from legacy .repo-tooling.json rules.aiLoop`,
			hint: `Move them to ${CONFIG_FILE} — repo-ai's own config, not repo-tooling's`,
		})
	}
	// Gated on agentUser: that key is the "this repo runs the pipeline" signal.
	const required = config.requiredSkills ?? []
	if (config.agentUser && required.length > 0) {
		results.push(await checkRequiredSkills(required, skillsDir))
	}
	return results
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
