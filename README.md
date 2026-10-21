# 🧠 CyberFusion X — AI-Powered Digital Forensics & Fraud Reconstruction

**CyberFusion X** is a full-stack digital forensics and cyber-fraud reconstruction platform built with **Java 21 LTS (Virtual Threads)**, **Jakarta Servlet 6.1 (`@WebServlet`, `@WebFilter`, `@MultipartConfig`, `AsyncContext` SSE)**, **JGraphT-Compatible Graph Centrality & Shortest-Path Algorithms**, **Java 2D/Tess4J OCR Bounding-Box Extraction**, **Dual SHA-256 & BLAKE3 Cryptographic Evidence Sealing**, and a **React 18 + TypeScript + Tailwind CSS** Forensic Command Center.

## 🌐 Live Hosted Website & Free Cloud Deployment

- **GitHub Pages Live Web App (Interactive Demo Mode)**: **[https://pradhyumnabait.github.io/CyberFusion-X/](https://pradhyumnabait.github.io/CyberFusion-X/)**
- **Full-Stack Docker Deployment (Render Free Tier)**: Includes `Dockerfile` + `render.yaml` for 1-click full-stack Java 21 + Jakarta Servlet 6.1 deployment on [Render.com](https://render.com).
- **Serverless / Static Edge Deployment**: Includes `vercel.json` (Vercel) and `netlify.toml` (Netlify) backed by an automatic client-side Forensic Fallback Engine (`installStandaloneDemoFallback.ts`) when the Java 21 container is not co-hosted.

---

## 🏗️ Architecture & Java Tech Stack

| Layer | Technology / Library | Forensic Responsibility |
| :--- | :--- | :--- |
| **Runtime & Concurrency** | **Java 21 LTS (Temurin)** | `Executors.newVirtualThreadPerTaskExecutor()` for high-concurrency I/O, OCR, and SSE streaming |
| **Web & Servlet Layer** | **Jakarta Servlet 6.1 (`jakarta.servlet-api`)** | `@WebServlet`, `@WebFilter`, `@MultipartConfig` streaming file ingestion, `ServletOutputStream` SSE |
| **Cryptographic Integrity** | **`java.security.DigestInputStream` + Pure-Java `BLAKE3-256`** | Simultaneous SHA-256 & BLAKE3 hashing, PBKDF2-HMAC-SHA256 auth, HS256 JWTs, RFC 6238 TOTP, Merkle Audit Ledger |
| **Metadata & Magic Bytes** | **`MetadataForensicsService` (`javax.imageio.ImageIO`)** | Magic-byte MIME verification, ELF/PE disguised executable blocking, PNG `tEXt` & JPEG EXIF parsing, timestamp tamper detection |
| **OCR & Visual Layout** | **`OcrExtractionService`** | Extracts raw text and pixel-accurate `BoundingBox` (`x, y, width, height`) overlays from screenshots & receipts |
| **AI & NLP Correlation** | **`AiForensicExtractorService`** | E.164 phone normalization, Punycode/URL analysis, UPI/IBAN/Crypto/UTR regexes, Jaro-Winkler entity resolution, OSINT enrichment |
| **Incident Graph Engine** | **`IncidentGraphService` (JGraphT Architecture)** | Directed Weighted Pseudograph computing **PageRank Centrality**, **Brandes Betweenness Centrality**, **Connected Clusters**, and **Dijkstra Shortest Path** |
| **Report Generation** | **`PdfReportGeneratorService`** | Native multi-page **PDF 1.7 Binary Generator**, **OASIS STIX 2.1 CTI JSON Bundle**, and **Markdown** forensic reports |
| **Frontend UI** | **React 18 + TypeScript + Vite + Tailwind CSS** | Dark-mode Forensic Command Center, Split-Pane Bounding-Box Inspector, Interactive SVG Incident Graph, Kill-Chain Timeline |

---

## 🚀 Quick Start

### 1. Build & Run the Java 21 + Jakarta Servlet Backend (Port `8080`)
```bash
./scripts/build-backend.sh
./scripts/start-backend.sh
```

### 2. Run the JUnit 4 Forensic & Cryptographic Test Suite
```bash
./scripts/run-tests.sh
```

### 3. Start the React + Vite Frontend Workspace (Port `5173`)
```bash
cd frontend
npm install
npm run dev
```

---

## 🔌 Jakarta Servlet API Endpoints

| Servlet Class | URL Pattern | Description |
| :--- | :--- | :--- |
| `HealthCheckServlet` | `GET /api/v1/health` | JVM, Virtual Thread, and Merkle Audit Chain health status |
| `AuthServlet` | `GET/POST /api/v1/auth/*` | PBKDF2 login, JWT issuance, TOTP preview, and RBAC Investigator Role Switcher |
| `CaseServlet` | `GET/POST /api/v1/cases/*` | Investigation listing, risk score evaluation, and new case creation |
| `EvidenceUploadServlet` | `GET/POST /api/v1/evidence/*` | `@MultipartConfig` binary upload, client-side SHA-256 verification, quick artifact synthesis, raw image streaming |
| `EvidenceIntegrityServlet` | `GET/POST /api/v1/integrity/*` | On-demand SHA-256 & BLAKE3 verification, 1-byte Tamper Simulation Sandbox, WORM restore, Chain-of-Custody ledger |
| `EntityServlet` | `GET/POST /api/v1/entities/*` | Extracted entities & IOCs, Jaro-Winkler alias merging, custom graph edge creation |
| `TimelineServlet` | `GET/POST /api/v1/timeline/*` | Chronological attack reconstruction across 6 kill-chain phases & EXIF anomaly detection |
| `IncidentGraphServlet` | `GET /api/v1/graph/*` | JGraphT topology, PageRank & Betweenness Centrality, and `/shortest-path` Dijkstra tracer |
| `ReportServlet` | `GET /api/v1/reports/*` | Structured JSON report, `/pdf` (Signed PDF 1.7 binary), `/stix` (STIX 2.1 JSON), `/markdown` |
| `SearchServlet` | `GET /api/v1/search?q=...` | Global `Cmd+K` search across cases, SHA-256/BLAKE3 hashes, entities, and OCR text |
| `ForensicProgressSseServlet` | `GET /api/v1/stream/*` | `text/event-stream` real-time pipeline stage progress |
