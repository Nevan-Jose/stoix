#!/usr/bin/env bash
# Stop STOIX local services (Python API + Vite dev). macOS / Linux (requires lsof).
set -euo pipefail

kill_port() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    local pids
    pids="$(lsof -ti:"$port" 2>/dev/null || true)"
    if [[ -n "${pids}" ]]; then
      echo "Stopping listener(s) on port ${port}: ${pids}"
      # shellcheck disable=SC2086
      kill -9 ${pids} 2>/dev/null || true
    else
      echo "No process on port ${port}"
    fi
  else
    echo "lsof not found; skip killing port ${port}" >&2
  fi
}

kill_port 8787
kill_port 5173
sleep 0.3
echo "stoix-kill: done"
