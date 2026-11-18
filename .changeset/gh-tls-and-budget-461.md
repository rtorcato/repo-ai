---
"@rtorcato/repo-ai": patch
---

`loop tick` and `loop watch` report a `gh` TLS failure (Claude Code's sandbox, `x509: OSStatus -26276`) as the one cause of a halt, pointing at `fix sandbox`, instead of falsely saying the repo is unresolvable and `agentUser` is not assignable. The `ai-loop-pickup` Workflow now releases each agent's token estimate when it finishes, so `budgetTokens` caps real output spend rather than skipping reviews after a fraction of it.
