---
description: Show workflow status and recommended next action
---

Execute `bun run .lat-reverse/bin/lat-rev.ts status --json` now. If the user provided an argument, use `bun run .lat-reverse/bin/lat-rev.ts status <argument> --json` instead.

Take the JSON output and format it for the user:

- Phase summary with count per phase
- List each concept with its ID, phase, and staleness
- Recommended next command with a specific concept ID

Example output (no argument):
```
Phase: candidate(3) extracted(1) specified(2) audited(1)
  c_playfield → specified (Grid-Based Playfield)
  c_row_clearing → candidate STALE (Row Clearing)
  c_scoring → candidate (Scoring)
Recommended: /lat-rev-reconstruct c_row_clearing (source changed since last extraction)
```

Example output (with concept_id):
```
c_playfield → specified → Next: /lat-rev-reconstruct c_playfield will run audit phase
```
