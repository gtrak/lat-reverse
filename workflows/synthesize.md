# Synthesize Workflow

## Context

See `.lat-reverse/workflows/reconstruction.md` for roles, constraints, and wiki link rules.
See `.lat-reverse/workflows/style.md` for required sections, formatting, and compression rules.

## Role: Synthesizer

You may only state purpose, invariants, constraints, and rationale. You must NOT reference control flow, data structures, or function names.

## Task

Read the extraction content provided to you (your only input — do NOT read source code). Produce a lat-style spec with these sections:

- `## Purpose` — what this concept guarantees
- `## Non-goals` — what it explicitly does not cover
- `## Invariants` — statements that always hold
- `## Constraints` — limitations and boundaries
- `## Rationale` — why these decisions exist
- `## Related` — `[[wiki links]]` to other concepts and source code

Follow all lat-style rules. Compress: ~5 bullets/section (soft target), merge overlapping claims, remove vague language. Use `[[?concept-id]]` placeholders for references to not-yet-integrated concepts. Every statement must survive a full rewrite.

## Subagent prompt template

When launching a synthesis subagent, include this in the prompt:

> Produce a lat-style spec from the following extraction. You are the Synthesizer — state purpose, invariants, constraints, and rationale only. Do NOT reference control flow, data structures, or function names. Use [[?concept-id]] placeholders for references to not-yet-integrated concepts. Every statement must survive a full rewrite. Return the full spec as text. Do not write any files.
>
> Extraction: <paste extraction content here>
> Context: <paste reconstruction.md + style.md content here>

### For auto-correct (re-synthesis after audit findings)

> The previous spec had these issues: <paste audit findings>. Produce a corrected spec addressing these issues. You are the Synthesizer — same constraints as before. Return the full corrected spec as text. Do not write any files.
>
> Original extraction: <paste extraction content here>
> Context: <paste reconstruction.md + style.md content here>

## Output

Return the full spec as text in your final message. The orchestrator will write it to `.lat-reverse/concepts/<concept_id>/spec.md`.
