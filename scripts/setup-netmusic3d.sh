#!/usr/bin/env bash
# Shared macOS/Linux setup. Run with the server stopped, as a normal user.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
[[ "$EUID" != 0 ]] || { echo 'Run as a normal user, without sudo.' >&2; exit 1; }
command -v node >/dev/null && command -v npm >/dev/null || {
  echo 'Install Node 16 with npm, then rerun this script.' >&2; exit 1;
}
[[ "$(node -p 'process.versions.node.split(".")[0]')" == 16 ]] || {
  echo 'This server currently requires Node 16. Use nvm install 16 && nvm use 16.' >&2; exit 1;
}
mkdir -p data
[[ -f config/knexfile.js ]] || cp config/knexfile.js.sample config/knexfile.js
npm ci
# The upstream configurator expands certificate paths for this machine.
# Copying the sample verbatim leaves paths relative to the wrong directory.
node -e "require('./config/configure')"
node scripts/prepare-database.js
npm run test:receiver
printf '\nServer ready. Start with: bash scripts/start-netmusic3d.sh\n'
