---
description: Walk the full per-concept pipeline (extraction → spec → audit) with isolated subagents and review gates
---

Load the **lat-reconstruction** and **lat-style** skills before proceeding.

## Task

Walk the full per-concept pipeline for a single concept: extraction → spec → audit. Each phase runs in an isolated subagent. Present each phase artifact for user review before advancing.

## Input

`$1`: concept_id (required). If the concept is already `audited`, restart from extraction.

## Stale concept handling

If the concept's `source_sha` doesn't match current git HEAD:
1. Run `lat-rev drift <concept_id> --json` to show which files changed.
2. Present the drift info to the user.
3. The user decides whether to re-read changed files or do a full reconstruction.
4. Record new `source_sha` on completion via `lat-rev snapshot <concept_id>`.

## Phase 1 — Extraction (ROLE: Extractor, isolated subagent)

Launch a subagent with the **Extractor** role. It must:

- Read the concept's `source_files` from `state.json`.
- Extract: responsibilities (observable behavior), invariants (with code evidence + line refs), failure modes.
- No interpretation, no intent inference. Evidence only.
- Write to `.lat-reverse/concepts/<concept_id>/extraction.md`.

**Review gate**: Present `extraction.md` to the user via the `question` tool. If feedback is given, re-run this phase in a fresh subagent with the feedback incorporated. After approval, update the concept's phase to `extracted` in `state.json`.

## Phase 2 — Synthesis (ROLE: Synthesizer, isolated subagent)

Launch a subagent with the **Synthesizer** role. It must:

- Read `extraction.md` (the only input — no re-reading source code).
- Produce a lat-style spec with sections: Purpose, Non-goals, Invariants, Constraints, Rationale, Related.
- Exclude implementation details. Validate "survives rewrite" constraint.
- Compress: ~5 bullets/section (soft target), merge overlapping claims, remove vague language.
- Use `[[?concept-id]]` placeholders for references to not-yet-integrated concepts.
- Write to `.lat-reverse/concepts/<concept_id>/spec.md`.

**Review gate**: Present `spec.md` to the user via the `question` tool. If feedback is given, re-run this phase in a fresh subagent with the feedback incorporated. After approval, update the concept's phase to `specified` in `state.json`.

## Phase 3 — Audit (ROLE: Auditor, isolated subagent)

Launch a subagent with the **Auditor** role. It must:

- Read `spec.md` AND re-read the concept's `source_files`.
- Compare spec against source code. Find: violated invariants, undocumented behavior, mismatches.
- Run "No How" lint: flag implementation-specific statements even if they happen to match the code.
- Classify each finding as `bug`, `spec_error`, or `undocumented_behavior`.
- Write to `.lat-reverse/concepts/<concept_id>/audit.md`.

**Review gate**: Present `audit.md` to the user via the `question` tool. If feedback is given, re-run this phase in a fresh subagent with the feedback incorporated. After approval, update the concept's phase to `audited` in `state.json`.

## Edge updates

During any phase, if new relationships between concepts emerge, update edges via `lat-rev concept edge`.

## Completion

After all three phases are approved:
1. Run `lat-rev snapshot <concept_id>` to record the current source SHA.
2. Report completion.
