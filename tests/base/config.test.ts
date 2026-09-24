import { join } from 'node:path'
import fs from 'fs-extra'
import { describe, expect, it } from 'vitest'
import { readConfig } from '../../src/base/config.js'
import { useTmpDir } from '../helpers/tmp-dir.js'

const newTmpDir = useTmpDir()

describe('readConfig', () => {
	it('reads .repo-ai.json when present', async () => {
		const dir = newTmpDir()
		fs.outputJsonSync(join(dir, '.repo-ai.json'), {
			agentUser: 'some-bot',
			requiredSkills: ['ai-loop'],
		})
		expect(await readConfig(dir)).toEqual({
			agentUser: 'some-bot',
			requiredSkills: ['ai-loop'],
			source: 'repo-ai.json',
		})
	})

	it('reads pollSeconds, floored at 60', async () => {
		const dir = newTmpDir()
		fs.outputJsonSync(join(dir, '.repo-ai.json'), { pollSeconds: 300 })
		expect((await readConfig(dir)).pollSeconds).toBe(300)
		fs.outputJsonSync(join(dir, '.repo-ai.json'), { pollSeconds: 10 })
		expect((await readConfig(dir)).pollSeconds).toBe(60)
	})

	it('falls back to .repo-tooling.json rules.aiLoop / rules.requiredSkills', async () => {
		const dir = newTmpDir()
		fs.outputJsonSync(join(dir, '.repo-tooling.json'), {
			rules: { aiLoop: { agentUser: 'legacy-bot' }, requiredSkills: ['ai-workflow'] },
		})
		expect(await readConfig(dir)).toEqual({
			agentUser: 'legacy-bot',
			requiredSkills: ['ai-workflow'],
			source: 'repo-tooling.json',
		})
	})

	it('accepts the flat pre-v4 aiLoop.agentUser fallback', async () => {
		const dir = newTmpDir()
		fs.outputJsonSync(join(dir, '.repo-tooling.json'), { aiLoop: { agentUser: 'flat-bot' } })
		expect((await readConfig(dir)).agentUser).toBe('flat-bot')
	})

	it('prefers .repo-ai.json over .repo-tooling.json when both exist', async () => {
		const dir = newTmpDir()
		fs.outputJsonSync(join(dir, '.repo-ai.json'), { agentUser: 'new-bot' })
		fs.outputJsonSync(join(dir, '.repo-tooling.json'), {
			rules: { aiLoop: { agentUser: 'old-bot' } },
		})
		expect(await readConfig(dir)).toEqual({
			agentUser: 'new-bot',
			requiredSkills: undefined,
			source: 'repo-ai.json',
		})
	})

	it('reports source "none" with neither file, or an empty rules block', async () => {
		expect((await readConfig(newTmpDir())).source).toBe('none')
		const dir = newTmpDir()
		fs.outputJsonSync(join(dir, '.repo-tooling.json'), {
			rules: { aiLoop: {}, requiredSkills: [] },
		})
		expect(await readConfig(dir)).toEqual({ source: 'none' })
	})

	it('ignores a blank agentUser and a non-string skill list', async () => {
		const dir = newTmpDir()
		fs.outputJsonSync(join(dir, '.repo-ai.json'), {
			agentUser: '  ',
			requiredSkills: 'not-an-array',
		})
		expect(await readConfig(dir)).toEqual({
			agentUser: undefined,
			requiredSkills: undefined,
			source: 'repo-ai.json',
		})
	})
})
