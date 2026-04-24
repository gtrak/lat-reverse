---
name: lat-style
description: Enforce lat.md formatting rules on all output specs. Defines required sections, wiki link syntax, and compression standards.
compatibility: opencode
---

## Section structure

Every section should have a leading paragraph of reasonable length (soft target, not a hard limit) before any child headings.

## Required sections

Every concept spec must contain these sections:

- `## Purpose` — what this concept guarantees
- `## Non-goals` — what it explicitly does not cover
- `## Invariants` — statements that always hold
- `## Constraints` — limitations and boundaries
- `## Rationale` — why these decisions exist
- `## Related` — `[[wiki links]]` to other concepts and source code

## Wiki link syntax

- Section refs: `[[file#Section#SubSection]]`
- Placeholder refs: `[[?concept-id]]` (resolved during `/integrate`)
- Source code refs: `[[src/auth.ts#validateToken]]`

## Rules

- No implementation leakage
- No vague language ("handles errors", "works correctly", "various things")
- Aggressive redundancy removal
- Source code wiki links (`[[src/...]]`) only in `Related` sections
- No function/method names as concept identifiers
- Every statement must survive a complete rewrite of the implementation

## Compression

- Max ~5 bullets per section (soft target)
- Merge overlapping claims
- Remove vague qualifiers
- Prefer precise statements over broad ones
