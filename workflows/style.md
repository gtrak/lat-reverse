# LAT Style Context

## Section structure

Every section should have a leading paragraph of reasonable length (soft target, not a hard limit) before any child headings.

## Required sections

Every concept spec must contain:

- `## Purpose` — what this concept guarantees
- `## Non-goals` — what it explicitly does not cover
- `## Invariants` — statements that always hold
- `## Constraints` — limitations and boundaries
- `## Rationale` — why these decisions exist
- `## Related` — `[[wiki links]]` to other concepts and source code

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
