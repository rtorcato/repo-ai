import { join } from 'node:path'
import fs from 'fs-extra'
import { describe, expect, it } from 'vitest'
import { checkWorkflows } from '../../src/base/checks.js'
import {
	installWorkflow,
	SHIPPED_WORKFLOWS,
	stampWorkflow,
	workflowsDirFor,
} from '../../src/cli/generators/workflows.js'
import { useTmpDir } from '../helpers/tmp-dir.js'

const newTmpDir = useTmpDir()

const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor
const HOOKS = ['args', 'agent', 'parallel', 'pipeline', 'phase', 'log', 'budget', 'workflow']

function source(name: string): string {
	return fs.readFileSync(join(import.meta.dirname, `../../workflows/${name}.js`), 'utf8')
}

/**
 * The Workflow tool requires `meta` as a pure literal: evaluating it with no
 * scope at all throws on any variable, and `${` would be interpolation.
 */
function readMeta(script: string) {
	const match = script.match(/^export const meta = (\{[\s\S]*?\n\})\n/)
	if (!match?.[1]) throw new Error('script does not open with `export const meta = {…}`')
	expect(match[1]).not.toContain('${')
	return new Function(`"use strict"; return (${match[1]})`)()
}

/**
 * A script is a module-shaped async body with top-level `return`, which no
 * standalone parser accepts — so compile it as the function the tool runs it as.
 */
function compile(script: string) {
	return new AsyncFunction(...HOOKS, script.replace(/^export const meta/m, 'const meta'))
}

type Run = (...hooks: unknown[]) => Promise<unknown>

/** Run a script against stub hooks: `agent` answers from `reply`, keyed by label. */
function run(name: string, args: unknown, reply: (label: string) => unknown) {
	const spawned: { label: string; phase: string; agentType?: string }[] = []
	const agent = async (
		_prompt: string,
		o: { label: string; phase: string; agentType?: string }
	) => {
		spawned.push({ label: o.label, phase: o.phase, agentType: o.agentType })
		return reply(o.label)
	}
	const parallel = (thunks: (() => Promise<unknown>)[]) => Promise.all(thunks.map((t) => t()))
	const pipeline = (
		items: unknown[],
		...stages: ((r: unknown, i: unknown, n: number) => unknown)[]
	) =>
		Promise.all(
			items.map(async (item, n) => {
				let r: unknown = item
				for (const stage of stages) r = await stage(r, item, n)
				return r
			})
		)
	const noop = () => {}
	const result = (compile(source(name)) as Run)(
		args,
		agent,
		parallel,
		pipeline,
		noop,
		noop,
		null,
		noop
	)
	return result.then((value) => ({ value, spawned }))
}

