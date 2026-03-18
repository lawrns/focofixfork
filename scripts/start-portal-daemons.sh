#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DAEMON_DIR="${DAEMON_DIR:-/tmp/focofixfork-daemons}"
PORTAL_LOG="$DAEMON_DIR/portal.log"
OPENCLAW_LOG="$DAEMON_DIR/openclaw.log"
PORTAL_PID_FILE="$DAEMON_DIR/portal.pid"
OPENCLAW_PID_FILE="$DAEMON_DIR/openclaw.pid"

mkdir -p "$DAEMON_DIR"

start_portal() {
  if [[ -f "$PORTAL_PID_FILE" ]] && kill -0 "$(cat "$PORTAL_PID_FILE")" 2>/dev/null; then
    echo "portal daemon already running"
  else
    nohup bash -lc "cd '$ROOT_DIR' && npm run build >>'$PORTAL_LOG' 2>&1 && while true; do HOST=0.0.0.0 PORT=4000 npm run start >>'$PORTAL_LOG' 2>&1; sleep 2; done" >/dev/null 2>&1 &
    echo $! > "$PORTAL_PID_FILE"
    echo "started portal daemon pid $(cat "$PORTAL_PID_FILE")"
  fi
}

start_openclaw() {
  if [[ -f "$OPENCLAW_PID_FILE" ]] && kill -0 "$(cat "$OPENCLAW_PID_FILE")" 2>/dev/null; then
    echo "openclaw daemon already running"
  else
    nohup bash -lc "while true; do /home/laurence/openclaw/openclaw.mjs gateway run --bind lan --port 18789 --force >>'$OPENCLAW_LOG' 2>&1; sleep 2; done" >/dev/null 2>&1 &
    echo $! > "$OPENCLAW_PID_FILE"
    echo "started openclaw daemon pid $(cat "$OPENCLAW_PID_FILE")"
  fi
}

start_portal
start_openclaw
