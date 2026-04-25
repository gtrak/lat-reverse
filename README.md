# lat-reverse

Reconstruct invariant-driven specifications from an existing codebase that doesn't have them. Decomposes code into concept graphs and produces [lat.md](https://lat.md)-compatible documentation that survives full rewrites, that you can maintain more incrementally going forward.

## What it does

- Decomposes a codebase into concept candidates (units of responsibility)
- Extracts evidence-backed facts (no interpretation)
- Synthesizes intent-level specifications (no implementation details)
- Audits specs against code for contradictions
- Integrates audited specs into the project's `lat.md/` with bidirectional `@lat:` annotations

Every statement in a spec must remain true if the implementation is completely rewritten.

## Concept lifecycle

```
candidate → extracted → specified → audited → integrated
```

Each phase is interactive — artifacts are presented for review before advancing. The auto mode (`/lat-rev-auto`) skips review gates and auto-corrects on audit findings.

## Quick start

```bash
# Install into the current project
bun run install.ts --mode project

# Or install globally (skills + commands go to ~/.opencode/)
bun run install.ts --mode global

# Specify a different source directory
bun run install.ts --mode project --src-dir /path/to/codebase
```

This creates:

| Path | Purpose |
|---|---|
| `.lat-reverse/workflows/` | Phase workflows + shared rules (reconstruction, style, extract, synthesize, audit, integrate, split, add, auto) |
| `.opencode/skills/lat-reconstruction/SKILL.md` | Discovery doc — workflow table, command table, lifecycle |
| `.opencode/commands/lat-rev-split.md` | Decompose codebase into candidates |
| `.opencode/commands/lat-rev-add.md` | Identify a single concept from a file/small scope |
| `.opencode/commands/lat-rev-reconstruct.md` | Run extraction → synthesis → audit (interactive) |
| `.opencode/commands/lat-rev-auto.md` | Full autonomous pipeline (split → reconstruct all → integrate) |
| `.opencode/commands/lat-rev-integrate.md` | Write specs into `lat.md/` |
| `.opencode/commands/lat-rev-next.md` | Show workflow status |
| `.lat-reverse/bin/lat-rev.ts` | State management CLI |
| `.lat-reverse/state.json` | Concept index + metadata |
| `.lat-reverse/concepts/` | Per-concept artifacts |

## Usage (in opencode)

```
/lat-rev-split [scope]           Decompose a scope into concept candidates
/lat-rev-add <file|scope>        Identify a single concept from a file or small scope
/lat-rev-reconstruct <id>        Run the full pipeline for a concept (interactive)
/lat-rev-auto [scope]           Full autonomous pipeline (no review gates)
/lat-rev-integrate [<id>]        Write audited specs into lat.md/
/lat-rev-next [<id>]             Show status and recommended next action
```

## CLI

```bash
bun run .lat-reverse/bin/lat-rev.ts init [--src-dir <path>] [--force]
bun run .lat-reverse/bin/lat-rev.ts concept add <id> --name "<name>" --files <f1,f2,...>
bun run .lat-reverse/bin/lat-rev.ts concept add-batch --file <path|->   # JSON array on stdin if --file -
bun run .lat-reverse/bin/lat-rev.ts concept promote <id> --phase <extracted|specified|audited|integrated>
bun run .lat-reverse/bin/lat-rev.ts concept promote-batch --from <phase> --to <phase>
bun run .lat-reverse/bin/lat-rev.ts concept reset <id>
bun run .lat-reverse/bin/lat-rev.ts concept show <id>
bun run .lat-reverse/bin/lat-rev.ts concept edge <id> <edge_type> <target_id>
bun run .lat-reverse/bin/lat-rev.ts concept list [--phase <phase>]
bun run .lat-reverse/bin/lat-rev.ts concept next [--count N]
bun run .lat-reverse/bin/lat-rev.ts concept coverage
bun run .lat-reverse/bin/lat-rev.ts status
bun run .lat-reverse/bin/lat-rev.ts drift [<id>] [--json]
bun run .lat-reverse/bin/lat-rev.ts snapshot <id>
bun run .lat-reverse/bin/lat-rev.ts snapshot --all [--phase <phase>]

# Concept lifecycle: candidate → extracted → specified → audited → integrated
# Edge types: depends_on, refines, constrains
# Global flag: --json for machine-readable output
```

## Architecture

- **Workflows** hold substance (what to do, subagent prompt templates, rules)
- **Commands** hold orchestration (how to run subagents, review gates, CLI calls)
- **Skills** are discovery/index documents pointing to workflows and commands
- Subagents are read-only (return text), orchestrator handles all file writes
- All state mutations go through the CLI

## Drift detection

When source code changes after reconstruction, concepts become stale. `bun run .lat-reverse/bin/lat-rev.ts drift` compares the stored `source_sha` against the current git HEAD and reports which source files changed. The user decides whether to re-reconstruct on a case-by-case basis.

## Design principles

- **Role separation**: Extractor (evidence only), Synthesizer (intent only), Auditor (contradictions only) — each runs in an isolated subagent
- **"No How" constraint**: No control flow, data structures, or function names in specs
- **Invariant validity**: Every statement must survive a complete rewrite
- **No auto-merge**: Overlap detection presents both versions for user resolution
- **Bidirectional traceability**: `@lat:` annotations in source code, wiki links in specs
