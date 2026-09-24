export const meta = {
	name: 'ai-loop-pass3',
	description: "Run one tick's claimed reviewers and fixers; each labels and comments its own PR",
	phases: [{ title: 'Review' }, { title: 'Fix' }],
}

const VERDICT = {
	type: 'object',
	properties: {
		verdict: { enum: ['PASS', 'PASS-NOTES', 'CHANGES'] },
		summary: { type: 'string' },
	},
	required: ['verdict', 'summary'],
}
const FIXED = {
	type: 'object',
	properties: { pushed: { type: 'boolean' }, summary: { type: 'string' } },
	required: ['pushed', 'summary'],
}

const tasks = [
	...args.fixes.map((f) => () => agent(f.prompt, { label: f.label, phase: 'Fix', schema: FIXED })),
	...args.reviews.map((r) => () =>
		agent(r.prompt, { label: r.label, phase: 'Review', schema: VERDICT, agentType: r.agentType })
	),
]
// #41: budget enforcement lands here — trim `tasks` before anything spawns.
const results = await parallel(tasks)
const labels = [...args.fixes, ...args.reviews].map((t) => t.label)
return labels.map((label, i) => ({ label, result: results[i] }))
