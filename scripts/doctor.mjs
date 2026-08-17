#!/usr/bin/env node
/**
 * VibeSetup doctor. Proves this host is a complete VibeSetup install,
 * repairing what it can from this repo, then re-checking.
 *
 * Usage: node scripts/doctor.mjs [--timeout=180]
 */
import { runDoctor } from "../lib/doctor/index.mjs";

let timeout = 180;
for (const arg of process.argv.slice(2)) {
  const m = arg.match(/^--timeout=(\d+)$/);
  if (m) timeout = Number(m[1]);
}

const result = runDoctor({ timeout });
process.stdout.write(result.report + "\n");
process.exit(result.ok ? 0 : 1);
