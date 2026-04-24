# LAT Reconstruction Workflow — Plan

## 1. Objective

Decompose an existing codebase into invariant-driven concept graphs and reconstruct lat.md-compatible specifications. Work incrementally through a lifecycle `candidate → extracted → specified → audited`. Final artifacts are written into the project's existing `lat.md/`.

Explicitly exclude implementation details, control flow, and data structures. Every statement must survive a full rewrite of the implementation.

---

## 2. Directory Layout

```
.lat-reverse/
  state.json                        # index + metadata
  bin/
    lat-rev.ts                      # state management CLI
  concepts/<concept_id>/
    extraction.md                   # evidence-backed facts (no interpretation)
    spec.md                         # intent-level specification
    audit.md                        # spec/code mismatches

<source_repo>/lat.md/              # existing lat.md docs (final destination)
```

Can live in-repo or out-of-repo (separate git repo pointed at the source via `--src`).

---

## 3. State Schema

```json
{
  "version": 1,
  "source_repo": "../",
  "units": {
    "unit_board": {
      "description": "Board state management and row clearing",
      "files": ["src/board.ts"]
    }
  },
  "concepts": {
    "c_playfield": {
      "name": "Grid-Based Playfield",
      "phase": "candidate | extracted | specified | audited",
      "origin": ["unit_board"],
      "edges": {
        "depends_on": [],
        "refines": [],
        "interacts_with": ["c_game_lifecycle"],
        "constrains": ["c_tetromino_shapes"]
      },
      "artifacts": { "extraction": true, "spec": true, "audit": true },
      "last_promoted": "2026-04-24T12:00:00Z",
      "source_snapshot": {
        "src/board.ts": "a1b2c3d"
      },
      "lat_snapshot": "f7g8h9i"
    }
  }
}
```

### Field Definitions

- **`version`**: Schema version for future migration support.
- **`source_repo`**: Path to the project being analyzed. Set by `--src` flag (default `../`). Supports in-repo (`.`) or out-of-repo (absolute/relative path to a separate project).
- **`units`**: Analysis units from decomposition. Each has a description and list of source files.
- **`concepts`**: Reconstructed concepts from the pipeline.
  - **`phase`**: Lifecycle stage. `candidate` = identified but not yet extracted. `extracted` = evidence gathered. `specified` = spec synthesized. `audited` = spec validated against code.
  - **`origin`**: Which analysis units contributed to this concept.
  - **`edges`**: Graph relationships to other concepts. Four edge types: `depends_on`, `refines`, `interacts_with`, `constrains`.
  - **`artifacts`**: Whether each phase's artifact file exists.
  - **`last_promoted`**: Timestamp of last phase advancement. Null if never promoted.
  - **`source_snapshot`**: Git blob SHA per source file at time of last reconstruction. Used for drift detection.
  - **`lat_snapshot`**: Git tree SHA of `lat.md/` directory at time of last `/integrate`. Used to detect manual edits to integrated docs.

### SHA Strategy

- **`source_snapshot`**: Git blob SHAs per file, computed from the source repo via `git rev-parse HEAD:<path>`.
- **`lat_snapshot`**: Git tree SHA of the `lat.md/` directory via `git rev-parse HEAD:lat.md/`.
- **Uncommitted files**: CLI warns ("N files uncommitted, snapshots may be inaccurate"), proceeds with HEAD SHAs.
- **No content-hash fallback**: Keeps the code simple. If files aren't committed, the signal is less precise — that's acceptable, the user is warned.

### Drift Detection

The CLI compares stored `source_snapshot` SHAs against current `git rev-parse HEAD:<path>` SHAs in the source repo. If any differ, the concept is stale. The user decides whether to re-reconstruct on a case-by-case basis.

---

## 4. Skills (3)

### 4.1 `lat-reconstruction`

Core workflow rules loaded by all reconstruction commands.

**Role separation** (strict, no crossover):

| Role | Allowed | Forbidden |
|---|---|---|
| Extractor | Observable behavior, code evidence, failure modes | Intent, rationale, "why" |
| Synthesizer | Purpose, invariants, constraints, rationale | Control flow, data structures, function names |
| Auditor | Contradictions, mismatches, violations | Rewriting, fixing, suggesting implementation |

**Invariant validity constraint**: All statements must remain true if the implementation is completely rewritten.

**"No How" constraint**: Reject outputs that include:
- Control flow descriptions
- Data structure details
- Function/method names as concept identifiers
- Implementation-specific terminology

**Compression rules**:
- Max ~5 bullets per section
- Merge overlapping claims
- Remove redundancy aggressively
- No vague language ("handles errors", "works correctly")

