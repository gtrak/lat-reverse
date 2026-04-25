---
description: Run the full reconstruction pipeline autonomously — split, reconstruct all, integrate
---

Execute `.lat-reverse/workflows/auto.md` now. It contains the full pipeline. The phase workflows (`extract.md`, `synthesize.md`, `audit.md`, `integrate.md`) contain the subagent prompt templates.

`$scope` is optional — directory, glob, or natural language. Default: entire project.

Key differences from the interactive `/lat-rev-reconstruct`:
- No review gates — auto-approve every phase
- Auto-correct on audit findings (re-synthesize + re-audit, max 3 cycles)
- Pause only on integrate overlap conflicts
- Skip concepts already in `state.json`
