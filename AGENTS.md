# AGENTS.md

## Project

lat-reverse: invariant-driven specification reconstruction from existing codebases. Bun/TypeScript. No package.json scripts — use `bun` directly.

## Typecheck

```bash
bunx tsc --noEmit
```

Run this after any changes to `bin/**/*.ts` or `install.ts`.

## Key paths

| Path | Purpose |
|---|---|
| `bin/lat-rev.ts` | CLI — all state mutations go through this |
| `workflows/` | Phase workflows (substance: what to do, prompt templates) |
| `commands/` | Slash commands (orchestration: how to run subagents, CLI calls) |
| `skills/` | Discovery/index documents |
| `.lat-reverse/` | Runtime state (gitignored, created by `install.ts`) |

## Rules

- All state mutations through the CLI. Never write `state.json` directly.
- Subagents are read-only (return text). Orchestrator handles all file writes.
- Workflows hold substance, commands hold orchestration. Don't mix.
- Three isolated roles: Extractor (evidence), Synthesizer (intent), Auditor (contradictions).
- "No How" constraint: specs must not contain control flow, data structures, or function names.
- No auto-merge on overlap: present both versions for user resolution.

## Running the CLI

```bash
bun run .lat-reverse/bin/lat-rev.ts <command> [options]
```

Global flag: `--json` for machine-readable output.

## Concept lifecycle

```
candidate → extracted → specified → audited → integrated
```

## Batch operations (for large projects)

- Use `concept add-batch` not individual `concept add` calls.
- Use `concept promote-batch --from <phase> --to <phase>` not individual `concept promote` calls.
- Use `snapshot --all` not individual `snapshot` calls.

## Split granularity

- Target 1–8 source files per concept. >10 files → split further.
- For scopes with >20 files or >3 directories: hierarchical strategy (one subagent per directory, then cross-cutting).
- Verify coverage with `concept coverage`: every source file must appear in at least one concept's `source_files`.

## Workflow continuation

- Never stop mid-pipeline. Complete the full sequence before summarizing.
- Process in groups of 10–20 concepts. Output a one-line progress count after each group.
- If interrupted, re-running the workflow resumes automatically (already-processed concepts are skipped).
