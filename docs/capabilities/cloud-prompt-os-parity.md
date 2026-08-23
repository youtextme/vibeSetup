# Capability: Cloud Prompt OS parity

## Job to be done

Cursor Cloud agents for this repo must boot with the same **Prompt Operating System** kernel/wiring that Cursor on This PC gets from:

`https://github.com/youtextme/prompt-operating-system`

## North Star (falsifiable)

A fresh Cloud agent after install has:

1. `~/.agents/prompt-os/INSTALL.json`
2. `~/.agents/router/PROMPT-ROUTER.md`
3. `~/.cursor/rules/00-prompt-os.mdc`
4. `node ~/.agents/prompt-os/bin/pos.mjs doctor` is not required if bin is not copied; doctor via cloned install verify is acceptable
5. Environment setup exit code 0 (no missing `scripts/cloud-install.sh`)

## Grill-me decisions (recorded)

| Question | Decision |
|---|---|
| Which OS? | Prompt Operating System (`youtextme/prompt-operating-system`), not Outcome OS |
| Install mode? | Same as PC default: hard enforce (`--force`), not `--soft` |
| Kit skills? | Optional via `PROMPT_OS_WITH_KIT=1`; default off to match PC one-liner |
| Gateway? | Start on every boot via `scripts/cloud-start.sh` (per-pod; not install) |
| Config source? | Repo `.cursor/environment.json` so Cloud matches git, not a stale personal DB install |

## Kill criterion

If POS `install.sh` cannot run non-interactively on Cursor Cloud Linux (Node 20+), stop and report — do not invent a fork of the kernel.

## Evidence

- `npm test` green
- Draft environment build SUCCEEDED with this branch
- Fresh cloud agent smoke confirms POS files present
