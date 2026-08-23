#!/usr/bin/env node
/**
 * Kit smoke test for VibeSetup. Ralph treats `npm test` as done.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
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
  ".cursor/environment.json",
  "scripts/cloud-install.sh",
  "scripts/cloud-start.sh",
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
const stopHook = Array.isArray(stop)
  ? stop.find((h) => String(h.command || "").includes("ralph-stop"))
  : undefined;
if (!stopHook) {
  console.error("hooks.json must register ralph-stop on stop");
  process.exit(1);
}
if (!Number.isInteger(stopHook.loop_limit) || stopHook.loop_limit < 1) {
  console.error("stop hook must pin an explicit loop_limit");
  process.exit(1);
}

const envJson = readJson(join(root, ".cursor/environment.json"));
if (String(envJson.install || "").trim() !== "bash scripts/cloud-install.sh") {
  console.error("environment.json install must run bash scripts/cloud-install.sh");
  process.exit(1);
}
if (String(envJson.start || "").trim() !== "bash scripts/cloud-start.sh") {
  console.error("environment.json start must run bash scripts/cloud-start.sh");
  process.exit(1);
}

// The stop hook must not hijack ordinary Cursor turns. Exercise it against a
// scratch workspace so this suite never re-enters the hook's own test run.
const scratch = mkdtempSync(join(tmpdir(), "vibesetup-stop-"));
const scratchActive = join(scratch, ".cursor", "ralph", "active");

function hookEnv() {
  const env = { ...process.env, VIBESETUP_RALPH: "", VIBESETUP_STDIN_TIMEOUT_MS: "500" };
  // Cloud agents sometimes inject npm_config_prefix=/ which breaks `npm test`.
  delete env.npm_config_prefix;
  delete env.NPM_CONFIG_PREFIX;
  return env;
}

function runStopHookRaw(input) {
  const res = spawnSync(process.execPath, [join(root, ".cursor/ralph-stop.mjs")], {
    cwd: scratch,
    input,
    encoding: "utf8",
    timeout: 20000,
    env: hookEnv(),
  });
  return { status: res.status, out: (res.stdout || "").trim() };
}

function runStopHook(payload) {
  return runStopHookRaw(JSON.stringify(payload));
}

function expectNoFollowup(label, payload) {
  const { status, out } = runStopHook(payload);
  if (status !== 0 || out !== "{}") {
    console.error(`stop hook must not continue ${label} (status ${status}, output ${out})`);
    rmSync(scratch, { recursive: true, force: true });
    process.exit(1);
  }
}

try {
  const turn = { hook_event_name: "stop", workspace_roots: [scratch] };
  expectNoFollowup("a disarmed turn", { ...turn, status: "completed", loop_count: 0 });
  expectNoFollowup("an aborted turn", { ...turn, status: "aborted", loop_count: 0 });
  expectNoFollowup("an empty payload", {});

  // Armed and red, but the payload cannot be trusted: `status` and `loop_count`
  // are unreadable, so a follow-up here would be unbounded.
  mkdirSync(join(scratch, ".cursor", "ralph"), { recursive: true });
  writeFileSync(join(scratch, "package.json"), JSON.stringify({ scripts: { test: "exit 1" } }));
  for (const [label, input] of [
    ["empty stdin", ""],
    ["non-JSON stdin", "not json at all {{{"],
    ["a non-object payload", "[1,2,3]"],
    ["a payload without loop_count", JSON.stringify({ ...turn, status: "completed" })],
  ]) {
    writeFileSync(scratchActive, "armed");
    const { status, out } = runStopHookRaw(input);
    if (status !== 0 || out !== "{}") {
      console.error(`stop hook must not continue on ${label} (status ${status}, output ${out})`);
      process.exit(1);
    }
  }

  // Stdin that is never written must not block the agent. The hook is fed by an
  // open pipe nothing writes to; only the hook's own exit is asserted, since the
  // wrapper shell outlives it waiting on the writer.
  if (process.platform !== "win32") {
    writeFileSync(scratchActive, "armed");
    const log = join(scratch, "idle-stdin.log");
    spawnSync(
      "bash",
      [
        "-lc",
        `sleep 30 | { "${process.execPath}" "${join(root, ".cursor/ralph-stop.mjs")}"; echo "exit=$?"; } > "${log}" 2>&1`,
      ],
      {
        cwd: scratch,
        encoding: "utf8",
        timeout: 8000,
        env: hookEnv(),
      }
    );
    const idle = existsSync(log) ? readFileSync(log, "utf8").trim() : "";
    if (idle !== "{}exit=0") {
      console.error(`stop hook must not block on unwritten stdin (got ${JSON.stringify(idle)})`);
      process.exit(1);
    }
  }

  // Armed but nothing to gate "done" on: stop and disarm instead of looping.
  rmSync(join(scratch, "package.json"), { force: true });
  writeFileSync(scratchActive, "armed");
  expectNoFollowup("a project without a test script", { ...turn, status: "completed", loop_count: 0 });
  if (existsSync(scratchActive)) {
    console.error("stop hook must disarm ralph when it cannot verify tests");
    process.exit(1);
  }

  // Armed and red, but at the cap: stop.
  writeFileSync(join(scratch, "package.json"), JSON.stringify({ scripts: { test: "exit 1" } }));
  writeFileSync(scratchActive, "armed");
  expectNoFollowup("a turn at the iteration cap", {
    ...turn,
    status: "completed",
    loop_count: stopHook.loop_limit,
  });

  // Armed, red, under the cap: this is the one case that continues.
  writeFileSync(scratchActive, "armed");
  const red = runStopHook({ ...turn, status: "completed", loop_count: 0 });
  const followup = JSON.parse(red.out || "{}").followup_message;
  if (red.status !== 0 || !followup) {
    console.error(`stop hook must continue on red tests (status ${red.status}, output ${red.out})`);
    process.exit(1);
  }

  // Armed and green: mark done and stop.
  writeFileSync(join(scratch, "package.json"), JSON.stringify({ scripts: { test: "exit 0" } }));
  writeFileSync(scratchActive, "armed");
  expectNoFollowup("a green run", { ...turn, status: "completed", loop_count: 0 });
  if (!existsSync(join(scratch, ".cursor", "ralph", "done"))) {
    console.error("stop hook must write the done file when tests pass");
    process.exit(1);
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

const kit = readJson(join(root, "kit.json"));
if (!Array.isArray(kit.repos) || kit.repos.length < 5) {
  console.error("kit.json repos look incomplete");
  process.exit(1);
}

console.log(
  `ok: ${required.length} kit files, capped ralph stop hook (loop_limit ${stopHook.loop_limit}), ${kit.repos.length} kit repos`
);
process.exit(0);