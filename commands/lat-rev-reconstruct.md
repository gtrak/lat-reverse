---
description: Walk the full per-concept pipeline (extraction → spec → audit) with isolated subagents and review gates
---

Load the **lat-reconstruction** and **lat-style** skills before proceeding.

## Task

Walk the full per-concept pipeline for a single concept: extraction → spec → audit. Each phase runs in an isolated `Task` subagent. Present each phase artifact for user review before advancing.

## Input

`$1`: concept_id (required). If the concept is already `audited`, restart from extraction.

## Stale concept handling

If the concept's `source_sha` doesn't match current git HEAD:
1. Run `lat-rev drift <concept_id> --json` to show which files changed.
2. Present the drift info to the user.
3. The user decides whether to re-read changed files or do a full reconstruction.
4. Record new `source_sha` on completion via `lat-rev snapshot <concept_id>`.

## Critical: every phase is a Task subagent

You must NOT do extraction, synthesis, or audit work yourself. Your job is to orchestrate: launch subagents, collect their output, present it for review, and update state. Each phase must be delegated to a `Task` tool call with `subagent_type: "general"` and a detailed prompt. This keeps your own context small and avoids compaction.

The subagent prompt must include:
- The role rules (Extractor/Synthesizer/Auditor) from the lat-reconstruction skill
- The exact files to read
- The output file path to write
- A directive to return the written artifact content in its final message back to you

## Phase 1 — Extraction (ROLE: Extractor, Task subagent)

Use the `Task` tool with `subagent_type: "general"`. The prompt must include:

- **Role**: You are the Extractor. You may only report observable behavior, code evidence, and failure modes. You must NOT infer intent or rationale.
- **Files to read**: The concept's `source_files` from `state.json`
- **Task**: Extract responsibilities (observable behavior), invariants (with code evidence + line refs), failure modes. No interpretation.
- **Output**: Write to `.lat-reverse/concepts/<concept_id>/extraction.md`. Return the full content of what you wrote in your final message.

After the subagent returns, output the extraction as normal text. Then use the `question` tool with a concise question like "Approve extraction?" and options like `Approve` / `I have feedback`. Do NOT put the full artifact content inside the question tool. If feedback is given, re-launch a fresh `Task` subagent with the feedback incorporated in its prompt. After approval, update the concept's phase to `extracted` in `state.json`.

## Phase 2 — Synthesis (ROLE: Synthesizer, Task subagent)

Use the `Task` tool with `subagent_type: "general"`. The prompt must include:

- **Role**: You are the Synthesizer. You may only state purpose, invariants, constraints, and rationale. You must NOT reference control flow, data structures, or function names.
- **File to read**: `.lat-reverse/concepts/<concept_id>/extraction.md` (the only input — do NOT read source code)
- **Task**: Produce a lat-style spec with sections: Purpose, Non-goals, Invariants, Constraints, Rationale, Related. Compress: ~5 bullets/section (soft target), merge overlapping claims, remove vague language. Use `[[?concept-id]]` placeholders for references to not-yet-integrated concepts. Every statement must survive a full rewrite.
- **Output**: Write to `.lat-reverse/concepts/<concept_id>/spec.md`. Return the full content of what you wrote in your final message.

After the subagent returns, output the spec as normal text. Then use the `question` tool with a concise question like "Approve spec?" and options like `Approve` / `I have feedback`. If feedback is given, re-launch a fresh `Task` subagent with the feedback incorporated. After approval, update the concept's phase to `specified` in `state.json`.

## Phase 3 — Audit (ROLE: Auditor, Task subagent)

Use the `Task` tool with `subagent_type: "general"`. The prompt must include:

- **Role**: You are the Auditor. You may only report contradictions, mismatches, violations, and implementation leakage. You must NOT rewrite, fix, or suggest implementation changes.
- **Files to read**: `.lat-reverse/concepts/<concept_id>/spec.md` AND the concept's `source_files`
- **Task**: Compare spec against source code. Find violated invariants, undocumented behavior, mismatches. Run "No How" lint: flag implementation-specific statements even if they happen to match the code. Classify each finding as `bug`, `spec_error`, or `undocumented_behavior`.
- **Output**: Write to `.lat-reverse/concepts/<concept_id>/audit.md`. Return the full content of what you wrote in your final message.

After the subagent returns, output the audit as normal text. Then use the `question` tool with a concise question like "Approve audit?" and options like `Approve` / `I have feedback`. If feedback is given, re-launch a fresh `Task` subagent with the feedback incorporated. After approval, update the concept's phase to `audited` in `state.json`.

## Edge updates

During any phase, if new relationships between concepts emerge, update edges via `lat-rev concept edge`.

## Completion

After all three phases are approved:
1. Run `lat-rev snapshot <concept_id>` to record the current source SHA.
2. Report completion.
