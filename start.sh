#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT="${PORT:-${BACKEND_PORT:-}}"
FRONTEND_PORT="${FRONTEND_PORT:-${CLIENT_PORT:-}}"
INSTALL=false
DEMO_RESET=false
MIGRATE=false

for argument in "$@"; do
  case "$argument" in
    --install) INSTALL=true ;;
    --migrate) MIGRATE=true ;;
    --demo-reset) DEMO_RESET=true ;;
    *) echo "Unknown option: $argument" >&2; exit 2 ;;
  esac
done

[[ "$BACKEND_PORT" =~ ^[0-9]+$ ]] || { echo "PORT or BACKEND_PORT must be an assigned numeric port." >&2; exit 2; }
[[ "$FRONTEND_PORT" =~ ^[0-9]+$ ]] || { echo "FRONTEND_PORT or CLIENT_PORT must be an assigned numeric port." >&2; exit 2; }
[[ "$BACKEND_PORT" != "$FRONTEND_PORT" ]] || { echo "Backend and frontend ports must be different." >&2; exit 2; }

for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
  if lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is already in use; no process was stopped." >&2
    exit 1
  fi
done

export PORT="$BACKEND_PORT"
export BACKEND_PORT FRONTEND_PORT
export CORS_ORIGINS="${CORS_ORIGINS:-http://127.0.0.1:$FRONTEND_PORT}"
if [[ "${NODE_ENV:-development}" != production ]]; then
  export AUDIT_CHAIN_KEY="${AUDIT_CHAIN_KEY:-${SESSION_SECRET:-}}"
  export TELEMETRY_SECRETS_KEY="${TELEMETRY_SECRETS_KEY:-${MEMORY_ENCRYPTION_KEY_BASE64:-}}"
fi

if "$INSTALL"; then
  (cd "$PROJECT_DIR/backend" && npm ci)
  (cd "$PROJECT_DIR/frontend" && npm ci)
elif [[ ! -d "$PROJECT_DIR/backend/node_modules" || ! -d "$PROJECT_DIR/frontend/node_modules" ]]; then
  echo "Dependencies are missing. Re-run with --install." >&2
  exit 1
fi

if "$DEMO_RESET"; then
  echo "Resetting the explicitly configured local demo database. Existing demo data will be deleted."
  (cd "$PROJECT_DIR/backend" && ALLOW_DEMO_RESET=true node reset-demo.js)
elif "$MIGRATE"; then
  (cd "$PROJECT_DIR/backend" && node migrate.js)
else
  echo "Database migrations were not run; use --migrate only after reviewing the isolated target."
fi

if [[ "${BOOTSTRAP_ACKNOWLEDGEMENT:-}" == "create-initial-admin" ]]; then
  (cd "$PROJECT_DIR/backend" && npm run create-admin)
fi

(cd "$PROJECT_DIR/backend" && node server.js) &
BACKEND_PID=$!
(cd "$PROJECT_DIR/frontend" && npm run dev -- --host 127.0.0.1 --port "$FRONTEND_PORT") &
FRONTEND_PID=$!

cleanup() {
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "SwarmShield is starting at http://127.0.0.1:$FRONTEND_PORT"
wait "$BACKEND_PID" "$FRONTEND_PID"
