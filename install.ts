#!/usr/bin/env bun
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import { join } from "path";

type Mode = "project" | "global";

const args = process.argv.slice(2);

function getArg(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const mode: Mode = (getArg("--mode") as Mode) || "project";
const force = args.includes("--force");

const targetDir =
  mode === "global"
    ? join(process.env.HOME || "~", ".opencode")
    : join(process.cwd(), ".opencode");

const rootDir = mode === "global" ? targetDir : process.cwd();

function ensureDir(path: string) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

function writeFileSafe(path: string, content: string) {
  if (existsSync(path) && !force) {
    console.log(`skip (exists): ${path}`);
    return;
  }
  writeFileSync(path, content);
  console.log(`write: ${path}`);
}

function mergeJSON(path: string, content: object) {
  if (!existsSync(path)) {
    writeFileSync(path, JSON.stringify(content, null, 2));
    console.log(`write: ${path}`);
    return;
  }

  try {
    const existing = JSON.parse(readFileSync(path, "utf-8"));
    const merged = { ...existing, ...content };
    writeFileSync(path, JSON.stringify(merged, null, 2));
    console.log(`merge: ${path}`);
  } catch {
    console.log(`skip (invalid json): ${path}`);
  }
}

console.log(`Installing LAT workflow (${mode}) → ${targetDir}`);

////////////////////////////////////////
// DIRECTORIES
////////////////////////////////////////

ensureDir(join(targetDir, "commands"));
ensureDir(join(targetDir, "skills/lat-reconstruction"));
ensureDir(join(targetDir, "skills/lat-style"));

////////////////////////////////////////
// SKILLS
////////////////////////////////////////

writeFileSafe(
  join(targetDir, "skills/lat-reconstruction/SKILL.md"),
`---
name: lat-reconstruction
description: Reconstruct codebases into invariant-driven concept graphs
compatibility: opencode
---

## Roles

Extractor: evidence only  
Synthesizer: intent, no implementation  
Auditor: contradictions only  

## Rule

All statements must survive full rewrite.

## Never include

- control flow
- data structures
- function names

## Prefer

- invariants
- constraints
- rationale

## Compression

Max ~5 bullets per section.
`
);

writeFileSafe(
  join(targetDir, "skills/lat-style/SKILL.md"),
`---
name: lat-style
description: Enforce lat.md formatting
compatibility: opencode
---

## Format

# Concept

## Purpose
## Non-goals
## Invariants
## Constraints
## Rationale
## Related

## Rules

- no "how"
- no implementation details
- no vague language

## Compression

Remove redundancy aggressively.
`
);

////////////////////////////////////////
// COMMAND TEMPLATE HELPER
////////////////////////////////////////

function cmd(name: string, body: string) {
  return `---
description: ${name}
---

${body}
`;
}

////////////////////////////////////////
// COMMANDS
////////////////////////////////////////

const commands: Record<string, string> = {
  "split.md": cmd("split", `
Use lat-reconstruction skill.

Split input into analysis units.
Over-split. One responsibility per unit.

Output:
- unit_id
- description
- files
`),

  "extract-concepts.md": cmd("extract-concepts", `
Use lat-reconstruction skill.

Extract conceptual responsibilities.

Rules:
- not file names
- not types

Output:
- concept_id
- name
- evidence
`),

  "merge-concepts.md": cmd("merge-concepts", `
Use lat-reconstruction skill.

Propose merges and renames only.
`),

  "link-concepts.md": cmd("link-concepts", `
Use lat-reconstruction skill.

Infer relationships:
- depends_on
- refines
- interacts_with

Output JSON.
`),

  "extract-evidence.md": cmd("extract-evidence", `
ROLE: Extractor

Extract:
- responsibilities
- invariants (with evidence)
- failures

No interpretation.
`),

  "synthesize-spec.md": cmd("synthesize-spec", `
Use lat-style + lat-reconstruction.

ROLE: Synthesizer

Produce:
- Purpose
- Non-goals
- Invariants
- Constraints
- Rationale

No implementation details.
`),

  "compress-spec.md": cmd("compress-spec", `
Use lat-style.

Reduce redundancy.
`),

  "audit.md": cmd("audit", `
ROLE: Auditor

Find:
- violated invariants
- undocumented behavior

Classify:
- bug
- spec_error
`),

  "status.md": cmd("status", `
Show concept statuses.
`),

  "show.md": cmd("show", `
Show artifact for concept.
`),

  "revise.md": cmd("revise", `
Replace artifact and invalidate downstream.
`),

  "promote.md": cmd("promote", `
Advance phase if valid.
`),

  "emit-lat.md": cmd("emit-lat", `
Use lat-style.

Emit final lat.md node.
`),

  "lint-spec.md": cmd("lint-spec", `
Use lat-style.

Reject:
- implementation leakage
- vague statements
`)
};

for (const [file, content] of Object.entries(commands)) {
  writeFileSafe(join(targetDir, "commands", file), content);
}

////////////////////////////////////////
// STATE
////////////////////////////////////////

writeFileSafe(
  join(targetDir, "state.json"),
  JSON.stringify({
    concepts: {},
    units: {},
    graph: {}
  }, null, 2)
);

////////////////////////////////////////
// CONFIG (project only)
////////////////////////////////////////

if (mode === "project") {
  mergeJSON(
    join(rootDir, "opencode.json"),
    {
      permission: {
        skill: { "*": "allow" }
      }
    }
  );
}

console.log("Done.");
