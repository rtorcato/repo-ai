import { join } from 'node:path'
import fs from 'fs-extra'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FixerAbort } from '../../../src/base/fixer-abort.js'
import { runSetup, type StepRun, setupSteps } from '../../../src/cli/commands/setup.js'
import { useTmpDir } from '../../helpers/tmp-dir.js'

const newTmpDir = useTmpDir()

function repo(agentUser?: string): string {
	const dir = newTmpDir()
	if (agentUser)
		fs.writeJsonSync(join(dir, '.repo-tooling.json'), { rules: { aiLoop: { agentUser } } })
	return dir
}

/** Fake steps that record the order they ran in. */
function recorder(fail: Record<string, FixerAbort> = {}) {
	const ran: string[] = []
	const step =
		(name: string): StepRun =>
		async () => {
			ran.push(name)
			if (fail[name]) throw fail[name]
			return [`${name}-file`]
		}
	const steps = Object.fromEntries(
		['config', 'claude-skills', 'labels', 'ai-loop-identity', 'statusline'].map((n) => [n, step(n)])
	)
	return { ran, steps }
}

describe('setup', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {})
	})

	it('orders the steps and adds the identity step only with an agent user', () => {
		expect(setupSteps(undefined)).toEqual(['config', 'claude-skills', 'labels', 'statusline'])
		expect(setupSteps('bot')).toEqual([
			'config',
			'claude-skills',
			'labels',
			'ai-loop-identity',
			'statusline',
		])
	})

	it('runs every step under --yes, in order', async () => {
		const { ran, steps } = recorder()
		const results = await runSetup(repo('bot'), { dir: '.', yes: true }, { steps })
		expect(ran).toEqual(['config', 'claude-skills', 'labels', 'ai-loop-identity', 'statusline'])
		expect(results.every((r) => r.status === 'applied')).toBe(true)
	})

	it('skips a step the user declines', async () => {
		const { ran, steps } = recorder()
		const confirm = async (t: string) => t !== 'labels'
		const results = await runSetup(repo(), { dir: '.' }, { steps, confirm })
		expect(ran).toEqual(['config', 'claude-skills', 'statusline'])
		expect(results.find((r) => r.target === 'labels')?.status).toBe('skipped')
	})

	it('keeps going after a fixer aborts, and reports why', async () => {
		const abort = new FixerAbort('agent-identity-unavailable', 'not signed in', 'gh auth login')
		const { ran, steps } = recorder({ 'ai-loop-identity': abort })
		const results = await runSetup(repo('bot'), { dir: '.', json: true }, { steps })
		expect(ran).toContain('statusline')
		expect(results.find((r) => r.target === 'ai-loop-identity')).toEqual({
			target: 'ai-loop-identity',
			status: 'failed',
			error: 'agent-identity-unavailable',
			message: 'not signed in',
			hint: 'gh auth login',
		})
	})
})
