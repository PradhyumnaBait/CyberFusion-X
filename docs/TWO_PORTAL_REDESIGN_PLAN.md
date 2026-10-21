# CyberFusion X — Two-Portal Redesign Plan

> **Status:** Plan for approval — no code changes yet.
> **Date:** 21 October 2026 · **Basis:** Full audit of the current codebase (commit `b378ea2`) against the new
> citizen + officer product vision. **Developer:** Individual project · **Jurisdiction:** India, Maharashtra.
>
> **One-line product statement (keep this on the wall):**
> *Citizen gives minimum input → system does maximum work → officer gets a ready-to-act case.*

---

## 0. Executive decision — evolve, do not rewrite

The existing codebase already has a working **officer-only vertical slice**
(upload → hash → extract → entities → graph → timeline → risk → report → custody ledger).
For an individual project, the highest-risk move would be a rewrite to Spring Boot + PostgreSQL + Neo4j + MinIO + Redis.
**We will not do that.** We keep what demonstrably works, remove what is fake or clutter, and add the citizen portal + automation in thin slices so the app runs end-to-end after every slice.

| Decision | Chosen | Rejected (and why) |
|---|---|---|
| Backend framework | **Keep Java 21 + Jakarta Servlet 6.1** (existing servlets/filters) | Spring Boot rewrite — weeks of rework, zero user-visible gain for a mini-project viva |
| Build | **Make Maven (`pom.xml`) the single source of truth** for dependencies | Keep script-only build that scrapes JARs out of an npm package (`scripts/ensure-toolchain.sh`) — blocks adding any new library |
| Database | **Phase 1: keep the file-backed `ForensicDataStore`, behind new repository-style methods. Phase 2 (optional, only if time): PostgreSQL via JDBC using the existing Flyway SQL** | Postgres + MinIO + Neo4j now — the docker-compose services are currently decorative; wiring all three is demo-day risk with no functional gain at demo-data scale |
| Graph DB | Entities/edges stay as lists; cross-case lookup = index on `(type, normalizedValue)` in the store | Neo4j — unnecessary for ≤ a few thousand entities |
| OCR | **Tesseract binary via `ProcessBuilder`** (`eng+hin+mar`), Dockerfile already installs it | Tess4J/JNA — extra native JARs fight the current build; CLI is 100% Java from our side and trivially testable |
| AI/LLM | **Optional, off by default:** `AiExtractor` interface → `RegexExtractor` (always) + `OllamaExtractor`/`GeminiExtractor` (only if API key/local model present) | LLM-first design — demo must work offline with no keys |
| Frontend | **Keep React + Vite + Tailwind**, split into two portals with real URL routing (hash-based, keeps GitHub Pages/static hosting working) | New framework / component library migration |
| Graph UI | **One** graph mode (keep the current SVG approach, simplified) | Cytoscape migration now; two competing graph modes (current mess) |

---

## 1. Audit of the current codebase — what is real, what is demo theatre

Size today: ~14,700 LOC. Backend: 23 Java files (custom servlet container, 11 servlets, 3 filters, 6 forensic services, 1 store, 1 models file). Frontend: `App.tsx` (1,334 lines) + 9 components (264–1,469 lines each) + a 583-line browser fallback engine + a 7,522-line JSON seed snapshot.

### 1.1 Feature-by-feature verdict

