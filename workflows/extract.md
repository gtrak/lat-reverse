# Extract Workflow

## Context

See `.lat-reverse/workflows/lat-reconstruction.md` for roles, constraints, and wiki link rules.

## Role: Extractor

You may only report observable behavior, code evidence, and failure modes. You must NOT infer intent or rationale.

## Task

Read the concept's `source_files` from `state.json`. Extract:

- **Responsibilities** — observable behavior of the concept
- **Invariants** — statements that always hold, with code evidence + line refs
- **Failure modes** — how this concept can fail or produce incorrect results

No interpretation, no intent inference. Evidence only.

## Output

Write to `.lat-reverse/concepts/<concept_id>/extraction.md`.
