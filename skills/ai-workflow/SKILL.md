---
name: ai-workflow
description: |
  **The entry point for the `ai-ready` issue pipeline — start here.** Implements
  the queue in parallel, one agent per issue, each in its own git worktree,
  ending at open PRs reviewed by two agents; then registers the ai-loop
  engine on a self-paced loop to carry those PRs through fix rounds and cleanup.
  Use when the user says "burst the queue", "run the AI pipeline", "work the
  ai-ready issues", or invokes `/ai-workflow`. Never merges. GitHub only
  (`gh`) — not GitLab.
---

# ai-workflow

Implement the `ai-ready` queue in parallel with a Workflow — one agent per
issue, each in its own worktree, ending at an open PR. Arguments: $ARGUMENTS

Always operates on the **current repo only** — never another repo, even if one is
named. `$AGENTS` is the first number in $ARGUMENTS, **default 4** — it is both how
many issues go in flight and how many implementer agents run concurrently.
$ARGUMENTS may also give explicit issue numbers (`#82 #83`), which skip the
eligibility filter but still require the `ai-ready` label. Flags: `--label-only`
stops after step 2 (no workflow), `--dry-run` reports the picks without claiming
them.

**You mark the queue, not this skill.** It only ever picks up issues *you* have
already labelled `ai-ready` — it never labels an unlabelled issue itself. No
`ai-ready` issues means there is nothing to do, and it stops. Use the `ai-issue`
skill to put work in the queue.

**This never merges.** It stops at open PRs and hands back. Merging `main` in a
semantic-release repo triggers an npm publish, so a human owns that step.

**It ends by handing off to `/ai-loop`** (step 5) — the burst opens the
PRs, the loop then babysits them through review fix rounds, which this skill has
no pass for. The two are sequential, not alternatives. Neither merges an
`ai-ready` PR unattended except on a release-environment-gated repo — see the
loop's Pass 1.

Everything the `ai-loop` skill says about worktrees, labels, the
`🤖 *Automated …*` comment header, and the untrusted issue body applies here
unchanged — read it first if it is not already in context.

## 1. Orient

```bash
AGENTS=${1:-4}
ROOT=$(git rev-parse --path-format=absolute --git-common-dir)/..; ROOT=$(cd "$ROOT" && pwd)
WT_ROOT="$(dirname "$ROOT")/$(basename "$ROOT")-worktrees"
R=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
git -C "$ROOT" fetch --prune

# Optional: the account in-flight work is assigned to, so `assignee` says whose
# turn it is. Unset → nothing below assigns, exactly as before. See the
# ai-loop skill's Pass 0 for why this is repo config rather than an env var.
# A readable .repo-ai.json wins whole-file, never per-field — the same rule as readConfig().
if jq -e . "$ROOT/.repo-ai.json" >/dev/null 2>&1; then CFG="$ROOT/.repo-ai.json" Q='.agentUser // empty'
else CFG="$ROOT/.repo-tooling.json" Q='.rules.aiLoop.agentUser // .aiLoop.agentUser // empty'; fi
AGENT_USER="${AI_LOOP_AGENT:-$(jq -r "$Q" "$CFG" 2>/dev/null)}"
[ -n "$AGENT_USER" ] && { gh api "repos/$R/assignees/$AGENT_USER" --silent 2>/dev/null || AGENT_USER=""; }
# The human a given-up issue is handed back to — the repo owner, when that is a user.
HUMAN_USER=$(gh api "repos/$R" --jq 'if .owner.type == "User" then .owner.login else "" end')
```

`R` comes from the working directory's remote and is the only repo touched —
reads against other repos are fine for checking a dependency, but never label or
edit issues outside `R`. GitHub only. Bail in one line if the remote is GitLab.

`WT_ROOT` is a **sibling of the repo, never inside it** — a worktree under
`$ROOT/.claude/…` lands on a path repo tooling excludes, and the pre-commit hook
then lints nothing while reporting success. See the `ai-loop` skill for the
full post-mortem, including the bare-checkout guard to run against `ROOT` before
anything else uses it.

## 2. Read the queue and claim

