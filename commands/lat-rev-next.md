---
description: Show workflow status and recommended next action
---

## Task

Answer "Where am I?" — show workflow status and recommended next action.

## Input

`$1`: optional concept_id.

## No argument: project overview

1. Run `lat-rev status --json` to get phase counts and stale concepts.
2. Format the output for the user:
   - Phase summary: `candidate(N) extracted(N) specified(N) audited(N)`
   - Drift report: list stale concepts with their changed files
   - Recommended next command

## With concept_id: single concept

1. Run `lat-rev status <concept_id> --json`.
2. Show:
   - Current phase
   - Whether the concept is stale
   - Changed files (if stale)
   - Recommended next step

## Output examples

No argument:
```
Phase: candidate(3) extracted(1) specified(2) audited(1)
2 concepts STALE: c_playfield (src/board.ts), c_tetromino_shapes (src/pieces.ts)
Recommended: /reconstruct c_playfield (source changed since last extraction)
```

With concept_id:
```
c_playfield → specified → Next: /reconstruct c_playfield will run audit phase
```
