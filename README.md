# VibeSetup

One prompt. Any machine. Cursor, Devin, OpenClaw, and Claude install the same pinned kit and run like objective runners.

**Page:** [youtextme.github.io/vibeSetup](https://youtextme.github.io/vibeSetup/)

## The prompt

Paste this in Cursor Agent, a new Devin session, OpenClaw, Claude Code, or any other agent CLI:

```
Install VibeSetup on this computer. Read INSTALL.md from https://raw.githubusercontent.com/youtextme/vibeSetup/main/INSTALL.md or from a local vibeSetup folder. Follow it exactly. Detect my OS and whether this is Cursor, Devin, OpenClaw, Claude Code, or another agent. Pin the kit. Write a tiny frozen AGENTS.md. Enable Ralph with a max-iteration cap. Do not ask questions unless a paid secret is missing. When finished, list what you installed and where.
```

The agent follows [INSTALL.md](INSTALL.md). The kit list lives in [kit.json](kit.json). Stars on the page are live from GitHub.

## Cursor Cloud (all repositories)

Attach a team Cloud environment to every repo and set install to:

```bash
curl -fsSL https://raw.githubusercontent.com/youtextme/vibeSetup/main/scripts/cloud-install-remote.sh | bash
```

Add enforced **Team Rules** from `templates/AGENTS.md` or Remote Rule `youtextme/vibeSetup` for every prompt. See [INSTALL.md §6](INSTALL.md).
