---
title: Introduction
slug: /
sidebar_position: 0
description: What repo-ai is, what it ships, and where to start.
---

# repo-ai

`@rtorcato/repo-ai` is the **ai-loop** pipeline: a label-driven loop that
takes an `ai-ready` GitHub issue, implements it in its own git worktree, opens a
PR, has two agents review it, and hands it to a human to merge.

It was split out of [`@rtorcato/repo-tooling`](https://rtorcato.github.io/repo-tooling/)
so the tooling can be used without the loop. repo-tooling still owns the
repo-side standard the loop relies on — branch protection, auto-merge, and the
`.claude/settings.json` worktree config.

:::warning

**Costs and liability.** By installing or using repo-ai, you accept these risks and responsibilities. repo-ai runs AI agents unattended, and they spend your Anthropic credits or plan limits and your GitHub Actions minutes. The loop's limits are best-effort, not a spending guarantee. Set spend limits with your provider, and stop the loop when you aren't watching it. Agents can be wrong, so you review and merge every change. Provided as is under the MIT license, with no warranty; the authors aren't liable for costs, damages or changes made by agents. Not affiliated with Anthropic or GitHub. Read the full [Risks and responsibilities](./risks.md).

:::

## What it ships

- **Claude Code skills** — `ai-loop` (the entry point and the engine),
  `ai-issue` (the on-ramp), and `ai-loop-status` (a read-only view).
- **`loop` commands** — the mechanics the skills call, as tested code:
  `loop tick`, `loop guard`, `loop worktree add`, `loop reap`, and more.
- **`doctor` / `fix`** — audit and repair the loop's own setup: labels, the agent
  user, and the installed skills.

Every command takes `--json`.

## Requirements

repo-ai targets **Claude Code** only for now; other agent harnesses aren't supported yet. What each part depends on:

| Part | Depends on |
|---|---|
| `repo-ai` CLI (`loop …`, `doctor`, `fix`, `setup`) | Node ≥ 22 and `gh`. Harness-neutral, so any agent or script can call it |
| Skills (`ai-loop`, `ai-issue`, `ai-loop-status`) | The Claude Code skill format |
| Parallel implement/review (`ai-loop` Pass 3 and Pass 4, via the `ai-loop-pass3` and `ai-loop-pickup` workflows) | The **Workflow** tool. Named reviewer types (`code-reviewer`, `security-expert`) need them in the Agent tool's registry; otherwise the reviewers run as `general-purpose`. Without Workflow, `ai-loop` falls back to background Agent calls |
| Self-scheduling (`/ai-loop` keeps itself going) | A session-scoped recurring **CronCreate** job |
| Wake on change (`loop watch`) | The **Monitor** tool |
| Statusline segment | Claude Code's statusline JSON |

Workflow runs show in `/workflows`. If you edit the scripts in `workflows/`, load `/workflow-authoring` first.

## Start here

1. Run `npx @rtorcato/repo-ai setup` — skills, labels, agent identity and statusline, asking before each.
2. Check the repo meets the [prerequisites](./ai-loop.md#repo-prerequisites).
3. File an issue with `/ai-issue`, then run `/ai-loop` in Claude Code.

Read [The AI Loop](./ai-loop.md) for how the pipeline works, and
[Commands](./commands.md) for every command.
