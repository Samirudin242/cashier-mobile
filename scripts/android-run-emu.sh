#!/usr/bin/env bash
# Expo `run:android --device` expects the AVD name (e.g. Pixel_8_Pro_API_35),
# not the adb serial (e.g. emulator-5554). Resolve via `adb emu avd name`.
#
# Extra args are passed to expo (e.g. --no-bundler when Metro is already running).
set -euo pipefail
SERIAL="${1:-}"
if [[ -z "$SERIAL" ]]; then
  echo "Usage: $0 <adb-serial> [expo run:android options...]" >&2
  echo "Example: $0 emulator-5554 --no-bundler" >&2
  exit 1
fi
shift

if ! NAME="$(adb -s "$SERIAL" emu avd name 2>/dev/null | head -n1 | tr -d '\r' | sed 's/[[:space:]]*$//')"; then
  echo "adb failed for $SERIAL" >&2
  exit 1
fi

if [[ -z "$NAME" ]]; then
  echo "Could not get AVD name for $SERIAL. Is the emulator booted?" >&2
  exit 1
fi

exec npx expo run:android --device "$NAME" "$@"
