#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/apps/audit-agent-frontend"
BACKEND_DIR="$ROOT_DIR/apps/backend-node"

FRONTEND_CMD="${FRONTEND_CMD:-npm run dev}"
BACKEND_CMD="${BACKEND_CMD:-npm run dev}"

if ! command -v npm >/dev/null 2>&1; then
  echo "[dev_stack] npm is required but not found in PATH."
  exit 1
fi

if [ ! -d "$FRONTEND_DIR" ] || [ ! -d "$BACKEND_DIR" ]; then
  echo "[dev_stack] Expected app directories not found."
  echo "  frontend: $FRONTEND_DIR"
  echo "  backend : $BACKEND_DIR"
  exit 1
fi

FRONTEND_PID=""
BACKEND_PID=""

cleanup() {
  echo
  echo "[dev_stack] Shutting down..."
  if [ -n "${FRONTEND_PID}" ] && kill -0 "${FRONTEND_PID}" >/dev/null 2>&1; then
    kill "${FRONTEND_PID}" >/dev/null 2>&1 || true
  fi
  if [ -n "${BACKEND_PID}" ] && kill -0 "${BACKEND_PID}" >/dev/null 2>&1; then
    kill "${BACKEND_PID}" >/dev/null 2>&1 || true
  fi
  wait >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM

echo "[dev_stack] Starting backend in $BACKEND_DIR"
(
  cd "$BACKEND_DIR"
  exec $BACKEND_CMD
) &
BACKEND_PID=$!

echo "[dev_stack] Starting frontend in $FRONTEND_DIR"
(
  cd "$FRONTEND_DIR"
  exec $FRONTEND_CMD
) &
FRONTEND_PID=$!

echo "[dev_stack] Running."
echo "  backend pid : $BACKEND_PID"
echo "  frontend pid: $FRONTEND_PID"
echo "[dev_stack] Press Ctrl+C to stop both."

# Portable replacement for `wait -n` (not available in macOS bash 3.x).
EXIT_CODE=0
while true; do
  if ! kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
    wait "$BACKEND_PID" || EXIT_CODE=$?
    break
  fi
  if ! kill -0 "$FRONTEND_PID" >/dev/null 2>&1; then
    wait "$FRONTEND_PID" || EXIT_CODE=$?
    break
  fi
  sleep 1
done

echo "[dev_stack] One process exited (code $EXIT_CODE). Stopping the other."
exit "$EXIT_CODE"
