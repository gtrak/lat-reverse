---
name: lat-reconstruction
description: Reconstruct codebases into invariant-driven concept graphs. Enforces role separation (Extractor, Synthesizer, Auditor) and the "No How" constraint.
compatibility: opencode
---

## Roles (strict, enforced via subagent isolation)

Each phase runs in an isolated subagent. No shared conversation state between roles.

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

## Source code wiki link restriction

`[[src/file.ts#symbol]]` links are allowed **only** in the `Related` section of a spec. Banned from Purpose, Invariants, Constraints, and Rationale — these sections must be implementation-agnostic.

## Placeholder wiki links

When a spec references a concept not yet integrated into `lat.md/`, write the link as `[[?concept-id]]`. These placeholders are resolved during `/integrate` when their targets become available. Unresolved placeholders remain as `[[?...]]` and will surface as `lat check md` failures, signaling that a concept needs documenting.

## `@lat:` source annotations

`/integrate` writes `// @lat: [[lat.md/path#Concept]]` annotations into source files at relevant symbol locations. Language-appropriate comment prefix (`//` for TS/JS/Go, `#` for Python/Rust). Verified via `lat check code-refs` post-integrate.

## Concept lifecycle

```
candidate → extracted → specified → audited
```

Progression requires the prerequisite artifact to exist and be approved by the user. Re-running `/reconstruct` on an already-audited concept restarts from scratch (extraction phase). Feedback is provided during review gates — no separate `/revise` command.

## Edge types

Three edge types on the concept graph:
- `depends_on` — this concept requires another to function
- `refines` — this concept is a specialization/extension of another
- `constrains` — this concept places constraints on another

During `/reconstruct`, if new relationships emerge, update edges via `lat-rev concept edge`.

## Cross-concept invariants

Some invariants span multiple concepts. During `/reconstruct` on a single concept, these may be partially captured. Cross-cutting invariants can be:
- Captured as edge annotations on `constrains` relationships
- Or they emerge during `/integrate` when concepts are co-located in `lat.md/`

Both approaches are valid. Capture cross-concept invariants on edges when detected.
