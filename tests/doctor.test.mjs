import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkRepoFiles, REPO_FILES } from "../lib/doctor/files.mjs";
import { checkRalphStop } from "../lib/doctor/ralph.mjs";
import { checkSkills } from "../lib/doctor/skills.mjs";
import { detectMode, repoRoot, runDoctor } from "../lib/doctor/index.mjs";

const root = repoRoot();
const stopHook = join(root, "templates", "ralph-stop.mjs");

function runStopHook(dir) {
  return spawnSync(process.execPath, [stopHook], {
    cwd: dir,
    env: { ...process.env, CURSOR_PROJECT_DIR: dir },
    encoding: "utf8",
    timeout: 30000,
  });
}

test("all required repo files are present", () => {
  const missing = checkRepoFiles(root).filter((f) => !f.present);
  assert.deepEqual(missing, []);
  assert.ok(REPO_FILES.includes("scripts/doctor.mjs"));
  assert.ok(REPO_FILES.includes("templates/ralph-stop.mjs"));
});

test("ralph-stop no-ops with {} when .cursor/ralph/active is absent", () => {
  const dir = mkdtempSync(join(tmpdir(), "ralph-unarmed-"));
  try {
    const res = runStopHook(dir);
    assert.equal(res.status, 0);
    assert.equal(res.stdout.trim(), "{}");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("ralph-stop never creates .cursor/ralph/active itself", () => {
  const result = checkRalphStop(stopHook);
  assert.equal(result.createdActive, false);
});

test("ralph-stop outputs {} when done file exists even if armed", () => {
  const dir = mkdtempSync(join(tmpdir(), "ralph-done-"));
  try {
    const ralphDir = join(dir, ".cursor", "ralph");
    mkdirSync(ralphDir, { recursive: true });
    writeFileSync(join(ralphDir, "active"), "");
    writeFileSync(join(ralphDir, "done"), "done");
    const res = runStopHook(dir);
    assert.equal(res.status, 0);
    assert.equal(res.stdout.trim(), "{}");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("ralph-stop stops at the 12-iteration cap when armed", () => {
  const dir = mkdtempSync(join(tmpdir(), "ralph-cap-"));
  try {
    const ralphDir = join(dir, ".cursor", "ralph");
    mkdirSync(ralphDir, { recursive: true });
    writeFileSync(join(ralphDir, "active"), "");
    writeFileSync(join(ralphDir, "iterations"), "12");
    const res = runStopHook(dir);
    assert.equal(res.status, 0);
    assert.match(res.stdout, /max-iterations \(12\)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("ralph-stop asks for another iteration when armed and tests are red", () => {
  const dir = mkdtempSync(join(tmpdir(), "ralph-red-"));
  try {
    const ralphDir = join(dir, ".cursor", "ralph");
    mkdirSync(ralphDir, { recursive: true });
    writeFileSync(join(ralphDir, "active"), "");
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ name: "t", private: true, scripts: { test: "exit 1" } })
    );
    const res = runStopHook(dir);
    assert.equal(res.status, 0);
    assert.match(res.stdout, /Ralph 1\/12/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("checkRalphStop reports the template as safe", () => {
  const result = checkRalphStop(stopHook);
  assert.equal(result.safe, true);
});

test("checkSkills validates required and forbidden skills", () => {
  const dir = mkdtempSync(join(tmpdir(), "skills-"));
  try {
    for (const name of ["grill-me", "using-superpowers", "test-driven-development"]) {
      mkdirSync(join(dir, name), { recursive: true });
      writeFileSync(join(dir, name, "SKILL.md"), `# ${name}`);
    }
    assert.equal(checkSkills(dir).ok, true);

    mkdirSync(join(dir, "interview-me"), { recursive: true });
    const withForbidden = checkSkills(dir);
    assert.equal(withForbidden.ok, false);
    assert.deepEqual(withForbidden.forbidden, ["interview-me"]);

    rmSync(join(dir, "grill-me"), { recursive: true, force: true });
    rmSync(join(dir, "interview-me"), { recursive: true, force: true });
    const withMissing = checkSkills(dir);
    assert.equal(withMissing.ok, false);
    assert.deepEqual(withMissing.missing, ["grill-me"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("checkSkills reports unchecked when the skills dir is absent", () => {
  const result = checkSkills(join(tmpdir(), "does-not-exist-" + Date.now()));
  assert.equal(result.checked, false);
});

test("doctor passes on this checkout", () => {
  const result = runDoctor({ timeout: 60 });
  assert.equal(result.ok, true);
  assert.ok(result.tokens.includes("VIBESETUP_FILES_OK"));
  assert.ok(result.tokens.includes("RALPH_SAFE"));
  assert.match(result.report, /DEVIN_VIBESETUP_OK/);
  if (detectMode() === "cloud") {
    assert.match(result.report, /CLOUD_VM/);
  }
});
