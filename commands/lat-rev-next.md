---
description: Show workflow status and recommended next action
---

Run `lat-rev status --json` (or `lat-rev status <concept_id> --json` if an argument is given). Format the output for the user:

- Phase summary: `candidate(N) extracted(N) specified(N) audited(N)`
- Drift report: list stale concepts with their changed files
- Recommended next command

No argument example:
```
Phase: candidate(3) extracted(1) specified(2) audited(1)
2 concepts STALE: c_playfield (src/board.ts), c_tetromino_shapes (src/pieces.ts)
Recommended: /lat-rev-reconstruct c_playfield (source changed since last extraction)
```

With concept_id:
```
c_playfield → specified → Next: /lat-rev-reconstruct c_playfield will run audit phase
```
