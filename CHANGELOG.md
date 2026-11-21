# @rtorcato/repo-ai

## 3.12.0

### Minor Changes

- 0fc6492: Add six priority labels to the ai-loop label set: `bug-p1`, `bug-p2`, `bug-p3` for broken things and `fix-p1`, `fix-p2`, `fix-p3` for things that need fixing but aren't broken. `doctor` and `fix labels` now create them. Every agent filing path (the review follow-up prompts, the `ai-issue` and `ai-loop` skills, the pickup Workflow) applies exactly one to a defect or fix, with a shared rubric. `loop tick` picks up `ai-ready` issues in the order `bug-p1`, `fix-p1`, `bug-p2`, `fix-p2`, `bug-p3`, `fix-p3`, then the rest (a plain `bug` still first among those), oldest first within each; `/ai-loop-status` lists the queue the same way. The docs and `LabelChips` show the new labels and rubric.

### Patch Changes

- 87872c1: `loop tick` and `loop watch` report a `gh` TLS failure (Claude Code's sandbox, `x509: OSStatus -26276`) as the one cause of a halt, pointing at `fix sandbox`, instead of falsely saying the repo is unresolvable and `agentUser` is not assignable. The `ai-loop-pickup` Workflow now releases each agent's token estimate when it finishes, so `budgetTokens` caps real output spend rather than skipping reviews after a fraction of it.

## 3.11.0

### Minor Changes

- 9214368: Add a `human-wip` label for an issue a human is working. `loop tick` never picks it up, even with `ai-ready`, and never decays an `ai-suggested` issue carrying it. `doctor` and `fix labels` create it, and the dashboard shows it as its own `human` stage.

## 3.10.0

### Minor Changes

- c722512: Merged after 3.9.0 under semantic-release and not shipped yet:
  
  - `doctor`: a repo with no CI can opt out of the CI runs check with `ci: false` (#443).
  - `labels`: a `security` label, exempt from `ai-suggested` decay (#430).
  - `release-guard`: catch a `$var` or substitution dispatch with a redirect, comment or quoted value (#433).
  - `setup`: deny the remaining git exec escapes and refuse a symlinked `.gitignore` (#432).
  - `loop`: pass `--ignore-scripts` to the bun worktree install (#431).

## 3.9.0

Releases up to 3.9.0 were cut by semantic-release, which never wrote this file. Their notes are on [GitHub Releases](https://github.com/rtorcato/repo-ai/releases). From the next release on, Changesets writes each entry here, above this one.
