# lat-reverse

Reconstruct invariant-driven specifications from an existing codebase. Decomposes code into concept graphs and produces [lat.md](https://github.com/anomalyco/lat)-compatible documentation that survives full rewrites.

## What it does

- Decomposes a codebase into concept candidates (units of responsibility)
- Extracts evidence-backed facts (no interpretation)
- Synthesizes intent-level specifications (no implementation details)
- Audits specs against code for contradictions
- Integrates audited specs into the project's `lat.md/` with bidirectional `@lat:` annotations

Every statement in a spec must remain true if the implementation is completely rewritten.

## Concept lifecycle

```
candidate → extracted → specified → audited
```

Each phase is interactive — artifacts are presented for review before advancing.

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
| `.opencode/skills/lat-reconstruction/SKILL.md` | Core workflow rules |
| `.opencode/skills/lat-style/SKILL.md` | Formatting rules |
| `.opencode/commands/lat-rev-split.md` | Decompose codebase into candidates |

| `.opencode/commands/lat-rev-reconstruct.md` | Run extraction → synthesis → audit |

| `.opencode/commands/lat-rev-integrate.md` | Write specs into `lat.md/` |

| `.opencode/commands/lat-rev-next.md` | Show workflow status |
| `.lat-reverse/bin/lat-rev.ts` | State management CLI |
| `.lat-reverse/state.json` | Concept index + metadata |
| `.lat-reverse/concepts/` | Per-concept artifacts |

## Usage (in opencode)

```
/lat-rev-split                  Decompose the codebase into concept candidates
/lat-rev-reconstruct <id>       Run the full pipeline for a concept
/lat-rev-integrate [<id>]       Write audited specs into lat.md/
/lat-rev-next [<id>]            Show status and recommended next action
```

## CLI

```bash
lat-rev init [--src-dir <path>] [--force]
lat-rev concept edge <id> <edge_type> <target_id>
lat-rev status [<concept_id>]
lat-rev drift [<concept_id>]
lat-rev snapshot <concept_id>

# Edge types: depends_on, refines, constrains
# Global flag: --json for machine-readable output
```

## Drift detection

When source code changes after reconstruction, concepts become stale. `lat-rev drift` compares the stored `source_sha` against the current git HEAD and reports which source files changed. The user decides whether to re-reconstruct on a case-by-case basis.

## Design principles

- **Role separation**: Extractor (evidence only), Synthesizer (intent only), Auditor (contradictions only) — each runs in an isolated subagent
- **"No How" constraint**: No control flow, data structures, or function names in specs
- **Invariant validity**: Every statement must survive a complete rewrite
- **No auto-merge**: Overlap detection presents both versions for user resolution
- **Bidirectional traceability**: `@lat:` annotations in source code, wiki links in specs
