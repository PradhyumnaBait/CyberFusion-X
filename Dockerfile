FROM eclipse-temurin:21-jdk-jammy AS builder
WORKDIR /build
COPY backend ./backend
COPY scripts ./scripts
RUN chmod +x ./scripts/build-backend.sh && ./scripts/build-backend.sh

FROM eclipse-temurin:21-jre-jammy
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /build/build/classes ./build/classes
COPY --from=builder /usr/local/share/java /usr/local/share/java
EXPOSE 8080
CMD ["java", "-XX:+UseZGC", "-cp", "build/classes:/usr/local/share/java/*", "com.cyberfusionx.CyberFusionXApplication"]
