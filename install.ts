#!/usr/bin/env bun
import { mkdirSync, writeFileSync, existsSync, readFileSync, copyFileSync } from "fs";
import { join, resolve } from "path";

type Mode = "project" | "global";

const args = process.argv.slice(2);

function getArg(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const mode: Mode = (getArg("--mode") as Mode) || "project";
const srcDir = getArg("--src-dir") || ".";

const projectRoot = process.cwd();
const opencodeDir =
  mode === "global"
    ? join(process.env.HOME || "~", ".opencode")
    : join(projectRoot, ".opencode");
const latReverseDir = join(projectRoot, ".lat-reverse");
const scriptDir = resolve(import.meta.dir || ".");

function ensureDir(path: string) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

function copyFile(src: string, dest: string) {
  if (!existsSync(src)) {
    console.log(`  skip (not found): ${src}`);
    return;
  }
  ensureDir(resolve(dest, ".."));
  copyFileSync(src, dest);
  console.log(`  write: ${dest}`);
}

function mergeJSON(path: string, content: object) {
  if (!existsSync(path)) {
    writeFileSync(path, JSON.stringify(content, null, 2) + "\n");
    console.log(`  write: ${path}`);
    return;
  }

  try {
    const existing = JSON.parse(readFileSync(path, "utf-8"));
    const merged = { ...existing, ...content };
    writeFileSync(path, JSON.stringify(merged, null, 2) + "\n");
    console.log(`  merge: ${path}`);
  } catch {
    console.log(`  skip (invalid json): ${path}`);
  }
}

console.log(`Installing LAT reverse workflow (${mode})\n`);

////////////////////////////////////////
// 1. .lat-reverse/ (workflows, CLI, state)
////////////////////////////////////////

console.log("Workflows:");
for (const wf of ["reconstruction.md", "style.md", "split.md", "add.md", "auto.md", "extract.md", "synthesize.md", "audit.md", "integrate.md"]) {
  copyFile(
    join(scriptDir, "workflows", wf),
    join(latReverseDir, "workflows", wf)
  );
}

console.log("\nCLI:");
copyFile(
  join(scriptDir, "bin/lat-rev.ts"),
  join(latReverseDir, "bin/lat-rev.ts")
);

console.log("\nState:");
ensureDir(join(latReverseDir, "concepts"));

const statePath = join(latReverseDir, "state.json");
if (!existsSync(statePath)) {
  writeFileSync(
    statePath,
    JSON.stringify(
      {
        version: 1,
        source_repo: resolve(srcDir),
        concepts: {},
      },
      null,
      2
    ) + "\n"
  );
  console.log(`  write: ${statePath}`);
} else {
  console.log(`  skip (exists, preserving): ${statePath}`);
}

////////////////////////////////////////
// 2. Skills
////////////////////////////////////////

console.log("\nSkills:");
copyFile(
  join(scriptDir, "skills/lat-reconstruction/SKILL.md"),
  join(opencodeDir, "skills/lat-reconstruction/SKILL.md")
);

////////////////////////////////////////
// 3. Commands
////////////////////////////////////////

console.log("\nCommands:");
for (const cmd of ["lat-rev-split.md", "lat-rev-add.md", "lat-rev-auto.md", "lat-rev-reconstruct.md", "lat-rev-integrate.md", "lat-rev-next.md"]) {
  copyFile(
    join(scriptDir, "commands", cmd),
    join(opencodeDir, "commands", cmd)
  );
}

////////////////////////////////////////
// 4. Config (project only)
////////////////////////////////////////

if (mode === "project") {
  console.log("\nConfig:");
  mergeJSON(join(projectRoot, "opencode.json"), {
    permission: {
      skill: { "*": "allow" },
    },
  });
}

console.log("\nDone.");