**Concept lifecycle**:
```
candidate → extracted → specified → audited
```
Progression requires the prerequisite artifact to exist. Regression (via `/revise`) invalidates downstream artifacts and clears their flags.

### 4.2 `lat-style`

Formatting rules from lat.md, enforced on all output specs.

**Section structure**: Every section must have a leading paragraph ≤250 characters (excluding `[[wiki link]]` content) before any child headings.

**Required sections** for each concept spec:
- `## Purpose` — what this concept guarantees
- `## Non-goals` — what it explicitly does not cover
- `## Invariants` — statements that always hold
- `## Constraints` — limitations and boundaries
- `## Rationale` — why these decisions exist
- `## Related` — `[[wiki links]]` to other concepts and source code

**Wiki link syntax**:
- Section refs: `[[file#Section#SubSection]]`
- Source code refs: `[[src/auth.ts#validateToken]]`

**Rules**:
- No implementation leakage
- No vague language
- Aggressive redundancy removal

### 4.3 `lat-reconstruct-integration`

Rules for integrating reconstructed specs with existing `lat.md/` docs in a brownfield project.

**Overlap detection**: Use `lat locate <concept_name>` to find existing sections that cover the same domain. Three outcomes:

1. **No overlap** → create new `.md` file in `lat.md/` with proper structure and index entry.
2. **Overlap, spec matches code** → edit existing section: add missing invariants, update rationale, preserve existing wiki links and leading paragraph.
3. **Overlap, spec diverges from code** → flag for manual resolution. Present both versions.

**Preservation rules**:
- Never delete existing wiki links from sections being edited.
- Preserve the leading paragraph of existing sections (append new content below).
- Maintain directory index files (every directory must have an index listing its contents).

**Post-merge**: Always run `lat check`. Report any errors for manual resolution. Record `lat_snapshot` per concept in state.

---

## 5. Commands (6)

### 5.1 `/split [$scope]`

Decompose the codebase into analysis units, extract concept candidates, and infer graph edges — all in one sweep.

| | |
|---|---|
| **Input** | `$scope`: optional path, glob, or natural language scope (default: entire project) |
| **Reads** | Project file tree. Existing `state.json` units and concepts. `lat locate` results for existing documented sections. |
| **Writes** | `.lat-reverse/state.json` — new units and concepts (phase=`candidate`) with edges. |
| **Output** | Table of units with `unit_id`, `description`, `files[]`. List of concept candidates with `concept_id`, `name`, `evidence` refs. Edge list. |

**Pipeline-aware behavior**: Before proposing units, `/split` checks:
1. Which files are already covered by audited+integrated concepts whose sources haven't drifted → **skip**
2. Which files are covered by stale concepts → **flag** (suggest `/reconstruct <id>` instead of re-splitting)
3. Which files have no coverage → **propose new units**

Overlapping splits (same files submitted again): dedupe by file list. If a unit with the same file set exists, skip. New file combinations create new units.

**Concept naming**: Enforce unique IDs. Disambiguate when two units produce candidates with the same name (e.g., `c_auth_validation` vs `c_input_validation`).

### 5.2 `/reconstruct $1`

Walk the full per-concept pipeline: extraction → spec → compress → audit. Present each phase for user review before advancing.

| | |
|---|---|
| **Input** | `$1`: concept_id (must be `candidate` or stale) |
| **Reads** | Source files from concept's origin units and evidence refs. If stale: `lat-rev drift <concept_id>` to show what changed. |
| **Writes** | `.lat-reverse/concepts/$1/extraction.md`, `spec.md`, `audit.md`. Updates `state.json` (phase, artifacts, `source_snapshot`). |
| **Output** | Three artifacts presented sequentially for review via `question` tool at each phase boundary. |

**Phase 1 — Extraction** (ROLE: Extractor):
- Extract: responsibilities (observable behavior), invariants (with code evidence + line refs), failure modes.
- No interpretation, no intent inference.
- Write to `extraction.md`. Auto-promote to `extracted`.

**Phase 2 — Synthesis** (ROLE: Synthesizer):
- Produce lat-style spec from extraction: Purpose, Non-goals, Invariants, Constraints, Rationale.
- Exclude implementation details. Validate "survives rewrite" constraint.
- Compress: ~5 bullets/section max, merge overlapping claims, remove vague language.
- Write to `spec.md`. Auto-promote to `specified`.

**Phase 3 — Audit** (ROLE: Auditor):
- Compare spec against source code. Find: violated invariants, undocumented behavior, mismatches.
- Classify each finding as `bug`, `spec_error`, or `undocumented_behavior`.
- Write to `audit.md`. Auto-promote to `audited`.

