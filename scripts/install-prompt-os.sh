#!/usr/bin/env bash
# Install Prompt OS from GitHub main and wire THIS repo for Cursor Cloud + Devin.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
POS_REPO="${PROMPT_OS_REPO:-https://github.com/youtextme/prompt-operating-system.git}"
POS_BRANCH="${PROMPT_OS_BRANCH:-main}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20+ required for Prompt OS" >&2
  exit 1
fi

echo "Installing Prompt OS from ${POS_REPO} (${POS_BRANCH})…"
git clone --depth 1 --branch "$POS_BRANCH" "$POS_REPO" "$TMP/prompt-operating-system"
node "$TMP/prompt-operating-system/install.mjs" --force --repo "$ROOT"

test -f "$HOME/.agents/router/PROMPT-ROUTER.md"
test -f "$ROOT/.cursor/rules/00-prompt-os.mdc"
echo "Prompt OS OK — router: $HOME/.agents/router/PROMPT-ROUTER.md"
echo "Cursor Cloud rule: $ROOT/.cursor/rules/00-prompt-os.mdc"
