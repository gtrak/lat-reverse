# LAT Reconstruction Workflow — Plan

## 1. Objective

Decompose an existing codebase into invariant-driven concept graphs and reconstruct lat.md-compatible specifications. Work incrementally through a lifecycle `candidate → extracted → specified → audited`. Final artifacts are written into the project's existing `lat.md/`, with `@lat:` annotations added to source files for bidirectional traceability.

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

`.lat-reverse/` lives inside the source repo. Out-of-repo operation (separate git repo for `.lat-reverse/`) is deferred to a future version.

---

## 3. State Schema

```json
{
  "version": 1,
  "source_repo": ".",
  "concepts": {
    "c_playfield": {
      "name": "Grid-Based Playfield",
      "phase": "candidate | extracted | specified | audited",
      "source_files": ["src/board.ts"],
      "edges": {
        "depends_on": [],
        "refines": [],
        "constrains": ["c_tetromino_shapes"]
      },
      "source_sha": "a1b2c3d"
    }
  }
}
```

### Field Definitions

- **`version`**: Schema version for future migration support.
- **`source_repo`**: Path to the project being analyzed. Set by `lat-rev init --src-dir` (default `.`). All `lat` commands invoked by the workflow use `--dir <source_repo>` or `cwd = source_repo` to operate on the correct project.
- **`concepts`**: Reconstructed concepts from the pipeline.
  - **`phase`**: Lifecycle stage. `candidate` = identified but not yet extracted. `extracted` = evidence gathered. `specified` = spec synthesized. `audited` = spec validated against code.
  - **`source_files`**: Source files this concept was extracted from. Concepts reference files directly.
  - **`edges`**: Graph relationships to other concepts. Three edge types: `depends_on`, `refines`, `constrains`.
  - **`source_sha`**: Single git commit SHA of the source repo at time of last reconstruction (`git rev-parse HEAD`). Used for drift detection. Compare against current HEAD; if different, report which source files changed.
- **`lat_snapshot`**: Removed. Relied on `lat check` for integrity verification post-integrate instead.

### Drift Detection

Compare stored `source_sha` against current `git rev-parse HEAD` in the source repo. If different, the concept is stale. Report which `source_files[]` changed using `git diff --name-only <stored_sha> HEAD -- <source_files>`. The user decides whether to re-reconstruct on a case-by-case basis. The CLI does not auto-run full diffs or attempt focused reconstruction.

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
- Max ~5 bullets per section (soft target, not a hard limit)
- Merge overlapping claims
- Remove redundancy aggressively
- No vague language ("handles errors", "works correctly")

**Source code wiki link restriction**: `[[src/file.ts#symbol]]` links are allowed only in the `Related` section of a spec. Banned from Purpose, Invariants, Constraints, and Rationale — these sections must be implementation-agnostic.

**Placeholder wiki links**: When a spec references a concept not yet integrated into `lat.md/`, write the link as `[[?concept-id]]`. These placeholders are resolved during `/integrate` when their targets become available. Unresolved placeholders remain as `[[?...]]` and will surface as `lat check md` failures, signaling that a concept needs documenting.

**`@lat:` source annotations**: `/integrate` writes `// @lat: [[lat.md/path#Concept]]` annotations into source files at relevant symbol locations. Language-appropriate comment prefix (`//` for TS/JS/Go, `#` for Python/Rust). Verified via `lat check code-refs` post-integrate.

**Concept lifecycle**:
```
candidate → extracted → specified → audited
```
Progression requires the prerequisite artifact to exist and be approved by the user. Re-running `/reconstruct` on an already-audited concept restarts from scratch (extraction phase). Feedback is provided during review gates — no separate `/revise` command.

**Edge updates**: During `/reconstruct`, if new relationships between concepts emerge, update edges via `lat-rev concept edge`. Three edge types: `depends_on`, `refines`, `constrains`.

### 4.2 `lat-style`

Formatting rules from lat.md, enforced on all output specs.

**Section structure**: Every section should have a leading paragraph of reasonable length (soft target, not a hard limit) before any child headings.

**Required sections** for each concept spec:
- `## Purpose` — what this concept guarantees
- `## Non-goals` — what it explicitly does not cover
- `## Invariants` — statements that always hold
- `## Constraints` — limitations and boundaries
- `## Rationale` — why these decisions exist
- `## Related` — `[[wiki links]]` to other concepts and source code

**Wiki link syntax**:
- Section refs: `[[file#Section#SubSection]]`
- Placeholder refs: `[[?concept-id]]` (resolved during `/integrate`)
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
| **Reads** | Source files from concept's `source_files`. If stale: `lat-rev drift <concept_id>` to show which files changed. |
| **Writes** | `.lat-reverse/concepts/$1/extraction.md`, `spec.md`, `audit.md`. Updates `state.json` (phase, `source_sha`). |
| **Output** | Three artifacts presented sequentially for review via `question` tool at each phase boundary. |

