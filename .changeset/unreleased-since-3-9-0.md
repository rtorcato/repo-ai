---
'@rtorcato/repo-ai': minor
---

Merged after 3.9.0 under semantic-release and not shipped yet:

- `doctor`: a repo with no CI can opt out of the CI runs check with `ci: false` (#443).
- `labels`: a `security` label, exempt from `ai-suggested` decay (#430).
- `release-guard`: catch a `$var` or substitution dispatch with a redirect, comment or quoted value (#433).
- `setup`: deny the remaining git exec escapes and refuse a symlinked `.gitignore` (#432).
- `loop`: pass `--ignore-scripts` to the bun worktree install (#431).
