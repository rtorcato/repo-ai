---
"@rtorcato/repo-ai": minor
---

Add a `human-wip` label for an issue a human is working. `loop tick` never picks it up, even with `ai-ready`, and never decays an `ai-suggested` issue carrying it. `doctor` and `fix labels` create it, and the dashboard shows it as its own `human` stage.
