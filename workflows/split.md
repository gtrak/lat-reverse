# Split Workflow

## Goal

Decompose a scope into concept candidates. Each candidate represents a distinct unit of responsibility defined by behavior or guarantee, not by file structure.

## Scoping

`$scope` controls how much of the codebase to decompose:

- **No scope** — decompose the entire project
- **Directory** (e.g., `src/auth/`) — decompose only that subsystem
- **Glob** (e.g., `src/**/*.ts`) — decompose matching files
- **Natural language** (e.g., "the authentication layer") — identify relevant files first, then decompose

When scoped to a subsystem, only propose concepts whose `source_files` fall within that scope. Do not propose concepts that span outside the scope — those should be split separately or added individually via `/lat-rev-add`.

## Pipeline-aware behavior

Before proposing concepts, check existing state:

1. Read `.lat-reverse/state.json` to find existing concepts.
2. Run `bun run .lat-reverse/bin/lat-rev.ts drift --json` to identify stale concepts.
3. For each source file:
   - Already covered by audited concepts whose sources haven't drifted → **skip**
   - Covered by stale concepts → **flag** (suggest `/lat-rev-reconstruct <id>` instead of re-splitting)
   - No coverage → **propose new concepts**

## Subagent type

`explore` — surveys the codebase to identify responsibilities and relationships.

## Candidate format

Each candidate has:

- `concept_id` — unique kebab-case ID (e.g., `c_playfield`, `c_auth_validation`)
- `name` — human-readable name
- `source_files` — files this concept was extracted from
- `edges` — inferred relationships to other concepts (existing or new)

Enforce unique IDs. Disambiguate when two scopes produce candidates with the same name.

## Output

Return the candidate list as text in your final message. The orchestrator will add each via `bun run .lat-reverse/bin/lat-rev.ts concept add` and run `bun run .lat-reverse/bin/lat-rev.ts concept edge` for any relationships.
