#!/usr/bin/env bash
# Cursor Cloud install — same Prompt OS the PC gets from
# https://github.com/youtextme/prompt-operating-system
set -euo pipefail

REPO="${PROMPT_OS_REPO:-https://github.com/youtextme/prompt-operating-system.git}"
BRANCH="${PROMPT_OS_BRANCH:-main}"
# Match PC one-liner defaults (hard enforce). Set PROMPT_OS_WITH_KIT=1 for VibeSetup kit pin.
EXTRA_ARGS=(--force)
if [[ "${PROMPT_OS_WITH_KIT:-0}" == "1" ]]; then
  EXTRA_ARGS+=(--with-kit)
fi

# Cloud images sometimes set npm_config_prefix=/ which breaks nvm npm.
unset npm_config_prefix || true
if [[ -d "${HOME}/.nvm/versions/node" ]]; then
  NVM_NODE="$(ls -d "${HOME}/.nvm/versions/node"/v*/bin 2>/dev/null | sort -V | tail -1 || true)"
  if [[ -n "${NVM_NODE}" ]]; then
    export PATH="${NVM_NODE}:${PATH}"
  fi
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20+ required for Prompt OS" >&2
  exit 1
fi

echo "Installing Prompt OS from ${REPO}@${BRANCH} …"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
INSTALL_ROOT=""

if git clone --depth 1 --branch "$BRANCH" "$REPO" "$TMP/repo" 2>/dev/null; then
  INSTALL_ROOT="$TMP/repo"
else
  curl -fsSL "https://github.com/youtextme/prompt-operating-system/archive/refs/heads/${BRANCH}.tar.gz" -o "$TMP/repo.tar.gz"
  tar -xzf "$TMP/repo.tar.gz" -C "$TMP"
  INSTALL_ROOT="$(find "$TMP" -maxdepth 1 -type d -name 'prompt-operating-system*' | head -1)"
fi

node "${INSTALL_ROOT}/install.mjs" "${EXTRA_ARGS[@]}"

# Keep a durable pos CLI + doctor entrypoint (install.mjs copies kernel, not bin/)
POS_ROOT="${HOME}/.agents/prompt-os"
mkdir -p "${POS_ROOT}/bin"
if [[ -f "${INSTALL_ROOT}/bin/pos.mjs" ]]; then
  cp -f "${INSTALL_ROOT}/bin/pos.mjs" "${POS_ROOT}/bin/pos.mjs"
fi

test -f "${HOME}/.agents/prompt-os/INSTALL.json"
test -f "${HOME}/.agents/router/PROMPT-ROUTER.md"
test -f "${HOME}/.cursor/rules/00-prompt-os.mdc"

echo "Prompt OS cloud install OK"
ls -la "${HOME}/.agents/prompt-os/INSTALL.json" "${HOME}/.agents/router/PROMPT-ROUTER.md" "${HOME}/.cursor/rules/00-prompt-os.mdc"
