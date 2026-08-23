#!/usr/bin/env bash
# Fetch vibeSetup and bootstrap — use as install script on any repo's Cloud environment.
# Example environment.json install line:
#   curl -fsSL https://raw.githubusercontent.com/youtextme/vibeSetup/main/scripts/cloud-install-remote.sh | bash
set -euo pipefail

CACHE="${VIBESETUP_CACHE:-${HOME}/.cache/vibesetup}"
REPO_URL="${VIBESETUP_REPO_URL:-https://github.com/youtextme/vibeSetup.git}"
REF="${VIBESETUP_REF:-main}"

mkdir -p "$CACHE"
if [[ ! -d "$CACHE/.git" ]]; then
  git clone --depth 1 --branch "$REF" "$REPO_URL" "$CACHE"
else
  git -C "$CACHE" fetch --depth 1 origin "$REF"
  git -C "$CACHE" checkout "$REF"
  git -C "$CACHE" reset --hard "origin/$REF"
fi

export VIBESETUP_ROOT="$CACHE"
exec node "$CACHE/scripts/cloud-bootstrap.mjs"
