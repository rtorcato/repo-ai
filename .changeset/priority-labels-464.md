---
"@rtorcato/repo-ai": minor
---

Add six priority labels to the ai-loop label set: `bug-p1`, `bug-p2`, `bug-p3` for broken things and `fix-p1`, `fix-p2`, `fix-p3` for things that need fixing but aren't broken. `doctor` and `fix labels` now create them. Every agent filing path (the review follow-up prompts, the `ai-issue` and `ai-loop` skills, the pickup Workflow) applies exactly one to a defect or fix, with a shared rubric. `loop tick` picks up `ai-ready` issues in the order `bug-p1`, `fix-p1`, `bug-p2`, `fix-p2`, `bug-p3`, `fix-p3`, then the rest (a plain `bug` still first among those), oldest first within each; `/ai-loop-status` lists the queue the same way. The docs and `LabelChips` show the new labels and rubric.
