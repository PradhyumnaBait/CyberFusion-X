# CyberFusion X — Persistent Agent Architecture & Design Invariants

## 1. Core Technical & Data Contracts (IMMUTABLE)
- Stack: Java 21 Backend (Jakarta Servlet / SSE telemetry) + React 18, TypeScript, Vite 6.4.3, Tailwind CSS, Three.js, `@react-three/fiber@8.17.10`.
- NEVER modify or replace the Java 21 backend architecture, API endpoints, SSE connections, RBAC persona logic, SHA-256/BLAKE3 verification handlers, or Dijkstra shortest-path algorithms during UI phases.
- NEVER fabricate threat-feed numbers, fake cases, or synthetic telemetry. Bind strictly to active dataset properties (`CASE-2026-0841`, `CASE-2026-0842`, and dynamic user-created cases).
- Unauthenticated sessions MUST land on `HomeLandingView` / `AuthPortalView` and NEVER silently auto-login as Cmdr. Arjun Verma.

## 2. Visual Identity & Layout Rules (MANDATORY)
- DEFAULT THEME: Crisp Mineral Light Mode (`bg-slate-50` `#F8FAFC` canvas, `bg-white` `#FFFFFF` analytical panels, `border-slate-200` `#E2E8F0` hairlines, `text-slate-900` `#0F172A` primary ink).
- DARK TECHNICAL STAGES: Use deep high-contrast slate (`#0B0F19` to `#0F172A`) ONLY for enclosed spatial/optical instruments (`GlobalThreatOriginMap`, `EvidencePrism3D`, and `EvidenceVaultView` central artifact canvas). NEVER turn the entire application dark.
- ANTI-SAAS RULE: Do not build flat grids of identical white rounded cards. Size analytical panels in proportion to their forensic data density.
- TYPOGRAPHY & OVERFLOW DEFENSES:
  - Body data and forensic labels must be comfortably legible at 100% zoom (`13px`–`15px` body, `tabular-nums` on all metrics). Never shrink font sizes below `11px` to cram data.
  - Every flex/grid child holding dynamic strings MUST include `min-w-0`.
  - Long IOCs (`apex.verify.settlement@okaxis`, `185.220.101.44`, SHA-256/BLAKE3 hashes, URLs, filenames) MUST use `font-mono break-all` or intentional truncation with a copy/inspect trigger. Text must NEVER spill outside card borders.
  - KPI metric tiles are restricted to max 3 elements: Label, Primary Tabular Value, and 1 Status Badge/Footer.

## 3. Component Protection List
- NEVER replace `GlobalThreatOriginMap.tsx` with a simplified static SVG diagram or generic chart.
- NEVER remove `EvidencePrism3D.tsx` from `HomeLandingView.tsx`.
- NEVER modify `WorkspaceHeader.tsx`, `InvestigationStepper.tsx`, or `AuthPortalView.tsx` unless explicitly assigned in the active phase file lock list.

## 4. Strict Verification Budget (NO BROWSER LOOPS)
- After code edits, run `npm run build` ONCE to verify TypeScript and Vite bundle integrity.
- DO NOT autonomously launch `browser_subagent` (`/browser`) to crawl all 6 workspace tabs, record WebM videos, or take multi-page DOM screenshots.
- Never claim "visually verified" based solely on `npm run build` passing. Separate "Code Changed", "Build Passed", and "Browser Verified" in every phase report.