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
const force = args.includes("--force");

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

function writeFileSafe(path: string, content: string) {
  if (existsSync(path) && !force) {
    console.log(`  skip (exists): ${path}`);
    return;
  }
  writeFileSync(path, content);
  console.log(`  write: ${path}`);
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

function copySkillOrCommand(srcDir: string, destDir: string, name: string) {
  const src = join(srcDir, name);
  if (!existsSync(src)) {
    console.log(`  skip (not found): ${src}`);
    return;
  }
  ensureDir(destDir);
  const dest = join(destDir, name);
  if (existsSync(dest) && !force) {
    console.log(`  skip (exists): ${dest}`);
    return;
  }
  const content = readFileSync(src, "utf-8");
  writeFileSync(dest, content);
  console.log(`  write: ${dest}`);
}

console.log(`Installing LAT reverse workflow (${mode})\n`);

////////////////////////////////////////
// 1. .lat-reverse/ (workflows, CLI, state)
////////////////////////////////////////

console.log("Workflows:");
ensureDir(join(latReverseDir, "workflows"));

for (const wf of ["lat-reconstruction.md", "lat-style.md", "split.md", "extract.md", "synthesize.md", "audit.md", "integrate.md"]) {
  copySkillOrCommand(
    join(scriptDir, "workflows"),
    join(latReverseDir, "workflows"),
    wf
  );
}

console.log("\nCLI:");
ensureDir(join(latReverseDir, "bin"));

const cliSrc = join(scriptDir, "bin/lat-rev.ts");
const cliDest = join(latReverseDir, "bin/lat-rev.ts");
if (existsSync(cliSrc)) {
  if (existsSync(cliDest) && !force) {
    console.log(`  skip (exists): ${cliDest}`);
  } else {
    copyFileSync(cliSrc, cliDest);
    console.log(`  write: ${cliDest}`);
  }
} else {
  console.log(`  skip (not found): ${cliSrc}`);
}

console.log("\nState:");
ensureDir(join(latReverseDir, "concepts"));

////////////////////////////////////////
// 2. Skills
////////////////////////////////////////

console.log("\nSkills:");
ensureDir(join(opencodeDir, "skills/lat-reconstruction"));

copySkillOrCommand(
  join(scriptDir, "skills/lat-reconstruction"),
  join(opencodeDir, "skills/lat-reconstruction"),
  "SKILL.md"
);

////////////////////////////////////////
// 3. Commands
////////////////////////////////////////

console.log("\nCommands:");
ensureDir(join(opencodeDir, "commands"));

for (const cmd of ["lat-rev-split.md", "lat-rev-reconstruct.md", "lat-rev-integrate.md", "lat-rev-next.md"]) {
  copySkillOrCommand(
    join(scriptDir, "commands"),
    join(opencodeDir, "commands"),
    cmd
  );
}

const statePath = join(latReverseDir, "state.json");
if (existsSync(statePath) && !force) {
  console.log(`  skip (exists): ${statePath}`);
} else {
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
