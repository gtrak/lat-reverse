# Auto Workflow

## Goal

Run the full reconstruction pipeline autonomously: split → reconstruct all candidates → integrate. No review gates. Skips concepts that already exist in `state.json`.

## Scoping

`$scope` is optional — directory, glob, or natural language. Default: entire project.

## Skipping existing concepts

Before proposing new candidates, check `state.json`. Any concept ID that already exists (at any phase) is skipped. Only truly uncovered files produce new candidates.

## Pipeline

### 1. Split (no review gate)

Explore the scope, identify concept candidates, add all of them via `bun run .lat-reverse/bin/lat-rev.ts concept add` without asking for approval.

### 2. Reconstruct all candidates (no review gates)

For each concept with `phase: "candidate"`, run the full reconstruct pipeline:

- **Extract**: Launch explore subagent with extract + reconstruction workflow content. Write output to `.lat-reverse/concepts/<id>/extraction.md`. Promote via `bun run .lat-reverse/bin/lat-rev.ts concept promote <id> --phase extracted`.
- **Synthesize**: Launch general subagent with synthesize + reconstruction + style workflow content + extraction content inline. Write output to `.lat-reverse/concepts/<id>/spec.md`. Promote via `bun run .lat-reverse/bin/lat-rev.ts concept promote <id> --phase specified`.
- **Audit**: Launch explore subagent with audit + reconstruction workflow content + spec content + source file paths. Write output to `.lat-reverse/concepts/<id>/audit.md`. Promote via `bun run .lat-reverse/bin/lat-rev.ts concept promote <id> --phase audited`.
- **Snapshot**: Run `bun run .lat-reverse/bin/lat-rev.ts snapshot <id>`.

### 3. Integrate (pause on overlap conflicts)

For each concept with `phase: "audited"`, run integrate. If overlap is detected with existing `lat.md/` content, **pause and ask the user** to resolve. Otherwise, write to `lat.md/`, annotate source files, resolve placeholders, update index files, and run `lat check`.

## Rules

- Each phase still uses `Task` subagents for heavy work — the orchestrator just auto-approves instead of asking the user.
- Subagents return text, orchestrator writes files.
- All state changes go through the CLI.
- On integrate overlap: always pause. Never auto-merge.
