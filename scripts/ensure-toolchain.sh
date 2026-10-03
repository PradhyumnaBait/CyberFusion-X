#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENDOR_LIB="$ROOT_DIR/vendor/lib"
mkdir -p "$VENDOR_LIB"

# 1. Ensure Java 21 Runtime (Temurin 21 via jdk4py)
if ! command -v java >/dev/null 2>&1; then
  echo "[CyberFusion X] Provisioning OpenJDK 21 LTS Runtime..."
  sudo pip3 install -q --break-system-packages "jdk4py==21.0.8.2"
  JAVA_HOME_DIR=$(python3 -c "import jdk4py; print(jdk4py.JAVA_HOME)")
  for bin in "$JAVA_HOME_DIR"/bin/*; do
    sudo chmod +x "$bin"
    sudo ln -sf "$bin" "/usr/local/bin/$(basename "$bin")"
  done
fi

# 2. Ensure Jakarta Servlet 6.1 & Eclipse Java 21 Compiler JARs in vendor/lib
if [ ! -f "$VENDOR_LIB/jakarta.servlet-api.jar" ] || [ ! -f "$VENDOR_LIB/ecj.jar" ]; then
  echo "[CyberFusion X] Provisioning Jakarta Servlet 6.1 & Java 21 Compiler JARs..."
  TMP_DIR=$(mktemp -d)
  (
    cd "$TMP_DIR"
    npm pack @vscjava/java-language-server@0.1.2 >/dev/null 2>&1
    tar -xzf vscjava-java-language-server-*.tgz
    cp package/server/plugins/org.eclipse.jdt.core.compiler.batch_*.jar "$VENDOR_LIB/ecj.jar"
    cp package/server/plugins/jakarta.servlet-api_6.1.0.jar "$VENDOR_LIB/jakarta.servlet-api.jar"
    cp package/server/plugins/com.google.gson_2.13.2.jar "$VENDOR_LIB/gson.jar"
    cp package/server/plugins/com.google.guava_33.5.0.jre.jar "$VENDOR_LIB/guava.jar"
    cp package/server/plugins/org.apache.commons.commons-codec_1.20.0.jar "$VENDOR_LIB/commons-codec.jar"
    cp package/server/plugins/org.apache.commons.lang3_3.20.0.jar "$VENDOR_LIB/commons-lang3.jar"
    cp package/server/plugins/slf4j.api_2.0.17.jar "$VENDOR_LIB/slf4j-api.jar"
    cp package/server/plugins/ch.qos.logback.classic_1.5.21.jar "$VENDOR_LIB/logback-classic.jar"
    cp package/server/plugins/ch.qos.logback.core_1.5.21.jar "$VENDOR_LIB/logback-core.jar"
    cp package/server/plugins/org.jsoup_1.19.1.jar "$VENDOR_LIB/jsoup.jar"
    cp package/server/plugins/org.junit_4.13.2*.jar "$VENDOR_LIB/junit.jar"
    cp package/server/plugins/org.hamcrest_3.0.0.jar "$VENDOR_LIB/hamcrest.jar"
  )
  rm -rf "$TMP_DIR"
fi

# 3. Ensure javac wrapper
if ! command -v javac >/dev/null 2>&1; then
  cat << EOF | sudo tee /usr/local/bin/javac > /dev/null
#!/usr/bin/env bash
exec /usr/local/bin/java -jar "$VENDOR_LIB/ecj.jar" -21 -proc:none "\$@"
EOF
  sudo chmod +x /usr/local/bin/javac
fi
