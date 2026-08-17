#!/usr/bin/env node
/**
 * Cursor stop hook for VibeSetup / Ralph.
 * Keep going until tests pass, a done file exists, or loop_limit is hit.
 * Official Cursor stop output: followup_message (not extra system prompt).
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const root = process.env.CURSOR_PROJECT_DIR || process.cwd();
const dir = join(root, ".cursor", "ralph");
const done = join(dir, "done");
const countFile = join(dir, "iterations");
const max = Number(process.env.VIBESETUP_MAX_ITERATIONS || 12);

mkdirSync(dir, { recursive: true });

if (existsSync(done)) {
  process.stdout.write(JSON.stringify({}));
  process.exit(0);
}

let n = 0;
try {
  n = Number(readFileSync(countFile, "utf8")) || 0;
} catch {
  n = 0;
}
n += 1;
writeFileSync(countFile, String(n));

if (n >= max) {
  process.stdout.write(
    JSON.stringify({
      followup_message: `VibeSetup: hit max-iterations (${max}). Stop. Summarize what is left. Do not loop again.`,
    })
  );
  process.exit(0);
}

const test = spawnSync(
  process.platform === "win32" ? "cmd" : "bash",
  process.platform === "win32"
    ? ["/c", "npm test --if-present"]
    : ["-lc", "npm test --if-present"],
  { cwd: root, encoding: "utf8" }
);

if (test.status === 0) {
  writeFileSync(done, new Date().toISOString());
  process.stdout.write(JSON.stringify({}));
  process.exit(0);
}

process.stdout.write(
  JSON.stringify({
    followup_message: `VibeSetup Ralph ${n}/${max}: tests are not green. Fix from the failure output, commit if appropriate, then continue. Do not claim done.`,
  })
);
