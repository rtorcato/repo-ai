---
title: Introduction
slug: /
sidebar_position: 0
description: What repo-ai is, what it ships, and where to start.
---

# repo-ai

`@rtorcato/repo-ai` is the **ai-issue-loop** pipeline: a label-driven loop that
takes an `ai-ready` GitHub issue, implements it in its own git worktree, opens a
PR, has two agents review it, and hands it to a human to merge.

It was split out of [`@rtorcato/repo-tooling`](https://rtorcato.github.io/repo-tooling/)
so the tooling can be used without the loop. repo-tooling still owns the
repo-side standard the loop relies on — branch protection, auto-merge, and the
`.claude/settings.json` worktree config.

## What it ships

- **Claude Code skills** — `ai-workflow` (the entry point), `ai-issue-loop` (the
  engine), `ai-issue` (the on-ramp), and `ai-loop-status` (a read-only view).
- **`loop` commands** — the mechanics the skills call, as tested code:
  `loop tick`, `loop guard`, `loop worktree add`, `loop reap`, and more.
- **`doctor` / `fix`** — audit and repair the loop's own setup: labels, the agent
  user, and the installed skills.

Every command takes `--json`.

## Start here

1. Install the skills: `npx @rtorcato/repo-ai fix claude-skills`.
2. Check the repo meets the [prerequisites](./ai-issue-loop.md#repo-prerequisites).
3. File an issue with `/ai-issue`, then run `/ai-workflow` in Claude Code.

:::note Pre-release
`@rtorcato/repo-ai` is not on npm yet. Until the first release, run the CLI from a
clone: `pnpm install && pnpm build && node dist/cli/index.js <command>`.
:::

Read [The AI Issue Loop](./ai-issue-loop.md) for how the pipeline works, and
[Commands](./commands.md) for every command.
