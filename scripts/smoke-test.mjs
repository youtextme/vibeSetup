#!/usr/bin/env node
/**
 * Kit smoke test for VibeSetup. Ralph treats `npm test` as done.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const required = [
  "AGENTS.md",
  "INSTALL.md",
  "kit.json",
  "index.html",
  ".cursor/hooks.json",
  ".cursor/ralph-stop.mjs",
  ".cursor/rules/core.mdc",
  "templates/AGENTS.md",
  "templates/core.mdc",
  "templates/cursor-hooks.json",
  "templates/ralph-stop.mjs",
];

function readJson(path) {
  const raw = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

const missing = required.filter((p) => !existsSync(join(root, p)));
if (missing.length) {
  console.error("Missing required kit files:");
  for (const p of missing) console.error(`  - ${p}`);
  process.exit(1);
}

const hooks = readJson(join(root, ".cursor/hooks.json"));
const stop = hooks?.hooks?.stop;
if (!Array.isArray(stop) || !stop.some((h) => String(h.command || "").includes("ralph-stop"))) {
  console.error("hooks.json must register ralph-stop on stop");
  process.exit(1);
}

const kit = readJson(join(root, "kit.json"));
if (!Array.isArray(kit.repos) || kit.repos.length < 5) {
  console.error("kit.json repos look incomplete");
  process.exit(1);
}

console.log(`ok: ${required.length} kit files, ralph stop hook, ${kit.repos.length} kit repos`);
process.exit(0);