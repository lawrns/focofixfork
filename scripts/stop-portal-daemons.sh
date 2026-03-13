#!/usr/bin/env bash

set -euo pipefail

DAEMON_DIR="${DAEMON_DIR:-/tmp/focofixfork-daemons}"
PORTAL_PID_FILE="$DAEMON_DIR/portal.pid"
OPENCLAW_PID_FILE="$DAEMON_DIR/openclaw.pid"

stop_one() {
  local pid_file="$1"
  local label="$2"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file")"
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
    rm -f "$pid_file"
    echo "stopped $label"
  fi
}

stop_one "$PORTAL_PID_FILE" "portal daemon"
stop_one "$OPENCLAW_PID_FILE" "openclaw daemon"

fuser -k 4000/tcp 2>/dev/null || true
fuser -k 18789/tcp 2>/dev/null || true
