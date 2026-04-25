---
description: Decompose a scope into concept candidates with source files and inferred graph edges
---

Execute this workflow now. Do not describe it — perform each step.

1. Read `.lat-reverse/workflows/split.md` and `.lat-reverse/workflows/reconstruction.md`.
2. `$scope` is optional — directory, glob, or natural language. Default: entire project. For a single file, use `/lat-rev-add` instead.
3. Launch a `Task` explore subagent to survey the given scope. Include the workflow contents in its prompt. Tell it: "Return a structured summary of this scope: files, their responsibilities, and how they relate." For large scopes, launch multiple explore subagents scoped to different directories.
4. From the summary, propose concept candidates following the split workflow format.
5. **Review gate**: Output candidates as normal text. Use `question` tool: "Approve these candidates?" with `Approve all` / `I have changes`. Do NOT put candidates inside the question tool.
6. After approval, add each candidate via `bun run .lat-reverse/bin/lat-rev.ts concept add <id> --name "<name>" --files <f1,f2,...>` and run `bun run .lat-reverse/bin/lat-rev.ts concept edge` for any relationships.

Do not explore the codebase yourself. Delegate all file reading to explore subagents. Handle all writes via the CLI.
