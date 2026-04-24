---
description: Decompose the codebase into concept candidates with source files and inferred graph edges
---

Load the **lat-reconstruction** skill before proceeding.

## Task

Decompose the codebase into concept candidates. Each candidate represents a distinct unit of responsibility defined by behavior or guarantee, not by file structure.

## Input

`$scope`: optional path, glob, or natural language scope (default: entire project).

If no scope given, analyze the full project file tree.

## Pipeline-aware behavior

Before proposing concepts, check existing state:

1. Read `.lat-reverse/state.json` to find existing concepts.
2. Run `lat-rev drift --json` to identify stale concepts.
3. For each source file:
   - Already covered by audited concepts whose sources haven't drifted → **skip**
   - Covered by stale concepts → **flag** (suggest `/reconstruct <id>` instead of re-splitting)
   - No coverage → **propose new concepts**

## Steps

1. **Explore**: Use glob/grep/read tools to understand the project structure and code.
2. **Identify candidates**: For each uncovered area, propose concept candidates with:
   - `concept_id` — unique kebab-case ID (e.g., `c_playfield`, `c_auth_validation`)
   - `name` — human-readable name
   - `source_files` — files this concept was extracted from
   - `edges` — inferred relationships to other concepts (existing or new)
3. **Enforce unique IDs**: Disambiguate when two scopes produce candidates with the same name.
4. **Review gate**: Present candidates and edges to the user via the `question` tool. User can approve, request changes, or provide feedback.
5. **Write state**: After approval, write each candidate to `.lat-reverse/state.json` as a concept with `phase: "candidate"`. Use the state schema:
   ```json
   {
     "name": "...",
     "phase": "candidate",
     "source_files": ["..."],
     "edges": { "depends_on": [], "refines": [], "constrains": [] },
     "source_sha": ""
   }
   ```
6. **Update edges**: For any relationships between new or existing concepts, run `lat-rev concept edge <id> <type> <target>`.

## Output

List of concept candidates with `concept_id`, `name`, `source_files[]`, and edge list. Written to `state.json` after user approval.