| # | Feature (where) | Real or faked? | Verdict |
|---|---|---|---|
| 1 | SHA-256 + hand-rolled BLAKE3 hashing, PBKDF2, HS256 JWT, TOTP (`CryptographicHashService`, 470 lines) | **Real** | **KEEP.** Show only SHA-256 in UI (matches BSA §63 Schedule). BLAKE3 becomes internal/advanced detail, not headline. |
| 2 | Hash-chained chain-of-custody ledger (`appendLedgerEntry`, `verifyEntireAuditLedger`) | **Real** | **KEEP.** Rename "Merkle" → "hash-chained" in UI (it is a chain, not a Merkle tree — viva honesty). |
| 3 | Evidence upload, local vault + backup copy, magic-byte executable block (`EvidenceUploadServlet`, `ForensicDataStore.ingestEvidence`, `MetadataForensicsService`) | **Real** | **KEEP + reuse for citizen portal.** Add size/type limits per citizen flow. |
| 4 | OCR (`OcrExtractionService`) | **FAKED.** `synthesizeVisualImageOcr()` invents a receipt/chat text from the *filename*. Seeded PNGs carry hidden `ForensicOcrText` tEXt chunks; bounding boxes are computed from line index × 64 px, aligned only to `SampleCaseSeeder`'s 720×920 generated images. Tesseract is installed in the Docker image but never called. | **REPLACE.** Real Tesseract CLI; honest "could not read — flagged for manual review" fallback. Seeded text stays only as *ground-truth fixture*, clearly labelled. This is the #1 credibility risk in a viva: an examiner uploading their own screenshot today gets fabricated entities. |
| 5 | "AI" extraction (`AiForensicExtractorService`, 636 lines) | **Regex + heuristics only** (URL, UPI, phone, email, UTR/TXN, account, crypto, IPv4, labelled persons; Jaro-Winkler dedup for persons). "OSINT enrichment" is hardcoded strings (e.g. *every* crypto wallet = "Flagged High-Risk"). No LLM anywhere. | **KEEP & IMPROVE, rename honestly.** This is actually the right architecture (regex-first). Add Indian patterns (IFSC, ₹ amounts, 12-digit UTR, +91 mobiles, Hindi/Marathi date formats), libphonenumber validation, per-entity source spans. LLM becomes an optional second pass. Remove invented OSINT claims. |
| 6 | Relationship inference (pairwise co-occurrence per evidence file + type-pair table) | Real but **over-asserts**: mere co-occurrence produces edges labelled `CONTROLS_ACCOUNT`, `C2_AUTHORIZED_RECELEMENT` | **KEEP mechanism, DOWNGRADE labels.** Default edge = "appears together in EVD-xxx"; strong labels only when a transaction structure is actually parsed. Officers confirm/merge (already supported). |
| 7 | Graph algorithms (`IncidentGraphService`: PageRank, Brandes betweenness, clusters, Dijkstra) | **Real, hand-rolled** (not JGraphT despite README) | **KEEP.** Fix README wording. In UI, translate scores to plain language ("most connected account") with numbers behind a details toggle. |
| 8 | Timeline reconstruction (1 event per evidence file, kill-chain phase by keyword) | Real but coarse | **KEEP + IMPROVE.** Multiple events per file from parsed timestamps; plain-English phase names for citizens; kill-chain view becomes an officer filter, not the primary language. |
| 9 | Risk scoring (`RiskScoringService`: base 15 + 6 fixed indicators, clamped 10–99) | Real arithmetic, **dishonest indicators**: any URL ⇒ +22 "malicious phishing domain"; any financial event ⇒ claims "<30 min velocity" without measuring time; any phone/IP ⇒ "burner VoIP" | **REBUILD as explainable rules** that only fire on measured facts (see §5.3). Split into **Risk** (how bad) vs **Urgency** (how fast must police act) — currently conflated. |
| 10 | Metadata forensics (magic bytes, PNG tEXt, superficial JPEG string scan, regex PDF scrape) | Partial | **KEEP magic bytes; UPGRADE** with `metadata-extractor` (EXIF) + PDFBox (PDF text) once Maven build is fixed. Add ELA + pHash later (Slice 8). |
| 11 | Integrity verification + 1-byte tamper sandbox + WORM restore | **Real** | **KEEP**, but move tamper *simulation* into an officer "Demo tools" area. The **verify** half becomes the public *Verify My File* page. |
| 12 | PDF report (hand-rolled PDF 1.7 writer) + STIX 2.1 + Markdown (`PdfReportGeneratorService`, 413 lines) | Real | **KEEP PDF path, REPLACE writer with OpenPDF** (Devanagari font support for Marathi/Hindi names; hand-rolled writer cannot embed them). **REMOVE STIX export** (no user in either portal needs it). Keep Markdown as officer "copy summary". |
| 13 | Auth + RBAC (`AuthServlet`, `AuthenticationAndRbacFilter`) | **BROKEN BY DESIGN for demo:** missing/invalid JWT ⇒ silently becomes LEAD_INVESTIGATOR; `/auth/users` publicly returns demo passwords; `/auth/totp-preview` leaks the live TOTP code; `/switch-role` lets anyone become anyone | **FIX FIRST (P0).** Citizen data makes this unacceptable even in a demo narrative. Keep 1-click demo login *only* behind an explicit `DEMO_MODE` flag, clearly badged in UI. |
| 14 | SSE progress (`ForensicProgressSseServlet` + store broadcast) | Real | **KEEP.** Reuse for citizen "Reading your screenshots…" progress and officer triage live updates. |
| 15 | Global search (Cmd+K) | Real | **KEEP** in officer portal. |
| 16 | Seeded cases (`SampleCaseSeeder` + 2 cases in store) | Real fixtures, US-dollar/BEC-flavoured | **KEEP concept, RE-SEED** as Indian citizen complaints in ₹ (see §8). DECISION: convert both seeds to the new complaint model so they appear in *both* portals. |
| 17 | PostgreSQL schema (`V1/V2.sql`), Postgres+MinIO in docker-compose | **Never executed** — no JDBC code exists; runtime store is `data/cyberfusion-db.json` | **BE HONEST.** Either wire JDBC in Phase 2 or remove the unused services from compose. Schema is reusable later; keep files, stop claiming them as live. |
| 18 | Custom servlet container (`JakartaServletContainer`, 758 lines on `com.sun.net.httpserver`, hand-rolled multipart + dynamic proxies) | Real, fragile | **KEEP for now** (works, tests pass against servlets). Flag as tech debt: if any slice needs standard container behaviour (sessions, websockets), revisit embedded Tomcat. Do not gold-plate. |
| 19 | Browser fallback engine (`installStandaloneDemoFallback.ts` + 7,522-line seed JSON) | Real — duplicates backend logic in the browser for static hosting | **KEEP but FREEZE.** It is how the GitHub Pages demo works. New features target the Java backend first; fallback gets read-only demo data updates only. Document this so we stop maintaining two engines. |
| 20 | Committed build outputs (`docs/`, `frontend/public-spa/`, demo-vault PNGs ×3 locations) | ~1.9 MB duplicated artefacts | **CLEAN:** one canonical demo-vault location; build outputs generated by CI/deploy scripts, not hand-committed thrice. (Do carefully — GitHub Pages currently serves `docs/`.) |

