#!/usr/bin/env bash
# Run VibeSetup bootstrap from a vibeSetup checkout (this repo's environment install).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export VIBESETUP_ROOT="$ROOT"
exec node "$ROOT/scripts/cloud-bootstrap.mjs"
