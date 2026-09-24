import path from 'node:path'
import fs from 'fs-extra'
import type { GhExec } from './gh.js'

/**
 * The release-gate probe `loop tick` uses, copied from @rtorcato/repo-tooling
 * (src/base/github-settings.ts), not shared — same reasoning as ./gh.ts.
 */

/**
 * What a job has to run for a merge to the default branch to reach a registry.
 * `semantic-release` counts on its own — the shipped preset publishes with it.
 */
const PUBLISH_COMMAND = /semantic-release|changesets\/action|(?:npm|pnpm|yarn)\s+publish/

const unquote = (s: string) => s.replace(/^['"]|['"]$/g, '')

/**
 * A workflow's `jobs:` blocks, keyed by job id.
 *
 * Hand-split rather than parsed: this package ships no YAML dependency, and the
 * only question asked of the result is whether *one particular job* carries an
 * `environment:` key. A whole-file grep would answer that wrong on any repo with
 * a `github-pages` deploy job — which is the exact false negative this check
 * exists to avoid. Jobs sit one indent level under `jobs:` and their keys one
 * level below that, which holds for every workflow Actions accepts.
 */
export function workflowJobs(yaml: string): Map<string, string> {
	const jobs = new Map<string, string>()
	const lines = yaml.split('\n')
	const start = lines.findIndex((l) => /^jobs:\s*$/.test(l))
	if (start === -1) return jobs

	const indentOf = (l: string) => l.length - l.trimStart().length
	// The block runs until the next top-level key. A column-0 comment is not one —
	// it ends nothing, so skipping it keeps a stray comment between `jobs:` and its
	// first job from truncating the block and hiding every job below it.
	let end = lines.length
	for (let i = start + 1; i < lines.length; i++) {
		const l = lines[i] ?? ''
		if (l.trim() !== '' && !l.trimStart().startsWith('#') && indentOf(l) === 0) {
			end = i
			break
		}
	}
	const body = lines.slice(start + 1, end)
	const first = body.find((l) => l.trim() !== '' && !l.trimStart().startsWith('#'))
	if (first === undefined) return jobs
	const jobIndent = indentOf(first)

	let id: string | null = null
	let buf: string[] = []
	for (const line of body) {
		const header =
			line.trim() !== '' && indentOf(line) === jobIndent
				? /^([\w.-]+):/.exec(line.trim())?.[1]
				: undefined
		if (header) {
			if (id) jobs.set(id, buf.join('\n'))
			id = header
			buf = []
		} else if (id) {
			buf.push(line)
		}
	}
	if (id) jobs.set(id, buf.join('\n'))
	return jobs
}

/**
 * The environment a job runs in, in either form Actions accepts: the scalar
 * `environment: release`, or a block whose `name:` names it. Null when the job
 * declares none.
 */
export function jobEnvironment(body: string): string | null {
	const inline = /^[ \t]*environment:[ \t]*(\S+)[ \t]*$/m.exec(body)
	if (inline?.[1]) return unquote(inline[1])
	const at = body.search(/^[ \t]*environment:[ \t]*$/m)
	if (at === -1) return null
	// Step names are list items (`- name:`), so the first bare `name:` after the
	// block opener is the environment's.
	const name = /^[ \t]*name:[ \t]*(\S+)/m.exec(body.slice(at))?.[1]
	return name ? unquote(name) : null
}

/**
 * A job body with whole-line comments dropped. Same reasoning as
 * `hookHasUncommented` in base/checks.ts: a `#` line runs nothing, so matching
 * it is a false positive. Observed on this repo's own ci.yml, where a `varcheck`
 * job carrying `# npm publish uses OIDC trusted publishing` was reported as the
 * publishing job. Comments are stripped rather than pattern-tested because
 * `jobEnvironment` needs the same treatment — a commented-out `environment:`
 * would otherwise read as a live gate, the exact inversion of this check.
 */
function withoutComments(body: string): string {
	return body
		.split('\n')
		.filter((line) => !line.trimStart().startsWith('#'))
		.join('\n')
}

interface PublishJob {
	file: string
	job: string
	/** The `environment:` the job declares, or null. */
	environment: string | null
}

/**
 * The first workflow job that runs a publish command, or null if none does.
 *
 * `'skip'` when the directory exists but can't be read — a permission error or a
 * broken symlink must not read as "nothing publishes", which would report the
 * gate as `ok` on a repo whose workflows were never inspected. Same shape as
 * `readEnvironments`: absent is an answer, unreadable is not.
 */
async function findPublishJob(dir: string): Promise<PublishJob | null | 'skip'> {
	const workflowsDir = path.join(dir, '.github', 'workflows')
	if (!(await fs.pathExists(workflowsDir))) return null
	try {
		for (const f of (await fs.readdir(workflowsDir)).sort()) {
			if (!/\.ya?ml$/.test(f)) continue
			const content = await fs.readFile(path.join(workflowsDir, f), 'utf-8')
			if (!PUBLISH_COMMAND.test(content)) continue
			for (const [job, raw] of workflowJobs(content)) {
				const body = withoutComments(raw)
				if (PUBLISH_COMMAND.test(body)) {
					return { file: f, job, environment: jobEnvironment(body) }
				}
			}
		}
	} catch {
		return 'skip'
	}
	return null
}

/** Environment name → whether it carries a `required_reviewers` protection rule. */
type Environments = Map<string, boolean>

async function readEnvironments(gh: GhExec, nwo: string): Promise<Environments | 'skip'> {
	const r = await gh(['api', `repos/${nwo}/environments`])
	// A repo with no environments can answer 404 — that's "none", not unreadable.
	if (!r.ok) return /404|not found/i.test(r.stderr) ? new Map() : 'skip'
	try {
		const parsed = JSON.parse(r.stdout) as {
			environments?: Array<{ name?: string; protection_rules?: Array<{ type?: string }> }>
		}
		const envs: Environments = new Map()
		for (const e of parsed.environments ?? []) {
			if (typeof e.name !== 'string') continue
			envs.set(
				e.name,
				(e.protection_rules ?? []).some((p) => p.type === 'required_reviewers')
			)
		}
		return envs
	} catch {
		return 'skip'
	}
}

/**
 * The ai-loop's unattended-merge probe (#620): true only when the job
 * that publishes runs behind an environment carrying `required_reviewers`, so a
 * human still stands between a merge and the registry. An environment no job
 * references gates nothing, and every unreadable answer fails closed.
 */
export async function releaseGated(gh: GhExec, nwo: string, dir: string): Promise<boolean> {
	const publish = await findPublishJob(dir)
	if (publish === null || publish === 'skip' || publish.environment === null) return false
	const envs = await readEnvironments(gh, nwo)
	return envs !== 'skip' && envs.get(publish.environment) === true
}