### 1.2 Frontend audit — why the officer portal "feels messed up"

Current flow: `HOME (marketing landing, 782 lines) → AUTH (623 lines) → WORKSPACE` with 6 forced steps
(Overview → Evidence → Graph → Timeline → Integrity → Report). Problems, in user-impact order:

1. **It answers no officer question first.** The landing view inside the workspace is KPIs about *one preselected case* — there is no "what needs my attention now?" queue at all.
2. **Fabricated data presented as live:** `GlobalThreatOriginMap` (959 lines!) hardcodes per-country threat counts ("USA 16k malicious IPs") unrelated to case data. **Remove entirely.**
3. **Two graph UIs** (`KNOWLEDGE_GRAPH` "VISLABS" vs `CYBERX_RELATIONSHIP`) inside one 1,469-line component, duplicating rendering, labels and shortest-path logic. **Keep one.**
4. **Fake actions:** the Timeline tab's "freeze" button merely appends a timeline note with hardcoded text; Overview has several "1-Click Demo" buttons that recompute things already computed. These erode trust and confuse the workflow. **Remove; replace with the real Action Card flow (§4).**
5. **Jargon-first copy:** "JGraphT PageRank", "WORM seal", "kill-chain", "Court-Admissible PDF (%PDF-1.7)" on primary buttons. Officers need decisions, citizens need plain words. Technical detail moves behind "Details".
6. **USD everywhere** (`estimatedLossUsd`, `$18,450`), hardcoded dates (2026-10-01), amounts as `double`.
7. **No citizen surface at all:** no complaint form, draft, tracking, guidance, or public verification — the entire new half of the product is greenfield.
8. `App.tsx` holds *all* state and every API call — every new feature currently means editing a 1,334-line file. Split into portal shells + small API client modules as we go (no big-bang refactor).

### 1.3 What does not exist yet (from the new requirements)

Citizen portal (all of it) · complaint/draft lifecycle & complaint IDs · paste-everything extraction · citizen confirm/correct step · submission receipt PDF + QR + next-steps guidance · status tracker · *Verify My File* public page · duplicate-UTR detection · triage queue & urgency score & golden-hour countdown · Action Card · bank freeze packet + mock bank + acknowledgement lifecycle · **cross-case correlation / fraud-ring detection** (entity dedup today is *within* a case only) · case assignment & officer status workflow · station/district routing (Maharashtra) · legal-section suggestions & BSA §63 certificate draft · threat-intel lookups (none today) · Marathi/Hindi UI · INR amounts · analytics across cases.

---

## 2. Design principles (applied to every screen we touch)

