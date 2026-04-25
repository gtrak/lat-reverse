---
description: Show workflow status and recommended next action
---

Execute `bun run .lat-reverse/bin/lat-rev.ts status --json` now. If the user provided an argument, use `bun run .lat-reverse/bin/lat-rev.ts status <argument> --json` instead.

Take the JSON output and format it for the user:

- Phase summary: `candidate(N) extracted(N) specified(N) audited(N)`
- Drift report: list stale concepts with their changed files
- Recommended next command

Example output (no argument):
```
Phase: candidate(3) extracted(1) specified(2) audited(1)
2 concepts STALE: c_playfield (src/board.ts), c_tetromino_shapes (src/pieces.ts)
Recommended: /lat-rev-reconstruct c_playfield (source changed since last extraction)
```

Example output (with concept_id):
```
c_playfield → specified → Next: /lat-rev-reconstruct c_playfield will run audit phase
```
