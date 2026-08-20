#!/usr/bin/env node
/**
 * VibeSetup Cloud bootstrap — idempotent.
 * Global: pin kit skills to ~/.cursor/skills for Cursor agents.
 * Per-repo: copy templates when AGENTS.md / .cursor hooks are missing.
 */
import { existsSync, mkdirSync, readFileSync, copyFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function log(msg) {
  console.log(`vibesetup-cloud: ${msg}`);
}

function readJson(path) {
  const raw = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

function copyIfMissing(src, dest) {
  if (existsSync(dest)) {
    log(`skip (exists): ${dest}`);
    return false;
  }
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  log(`copied: ${dest}`);
  return true;
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...opts,
  });
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim();
    throw new Error(`${cmd} ${args.join(" ")} failed: ${detail}`);
  }
  return result;
}

function kitRoot() {
  if (process.env.VIBESETUP_ROOT && existsSync(process.env.VIBESETUP_ROOT)) {
    return process.env.VIBESETUP_ROOT;
  }
  const here = join(__dirname, "..");
  if (existsSync(join(here, "kit.json"))) return here;
  throw new Error("VIBESETUP_ROOT not set and kit.json not found beside scripts/");
}

function projectRoot() {
  return process.env.CURSOR_PROJECT_DIR || process.cwd();
}

function looksLikeMobile(root) {
  const markers = [
    "ios",
    "android",
    "App.tsx",
    "app.json",
    "capacitor.config",
    "Info.plist",
  ];
  for (const m of markers) {
    if (existsSync(join(root, m))) return true;
  }
  return false;
}

function installGlobalSkills(kit) {
  const home = process.env.HOME || "/home/ubuntu";
  mkdirSync(join(home, ".cursor", "skills"), { recursive: true });

  const installs = [
    { pkg: "obra/superpowers", args: [] },
    { pkg: "addyosmani/agent-skills", args: [] },
    { pkg: "mattpocock/skills", args: ["-s", "grill-me"] },
    {
      pkg: "anthropics/skills",
      args: ["-s", "frontend-design", "-s", "webapp-testing"],
    },
    { pkg: "snarktank/ralph", args: [] },
  ];

  if (looksLikeMobile(projectRoot())) {
    installs.push({ pkg: "safaiyeh/app-store-review-skill", args: [] });
  }

  for (const { pkg, args } of installs) {
  const ownerRepo = kit.repos?.find(
    (r) => `${r.owner}/${r.repo}` === pkg || r.url?.includes(pkg)
  );
    const label = ownerRepo?.name || pkg;
    log(`skills: ${label}`);
    run("npx", ["skills", "add", pkg, "-g", "-y", "-a", "cursor", ...args], {
      env: { ...process.env, npm_config_yes: "true" },
    });
  }

  log("ccusage: available via npx ccusage (not installed as always-on skill)");
}

function installGlobalRule(root) {
  const home = process.env.HOME || "/home/ubuntu";
  const rulesDir = join(home, ".cursor", "rules");
  const dest = join(rulesDir, "vibesetup-core.mdc");
  const src = join(root, "templates", "core.mdc");
  if (!existsSync(src)) {
    log("skip global rule: templates/core.mdc missing");
    return;
  }
  mkdirSync(rulesDir, { recursive: true });
  if (existsSync(dest)) {
    log(`skip (exists): ${dest}`);
    return;
  }
  copyFileSync(src, dest);
  log(`global rule: ${dest}`);
}

function bootstrapProject(root, kitRootPath) {
  const proj = projectRoot();
  mkdirSync(join(proj, "docs", "capabilities"), { recursive: true });

  const pairs = [
    [join(kitRootPath, "templates", "AGENTS.md"), join(proj, "AGENTS.md")],
    [join(kitRootPath, "templates", "core.mdc"), join(proj, ".cursor", "rules", "core.mdc")],
    [join(kitRootPath, "templates", "cursor-hooks.json"), join(proj, ".cursor", "hooks.json")],
    [join(kitRootPath, "templates", "ralph-stop.mjs"), join(proj, ".cursor", "ralph-stop.mjs")],
  ];

  for (const [src, dest] of pairs) {
    copyIfMissing(src, dest);
  }

  const ralphDir = join(proj, ".cursor", "ralph");
  mkdirSync(ralphDir, { recursive: true });
  const gitkeep = join(ralphDir, ".gitkeep");
  if (!existsSync(gitkeep)) {
    writeFileSync(gitkeep, "");
    log(`created: ${gitkeep}`);
  }
}

function main() {
  const root = kitRoot();
  const kit = readJson(join(root, "kit.json"));
  log(`kit root: ${root}`);
  log(`project: ${projectRoot()}`);

  installGlobalSkills(kit);
  installGlobalRule(root);
  bootstrapProject(root, root);

  log("done");
}

main();
