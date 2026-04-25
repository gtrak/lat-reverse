---
description: Walk the full per-concept pipeline (extraction → spec → audit) with isolated subagents and review gates
---

Execute this workflow now. Do not describe it — perform each step.

`$1`: concept_id (required). If already `audited`, restart from extraction.

If the concept's `source_sha` doesn't match git HEAD, run `bun run .lat-reverse/bin/lat-rev.ts drift <concept_id> --json`, present drift to user, let them decide before proceeding.

Do NOT do extraction, synthesis, or audit work yourself. Each phase is a `Task` subagent that reads files and returns its output as text. Your job: launch subagents, write their output to disk, present it for review, promote via CLI.

### Phase 1 — Extraction

1. Read `.lat-reverse/workflows/extract.md` and `.lat-reverse/workflows/reconstruction.md`.
2. Launch a `Task` explore subagent with the extract + reconstruction workflow content + the concept's `source_files` in the prompt. Tell it: "Read the source files and return the full extraction as text. Do not write any files — just return the content."
3. Write the returned content to `.lat-reverse/concepts/<concept_id>/extraction.md`.
4. **Review gate**: Output extraction as normal text. Use `question` tool: "Approve extraction?" with `Approve` / `I have feedback`. If feedback, re-launch with feedback in prompt.
5. After approval, run `bun run .lat-reverse/bin/lat-rev.ts concept promote <concept_id> --phase extracted`.

### Phase 2 — Synthesis

1. Read `.lat-reverse/workflows/synthesize.md` and `.lat-reverse/workflows/style.md`.
2. Launch a `Task` general subagent with the synthesize + reconstruction + style workflow content in the prompt. Include the extraction content inline. Tell it: "Produce the spec from this extraction. Return the full spec as text. Do not write any files."
3. Write the returned content to `.lat-reverse/concepts/<concept_id>/spec.md`.
4. **Review gate**: Output spec as normal text. Use `question` tool: "Approve spec?" with `Approve` / `I have feedback`. If feedback, re-launch.
5. After approval, run `bun run .lat-reverse/bin/lat-rev.ts concept promote <concept_id> --phase specified`.

### Phase 3 — Audit

1. Read `.lat-reverse/workflows/audit.md` and `.lat-reverse/workflows/reconstruction.md`.
2. Launch a `Task` explore subagent with the audit + reconstruction workflow content + the spec content + source file paths in the prompt. Tell it: "Read the spec and source files, compare them, and return the full audit as text. Do not write any files."
3. Write the returned content to `.lat-reverse/concepts/<concept_id>/audit.md`.
4. **Review gate**: Output audit as normal text, highlighting any `bug`, `spec_error`, or `undocumented_behavior` findings.
   - If **no issues found**: promote immediately.
   - If **issues found**: use `question` tool: "Audit found issues. How to proceed?" with `Fix spec (re-synthesize)` / `Fix code (I'll edit, then re-audit)` / `Accept findings (promote with caveats)`.
     - **Fix spec**: re-launch synthesis subagent with the audit findings + original extraction. Write new spec, then re-run audit.
     - **Fix code**: wait for user to edit source files, then re-run audit.
     - **Accept findings**: promote to audited. The audit.md records the known gaps.
5. Run `bun run .lat-reverse/bin/lat-rev.ts concept promote <concept_id> --phase audited`.

### Completion

Run `bun run .lat-reverse/bin/lat-rev.ts snapshot <concept_id>` to record the current source SHA. Update edges via `bun run .lat-reverse/bin/lat-rev.ts concept edge` if any emerged during phases.
