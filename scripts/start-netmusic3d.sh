#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
command -v node >/dev/null || { echo 'Activate Node 16 before starting.' >&2; exit 1; }
[[ "$(node -p 'process.versions.node.split(".")[0]')" == 16 ]] || {
  echo 'Run nvm use 16 before starting this server.' >&2; exit 1;
}
[[ -f data/corelink.sqlite3 && -d node_modules ]] || {
  echo 'Run bash scripts/setup-netmusic3d.sh first.' >&2; exit 1;
}
export CORELINK_PACKET_DEBUG="${CORELINK_PACKET_DEBUG:-0}"
printf 'NetMusic3D Corelink: control TCP 20010; audio UDP/TCP 20011. Ctrl-C stops the server.\n'
if [[ "$(uname -s)" == Darwin ]] && command -v caffeinate >/dev/null; then
  exec caffeinate -i node corelink.js
fi
exec node corelink.js
