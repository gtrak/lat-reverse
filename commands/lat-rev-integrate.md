---
description: Write audited concepts into the project's lat.md/ with overlap detection, source annotations, and placeholder resolution
---

## Orchestration

Read `.lat-reverse/workflows/integrate.md` and `.lat-reverse/workflows/lat-style.md` for full context.

`$1`: optional concept_id (default: all audited concepts). Find them in `state.json` with `phase: "audited"`.

For each concept:

1. Run overlap detection (layers 1-2 via CLI, layer 3 via `Task` explore subagent). Include the integrate workflow content in the subagent prompt.
2. **Review gate** (if overlap found): Output overlap report as normal text. `question` tool: "How to resolve overlap on <concept>?" with `Use new spec` / `Keep existing` / `I'll decide manually`.
3. Write to `lat.md/` following integrate workflow rules. Delegate file reading to subagents where possible.
4. Write `@lat:` annotations in source files.
5. Resolve `[[?...]]` placeholders.
6. Update index files.
7. Run `lat check --dir <source_repo>`.

**Do not read lat.md/ files yourself** — delegate to explore subagents.
