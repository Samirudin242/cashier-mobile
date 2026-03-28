#!/usr/bin/env bash
# One Metro bundler + three dev clients = all emulators get Fast Refresh on code changes.
# Usage: start three emulators first, then: npm run android:all
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

METRO_PORT="${RCT_METRO_PORT:-8081}"
METRO_STATUS_URL="http://127.0.0.1:${METRO_PORT}/status"

metro_up() {
  curl -sf "$METRO_STATUS_URL" >/dev/null 2>&1
}

STARTED_METRO=0
METRO_PID=""

cleanup() {
  if [[ "$STARTED_METRO" -eq 1 ]] && [[ -n "${METRO_PID:-}" ]] && kill -0 "$METRO_PID" 2>/dev/null; then
    echo ""
    echo "Stopping Metro (PID $METRO_PID)..."
    kill "$METRO_PID" 2>/dev/null || true
    wait "$METRO_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

if ! metro_up; then
  echo "Starting Metro on port $METRO_PORT (shared by all emulators)..."
  # --localhost: emulators reach the host packager via 10.0.2.2
  npx expo start --localhost --port "$METRO_PORT" &
  METRO_PID=$!
  STARTED_METRO=1
  echo "Waiting for Metro..."
  for _ in $(seq 1 120); do
    metro_up && break
    sleep 0.5
  done
  if ! metro_up; then
    echo "Metro did not become ready on port $METRO_PORT." >&2
    exit 1
  fi
  echo "Metro ready."
else
  echo "Reusing Metro already on port $METRO_PORT."
fi

EMULATOR_SERIALS=(emulator-5554 emulator-5556 emulator-5558)
for serial in "${EMULATOR_SERIALS[@]}"; do
  echo ""
  echo ">>> expo run:android --no-bundler ($serial)"
  bash scripts/android-run-emu.sh "$serial" --no-bundler
done

echo ""
echo "All targets updated. Edit JS/TS — Fast Refresh should update every open app using this Metro."

if [[ "$STARTED_METRO" -eq 1 ]]; then
  echo "Metro is running in the background (PID $METRO_PID). Press Ctrl+C to stop Metro and exit."
  wait "$METRO_PID"
fi
