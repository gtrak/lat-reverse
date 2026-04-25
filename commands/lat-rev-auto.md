---
description: Run the full reconstruction pipeline autonomously — split, reconstruct all, integrate
---

Execute this workflow now. Do not describe it — perform each step.

Read `.lat-reverse/workflows/auto.md` for the full pipeline rules. Read the phase workflows (`extract.md`, `synthesize.md`, `audit.md`, `integrate.md`) for subagent prompt templates.

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
1. Launch a `Task` explore subagent using the prompt template from `.lat-reverse/workflows/extract.md`. Fill in source files and reconstruction.md content.
2. Write the returned content to `.lat-reverse/concepts/<id>/extraction.md`.
3. Run `bun run .lat-reverse/bin/lat-rev.ts concept promote <id> --phase extracted` — no review gate.

**Synthesize:**
1. Launch a `Task` general subagent using the prompt template from `.lat-reverse/workflows/synthesize.md`. Fill in extraction content, reconstruction.md + style.md content.
2. Write the returned content to `.lat-reverse/concepts/<id>/spec.md`.
3. Run `bun run .lat-reverse/bin/lat-rev.ts concept promote <id> --phase specified` — no review gate.

**Audit:**
1. Launch a `Task` explore subagent using the prompt template from `.lat-reverse/workflows/audit.md`. Fill in spec content, source file paths, reconstruction.md content.
2. Write the returned content to `.lat-reverse/concepts/<id>/audit.md`.
3. If audit found `bug` or `spec_error` findings, auto-correct: re-launch the synthesis subagent using the **auto-correct prompt template** from `synthesize.md` with the audit findings + original extraction. Write corrected spec. Re-run audit. Repeat until clean or only `undocumented_behavior` findings remain (max 3 cycles).
4. Once audit is clean or only has `undocumented_behavior` findings, promote via `bun run .lat-reverse/bin/lat-rev.ts concept promote <id> --phase audited`.
5. Run `bun run .lat-reverse/bin/lat-rev.ts snapshot <id>`.

### Step 3 — Integrate

1. Write all audited concepts to `lat.md/` first — do not resolve placeholders until all concepts in the batch are written.
2. For each concept: run overlap detection. **If overlap found**: pause and use `question` tool: "How to resolve overlap on <concept>?" with `Use new spec` / `Keep existing` / `I'll decide manually`. Wait for user answer. If no overlap, write directly.
3. Write `@lat:` annotations in source files.
4. Resolve `[[?...]]` placeholders: check concepts integrated in this batch first, then existing `lat.md/` via `lat locate`. Resolve where the target exists.
5. Update index files.
6. Run `lat check --dir <source_repo>`.

Do NOT do extraction, synthesis, or audit work yourself. Delegate to subagents. Write all files yourself. All state changes via CLI.
