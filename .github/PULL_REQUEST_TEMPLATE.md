## Summary

<!-- 1-3 bullet points describing what changed and why -->
-

<!--
The PR title becomes the squash commit subject on `main`. What ships is decided
by changesets: a change to the published package adds one (`pnpm changeset`).
Merging does not release: the "Version Packages" PR collects the changesets,
and merging it is the release, after one `release` approval.
-->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor / cleanup
- [ ] Documentation
- [ ] CI / tooling

## Test plan

- [ ] `pnpm verify` passes (check, typecheck, tests, build)
- [ ] New tests added for new behaviour
- [ ] Changed `loop` commands run locally, with and without `--json`

## Skills and the loop

- [ ] Skill change: `skills/*/SKILL.md` edited, and the matching page in `apps/docs/docs/` updated
- [ ] Loop behaviour change: tested with a manual `/ai-loop` tick
- [ ] Neither applies

## Checklist

- [ ] PR title is a Conventional Commit
- [ ] A changeset is added if the published package changes (`pnpm changeset`)
- [ ] No breaking changes (or BREAKING CHANGE footer added to commit)
- [ ] In `--json` mode, only JSON goes to stdout; diagnostics go to stderr
