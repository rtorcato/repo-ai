---
name: ai-tick
model: sonnet
description: |
  Run one ai-loop tick **now**, without waiting for the self-paced loop's next
  wakeup — e.g. right after merging a PR or labelling an issue `ai-ready`. Use
  when the user says "tick now", "run a tick", or invokes `/ai-tick`. Exactly
  the `ai-loop` tick, but it never schedules anything, so a running
  `/loop /ai-loop` keeps its own wakeup. Never merges. GitHub only (`gh`) —
  not GitLab.
---

# ai-tick

Run one tick of the `ai-loop` pipeline immediately. Arguments: $ARGUMENTS

Read the installed `ai-loop` skill (`ai-loop/SKILL.md`, next to this one) and
run **its tick exactly as written**, Pass 0 through Pass 5 — every rule, limit
and guard applies unchanged. The tick lives there only, so the two can't drift.

## The one override: Pass 5 schedules nothing

Treat this as a plain `/ai-loop` invocation, whatever else is running: **never
call `ScheduleWakeup`**. A `/loop /ai-loop` already running keeps its own
wakeup, and a second one would double every tick after this.

Pass 5 still notifies and writes the status file, but keeps a pending wakeup
instead of setting `DELAY`, so the statusline keeps saying `next 9m` rather than
`manual`:

```bash
PREV_NEXT=$(sed -n 3p "$STATUS" 2>/dev/null)
NEXT=$([ "${PREV_NEXT:-0}" -gt "$(date +%s)" ] 2>/dev/null && printf '%s' "$PREV_NEXT")
printf '%s\n%s\n%s\n' "$SUMMARY" "$SUGGESTED" "$NEXT" > "$STATUS"
```

End with `Next tick: in <N>m (already scheduled)` when `NEXT` is set, else
`Next tick: none scheduled — run /ai-tick, or /loop /ai-loop to keep it going`.
