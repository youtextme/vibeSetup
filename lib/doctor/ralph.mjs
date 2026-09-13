import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function runStopHook(scriptPath, dir, timeoutMs) {
  return spawnSync(process.execPath, [scriptPath], {
    cwd: dir,
    env: { ...process.env, CURSOR_PROJECT_DIR: dir },
    encoding: "utf8",
    timeout: timeoutMs,
  });
}

/**
 * Verify templates/ralph-stop.mjs is safe:
 * - unarmed (no .cursor/ralph/active): stdout is exactly {} and it does
 *   not create the active file itself;
 * - armed at the iteration cap: it stops with a max-iterations message.
 * Runs in throwaway temp dirs; never touches the real repo.
 */
export function checkRalphStop(scriptPath, timeoutMs = 30000) {
  const unarmedDir = mkdtempSync(join(tmpdir(), "vibesetup-ralph-unarmed-"));
  const armedDir = mkdtempSync(join(tmpdir(), "vibesetup-ralph-armed-"));
  try {
    const unarmed = runStopHook(scriptPath, unarmedDir, timeoutMs);
    const unarmedOk =
      unarmed.status === 0 && (unarmed.stdout || "").trim() === "{}";
    const createdActive = existsSync(
      join(unarmedDir, ".cursor", "ralph", "active")
    );

    const ralphDir = join(armedDir, ".cursor", "ralph");
    mkdirSync(ralphDir, { recursive: true });
    writeFileSync(join(ralphDir, "active"), "");
    writeFileSync(join(ralphDir, "iterations"), "12");
    const capped = runStopHook(scriptPath, armedDir, timeoutMs);
    const cappedOk =
      capped.status === 0 &&
      (capped.stdout || "").includes("max-iterations (12)");

    return {
      safe: unarmedOk && !createdActive && cappedOk,
      unarmedOk,
      createdActive,
      cappedOk,
      unarmedStdout: (unarmed.stdout || "").trim(),
    };
  } finally {
    rmSync(unarmedDir, { recursive: true, force: true });
    rmSync(armedDir, { recursive: true, force: true });
  }
}
