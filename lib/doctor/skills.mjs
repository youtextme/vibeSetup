import { existsSync } from "node:fs";
import { join } from "node:path";

export const REQUIRED_SKILLS = [
  "grill-me",
  "using-superpowers",
  "test-driven-development",
];

export const FORBIDDEN_SKILLS = ["interview-me"];

/**
 * Check a skills directory. Returns { checked, ok, missing, forbidden }.
 * checked=false when the skills dir itself is absent (e.g. cloud VM).
 */
export function checkSkills(skillsDir) {
  if (!skillsDir || !existsSync(skillsDir)) {
    return { checked: false, ok: false, missing: [], forbidden: [] };
  }
  const missing = REQUIRED_SKILLS.filter(
    (name) => !existsSync(join(skillsDir, name, "SKILL.md"))
  );
  const forbidden = FORBIDDEN_SKILLS.filter((name) =>
    existsSync(join(skillsDir, name))
  );
  return {
    checked: true,
    ok: missing.length === 0 && forbidden.length === 0,
    missing,
    forbidden,
  };
}