**Stale concept handling**: When re-running on a concept whose `source_snapshot` doesn't match current git HEAD:
- Show the diff (what changed in source files).
- Focus reconstruction on changed areas rather than starting from scratch.
- Record new `source_snapshot` on completion.

**Internal "no how" enforcement**: Soft — run lint pass internally after synthesis, present warnings, let the user decide whether to fix before proceeding.

### 5.3 `/revise $1 [$phase]`

Re-run reconstruction from a given phase. Invalidates downstream artifacts.

| | |
|---|---|
| **Input** | `$1`: concept_id. `$phase`: optional phase to re-run from (default: current phase). |
| **Reads** | Current artifact at the specified phase. Source files. |
| **Writes** | Overwrites artifact at the specified phase. Clears downstream artifact flags in `state.json`. Downgrades phase to the specified phase. |
| **Output** | Confirmation: "c_playfield spec revised, audit invalidated" + recommended next command. |

### 5.4 `/integrate [$1]`

Write audited concepts into the project's `lat.md/`. Create or edit sections based on overlap detection.

| | |
|---|---|
| **Input** | `$1`: optional concept_id (default: all audited concepts) |
| **Reads** | All audited concepts' `spec.md`. Project's `lat.md/` directory. `lat locate <concept_name>` per concept for overlap detection. |
| **Writes** | `lat.md/<file>.md` — creates or edits sections. Updates `lat_snapshot` per concept in `state.json`. |
| **Output** | Summary: which concepts were new (created), which overlapped (edited), any `lat check` errors needing manual resolution. |

### 5.5 `/next [$1]`

"Where am I?" — workflow status and recommended next action.

| | |
|---|---|
| **Input** | `$1`: optional concept_id |
| **Reads** | `state.json`. `lat-rev drift` for stale concept detection. |
| **Writes** | None |
| **Output** | If no arg: phase summary (count per phase) + drift report (stale concepts) + recommended next command. If arg: that concept's phase + next step. |

Example output (no arg):
```
Phase: candidate(3) extracted(1) specified(2) audited(1)
2 concepts STALE: c_playfield, c_tetromino_shapes
Recommended: /reconstruct c_playfield (source changed since last extraction)
```

Example output (with concept_id):
```
c_playfield → specified → Next: /reconstruct c_playfield will run audit phase
```

### 5.6 `/show $1 [$phase]`

Display an artifact for review.

| | |
|---|---|
| **Input** | `$1`: concept_id. `$phase`: optional phase (extraction / spec / audit). Default: latest existing artifact. |
| **Reads** | `.lat-reverse/concepts/$1/<phase>.md` |
| **Writes** | None |
| **Output** | Full contents of the artifact file. |

---

## 6. CLI (`lat-rev`)

A small TypeScript CLI at `.lat-reverse/bin/lat-rev.ts` for state management. Commands delegate state operations to this CLI instead of manipulating `state.json` directly in prompt text.

### Commands

```
# Units
lat-rev unit add <id> <description> --files f1,f2

# Concepts
lat-rev concept add <id> <name> --origin unit_1,unit_2
lat-rev concept edge <id> depends_on other_id
lat-rev concept phase <id> extracted          # set phase directly
lat-rev concept promote <id>                  # advance phase if prerequisite artifact exists
lat-rev concept merge <from_id> <into_id>      # remove from, update origin refs in into

# Artifacts
lat-rev artifact mark <concept_id> spec        # flag artifact as existing
lat-rev artifact unmark <concept_id> spec      # invalidate downstream, clear flags

# Query
lat-rev status [--concepts --units]            # print current state
lat-rev show <concept_id> [phase]              # read artifact file to stdout
lat-rev graph                                  # print concept edges
lat-rev next [concept_id]                      # workflow guidance with recommendations

# Drift
lat-rev drift                                 # report all stale concepts
lat-rev drift <concept_id>                    # show source diff for one concept
lat-rev snapshot <concept_id>                  # record current source SHAs
```

### Global options

```
lat-rev --src <path>   # override source_repo (default: read from state.json)
lat-rev --json         # machine-readable output for agent consumption
```

---

## 7. Install Script

```
bun run install.ts --mode project|global [--src /path/to/source]
```

### What it creates

1. **Skills** (3) with full frontmatter + detailed instructions + examples
   - `.opencode/skills/lat-reconstruction/SKILL.md`
   - `.opencode/skills/lat-style/SKILL.md`
   - `.opencode/skills/lat-reconstruct-integration/SKILL.md`

2. **Commands** (6) with detailed prompts calling `lat-rev` for state ops
   - `.opencode/commands/split.md`
   - `.opencode/commands/reconstruct.md`
   - `.opencode/commands/revise.md`
   - `.opencode/commands/integrate.md`
   - `.opencode/commands/next.md`
   - `.opencode/commands/show.md`

