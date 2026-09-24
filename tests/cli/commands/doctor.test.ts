import { join } from 'node:path'
import fs from 'fs-extra'
import { describe, expect, it } from 'vitest'
import { runDoctor } from '../../../src/cli/commands/doctor.js'
import { useTmpDir } from '../../helpers/tmp-dir.js'

const newTmpDir = useTmpDir()

describe('runDoctor — loop config location', () => {
	it('flags drift when agentUser/requiredSkills still live in .repo-tooling.json', async () => {
		const dir = newTmpDir()
		fs.outputJsonSync(join(dir, '.repo-tooling.json'), {
			rules: { aiLoop: { agentUser: 'legacy-bot' } },
		})
		const results = await runDoctor(dir)
		expect(results).toContainEqual(
			expect.objectContaining({ check: 'Loop config', status: 'drift' })
		)
	})

	it('says nothing about loop config with .repo-ai.json in place', async () => {
		const dir = newTmpDir()
		fs.outputJsonSync(join(dir, '.repo-ai.json'), { agentUser: 'new-bot' })
		const results = await runDoctor(dir)
		expect(results.find((r) => r.check === 'Loop config')).toBeUndefined()
	})

	it('says nothing about loop config with neither file', async () => {
		const results = await runDoctor(newTmpDir())
		expect(results.find((r) => r.check === 'Loop config')).toBeUndefined()
	})
})
