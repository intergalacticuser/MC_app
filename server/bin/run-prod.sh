#!/usr/bin/env bash
set -euo pipefail

# Runs the Node production server with sane defaults for Ollama.
# Optional: create a .env file in the app root to override values.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

load_dotenv() {
  local env_file="$1"
  [[ -f "$env_file" ]] || return 0

  # Safe-ish .env loader: KEY=VALUE lines only (no command execution).
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%$'\r'}"
    [[ -z "$line" ]] && continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]] || continue

    local key="${BASH_REMATCH[1]}"
    local val="${BASH_REMATCH[2]}"
    val="${val#"${val%%[![:space:]]*}"}"
    val="${val%"${val##*[![:space:]]}"}"

    # Strip matching single/double quotes.
    if [[ "$val" =~ ^\".*\"$ ]]; then
      val="${val:1:${#val}-2}"
    elif [[ "$val" =~ ^\'.*\'$ ]]; then
      val="${val:1:${#val}-2}"
    fi

    export "$key=$val"
  done <"$env_file"
}

load_dotenv "$ROOT/.env"

: "${HOST:=0.0.0.0}"
: "${PORT:=80}"
: "${DATA_DIR:=$ROOT/data}"

# LLM defaults for your VPS ollama serve.
: "${MC_LLM_PROVIDER:=ollama}"
: "${OLLAMA_BASE_URL:=http://127.0.0.1:11434}"
: "${OLLAMA_MODEL:=llama3.2:3b-instruct-q4_K_M}"
: "${OLLAMA_TIMEOUT_MS:=30000}"

node -e 'process.exit(Number(process.versions.node.split(".")[0])>=18?0:1)' || {
  echo "ERROR: Node 18+ is required (current: $(node -v))" >&2
  exit 1
}

echo "Starting MindCircle server..."
echo "  HOST=$HOST"
echo "  PORT=$PORT"
echo "  DATA_DIR=$DATA_DIR"
echo "  MC_LLM_PROVIDER=$MC_LLM_PROVIDER"
echo "  OLLAMA_BASE_URL=$OLLAMA_BASE_URL"
echo "  OLLAMA_MODEL=$OLLAMA_MODEL"
echo "  OLLAMA_TIMEOUT_MS=$OLLAMA_TIMEOUT_MS"

exec node server/index.mjs

