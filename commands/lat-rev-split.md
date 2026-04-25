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
   - Covered by stale concepts → **flag** (suggest `/lat-rev-reconstruct <id>` instead of re-splitting)
   - No coverage → **propose new concepts**

## Steps

1. **Explore (delegate to subagent)**: Use the `Task` tool with `subagent_type: "explore"` to survey the project. Pass a detailed prompt telling the explore subagent to map the codebase structure, identify files and their responsibilities, and return a structured summary. **Do not explore the codebase yourself** — delegate it so your own context stays small.

2. **Identify candidates**: From the explore subagent's summary, propose concept candidates with:
   - `concept_id` — unique kebab-case ID (e.g., `c_playfield`, `c_auth_validation`)
   - `name` — human-readable name
   - `source_files` — files this concept was extracted from
   - `edges` — inferred relationships to other concepts (existing or new)

3. **Enforce unique IDs**: Disambiguate when two scopes produce candidates with the same name.

4. **Review gate**: Output your proposed candidates and edges as normal text first. Then use the `question` tool with a concise question like "Approve these candidates?" and options like `Approve all` / `I have changes`. Do NOT put the full candidate list inside the question tool — the user already saw it in your output.

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

## Critical: use subagents for heavy work

The explore step reads many files and can exhaust your context. **Always delegate exploration to a `Task` subagent.** Your own job is to orchestrate: read the subagent's summary, identify candidates, present them for review, and write state. Do NOT read source files yourself.
