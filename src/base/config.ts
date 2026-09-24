/**
 * Loop config: `.repo-ai.json`, own file, repo-ai's to define (#38). Before it
 * existed, `agentUser` and `requiredSkills` lived in `.repo-tooling.json`
 * under `rules.aiLoop` / `rules.requiredSkills` — a schema repo-tooling owns,
 * so this package could not add a setting without a release of both. A repo
 * with no `.repo-ai.json` still reads that legacy location, so nothing breaks
 * on upgrade; `doctor` flags the legacy source as drift so it gets migrated.
 */
import path from 'node:path'
import fs from 'fs-extra'

export const CONFIG_FILE = '.repo-ai.json'
const LEGACY_LOCKFILE = '.repo-tooling.json'

export type ConfigSource = 'repo-ai.json' | 'repo-tooling.json' | 'none'

export interface RepoAiConfig {
	agentUser?: string
	requiredSkills?: string[]
	/** `loop watch`'s poll interval, floored at {@link MIN_POLL_SECONDS}. */
	pollSeconds?: number
	source: ConfigSource
}

function asLogin(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

export const DEFAULT_POLL_SECONDS = 180
export const MIN_POLL_SECONDS = 60

// Each poll costs several GitHub API calls against the 5,000/h limit (#62).
function asPollSeconds(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isFinite(value)
		? Math.max(MIN_POLL_SECONDS, Math.floor(value))
		: undefined
}

function asSkillList(value: unknown): string[] | undefined {
	if (!Array.isArray(value)) return undefined
	const names = value.filter((n): n is string => typeof n === 'string')
	// An empty array is repo-tooling's DEFAULT_RULES stamp, not a stated intent
	// (lockfile.ts: "a populated one would be this tool asserting a rule on a
	// repo whose humans have not stated any") — treat it the same as absent.
	return names.length > 0 ? names : undefined
}

/**
 * `.repo-ai.json` if present, else the same two settings from
 * `.repo-tooling.json`'s `rules.aiLoop.agentUser` / `rules.requiredSkills`
 * (with the flat pre-v4 `aiLoop.agentUser` fallback the skill's `jq` also
 * reads). Read raw, not through repo-tooling's lockfile parser — a
 * hand-written rules-only file is exactly what this has to see.
 */
export async function readConfig(dir: string): Promise<RepoAiConfig> {
	const own = await fs.readJson(path.join(dir, CONFIG_FILE)).catch(() => null)
	if (own) {
		return {
			agentUser: asLogin(own.agentUser),
			requiredSkills: asSkillList(own.requiredSkills),
			pollSeconds: asPollSeconds(own.pollSeconds),
			source: 'repo-ai.json',
		}
	}
	const legacy = await fs.readJson(path.join(dir, LEGACY_LOCKFILE)).catch(() => null)
	const agentUser = asLogin(legacy?.rules?.aiLoop?.agentUser ?? legacy?.aiLoop?.agentUser)
	const requiredSkills = asSkillList(legacy?.rules?.requiredSkills)
	if (agentUser || requiredSkills) {
		return { agentUser, requiredSkills, source: 'repo-tooling.json' }
	}
	return { source: 'none' }
}
