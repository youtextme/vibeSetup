# Capability: Prompt OS integration (VibeSetup)

Status: active  
Owner surface: Cursor Cloud | Devin | opencode | local CLI

## Job

Every VibeSetup project routes prompts through Prompt OS v3.3+ — not stale Jillu rules or skills-only loops.

## North Star

- Metric: Cloud Cursor sessions load `00-prompt-os.mdc` from repo + `~/.agents/router/PROMPT-ROUTER.md` on boot
- Target: 100% of VibeSetup cloud boots

## Key Results

1. `scripts/install-prompt-os.sh` installs POS from GitHub main with `--repo` wiring
2. `.cursor/rules/00-prompt-os.mdc` committed in repo (Cloud agents read this)
3. `.devin/` committed for Devin Cloud
4. INSTALL.md step 0.5 documents one-command install

## Contract

`docs/capabilities/prompt-os-integration.md`
