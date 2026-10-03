#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

./scripts/build-backend.sh

VENDOR_LIB="$ROOT_DIR/vendor/lib"
CLASSPATH="classes/main:classes/test:$VENDOR_LIB/jakarta.servlet-api.jar:$VENDOR_LIB/gson.jar:$VENDOR_LIB/guava.jar:$VENDOR_LIB/commons-codec.jar:$VENDOR_LIB/commons-lang3.jar:$VENDOR_LIB/slf4j-api.jar:$VENDOR_LIB/logback-classic.jar:$VENDOR_LIB/logback-core.jar:$VENDOR_LIB/jsoup.jar:$VENDOR_LIB/junit.jar:$VENDOR_LIB/hamcrest.jar"

echo "[CyberFusion X] Running JUnit 4 Forensic Test Suite..."
java -Djava.awt.headless=true -cp "$CLASSPATH" org.junit.runner.JUnitCore com.cyberfusionx.CyberFusionForensicTestSuite
