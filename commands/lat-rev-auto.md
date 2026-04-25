---
description: Run the full reconstruction pipeline autonomously — split, reconstruct all, integrate
---

Execute this workflow now. Do not describe it — perform each step.

Read `.lat-reverse/workflows/auto.md`, `.lat-reverse/workflows/reconstruction.md`, `.lat-reverse/workflows/style.md`, and the phase workflows (`extract.md`, `synthesize.md`, `audit.md`, `integrate.md`).

`$scope` is optional — directory, glob, or natural language. Default: entire project.

### Step 1 — Split

1. Launch a `Task` explore subagent to survey the given scope. Tell it: "Return a structured summary: files, responsibilities, how they relate."
2. Check `state.json` for existing concepts — skip any whose source files are already covered.
3. Identify new concept candidates.
4. Add all new candidates via `bun run .lat-reverse/bin/lat-rev.ts concept add <id> --name "<name>" --files <f1,f2,...>` — no review gate.
5. Add edges via `bun run .lat-reverse/bin/lat-rev.ts concept edge` for any relationships.

### Step 2 — Reconstruct all

For each concept with `phase: "candidate"`:

**Extract:**
1. Launch a `Task` explore subagent with extract + reconstruction workflow content + the concept's `source_files`. Tell it: "Read the source files and return the full extraction as text. Do not write any files."
2. Write the returned content to `.lat-reverse/concepts/<id>/extraction.md`.
3. Run `bun run .lat-reverse/bin/lat-rev.ts concept promote <id> --phase extracted` — no review gate.

**Synthesize:**
1. Launch a `Task` general subagent with synthesize + reconstruction + style workflow content + extraction content inline. Tell it: "Produce the spec from this extraction. Return the full spec as text. Do not write any files."
2. Write the returned content to `.lat-reverse/concepts/<id>/spec.md`.
3. Run `bun run .lat-reverse/bin/lat-rev.ts concept promote <id> --phase specified` — no review gate.

**Audit:**
1. Launch a `Task` explore subagent with audit + reconstruction workflow content + spec content + source file paths. Tell it: "Read the spec and source files, compare them, and return the full audit as text. Do not write any files."
2. Write the returned content to `.lat-reverse/concepts/<id>/audit.md`.
3. Run `bun run .lat-reverse/bin/lat-rev.ts concept promote <id> --phase audited` — no review gate.
4. Run `bun run .lat-reverse/bin/lat-rev.ts snapshot <id>`.

### Step 3 — Integrate

For each concept with `phase: "audited"`:

1. Run overlap detection layers 1-2 via `lat locate` / `lat search`. For layer 3, launch a `Task` explore subagent with the integrate workflow + spec content + matched lat.md/ paths. Tell it: "Read these files and report which claims match, diverge, or are missing. Do not write any files."
2. **If overlap found**: pause and use `question` tool: "How to resolve overlap on <concept>?" with `Use new spec` / `Keep existing` / `I'll decide manually`. Wait for user answer.
3. Write to `lat.md/` following integrate workflow rules.
4. Write `@lat:` annotations in source files.
5. Resolve `[[?...]]` placeholders.
6. Update index files.
7. Run `lat check --dir <source_repo>`.

Do NOT do extraction, synthesis, or audit work yourself. Delegate to subagents. Write all files yourself. All state changes via CLI.
