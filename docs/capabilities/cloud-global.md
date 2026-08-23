# Capability: Cloud global VibeSetup

## Objective

Every Cursor Cloud Agent run — on any repository — gets the VibeSetup kit, tiny frozen constitution, Ralph cap, and on-demand skills without a manual paste per repo.

## Done when

- `scripts/cloud-bootstrap.mjs` installs pinned kit skills globally and bootstraps missing project files.
- `scripts/cloud-install.sh` runs bootstrap from a vibeSetup checkout (repo `install` script).
- `scripts/cloud-install-remote.sh` fetches vibeSetup and runs bootstrap (team environment install for other repos).
- `.cursor/environment.json` commits the install hook for this repo.
- `INSTALL.md` documents team-wide Cloud setup (environment + Team Rules).
- `npm test` passes.

## Not in scope

- Dashboard Save (user action after proposal).
- Overwriting existing per-repo `AGENTS.md` or hooks.
