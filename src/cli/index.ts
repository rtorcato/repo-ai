#!/usr/bin/env node

import { Command } from 'commander'
import { doctorCommand } from './commands/doctor.js'
import { FIXERS, fixCommand } from './commands/fix.js'
import { loopCleanupCommand } from './commands/loop-cleanup.js'
import { loopEnvCommand } from './commands/loop-env.js'
import { loopGuardCommand } from './commands/loop-guard.js'
import { loopCommentCommand, loopVerdictCommand } from './commands/loop-marker.js'
import { loopReapCommand } from './commands/loop-reap.js'
import { loopWorktreeAddCommand } from './commands/loop-worktree.js'
import { getToolVersion } from './utils/version.js'

const program = new Command()

program
	.name('repo-ai')
	.description('🤖 The ai-issue-loop pipeline: loop mechanics, skills, and their audit')
	.version(await getToolVersion())

program
	.command('doctor')
	.description('🩺 Audit the loop setup: labels, agent user, installed and required skills')
	.option('-d, --dir <path>', 'Repository to audit', process.cwd())
	.option('--skills-dir <path>', 'Skills directory to check (default: ~/.claude/skills)')
	.option('--json', 'Emit machine-readable JSON output')
	.action(doctorCommand)

program
	.command('fix <target>')
	.description(`🔧 Apply one fixer: ${Object.keys(FIXERS).join(', ')}`)
	.option('-d, --dir <path>', 'Repository to fix', process.cwd())
	.option('-y, --yes', 'Never prompt')
	.option('--skills-dir <path>', 'claude-skills: install here instead of ~/.claude/skills')
	.option('--force-skills', 'claude-skills: overwrite a locally modified or newer copy')
	.option('--gh-config-dir <path>', 'ai-loop-identity: the agent gh profile directory')
	.option('--json', 'Emit machine-readable JSON output (implies --yes)')
	.action(fixCommand)

const loop = program.command('loop').description('🔁 ai-issue-loop mechanics as tested commands')

loop
	.command('guard')
	.description('🛡️  Repair a wrongly-bare main checkout and gate the node_modules rebuild')
	.option('--root <path>', 'Main checkout the loop branches worktrees from', process.cwd())
	.option('--worktree-root <path>', 'Where ai-* worktrees live (default: <root>-worktrees)')
	.option('--removed', 'A worktree was removed this tick — consider rebuilding node_modules')
	.option('--json', 'Emit machine-readable JSON output')
	.addHelpText(
		'after',
		'\nExit codes:\n' +
			'  0  root is a usable work tree (healthy, or repaired in place) — continue the tick\n' +
			'  1  repair was attempted and failed; the root is still bare — halt the tick\n' +
			'  2  root is not a repairable main checkout (bare clone, linked worktree, or not a repo) — halt the tick\n'
	)
	.action(loopGuardCommand)

loop
	.command('env')
	.description('🧭 Resolve ROOT, WT_ROOT, OWNER_REPO, AGENT_USER, HUMAN_USER and ME once')
	.option(
		'-d, --dir <path>',
		'Directory to resolve from — main checkout or any worktree',
		process.cwd()
	)
	.option('--json', 'Emit machine-readable JSON output')
	.addHelpText(
		'after',
		"\nWithout --json, prints KEY='value' lines for eval. Empty means none.\n" +
			'Exits 1 when the checkout or its GitHub repo cannot be resolved.\n'
	)
	.action(loopEnvCommand)

loop
	.command('cleanup')
	.description('🧹 Remove ai-* worktrees whose PR landed on main or was closed')
	.option('--root <path>', 'Main checkout the loop branches worktrees from', process.cwd())
	.option('--worktree-root <path>', 'Where ai-* worktrees live (default: <root>-worktrees)')
	.option('--json', 'Emit machine-readable JSON output')
	.addHelpText(
		'after',
		'\nPass `removed` from --json to `loop guard --removed`.\n' +
			'Exits 1 when a worktree removal failed.\n'
	)
	.action(loopCleanupCommand)

loop
	.command('worktree')
	.description('🌳 Loop worktree mechanics')
	.command('add <slug>')
	.description(
		'🌱 Create ai-<issue>-<slug> off origin/main, link its deps, assert none are missing'
	)
	.option('--root <path>', 'Main checkout to branch the worktree from', process.cwd())
	.option('--worktree-root <path>', 'Where ai-* worktrees live (default: <root>-worktrees)')
	.option('--base <ref>', 'Ref to branch from', 'origin/main')
	.option('--json', 'Emit machine-readable JSON output')
	.addHelpText(
		'after',
		'\nExit 1 when the worktree was not created or a symlinkDirectories entry is left\n' +
			'unlinked — do not spawn an implementer. needsInstall means no list was declared.\n'
	)
	.action(loopWorktreeAddCommand)

loop
	.command('reap')
	.description('🪦 Report agents stalled past 45 minutes and what to do about each')
	.option('--root <path>', 'Main checkout the loop branches worktrees from', process.cwd())
	.option('--worktree-root <path>', 'Where ai-* worktrees live (default: <root>-worktrees)')
	.option('--json', 'Emit machine-readable JSON output')
	.addHelpText(
		'after',
		'\nRead-only: prints a verdict per stall (block / drop-label / remove-worktree).\n' +
			'Exits 1 when a gh query failed and the report is incomplete.\n'
	)
	.action(loopReapCommand)

loop
	.command('comment <pr>')
	.description("💬 Upsert the loop's one decision-marker comment on a PR")
	.requiredOption('--body-file <path>', 'Comment text, without the marker (- for stdin)')
	.option('-d, --dir <path>', 'Directory to resolve the GitHub repo from', process.cwd())
	.option('--json', 'Emit machine-readable JSON output')
	.action(loopCommentCommand)

loop
	.command('verdict <pr>')
	.description("⚖️  Read a reviewer arm's verdict marker for the PR's current head")
	.requiredOption('--arm <arm>', 'Reviewer arm: code or sec')
	.option('-d, --dir <path>', 'Directory to resolve the GitHub repo from', process.cwd())
	.option('--json', 'Emit machine-readable JSON output')
	.addHelpText(
		'after',
		'\nPrints PASS, PASS-NOTES, CHANGES, or an empty line when none is posted.\n' +
			'Exits 1 when the PR or its reviews cannot be read.\n'
	)
	.action(loopVerdictCommand)

await program.parseAsync()
