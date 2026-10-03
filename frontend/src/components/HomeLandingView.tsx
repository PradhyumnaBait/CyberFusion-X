import React, { useState } from 'react';
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
  Server,
  LogIn,
  UserPlus,
  Terminal,
  BookOpen,
} from 'lucide-react';
import { ForensicCaseSummary } from '../types';

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
  const [scanProgress, setScanProgress] = useState<number>(64);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  const triggerInteractiveScan = () => {
    setIsScanning(true);
    setScanProgress(18);
    setTimeout(() => setScanProgress(49), 220);
    setTimeout(() => setScanProgress(82), 450);
    setTimeout(() => {
      setScanProgress(100);
      setIsScanning(false);
      onRunGlobalVerify();
    }, 750);
  };

  const handlePrimaryAction = (targetTab: WorkspaceTabType = 'OVERVIEW') => {
    if (isAuthenticated) {
      onNavigate(targetTab);
    } else {
      onOpenAuthPortal('LOGIN');
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      {/* Standalone Public Home Navigation Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-8 py-4 shadow-xs">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900">
                  CyberFusion <span className="text-blue-600">X</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  JAVA 21 · JAKARTA SERVLET 6.1
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                AI-Powered Digital Forensics, Cryptographic Chain-of-Custody &amp; Fraud Reconstruction System
              </p>
            </div>
          </div>

          {/* Section Jump Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-bold text-slate-600">
            <a href="#problem" className="hover:text-blue-600 transition">
              Problem &amp; Solution
            </a>
            <a href="#workflow" className="hover:text-blue-600 transition">
              5-Stage Workflow
            </a>
            <a href="#architecture" className="hover:text-blue-600 transition">
              System Architecture
            </a>
            <a href="#cases" className="hover:text-blue-600 transition">
              Live Fraud Cases
            </a>
          </nav>

          {/* Auth / Portal Entry Buttons */}
          <div className="flex items-center gap-2.5">
            {isAuthenticated ? (
              <button
                onClick={() => onNavigate('OVERVIEW')}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-md shadow-blue-600/20 transition"
              >
                <span>Return to Forensic Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => onOpenAuthPortal('LOGIN')}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold flex items-center gap-1.5 transition"
                >
                  <LogIn className="w-3.5 h-3.5 text-blue-600" />
                  <span>Login / Demo Users</span>
                </button>
                <button
                  onClick={() => onOpenAuthPortal('SIGNUP')}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-slate-900/15 transition"
                >
                  <UserPlus className="w-3.5 h-3.5 text-orange-400" />
                  <span>Sign Up</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 space-y-12">
        {/* HERO SECTION (Modeled on image-3.png & image-2.png) */}
        <section className="relative rounded-3xl overflow-hidden bg-white border border-slate-200/90 shadow-xl shadow-slate-200/50">
          <div
            className="absolute inset-0 pointer-events-none opacity-60"
            style={{
              backgroundImage:
                'radial-gradient(circle at 82% 20%, rgba(251, 146, 60, 0.16), transparent 42%), radial-gradient(circle at 18% 80%, rgba(37, 99, 235, 0.10), transparent 45%)',
            }}
          />

          <div className="relative z-10 px-6 py-10 sm:px-12 sm:py-14 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left 7 Columns: Project Overview & Primary Auth CTA */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200/80 text-orange-700 text-xs font-semibold tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                <span>
                  CYBERFUSION X · AI-POWERED DIGITAL FORENSICS &amp; FRAUD RECONSTRUCTION
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
                Scattered Digital Evidence,{' '}
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500 bg-clip-text text-transparent">
                  Reconstructed Into Court-Admissible Truth.
                </span>
              </h1>

              <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl">
                Cybercrime and financial fraud investigations often involve scattered digital evidence—screenshots, WhatsApp/SMS lures, bank/UPI receipts, phone numbers, crypto wallets, and URLs.{' '}
                <strong className="text-slate-900">CyberFusion X</strong> automatically extracts entities via OCR &amp; NLP, correlates relationships across an interactive visual incident graph, reconstructs chronological attack timelines, seals files with SHA-256 &amp; BLAKE3 hashes, and exports court-ready forensic dossiers.
              </p>

              {/* Primary CTA Buttons leading to Login/Signup/Demo Users */}
              <div className="flex flex-wrap items-center gap-3.5 pt-1">
                <button
                  onClick={() => handlePrimaryAction('OVERVIEW')}
                  className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center gap-2.5 shadow-lg shadow-slate-900/15 transition cursor-pointer"
                >
                  <span>
                    {isAuthenticated
                      ? 'Open Forensic Workspace'
                      : 'Sign In / Launch with Demo Users'}
                  </span>
                  <span className="w-6 h-6 rounded-lg bg-orange-500 text-white flex items-center justify-center">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </button>

                {!isAuthenticated && (
                  <button
                    onClick={() => onOpenAuthPortal('SIGNUP')}
                    className="px-5 py-3.5 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-sm flex items-center gap-2 transition cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 text-blue-600" />
                    <span>Create Investigator Account</span>
                  </button>
                )}

                <a
                  href="#workflow"
                  className="px-5 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-sm flex items-center gap-2 shadow-xs transition"
                >
                  <BookOpen className="w-4 h-4 text-slate-500" />
                  <span>Explore System Architecture</span>
                </a>
              </div>

              {/* Project Highlights Metrics */}
              <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Backend Engine
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                    Java 21 + Servlet 6.1
                  </div>
                  <div className="text-[11px] text-blue-600 font-medium">
                    11 Jakarta @WebServlets
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Dual-Hash Seal
                  </div>
                  <div className="text-sm font-extrabold text-emerald-700 mt-0.5">
                    SHA-256 + BLAKE3
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    RFC-3161 &amp; Merkle Chain
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Graph Engine
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                    JGraphT 1.5.2
                  </div>
                  <div className="text-[11px] text-indigo-600 font-medium">
                    PageRank &amp; Dijkstra
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Dossier Export
                  </div>
                  <div className="text-sm font-extrabold text-orange-600 mt-0.5">
                    PDF 1.7 + STIX 2.1
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    ISO/IEC 27037 Compliant
                  </div>
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Interactive Cryptographic Scan Dial Card (modeled on image-2.png & image-3.png) */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl bg-gradient-to-b from-slate-50 to-white border border-slate-200/90 p-6 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Cryptographic Evidence Scanner
                    </span>
                  </div>
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    SHA-256 · BLAKE3
                  </span>
                </div>

                {/* Circular Scan Progress Dial */}
                <div className="py-5 flex flex-col items-center justify-center relative">
                  <div className="w-44 h-44 rounded-full bg-white border-8 border-slate-100 shadow-inner flex flex-col items-center justify-center relative">
                    <svg
                      className="absolute inset-0 w-full h-full -rotate-90"
                      viewBox="0 0 120 120"
                    >
                      <circle
                        cx="60"
                        cy="60"
                        r="52"
                        fill="none"
                        stroke="#f1f5f9"
                        strokeWidth="8"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="52"
                        fill="none"
                        stroke="url(#homeDialGrad)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={326.7}
                        strokeDashoffset={326.7 - (326.7 * scanProgress) / 100}
                        className="transition-all duration-300"
                      />
                      <defs>
                        <linearGradient
                          id="homeDialGrad"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
                          <stop offset="0%" stopColor="#f97316" />
                          <stop offset="50%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <span className="text-3xl font-black text-slate-900 tracking-tight">
                      {scanProgress}%
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mt-1">
                      {isScanning ? 'Verifying Vault...' : 'WORM Vault Ready'}
                    </span>
                  </div>

                  <button
                    onClick={triggerInteractiveScan}
                    className="mt-5 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition cursor-pointer flex items-center gap-2"
                  >
                    <Fingerprint className="w-4 h-4" />
                    <span>
                      {isScanning
                        ? 'Recomputing Hashes...'
                        : 'Test Live SHA-256 / BLAKE3 Audit'}
                    </span>
                  </button>
                </div>

                {/* Live Multi-Layer Detection Strip */}
                <div className="space-y-2 pt-3 border-t border-slate-200/80 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                    <span className="font-semibold text-slate-700 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      OCR + 9-Class Entity Extractor
                    </span>
                    <span className="font-mono text-[11px] text-emerald-700 font-bold">
                      ACTIVE
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                    <span className="font-semibold text-slate-700 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      EXIF vs. Content Timestamp Anomaly Check
                    </span>
                    <span className="font-mono text-[11px] text-blue-700 font-bold">
                      ENABLED
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 1: PROBLEM STATEMENT & CORE CAPABILITIES */}
        <section id="problem" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 p-7 shadow-xs space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-extrabold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>THE DIGITAL FORENSICS CHALLENGE</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              Why Traditional Fraud Investigations Stall
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Modern cybercrime and financial fraud leave behind fragmented digital trails: WhatsApp/Telegram phishing screenshots, spoofed SMS alerts, IMPS/UPI transaction receipts, burner phone numbers, mule bank accounts, and cryptocurrency liquidation hashes.
            </p>
            <ul className="space-y-2.5 text-xs text-slate-700 pt-1">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  <strong>Siloed Artifacts:</strong> Investigators manually inspect dozens of images and logs without automated entity cross-referencing.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  <strong>Timestamp Manipulation:</strong> Fraudsters forge receipt timestamps while forgetting EXIF metadata headers—hard to spot by eye.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  <strong>Fragile Chain-of-Custody:</strong> Without immediate cryptographic hashing and an immutable audit ledger, digital evidence can be challenged in court.
                </span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-7 shadow-xs space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-extrabold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>THE CYBERFUSION X SOLUTION</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              End-to-End Automated Forensic Intelligence
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="text-xs font-extrabold text-blue-700 uppercase">
                  1. Multi-Artifact OCR &amp; NLP Extraction
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Automatically extracts People, Phones, Emails, Bank/UPI IDs, Crypto Wallets, Transaction IDs, URLs, IPs, and Messages with pixel bounding boxes.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="text-xs font-extrabold text-indigo-700 uppercase">
                  2. Dual-Mode Visual Incident Graph
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Interactive VISLABS Knowledge Graph &amp; CyberX Activity Map powered by JGraphT PageRank, Betweenness Centrality, and Dijkstra pathfinding.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="text-xs font-extrabold text-orange-700 uppercase">
                  3. Chronological Kill-Chain Timeline
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Reconstructs every event from Initial Lure to Cash-Out and flags EXIF vs. OCR timestamp tampering automatically.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="text-xs font-extrabold text-emerald-700 uppercase">
                  4. Cryptographic WORM Vault &amp; Dossier
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Seals every file with SHA-256 + BLAKE3, detects 1-byte tampering, and exports ISO/IEC 27037 PDF, STIX 2.1, and Markdown court reports.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: SEQUENCED 5-STAGE FORENSIC WORKFLOW */}
        <section
          id="workflow"
          className="bg-white rounded-3xl border border-slate-200/90 p-7 sm:p-9 shadow-sm space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
                SEQUENCED INVESTIGATION PIPELINE
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">
                How CyberFusion X Reconstructs an Incident in 5 Stages
              </h2>
            </div>
            <button
              onClick={() => handlePrimaryAction('OVERVIEW')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-1.5 self-start sm:self-auto transition"
            >
              <span>
                {isAuthenticated
                  ? 'Jump to Active Investigation'
                  : 'Sign In with Demo User to Try Workflow'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              {
                step: 'STAGE 01',
                title: 'Evidence Ingestion & Hash Seal',
                desc: 'Upload screenshots, receipts, chats, or logs. Computes SHA-256 + BLAKE3 digests, RFC-3161 token, and EXIF metadata.',
                icon: ScanSearch,
                badge: 'Evidence Vault',
                color: 'text-blue-600 bg-blue-50 border-blue-200',
              },
              {
                step: 'STAGE 02',
                title: 'AI OCR & Entity Extraction',
                desc: 'Extracts UPI IDs, bank accounts, phones, crypto wallets, URLs, IPs, and transaction amounts with bounding boxes.',
                icon: Layers,
                badge: '9 Entity Classes',
                color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
              },
              {
                step: 'STAGE 03',
                title: 'Knowledge & CyberX Graph',
                desc: 'Correlates shared entities across evidence files, scores kingpin centrality via PageRank, and traces shortest paths.',
                icon: Network,
                badge: 'JGraphT Engine',
                color: 'text-violet-600 bg-violet-50 border-violet-200',
              },
              {
                step: 'STAGE 04',
                title: 'Attack Timeline & Anomalies',
                desc: 'Orders events across the MITRE kill-chain and detects EXIF vs. content timestamp forgery.',
                icon: Clock,
                badge: 'Discovery Board',
                color: 'text-orange-600 bg-orange-50 border-orange-200',
              },
              {
                step: 'STAGE 05',
                title: 'Integrity Audit & Court Report',
                desc: 'Verifies the hash-chained custody ledger, tests tamper detection, and generates signed PDF 1.7 & STIX 2.1 reports.',
                icon: FileCheck2,
                badge: 'ISO/IEC 27037',
                color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="rounded-2xl bg-slate-50/80 border border-slate-200/90 p-5 flex flex-col justify-between hover:bg-white hover:shadow-md transition"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-black tracking-wider text-slate-400">
                        {item.step}
                      </span>
                      <div
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center ${item.color}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900 mb-1.5">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/70 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {item.badge}
                    </span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SECTION 3: SOFTWARE SYSTEM ARCHITECTURE & JAVA SERVLET BLUEPRINT */}
        <section
          id="architecture"
          className="bg-white rounded-3xl border border-slate-200/90 p-7 sm:p-9 shadow-sm space-y-6"
        >
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
              ENTERPRISE SOFTWARE ENGINEERING ARCHITECTURE
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              Java 21 LTS + Jakarta Servlet 6.1 Backend &amp; React 18 Frontend Stack
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Built with a clean layered servlet architecture, multi-layered cryptographic verification, and real-time Server-Sent Events (SSE).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Layer 1 */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Jakarta Servlet 6.1 API Layer
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    11 @WebServlet Controllers &amp; 3 @WebFilters
                  </p>
                </div>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600 font-mono">
                <li>• CaseServlet (/api/v1/cases/*)</li>
                <li>• EvidenceUploadServlet (/api/v1/evidence/*)</li>
                <li>• OcrAndNlpExtractionServlet (/api/v1/extract/*)</li>
                <li>• IncidentGraphServlet (/api/v1/graph/*)</li>
                <li>• TimelineReconstructionServlet (/api/v1/timeline/*)</li>
                <li>• CryptographicIntegrityServlet (/api/v1/integrity/*)</li>
                <li>• ReportExportServlet (/api/v1/reports/*)</li>
                <li>• ForensicEventStreamServlet (/api/v1/events/stream)</li>
              </ul>
            </div>

            {/* Layer 2 */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Forensic Intelligence Engines
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    OCR/NLP, JGraphT 1.5.2 &amp; Risk Scoring
                  </p>
                </div>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600">
                <li>
                  • <strong>OcrAndNlpEngine:</strong> Extracts 9 entity classes with normalized confidence &amp; pixel coordinates.
                </li>
                <li>
                  • <strong>IncidentGraphService:</strong> Computes PageRank, Betweenness Centrality, and Dijkstra shortest path.
                </li>
                <li>
                  • <strong>TimelineReconstructionService:</strong> Maps events to MITRE kill-chain &amp; detects EXIF timestamp drift.
                </li>
                <li>
                  • <strong>RiskScoringService:</strong> Evaluates heuristic rules into a 0–100 threat score.
                </li>
              </ul>
            </div>

            {/* Layer 3 */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Cryptographic WORM Vault &amp; Ledger
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Zero-Trust Evidence Storage &amp; Audit Chain
                  </p>
                </div>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600">
                <li>
                  • <strong>Dual Hashing:</strong> 256-bit SHA-256 + keyed BLAKE3 digest on every ingested byte stream.
                </li>
                <li>
                  • <strong>Merkle Custody Chain:</strong> Every action links <code className="font-mono">previousEntryHash → currentEntryHash</code>.
                </li>
                <li>
                  • <strong>1-Byte Tamper Sandbox:</strong> Demonstrates real-time <code className="font-mono">TAMPER_DETECTED</code> alerting and WORM recovery.
                </li>
                <li>
                  • <strong>RBAC Security:</strong> Lead Investigator, Forensic Analyst, and Judicial Auditor personas.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* SECTION 4: PRE-LOADED LIVE FRAUD INVESTIGATIONS & LOGIN CTA */}
        <section
          id="cases"
          className="bg-white rounded-3xl border border-slate-200/90 p-7 sm:p-9 shadow-sm space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-orange-600 mb-1">
                PRE-LOADED DIGITAL FORENSIC INVESTIGATIONS
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">
                Ready-to-Explore Cybercrime Case Files
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Sign in with any Demo Investigator account on the next screen to inspect these pre-loaded cases or create your own investigation.
              </p>
            </div>
            <button
              onClick={() => handlePrimaryAction('OVERVIEW')}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold flex items-center gap-2 self-start sm:self-auto transition"
            >
              <LogIn className="w-4 h-4 text-orange-400" />
              <span>
                {isAuthenticated
                  ? 'Open Selected Case in Workspace'
                  : 'Proceed to Login / Demo Users'}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {cases.map((c) => {
              const isSelected = activeCase?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    onSelectCase(c.id);
                    handlePrimaryAction('OVERVIEW');
                  }}
                  className={`p-5 rounded-2xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/50 border-blue-500 shadow-sm'
                      : 'bg-slate-50 hover:bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-blue-600">
                      {c.caseNumber}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                      Risk Score: {c.riskScore}/100 ({c.severity})
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 mb-1.5">
                    {c.title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2 mb-4">
                    {c.summary}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-3 border-t border-slate-200/80">
                    <span>
                      Lead:{' '}
                      <strong className="text-slate-700">
                        {c.leadInvestigatorName}
                      </strong>
                    </span>
                    <span className="font-bold text-blue-600 flex items-center gap-1">
                      {isAuthenticated
                        ? 'Inspect Case →'
                        : 'Sign In to Inspect →'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* BOTTOM CALL-TO-ACTION BANNER */}
        <section className="rounded-3xl bg-slate-900 text-white p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-orange-400 uppercase tracking-wider">
              <Terminal className="w-4 h-4" />
              <span>Ready to Start Your Investigation?</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold">
              Access the Investigator Portal &amp; Demo Personas
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Continue to the Login / Sign Up portal to sign in with 1-click Demo Users (Lead Investigator, Forensic Analyst, or Judicial Auditor) or register your own investigator credentials.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => handlePrimaryAction('OVERVIEW')}
              className="px-6 py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-orange-500/25 transition"
            >
              <span>
                {isAuthenticated
                  ? 'Enter Forensic Workspace'
                  : 'Go to Login & Demo Users Portal'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};
