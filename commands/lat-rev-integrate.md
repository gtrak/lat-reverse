---
description: Write audited concepts into the project's lat.md/ with overlap detection, source annotations, and placeholder resolution
---

Load the **lat-reconstruction** and **lat-style** skills before proceeding.

## Task

Write audited concepts into the project's `lat.md/` directory. Create or edit sections based on overlap detection. Annotate source files with `@lat:` references.

## Input

`$1`: optional concept_id (default: all audited concepts).

Read `.lat-reverse/state.json` to find concepts with `phase: "audited"`.

## Overlap detection (three layers)

For each concept being integrated:

### Layer 1: `lat locate`

Run `lat locate <concept_name> --dir <source_repo>` for name-based match against existing sections.

### Layer 2: `lat search` (if available)

If embedding DB is configured, run `lat search "<concept purpose>" --dir <source_repo>` for semantic match.

### Layer 3: Explore subagent (Task tool)

For any matches found in layers 1-2, use the `Task` tool with `subagent_type: "explore"` to:
- Read the matched sections from `lat.md/`.
- Compare claims against the new spec.
- Return a report: which claims match, which diverge, which are missing from each side.

Do NOT read lat.md/ files yourself — delegate to the explore subagent.

### Resolution

If layers disagree or the explore subagent finds partial overlap, output the overlap report as normal text. Then use the `question` tool with a concise question like "How to resolve overlap on <concept>?" and options like `Use new spec` / `Keep existing` / `I'll decide manually`. **No auto-merge** — always present both versions and let the user decide how to resolve.

## Write to lat.md/

For each concept (after overlap resolution):

1. Read the concept's `spec.md` from `.lat-reverse/concepts/<concept_id>/spec.md`.
2. Create or edit the appropriate file in `lat.md/` (e.g., `lat.md/playfield.md`).
3. Use the concept name as the top-level heading.
4. Preserve existing content — never delete existing wiki links from sections being edited.
5. Preserve the leading paragraph of existing sections (append new content below).
6. Source code wiki links (`[[src/file.ts#symbol]]`) only in `Related` sections.

## Source annotation

For each concept being integrated, write `@lat:` annotations into the source files listed in `source_files`:

1. Identify the primary symbol(s) related to this concept.
2. Insert `// @lat: [[lat.md/path#Concept#Section]]` (or `# @lat:` for Python/Rust) at the symbol's line.
3. Verify with `lat check code-refs` post-integrate.

## Placeholder resolution

After all concepts in the batch are written to `lat.md/`:

1. Scan all integrated files for `[[?...]]` placeholders.
2. Check if the target section now exists via `lat locate`.
3. Resolve `[[?concept-id]]` → `[[concept-id]]` where possible.
4. Remaining `[[?...]]` placeholders stay unresolved — they surface as `lat check md` failures.

## Index file maintenance

After creating or editing any `.md` in `lat.md/`:

1. Update the parent directory's index file (e.g., `lat.md/api/api.md`).
2. Add `- [[name]] — description` entry for new files.
3. Remove entries for deleted files.
4. If index file doesn't exist, create it with proper format.
5. Run `lat check index` to verify.

## Post-integrate

Always run `lat check --dir <source_repo>`. Report any errors (unresolved placeholders, broken links, invalid code refs) for manual resolution.

## Output

Summary: which concepts were new (created), which overlapped (presented to user for resolution), placeholder resolution results, any `lat check` errors needing manual resolution.
