#!/usr/bin/env bash
set -euo pipefail

# Starts MindCircle in a detached screen session named "mindcircle".
# Logs to ./data/mindcircle-server.log

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if ! command -v screen >/dev/null 2>&1; then
  echo "ERROR: screen is not installed. Install it or use ./server/bin/run-prod.sh" >&2
  exit 1
fi

mkdir -p "$ROOT/data"

SESSION_NAME="${MC_SCREEN_NAME:-mindcircle}"
LOG_FILE="${MC_SERVER_LOG:-$ROOT/data/mindcircle-server.log}"

echo "Starting detached screen session: $SESSION_NAME"
echo "Log file: $LOG_FILE"

# shellcheck disable=SC2016
screen -dmS "$SESSION_NAME" bash -lc \
  'set -euo pipefail; umask 022; ./server/bin/run-prod.sh 2>&1 | tee -a "'"$LOG_FILE"'"'

echo "OK. Attach with: screen -r $SESSION_NAME"

