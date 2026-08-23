# INSTALL.md

Agent: you are installing **VibeSetup**. Follow this file exactly. Detect the computer. Do not ask questions unless a paid secret is missing. Do not install extra skill packs. Do not dump skill bodies into always-on rules.

## 0. Detect

Record:

- OS: Windows / macOS / Linux
- Host, in this order of evidence: Cursor, Devin, OpenClaw, Claude Code, Codex, other
- Project root: the git repo the human is in. If none, use the current workspace. Do not create a random extra repo.

If this file is missing locally, fetch:

`https://raw.githubusercontent.com/youtextme/vibeSetup/main/INSTALL.md`

Also fetch `kit.json` from the same repo.

## 1. Pin the kit (once)

Prefer `npx skills add <owner/repo>` when `npx` works. Otherwise clone at a pinned `main` SHA into the host skills folder. Do **not** `git pull` skills on every session later — pin and review.

Install only:

1. `obra/superpowers` — methodology. This owns TDD / plan / verify.
2. `addyosmani/agent-skills` — specialties. Skip any skill that duplicates Superpowers TDD.
3. `mattpocock/skills` — use **grill-me** (and caveman only if the human wants terse output). Do not install a second interview skill.
4. `anthropics/skills` — copy **only** `frontend-design` and `webapp-testing` (or the equivalent folder names). Leave gif/theme toys out of always-on.
5. `snarktank/ralph` — PRD loop files / skills. Always cap iterations (default **12**).
6. `safaiyeh/app-store-review-skill` — only if the project is iOS, Android, or a store-bound mobile/desktop app. Skip for pure web/backend unless they ship a store binary.
7. `ccusage/ccusage` — `npx ccusage` is enough. Do not wrap it in extra SaaS.

## 2. Tiny frozen constitution

Copy `templates/AGENTS.md` from this repo to the project root as `AGENTS.md` if missing. Do not grow it past ~80 lines.

Cursor: copy `templates/core.mdc` to `.cursor/rules/core.mdc`.

Never paste Superpowers or Addy into User Rules. Point at skills. Huge always-on text breaks prompt cache and raises cost.

## 3. Ralph (the outer loop)

**Always set a max.** Uncapped loops are a money fire.

### Cursor

- Copy `templates/cursor-hooks.json` → `.cursor/hooks.json` (must be **in the repo** so Cloud agents see it). Keep the explicit `loop_limit`; Cursor's own default is 5.
- Copy `templates/ralph-stop.mjs` → `.cursor/ralph-stop.mjs`
- Create `.cursor/ralph/` (gitkeep). Done file is `.cursor/ralph/done`.
- The loop is **opt-in**. `node .cursor/ralph-stop.mjs --arm` starts a run, `--disarm` stops it, `--status` shows state. Disarmed, the stop hook is a no-op and normal Cursor chats end normally. Never ship a stop hook that returns a follow-up unconditionally — that is an agent that never stops.
- Gitignore `.cursor/ralph/active`, `.cursor/ralph/done`. The cap comes from the payload's `loop_count`, not a counter file, so it resets per conversation.
- The hook only loops while `npm test` (or the project's real test script) is red and reachable. No test script, a killed runner, or a timeout means stop, not loop.
- If the official Cursor `ralph-loop` plugin is available, install it **instead of** duplicating stop logic — do not run two loops.
- Optional: `/loop` for babysitting; still keep `loop_limit`.

### Devin

- Do not install a bash while-loop.
- Knowledge items named exactly **`lint`** and **`test`** pointing at real commands.
- Playbook: “Ship a capability — grill-me once, implement, do not finish until `test` is green.”
- Session instruction: max 12 retries on red tests.

### OpenClaw

- Short workspace `AGENTS.md` (this template). Skills via `skills.load.extraDirs` or `workspace/skills`.
- Heartbeat / standing order: continue the current capability until tests pass. Cap the heartbeat.
- `USER.md` for human prefs. Chat is not memory.

### Claude Code / CLI

- `npx skills add` as above, or `/plugin install` Superpowers + Ralph if the marketplace is present.
- `snarktank/ralph`: `ralph.sh` with an explicit iteration count, never bare infinite.

## 4. Disk layout (create if missing)

```
docs/capabilities/   # one file per objective, from grill-me
prd.json             # optional Ralph stories
progress.txt         # append-only
```

## 5. Cursor Cloud (parity with This PC Prompt OS)

Cloud agents do **not** inherit your PC’s `~/.agents/prompt-os`. They install it during environment setup:

- `.cursor/environment.json` → `bash scripts/cloud-install.sh` (same kernel as [prompt-operating-system](https://github.com/youtextme/prompt-operating-system))
- `bash scripts/cloud-start.sh` starts the POS gateway on `:8555` each boot

PC one-liner remains:

```bash
curl -fsSL https://raw.githubusercontent.com/youtextme/prompt-operating-system/main/install.sh | bash
```

Optional Cloud kit pin: `PROMPT_OS_WITH_KIT=1` before install.

## 6. Cost

- Do not edit `AGENTS.md` during a Ralph run.
- Plan on a cheaper model; implement on a frontier model.
- After planning, write `plan.md` and start a **new** thread: “continue from plan.md”.
- Run `npx ccusage` (and Cursor’s usage UI) so spend is visible.

## 7. Done

Print a table:

| Item | Path or command | Host |
|---|---|---|
| AGENTS.md | … | all |
| Skills | … | … |
| Ralph cap | 12 | … |
| Tests command | … | … |

Stop. Do not start building the human’s product in this same turn unless they asked.
