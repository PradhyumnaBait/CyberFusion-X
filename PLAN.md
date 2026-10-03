# 🧠 CyberFusion X — Implementation Plan (Java 21 + Jakarta Servlets + React)

**Platform:** CyberFusion X — AI-Powered Digital Forensics & Fraud Reconstruction  
**Stack:** Java 21 LTS (Virtual Threads), Jakarta Servlet 6.1 (`@WebServlet`, `@WebFilter`, `@MultipartConfig`, `AsyncContext` SSE), Google Gson, Guava, Apache Commons Codec/Lang3, SLF4J/Logback, JUnit 4, SQL/ACID Persistence + React 18 (TypeScript, Vite, Tailwind CSS, Lucide Icons, Interactive Canvas Graph).

---

## Phase 1: Setup (Scaffolding, Servlet Container & Infrastructure)
* **Deliverables:**
  * Maven `pom.xml` & standalone JDK 21 compilation pipeline (`scripts/build-backend.sh`).
  * `docker-compose.yml` for PostgreSQL 16 and MinIO S3-compatible object storage.
  * Embedded Java 21 Virtual-Thread Jakarta Servlet 6.1 Container (`JakartaServletContainer.java`).
  * `HealthCheckServlet` (`GET /api/v1/health`) & React + Vite + TypeScript frontend workspace with `/api` proxy.

## Phase 2: Authentication (Identity, RBAC & Chain-of-Custody Filters)
* **Deliverables:**
  * `AuthServlet` (`/api/v1/auth/*`) with PBKDF2-HMAC-SHA256 password hashing, HMAC-SHA256 JWT tokens, and RFC 6238 TOTP MFA support.
  * `AuthenticationFilter` and `RbacAuthorizationFilter` (`@WebFilter`) enforcing `LEAD_INVESTIGATOR`, `FORENSIC_ANALYST`, and `AUDITOR` roles.
  * `ChainOfCustodyAuditFilter` (`@WebFilter`) recording every forensic operation into a SHA-256 hash-chained audit ledger with SLF4J MDC correlation.

## Phase 3: Database (SQL Migrations, Repositories & Immutable Evidence Vault)
* **Deliverables:**
  * Flyway SQL migration scripts (`V1__init_schema.sql`, `V2__indexes_and_audit.sql`).
  * Persistent ACID data engine (`ForensicDataStore`) and domain repositories (`UserRepository`, `CaseRepository`, `EvidenceRepository`, `EntityGraphRepository`, `TimelineRepository`, `AuditLedgerRepository`).
  * Streaming binary `EvidenceVaultStorageService` storing raw evidence artifacts on disk/bucket with atomic writes.

## Phase 4: Core UI (Dark-Mode Forensic Command Center & Split-Pane Inspector)
* **Deliverables:**
  * Dark-slate Forensic Command Center layout with Case Switcher, Role Badge, Integrity Status Bar, and `Cmd+K` Global Forensic Search.
  * Investigations Dashboard with Risk Gauges, Case Creation Modal, and One-Click Demo Investigation Loader.
  * Multi-Modal Evidence Vault with Drag-and-Drop File Upload (client-side Web Crypto SHA-256 pre-hashing), Quick Artifact Input (Phone/URL/SMS/Transaction), and Split-Pane Evidence Inspector with OCR Bounding-Box Overlays.

## Phase 5: Main Features (Cryptographic Hashing, Entity Correlation, Timeline, Graph & PDF Report)
* **Deliverables:**
  * `CryptographicHashService` + `EvidenceIntegrityServlet`: Streaming SHA-256 & BLAKE3 hashing, on-demand integrity verification certificates, and interactive 1-byte Tamper Simulation & Recovery mode.
  * `EntityCorrelationService` + `EntityServlet`: E.164 phone normalization, URL/Punycode canonicalization, Jaro-Winkler fuzzy matching, cross-evidence correlation, manual entity merge, and custom relationship creation.
  * `TimelineReconstructionService` + `TimelineServlet`: Chronological attack timeline across 6 cyber-fraud kill-chain phases with EXIF-vs-OCR timestamp anomaly detection.
  * `IncidentGraphService` + `IncidentGraphServlet`: Directed Weighted Pseudograph with **PageRank Centrality**, **Betweenness Centrality**, **Dijkstra Shortest-Path Finder**, and **Connected Fraud Cluster Detection**, rendered in an interactive Force-Directed & Hierarchical React Graph Canvas.
  * `RiskScoringService` + `PdfReportGeneratorService` + `ReportServlet`: Explainable 0–100 Risk Score engine and native PDF 1.7 binary report generator, STIX 2.1 JSON export, and Markdown report export.

## Phase 6: Integrations (OCR Bounding Boxes, EXIF/Magic-Byte Forensics, AI Extraction & SSE)
* **Deliverables:**
  * `MetadataForensicsService`: Magic-byte MIME verification, PNG/JPEG/PDF header & EXIF parser, and editing software/timestamp discrepancy detector.
  * `OcrExtractionService`: Java `BufferedImage` visual processor + OCR text and pixel bounding-box (`x, y, width, height`) extractor.
  * `AiForensicExtractorService`: Hybrid regex + contextual NLP/AI extraction for people, phones, URLs, bank/UPI accounts, crypto wallets, transactions, messages, and fraud tactics, plus OSINT threat enrichment.
  * `ForensicProgressSseServlet`: Jakarta Servlet `AsyncContext` (`text/event-stream`) pushing live pipeline stage updates to the UI.

## Phase 7: Testing (JUnit 4 Test Suite & Tamper Simulation Tests)
* **Deliverables:**
  * Automated JUnit test suite (`CyberFusionForensicTestSuite`) testing SHA-256/BLAKE3 cryptographic vectors, entity normalization & Jaro-Winkler similarity, PageRank & Dijkstra shortest-path graph algorithms, hash-chained audit ledger tamper detection, and PDF binary generation.

## Phase 8: Deployment (Dockerization, Security Filters & Observability)
* **Deliverables:**
  * Multi-stage `Dockerfile` and `docker-compose.yml`.
  * `SecurityHeadersFilter` (`Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`) and magic-byte upload guard.
  * Structured SLF4J/Logback logging with request trace IDs.

## Phase 9: Final Polish (Pre-Loaded Fraud Investigations, Tri-View Sync & Documentation)
* **Deliverables:**
  * `SampleCaseSeeder` generating two complete, realistic cyber-fraud investigations (*Operation Phantom UPI & Mule Network* and *Executive BEC Wire Intercept*) with real rendered PNG screenshot artifacts in the vault.
  * Synchronized Evidence $\leftrightarrow$ Timeline $\leftrightarrow$ Incident Graph navigation.
  * Comprehensive `README.md` with architecture diagrams, API documentation, and verification guide.
