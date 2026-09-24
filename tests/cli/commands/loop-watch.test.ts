import { join } from 'node:path'
import fs from 'fs-extra'
import { describe, expect, it } from 'vitest'
import type { LoopTickResult } from '../../../src/cli/commands/loop-tick.js'
import { runLoopWatch } from '../../../src/cli/commands/loop-watch.js'
import { useTmpDir } from '../../helpers/tmp-dir.js'

const newTmpDir = useTmpDir()

const tick = (extra: Partial<LoopTickResult> = {}) =>
	({
		halt: null,
		errors: [],
		summary: 'idle',
		slots: 6,
		...Object.fromEntries(
			['adopt', 'disarm', 'handoffs', 'sendBacks', 'stripMergeReady', 'cleaned', 'stalled']
				.concat(['decay', 'verdicts', 'reviewsToSpawn', 'fixRounds', 'pickups'])
				.map((k) => [k, []])
		),
		...extra,
	}) as unknown as LoopTickResult

async function watch(results: (LoopTickResult | Error)[]) {
	const lines: string[] = []
	const sleeps: number[] = []
	const queue = [...results]
	await runLoopWatch({
		root: newTmpDir(),
		polls: results.length,
		poll: async () => {
			const r = queue.shift()
			if (r instanceof Error) throw r
			return r as LoopTickResult
		},
		sleep: async (ms) => void sleeps.push(ms),
		write: (l) => lines.push(l),
	})
	return { lines, sleeps }
}

const review = tick({ summary: '1rev', reviewsToSpawn: [{ pr: 7, issue: 3, arm: 'code' }] })

describe('runLoopWatch', () => {
	it('prints the first poll only when it has work, then only on change', async () => {
		expect((await watch([tick(), tick()])).lines).toEqual([])
		const { lines, sleeps } = await watch([
			review,
			review,
			tick({ summary: '1ready', handoffs: [{ pr: 7, issue: 3, notes: false, autoMerge: false }] }),
		])
		expect(lines).toEqual(['1rev', '1ready'])
		expect(sleeps).toEqual([180_000, 180_000])
	})

	it('ignores a blocked fix round and a growing stall age', async () => {
		const blocked = (minutes: number) =>
			tick({
				summary: '⚠1blocked',
				fixRounds: [
					{ pr: 7, issue: 3, worktree: null, applications: 2, action: 'block', reason: 'cap' },
				],
				stalled: [
					{
						kind: 'implementer',
						issue: 4,
						pr: null,
						label: 'ai-wip',
						minutes,
						applications: 1,
						action: 'block',
						worktree: null,
						reason: `${minutes}min`,
					},
				],
			} as Partial<LoopTickResult>)
		expect((await watch([blocked(50), blocked(53), blocked(56)])).lines).toHaveLength(1)
	})

	it('prints a halt once, and survives a failed poll', async () => {
		const halt = tick({ halt: 'root is bare', exitCode: 1 })
		const erred = tick({ errors: ['gh pr list failed'] })
		const { lines } = await watch([halt, halt, new Error('boom'), erred, review, halt])
		expect(lines).toEqual(['⚠halt: root is bare', '1rev', '⚠halt: root is bare'])
	})

	it('reads pollSeconds from .repo-ai.json, floored at 60', async () => {
		const root = newTmpDir()
		fs.outputJsonSync(join(root, '.repo-ai.json'), { pollSeconds: 5 })
		const sleeps: number[] = []
		await runLoopWatch({
			root,
			polls: 2,
			poll: async () => tick(),
			sleep: async (ms) => void sleeps.push(ms),
			write: () => {},
		})
		expect(sleeps).toEqual([60_000])
	})
})
