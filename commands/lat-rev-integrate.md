---
description: Write audited concepts into the project's lat.md/ with overlap detection, source annotations, and placeholder resolution
---

Execute this workflow now. Do not describe it — perform each step.

Read `.lat-reverse/workflows/integrate.md` and `.lat-reverse/workflows/style.md`.

`$1`: optional concept_id (default: all audited concepts). Run `bun run .lat-reverse/bin/lat-rev.ts status --json` to find them.

For each concept:

1. Run overlap detection layers 1-2 via `lat locate` / `lat search` CLI commands. For layer 3, launch a `Task` explore subagent with the integrate workflow + the new spec content + matched lat.md/ file paths. Tell it: "Read these files and report which claims match, diverge, or are missing. Do not write any files."
2. **Review gate** (if overlap found): Output overlap report as normal text. Use `question` tool: "How to resolve overlap on <concept>?" with `Use new spec` / `Keep existing` / `I'll decide manually`.
3. Write to `lat.md/` following integrate workflow rules. Use explore subagents to read any lat.md/ files you haven't already seen.
4. Write `@lat:` annotations in source files.
5. Resolve `[[?...]]` placeholders.
6. Update index files.
7. Run `lat check --dir <source_repo>`.

You handle all writes. Explore subagents are read-only — they gather and return information only.
