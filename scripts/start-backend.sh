#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Prevent duplicate concurrent launches on port 8080
if ss -tln 2>/dev/null | grep -q ":8080 "; then
  echo "[CyberFusion X] Port 8080 is already active."
  exit 0
fi

chmod +x ./scripts/ensure-toolchain.sh
./scripts/ensure-toolchain.sh

if [ ! -d "classes/main/com/cyberfusionx" ]; then
  ./scripts/build-backend.sh
fi

VENDOR_LIB="$ROOT_DIR/vendor/lib"
CLASSPATH="classes/main:$VENDOR_LIB/jakarta.servlet-api.jar:$VENDOR_LIB/gson.jar:$VENDOR_LIB/guava.jar:$VENDOR_LIB/commons-codec.jar:$VENDOR_LIB/commons-lang3.jar:$VENDOR_LIB/slf4j-api.jar:$VENDOR_LIB/logback-classic.jar:$VENDOR_LIB/logback-core.jar:$VENDOR_LIB/jsoup.jar"

exec java -Djava.awt.headless=true -cp "$CLASSPATH" com.cyberfusionx.CyberFusionXApplication