**Phase 1 — Extraction** (ROLE: Extractor, isolated subagent):
- Extract: responsibilities (observable behavior), invariants (with code evidence + line refs), failure modes.
- No interpretation, no intent inference.
- Write to `extraction.md`. Present for user review. Promote to `extracted` after user approves.

**Phase 2 — Synthesis** (ROLE: Synthesizer, isolated subagent):
- Produce lat-style spec from extraction: Purpose, Non-goals, Invariants, Constraints, Rationale.
- Exclude implementation details. Validate "survives rewrite" constraint.
- Compress: ~5 bullets/section (soft target), merge overlapping claims, remove vague language.
- Use `[[?concept-id]]` placeholders for references to not-yet-integrated concepts.
- Write to `spec.md`. Present for user review. Promote to `specified` after user approves.

**Phase 3 — Audit** (ROLE: Auditor, isolated subagent):
- Compare spec against source code. Find: violated invariants, undocumented behavior, mismatches.
- Run "No How" lint: flag implementation-specific statements even if they happen to match the code.
- Classify each finding as `bug`, `spec_error`, or `undocumented_behavior`.
- Write to `audit.md`. Present for user review. Promote to `audited` after user approves.

**Stale concept handling**: When re-running on a concept whose `source_sha` doesn't match current git HEAD:
- Show which source files changed via `lat-rev drift <concept_id>`.
- The user decides whether to re-read changed files or do a full reconstruction.
- Record new `source_sha` on completion.

**Review gate behavior**: At each phase boundary, present the artifact and ask: approve / provide feedback. If feedback is given, re-run that phase in a fresh subagent with the feedback incorporated. No separate `/revise` command — feedback is handled inline.

### 5.3 `/integrate [$1]`

Write audited concepts into the project's `lat.md/`. Create or edit sections based on overlap detection. Annotate source files with `@lat:` references.

| | |
|---|---|
| **Input** | `$1`: optional concept_id (default: all audited concepts) |
| **Reads** | All audited concepts' `spec.md`. Project's `lat.md/` directory. Overlap detection results. |
| **Writes** | `lat.md/<file>.md` — creates or edits sections. Source file `@lat:` annotations. |
| **Output** | Summary: which concepts were new (created), which overlapped (presented to user for resolution), placeholder resolution results, any `lat check` errors needing manual resolution. |

**Overlap detection** (three layers, inconsistencies highlighted):

1. **`lat locate`** — name-based match against existing sections.
2. **`lat search`** (if embedding DB is configured) — semantic match for concepts with different names but overlapping meaning.
3. **Explore subagent** — reads matched sections from layers 1-2, compares claims against the new spec, produces a report: which claims match, which diverge, which are missing from each side.

If layers disagree (e.g., `lat locate` finds no match but `lat search` does, or the explore subagent finds the overlap is only partial), highlight the inconsistency. Present the overlap report to the user. **No auto-merge** — always present both versions and let the user decide how to resolve.

**Source annotation**: For each concept being integrated, write `@lat:` annotations into the source files listed in `source_files`:
1. Identify the primary symbol(s) related to this concept.
2. Insert `// @lat: [[lat.md/path#Concept#Section]]` (or `# @lat:` for Python/Rust) at the symbol's line.
3. Verify with `lat check code-refs` post-integrate.

**Placeholder resolution**: After all concepts in the batch are written to `lat.md/`:
1. Scan all integrated files for `[[?...]]` placeholders.
2. Check if the target section now exists via `lat locate`.
3. Resolve `[[?concept-id]]` → `[[concept-id]]` where possible.
4. Remaining `[[?...]]` placeholders stay unresolved — they surface as `lat check md` failures, signaling that a concept needs documenting.

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

**Post-integrate**: Always run `lat check`. Report any errors (unresolved placeholders, broken links, invalid code refs) for manual resolution.

### 5.4 `/next [$1]`

"Where am I?" — workflow status and recommended next action.

| | |
|---|---|
| **Input** | `$1`: optional concept_id |
| **Reads** | `state.json`. `lat-rev drift` for stale concept detection. |
| **Writes** | None |
| **Output** | If no arg: phase summary (count per phase) + drift report (stale concepts with changed files) + recommended next command. If arg: that concept's phase + next step. |

Example output (no arg):
```
Phase: candidate(3) extracted(1) specified(2) audited(1)
2 concepts STALE: c_playfield (src/board.ts), c_tetromino_shapes (src/pieces.ts)
Recommended: /reconstruct c_playfield (source changed since last extraction)
```

Example output (with concept_id):
```
c_playfield → specified → Next: /reconstruct c_playfield will run audit phase
```

---

## 6. CLI (`lat-rev`)

A small TypeScript CLI at `.lat-reverse/bin/lat-rev.ts` for state operations that require git or cross-command coordination. The agent manipulates `state.json` directly for concept CRUD (add, promote, field updates) — only operations with non-trivial logic live in the CLI.