describe.each(SHIPPED_WORKFLOWS)('workflows/%s.js', (name) => {
	it('exports a literal meta named after its file', () => {
		const meta = readMeta(source(name))
		expect(meta.name).toBe(name)
		expect(meta.description).toEqual(expect.any(String))
	})

	it('declares every phase its agents run in, and no other', () => {
		const script = source(name)
		const used = new Set([...script.matchAll(/phase: '([^']+)'/g)].map((m) => m[1]))
		const declared = readMeta(script).phases.map((p: { title: string }) => p.title)
		expect(new Set(declared)).toEqual(used)
	})

	it('parses', () => {
		expect(() => compile(source(name))).not.toThrow()
	})
})

describe('ai-loop-pass3', () => {
	it('runs fixes first, then reviews — the combined docs-only reviewer included', async () => {
		const { value, spawned } = await run(
			'ai-loop-pass3',
			{
				fixes: [{ label: 'fix:#61', prompt: 'p' }],
				reviews: [
					{ label: 'code:#58', agentType: 'code-reviewer', prompt: 'p' },
					{ label: 'both:#59', agentType: 'general-purpose', prompt: 'p' },
				],
			},
			(label) => (label.startsWith('fix') ? { pushed: true } : { verdict: 'PASS' })
		)
		expect(spawned).toEqual([
			{ label: 'fix:#61', phase: 'Fix', agentType: undefined },
			{ label: 'code:#58', phase: 'Review', agentType: 'code-reviewer' },
			{ label: 'both:#59', phase: 'Review', agentType: 'general-purpose' },
		])
		expect(value).toEqual([
			{ label: 'fix:#61', result: { pushed: true } },
			{ label: 'code:#58', result: { verdict: 'PASS' } },
			{ label: 'both:#59', result: { verdict: 'PASS' } },
		])
	})
})

describe('ai-workflow', () => {
	const issue = (number: number) => ({ number, title: 't', slug: `ai-${number}-x`, worktree: '/w' })

	it('reviews each opened PR with both arms, and skips review of a blocked issue', async () => {
		const { value, spawned } = await run(
			'ai-workflow',
			{
				repo: 'o/r',
				agentUser: '',
				humanUser: '',
				namedReviewers: false,
				issues: [issue(1), issue(2)],
			},
			(label) =>
				label === 'impl:#1' ? { pr: 10 } : label === 'impl:#2' ? { pr: null } : { passed: true }
		)
		expect(spawned.map((s) => s.label).sort()).toEqual([
			'code-reviewer:#1',
			'impl:#1',
			'impl:#2',
			'security-expert:#1',
		])
		expect(spawned.filter((s) => s.phase === 'Review').map((s) => s.agentType)).toEqual([
			'general-purpose',
			'general-purpose',
		])
		expect(value).toEqual([{ issue: 1, 0: { passed: true }, 1: { passed: true } }, { issue: 2 }])
	})
})

describe('installWorkflow', () => {
	const setup = () => {
		const skills = join(newTmpDir(), '.claude', 'skills')
		fs.ensureDirSync(skills)
		return { skills, dir: workflowsDirFor(skills) }
	}

	it('installs beside the skills dir, stamped, then reports up-to-date', async () => {
		const { skills, dir } = setup()
		expect(dir).toBe(join(skills, '..', 'workflows'))
		expect((await installWorkflow(dir, 'ai-workflow')).status).toBe('installed')
		const written = fs.readFileSync(join(dir, 'ai-workflow.js'), 'utf8')
		expect(written.startsWith('export const meta = {')).toBe(true)
		expect(written).toMatch(/^\/\/ repo-ai-hash: [0-9a-f]{64}$/m)
		expect((await installWorkflow(dir, 'ai-workflow')).status).toBe('up-to-date')
	})

	it('refreshes a stale pristine copy, refuses a fork, and overwrites it under force', async () => {
		const { dir } = setup()
		const file = join(dir, 'ai-workflow.js')
		fs.outputFileSync(file, stampWorkflow('export const meta = {}\n', '0.0.1'))
		expect((await installWorkflow(dir, 'ai-workflow')).status).toBe('updated')

		fs.appendFileSync(file, 'log("mine")\n')
		expect((await installWorkflow(dir, 'ai-workflow')).status).toBe('declined-fork')
		expect((await installWorkflow(dir, 'ai-workflow', { force: true })).status).toBe('updated')
	})

	it('refuses a downgrade', async () => {
		const { dir } = setup()
		fs.outputFileSync(join(dir, 'ai-workflow.js'), stampWorkflow(source('ai-workflow'), '999.0.0'))
		expect((await installWorkflow(dir, 'ai-workflow')).status).toBe('declined-downgrade')
	})
})

describe('checkWorkflows', () => {
	it('flags missing workflows, then passes once installed', async () => {
		const skills = join(newTmpDir(), 'skills')
		fs.ensureDirSync(skills)
		expect(await checkWorkflows(skills)).toMatchObject({ status: 'optional-missing' })
		for (const name of SHIPPED_WORKFLOWS) await installWorkflow(workflowsDirFor(skills), name)
		expect(await checkWorkflows(skills)).toMatchObject({ status: 'ok' })
	})
})