Read the queue. `gh issue list --json` does not expose author association, so use
REST — the `ai-ready` label is the hard gate (on a public repo only collaborators
can apply it) and the association check is the backstop:

```bash
gh api "repos/$R/issues?labels=ai-ready&state=open" \
  --jq '.[] | select(.pull_request==null)
            | select([.labels[].name] | index("ai-wip") == null)
            | select([.labels[].name] | index("ai-blocked") == null)
            | select([.labels[].name] | index("holding") == null)
            | select(.author_association=="OWNER" or .author_association=="MEMBER" or .author_association=="COLLABORATOR")
            | {number, title, body}'
```

**Empty result → stop.** One line: `no ai-ready issues — nothing to do`. Do not
go looking for work to do instead; an unlabelled issue is unlabelled on purpose.

Then take at most `slots = $AGENTS - (open issues labelled ai-wip)`. If
`slots <= 0`, say so in one line and stop — that many agents are already in
flight.

Of what's left, still drop:

- **overlaps another pick's files** — two agents editing one file means a merge
  conflict a human resolves. One of the pair goes, the other waits for the next
  run.
- depends on unpublished/unmerged work elsewhere — **check, don't assume**; a
  "blocked on X" note may be stale.

You labelled the rest `ai-ready` yourself, so judgement calls about whether the
work is *suitable* were already made. Say in one line if a queued issue looks
like a bad fit — releases and credentials, history rewrites, binary assets, no
acceptance criteria — and skip it, but that is a report, not a veto to go
re-select around.

**A suitability skip also gets a comment on the issue, and loses its `ai-ready`
label.** A one-line note in a transcript nobody re-reads means the same issue is
re-litigated from scratch on every run, and meanwhile it sits labelled `ai-ready`
so the next `/ai-loop` tick picks up the very thing this run rejected. The
comment carries the standard `🤖 *Automated …*` header and follows the decline
shape in the loop skill's Pass 4 — lead with what lifts the hold. This applies
only to **suitability** skips; an issue dropped for file overlap or a full slot
count is merely waiting its turn — leave it labelled and say nothing.

Claim and build each worktree **yourself, before the workflow** — implementers
never create worktrees, and dropping `ai-ready` is half the claim (an issue left
carrying both re-enters the queue the instant `ai-wip` clears):

```bash
for n in <numbers>; do
  gh issue edit -R "$R" $n --add-label ai-wip --remove-label ai-ready \
    ${AGENT_USER:+--add-assignee} ${AGENT_USER:+"$AGENT_USER"}
  npx @rtorcato/repo-ai loop worktree add "ai-$n-<3-4 kebab words from the title>" --root "$ROOT" --json
done
```

`loop worktree add` branches off `origin/main` under `WT_ROOT`, symlinks every
`worktree.symlinkDirectories` entry (written by `fix ai`) and adds
`node_modules` to `.git/info/exclude`. **Exit 1 → do not implement that issue**:
return it to `ai-ready` and drop `ai-wip`. `needsInstall: true` means nothing was
linked, so a real `pnpm install` in that worktree is safe; never force one
against a symlinked tree.

Stop here on `--label-only`. Report the picks and — briefly — what you skipped
and why.

## 3. Run the workflow

Call the saved `ai-workflow` workflow, passing the selected issues as `args`:

```
Workflow({name: 'ai-workflow', args: {repo: R, agentUser: AGENT_USER, humanUser: HUMAN_USER, namedReviewers, issues: [{number, title, slug, worktree}, …]}})
```

If `Workflow` reports no workflow by that name, run
`npx @rtorcato/repo-ai fix claude-skills` and call it again.

