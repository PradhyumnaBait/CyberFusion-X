# 🧠 CyberFusion X — AI-Assisted Digital Forensics & Fraud Reconstruction

A Java 21 mini-project for Maharashtra, India. A citizen adds whatever proof they have — screenshots,
messages, UPI receipts — and the system reads it, extracts the important details, seals every file
cryptographically, rebuilds the incident, and hands a cyber officer a case that is ready to act on.

> **Citizen gives minimum input → system does maximum work → officer gets a ready-to-act case.**
>
> ⚠️ Demo system: all people/accounts are fictional, bank freeze responses come from an in-app mock bank,
> and nothing here replaces the official process — **call 1930** and use **cybercrime.gov.in** for real incidents.

## The two portals

| Portal | Route | What it does |
|---|---|---|
| **Citizen** (no login) | `#/report` | 3-step complaint: what happened → add proof (files or paste-everything) → check what we found & submit. Gets a complaint number, a SHA-256 evidence receipt PDF, next-steps & safety guidance. |
| **Track** | `#/track` | Status tracker (complaint number + tracking code — number alone never exposes a case). |
| **Verify My File** | `#/verify` | Re-check that a submitted file is byte-for-byte unchanged since it was sealed. |
| **Officer** (JWT login) | `#/officer` | Golden-hour **priority queue** (urgency scoring) → **Action Card** (destination account isolated, UTR/IFSC prefilled) → one-click **freeze/hold packet** (mock bank, idempotent) → Evidence, Timeline, Incident Graph, Integrity Ledger, Report + **BSA §63 certificate draft**. |

**Headline capability — fraud-ring detection:** entities are indexed across *all* complaints, so when the
same UPI ID / account / phone appears in several victims' complaints, the queue, Action Card and risk score
flag it automatically (seeded demo complaints demonstrate this live).

## How evidence is processed

```
Upload/paste → SHA-256 seal (+ perceptual hash) → preserve original
  → text: Tesseract OCR (eng+hin+mar, real word boxes) / PDF text / plain text
  → regex extraction (Indian mobiles, UPI IDs, 12-digit UTRs, IFSC, ₹ amounts, URLs…)
  → normalise & de-duplicate → cross-case lookup → timeline + incident graph
  → measured, explainable Risk score + separate Golden-Hour Urgency score → Action Card
```
Fail-soft and honest throughout: a file that can't be read is flagged *"needs manual reading"* — the
system never invents plausible-looking text. Hashes prove a file is **unchanged since receipt**
(tamper-evidence), not that a screenshot was genuine before upload.

## Tech stack (as actually used)

Java 21 (virtual threads) · Jakarta Servlet 6.1 on a lightweight embedded container · Gson ·
hand-implemented SHA-256/BLAKE3, PBKDF2, HS256 JWT, hash-chained custody ledger, PageRank/betweenness/
Dijkstra graph analytics · Tesseract OCR via `ProcessBuilder` (Docker image) · React 18 + TypeScript +
Vite + Tailwind · file-backed persistence (`data/`, zero-setup demo; SQL for an optional PostgreSQL move
is in `backend/src/main/resources/db/migration/V1–V3`).

Money is stored as **paise (long)**, shown in ₹ with Indian digit grouping. Amounts/dates in seeds are Indian;
three seeded citizen complaints (Pune UPI fraud — 45 min old, Nagpur fake-job, Mumbai threats) share entities
with each other and with the legacy officer case.

## Run it

```bash
# Backend (Java 21, port 8080) — provisions its own toolchain on first run
./scripts/build-backend.sh
./scripts/start-backend.sh

# Frontend (port 5173, proxies /api to the backend)
cd frontend && npm install && npm run dev

# Tests
./scripts/run-tests.sh

# Or everything in one container (includes Tesseract eng+hin+mar)
docker compose up --build   # http://localhost:8080
```

**Officer demo logins** (demo mode only, badged in the UI; disable with `DEMO_MODE=false`):
use the 1-click personas on `#/officer`, or sign in as `arjun.verma` / `Forensics@2026` (Lead),
`priya.nair` / `Analyst@2026` (Analyst), `rohan.kulkarni` / `Auditor@2026` (read-only Auditor).
Passwords are never returned by any API; unauthenticated officer API calls return **401**.

## 5-minute demo script

1. **Citizen:** open `#/report` on a phone-width window → UPI fraud → Step 2 → *Try with demo evidence* →
   watch entities appear → Step 3 → submit → note the complaint number + tracking code → download the receipt PDF.
2. **Verify:** `#/verify` → upload the same demo file (intact), then try an edited copy (fails).
3. **Officer:** `#/officer` → 1-click Lead login → the new complaint is at the top of the queue with a golden-window
   badge → open the Action Card → see the destination UPI flagged *"also in other complaints"* → open a related
   complaint → back → check the box → **Send freeze packet** → mock-bank ACK → download the packet PDF.
4. **Citizen again:** `#/track` with number + code → the *Bank intimated* step now shows. Wrong code → nothing leaks.
5. **Workbench tabs:** Evidence (OCR text + sealed hashes) → Timeline → Connections (trace the money path) →
   Integrity (tamper demo) → Report (case PDF + BSA §63 draft).

## India / Maharashtra framing

1930 helpline + NCRP guidance at the top of the citizen flow and in every receipt (system complaint numbers are
explicitly *not* NCRP acknowledgements or FIRs) · Maharashtra district → cyber police station routing (seeded
directory) · freeze flow modelled on the I4C/CFCFRMS + bank nodal-officer process, simulated end-to-end ·
BSA 2023 §63 (successor of Evidence Act §65B) certificate drafts with Part A hash values pre-filled ·
officer-confirmed legal-section suggestions (BNS/IT Act).

See `docs/TWO_PORTAL_REDESIGN_PLAN.md` for the full audit (what was real vs faked in v1), the keep/remove/build
decisions, and the slice-by-slice plan this implementation follows.
