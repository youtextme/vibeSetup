/**
 * Build the doctor's markdown report.
 * rows: [{ check, path, result, fixed }]
 * tokens: validation tokens that were actually verified.
 */
export function buildReport({ mode, rows, tokens, ok, firstBroken, notes = [] }) {
  const lines = [];
  lines.push("| Check | Path or command | Present/result | What you fixed |");
  lines.push("|---|---|---|---|");
  for (const r of rows) {
    lines.push(`| ${r.check} | ${r.path} | ${r.result} | ${r.fixed || "ok"} |`);
  }
  lines.push("");
  for (const note of notes) lines.push(note);
  if (notes.length) lines.push("");
  lines.push(ok ? "DEVIN_VIBESETUP_OK" : `DEVIN_VIBESETUP_FAIL ${firstBroken}`);
  for (const t of tokens) lines.push(t);
  lines.push("");
  return { mode, text: lines.join("\n") };
}
