import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkRepoFiles,
  repairRepoFiles,
  restoreHomeFile,
  windowsHomeFiles,
} from "./files.mjs";
import { checkRalphStop } from "./ralph.mjs";
import { checkSkills, FORBIDDEN_SKILLS } from "./skills.mjs";
import { buildReport } from "./report.mjs";

export const WINDOWS_HOME = "C:\\Users\\omi";

export function repoRoot() {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "..");
}

export function detectMode() {
  return process.platform === "win32" && existsSync(WINDOWS_HOME)
    ? "windows"
    : "cloud";
}

function mklink(args) {
  return spawnSync("cmd", ["/c", "mklink", ...args], { encoding: "utf8" });
}

function ensureJunction(linkPath, targetPath, rows) {
  if (existsSync(linkPath)) {
    rows.push({ check: "junction", path: linkPath, result: "present" });
    return;
  }
  const res = mklink(["/J", linkPath, targetPath]);
  rows.push({
    check: "junction",
    path: `${linkPath} -> ${targetPath}`,
    result: res.status === 0 ? "created" : "FAILED",
    fixed: res.status === 0 ? "created junction" : (res.stderr || "").trim(),
  });
}

function ensureHardlink(linkPath, targetPath, rows) {
  if (existsSync(linkPath)) {
    rows.push({ check: "hardlink", path: linkPath, result: "present" });
    return;
  }
  const res = mklink(["/H", linkPath, targetPath]);
  rows.push({
    check: "hardlink",
    path: `${linkPath} -> ${targetPath}`,
    result: res.status === 0 ? "created" : "FAILED",
    fixed: res.status === 0 ? "created hardlink" : (res.stderr || "").trim(),
  });
}

function reloadOpenClaw(rows, timeoutMs) {
  const probe = spawnSync("openclaw", ["--version"], {
    encoding: "utf8",
    shell: process.platform === "win32",
    timeout: timeoutMs,
  });
  if (probe.error || probe.status !== 0) {
    rows.push({ check: "OpenClaw", path: "openclaw --version", result: "not installed" });
    return;
  }
  const reload = spawnSync("openclaw", ["gateway", "restart"], {
    encoding: "utf8",
    shell: process.platform === "win32",
    timeout: timeoutMs,
  });
  rows.push({
    check: "OpenClaw reload",
    path: "openclaw gateway restart",
    result: reload.status === 0 ? "reloaded" : "reload failed — restart manually",
  });
}

export function runDoctor({ timeout = 180 } = {}) {
  const timeoutMs = timeout * 1000;
  const root = repoRoot();
  const mode = detectMode();
  const rows = [];
  const notes = [];
  let firstBroken = "";

  const repaired = repairRepoFiles(root);
  for (const f of checkRepoFiles(root)) {
    rows.push({
      check: "repo file",
      path: f.path,
      result: f.present ? "present" : "MISSING",
      fixed: repaired.includes(f.path) ? "restored from templates/" : "ok",
    });
    if (!f.present && !firstBroken) firstBroken = `repo file missing: ${f.path}`;
  }
  const filesOk = checkRepoFiles(root).every((f) => f.present);

  const ralph = checkRalphStop(join(root, "templates", "ralph-stop.mjs"), timeoutMs);
  rows.push({
    check: "ralph-stop unarmed",
    path: "templates/ralph-stop.mjs (no .cursor/ralph/active)",
    result: ralph.unarmedOk && !ralph.createdActive ? `stdout ${ralph.unarmedStdout}` : "UNSAFE",
  });
  rows.push({
    check: "ralph-stop cap",
    path: "templates/ralph-stop.mjs (iterations=12)",
    result: ralph.cappedOk ? "stops at max-iterations (12)" : "UNSAFE",
  });
  if (!ralph.safe && !firstBroken) firstBroken = "templates/ralph-stop.mjs is not safe";

  let skills;
  if (mode === "windows") {
    const home = WINDOWS_HOME;
    for (const entry of windowsHomeFiles(home)) {
      const result = restoreHomeFile(root, entry);
      rows.push({
        check: "home file",
        path: entry.path,
        result: result === "missing" ? "MISSING" : "present",
        fixed: result === "ok" ? "ok" : result,
      });
      if (result === "missing" && !firstBroken) firstBroken = `home file missing: ${entry.path}`;
    }
    ensureJunction(join(home, ".devin", "skills"), join(home, ".agents", "skills"), rows);
    ensureHardlink(join(home, ".devin", "MEMORY.md"), join(home, ".vibesetup", "memory", "MEMORY.md"), rows);

    const skillsDir = join(home, ".agents", "skills");
    for (const bad of FORBIDDEN_SKILLS) {
      const badPath = join(skillsDir, bad);
      if (existsSync(badPath)) {
        rmSync(badPath, { recursive: true, force: true });
        rows.push({ check: "forbidden skill", path: badPath, result: "was present", fixed: "removed" });
      } else {
        rows.push({ check: "forbidden skill absent", path: badPath, result: "absent" });
      }
    }
    skills = checkSkills(skillsDir);
    rows.push({
      check: "skills",
      path: skillsDir,
      result: skills.ok
        ? "all required present"
        : `missing: ${skills.missing.join(", ") || "none"}; forbidden: ${skills.forbidden.join(", ") || "none"}`,
      fixed: skills.ok ? "ok" : "reinstall via npx skills add (see INSTALL.md)",
    });
    if (!skills.ok && !firstBroken) firstBroken = "required skills missing";
    reloadOpenClaw(rows, timeoutMs);
  } else {
    skills = checkSkills(join(homedir(), ".agents", "skills"));
    rows.push({
      check: "skills",
      path: join(homedir(), ".agents", "skills"),
      result: skills.checked
        ? skills.ok
          ? "all required present"
          : `missing: ${skills.missing.join(", ")}`
        : "not checked (cloud VM, laptop skills unreachable)",
    });
    notes.push(
      "CLOUD_VM — laptop Cursor/OpenClaw/memory were not checked. Run `node scripts/doctor.mjs` once on the Windows machine."
    );
  }

  const skillsRequired = mode === "windows";
  const ok = filesOk && ralph.safe && (!skillsRequired || skills.ok);

  const tokens = [];
  if (filesOk) tokens.push("VIBESETUP_FILES_OK");
  if (skills.checked && skills.ok) tokens.push("SKILLS_OK");
  if (ralph.safe) tokens.push("RALPH_SAFE");

  const report = buildReport({ mode, rows, tokens, ok, firstBroken, notes });
  return { ok, mode, rows, tokens, filesOk, ralph, skills, report: report.text };
}