3. **CLI** at `.lat-reverse/bin/lat-rev.ts`

4. **State** at `.lat-reverse/state.json` with schema initialized and `source_repo` configured

5. **Directory** `.lat-reverse/concepts/`

6. **Permissions** merged into `opencode.json` (`skill.*: allow`)

### Mode behavior

- **`--mode global`**: Skills + commands + CLI go to `~/.config/opencode/`. State (`.lat-reverse/`) stays per-project.
- **`--mode project`**: Everything in `.opencode/` + `.lat-reverse/` in project root.

### `--src` flag

- Optional, defaults to `../` (assumes lat-reverse is a sibling of the project).
- In-repo: `--src .` (when `.lat-reverse/` is inside the project).
- Out-of-repo: `--src /absolute/path/to/project`.
- Written into `state.json` as `source_repo`.

---

## 8. Walkthrough: Tetris

Existing codebase: `src/board.ts`, `src/pieces.ts`, `src/game-state.ts`, `src/rendering.ts`, `src/input.ts`. No existing lat.md.

```
# Initialize
bun run install.ts --mode project

# Decompose
/split src/board.ts
# → unit_board created
# → concept candidates: c_playfield, c_row_clearing
# → edges: c_row_clearing depends_on c_playfield

# Check where we are
/next
# → candidate(2) extracted(0) specified(0) audited(0)
# Recommended: /reconstruct c_playfield

# Reconstruct first concept (interactive, reviews at each phase)
/reconstruct c_playfield
# → Phase 1: extraction.md written (evidence from src/board.ts)
#   "Review extraction? [approve / revise / skip]"
# → Phase 2: spec.md written (Purpose, Non-goals, Invariants, Constraints, Rationale)
#   "Review spec? [approve / revise / skip]"
# → Phase 3: audit.md written (findings classified as bug/spec_error/undocumented_behavior)
#   "Review audit? [approve / revise / skip]"
# → c_playfield promoted to audited

# Continue with remaining concepts
/next
# → candidate(1) audited(1)
# Recommended: /reconstruct c_row_clearing

/reconstruct c_row_clearing
# ... same interactive flow ...

# Split remaining areas
/split src/pieces.ts src/game-state.ts
# → more units and concepts extracted

# Eventually all concepts are audited
/integrate
# → lat locate finds no overlap for any concept
# → creates lat.md/playfield.md, lat.md/row-clearing.md, etc.
# → runs lat check — passes
# → summarizes: "Created 5 new sections, modified 0 existing sections"

# Later: code changes
/next
# → 2 concepts STALE: c_playfield (src/board.ts changed), c_row_clearing (src/board.ts changed)
# Recommended: /reconstruct c_playfield

/reconstruct c_playfield
# → shows diff: "row clearing logic moved to src/clearing.ts"
# → focused reconstruction on what changed
# → audit finds new invariant: "Clearing is now async"

/integrate c_playfield
# → edits existing lat.md/playfield.md with updated invariants
# → lat check passes
```

### Out-of-repo walkthrough

```
mkdir tetris-docs && cd tetris-docs
git init
bun run /path/to/lat-reverse/install.ts --mode project --src ~/dev/tetris

/split
/reconstruct c_playfield
/integrate
# → writes into ~/dev/tetris/lat.md/

git add . && git commit -m "reconstruct playfield concept"
# state is committed in tetris-docs repo, separately from the tetris source
```

---

## 9. Cross-cutting Concerns

### Code changes after reconstruction

Drift detection via `source_snapshot` comparison. The user is notified of stale concepts via `/next` and `lat-rev drift`. Re-reconstructing a stale concept shows the diff and focuses on changes rather than starting from scratch. The user decides case-by-case whether to re-reconstruct.

### Cross-concept invariants

Some invariants span multiple concepts (e.g., "every request must be authenticated" spans auth + routing). During `/reconstruct` on a single concept, these may be partially captured. Cross-cutting invariants can be:
- Captured as edge annotations on `constrains` relationships (the concept graph carries the invariant text).
- Or they emerge during `/integrate` when concepts are co-located in `lat.md/`.

Both approaches are valid. The CLI supports edge annotations; the agent prompt should instruct it to capture cross-concept invariants on edges when detected.

### Concept naming collisions

The CLI enforces unique IDs. The agent prompt instructs disambiguation when two units produce candidates with the same name.

### `.lat-reverse/` and git

Pipeline progress should be committed. `state.json` and `concepts/*/` are durable progress. No gitignore entries by default — the user decides what to commit.

### Uncommitted files

The CLI warns when computing snapshots against uncommitted files. No content-hash fallback. The user is responsible for committing before relying on drift detection accuracy.
