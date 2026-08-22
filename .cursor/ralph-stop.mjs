#!/usr/bin/env node
/**
 * Cursor `stop` hook for VibeSetup / Ralph.
 *
 * Contract: read the hook payload on stdin, print a JSON object on stdout.
 * `{}` means "let the agent stop"; `{ followup_message }` auto-submits a new
 * user turn. The loop is opt-in (`--arm`) and always bounded, so a normal
 * Cursor session is never turned into a retry loop.
 *
 * CLI: --arm | --disarm | --status
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const MAX = Math.max(1, Number(process.env.VIBESETUP_MAX_ITERATIONS) || 12);
const TEST_TIMEOUT_MS = Math.max(1000, Number(process.env.VIBESETUP_TEST_TIMEOUT_MS) || 90000);

function paths(root) {
  const dir = join(root, ".cursor", "ralph");
  return { dir, active: join(dir, "active"), done: join(dir, "done") };
}

function stop() {
  process.stdout.write("{}");
  process.exit(0);
}

function followup(message) {
  process.stdout.write(JSON.stringify({ followup_message: message }));
  process.exit(0);
}

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function testCommand(root) {
  try {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8").replace(/^\uFEFF/, ""));
    return pkg?.scripts?.test ? "npm test" : null;
  } catch {
    return null;
  }
}

const flag = process.argv[2];
if (flag === "--arm" || flag === "--disarm" || flag === "--status") {
  const root = process.env.CURSOR_PROJECT_DIR || process.cwd();
  const { dir, active, done } = paths(root);
  mkdirSync(dir, { recursive: true });
  if (flag === "--arm") {
    rmSync(done, { force: true });
    writeFileSync(active, new Date().toISOString());
    console.log(`ralph armed (max ${MAX} iterations): ${active}`);
  } else if (flag === "--disarm") {
    rmSync(active, { force: true });
    console.log("ralph disarmed");
  } else {
    console.log(`ralph ${existsSync(active) ? "armed" : "off"}${existsSync(done) ? ", done" : ""}`);
  }
  process.exit(0);
}

try {
  let payload = {};
  try {
    payload = JSON.parse(readStdin() || "{}");
  } catch {
    payload = {};
  }

  const root =
    payload.workspace_roots?.[0] || process.env.CURSOR_PROJECT_DIR || process.cwd();
  const { dir, active, done } = paths(root);

  // Only ever continue a turn that finished cleanly.
  if (payload.status && payload.status !== "completed") stop();

  // Loop is opt-in. Without this file the hook is a no-op.
  if (!existsSync(active) && process.env.VIBESETUP_RALPH !== "1") stop();
  if (existsSync(done)) stop();

  const loop = Number(payload.loop_count) || 0;
  if (loop + 1 >= MAX) {
    // Hard cap: disarm so the next turn is a normal Cursor turn.
    rmSync(active, { force: true });
    stop();
  }

  const command = testCommand(root);
  if (!command) {
    // Nothing to gate "done" on, so do not loop.
    rmSync(active, { force: true });
    stop();
  }

  const test = spawnSync(process.platform === "win32" ? "cmd" : "bash", [
    process.platform === "win32" ? "/c" : "-lc",
    command,
  ], { cwd: root, encoding: "utf8", timeout: TEST_TIMEOUT_MS, maxBuffer: 16 * 1024 * 1024 });

  // Runner missing, killed, or timed out: fail safe and let the agent stop.
  if (test.error || test.signal || test.status === null) {
    rmSync(active, { force: true });
    stop();
  }

  if (test.status === 0) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(done, new Date().toISOString());
    rmSync(active, { force: true });
    stop();
  }

  const output = `${test.stdout || ""}\n${test.stderr || ""}`.trim().slice(-1500);
  followup(
    `VibeSetup Ralph ${loop + 1}/${MAX}: \`${command}\` is red. Fix it from the failure output below, then continue. Do not claim done.\n\n${output}`
  );
} catch {
  stop();
}
