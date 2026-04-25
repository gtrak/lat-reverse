---
description: Write audited concepts into the project's lat.md/ with overlap detection, source annotations, and placeholder resolution
---

## Orchestration

Read `.lat-reverse/workflows/integrate.md` and `.lat-reverse/workflows/lat-style.md` for full context.

`$1`: optional concept_id (default: all audited concepts). Find them in `state.json` with `phase: "audited"`.

For each concept:

1. Run overlap detection layers 1-2 via `lat locate` / `lat search` CLI commands. For layer 3, launch a `Task` explore subagent with the integrate workflow + the new spec content + matched lat.md/ file paths. Tell it: "Read these files and report which claims match, diverge, or are missing. Do not write any files."
2. **Review gate** (if overlap found): Output overlap report as normal text. `question` tool: "How to resolve overlap on <concept>?" with `Use new spec` / `Keep existing` / `I'll decide manually`.
3. **You** write to `lat.md/` following integrate workflow rules. Use explore subagents to read any lat.md/ files you haven't already seen.
4. **You** write `@lat:` annotations in source files.
5. **You** resolve `[[?...]]` placeholders.
6. **You** update index files.
7. Run `lat check --dir <source_repo>`.

**You handle all writes.** Explore subagents are read-only — they gather and return information only.
