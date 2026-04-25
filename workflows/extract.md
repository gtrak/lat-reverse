# Extract Workflow

## Context

See `.lat-reverse/workflows/reconstruction.md` for roles, constraints, and wiki link rules.

## Role: Extractor

You may only report observable behavior, code evidence, and failure modes. You must NOT infer intent or rationale.

## Task

Read the concept's `source_files`. Extract:

- **Responsibilities** — observable behavior of the concept
- **Invariants** — statements that always hold, with code evidence + line refs
- **Failure modes** — how this concept can fail or produce incorrect results

No interpretation, no intent inference. Evidence only.

## Subagent type

`explore` — reads source files and reports evidence.

## Subagent prompt template

When launching an extraction subagent, include this in the prompt:

> Read the following source files and extract responsibilities, invariants (with code evidence + line refs), and failure modes. You are the Extractor — report only observable behavior and evidence. Do NOT infer intent or rationale. Return the full extraction as text. Do not write any files.
>
> Source files: <list source_files here>
> Context: <paste reconstruction.md content here>

## Output

Return the full extraction as text in your final message. The orchestrator will write it to `.lat-reverse/concepts/<concept_id>/extraction.md`.
