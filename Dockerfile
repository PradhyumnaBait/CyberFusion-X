# --- Build Java backend with Maven (pom.xml is the dependency source of truth) ---
FROM maven:3.9-eclipse-temurin-21 AS backend-build
WORKDIR /build
COPY pom.xml ./
COPY backend ./backend
RUN mvn -q -DskipTests compile dependency:copy-dependencies -DoutputDirectory=/app/lib \
    && mkdir -p /app/classes && cp -r target/classes/* /app/classes/

# --- Build React frontend ---
FROM node:20-alpine AS frontend-build
WORKDIR /fe
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend ./
RUN npm run build

# --- Runtime: JRE 21 + Tesseract OCR (English + Hindi + Marathi) ---
FROM eclipse-temurin:21-jre-jammy
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr tesseract-ocr-eng tesseract-ocr-hin tesseract-ocr-mar \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=backend-build /app/classes ./classes
COPY --from=backend-build /app/lib ./lib
COPY --from=frontend-build /fe/public-spa ./frontend/public-spa
ENV PORT=8080 HOST=0.0.0.0 DATA_DIR=/app/data
EXPOSE 8080
CMD ["java", "-Djava.awt.headless=true", "-cp", "classes:lib/*", "com.cyberfusionx.CyberFusionXApplication"]
