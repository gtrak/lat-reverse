# Split Workflow

## Goal

Decompose the codebase into concept candidates. Each candidate represents a distinct unit of responsibility defined by behavior or guarantee, not by file structure.

## Pipeline-aware behavior

Before proposing concepts, check existing state:

1. Read `.lat-reverse/state.json` to find existing concepts.
2. Run `bun run .lat-reverse/bin/lat-rev.ts drift --json` to identify stale concepts.
3. For each source file:
   - Already covered by audited concepts whose sources haven't drifted → **skip**
   - Covered by stale concepts → **flag** (suggest `/lat-rev-reconstruct <id>` instead of re-splitting)
   - No coverage → **propose new concepts**

## Candidate format

Each candidate has:

- `concept_id` — unique kebab-case ID (e.g., `c_playfield`, `c_auth_validation`)
- `name` — human-readable name
- `source_files` — files this concept was extracted from
- `edges` — inferred relationships to other concepts (existing or new)

Enforce unique IDs. Disambiguate when two scopes produce candidates with the same name.

## Output

Return the candidate list as text in your final message. The orchestrator will write them to `state.json` after user approval and run `bun run .lat-reverse/bin/lat-rev.ts concept edge` for any relationships.
