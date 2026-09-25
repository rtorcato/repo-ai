import { execFileSync } from 'node:child_process'
import { utimesSync } from 'node:fs'
import { join } from 'node:path'
import fs from 'fs-extra'
import { describe, expect, it } from 'vitest'
import { FixerAbort } from '../../src/base/fixer-abort.js'
import {
	checkStatusline,
	installedScript,
	installStatusline,
	shippedScript,
} from '../../src/base/statusline.js'
import { useTmpDir } from '../helpers/tmp-dir.js'

const newTmpDir = useTmpDir()
const settingsOf = (home: string) => join(home, '.claude', 'settings.json')

describe('statusline/ai-loop.sh', () => {
	const run = (dir: string) =>
		execFileSync('sh', [shippedScript(), dir], {
			encoding: 'utf-8',
			stdio: ['ignore', 'pipe', 'pipe'],
		})

	const status = (dir: string, text: string) =>
		fs.outputFileSync(join(dir, '.claude', 'ai-loop-status'), text)
	const inSeconds = (s: number) => Math.floor(Date.now() / 1000) + s

	it('prints the summary alone when no next tick is recorded (#94)', () => {
		const dir = newTmpDir()
		status(dir, '2wip·1rev\n12,14\n')
		expect(run(dir)).toBe('🤖 2wip·1rev')
	})

	it('counts down to the next tick', () => {
		const dir = newTmpDir()
		status(dir, `2wip·1rev\n\n${inSeconds(9 * 60)}\n`)
		expect(run(dir)).toBe('🤖 2wip·1rev · next 9m')
	})

	it('says the tick is due once its time has passed', () => {
		const dir = newTmpDir()
		status(dir, `idle\n\n${inSeconds(-120)}\n`)
		expect(run(dir)).toBe('🤖 idle · tick due')
	})

	it('prints nothing once the status is older than 35 minutes', () => {
		const dir = newTmpDir()
		const file = join(dir, '.claude', 'ai-loop-status')
		fs.outputFileSync(file, 'idle\n')
		const old = Date.now() / 1000 - 36 * 60
		utimesSync(file, old, old)
		expect(run(dir)).toBe('')
	})

	it('prints nothing without a status file', () => {
		expect(run(newTmpDir())).toBe('')
	})
})

describe('installStatusline', () => {
	it('installs the script and sets it as the statusline when none is configured', async () => {
		const home = newTmpDir()
		fs.outputJsonSync(settingsOf(home), { model: 'x' })
		const written = await installStatusline(home)
		expect(written).toEqual([installedScript(home), settingsOf(home)])
		expect(fs.readJsonSync(settingsOf(home))).toEqual({
			model: 'x',
			statusLine: { type: 'command', command: `sh "${installedScript(home)}"` },
		})
		expect(fs.statSync(installedScript(home)).mode & 0o111).not.toBe(0)
		expect((await checkStatusline(home)).status).toBe('ok')
	})

	it('leaves an existing statusline alone', async () => {
		const home = newTmpDir()
		const settings = { statusLine: { type: 'command', command: 'sh ~/.claude/mine.sh' } }
		fs.outputJsonSync(settingsOf(home), settings)
		expect(await installStatusline(home)).toEqual([installedScript(home)])
		expect(fs.readJsonSync(settingsOf(home))).toEqual(settings)
		expect((await checkStatusline(home)).status).toBe('optional-missing')
	})

	it('is a no-op the second time', async () => {
		const home = newTmpDir()
		await installStatusline(home)
		expect(await installStatusline(home)).toEqual([])
	})

	it('refuses to rewrite an unparseable settings file', async () => {
		const home = newTmpDir()
		fs.outputFileSync(settingsOf(home), '{ not json')
		await expect(installStatusline(home)).rejects.toBeInstanceOf(FixerAbort)
		expect(fs.readFileSync(settingsOf(home), 'utf-8')).toBe('{ not json')
	})
})

describe('checkStatusline', () => {
	it('is optional-missing with no statusline', async () => {
		expect((await checkStatusline(newTmpDir())).status).toBe('optional-missing')
	})

	it('accepts a hand-rolled segment that reads the status file', async () => {
		const home = newTmpDir()
		fs.outputFileSync(join(home, '.claude', 'mine.sh'), 'cat "$cwd/.claude/ai-loop-status"\n')
		fs.outputJsonSync(settingsOf(home), {
			statusLine: { type: 'command', command: 'sh ~/.claude/mine.sh' },
		})
		expect((await checkStatusline(home)).status).toBe('ok')
	})

	it('flags an out-of-date installed copy', async () => {
		const home = newTmpDir()
		await installStatusline(home)
		fs.appendFileSync(installedScript(home), '# edited\n')
		expect(await checkStatusline(home)).toMatchObject({
			status: 'optional-missing',
			detail: expect.stringContaining('out of date'),
		})
	})
})
