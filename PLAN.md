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
  "concepts": {
    "c_playfield": {
      "name": "Grid-Based Playfield",
      "phase": "candidate | extracted | specified | audited",
      "source_files": ["src/board.ts"],
      "edges": {
        "depends_on": [],
        "refines": [],
        "interacts_with": ["c_game_lifecycle"],
        "constrains": ["c_tetromino_shapes"]
      },
      "source_sha": "a1b2c3d",
      "lat_snapshot": "f7g8h9i"
    }
  }
}
```

### Field Definitions

- **`version`**: Schema version for future migration support.
- **`source_repo`**: Path to the project being analyzed. Set by `--src` flag (default `../`). Supports in-repo (`.`) or out-of-repo (absolute/relative path to a separate project).
- **`concepts`**: Reconstructed concepts from the pipeline.
  - **`phase`**: Lifecycle stage. `candidate` = identified but not yet extracted. `extracted` = evidence gathered. `specified` = spec synthesized. `audited` = spec validated against code.
  - **`source_files`**: Source files this concept was extracted from. Replaces the previous `origin` (unit indirection) — concepts reference files directly.
  - **`edges`**: Graph relationships to other concepts. Four edge types: `depends_on`, `refines`, `interacts_with`, `constrains`.
  - **`source_sha`**: Single git commit SHA of the source repo at time of last reconstruction (`git rev-parse HEAD`). Used for drift detection. Compare against current HEAD; if different, run `git diff <stored_sha> HEAD -- <source_files>` to identify which files changed.
  - **`lat_snapshot`**: Git tree SHA of `lat.md/` directory at time of last `/integrate` (`git rev-parse HEAD:lat.md/`). Used to: (1) warn if lat.md/ has uncommitted changes at `/integrate` time, (2) diff against stored snapshot on next `/integrate` to detect manual edits to integrated docs.

### SHA Strategy

- **`source_sha`**: Single commit SHA from source repo via `git rev-parse HEAD`.
- **`lat_snapshot`**: Git tree SHA of `lat.md/` directory via `git rev-parse HEAD:lat.md/`.
- **Uncommitted files**: CLI warns ("N files uncommitted, snapshots may be inaccurate"), proceeds with HEAD SHAs.

### Drift Detection

Compare stored `source_sha` against current `git rev-parse HEAD` in the source repo. If different, the concept is stale. Run `git diff <stored_sha> HEAD -- <source_files>` to show which files changed. The user decides whether to re-reconstruct on a case-by-case basis.

---

## 4. Skills (2)

### 4.1 `lat-reconstruction`

Core workflow rules loaded by all reconstruction commands.

**Role separation** (strict, enforced via subagent isolation):

Each phase of `/reconstruct` runs in an isolated subagent context. No shared conversation state between roles.

| Role | Allowed | Forbidden |
|---|---|---|
| Extractor | Observable behavior, code evidence, failure modes | Intent, rationale, "why" |
| Synthesizer | Purpose, invariants, constraints, rationale | Control flow, data structures, function names |
| Auditor | Contradictions, mismatches, violations, implementation leakage | Rewriting, fixing, suggesting implementation |

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

**Source code wiki link restriction**: `[[src/file.ts#symbol]]` links are allowed only in the `Related` section of a spec. Banned from Purpose, Invariants, Constraints, and Rationale — these sections must be implementation-agnostic.

**Concept lifecycle**:
```
candidate → extracted → specified → audited
```
Progression requires the prerequisite artifact to exist and be approved by the user. Re-running `/reconstruct` on an already-audited concept restarts from scratch (extraction phase). Feedback is provided during review gates — no separate `/revise` command.

**Edge updates**: During `/reconstruct`, if new relationships between concepts emerge, update edges via `lat-rev concept edge`.

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

---

## 5. Commands (4)

### 5.1 `/split [$scope]`

Decompose the codebase into concept candidates with source files and inferred graph edges.

| | |
|---|---|
| **Input** | `$scope`: optional path, glob, or natural language scope (default: entire project) |
| **Reads** | Project file tree. Existing `state.json` concepts. `lat locate` results for existing documented sections. |
| **Writes** | `.lat-reverse/state.json` — new concepts (phase=`candidate`) with source files and edges. |
| **Output** | List of concept candidates with `concept_id`, `name`, `source_files[]`. Edge list. |

**Review gate**: After proposing concepts and edges, present them to the user via the `question` tool for confirmation. User can approve, request changes, or provide feedback before anything is written to state.

**Pipeline-aware behavior**: Before proposing concepts, `/split` checks:
1. Which files are already covered by audited+integrated concepts whose sources haven't drifted → **skip**
2. Which files are covered by stale concepts → **flag** (suggest `/reconstruct <id>` instead of re-splitting)
3. Which files have no coverage → **propose new concepts**

**Concept naming**: Enforce unique IDs. Disambiguate when two scopes produce candidates with the same name (e.g., `c_auth_validation` vs `c_input_validation`).

### 5.2 `/reconstruct $1`

Walk the full per-concept pipeline: extraction → spec → audit. Each phase runs in an isolated subagent. Present each phase artifact for user review before advancing.

| | |
|---|---|
| **Input** | `$1`: concept_id (any phase; if already `audited`, restarts from extraction) |
| **Reads** | Source files from concept's `source_files`. If stale: `lat-rev drift <concept_id>` to show what changed. |
| **Writes** | `.lat-reverse/concepts/$1/extraction.md`, `spec.md`, `audit.md`. Updates `state.json` (phase, `source_sha`). |
| **Output** | Three artifacts presented sequentially for review via `question` tool at each phase boundary. |

**Phase 1 — Extraction** (ROLE: Extractor, isolated subagent):
- Extract: responsibilities (observable behavior), invariants (with code evidence + line refs), failure modes.
- No interpretation, no intent inference.
- Write to `extraction.md`. Present for user review. Promote to `extracted` after user approves.

**Phase 2 — Synthesis** (ROLE: Synthesizer, isolated subagent):
- Produce lat-style spec from extraction: Purpose, Non-goals, Invariants, Constraints, Rationale.
- Exclude implementation details. Validate "survives rewrite" constraint.
- Compress: ~5 bullets/section max, merge overlapping claims, remove vague language.
- Write to `spec.md`. Present for user review. Promote to `specified` after user approves.

**Phase 3 — Audit** (ROLE: Auditor, isolated subagent):
- Compare spec against source code. Find: violated invariants, undocumented behavior, mismatches.
- Run "No How" lint: flag implementation-specific statements even if they happen to match the code.
- Classify each finding as `bug`, `spec_error`, or `undocumented_behavior`.
- Write to `audit.md`. Present for user review. Promote to `audited` after user approves.

**Stale concept handling**: When re-running on a concept whose `source_sha` doesn't match current git HEAD:
- Show the diff via `git diff <stored_sha> HEAD -- <source_files>`.
- Focus reconstruction on changed areas rather than starting from scratch.
- Record new `source_sha` on completion.

**Review gate behavior**: At each phase boundary, present the artifact and ask: approve / provide feedback. If feedback is given, re-run that phase in a fresh subagent with the feedback incorporated. No separate `/revise` command — feedback is handled inline.

### 5.3 `/integrate [$1]`

Write audited concepts into the project's `lat.md/`. Create or edit sections based on per-section overlap detection.

| | |
|---|---|
| **Input** | `$1`: optional concept_id (default: all audited concepts) |
| **Reads** | All audited concepts' `spec.md`. Project's `lat.md/` directory. `lat locate <concept_name>` per concept for overlap discovery, plus independent per-section comparison. |
| **Writes** | `lat.md/<file>.md` — creates or edits sections. Updates `lat_snapshot` per concept in `state.json`. |
| **Output** | Summary: which concepts were new (created), which overlapped (merged), any `lat check` errors needing manual resolution. |

**Overlap detection**: Use `lat locate` for initial discovery, then do independent per-section comparison. Present candidate matches to user for confirmation ("Is this the same concept?") before merging.

**Per-section overlap merge**: For each of the 6 required spec sections, compare new spec content against existing lat.md content:

| New spec section | Existing content | Action |
|---|---|---|
| Not present in existing | N/A | Append as new subsection |
| Present, claims match | Keep existing | No change |
| Present, claims diverge | Both versions shown | Flag for user resolution |
| Present, existing is subset | Add missing claims | Preserve existing, append new |

**Preservation rules**:
- Never delete existing wiki links from sections being edited.
- Preserve the leading paragraph of existing sections (append new content below).
- Source code wiki links (`[[src/file.ts#symbol]]`) only in `Related` sections.

**Index file maintenance**: After creating or editing any `.md` in `lat.md/`:
1. Update the parent directory's index file (e.g., `lat.md/api/api.md`).
2. Add `- [[name]] — description` entry for new files.
3. Remove entries for deleted files.
4. If index file doesn't exist, create it with proper format: each entry is `- [[name]] — description`.
5. Run `lat check index` to verify.

**Post-merge**: Always run `lat check`. Report any errors for manual resolution. Record `lat_snapshot` per concept in state. Warn if lat.md/ has uncommitted changes at integration time.

### 5.4 `/next [$1]`

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

---

## 6. CLI (`lat-rev`)

A small TypeScript CLI at `.lat-reverse/bin/lat-rev.ts` for state management. Commands delegate state operations to this CLI instead of manipulating `state.json` directly in prompt text.

### Commands

```
# Concepts
lat-rev concept add <id> <name> --files f1,f2
lat-rev concept edge <id> depends_on other_id
lat-rev concept promote <id>

# Query
lat-rev status
lat-rev graph
lat-rev next [concept_id]

# Drift
lat-rev drift                                 # report all stale concepts
lat-rev drift <concept_id>                    # show source diff for one concept
lat-rev snapshot <concept_id>                  # record current source SHA
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

1. **Skills** (2) with full frontmatter + detailed instructions + examples
   - `.opencode/skills/lat-reconstruction/SKILL.md`
   - `.opencode/skills/lat-style/SKILL.md`

2. **Commands** (4) with detailed prompts calling `lat-rev` for state ops
   - `.opencode/commands/split.md`
   - `.opencode/commands/reconstruct.md`
   - `.opencode/commands/integrate.md`
   - `.opencode/commands/next.md`

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
# → concept candidates: c_playfield, c_row_clearing
# → edges: c_row_clearing depends_on c_playfield
# → review gate: user confirms or provides feedback

# Check where we are
/next
# → candidate(2) extracted(0) specified(0) audited(0)
# Recommended: /reconstruct c_playfield

# Reconstruct first concept (interactive, reviews at each phase)
/reconstruct c_playfield
# → Phase 1 (isolated subagent): extraction.md written
#   "Review extraction?" → user approves or provides feedback
# → Phase 2 (isolated subagent): spec.md written
#   "Review spec?" → user approves or provides feedback
# → Phase 3 (isolated subagent): audit.md written (correctness + "No How" lint)
#   "Review audit?" → user approves or provides feedback
# → c_playfield promoted to audited

# Continue with remaining concepts
/next
# → candidate(1) audited(1)
# Recommended: /reconstruct c_row_clearing

/reconstruct c_row_clearing
# ... same interactive flow ...

# Split remaining areas
/split src/pieces.ts src/game-state.ts
# → more concepts extracted, review gate

# Eventually all concepts are audited
/integrate
# → lat locate finds no overlap for any concept
# → creates lat.md/playfield.md, lat.md/row-clearing.md, etc.
# → updates directory index files
# → runs lat check — passes
# → summarizes: "Created 5 new sections, modified 0 existing sections"

# Later: code changes
/next
# → 2 concepts STALE: c_playfield (source_sha differs), c_row_clearing (source_sha differs)
# Recommended: /reconstruct c_playfield

/reconstruct c_playfield
# → shows diff: "row clearing logic moved to src/clearing.ts"
# → focused reconstruction on what changed
# → audit finds new invariant: "Clearing is now async"

/integrate c_playfield
# → per-section overlap merge with existing lat.md/playfield.md
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

Drift detection via `source_sha` comparison. The user is notified of stale concepts via `/next` and `lat-rev drift`. Re-reconstructing a stale concept shows the diff and focuses on changes rather than starting from scratch. The user decides case-by-case whether to re-reconstruct.

### Cross-concept invariants

Some invariants span multiple concepts (e.g., "every request must be authenticated" spans auth + routing). During `/reconstruct` on a single concept, these may be partially captured. Cross-cutting invariants can be:
- Captured as edge annotations on `constrains` relationships (the concept graph carries the invariant text).
- Or they emerge during `/integrate` when concepts are co-located in `lat.md/`.

Both approaches are valid. The CLI supports edge annotations; the agent prompt instructs it to capture cross-concept invariants on edges when detected.

### Concept naming collisions

The CLI enforces unique IDs. The agent prompt instructs disambiguation when two scopes produce candidates with the same name.

### `.lat-reverse/` and git

Pipeline progress should be committed. `state.json` and `concepts/*/` are durable progress. No gitignore entries by default — the user decides what to commit.

### Uncommitted files

The CLI warns when computing snapshots against uncommitted files. The user is responsible for committing before relying on drift detection accuracy.
