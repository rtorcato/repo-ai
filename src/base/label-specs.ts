/**
 * The ai-loop label set, dependency-free so the docs site can import it and
 * render the same colours `doctor` enforces (#272). Behaviour lives in labels.ts.
 */

export interface LabelSpec {
	name: string
	/** Six hex digits, no leading `#`, lowercase — what `gh` writes. */
	color: string
	description: string
}

export const LOOP_LABELS: readonly LabelSpec[] = [
	{
		name: 'holding',
		color: '5319e7',
		description: 'Gate/holding issue — human judgement, never auto-picked',
	},
	{
		name: 'human-wip',
		color: 'd4c5f9',
		description: 'Claimed by a human; the loop never picks it up',
	},
	{ name: 'ai-ready', color: '0e8a16', description: 'Eligible for an AI agent to implement' },
	{ name: 'ai-wip', color: 'fbca04', description: 'Claimed by an agent; worktree exists' },
	{ name: 'ai-blocked', color: 'b60205', description: 'Agent gave up; needs a human' },
	{ name: 'ai-review', color: '1d76db', description: 'PR awaiting agent review' },
	{ name: 'ai-reviewing-code', color: 'c5def5', description: 'code-reviewer claimed and running' },
	{ name: 'ai-reviewing-sec', color: 'c5def5', description: 'security-expert claimed and running' },
	{ name: 'ai-ok-code', color: '0e8a16', description: 'code-reviewer passed' },
	{ name: 'ai-ok-sec', color: '0e8a16', description: 'security-expert passed' },
	{ name: 'ai-changes', color: 'd93f0b', description: 'Reviewer requested changes' },
	{
		name: 'ai-conflicts',
		color: 'e99695',
		description: 'Branch conflicts with the default branch — needs main merged in',
	},
	{
		name: 'ai-fixing',
		color: '006b75',
		description: 'Fix-round implementer claimed and running',
	},
	{
		name: 'ai-notes',
		color: 'fbca04',
		description: 'Passed, but a reviewer left something to read before merging',
	},
	{
		name: 'merge-ready',
		color: '8250df',
		description: 'Both agent reviews passed and the PR is mergeable — waiting on a human',
	},
	{
		name: 'ai-suggested',
		color: 'c2e0c6',
		description: 'Follow-up surfaced by an agent review — triage queue, never auto-picked',
	},
	{
		name: 'security',
		color: 'ee0701',
		description: 'Security finding — never auto-closed',
	},
	// Priority (#464): strong to pale. `bug-*` = broken, `fix-*` = not broken but needs fixing.
	{
		name: 'bug-p1',
		color: 'b60205',
		description: 'Broken and it hurts now: wrong output, crash, release/CI blocker, data loss',
	},
	{
		name: 'bug-p2',
		color: 'e4606d',
		description: 'Broken, but there is a workaround or it hits an edge case',
	},
	{ name: 'bug-p3', color: 'f9c0c5', description: 'Broken in a minor or cosmetic way' },
	{
		name: 'fix-p1',
		color: 'b35900',
		description: 'Not broken, but fix soon: hardening, near deprecation, blocks other work',
	},
	{
		name: 'fix-p2',
		color: 'e99a45',
		description: 'Should be fixed: tech debt, missing tests, stale config',
	},
	{
		name: 'fix-p3',
		color: 'fbdcb5',
		description: 'Nice to fix: hygiene and small chores, such as a missing LICENSE',
	},
]

/**
 * Pickup and listing order (#464): `bug-p1`, `fix-p1`, `bug-p2`, `fix-p2`, `bug-p3`, `fix-p3`,
 * then everything else. Callers keep oldest-first within each rank.
 */
export const PRIORITY_LABELS = ['bug-p1', 'fix-p1', 'bug-p2', 'fix-p2', 'bug-p3', 'fix-p3'] as const

/** An issue's priority rank: its best priority label's index, or `PRIORITY_LABELS.length` with none. */
export function priorityRank(labels: readonly { name: string }[]): number {
	const ranks = labels
		.map((l) => (PRIORITY_LABELS as readonly string[]).indexOf(l.name))
		.filter((i) => i >= 0)
	return ranks.length ? Math.min(...ranks) : PRIORITY_LABELS.length
}
