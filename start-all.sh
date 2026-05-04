#!/usr/bin/env bash
set -u

PROJECT_DIR="/home/demonstrator/dmb"
BOOT_LOG_DIR="$PROJECT_DIR/boot_log"
BOOT_LOG="$BOOT_LOG_DIR/boot.log"

if [[ "${RUN_LOGGED:-0}" == "1" ]]; then
  mkdir -p "$BOOT_LOG_DIR"
  exec &> "$BOOT_LOG"
  echo "Boot launch started at $(date)"
else
  echo "Manual launch started at $(date) (no log file)"
fi

export DISPLAY=:0

cd "$PROJECT_DIR" || exit 1

echo "Activating Python virtual environment..."
source "$PROJECT_DIR/venv/bin/activate"

echo "Cleaning old backend/frontend processes if any..."
pkill -f "uvicorn src.api.main:app" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "node.*vite" 2>/dev/null || true

fuser -k 5173/tcp 2>/dev/null || true
fuser -k 8080/tcp 2>/dev/null || true

sleep 2

echo "Starting FastAPI backend..."
uvicorn src.api.main:app --host 0.0.0.0 --port 8080 &

BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

echo "Starting Vite frontend..."
cd "$PROJECT_DIR/frontend" || exit 1
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort &

FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

echo "Waiting for backend to become available at http://localhost:8080 ..."
until curl -s http://localhost:8080 > /dev/null; do
  echo "… backend not up yet, retrying..."
  sleep 1
done
echo "Backend is now reachable."

echo "Waiting for frontend to become available at http://localhost:5173 ..."
until curl -s http://localhost:5173 > /dev/null; do
  echo "… frontend not up yet, retrying..."
  sleep 1
done
echo "Frontend is now reachable."

echo "Triggering PM5 wake via Shelly..."
"$PROJECT_DIR/venv/bin/python" "$PROJECT_DIR/scripts/shelly_wake_pm5.py"
SHELLY_WAKE_EXIT=$?

if [[ "$SHELLY_WAKE_EXIT" -ne 0 ]]; then
  echo "WARNING: Shelly PM5 wake failed with exit code $SHELLY_WAKE_EXIT."
  echo "Continuing backend/frontend startup anyway."
else
  echo "Shelly PM5 wake sequence completed."
fi

echo "SKIP_CHROMIUM=${SKIP_CHROMIUM:-0}"

if [[ "${SKIP_CHROMIUM:-0}" == "1" ]]; then
  echo "SKIP_CHROMIUM=1 set → not launching browser here."
else
  echo "Launching Chromium browser in kiosk mode..."
  chromium-browser --kiosk http://localhost:5173 \
    --disable-background-networking \
    --disable-component-update \
    --disable-default-apps \
    --noerrdialogs \
    --no-first-run \
    --disable-infobars \
    --start-fullscreen \
    >/dev/null 2>&1 &
fi

echo "Backend and frontend startup completed."
echo "Keeping service alive and monitoring backend/frontend..."

cleanup() {
  echo "Stopping backend/frontend..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  pkill -f "uvicorn src.api.main:app" 2>/dev/null || true
  pkill -f "npm run dev" 2>/dev/null || true
  pkill -f "vite" 2>/dev/null || true
  pkill -f "node.*vite" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

while true; do
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "Backend process stopped unexpectedly."
    exit 1
  fi

  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo "Frontend process stopped unexpectedly."
    exit 1
  fi

  sleep 5
done