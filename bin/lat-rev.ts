#!/usr/bin/env bun
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  renameSync,
  unlinkSync,
} from "fs";
import { join, resolve } from "path";
import { execSync } from "child_process";

type Phase = "candidate" | "extracted" | "specified" | "audited";

interface Concept {
  name: string;
  phase: Phase;
  source_files: string[];
  edges: {
    depends_on: string[];
    refines: string[];
    constrains: string[];
  };
  source_sha: string;
}

interface State {
  version: number;
  source_repo: string;
  concepts: Record<string, Concept>;
}

const VALID_PHASES: Phase[] = ["candidate", "extracted", "specified", "audited"];
const VALID_EDGE_TYPES = ["depends_on", "refines", "constrains"];

const args = process.argv.slice(2);
const useJson = args.includes("--json");
const cleanArgs = args.filter((a) => a !== "--json");

function findProjectRoot(start: string): string {
  let dir = start;
  while (dir !== "/") {
    if (existsSync(join(dir, ".lat-reverse"))) return dir;
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

const projectRoot = findProjectRoot(process.cwd());
const latDir = join(projectRoot, ".lat-reverse");
const statePath = join(latDir, "state.json");
const conceptsDir = join(latDir, "concepts");

function output(data: unknown) {
  if (useJson) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(data);
  }
}

function readState(): State {
  if (!existsSync(statePath)) {
    console.error("error: .lat-reverse/ not found. Run `lat-rev init` first.");
    process.exit(1);
  }
  return JSON.parse(readFileSync(statePath, "utf-8"));
}

function writeStateAtomic(state: State) {
  const tmp = statePath + ".tmp";
  writeFileSync(tmp, JSON.stringify(state, null, 2) + "\n");
  renameSync(tmp, statePath);
}

function gitHead(dir: string): string | null {
  try {
    return execSync("git rev-parse HEAD", { cwd: dir, encoding: "utf-8" }).trim();
  } catch {
    return null;
  }
}

function gitChangedFiles(dir: string, from: string, to: string, files: string[]): string[] {
  try {
    const result = execSync(`git diff --name-only ${from} ${to} -- ${files.join(" ")}`, {
      cwd: dir,
      encoding: "utf-8",
    }).trim();
    return result ? result.split("\n").filter(Boolean) : [];
  } catch {
    return files;
  }
}

function gitHasUncommitted(dir: string): boolean {
  try {
    const result = execSync("git status --porcelain", { cwd: dir, encoding: "utf-8" }).trim();
    return result.length > 0;
  } catch {
    return false;
  }
}

function nextStep(phase: Phase): string {
  switch (phase) {
    case "candidate":
      return "Next: /reconstruct <id> will run extraction phase";
    case "extracted":
      return "Next: /reconstruct <id> will run synthesis phase";
    case "specified":
      return "Next: /reconstruct <id> will run audit phase";
    case "audited":
      return "Next: /integrate <id>";
  }
}

// ---- Commands ----

function cmdInit() {
  const srcIdx = cleanArgs.indexOf("--src-dir");
  const srcDir = srcIdx !== -1 ? resolve(cleanArgs[srcIdx + 1] || ".") : ".";

  if (existsSync(latDir) && !cleanArgs.includes("--force")) {
    console.error("error: .lat-reverse/ already exists. Use --force to reinitialize.");
    process.exit(1);
  }

  mkdirSync(latDir, { recursive: true });
  mkdirSync(join(latDir, "bin"), { recursive: true });
  mkdirSync(conceptsDir, { recursive: true });

  const state: State = {
    version: 1,
    source_repo: srcDir,
    concepts: {},
  };
  writeStateAtomic(state);

  output({ ok: true, dir: latDir, source_repo: srcDir });
}

function cmdConceptEdge() {
  const [_, conceptId, edgeType, targetId] = cleanArgs;

  if (!conceptId || !edgeType || !targetId) {
    console.error("usage: lat-rev concept edge <id> <edge_type> <target_id>");
    console.error(`edge_type must be one of: ${VALID_EDGE_TYPES.join(", ")}`);
    process.exit(1);
  }

  if (!VALID_EDGE_TYPES.includes(edgeType)) {
    console.error(`error: invalid edge type "${edgeType}". Must be one of: ${VALID_EDGE_TYPES.join(", ")}`);
    process.exit(1);
  }

  const state = readState();

  if (!state.concepts[conceptId]) {
    console.error(`error: concept "${conceptId}" not found`);
    process.exit(1);
  }

  if (!state.concepts[targetId]) {
    console.error(`error: target concept "${targetId}" not found`);
    process.exit(1);
  }

  if (conceptId === targetId) {
    console.error("error: cannot create self-referential edge");
    process.exit(1);
  }

  const edges = state.concepts[conceptId].edges[edgeType as keyof Concept["edges"]];
  if (!edges.includes(targetId)) {
    edges.push(targetId);
    writeStateAtomic(state);
  }

  output({ ok: true, concept: conceptId, edge: edgeType, target: targetId });
}

function cmdStatus() {
  const state = readState();
  const conceptId = cleanArgs[1];

  if (conceptId) {
    const concept = state.concepts[conceptId];
    if (!concept) {
      console.error(`error: concept "${conceptId}" not found`);
      process.exit(1);
    }

    const head = gitHead(state.source_repo);
    const isStale = head && concept.source_sha && head !== concept.source_sha;
    const changedFiles =
      isStale && concept.source_files.length > 0
        ? gitChangedFiles(state.source_repo, concept.source_sha, head!, concept.source_files)
        : [];

    output({
      id: conceptId,
      name: concept.name,
      phase: concept.phase,
      stale: !!isStale,
      changed_files: changedFiles,
      next: nextStep(concept.phase),
    });
    return;
  }

  const counts: Record<string, number> = {};
  for (const p of VALID_PHASES) counts[p] = 0;
  const stale: Array<{ id: string; changed_files: string[] }> = [];

  const head = gitHead(state.source_repo);
  for (const [id, c] of Object.entries(state.concepts)) {
    counts[c.phase] = (counts[c.phase] || 0) + 1;
    if (head && c.source_sha && head !== c.source_sha) {
      const changed = c.source_files.length > 0
        ? gitChangedFiles(state.source_repo, c.source_sha, head, c.source_files)
        : [];
      stale.push({ id, changed_files: changed });
    }
  }

  const phaseStr = VALID_PHASES.map((p) => `${p}(${counts[p]})`).join(" ");
  const staleStr =
    stale.length > 0
      ? stale.map((s) => `${s.id} (${s.changed_files.join(", ") || "unknown"})`).join(", ")
      : "none";

  const recommendation = stale.length > 0
    ? `Recommended: /reconstruct ${stale[0].id} (source changed since last extraction)`
    : Object.entries(counts).some(([p, c]) => c > 0 && p !== "audited")
    ? `Recommended: /reconstruct <id>`
    : "All concepts audited. /integrate to write to lat.md/";

  if (useJson) {
    output({ phases: counts, stale, recommendation });
  } else {
    console.log(`Phase: ${phaseStr}`);
    if (stale.length > 0) console.log(`${stale.length} concepts STALE: ${staleStr}`);
    console.log(recommendation);
  }
}

function cmdDrift() {
  const state = readState();
  const conceptId = cleanArgs[1];
  const head = gitHead(state.source_repo);

  if (!head) {
    console.error("error: not a git repository or no commits");
    process.exit(1);
  }

  if (conceptId) {
    const concept = state.concepts[conceptId];
    if (!concept) {
      console.error(`error: concept "${conceptId}" not found`);
      process.exit(1);
    }

    if (!concept.source_sha) {
      output({ id: conceptId, stale: false, changed_files: [], note: "no snapshot recorded" });
      return;
    }

    const isStale = head !== concept.source_sha;
    const changedFiles = isStale
      ? gitChangedFiles(state.source_repo, concept.source_sha, head, concept.source_files)
      : [];

    output({ id: conceptId, stale: isStale, old_sha: concept.source_sha, current_sha: head, changed_files: changedFiles });
    return;
  }

  const results: Array<{
    id: string;
    stale: boolean;
    changed_files: string[];
  }> = [];

  for (const [id, c] of Object.entries(state.concepts)) {
    if (!c.source_sha) {
      results.push({ id, stale: false, changed_files: [] });
      continue;
    }
    const isStale = head !== c.source_sha;
    const changedFiles = isStale
      ? gitChangedFiles(state.source_repo, c.source_sha, head, c.source_files)
      : [];
    results.push({ id, stale: isStale, changed_files: changedFiles });
  }

  if (useJson) {
    output({ current_sha: head, concepts: results });
  } else {
    for (const r of results) {
      if (r.stale) {
        console.log(`STALE: ${r.id} — ${r.changed_files.join(", ") || "unknown changes"}`);
      }
    }
    const staleCount = results.filter((r) => r.stale).length;
    if (staleCount === 0) console.log("All concepts up to date.");
  }
}

function cmdSnapshot() {
  const conceptId = cleanArgs[1];
  if (!conceptId) {
    console.error("usage: lat-rev snapshot <concept_id>");
    process.exit(1);
  }

  const state = readState();
  const concept = state.concepts[conceptId];
  if (!concept) {
    console.error(`error: concept "${conceptId}" not found`);
    process.exit(1);
  }

  if (gitHasUncommitted(state.source_repo)) {
    console.warn("warning: uncommitted changes exist in source repo. Snapshot may be inaccurate.");
  }

  const head = gitHead(state.source_repo);
  if (!head) {
    console.error("error: cannot get git HEAD");
    process.exit(1);
  }

  concept.source_sha = head;
  writeStateAtomic(state);

  output({ ok: true, concept: conceptId, source_sha: head });
}

// ---- Dispatch ----

const command = cleanArgs[0];

switch (command) {
  case "init":
    cmdInit();
    break;
  case "concept": {
    const sub = cleanArgs[1];
    if (sub === "edge") {
      cmdConceptEdge();
    } else {
      console.error("usage: lat-rev concept edge <id> <edge_type> <target_id>");
      process.exit(1);
    }
    break;
  }
  case "status":
    cmdStatus();
    break;
  case "drift":
    cmdDrift();
    break;
  case "snapshot":
    cmdSnapshot();
    break;
  default:
    console.log(`lat-rev — LAT reconstruction state manager

Usage:
  lat-rev init [--src-dir <path>] [--force]
  lat-rev concept edge <id> <edge_type> <target_id>
  lat-rev status [<concept_id>]
  lat-rev drift [<concept_id>]
  lat-rev snapshot <concept_id>

Edge types: depends_on, refines, constrains

Global options:
  --json    machine-readable output`);
    process.exit(command ? 1 : 0);
}
