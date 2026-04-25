---
description: Decompose a scope into concept candidates with source files and inferred graph edges
---

## Orchestration

1. Read `.lat-reverse/workflows/split.md` and `.lat-reverse/workflows/reconstruction.md` for full context.
2. `$scope` is optional — can be a directory, glob, or natural language description. Default: entire project. For a single file or very small scope, consider `/lat-rev-add` instead.
3. Use the `Task` tool with `subagent_type: "explore"` to survey the given scope. Include the workflow contents in the prompt. Tell the explore subagent: "Return a structured summary of this scope: files, their responsibilities, and how they relate." For large scopes, launch multiple explore subagents scoped to different directories.
4. From the summary, propose concept candidates following the split workflow format.
5. **Review gate**: Output candidates as normal text. Use `question` tool: "Approve these candidates?" with `Approve all` / `I have changes`. Do NOT put candidates inside the question tool.
6. After approval, add each candidate via `bun run .lat-reverse/bin/lat-rev.ts concept add <id> --name "<name>" --files <f1,f2,...>` and run `bun run .lat-reverse/bin/lat-rev.ts concept edge` for any relationships.

**Do not explore the codebase yourself.** Delegate all file reading to explore subagents. You handle all writes via the CLI.