1. **One primary action per screen.** Citizen: continue. Officer queue: open top case. Case: approve next action.
2. **The system fills, the human confirms.** Never ask a citizen for data already visible in their screenshot; never ask an officer to retype an account number the system extracted.
3. **Plain language on top, forensics underneath.** Default view: "₹24,500 sent to UPI ID …". Expandable detail: hash, EXIF, PageRank, confidence.
4. **Every automated claim shows its source + confidence, and can be corrected.** Corrections are logged (custody ledger) — this is both good UX and the viva answer to "what if the AI is wrong?"
5. **Honest states.** "We couldn't read this file" > invented text. "Mock bank acknowledged (simulation)" > "Funds frozen". Hash = *tamper-evidence* (unchanged since upload), never "proof the screenshot is genuine".
6. **Mobile-first citizen portal; desktop-first officer portal.** Large tap targets, works on a ₹8,000 Android phone over 4G.
7. **Demo must run offline.** Every external API (LLM, VirusTotal) is an optional adapter with a cached/demo response. `docker compose up` (or the existing scripts) ⇒ full demo.

---

## 3. Citizen portal (new) — target experience

Route root: `#/report`. No account required to file (draft token in URL/localStorage); optional phone/email for updates.

### 3.1 Flow (3 steps + done)

**Step 0 — Safety banner (always visible):** "Lost money in the last few hours? Call **1930** right now — the national cyber-fraud helpline can try to hold the money. Then come back and file here." Links to [cybercrime.gov.in](https://cybercrime.gov.in) and [Maharashtra Cyber](https://mhcyber.gov.in/report-complaint). *Rationale: our demo must never delay the real golden-hour action, and examiners will check we know the real process.*

**Step 1 — What happened?** Icon cards: 💸 Payment/UPI fraud · 🎣 Fake link/message · 💼 Fake job/investment · 📱 Account hacked · 😟 Threats/harassment · ❓ Something else. Follow-ups adapt (payment ⇒ "How much? When?"). Every question offers "I don't know". Language switch: English / हिंदी / मराठी.

**Step 2 — Add proof (the "paste-everything" workspace).** One drop zone (screenshots, PDFs, receipts, chat exports) + one big paste box (SMS text, links, numbers — anything). Per file: instant client-side preview compression *for upload progress only* (original is what gets hashed — **never hash a recompressed copy**; upload original, show compressed preview). Live stepper as the pipeline runs: "Securing file ✓ (fingerprint saved) → Reading text → Finding details". Extracted items appear as friendly chips: "Found: ₹24,500 · UPI ID xyz@okaxis · Ref 4271… · Phone +91 98204…". Duplicate check fires here: *same UTR already in this complaint* ⇒ gentle merge prompt; *same UTR in an earlier complaint by this user* ⇒ "You already reported this transaction — view status". (Never reveal another citizen's complaint.)

**Step 3 — Check & submit.** Confirmation cards, one per finding, ✅ Correct / ✏️ Fix / ✖ Not mine. A 3-line auto-written summary the citizen can edit ("On 12 Oct, I received a WhatsApp message from +91… I paid ₹24,500 to…"). Contact (name, mobile, district — district list = Maharashtra's 36 districts) + consent checkbox. Submit ⇒ **Complaint ID** (e.g. `CFX-MH-2026-000123`), QR to tracker, receipt PDF download.

**Done page — "What happens next"** (requirement #2, a differentiator):
1. What we sent where (station routing: district Cyber Police Station / Maharashtra Cyber — *simulated in demo, labelled as such*).
2. Do-this-now checklist personalised by scam type (call bank & 1930 if not done, block card/UPI, change passwords, enable 2FA, **do not delete chats**, beware "recovery agents" — a common second scam).
3. What the freeze process means, realistic timelines, and that an NCRP complaint number ≠ FIR.
4. "How to stay safe next time" — 4–5 scam-type-specific tips.

**Tracker page** (`#/track/<id>` + token): Received → Under review → Bank intimated *(only if a freeze packet was actually generated & officer-approved)* → Investigating → Closed, each with timestamp + plain note. Driven by `status_updates`, not hard-coded.

**Verify My File** (`#/verify`): drop a file that was submitted earlier → server compares SHA-256 against the sealed record → **Intact ✓ / Changed ✖** with the original submission timestamp. Also accepts "verify against my receipt" (paste hash from receipt PDF).

### 3.2 Citizen micro-innovations (your list, adopted)

| Idea | Adopted design |
|---|---|
| Duplicate detection | UTR/txn-ref exact match (own complaints) + pHash near-duplicate screenshot warning ("looks like a file you already added") |
| Image compression | Client-side preview thumbnails + optional resized *working copy* for OCR speed; **original preserved & hashed** |
| Hash receipt + Verify page | Receipt PDF lists every file + SHA-256 + complaint Merkle-style case seal (hash of hashes — cheap to add, strong viva point) |
| Paste-everything | Single textarea → same extraction pipeline as files |
| Report copy after submission | Citizen receipt PDF = complaint summary + evidence manifest + hashes + next steps + safety tips (generated by same PDF service, citizen template) |

Voice input (Web Speech API) and save-and-resume drafts: **yes, both cheap** — drafts are just `cases.status = DRAFT` + token.

---

## 4. Officer portal (redesigned) — target experience

Route root: `#/officer`. Login (existing JWT, fixed filter). Landing = **Triage**, not a case dashboard.

### 4.1 Triage dashboard (Golden Hour)

Priority queue table/cards, auto-sorted by **Urgency score** (§5.3), each row: complaint ID · scam type · ₹ amount · *time since transaction* with countdown badge ("⏱ 47 min into golden window") · target account isolated (UPI/acct + bank) · cross-case hits ("⚠ same UPI in 3 other complaints") · status · **[Open Action Card]**. Filters: district/station, scam type, status, unassigned. New complaints arrive live via SSE. Header strip: 4 honest numbers only (awaiting action, in golden window now, ₹ at risk today, mock-freeze ACK rate). *Everything else from the old Executive Dashboard is deleted or demoted.*

### 4.2 Action Card (the core innovation, one per case)

Auto-generated, officer-confirmed: victim & incident in 3 lines · **isolated destination account(s)** with the evidence each came from (click ⇒ jumps to bounding box) · amount & UTR · urgency/risk breakdown ("why this score" list) · recommended actions checklist. Primary button: **Generate & send freeze packet** → preview (PDF letter + structured JSON payload modelled on bank nodal-officer communication: UTR, amount, beneficiary acct/UPI, IFSC, bank, timestamps, evidence hashes, officer identity) → officer confirms → POST to **mock bank** (`/mock/bank/freeze`, a servlet in our own app) → ACK reference recorded, custody-logged, citizen tracker updated. Idempotency key per (case, account) prevents double-sends. Copy is explicit: *"Simulation — in production this packet is submitted via I4C/CFCFRMS channels."* (There is no public freeze API in India; preparing a correct, hash-attested packet fast **is** the honest innovation.)

### 4.3 Case workbench (simplified from 6 forced steps → 5 free tabs)

`Overview | Evidence | Timeline | Graph | Integrity & Report`
- **Overview:** Action Card summary + risk indicators (explainable) + related complaints + assignment/status controls. *(Merges today's Overview + parts of Report.)*
- **Evidence:** today's vault, minus the preset-simulator left panel clutter; OCR text with entity highlights; click entity ⇒ all occurrences (this case + others). Officer can add evidence to a citizen case (e.g. bank reply PDF).
- **Timeline:** today's view with plain phase labels; gap/conflict flags; add manual milestone (kept).
- **Graph:** **one** mode; filter by node type; "money path" = shortest path victim→destination (existing Dijkstra); cross-case nodes visually distinct.
- **Integrity & Report:** hash verification per file + case seal, custody ledger (today's Integrity view, trimmed), **Generate case report PDF**, **BSA §63 certificate draft** (Part A pre-filled from evidence manifest incl. SHA-256; Part B expert fields blank for signature — labelled *draft*), suggested legal sections (IT Act/BNS mapping table, officer confirms each — never auto-asserted).

Secondary pages: **Analytics** (scam types over time, district counts, repeat-mule leaderboard — from real case data only; Leaflet map of *stations/districts*, not fake global threats), **Stations** directory (seeded Maharashtra cyber police stations).

### 4.4 Explicit removals from officer UI

`GlobalThreatOriginMap` (959 lines, fabricated) · second graph mode (~430 lines) · marketing sections inside app · all "⚡ 1-Click Demo" fake-action buttons · TOTP preview strip · role switcher in header (demo login stays on login page, badged) · STIX export button · "Court-Admissible / %PDF-1.7 / JGraphT" copy · USD formatting.

---

## 5. Backend plan

### 5.1 Processing pipeline (refactor of `ForensicDataStore.ingestEvidence`)

Today ingestion is one synchronous lock-holding method. Split into explicit stages (keep in-process, virtual-thread executor; persist a `processing_jobs` record so failures are retryable and the UI stepper is truthful):

```
Upload → validate (magic bytes, size) → SHA-256 + pHash → store original
  → Extract text: PDFBox (PDF) / Tesseract CLI eng+hin+mar w/ preprocessing
     (grayscale, upscale, threshold via ImageIO) / plain text / chat-export parser
  → RegexExtractor (Indian patterns) → optional AiExtractor (Ollama/Gemini, JSON-schema)
  → Normalise (libphonenumber +91, UPI lowercase, URL defang/strip trackers, ₹ amounts → paise long)
  → Entity resolution (within case — existing) → Cross-case lookup (NEW)
  → Threat-intel adapters (cached; demo provider by default)
  → Timeline builder → Risk + Urgency scorers → Action Card builder
  → SSE notify (citizen stepper + officer queue)
```
Every stage after hashing is *fail-soft*: OCR fails ⇒ file still sealed, case flagged "needs manual reading". Extraction records `engine`, `confidence`, and **source span** (file, page/region, text offsets) so the UI can always show "found here".

**Key correctness rules (new):** money stored as `long` paise + display ₹; timestamps stored UTC + raw string + assumed zone (Asia/Kolkata) when inferred; a single real-world transaction described by both a receipt and an SMS must merge (match on UTR/amount+time window) — otherwise loss totals double-count.

### 5.2 Data model — delta on existing `Models.java` (no new DB needed in Phase 1)

`ForensicCase` → extend (keep name internally, "Complaint" in UI copy):
`+ complaintNo, origin (CITIZEN/OFFICER), scamType, citizenName, citizenPhoneHash*, district, stationId, language, amountLostPaise, incidentAt, reportedAt, urgencyScore, draftTokenHash, status (DRAFT→SUBMITTED→TRIAGED→FREEZE_SENT→INVESTIGATING→CLOSED), assignedOfficerId` · *remove* `estimatedLossUsd` (migrate seeds to paise).
New small models: `FreezeRequest` (packet path/hash, bank, account ref, status, ackRef, idempotencyKey, sentAt) · `StatusUpdate` (citizen tracker) · `ThreatIntelCache` · `LegalSectionSuggestion` · `Station`. `ExtractedEntity + sourceSpans[]`; `EvidenceItem + phash, ocrEngine`. *Citizen phone stored only if provided for updates; show masked to officers by default.*

The existing `V1/V2.sql` gets a matching `V3` migration file written now (documentation-grade), executed only in optional Phase 2.

### 5.3 Scoring (explainable, config-weighted, unit-tested)

- **Urgency (officer queue only):** `40·recencyDecay(minutes since txn) + 25·amountBand + 20·repeatDestination(cross-case count) + 10·vulnerability(scamType) + 5·evidenceCompleteness`. Weights in one `scoring.properties` — tunable and viva-explainable.
- **Risk (case):** sum of *measured* indicators only: blacklist/shortener hit, domain <30 days (RDAP via cache), EXIF editor detected, hash mismatch, receipt↔SMS field mismatch, destination seen in ≥2 cases, pressure-language lexicon hit. Each stored with explanation (existing `RiskIndicator` model already fits).

### 5.4 API — delta (existing `/api/v1/*` officer endpoints mostly survive)

**Citizen (new, token-scoped, no login):** `POST /api/v1/public/complaints/draft` · `POST …/{id}/evidence` (multipart, returns hash receipt + job) · `POST …/{id}/paste` · `GET …/{id}/extraction` · `PUT …/{id}/confirm` (citizen corrections) · `POST …/{id}/submit` · `GET …/{id}/status` · `GET …/{id}/receipt.pdf` · `POST /api/v1/public/verify` · `GET /api/v1/public/guidance?scamType=` · SSE reuse `/api/v1/stream/*` filtered by case.
**Officer (new):** `GET /api/v1/officer/triage` · `GET …/cases/{id}/action-card` · `POST …/cases/{id}/freeze` · `POST …/cases/{id}/assign`, `…/status` · `GET …/cases/{id}/related` · `GET …/analytics` · `POST …/cases/{id}/certificate` (BSA §63 draft).
**Mock:** `POST /mock/bank/freeze` → `{ackRef, status}` (deliberately outside `/api/v1` auth, documented as simulator).
**Security fixes baked in:** filter returns 401 when no/invalid JWT on officer routes; citizen routes require draft/track token; remove passwords/TOTP from responses; rate-limit public upload by size+count; audit every officer mutation (existing filter + ledger).

### 5.5 Tools — final picks for *this* codebase

| Purpose | Pick | Why here |
|---|---|---|
| OCR | **Tesseract CLI (eng+hin+mar) via ProcessBuilder** + ImageIO preprocessing | Binary already in Dockerfile; zero new JARs; offline |
| PDF text | **Apache PDFBox** (Maven) | Replaces regex scrape |
| Metadata/EXIF | **metadata-extractor** (Maven) | Replaces string scan; editor-software detection |
| Phone validation | **libphonenumber** (Maven) | +91 normalisation officers can trust |
| Image forensics | **pHash** (own ~40 lines) now; **ELA** (ImageIO re-save diff) in Slice 8 | Impressive, cheap, honest limits stated |
| AI (optional) | `OllamaExtractor` (local) first; `GeminiExtractor` if key provided | Strict-JSON schema; regex remains ground truth for IDs/amounts |
| Threat intel | **Demo/cached provider default**; optional VirusTotal / Google Safe Browsing / RDAP adapters behind keys, aggressively cached | Demo works offline; free-tier limits can't break the viva. Note: don't send real citizen PII to free LLM/intel tiers — demo uses synthetic data only |
| PDF | **OpenPDF** (Maven) + embedded Devanagari font | Citizen receipts with Marathi/Hindi names |
| QR | **ZXing core** (Maven) | Tracker link on receipt |
| Graph viz / timeline / map | Existing SVG graph (1 mode); existing timeline; **Leaflet + OSM** only if analytics slice lands | Avoid new heavy deps until needed |
| i18n | **react-i18next** + curated `en/hi/mr` JSON for citizen portal only | Officer portal stays English |

Build prerequisite (Slice 0): switch dependency provisioning to Maven (`mvn -q package` produces runnable classpath; scripts wrap it). The npm-scraped-JAR hack is deleted.

---

## 6. Maharashtra / India framing (baked into copy & data, with real-world anchors)

- **1930** helpline + **cybercrime.gov.in (NCRP/I4C)** referenced at citizen Step 0 and in guidance; our complaint ID is explicitly *our system's reference*, distinct from an NCRP acknowledgement (14-digit) and from an FIR (BNSS). Officer freeze flow modelled on the CFCFRMS idea (police↔bank hold via nodal officers) but simulated end-to-end. [1][7]
- **Maharashtra Cyber** (state nodal agency; HQ Mahape, Navi Mumbai; district cyber police stations/labs) — seed a station directory (district → cyber PS) for routing demo; link `mhcyber.gov.in/report-complaint`. [1]
- **BSA 2023 §63** (in force 1 Jul 2024, successor to Evidence Act §65B): certificate in Schedule format, **Part A (custodian) + Part B (expert)**, hash value mandatory (SHA-256 listed). Our generator pre-fills Part A from the evidence manifest and leaves Part B for the expert — a genuinely current, examinable feature. [3]
- Amounts ₹ (paise), dates IST display, Indian formats in extractors, guidance content per scam type, districts of Maharashtra in forms.

---

## 7. Build order — thin vertical slices (app works after each)

| Slice | Scope (files touched, roughly) | Done when (acceptance) |
|---|---|---|
| **0. Foundations & honesty fixes** | Maven build swap; fix auth filter (401 default; demo mode flag); strip passwords/TOTP from APIs; delete `GlobalThreatOriginMap` + 2nd graph mode + fake-action buttons; ₹/paise model change + re-seed; README/PLAN corrected to match reality | Existing officer demo passes; unauthenticated API call ⇒ 401; tests green |
| **1. Real extraction** | Tesseract CLI service + preprocessing; PDFBox; metadata-extractor; Indian regex pack + libphonenumber; remove `synthesizeVisualImageOcr` (fixture text only for seeds, labelled); source spans on entities; honest OCR-failure state | Examiner's own UPI screenshot ⇒ correct UPI/UTR/amount or honest "needs review"; unit tests on sample SMS/receipt strings |
| **2. Citizen portal shell + intake** | Hash routing (`#/report`, `#/officer`, `#/verify`, `#/track`); Steps 0–2 UI; draft API; upload+paste → pipeline → extracted chips via SSE; duplicate-UTR/pHash checks | Citizen uploads 2 files, sees found details, no login, on mobile width |
| **3. Confirm → submit → receipt → tracker** | Confirmation cards + corrections API; complaint numbering; receipt PDF (OpenPDF + QR + case seal); guidance content service (per scam type, EN first); tracker page + `status_updates` | Full citizen journey completable in <3 min on demo data; receipt verifies on `#/verify` |
| **4. Officer triage + Action Card** | Triage API + urgency scorer; queue UI w/ countdown; case workbench tabs restructure (delete forced stepper); Action Card builder; assignment/status workflow | New citizen complaint appears in queue <5 s after submit, sorted by urgency, destination pre-isolated |
| **5. Cross-case correlation** | Store index `(type, normalized)`; related-cases API; "seen in N complaints" badges in queue/graph; merged multi-case graph view | Two demo complaints sharing a UPI ID trigger fraud-ring alert live |
| **6. Freeze packet + mock bank** | Packet PDF/JSON generator; officer confirm flow; `MockBankServlet`; ACK lifecycle + idempotency; citizen tracker event; ledger entries | One click (post-confirm) ⇒ ACK ref on case + tracker, double-click safe |
| **7. Reports & legal drafts** | Officer case report PDF (OpenPDF, incl. graph snapshot as image); BSA §63 Part-A draft; legal-section suggestions w/ officer confirm; remove STIX | Report + certificate download; no unconfirmed legal assertion in output |
| **8. Depth (as time allows)** | Threat-intel adapters + cache; ELA panel; scam-script lexicon matching; money-flow (Sankey-style) list view; analytics page (real aggregates) + station directory/Leaflet districts | URL verdicts cached & sourced; analytics numbers all traceable to cases |
| **9. Language & polish** | i18next hi/mr for citizen portal; voice input (Web Speech); accessibility pass; Docker compose trimmed to what's real; demo script + screenshots; final README | Citizen flow fully usable in Marathi; `docker compose up` ⇒ demo |
| **10. Optional AI pass** | `AiExtractor` interface; Ollama adapter (scam-type classification, event summaries, entity hints) behind config; strict JSON validation; UI badges "AI-suggested — confirm" | With Ollama running: summaries improve; with it stopped: zero breakage |

**Must-haves if time runs out:** Slices 0–6. That already delivers the complete story: *citizen files easily → real extraction → officer triages by golden-hour urgency → fraud ring surfaces → freeze packet sent (simulated) → citizen sees status → everything hash-sealed and reportable.*

**Explicitly NOT building:** Spring rewrite · Neo4j/Redis/MinIO/Python service · real bank/police integrations · real SMS/email sending (mocked/logged) · embeddings/similarity search · public awareness social feed (static tips page instead) · crypto/BEC specialisation (existing patterns remain, no new UI).

---

## 8. Demo data plan (build in Slice 0–2, not at the end)

- **Case A (hero):** UPI KYC-scam — WhatsApp chat PNG + payment receipt PNG + phishing SMS `.txt`, ₹24,500, destination `…@okaxis`, generated with the existing `SampleCaseSeeder` renderer *and* real Tesseract must read them (this doubles as the OCR regression test).
- **Case B:** Fake-job scam sharing the **same UPI ID** as A (+ same phone) ⇒ Slice 5 ring detection fires.
- **Case C:** Sextortion/harassment (no money) ⇒ proves non-financial flow, vulnerability-weighted urgency, different guidance.
- **Background:** 25–40 lightweight synthetic past complaints (entities only, generated in seeder) so analytics/queue look alive and cross-case counts are >1.
- **"Load demo complaint"** button on citizen Step 2 (pre-fills Case A files) for a zero-typing viva run. All persons/numbers/UTRs fictional; a `DEMO DATA` watermark on seeded images.

---

## 9. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Tesseract accuracy on dark-mode chats / Devanagari | Preprocessing (invert option, 2× upscale, Otsu threshold); benchmark on fixtures in Slice 1; graceful manual-entry fallback; optional Gemini vision adapter later |
| Custom servlet container quirks (multipart, SSE) when adding routes | Add servlets following existing patterns; container untouched except registrations; integration-test each new endpoint with curl in its slice |
| Single-file JSON store under concurrent citizen uploads | Existing RW-lock + atomic file replace; jobs persisted; Phase-2 JDBC path documented (`V3` SQL written alongside models) |
| External API limits/keys on demo day | All adapters optional + cached; demo provider default; network-off demo script tested |
| Scope creep (this plan is large for 1 person) | Slice gates: after Slice 6 we can stop and polish; Slices 8–10 are explicitly droppable without breaking the narrative |
| Viva honesty traps | This document's §1 fixes are Slice 0 — before any new feature. Every simulated element labelled in UI |

---

## 10. Decisions needed from you before Slice 0

1. **Framework:** evolve Jakarta Servlets (recommended) vs Spring Boot rewrite?
2. **Database:** file-store first, Postgres later-if-time (recommended) vs Postgres from Slice 0?
3. **Sequencing:** honesty/cleanup + real OCR first, then citizen portal (recommended) vs citizen UI first on faked extraction?
4. **Language scope for viva:** English-only citizen flow first, hi/mr in Slice 9 (recommended) vs Marathi from day one?

*On approval, implementation starts at Slice 0 and each slice lands as its own commit(s) on this branch with the app runnable at every step.*
