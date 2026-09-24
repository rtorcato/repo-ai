import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import chalk from 'chalk'
import { DEFAULT_POLL_SECONDS, readConfig } from '../../base/config.js'
import { type LoopTickResult, runLoopTick } from './loop-tick.js'

/**
 * `repo-ai loop watch` — poll `loop tick`'s work list every `pollSeconds` and
 * print one line only when its actionable part changes (#62). A tick is a full
 * LLM turn; a poll is a few `gh` calls, so the skill runs this under the
 * Monitor tool and each stdout line wakes the session.
 *
 * It inherits `loop tick`'s local writes: it removes worktrees whose PR landed
 * or closed, and reports them in `cleaned` so the next tick relabels them.
 *
 * Runs until killed. A halt prints once, until it clears. A poll with `errors`
 * or one that throws is skipped: a transient `gh` failure must neither kill the
 * watcher nor wake the session.
 */

export interface LoopWatchOptions {
	root?: string
	json?: boolean
	/** Test seams. */
	poll?: () => Promise<LoopTickResult>
	sleep?: (ms: number) => Promise<void>
	write?: (line: string) => void
	/** Stop after this many polls; unset runs forever. */
	polls?: number
}

/**
 * What a tick would act on. Content, not `idle`: a PR that stays blocked (a
 * `fixRounds` `block`) must not wake the session every poll, and a stall's
 * `minutes` grow every poll without anything new to do.
 */
export function actionable(r: LoopTickResult) {
	return {
		adopt: r.adopt,
		disarm: r.disarm,
		handoffs: r.handoffs,
		sendBacks: r.sendBacks,
		stripMergeReady: r.stripMergeReady,
		cleaned: r.cleaned,
		stalled: r.stalled.map(({ issue, pr, label, action }) => ({ issue, pr, label, action })),
		decay: r.decay,
		verdicts: r.verdicts,
		reviewsToSpawn: r.reviewsToSpawn,
		fixRounds: r.fixRounds.filter((f) => f.action === 'spawn'),
		// Only what a free slot would take; a queue longer than the slots is not news.
		pickups: r.pickups.slice(0, r.slots).map((p) => p.number),
	}
}

export async function runLoopWatch(options: LoopWatchOptions = {}): Promise<void> {
	const root = path.resolve(options.root ?? process.cwd())
	const poll = options.poll ?? (() => runLoopTick({ root }))
	const sleep = options.sleep ?? ((ms: number) => delay(ms))
	const write = options.write ?? ((line: string) => console.log(line))
	const seconds = (await readConfig(root)).pollSeconds ?? DEFAULT_POLL_SECONDS

	let last = ''
	let lastHalt: string | null = null
	for (let i = 0; options.polls === undefined || i < options.polls; i++) {
		if (i > 0) await sleep(seconds * 1000)
		let r: LoopTickResult
		try {
			r = await poll()
		} catch (err) {
			console.error(chalk.yellow(`poll failed: ${(err as Error).message}`))
			continue
		}
		if (r.halt) {
			if (r.halt !== lastHalt)
				write(
					options.json ? JSON.stringify({ halt: r.halt, exitCode: r.exitCode }) : `⚠halt: ${r.halt}`
				)
			lastHalt = r.halt
			continue
		}
		lastHalt = null
		for (const e of r.errors) console.error(chalk.yellow(e))
		// Partial lists would read as a change, so keep the last good baseline —
		// unless this poll removed worktrees, which no later poll reports again.
		if (r.errors.length > 0 && r.cleaned.length === 0) continue
		const work = actionable(r)
		const print = JSON.stringify(work)
		// Work draining away is not news; the next tick finds it gone anyway.
		const some = Object.values(work).some((l) => l.length > 0)
		if (print !== last && some)
			write(options.json ? JSON.stringify({ summary: r.summary, ...work }) : r.summary)
		last = print
	}
}

export async function loopWatchCommand(options: { root?: string; json?: boolean }): Promise<void> {
	await runLoopWatch(options)
}
