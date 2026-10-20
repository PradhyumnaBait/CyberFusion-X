import React, { useState, lazy, Suspense } from 'react';
import {
  Shield,
  ArrowRight,
  Lock,
  ScanSearch,
  Network,
  Clock,
  FileCheck2,
  CheckCircle2,
  Sparkles,
  Fingerprint,
  Layers,
  Cpu,
  AlertTriangle,
  Database,
  LogIn,
  UserPlus,
  Terminal,
  FileText,
  Search,
  Binary,
  Scale,
  Key,
  ChevronRight,
  ExternalLink,
  GitBranch,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { ForensicCaseSummary } from '../types';

// Dynamic import for 3D Evidence Prism scene (keeps initial bundle small)
const EvidencePrism3D = lazy(() => import('./landing/EvidencePrism3D'));

const EvidencePrismLoadingFallback = () => (
  <div className="w-full h-full min-h-[480px] rounded-3xl bg-gradient-to-b from-[#141B26] via-[#0F1520] to-[#0A0D14] border border-[#263244] p-6 flex flex-col justify-between animate-pulse text-slate-100">
    <div className="flex items-center justify-between pb-4 border-b border-slate-800">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
        <span className="text-xs font-mono font-bold tracking-wider text-slate-300">
          INITIALIZING EVIDENCE PRISM...
        </span>
      </div>
      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-500">
        WEBGL INITIALIZATION
      </span>
    </div>
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-20 h-20 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
      <span className="text-xs font-mono text-slate-400 mt-4">Compiling procedural 3D geometries...</span>
    </div>
    <div className="h-14 rounded-xl bg-slate-900/60 border border-slate-800/80" />
  </div>
);

export type WorkspaceTabType =
  | 'OVERVIEW'
  | 'EVIDENCE'
  | 'GRAPH'
  | 'TIMELINE'
  | 'INTEGRITY'
  | 'REPORT';

interface HomeLandingViewProps {
  activeCase?: ForensicCaseSummary | null;
  cases: ForensicCaseSummary[];
  isAuthenticated?: boolean;
  onSelectCase: (caseId: string) => void;
  onNavigate: (tab: WorkspaceTabType) => void;
  onOpenAuthPortal: (mode: 'LOGIN' | 'SIGNUP') => void;
  onRunGlobalVerify: () => void;
}

export const HomeLandingView: React.FC<HomeLandingViewProps> = ({
  activeCase,
  cases,
  isAuthenticated = false,
  onSelectCase,
  onNavigate,
  onOpenAuthPortal,
  onRunGlobalVerify,
}) => {
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditComplete, setAuditComplete] = useState<boolean>(true);

  const handleAuditClick = () => {
    setIsAuditing(true);
    setAuditComplete(false);
    setTimeout(() => {
      onRunGlobalVerify();
      setIsAuditing(false);
      setAuditComplete(true);
    }, 600);
  };

  const handlePrimaryAction = (targetTab: WorkspaceTabType = 'OVERVIEW') => {
    if (isAuthenticated) {
      onNavigate(targetTab);
    } else {
      onOpenAuthPortal('LOGIN');
    }
  };

  const featuredCase = cases.length > 0 ? cases[0] : null;
  const secondaryCases = cases.length > 1 ? cases.slice(1) : [];

  return (
    <div className="w-full bg-cfx-canvas text-cfx-text-primary flex flex-col font-sans selection:bg-blue-100 selection:text-slate-900">
      {/* =========================================================================
          1. REPAIRED PUBLIC NAVIGATION HEADER (Fully Opaque, Non-Transparent)
          ========================================================================= */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#DCE2E8] px-4 sm:px-6 lg:px-8 py-3.5 shadow-sm">
        <div className="w-full flex items-center justify-between gap-4">
          {/* Brand & Forensic Lab Identity */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-600/30">
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900">
                  CyberFusion <span className="text-blue-600">X</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  FORENSIC LAB · v2.4
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                Digital Evidence Reconstruction &amp; Incident Verification
              </span>
            </div>
          </div>

          {/* Clean Public Navigation Links (With Accurate Section Anchors) */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-600">
            <a
              href="#workflow"
              className="hover:text-blue-600 transition-colors py-1"
            >
              Investigation Workflow
            </a>
            <a
              href="#capabilities"
              className="hover:text-blue-600 transition-colors py-1"
            >
              Forensic Capabilities
            </a>
            <a
              href="#cases"
              className="hover:text-blue-600 transition-colors py-1"
            >
              Sample Cases
            </a>
          </nav>

          {/* High-Contrast Auth & Entry Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            {isAuthenticated ? (
              <button
                onClick={() => onNavigate('OVERVIEW')}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-600/20 transition cursor-pointer"
              >
                <span>Enter Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => onOpenAuthPortal('LOGIN')}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-blue-600" />
                  <span>Demo &amp; Sign In</span>
                </button>
                <button
                  onClick={() => onOpenAuthPortal('SIGNUP')}
                  className="hidden sm:flex px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Register</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Public Experience Body */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-20 flex-1">
        {/* =========================================================================
            2. DISTINCTIVE HERO SECTION (Asymmetric Two-Column Composition)
            ========================================================================= */}
        <section className="relative rounded-3xl bg-white border border-[#DCE2E8] p-6 sm:p-8 lg:py-8 lg:px-10 shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Primary Editorial Column (7 Columns) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>EVIDENCE RECONSTRUCTION PLATFORM</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.14]">
                Reconstruct scattered digital evidence into defensible incident narratives.
              </h1>

              <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl">
                Cybercrime and financial fraud investigations begin with fragmented artifacts—burner SIM messages, forged UPI screenshots, mule accounts, and crypto wash addresses. CyberFusion X cryptographically seals raw evidence into an immutable WORM vault, extracts correlated entities via OCR and NLP, and reconstructs chronological kill-chains ready for court prosecution.
              </p>

              {/* Action Area: High-Contrast Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => handlePrimaryAction('OVERVIEW')}
                  className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-extrabold flex items-center gap-2.5 shadow-md shadow-blue-600/25 transition cursor-pointer"
                >
                  <span>
                    {isAuthenticated ? 'Open Forensic Workspace' : 'Launch Investigation Demo'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {!isAuthenticated && (
                  <button
                    onClick={() => onOpenAuthPortal('LOGIN')}
                    className="px-5 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-300 hover:border-slate-800 text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer"
                  >
                    <LogIn className="w-4 h-4 text-blue-600" />
                    <span>Demo Investigator Personas</span>
                  </button>
                )}

                <a
                  href="#workflow"
                  className="px-3 py-3 text-xs sm:text-sm font-bold text-slate-600 hover:text-blue-600 flex items-center gap-1 transition"
                >
                  <span>View 4-Stage Pipeline</span>
                  <ChevronRight className="w-4 h-4" />
                </a>
              </div>

              {/* Integrated Technical Assurance Strip (High-Contrast Editorial Divider Bar) */}
              <div className="pt-2">
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Evidence Integrity
                    </div>
                    <div className="text-xs font-black text-slate-900 font-mono">
                      SHA-256 + BLAKE3
                    </div>
                    <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WORM Vault Sealed</span>
                    </div>
                  </div>

                  <div className="space-y-1 sm:pl-4">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Entity Intelligence
                    </div>
                    <div className="text-xs font-black text-slate-900 font-mono">
                      9 Forensic Classes
                    </div>
                    <div className="text-[11px] text-blue-700 font-semibold flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      <span>Pixel Bounding &amp; NLP</span>
                    </div>
                  </div>

                  <div className="space-y-1 sm:pl-4">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Legal Admissibility
                    </div>
                    <div className="text-xs font-black text-slate-900 font-mono">
                      ISO/IEC 27037
                    </div>
                    <div className="text-[11px] text-amber-800 font-semibold flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5 text-amber-600" />
                      <span>Court Dossier Export</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Side: 3D Interactive Evidence Prism Stage (5 Columns) */}
            <div className="lg:col-span-5">
              <div
                id="evidence-prism-stage"
                className="w-full min-h-[460px] h-[460px] overflow-hidden rounded-2xl relative bg-radial-[circle_at_center,rgba(14,58,82,0.45)_0%,rgba(7,19,31,0.25)_65%,transparent_100%]"
              >
                <Suspense fallback={<EvidencePrismLoadingFallback />}>
                  <EvidencePrism3D onRunGlobalVerify={onRunGlobalVerify} />
                </Suspense>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            3. FOUR-STAGE WORKFLOW (Connected Editorial Timeline Sequence)
            ========================================================================= */}
        <section id="workflow" className="scroll-mt-24 sm:scroll-mt-28 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
                SEQUENTIAL FORENSIC LIFECYCLE
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                From raw artifact to defensible court dossier
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              4 Continuous Stages · ISO/IEC 27037 Compliant
            </span>
          </div>

          {/* Connected Linear Timeline Progression */}
          <div className="relative">
            {/* Desktop Horizontal Connecting Track */}
            <div className="hidden lg:block absolute top-7 left-12 right-12 h-0.5 bg-slate-200 -z-0" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
              {/* Stage 1 */}
              <div className="cf-card p-6 flex flex-col justify-between hover:-blue-400 hover: transition group">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="w-10 h-10 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-blue-600/30">
                      01
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                      <ScanSearch className="w-4 h-4" />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-blue-600 tracking-wider uppercase">
                      INGESTION &amp; SEALING
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                      Collect &amp; Cryptographically Seal
                    </h3>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Ingests screenshots, exported chat archives, UPI slips, and server logs. Computes dual SHA-256 and BLAKE3 digests on ingestion and commits to an immutable WORM ledger with RFC-3161 timestamps.
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400 font-medium">WORM Vault</span>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    SHA-256 / BLAKE3
                  </span>
                </div>
              </div>

              {/* Stage 2 */}
              <div className="cf-card p-6 flex flex-col justify-between hover:-indigo-400 hover: transition group">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="w-10 h-10 rounded-full bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-indigo-600/30">
                      02
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                      <Layers className="w-4 h-4" />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase">
                      INTELLIGENCE EXTRACTION
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                      Extract &amp; Correlate Entities
                    </h3>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Extracts 9 forensic entity classes via OCR bounding boxes and NLP heuristics—isolating phone numbers, UPI handles, IFSC codes, wallet addresses, and URLs across disparate files.
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400 font-medium">Multi-Modal NLP</span>
                  <span className="text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    Pixel Bounding
                  </span>
                </div>
              </div>

              {/* Stage 3 */}
              <div className="cf-card p-6 flex flex-col justify-between hover:-amber-400 hover: transition group">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="w-10 h-10 rounded-full bg-amber-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-amber-600/30">
                      03
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-amber-700 tracking-wider uppercase">
                      TIMELINE SYNTHESIS
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                      Reconstruct Attack Timeline
                    </h3>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Sequences events chronologically along the MITRE ATT&amp;CK kill-chain. Cross-checks camera EXIF metadata against OCR timestamps to detect forged transaction receipts and spoofed communications.
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400 font-medium">MITRE Matrix</span>
                  <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    EXIF Tamper Check
                  </span>
                </div>
              </div>

              {/* Stage 4 */}
              <div className="cf-card p-6 flex flex-col justify-between hover:-emerald-400 hover: transition group">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="w-10 h-10 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-emerald-600/30">
                      04
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                      <FileCheck2 className="w-4 h-4" />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 tracking-wider uppercase">
                      LEGAL PROSECUTION
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                      Verify Integrity &amp; Export Dossier
                    </h3>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Validates cryptographic Merkle chain continuity and generates court-ready forensic dossiers compliant with ISO/IEC 27037 standards, exportable as signed PDFs and STIX 2.1 packages.
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400 font-medium">Judicial Ready</span>
                  <span className="text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Section 65B PDF
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            4. FORENSIC CAPABILITY SECTION (Purpose-Built Distinct Visual Modules)
            ========================================================================= */}
        <section id="capabilities" className="scroll-mt-24 sm:scroll-mt-28 space-y-8">
          <div className="border-b border-slate-200 pb-4">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
              ENGINEERED FORENSIC CAPABILITIES
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Built for evidentiary rigor, not superficial metrics
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Capability 1: Technical Evidence & Monospace Audit Terminal (7 Cols) */}
            <div className="cf-card lg:col-span-7 p-6 sm:p-7 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
                      <Binary className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">
                        Evidence Integrity Verification &amp; WORM Vault
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Zero-trust immutability with instant 1-byte tamper detection
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                    RFC-3161 LEDGER
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Every ingested evidence file is sealed immediately with 256-bit SHA-256 and BLAKE3 keyed hashes. Each modification or verification event is linked to the previous entry’s cryptographic hash, forming an unbroken Merkle audit trail.
                </p>

                {/* Purpose-Built Technical Artifact: Monospace Hash Verification Terminal */}
                <div className="rounded-xl bg-slate-900 text-slate-100 border border-slate-800 p-4 font-mono text-[11px] space-y-2.5 shadow-inner">
                  <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
                    <span className="font-bold flex items-center gap-1.5 text-slate-200">
                      <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                      <span>CUSTODY_VERIFICATION_LEDGER</span>
                    </span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[10px]">
                      <CheckCircle2 className="w-3 h-3" />
                      CHAIN VALID (0 TAMPER)
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-slate-300 truncate">
                      <span className="text-cyan-400">SHA256:</span> e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                    </div>
                    <div className="text-slate-300 truncate">
                      <span className="text-cyan-400">BLAKE3:</span> 31a0e9f42b8e0176cd39a04a11f87b8d4e92a101f84b1d6e...
                    </div>
                    <div className="text-slate-400 text-[10px] pt-1 border-t border-slate-800 flex items-center justify-between">
                      <span>PREV_HASH: a7d9e1c4802f038d...</span>
                      <span className="text-cyan-300 font-semibold">STORAGE: WORM IMMUTABLE</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  Automated verification available across all cases
                </span>
                <button
                  onClick={handleAuditClick}
                  disabled={isAuditing}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <Fingerprint className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isAuditing ? 'Auditing Vault...' : 'Run Vault Audit'}</span>
                </button>
              </div>
            </div>

            {/* Capability 2: Dark Optical Telemetry Tile - OCR & Multi-Modal Extraction (5 Cols) */}
            <div className="lg:col-span-5 rounded-2xl bg-[#0B0F19] border border-slate-800 p-6 sm:p-7 flex flex-col justify-between shadow-2xl text-slate-100 min-w-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-cyan-950/80 text-cyan-400 border border-cyan-800/80 flex items-center justify-center">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-white">
                        OCR &amp; Entity Extraction
                      </h3>
                      <p className="text-xs text-slate-400 font-medium">
                        9-Class automated forensic intelligence
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    98.4% CONF
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Scans image screenshots and text documents to detect and normalize 9 critical forensic classes with pixel coordinate bounding boxes.
                </p>

                {/* Optical Bounding Box Coordinate Telemetry */}
                <div className="space-y-2 pt-1 font-mono text-[11px]">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                      <span className="font-bold text-slate-200 truncate">UPI: apex.verify.settlement@okaxis</span>
                    </div>
                    <span className="text-[10px] text-cyan-400 shrink-0 font-bold">[X:142 Y:388] · 99.4%</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      <span className="font-bold text-slate-200 truncate">PHONE: +919820411892</span>
                    </div>
                    <span className="text-[10px] text-amber-400 shrink-0 font-bold">[VoIP Lure] · 98.9%</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <span className="font-bold text-slate-200 truncate">WALLET: TQn9Y2khEsLJW1ChV...</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 shrink-0 font-bold">[Tron USDT] · 97.6%</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between relative z-10">
                <span>Confidence scoring calibrated via Tesseract &amp; Regex</span>
                <span className="font-bold font-mono text-cyan-400">Normalized Bounds</span>
              </div>
            </div>

            {/* Capability 3: Dark Technical Telemetry Tile - Graph Centrality & Dijkstra (6 Cols) */}
            <div className="lg:col-span-6 rounded-2xl bg-[#0B0F19] border border-slate-800 p-6 sm:p-7 flex flex-col justify-between shadow-2xl text-slate-100 min-w-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-950/80 text-indigo-400 border border-indigo-800/80 flex items-center justify-center">
                      <Network className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-white">
                        Graph Centrality Tracing
                      </h3>
                      <p className="text-xs text-slate-400 font-medium">
                        JGraphT 1.5.2 topological analysis
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                    DIJKSTRA 5-HOP
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Identifies primary fraud kingpins using PageRank and Betweenness Centrality. Traces shortest laundering paths using deterministic Dijkstra pathfinding.
                </p>

                {/* Graph Flow Visualization */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Target Mule Centrality:</span>
                    <span className="font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                      0.941 PageRank
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-300 font-mono py-1 overflow-x-auto">
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 shrink-0">Lure SMS</span>
                    <span className="text-cyan-400">→</span>
                    <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-700 text-amber-300 font-bold shrink-0">Vikram Singh (Mule L1)</span>
                    <span className="text-cyan-400">→</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 font-bold shrink-0">USDT Off-Ramp</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Deterministic Dijkstra Shortest Path: 5 hops from lure to crypto cashout
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between relative z-10">
                <span>VISLABS &amp; CyberX Dual Topological Modes</span>
                <span className="font-bold font-mono text-indigo-400">Active Map</span>
              </div>
            </div>

            {/* Capability 4: Light Mineral Card - Timeline Anomaly & Court Dossier (6 Cols) */}
            <div className="cf-card lg:col-span-6 p-6 sm:p-7 flex flex-col justify-between min-w-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">
                        Timeline Drift &amp; Court Dossier
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        EXIF audit + Section 65B compliance
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ISO/IEC 27037
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Surfaces EXIF clock-skew tampering when image metadata predates visible payment execution timestamps. Automatically packages verified evidence into court-admissible dossiers.
                </p>

                {/* Purpose-Built Comparative Metadata Display */}
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-[11px] space-y-2 text-amber-900">
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="text-slate-600">EXIF Camera Header:</span>
                    <span className="font-bold">14:22:08 UTC</span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="text-slate-600">Receipt Text Print:</span>
                    <span className="font-bold">14:22:08 UTC</span>
                  </div>
                  <div className="pt-1.5 border-t border-amber-200/80 flex items-center justify-between font-bold text-[10px]">
                    <span>Temporal Drift: Δ0.00s</span>
                    <span className="text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                      VALID (PASS)
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-4 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Section 65B Indian Evidence Act Validated</span>
                <span className="font-bold text-amber-700">Tamper Guard</span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            5. SAMPLE INVESTIGATIONS AND ENTRY FLOW (Featured vs. Secondary)
            ========================================================================= */}
        <section id="cases" className="scroll-mt-24 sm:scroll-mt-28 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
                SAMPLE INVESTIGATION CASE FILES
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Pre-loaded forensic case data
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                Explore real, verified forensic scenarios pre-loaded with evidence artifacts, OCR bounding boxes, entity graphs, and timeline events.
              </p>
            </div>

            <button
              onClick={() => handlePrimaryAction('OVERVIEW')}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-2 self-start sm:self-auto transition shadow-sm cursor-pointer"
            >
              <span>
                {isAuthenticated ? 'Open Selected Case' : 'Sign In to Inspect'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Equal 2-Column Sample Cases Grid (No orphan row) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {cases.map((c) => {
              const isSelected = activeCase?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    onSelectCase(c.id);
                    handlePrimaryAction('OVERVIEW');
                  }}
                  className={`rounded-2xl border p-6 sm:p-7 transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-blue-50/40 border-blue-600 shadow-md ring-2 ring-blue-600/20'
                      : 'bg-white hover:bg-slate-50/80 border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="space-y-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-extrabold text-blue-600">
                          {c.caseNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          SAMPLE CASE
                        </span>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                          c.severity === 'CRITICAL'
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {c.severity} · RISK {c.riskScore}/100
                      </span>
                    </div>

                    <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                      {c.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-3">
                      {c.summary}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-200/90 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 text-slate-500 font-medium">
                      <div>
                        Lead: <strong className="text-slate-900 font-bold">{c.leadInvestigatorName}</strong>
                      </div>
                      {c.estimatedLossUsd > 0 && (
                        <div className="border-l border-slate-300 pl-3">
                          Exposure: <strong className="text-red-700 font-bold">${c.estimatedLossUsd.toLocaleString()} USD</strong>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 font-bold text-blue-600 hover:text-blue-700 transition">
                      <span>{isAuthenticated ? 'Open in Workspace' : 'Inspect Case in Workspace'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* =========================================================================
            6. BOTTOM FORENSIC PERSONA ENTRY BANNER (Solid, High-Contrast)
            ========================================================================= */}
        <section className="cf-card-dark text-white p-7 sm:p-10 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Key className="w-4 h-4" />
              <span>TESTED WITH 3 INVESTIGATOR ROLES</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Ready to explore the investigation workspace?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Sign in with 1-click Demo Personas (Lead Investigator, Forensic Analyst, or Judicial Auditor) to inspect evidence integrity, query the knowledge graph, and generate compliant court dossiers.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-slate-400">
              <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300">
                • Lead Investigator
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300">
                • Forensic Analyst
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300">
                • Judicial Auditor
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => handlePrimaryAction('OVERVIEW')}
              className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-md shadow-blue-600/30 transition cursor-pointer"
            >
              <span>
                {isAuthenticated
                  ? 'Enter Investigation Workspace'
                  : 'Launch Demo Investigator Portal'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      </main>

      {/* Compact Forensic Footer */}
      <footer className="w-full border-t border-slate-200 bg-white py-5 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-slate-900">CyberFusion X</span>
            <span>— Digital Forensics &amp; Fraud Reconstruction Platform</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Java 21 LTS · Jakarta Servlet 6.1 · React 18 · Vite · Tailwind CSS
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomeLandingView;
