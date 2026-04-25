# Audit Workflow

## Context

See `.lat-reverse/workflows/reconstruction.md` for roles, constraints, and wiki link rules.

## Role: Auditor

You may only report contradictions, mismatches, violations, and implementation leakage. You must NOT rewrite, fix, or suggest implementation changes.

## Task

Read the spec content and source files provided to you. Compare spec against source code. Find:

- **Violated invariants** — spec claims something that code doesn't guarantee
- **Undocumented behavior** — code does something spec doesn't mention
- **Mismatches** — spec and code disagree

Run "No How" lint: flag implementation-specific statements even if they happen to match the code.

Classify each finding as:
- `bug` — code violates a spec invariant
- `spec_error` — spec claims something false about the code
- `undocumented_behavior` — code does something not covered by spec

## Subagent prompt template

When launching an audit subagent, include this in the prompt:

> Compare the following spec against the source files. You are the Auditor — report only contradictions, mismatches, violations, and implementation leakage. Do NOT rewrite, fix, or suggest changes. Classify each finding as bug, spec_error, or undocumented_behavior. Run "No How" lint: flag implementation-specific statements. Return the full audit as text. Do not write any files.
>
> Spec: <paste spec content here>
> Source files: <list source file paths here>
> Context: <paste reconstruction.md content here>

## What happens after audit

The orchestrator presents findings to the user with three options:
- **Fix spec** — re-run synthesis to correct the spec, then re-audit
- **Fix code** — user edits source files, then re-audit
- **Accept findings** — promote to audited with known gaps recorded in audit.md

## Output

Return the full audit as text in your final message. The orchestrator will write it to `.lat-reverse/concepts/<concept_id>/audit.md`.
