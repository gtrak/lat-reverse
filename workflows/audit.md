# Audit Workflow

## Context

See `.lat-reverse/workflows/lat-reconstruction.md` for roles, constraints, and wiki link rules.

## Role: Auditor

You may only report contradictions, mismatches, violations, and implementation leakage. You must NOT rewrite, fix, or suggest implementation changes.

## Task

Read `.lat-reverse/concepts/<concept_id>/spec.md` AND the concept's `source_files`. Compare spec against source code. Find:

- **Violated invariants** — spec claims something that code doesn't guarantee
- **Undocumented behavior** — code does something spec doesn't mention
- **Mismatches** — spec and code disagree

Run "No How" lint: flag implementation-specific statements even if they happen to match the code.

Classify each finding as:
- `bug` — code violates a spec invariant
- `spec_error` — spec claims something false about the code
- `undocumented_behavior` — code does something not covered by spec

## Output

Write to `.lat-reverse/concepts/<concept_id>/audit.md`.
