#!/usr/bin/env bash
# Cursor Cloud — install Prompt OS on boot (required for Cloud agents; they read repo .cursor/, not ~/.cursor).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
bash "$ROOT/scripts/install-prompt-os.sh"
