# LAT Reconstruction Context

## Roles

| Role | Allowed | Forbidden |
|---|---|---|
| Extractor | Observable behavior, code evidence, failure modes | Intent, rationale, "why" |
| Synthesizer | Purpose, invariants, constraints, rationale | Control flow, data structures, function names |
| Auditor | Contradictions, mismatches, violations, implementation leakage | Rewriting, fixing, suggesting implementation |

## Invariant validity constraint

All statements must remain true if the implementation is completely rewritten.

## "No How" constraint

Reject outputs that include:
- Control flow descriptions
- Data structure details
- Function/method names as concept identifiers
- Implementation-specific terminology

## Compression rules

- Max ~5 bullets per section (soft target, not a hard limit)
- Merge overlapping claims
- Remove redundancy aggressively
- No vague language ("handles errors", "works correctly")

## Wiki link rules

- Section refs: `[[file#Section#SubSection]]`
- Placeholder refs: `[[?concept-id]]` (resolved during integrate)
- Source code refs: `[[src/auth.ts#validateToken]]`
- Source code wiki links allowed **only** in `Related` sections. Banned from Purpose, Invariants, Constraints, and Rationale.
- Placeholder `[[?concept-id]]` links reference concepts not yet in `lat.md/`. Unresolved placeholders remain as `[[?...]]` and surface as `lat check md` failures.

## `@lat:` source annotations

`// @lat: [[lat.md/path#Concept]]` annotations in source files at relevant symbol locations. Language-appropriate comment prefix (`//` for TS/JS/Go, `#` for Python/Rust). Verified via `lat check code-refs`.

## Concept lifecycle

```
candidate → extracted → specified → audited
```

Progression requires the prerequisite artifact to exist and be approved by the user. Re-running reconstruction on an already-audited concept restarts from scratch. Feedback is handled inline during review gates — no separate revise step.

## Edge types

- `depends_on` — this concept requires another to function
- `refines` — this concept is a specialization/extension of another
- `constrains` — this concept places constraints on another

Cross-concept invariants can be captured as edge annotations on `constrains` relationships, or they emerge during integrate when concepts are co-located.
