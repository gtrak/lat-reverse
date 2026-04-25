# Auto Workflow

## Goal

Run the full reconstruction pipeline autonomously: split → reconstruct all candidates → integrate. No review gates (except integrate overlaps). Skips concepts that already exist in `state.json`.

## Scoping

`$scope` is optional — directory, glob, or natural language. Default: entire project.

## Skipping existing concepts

Before proposing new candidates, check `state.json`. Any concept ID that already exists (at any phase) is skipped. Only truly uncovered files produce new candidates.

## Pipeline

### 1. Split (no review gate)

Explore the scope, identify concept candidates, add all of them via `bun run .lat-reverse/bin/lat-rev.ts concept add` without asking for approval. Add edges via `bun run .lat-reverse/bin/lat-rev.ts concept edge`.

### 2. Reconstruct all candidates (no review gates)

For each concept with `phase: "candidate"`, run the full reconstruct pipeline. Use the subagent prompt templates and subagent types from each phase workflow (`extract.md` → `explore`, `synthesize.md` → `general`, `audit.md` → `explore`). No review gates — auto-approve each phase.

Auto-correct on audit: if audit found `bug` or `spec_error` findings, re-launch synthesis using the **auto-correct prompt template** from `synthesize.md` with the audit findings + original extraction. Write corrected spec. Re-run audit. Repeat until clean or only `undocumented_behavior` findings remain (max 3 cycles). Then promote.

Per-concept sequence:
1. Extract → write extraction.md → promote to extracted
2. Synthesize → write spec.md → promote to specified
3. Audit → write audit.md → auto-correct if needed → promote to audited
4. Snapshot

### 3. Integrate (pause on overlap conflicts)

Write all audited concepts to `lat.md/` first — do not resolve placeholders until all concepts in the batch are written.

If overlap is detected with existing `lat.md/` content, **pause and ask the user** to resolve. Otherwise, write to `lat.md/`, annotate source files, resolve placeholders (check batch first, then `lat locate`), update index files, and run `lat check`.

## Rules

- Each phase uses `Task` subagents for heavy work — auto-approve instead of review gates.
- Subagents return text, orchestrator writes files.
- All state changes go through the CLI.
- On integrate overlap: always pause. Never auto-merge.
