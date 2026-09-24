# AGENTS.md

Orientation for coding agents working on `@rtorcato/repo-ai`.

## What this is

The ai-issue-loop pipeline, split out of `@rtorcato/repo-tooling`:

- `skills/*/SKILL.md` — the Claude Code skills (the loop, its burst driver, the issue on-ramp, and the status view).
- `src/cli/commands/loop-*.ts` — the `loop` commands the skills call, with the mechanics turned into testable code.
- `src/cli/commands/{doctor,fix}.ts` — the loop's own audit and fixers.
- `src/base/{gh,git}.ts` — `gh`/`git` runners, copied from repo-tooling (not shared).

Config is read from the consuming repo's `.repo-tooling.json`: `rules.aiLoop.agentUser` and `rules.requiredSkills`.

## Conventions

- Conventional commits, enforced by commitlint.
- Biome for lint and format (`pnpm run check`).
- Tests in `tests/`, run with vitest.
- `pnpm verify` runs check, typecheck, tests and build, and is the pre-push gate.
- Every command supports `--json`. In JSON mode, diagnostics go to stderr, never stdout.