### Commands

```
# Init
lat-rev init [--src-dir <path>]              # create .lat-reverse/ + state.json

# Concepts (edge validation)
lat-rev concept edge <id> depends_on other_id   # validate + update edges

# Query
lat-rev status                                # phase counts + stale concepts
lat-rev status <concept_id>                   # single concept status + next step

# Drift
lat-rev drift                                 # report all stale concepts + changed files
lat-rev drift <concept_id>                    # show changed files for one concept
lat-rev snapshot <concept_id>                 # record current source SHA
```

### Global options

```
lat-rev --json         # machine-readable output for agent consumption
```

### State write safety

All writes to `state.json` are atomic: write to `state.json.tmp` then rename. Prevents corruption on crash.

---

## 7. Install Script

```
bun run install.ts --mode project|global [--src-dir /path/to/source]
```

### What it creates

1. **Skills** (2) with full frontmatter + detailed instructions + examples
   - `.opencode/skills/lat-reconstruction/SKILL.md`
   - `.opencode/skills/lat-style/SKILL.md`

2. **Commands** (4) with detailed prompts
   - `.opencode/commands/split.md`
   - `.opencode/commands/reconstruct.md`
   - `.opencode/commands/integrate.md`
   - `.opencode/commands/next.md`

3. **CLI** at `.lat-reverse/bin/lat-rev.ts`

4. **State** at `.lat-reverse/state.json` with schema initialized and `source_repo` configured from `--src-dir`

5. **Directory** `.lat-reverse/concepts/`

6. **Permissions** merged into `opencode.json` (`skill.*: allow`)

### Mode behavior

- **`--mode global`**: Skills + commands + CLI go to `~/.config/opencode/`. State (`.lat-reverse/`) stays per-project.
- **`--mode project`**: Everything in `.opencode/` + `.lat-reverse/` in project root.

### `--src-dir` flag

- Optional, defaults to `.` (current directory, assuming in-repo).
- Written into `state.json` as `source_repo`.
- All `lat` commands invoked by the workflow use this path as the project root.

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
# → overlap detection: lat locate + lat search + explore subagent → no overlaps found
# → creates lat.md/playfield.md, lat.md/row-clearing.md, etc.
# → writes @lat: annotations into source files
# → resolves [[?...]] placeholders (all resolved in this case)
# → updates directory index files
# → runs lat check — passes
# → summarizes: "Created 5 new sections, modified 0 existing sections, 5 source annotations added"

# Later: code changes
/next
# → 2 concepts STALE: c_playfield (src/board.ts), c_row_clearing (src/pieces.ts)
# Recommended: /reconstruct c_playfield

/reconstruct c_playfield
# → shows changed files: "src/board.ts changed"
# → user reviews and re-reconstructs
# → audit finds new invariant: "Clearing is now async"

/integrate c_playfield
# → overlap detection: lat locate finds existing lat.md/playfield.md
# → explore subagent compares: existing missing new invariant, existing has stale invariant
# → presents both versions, user decides
# → lat check passes
```

---

## 9. Cross-cutting Concerns

### Code changes after reconstruction

Drift detection via `source_sha` comparison. The user is notified of stale concepts (with changed file list) via `/next` and `lat-rev drift`. The user decides case-by-case whether to re-reconstruct.

### Cross-concept invariants

Some invariants span multiple concepts (e.g., "every request must be authenticated" spans auth + routing). During `/reconstruct` on a single concept, these may be partially captured. Cross-cutting invariants can be:
- Captured as edge annotations on `constrains` relationships (the concept graph carries the invariant text).
- Or they emerge during `/integrate` when concepts are co-located in `lat.md/`.

Both approaches are valid. The CLI supports edge annotations; the agent prompt instructs it to capture cross-concept invariants on edges when detected.

### Forward references and placeholder links

Specs may reference concepts not yet integrated. These are written as `[[?concept-id]]` placeholders. The `/integrate` command resolves placeholders whose targets now exist. Remaining placeholders are valid `lat check md` failures that signal gaps in the documentation.

### Source file annotations

`@lat:` annotations create bidirectional traceability between code and specs. `lat check code-refs` verifies these annotations. `lat refs <section>` can then show both incoming markdown links and source code back-references.

### Concept naming collisions

The agent enforces unique IDs. Disambiguate when two scopes produce candidates with the same name.

### `.lat-reverse/` and git

Pipeline progress should be committed. `state.json` and `concepts/*/` are durable progress. No gitignore entries by default — the user decides what to commit.

### Uncommitted files

The CLI warns when computing snapshots against uncommitted files. The user is responsible for committing before relying on drift detection accuracy.

### Semantic search

When `lat search` is configured (embedding DB available), `/integrate` uses it as a second layer of overlap detection. When not configured, only `lat locate` and the explore subagent are used.
