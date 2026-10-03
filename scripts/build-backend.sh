#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

chmod +x ./scripts/ensure-toolchain.sh
./scripts/ensure-toolchain.sh

VENDOR_LIB="$ROOT_DIR/vendor/lib"
mkdir -p classes/main classes/test
cp -r backend/src/main/resources/* classes/main/ 2>/dev/null || true

CLASSPATH="$VENDOR_LIB/jakarta.servlet-api.jar:$VENDOR_LIB/gson.jar:$VENDOR_LIB/guava.jar:$VENDOR_LIB/commons-codec.jar:$VENDOR_LIB/commons-lang3.jar:$VENDOR_LIB/slf4j-api.jar:$VENDOR_LIB/logback-classic.jar:$VENDOR_LIB/logback-core.jar:$VENDOR_LIB/jsoup.jar"

echo "[CyberFusion X] Compiling Java 21 Jakarta Servlet Backend..."
find backend/src/main/java -name "*.java" > classes/main-sources.txt
javac -cp "$CLASSPATH" -d classes/main @classes/main-sources.txt

echo "[CyberFusion X] Compiling JUnit Test Suite..."
find backend/src/test/java -name "*.java" > classes/test-sources.txt
javac -cp "classes/main:$CLASSPATH:$VENDOR_LIB/junit.jar:$VENDOR_LIB/hamcrest.jar" -d classes/test @classes/test-sources.txt

echo "[CyberFusion X] Java 21 Backend & Tests compiled successfully into classes/main."
