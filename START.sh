#!/usr/bin/env bash
#
# START.sh — launch the DevOps Academy API (server/index.js)
#
# Starts the Express API as a detached background process, writing output to
# server.log and the process id to devops-api.pid.
#
set -e

# Always operate from the directory that contains this script.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ---------------------------------------------------------------------------
# Environment defaults (only set when not already provided)
# ---------------------------------------------------------------------------
export SSL_ENABLED="${SSL_ENABLED:-true}"
export SSL_CERT_PATH="${SSL_CERT_PATH:-/home/arx-app/backends/certs/certificate.crt}"
export SSL_KEY_PATH="${SSL_KEY_PATH:-/home/arx-app/backends/certs/private.key}"
export PORT="${PORT:-4115}"
export NODE_ENV="${NODE_ENV:-production}"

# Load a local .env file if present (without clobbering exported values).
if [ -f "$SCRIPT_DIR/.env" ]; then
  echo "[START] Loading environment from .env"
  set -a
  # shellcheck disable=SC1090
  . "$SCRIPT_DIR/.env"
  set +a
  export SSL_ENABLED SSL_CERT_PATH SSL_KEY_PATH PORT NODE_ENV
fi

# ---------------------------------------------------------------------------
# Sanity checks
# ---------------------------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  echo "[START] ERROR: node is not installed or not on PATH." >&2
  exit 1
fi

if [ ! -f "$SCRIPT_DIR/server/index.js" ]; then
  echo "[START] ERROR: server/index.js not found in $SCRIPT_DIR" >&2
  exit 1
fi

if [ "$SSL_ENABLED" = "true" ]; then
  if [ ! -f "$SSL_CERT_PATH" ] || [ ! -f "$SSL_KEY_PATH" ]; then
    echo "[START] WARNING: TLS enabled but certificate or key missing:"
    echo "        cert: $SSL_CERT_PATH"
    echo "        key : $SSL_KEY_PATH"
    echo "        The API may fail to start until these exist."
  fi
fi

# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
  echo "[START] node_modules missing — installing production dependencies..."
  npm install --omit=dev
fi

# ---------------------------------------------------------------------------
# Stop any previous instance recorded in the pid file
# ---------------------------------------------------------------------------
PID_FILE="$SCRIPT_DIR/devops-api.pid"
if [ -f "$PID_FILE" ]; then
  OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" >/dev/null 2>&1; then
    echo "[START] Stopping previous instance (PID $OLD_PID)..."
    kill "$OLD_PID" >/dev/null 2>&1 || true
    sleep 1
  fi
  rm -f "$PID_FILE"
fi

# ---------------------------------------------------------------------------
# Launch
# ---------------------------------------------------------------------------
echo "[START] Launching DevOps Academy API on port $PORT (SSL_ENABLED=$SSL_ENABLED)..."
nohup node server/index.js > server.log 2>&1 &
API_PID=$!
echo "$API_PID" > "$PID_FILE"

sleep 1
if kill -0 "$API_PID" >/dev/null 2>&1; then
  echo "[START] API running with PID $API_PID (written to $PID_FILE)"
  echo "[START] Logs: $SCRIPT_DIR/server.log"
else
  echo "[START] ERROR: API failed to start. Last log lines:" >&2
  tail -n 30 "$SCRIPT_DIR/server.log" >&2 || true
  rm -f "$PID_FILE"
  exit 1
fi