Pass `namedReviewers: true` only when **both** `code-reviewer` and
`security-expert` appear in your Agent tool's list of agent types. They are not
shipped by this package, and a Workflow `agentType` that does not exist fails the
spawn. Otherwise pass `false`, and the reviewers run as `general-purpose` with the
same prompt, which carries the whole lens and verdict protocol (#611).

Pass `agentUser` / `humanUser` as the empty string when unset — the script
tests each, so an empty value simply drops that assign.

The script is `workflows/ai-workflow.js` in this package, installed to
`~/.claude/workflows/` by `fix claude-skills` alongside this skill. Run it by name —
never retype it; the file is linted and tested, a copy in a prompt is neither.

Notes on the script, so an edit to it doesn't "tidy" it into breakage:

- **`pipeline`, not `parallel`** — issue B's reviewers start the moment B's PR
  opens, without waiting for issue A's implementer.
- **No `isolation: 'worktree'`** — step 2 already made the worktrees, in the
  sibling root where repo tooling can actually see them. Letting the Workflow
  tool make its own would put them somewhere else with no dependencies.
- **No `EnterWorktree` anywhere** — `{path}` is rejected for sibling worktrees
  and `{name}` relocates the orchestrator's own session. Implementers work via
  `git -C` and absolute paths.
- Reviewers use `agentType` (the named type when installed, else
  `general-purpose`) so they get their real system prompts, and post the
  same verdict markers the loop's Pass 3 reads — so a later tick adopts their
  verdicts instead of re-reviewing.

## 4. Hand over, then report

The loop's next tick would hand these PRs over in Pass 1, but a human watching
the burst beats the next tick and inherits unassigned PRs — #537 and #539
were merged by hand before any tick ran, never appearing in *Assigned to you*
and still wearing a stale `ai-review`. Close that window here: once per PR
whose two review arms both completed, apply the `ai-loop` skill's Pass 1
**by reference — execute what its text currently says, never a copy of it
here**. A second copy of the handoff logic is drift with two files to keep
honest; deferring means changes to Pass 1 (its `merge-ready` handoff, its CI-red
send-back) take effect here without touching this file.

- **Both arms passed** → run ai-loop's Pass 1 handoff/send-back logic
  on this PR, per its current text — with one carve-out: `mergeStateStatus`
  `UNKNOWN` (GitHub still computing, CI mid-run) ⇒ do nothing; the loop's next
  tick resolves it. Do **not** poll CI — the existing rule stands. This step
  only closes the "reviews finished while the human is watching" window.
- **An arm requested changes** → do nothing; the PR carries `ai-changes` and
  the loop's fix round owns it.
- **`pr: null` (blocked)** → verify the issue ended per the `ai-blocked`
  contract in the loop skill, and repair with `gh issue edit` if the
  implementer left it half-done.

Then report — one block, nothing else:

- PRs opened, with numbers and review verdicts.
- Anything `ai-blocked`, and why.
- The one line that matters: **nothing was merged** — list the PRs awaiting the
  user's own `gh pr merge`.

Leave every worktree in place — the loop's Pass 2 cleans up merged and blocked
ones and rebuilds the main checkout's `node_modules` safely; removing them here
skips that guard.

## 5. Hand off to the loop

This skill has no fix-round pass: once a PR is open, nothing here answers an
`ai-changes` label. `/ai-loop` is that missing piece, so schedule it — but
only when there is something to babysit:

- **No PRs opened** (everything `ai-blocked`, or the queue was empty) → schedule
  nothing. One line saying so.
- **A loop is already running** → leave it alone, one line saying so. Never
  stack a second; two loops means two agents racing for the same `ai-wip` slots.
  Check your scheduler (e.g. `CronList`) for a job running `/ai-loop`,
  **and** the status file: a self-paced loop schedules only its next tick, so
  it may not appear as a job. `$ROOT/.claude/ai-loop-status` modified within the
  last 35 minutes means a loop is live.
- **Otherwise** → start the self-paced loop: `/loop /ai-loop`, no
  interval. Each tick paces the next itself — see the loop skill's Pass 5.
  Without a self-paced `/loop`, fall back to a fixed `/loop 15m /ai-loop`
  or a cron entry. No scheduler → say the user should run `/ai-loop`
  manually after CI settles.

Close by reporting the cadence and how to stop it, and say plainly that the loop
will **not** merge these PRs — Pass 1 gates every `ai-ready`-derived PR to a
human (release-environment-gated repos excepted) — so the open PRs still wait on
the user's own `gh pr merge`.
