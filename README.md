<picture>
  <source media="(max-width: 640px)" srcset="./brand/banner-mobile.png">
  <img src="./brand/banner.png" alt="repo-ai banner" width="1600">
</picture>

# @rtorcato/repo-ai

The **ai-loop** pipeline: a label-driven loop that takes an `ai-ready` GitHub issue, implements it in its own git worktree, opens a PR, has two agents review it, and hands it to a human to merge.

This package holds the moving parts: the Claude Code skills, the `loop` commands they call, and a `doctor`/`fix` pair for the loop's setup. It was split out of [`@rtorcato/repo-tooling`](https://github.com/rtorcato/repo-tooling) so the tooling can be used without the loop.

See [the docs site](https://rtorcato.github.io/repo-ai/docs/ai-loop) for how the pipeline works.

## Set up

```bash
npx @rtorcato/repo-ai setup
```

> **⚠️ Costs and liability.** By installing or using repo-ai, you accept these risks and responsibilities. repo-ai runs AI agents unattended, and they spend your Anthropic credits or plan limits and your GitHub Actions minutes. The loop's limits are best-effort, not a spending guarantee. Set spend limits with your provider, and stop the loop when you aren't watching it. Agents can be wrong, so you review and merge every change. Provided as is under the MIT license, with no warranty; the authors aren't liable for costs, damages or changes made by agents. Not affiliated with Anthropic or GitHub. Read the full [Risks and responsibilities](https://rtorcato.github.io/repo-ai/docs/risks).

One guided run: the skills, the loop labels, the agent identity, and the statusline segment, asking before each, then `doctor`. The skill step installs `ai-loop`, `ai-issue`, `ai-loop-status` and `ai-tick` into `~/.claude/skills` (or `--skills-dir <path>`).

**Moving over from repo-tooling?** Skills installed by `@rtorcato/repo-tooling` carry that package's version stamp, so this installer treats them as local edits and won't overwrite them. Run it once with `--force-skills`.

## Commands

| Command | What it does |
|---|---|
| `setup [--yes] [--json]` | Onboard a repo: runs `fix config`, `fix claude-skills`, creates or repairs the loop labels, `fix ai-loop-identity` (with an agent user), and `fix statusline` — asking before each — then `doctor`. |
| `doctor [--json]` | Audit the loop setup: label spec, `.repo-ai.json` against its schema, `agentUser`, installed skills, `requiredSkills`, and whether your statusline shows the loop status. Exits 1 only on `drift` / `missing`. |
| `fix config` | Write `$schema` into `.repo-ai.json`. With no file, create one, seeded from the legacy `.repo-tooling.json` settings. |
| `fix labels` | Repair loop label colours and descriptions with `gh label edit`. |
| `fix claude-skills` | Install or update the skills, and the Workflow scripts they run by name (`workflows/*.js` → `~/.claude/workflows`). `--force-skills` overwrites a modified or newer copy. |
| `fix ai-loop-identity` | Point this checkout's Claude sessions at a `gh` profile signed in as `rules.aiLoop.agentUser`. |
| `fix statusline` | Install the loop's status segment (`🤖 2wip·1rev · next 9m`) to `~/.claude/ai-loop-statusline.sh`, replacing that file on every run (it is ours; don't edit it). Never touches an existing statusline: sets `statusLine` in `~/.claude/settings.json` only when you have none, otherwise prints the one line to add to your own script. Never prompts. |
| `loop guard` | Repair a wrongly-bare main checkout, gate the `node_modules` rebuild, and assert the agent identity. |
| `loop env` | Resolve a tick's variables (root, worktree root, owner/repo, agent and human users). |
| `loop worktree add <slug>` | Create an `ai-*` worktree off `origin/main` and link its dependencies. |
| `loop cleanup` | Remove `ai-*` worktrees whose PR has landed or closed. |
| `loop reap` | Report agents stalled past 45 minutes and what to do about each. |
| `loop comment <pr>` / `loop verdict <pr>` | Upsert the decision comment, and read a reviewer's verdict marker. |
| `loop tick` | Compute one tick's whole work list (guard, cleanup, reap, verdicts, pickups). Writes no GitHub state. |

Every command takes `--json`. Configuration lives in the repo's `.repo-ai.json` (`agentUser`, `requiredSkills`) — falling back to the legacy `.repo-tooling.json` `rules.aiLoop` / `rules.requiredSkills` when that file doesn't exist.

## License

MIT
