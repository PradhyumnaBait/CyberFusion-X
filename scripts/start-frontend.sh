#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Start Java 21 Jakarta Servlet 6.1 backend on :8080 in the background if not already running
if ! ss -tln 2>/dev/null | grep -q ":8080 "; then
  chmod +x "$ROOT_DIR/scripts/start-backend.sh"
  nohup "$ROOT_DIR/scripts/start-backend.sh" >/tmp/cyberfusionx-backend.log 2>&1 &
fi

# Immediately bind 0.0.0.0:5173 (<50ms) and proxy /api/* to 127.0.0.1:8080
exec node "$ROOT_DIR/scripts/preview-gateway.mjs"
