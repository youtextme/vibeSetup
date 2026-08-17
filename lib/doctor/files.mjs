import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** Files every VibeSetup repo checkout must contain. */
export const REPO_FILES = [
  "AGENTS.md",
  ".devin/global_rules.md",
  ".devin/knowledge/lint.md",
  ".devin/knowledge/test.md",
  ".devin/playbooks/ship-capability.md",
  ".devin/wiki.json",
  "scripts/doctor.mjs",
  "lib/doctor/index.mjs",
  "lib/doctor/files.mjs",
  "lib/doctor/ralph.mjs",
  "lib/doctor/report.mjs",
  "lib/doctor/skills.mjs",
  "templates/ralph-stop.mjs",
];

/** Repo-relative template sources used to restore missing repo files. */
const REPO_TEMPLATE_SOURCES = {
  "AGENTS.md": "templates/AGENTS.md",
};

/**
 * Files that must exist under the human's home directory on the
 * Windows machine, mapped to the repo file used to restore them
 * (null = check only, cannot be restored from this repo).
 */
export function windowsHomeFiles(home) {
  return [
    { path: join(home, ".devin", "global_rules.md"), from: ".devin/global_rules.md" },
    { path: join(home, ".devin", "knowledge", "lint.md"), from: ".devin/knowledge/lint.md" },
    { path: join(home, ".devin", "knowledge", "test.md"), from: ".devin/knowledge/test.md" },
    { path: join(home, ".devin", "playbooks", "ship-capability.md"), from: ".devin/playbooks/ship-capability.md" },
    { path: join(home, ".devin", "wiki.json"), from: ".devin/wiki.json" },
    { path: join(home, ".devin", "AGENTS.md"), from: "templates/AGENTS.md" },
    { path: join(home, ".vibesetup", "memory", "MEMORY.md"), from: null, seed: "# MEMORY\n\nAppend-only. Chat is not memory.\n" },
    { path: join(home, ".devin", "MEMORY.md"), from: null, hardlinkTo: join(home, ".vibesetup", "memory", "MEMORY.md") },
  ];
}

export function checkRepoFiles(root) {
  return REPO_FILES.map((rel) => ({
    path: rel,
    present: existsSync(join(root, rel)),
  }));
}

/** Restore missing repo files from templates/. Returns repaired paths. */
export function repairRepoFiles(root) {
  const repaired = [];
  for (const { path, present } of checkRepoFiles(root)) {
    if (present) continue;
    const src = REPO_TEMPLATE_SOURCES[path];
    if (src && existsSync(join(root, src))) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      copyFileSync(join(root, src), join(root, path));
      repaired.push(path);
    }
  }
  return repaired;
}

/** Restore a missing home file from the repo (or seed content). */
export function restoreHomeFile(root, entry) {
  if (existsSync(entry.path)) return "ok";
  mkdirSync(dirname(entry.path), { recursive: true });
  if (entry.from && existsSync(join(root, entry.from))) {
    copyFileSync(join(root, entry.from), entry.path);
    return "restored from " + entry.from;
  }
  if (entry.seed) {
    writeFileSync(entry.path, entry.seed);
    return "seeded";
  }
  return "missing";
}
