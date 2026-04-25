---
description: Decompose the codebase into concept candidates with source files and inferred graph edges
---

## Orchestration

1. Read `.lat-reverse/workflows/split.md` and `.lat-reverse/workflows/lat-reconstruction.md` for full context.
2. Use the `Task` tool with `subagent_type: "explore"` to survey the project. Include the workflow contents in the prompt. The subagent returns a structured summary of the codebase.
3. From the summary, propose concept candidates following the split workflow format.
4. **Review gate**: Output candidates as normal text. Use `question` tool: "Approve these candidates?" with `Approve all` / `I have changes`. Do NOT put candidates inside the question tool.
5. After approval, write each candidate to `state.json` and run `bun run .lat-reverse/bin/lat-rev.ts concept edge` for any relationships.

**Do not explore the codebase yourself.** Delegate all file reading to subagents.
