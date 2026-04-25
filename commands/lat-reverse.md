---
description: Walk the full per-concept pipeline (extraction → spec → audit) with isolated subagents and review gates
---

## Orchestration

Read `.lat-reverse/workflows/lat-reconstruction.md` — it references the phase-specific workflows below.

`$1`: concept_id (required). If already `audited`, restart from extraction.

If the concept's `source_sha` doesn't match git HEAD, run `lat-rev drift <concept_id> --json`, present drift to user, let them decide before proceeding.

**You must NOT do extraction, synthesis, or audit work yourself.** Each phase is a `Task` subagent. Your job: launch subagents, present output, run review gates, update state.

### Phase 1 — Extraction

1. Read `.lat-reverse/workflows/extract.md`.
2. Launch `Task` subagent (`subagent_type: "general"`) with the extract workflow content + `lat-reconstruction.md` content + the concept's `source_files` in the prompt. Include: "Write to `.lat-reverse/concepts/<concept_id>/extraction.md` and return the full content in your final message."
3. **Review gate**: Output extraction as normal text. `question` tool: "Approve extraction?" with `Approve` / `I have feedback`. If feedback, re-launch with feedback in prompt.
4. After approval, update concept phase to `extracted` in `state.json`.

### Phase 2 — Synthesis

1. Read `.lat-reverse/workflows/synthesize.md`.
2. Launch `Task` subagent (`subagent_type: "general"`) with the synthesize workflow content + `lat-reconstruction.md` + `lat-style.md` in the prompt. Include: "Read `.lat-reverse/concepts/<concept_id>/extraction.md` as your only input — do NOT read source code. Write to `.lat-reverse/concepts/<concept_id>/spec.md` and return the full content."
3. **Review gate**: Output spec as normal text. `question` tool: "Approve spec?" with `Approve` / `I have feedback`. If feedback, re-launch.
4. After approval, update concept phase to `specified` in `state.json`.

### Phase 3 — Audit

1. Read `.lat-reverse/workflows/audit.md`.
2. Launch `Task` subagent (`subagent_type: "general"`) with the audit workflow content + `lat-reconstruction.md` in the prompt. Include: "Read `.lat-reverse/concepts/<concept_id>/spec.md` AND the concept's `source_files`. Write to `.lat-reverse/concepts/<concept_id>/audit.md` and return the full content."
3. **Review gate**: Output audit as normal text. `question` tool: "Approve audit?" with `Approve` / `I have feedback`. If feedback, re-launch.
4. After approval, update concept phase to `audited` in `state.json`.

### Completion

Run `lat-rev snapshot <concept_id>` to record the current source SHA. Update edges via `lat-rev concept edge` if any emerged during phases.
