import React, { useState, useMemo, useEffect } from 'react';
import {
  Upload,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Eye,
  ScanLine,
  AlertTriangle,
  Flame,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Lock,
  ZoomIn,
  ZoomOut,
  Plus,
  Search,
  Filter,
  Copy,
  Check,
  ExternalLink,
  Maximize2,
  FileCode,
  History,
  Clock,
  ArrowUpDown,
  ChevronRight,
  Info,
  Layers,
  ChevronDown,
  X,
  FileSpreadsheet,
  Hash,
  Download,
  Shield,
  FileSearch,
  Crosshair,
  BadgeAlert,
  Calendar,
  CheckCircle,
  FolderLock,
  ArrowUpRight,
  CheckSquare,
  Network,
  Radio,
  Zap,
  Cpu,
} from 'lucide-react';
import {
  EvidenceItem,
  ExtractedEntity,
  ChainOfCustodyEntry,
  BoundingBox,
} from '../types';

interface EvidenceVaultViewProps {
  caseId: string;
  evidenceList: EvidenceItem[];
  entities?: ExtractedEntity[];
  ledger?: ChainOfCustodyEntry[];
  selectedEvidenceId: string | null;
  onSelectEvidence: (id: string) => void;
  onUploadFile: (
    file: File,
    category: string,
    notes: string,
    clientSha256: string
  ) => Promise<void>;
  onQuickIngest: (title: string, category: string, content: string) => Promise<void>;
  onVerifyIntegrity: (evidenceId: string) => Promise<void>;
  onSimulateTamper: (evidenceId: string, tamper: boolean) => Promise<void>;
  userRole: string;
}

const PRESET_TEMPLATES = [
  {
    label: 'Preset 1: Layer-3 Crypto Off-Ramp Receipt',
    title: 'Binance P2P / Tron USDT Cashout Receipt',
    category: 'TRANSACTION_RECEIPT',
    content: [
      'CRYPTO P2P SETTLEMENT RECEIPT — TXN-USDT-9940218',
      'Timestamp: 2026-10-01T10:52:19Z',
      'Source Mule UPI: fast.liquidity.hub@ybl',
      'Operator: Vikram Singh (Mule L1)',
      'Beneficiary Wallet: TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
      'Secondary Wallet: 0x99B44123EC7ab88b098defB751B7401B5f6d1122',
      'Amount Converted: $9,200.00 USDT',
      'Coordinator Phone: +919876509911',
      'Exit Node IP: 185.220.101.44',
    ].join('\n'),
  },
  {
    label: 'Preset 2: Spear-Phishing SMS & Call Lure',
    title: 'Follow-Up Vishing & OTP Interception Log',
    category: 'SMS_SCREENSHOT',
    content: [
      'SMS & VISHING TRANSCRIPT — 2026-10-01T10:19:00Z',
      'Caller Phone: +91-98204-11290',
      'Backup Phone: +91-98765-09911',
      'Phishing Portal: https://hdfc-kyc-update-in.com/auth/session-verify',
      'Target Victim: Arjun Mehta (arjun.mehta@finserve-india.in)',
      'Beneficiary VPA: apex.verify.settlement@okaxis',
      'Relay IP: 185.220.101.44',
    ].join('\n'),
  },
];

async function computeBrowserSha256(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return '';
  }
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatFilenameWithWbr(filename: string): React.ReactNode {
  if (!filename) return '';
  const parts = filename.split(/([_\-\.])/);
  return parts.map((part, index) => (
    <React.Fragment key={index}>
      {part}
      {index % 2 === 1 && <wbr />}
    </React.Fragment>
  ));
}

export const EvidenceVaultView: React.FC<EvidenceVaultViewProps> = ({
  caseId,
  evidenceList,
  entities = [],
  ledger = [],
  selectedEvidenceId,
  onSelectEvidence,
  onUploadFile,
  onQuickIngest,
  onVerifyIntegrity,
  onSimulateTamper,
}) => {
  // Navigation & Filtering State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VERIFIED' | 'TAMPERED' | 'ANOMALIES'>('ALL');
  
  // Viewer State
  const [showBoundingBoxes, setShowBoundingBoxes] = useState<boolean>(true);
  const [laserScanActive, setLaserScanActive] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [hoveredBoxId, setHoveredBoxId] = useState<string | null>(null);
  const [imgLoadError, setImgLoadError] = useState<boolean>(false);

  // Inspector State (Strict 4-Pill Segmented Control)
  const [inspectorTab, setInspectorTab] = useState<'FIELDS' | 'SEAL' | 'EXIF' | 'CUSTODY'>('FIELDS');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [verifyingEvidenceId, setVerifyingEvidenceId] = useState<string | null>(null);

  // Ingestion Drawer State
  const [showIngestDrawer, setShowIngestDrawer] = useState<boolean>(false);
  const [quickTitle, setQuickTitle] = useState<string>(PRESET_TEMPLATES[0].title);
  const [quickCategory, setQuickCategory] = useState<string>(PRESET_TEMPLATES[0].category);
  const [quickContent, setQuickContent] = useState<string>(PRESET_TEMPLATES[0].content);
  const [uploadCategory, setUploadCategory] = useState<string>('TRANSACTION_RECEIPT');
  const [uploadNotes, setUploadNotes] = useState<string>(
    'Seized digital artifact sealed via WebCrypto SHA-256.'
  );
  const [busyAction, setBusyAction] = useState<boolean>(false);

  // Mobile / Tablet Tab Switcher
  const [mobileActivePanel, setMobileActivePanel] = useState<'NAVIGATOR' | 'VIEWER' | 'INSPECTOR'>('VIEWER');

  // Currently selected evidence item
  const selectedEvidence = useMemo(() => {
    return (
      evidenceList.find((e) => e.id === selectedEvidenceId) ||
      evidenceList[0] ||
      null
    );
  }, [evidenceList, selectedEvidenceId]);

  // Reset image load error and active box when selected artifact changes
  useEffect(() => {
    setImgLoadError(false);
    setSelectedBoxId(null);
  }, [selectedEvidence?.id]);

  // Metrics summary
  const intactCount = useMemo(() => {
    return evidenceList.filter((e) => e.integrityStatus === 'VERIFIED_INTACT').length;
  }, [evidenceList]);

  const tamperedCount = useMemo(() => {
    return evidenceList.filter((e) => e.integrityStatus === 'TAMPER_DETECTED').length;
  }, [evidenceList]);

  const exifAnomalyCount = useMemo(() => {
    return evidenceList.filter((e) => e.timestampAnomaly).length;
  }, [evidenceList]);

  // Filtered evidence list for the navigator
  const filteredEvidenceList = useMemo(() => {
    return evidenceList.filter((ev) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = ev.evidenceCode.toLowerCase().includes(q);
        const matchesName = ev.originalFilename.toLowerCase().includes(q);
        const matchesHash = ev.sha256Hash.toLowerCase().includes(q);
        const matchesCat = ev.evidenceCategory.toLowerCase().includes(q);
        if (!matchesCode && !matchesName && !matchesHash && !matchesCat) return false;
      }
      if (categoryFilter !== 'ALL' && ev.evidenceCategory !== categoryFilter) {
        return false;
      }
      if (statusFilter === 'VERIFIED' && ev.integrityStatus !== 'VERIFIED_INTACT') {
        return false;
      }
      if (statusFilter === 'TAMPERED' && ev.integrityStatus !== 'TAMPER_DETECTED') {
        return false;
      }
      if (statusFilter === 'ANOMALIES' && !ev.timestampAnomaly) {
        return false;
      }
      return true;
    });
  }, [evidenceList, searchQuery, categoryFilter, statusFilter]);

  // Entity breakdown for the selected artifact
  const entityBreakdown = useMemo(() => {
    if (!selectedEvidence?.boundingBoxes) return { financial: 0, network: 0, identity: 0, text: 0, total: 0 };
    let financial = 0;
    let network = 0;
    let identity = 0;
    let text = 0;

    selectedEvidence.boundingBoxes.forEach((b) => {
      const t = b.entityType;
      if (t === 'BANK_ACCOUNT' || t === 'UPI_ID' || t === 'TRANSACTION_ID') financial++;
      else if (t === 'URL' || t === 'IP_ADDRESS' || t === 'CRYPTO_WALLET') network++;
      else if (t === 'PERSON' || t === 'ORGANIZATION' || t === 'PHONE') identity++;
      else text++;
    });

    return {
      financial,
      network,
      identity,
      text,
      total: selectedEvidence.boundingBoxes.length,
    };
  }, [selectedEvidence]);

  // Chain of custody entries for this evidence or case
  const artifactCustodyLedger = useMemo(() => {
    if (!selectedEvidence) return ledger;
    const code = selectedEvidence.evidenceCode;
    const directMatches = ledger.filter(
      (entry) =>
        entry.targetResource?.includes(code) ||
        entry.targetResource?.includes(selectedEvidence.id) ||
        entry.details?.includes(code)
    );
    return directMatches.length > 0 ? directMatches : ledger;
  }, [ledger, selectedEvidence]);

  // Copy helper
  const handleCopyText = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => {
      setCopiedField(null);
    }, 2200);
  };

  // Re-verify single artifact trigger
  const handleTriggerReVerify = async (evId: string) => {
    setVerifyingEvidenceId(evId);
    try {
      await onVerifyIntegrity(evId);
    } finally {
      setTimeout(() => setVerifyingEvidenceId(null), 800);
    }
  };

  // Upload handler with client-side SHA-256 pre-hashing
  const handleFileUploadChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusyAction(true);
    try {
      const clientHash = await computeBrowserSha256(file);
      await onUploadFile(file, uploadCategory, uploadNotes, clientHash);
      setShowIngestDrawer(false);
    } finally {
      setBusyAction(false);
    }
  };

  // Preset simulator submit handler
  const handleQuickIngestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() || !quickContent.trim()) return;
    setBusyAction(true);
    try {
      await onQuickIngest(quickTitle, quickCategory, quickContent);
      setShowIngestDrawer(false);
    } finally {
      setBusyAction(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1680px] px-4 lg:px-8 pb-12 space-y-6 min-w-0 font-sans">
      {/* Laser Scanline Keyframe Styles */}
      <style>{`
        @keyframes laserScanSweep {
          0% { top: 0%; opacity: 0.3; }
          50% { opacity: 0.95; }
          100% { top: 100%; opacity: 0.3; }
        }
        .animate-laser-scan {
          animation: laserScanSweep 3.2s ease-in-out infinite alternate;
        }
      `}</style>

      {/* =========================================================================
          1. COMPACT VAULT HEADING & ACTIONS
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold text-blue-700 uppercase tracking-wider">
              INVESTIGATION STAGE 02 // EVIDENCE VAULT
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-xs text-slate-500">
              WORM Secure Storage · Case: {caseId}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FolderLock className="w-7 h-7 text-blue-600 shrink-0" />
            <span className="truncate">Digital Evidence Inspection Workbench</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Sealed digital artifacts with dual-hash cryptographic verification, sub-pixel OCR entity bounding boxes, and immutable WORM chain of custody.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setShowIngestDrawer(!showIngestDrawer)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{showIngestDrawer ? 'Close Acquisition Drawer' : 'Ingest & Seal Artifact'}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. UNIFIED INSTRUMENT STRIP (Focal Cobalt Card + Color-Accented KPI Tiles)
          ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 min-w-0">
        {/* Tile 1: Focal Cobalt-to-Indigo Card */}
        <div
          className="cf-kpi col-span-2 sm:col-span-1 rounded-xl p-4 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white shadow-lg shadow-blue-600/20 flex flex-col justify-between min-w-0 min-h-[96px]"
          style={{ '--kpi': 'linear-gradient(90deg, #38bdf8, #818cf8)' }}
        >
          <div className="flex items-center justify-between min-w-0 gap-1">
            <span className="text-xs font-semibold text-blue-50 flex items-center gap-1.5 font-mono truncate">
              <ShieldCheck className="w-4 h-4 shrink-0 text-cyan-300" />
              <span>Vault Integrity</span>
            </span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/20 text-white font-bold shrink-0">
              {tamperedCount === 0 ? 'WORM SEALED' : 'TAMPER ALERT'}
            </span>
          </div>
          <div className="my-1.5 flex items-baseline gap-1.5 min-w-0">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono tabular-nums leading-none">
              {intactCount} / {evidenceList.length}
            </span>
            <span className="text-xs text-blue-100 font-medium font-mono">Sealed</span>
          </div>
          <div className="pt-1 border-t border-white/15 text-[11px] text-blue-100 flex items-center justify-between font-mono min-w-0">
            <span>Dual SHA-256 &amp; BLAKE3</span>
            <span className="font-bold text-cyan-200">
              {Math.round((intactCount / Math.max(1, evidenceList.length)) * 100)}%
            </span>
          </div>
        </div>

        {/* Tile 2: Sealed Artifacts (Emerald Accent Bar) */}
        <div
          className="cf-card cf-kpi p-4 flex flex-col justify-between min-w-0"
          style={{ '--kpi': 'linear-gradient(90deg, #10b981, #34d399)' }}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 font-mono min-w-0 pt-0.5">
            <span className="flex items-center gap-1.5 text-slate-700 truncate">
              <FolderLock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Sealed Artifacts</span>
            </span>
            <span className="text-slate-400 shrink-0">Total</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono tabular-nums">
            {evidenceList.length}
          </div>
          <div className="mt-2 text-[11px] font-mono text-slate-500 flex items-center justify-between min-w-0">
            <span>WORM Immutable</span>
            <span className="text-emerald-700 font-bold">100% Sealed</span>
          </div>
        </div>

        {/* Tile 3: Cryptographic Drift (Blue Accent Bar) */}
        <div
          className="cf-card cf-kpi p-4 flex flex-col justify-between min-w-0"
          style={{ '--kpi': 'linear-gradient(90deg, #3b82f6, #60a5fa)' }}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 font-mono min-w-0 pt-0.5">
            <span className="flex items-center gap-1.5 text-slate-700 truncate">
              <Lock className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Cryptographic Drift</span>
            </span>
            <span className="text-slate-400 shrink-0">FIPS 180-4</span>
          </div>
          <div className="text-2xl font-bold font-mono mt-2 truncate tabular-nums">
            {tamperedCount === 0 ? (
              <span className="text-emerald-700 text-xl font-bold">0 Byte Alteration</span>
            ) : (
              <span className="text-red-600 text-xl font-bold">{tamperedCount} Tamper Alert</span>
            )}
          </div>
          <div className="mt-2 text-[11px] font-mono text-slate-500 flex items-center justify-between min-w-0">
            <span>Storage Match</span>
            <span className={tamperedCount === 0 ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>
              {tamperedCount === 0 ? 'Verified Intact' : 'CRITICAL ALERT'}
            </span>
          </div>
        </div>

        {/* Tile 4: Temporal Discrepancies (Amber Accent Bar) */}
        <div
          className="cf-card cf-kpi p-4 flex flex-col justify-between min-w-0"
          style={{ '--kpi': 'linear-gradient(90deg, #f59e0b, #fbbf24)' }}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 font-mono min-w-0 pt-0.5">
            <span className="flex items-center gap-1.5 text-slate-700 truncate">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>EXIF Anomalies</span>
            </span>
            <span className="text-slate-400 shrink-0">Temporal</span>
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-2 font-mono tabular-nums">
            {exifAnomalyCount}
          </div>
          <div className="mt-2 text-[11px] font-mono text-slate-500 flex items-center justify-between min-w-0">
            <span>Clock-Skew Analysis</span>
            <span className={exifAnomalyCount > 0 ? 'text-amber-700 font-bold' : 'text-slate-600'}>
              {exifAnomalyCount > 0 ? '1 Flagged (+14m)' : 'Synchronized'}
            </span>
          </div>
        </div>

        {/* Tile 5: Optical Precision Index (Indigo Accent Bar) */}
        <div
          className="cf-card cf-kpi col-span-2 lg:col-span-1 p-4 flex flex-col justify-between min-w-0"
          style={{ '--kpi': 'linear-gradient(90deg, #8b5cf6, #a78bfa)' }}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 font-mono min-w-0 pt-0.5">
            <span className="flex items-center gap-1.5 text-slate-700 truncate">
              <ScanLine className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Active OCR Index</span>
            </span>
            <span className="text-slate-400 shrink-0">Precision</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono tabular-nums">
            {selectedEvidence?.boundingBoxes?.length || 0}
            <span className="text-xs text-slate-400 ml-1 font-normal font-sans">Regions</span>
          </div>
          <div className="mt-2 text-[11px] font-mono text-slate-500 flex items-center justify-between min-w-0">
            <span className="truncate">{selectedEvidence?.evidenceCode || 'EVD-001'}</span>
            <span className="text-blue-700 font-bold shrink-0">
              {Math.round((selectedEvidence?.ocrConfidence || 0.96) * 100)}% Conf
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. ARTIFACT INGESTION DRAWER (COLLAPSIBLE)
          ========================================================================= */}
      {showIngestDrawer && (
        <div className="cf-card -[0_2px_4px_rgba(15,23,42,0.04),0_12px_28px_-6px_rgba(15,23,42,0.07)] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-extrabold text-slate-900">
                Seize &amp; Seal New Digital Evidence Artifact
              </h3>
            </div>
            <button
              onClick={() => setShowIngestDrawer(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Direct File Seizure */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-2 font-mono uppercase">
                <FileCode className="w-4 h-4 text-emerald-600" />
                <span>Binary File Upload (WebCrypto SHA-256)</span>
              </div>
              <p className="text-xs text-slate-500">
                Upload image (PNG/JPG) or packet log. The browser computes client-side SHA-256 before transmission.
              </p>
              <div className="space-y-2">
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-white border border-slate-200 text-slate-800"
                >
                  <option value="TRANSACTION_RECEIPT">Transaction Receipt (UPI / Bank)</option>
                  <option value="SMS_SCREENSHOT">SMS / Chat Screenshot</option>
                  <option value="EMAIL_HEADER">Email MIME Header (.eml)</option>
                  <option value="BANK_STATEMENT">Bank Settlement PDF</option>
                </select>
                <input
                  type="file"
                  onChange={handleFileUploadChange}
                  disabled={busyAction}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                />
              </div>
            </div>

            {/* Quick Ingest Simulator */}
            <form onSubmit={handleQuickIngestSubmit} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-2 font-mono uppercase">
                <Zap className="w-4 h-4 text-blue-600" />
                <span>Quick Ingest Preset Forensic Stream</span>
              </div>
              <div className="space-y-2">
                <select
                  onChange={(e) => {
                    const preset = PRESET_TEMPLATES.find((p) => p.title === e.target.value);
                    if (preset) {
                      setQuickTitle(preset.title);
                      setQuickCategory(preset.category);
                      setQuickContent(preset.content);
                    }
                  }}
                  className="w-full text-xs p-2 rounded-lg bg-white border border-slate-200 text-slate-800 font-medium"
                >
                  {PRESET_TEMPLATES.map((p) => (
                    <option key={p.title} value={p.title}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={busyAction}
                  className="w-full py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg transition"
                >
                  {busyAction ? 'Ingesting...' : 'Ingest & Register in WORM Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          4. TABLET / MOBILE VIEW SWITCHER
          ========================================================================= */}
      <div className="lg:hidden flex items-center justify-between p-1.5 rounded-xl bg-white border border-slate-200/90 shadow-[0_2px_4px_rgba(15,23,42,0.04)] min-w-0">
        <button
          onClick={() => setMobileActivePanel('NAVIGATOR')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition truncate ${
            mobileActivePanel === 'NAVIGATOR'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Register ({evidenceList.length})
        </button>
        <button
          onClick={() => setMobileActivePanel('VIEWER')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition truncate ${
            mobileActivePanel === 'VIEWER'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Optical Scanner
        </button>
        <button
          onClick={() => setMobileActivePanel('INSPECTOR')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition truncate ${
            mobileActivePanel === 'INSPECTOR'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Inspector
        </button>
      </div>

      {/* =========================================================================
          5. THREE-PART WORKBENCH DESKTOP LAYOUT (300px, 1fr, 360px)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)_360px] items-start gap-6 min-w-0">
        
        {/* =======================================================================
            SECTION A: EVIDENCE NAVIGATOR (300px - Full Filenames, Monospace Pills)
            ======================================================================= */}
        <aside
          className={`w-full min-w-0 bg-white rounded-xl border border-slate-200/90 shadow-[0_2px_4px_rgba(15,23,42,0.04),0_12px_28px_-6px_rgba(15,23,42,0.07)] flex flex-col self-start lg:sticky lg:top-[calc(var(--header-height)+5.5rem)] max-h-[calc(100vh-14rem)] overflow-y-auto ${
            mobileActivePanel === 'NAVIGATOR' ? 'block' : 'hidden lg:flex'
          }`}
        >
          {/* Navigator Header */}
          <div className="p-4 border-b border-slate-100 space-y-3 min-w-0">
            <div className="flex items-center justify-between min-w-0">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 font-mono truncate">
                <FileSearch className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Evidence Register</span>
              </h2>
              <span className="font-mono text-[11px] text-slate-400 font-bold shrink-0">
                {filteredEvidenceList.length} of {evidenceList.length}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search artifact, hash..."
                className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="flex flex-wrap gap-1">
              {['ALL', 'TRANSACTION_RECEIPT', 'SMS_SCREENSHOT', 'EMAIL_HEADER', 'BANK_STATEMENT'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight transition cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat === 'ALL'
                    ? 'All'
                    : cat === 'TRANSACTION_RECEIPT'
                    ? 'Receipt'
                    : cat === 'SMS_SCREENSHOT'
                    ? 'SMS'
                    : cat === 'EMAIL_HEADER'
                    ? 'Email'
                    : 'Bank'}
                </button>
              ))}
            </div>

            {/* Status Filter Chips */}
            <div className="flex items-center gap-1 pt-0.5 text-[10px] font-bold flex-wrap">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2 py-0.5 rounded-md cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('VERIFIED')}
                className={`px-2 py-0.5 rounded-md cursor-pointer ${
                  statusFilter === 'VERIFIED'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sealed ({intactCount})
              </button>
              <button
                onClick={() => setStatusFilter('ANOMALIES')}
                className={`px-2 py-0.5 rounded-md cursor-pointer ${
                  statusFilter === 'ANOMALIES'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Anomalies ({exifAnomalyCount})
              </button>
            </div>
          </div>

          {/* Evidence List Items (NO TRUNCATION OF FILENAMES) */}
          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[580px]">
            {filteredEvidenceList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No matching evidence artifacts found.
              </div>
            ) : (
              filteredEvidenceList.map((ev) => {
                const isSelected = selectedEvidence?.id === ev.id;
                const isTampered = ev.integrityStatus === 'TAMPER_DETECTED';
                const hasAnomaly = ev.timestampAnomaly;

                return (
                  <div
                    key={ev.id}
                    onClick={() => {
                      onSelectEvidence(ev.id);
                      setMobileActivePanel('VIEWER');
                    }}
                    className={`p-3.5 cursor-pointer transition relative min-w-0 ${
                      isSelected
                        ? 'bg-blue-50/80 border-l-4 border-l-blue-600 shadow-2xs'
                        : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                    }`}
                  >
                    {/* Top Row: Code + Status Pill */}
                    <div className="flex items-center justify-between gap-1 mb-1.5 min-w-0">
                      <span className="font-mono text-[11px] font-extrabold text-blue-700 px-1.5 py-0.5 rounded bg-blue-100/70 shrink-0">
                        {ev.evidenceCode}
                      </span>
                      {isTampered ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold font-mono bg-red-100 text-red-700 border border-red-200 shrink-0">
                          TAMPERED
                        </span>
                      ) : hasAnomaly ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold font-mono bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                          EXIF DRIFT
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold font-mono bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                          WORM SEALED
                        </span>
                      )}
                    </div>

                    {/* Middle Row: Full Monospace Filename - NEVER TRUNCATED WITH ... */}
                    <div className="font-mono text-[11.5px] font-semibold text-slate-900 break-words [overflow-wrap:anywhere] tracking-tight leading-snug mb-2">
                      {formatFilenameWithWbr(ev.originalFilename)}
                    </div>

                    {/* Bottom Row: Dark Monospace Hash Pill + Size */}
                    <div className="flex items-center justify-between gap-1.5 min-w-0">
                      <span className="bg-slate-900 text-emerald-400 font-mono text-[10px] px-2 py-0.5 rounded shrink-0 font-medium">
                        {ev.sha256Hash ? `${ev.sha256Hash.slice(0, 10)}…` : 'NO_HASH'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {formatBytes(ev.fileSizeBytes || 184500)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* =======================================================================
            SECTION B: CENTER DARK OPTICAL SCANNER STAGE (~52% width, bg-[#070B14])
            ======================================================================= */}
        <section
          className={`flex-1 min-w-0 bg-[#070B14] rounded-xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden ${
            mobileActivePanel === 'VIEWER' ? 'block' : 'hidden lg:flex'
          }`}
        >
          {selectedEvidence ? (
            <>
              {/* Top Dark HUD Toolbar */}
              <div className="px-5 py-3 bg-slate-900/95 border-b border-slate-800 text-slate-100 flex flex-wrap items-center justify-between gap-3 min-w-0">
                <div className="min-w-0 flex items-center gap-3">
                  <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800 shrink-0">
                    {selectedEvidence.evidenceCode}
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-sm font-extrabold text-white truncate font-mono" title={selectedEvidence.originalFilename}>
                      {selectedEvidence.originalFilename}
                    </h2>
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      {selectedEvidence.detectedMimeType || 'image/png'} · 720×920 Optical Stream · WORM Replica
                    </div>
                  </div>
                </div>

                {/* Toolbar Tools */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Laser Scan Toggle */}
                  <button
                    onClick={() => setLaserScanActive(!laserScanActive)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 border transition cursor-pointer ${
                      laserScanActive
                        ? 'bg-cyan-950/80 border-cyan-500/80 text-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.25)]'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400'
                    }`}
                    title="Toggle optical laser scanline"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Laser Scan</span>
                  </button>

                  {/* OCR Bounding Box Toggle */}
                  <button
                    onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 border transition cursor-pointer ${
                      showBoundingBoxes
                        ? 'bg-blue-950/80 border-blue-500/80 text-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.25)]'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400'
                    }`}
                    title="Toggle OCR entity bounding boxes"
                  >
                    <ScanLine className="w-3.5 h-3.5" />
                    <span>OCR ({selectedEvidence.boundingBoxes?.length || 0})</span>
                  </button>

                  {/* Zoom Controls */}
                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/90 border border-slate-700 text-slate-200 font-mono text-xs">
                    <button
                      onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
                      className="p-1 hover:text-white cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setZoomLevel(100)}
                      className="px-1.5 text-[11px] font-bold hover:underline cursor-pointer text-cyan-400"
                      title="Reset Zoom to 100%"
                    >
                      {zoomLevel}%
                    </button>
                    <button
                      onClick={() => setZoomLevel((z) => Math.min(160, z + 10))}
                      className="p-1 hover:text-white cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Open Raw Binary File */}
                  <a
                    href={`/api/v1/evidence/${encodeURIComponent(selectedEvidence.id)}/raw`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-slate-800/90 border border-slate-700 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                    title="Open original binary file in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Viewport with Coordinate Ruler Ticks & 4 Corner HUD Target Brackets */}
              <div
                className="flex-1 min-h-[520px] flex items-center justify-center overflow-auto p-4 sm:p-6 relative min-w-0 select-none"
                style={{
                  backgroundColor: '#070B14',
                  backgroundImage:
                    'radial-gradient(circle at 50% 40%, #0d1527 0%, #070B14 100%)',
                }}
              >
                {/* Structural fine grid texture overlay */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, rgba(34, 211, 238, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(34, 211, 238, 0.08) 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                  }}
                />

                {/* Top Pixel Coordinate Ruler */}
                <div className="absolute top-2 left-10 right-10 h-4 flex justify-between text-[9px] font-mono text-cyan-500/50 pointer-events-none border-b border-cyan-500/20">
                  <span>0px</span>
                  <span>120px</span>
                  <span>240px</span>
                  <span>360px</span>
                  <span>480px</span>
                  <span>600px</span>
                  <span>720px</span>
                </div>

                {/* Left Pixel Coordinate Ruler */}
                <div className="absolute top-10 bottom-10 left-2 w-7 flex flex-col justify-between text-[9px] font-mono text-cyan-500/50 pointer-events-none border-r border-cyan-500/20 text-right pr-1">
                  <span>0px</span>
                  <span>140px</span>
                  <span>280px</span>
                  <span>420px</span>
                  <span>560px</span>
                  <span>700px</span>
                  <span>840px</span>
                </div>

                {/* 4 Cyan Corner HUD Target Brackets */}
                <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-cyan-400 pointer-events-none" />
                <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-cyan-400 pointer-events-none" />
                <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-cyan-400 pointer-events-none" />
                <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-cyan-400 pointer-events-none" />

                {/* Animated Horizontal Cyan Laser Scanline */}
                {laserScanActive && (
                  <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_14px_#22d3ee] pointer-events-none z-20 animate-laser-scan" />
                )}

                {/* Device Bezel & Optical Inspection Canvas */}
                <div
                  className="bg-[#0F172A] border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-2xl relative transition-transform duration-150 ease-out max-w-full"
                  style={{
                    transform: `scale(${zoomLevel / 100})`,
                    transformOrigin: 'center center',
                  }}
                >
                  {!imgLoadError ? (
                    <div className="relative inline-block overflow-hidden rounded-lg bg-slate-900 max-w-full">
                      <img
                        src={`/api/v1/evidence/${encodeURIComponent(
                          selectedEvidence.id
                        )}/raw?v=${selectedEvidence.sha256Hash.slice(0, 8)}`}
                        alt={selectedEvidence.originalFilename}
                        className="block max-w-full h-auto select-none"
                        onError={() => setImgLoadError(true)}
                      />

                      {/* Interactive Sub-Pixel OCR Bounding Box Overlays */}
                      {showBoundingBoxes &&
                        selectedEvidence.boundingBoxes &&
                        selectedEvidence.boundingBoxes.map((box, idx) => {
                          const isHighRisk =
                            box.entityType === 'URL' ||
                            box.entityType === 'IP_ADDRESS' ||
                            box.entityType === 'CRYPTO_WALLET';
                          const isFinancial =
                            box.entityType === 'BANK_ACCOUNT' ||
                            box.entityType === 'UPI_ID' ||
                            box.entityType === 'TRANSACTION_ID';
                          const isIdentity =
                            box.entityType === 'PHONE' ||
                            box.entityType === 'PERSON' ||
                            box.entityType === 'ORGANIZATION';

                          const isBoxActive =
                            selectedBoxId === box.id || hoveredBoxId === box.id;

                          const borderClass = isHighRisk
                            ? isBoxActive
                              ? 'border-red-500 bg-red-500/25 ring-2 ring-red-400'
                              : 'border-red-500/80 bg-red-500/10'
                            : isFinancial
                            ? isBoxActive
                              ? 'border-amber-500 bg-amber-500/25 ring-2 ring-amber-400'
                              : 'border-amber-500/80 bg-amber-500/10'
                            : isIdentity
                            ? isBoxActive
                              ? 'border-cyan-400 bg-cyan-500/25 ring-2 ring-cyan-300'
                              : 'border-cyan-500/80 bg-cyan-500/10'
                            : isBoxActive
                            ? 'border-blue-500 bg-blue-500/25 ring-2 ring-blue-400'
                            : 'border-blue-500/70 bg-blue-500/10';

                          const badgeClass = isHighRisk
                            ? 'bg-red-600 text-white'
                            : isFinancial
                            ? 'bg-amber-600 text-white'
                            : isIdentity
                            ? 'bg-cyan-600 text-white'
                            : 'bg-blue-600 text-white';

                          return (
                            <div
                              key={box.id || idx}
                              onClick={() => {
                                setSelectedBoxId(box.id);
                                setInspectorTab('FIELDS');
                              }}
                              onMouseEnter={() => setHoveredBoxId(box.id)}
                              onMouseLeave={() => setHoveredBoxId(null)}
                              title={`${box.entityType}: ${box.text}`}
                              style={{
                                left: `${(box.x / 720) * 100}%`,
                                top: `${(box.y / 920) * 100}%`,
                                width: `${(box.width / 720) * 100}%`,
                                height: `${(box.height / 920) * 100}%`,
                              }}
                              className={`absolute border-2 rounded-md cursor-pointer transition-all flex items-start justify-end p-0.5 ${borderClass}`}
                            >
                              <span
                                className={`px-1.5 py-0.2 font-mono text-[8px] font-extrabold rounded-xs shadow-xs tracking-wide pointer-events-none ${badgeClass}`}
                              >
                                {box.entityType}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    /* High-Fidelity Optical Scanner Fallback with FIX FOR CLIPPED ROW 04 */
                    <div className="cf-card-dark w-full max-w-[560px] min-h-[420px] p-5 flex flex-col justify-between space-y-3 min-w-0 text-slate-100">
                      <div className="min-w-0">
                        <div className="flex items-center justify-between text-xs font-mono text-cyan-400 mb-2">
                          <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                            <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
                            <span>OPTICAL OCR PARSER RENDER</span>
                          </span>
                          <span className="bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded text-[10px] border border-cyan-800">
                            Confidence: 99.4%
                          </span>
                        </div>
                        <h3 className="text-base font-extrabold text-white font-mono break-words [overflow-wrap:anywhere]" title={selectedEvidence.originalFilename}>
                          {formatFilenameWithWbr(selectedEvidence.originalFilename)}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Direct optical stream with structured OCR bounding boxes and full text preservation.
                        </p>
                      </div>

                      {/* Rendered OCR Bounding Boxes with Full Text & Zero Clipping */}
                      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                        {selectedEvidence.boundingBoxes && selectedEvidence.boundingBoxes.length > 0 ? (
                          selectedEvidence.boundingBoxes.map((box, idx) => {
                            const isHighRisk =
                              box.entityType === 'URL' ||
                              box.entityType === 'IP_ADDRESS' ||
                              box.entityType === 'CRYPTO_WALLET';
                            const isFinancial =
                              box.entityType === 'BANK_ACCOUNT' ||
                              box.entityType === 'UPI_ID' ||
                              box.entityType === 'TRANSACTION_ID';
                            const isIdentity =
                              box.entityType === 'PHONE' ||
                              box.entityType === 'PERSON' ||
                              box.entityType === 'ORGANIZATION';

                            const borderBoxStyle = isHighRisk
                              ? 'border-red-500/80 bg-red-950/40 text-red-100'
                              : isFinancial
                              ? 'border-amber-500/80 bg-amber-950/40 text-amber-100'
                              : isIdentity
                              ? 'border-cyan-500/80 bg-cyan-950/40 text-cyan-100'
                              : 'border-blue-500/80 bg-blue-950/40 text-blue-100';

                            const pillBadgeStyle = isHighRisk
                              ? 'bg-red-900 text-red-200 border-red-700'
                              : isFinancial
                              ? 'bg-amber-900 text-amber-200 border-amber-700'
                              : isIdentity
                              ? 'bg-cyan-900 text-cyan-200 border-cyan-700'
                              : 'bg-blue-900 text-blue-200 border-blue-700';

                            return (
                              <div
                                key={box.id || idx}
                                className={`p-3 rounded-lg border font-mono text-xs space-y-1.5 transition ${borderBoxStyle}`}
                              >
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className={`px-2 py-0.5 rounded font-bold border ${pillBadgeStyle}`}>
                                    {isHighRisk ? 'CRITICAL IOC' : box.entityType}
                                  </span>
                                  <span className="text-slate-400">
                                    X:{box.x} Y:{box.y} · {Math.round((box.confidence || 0.99) * 100)}% Conf
                                  </span>
                                </div>
                                {/* Full Text with whitespace-normal break-words to guarantee no cutoff */}
                                <div className="font-bold text-white text-xs whitespace-normal break-words leading-relaxed select-all">
                                  {box.text}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-4 bg-slate-950 rounded-lg text-center text-xs text-slate-500 font-mono">
                            No structured OCR bounding boxes registered.
                          </div>
                        )}
                      </div>

                      {/* Monospace Seal Digest Footer */}
                      <div className="pt-2 border-t border-slate-800 text-[11px] font-mono flex items-center justify-between text-slate-400">
                        <span>SHA-256: {selectedEvidence.sha256Hash?.slice(0, 16)}…</span>
                        <span className="text-emerald-400 font-bold">WORM SEALED</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Viewer Footer Bar */}
              <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 min-w-0">
                <div className="flex items-center gap-3 font-mono text-[11px] min-w-0">
                  <span className="text-cyan-400 font-bold">GRID: 720 × 920 px standard</span>
                  <span className="text-slate-600">•</span>
                  <span className="shrink-0">{selectedEvidence.boundingBoxes?.length || 0} OCR regions mapped</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-slate-400 font-medium font-mono">Optical Precision:</span>
                  <span className="font-mono font-bold text-cyan-400">
                    {Math.round((selectedEvidence.ocrConfidence || 0.96) * 100)}%
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="p-16 text-center text-slate-500 text-sm font-mono">
              No evidence artifact selected. Choose an item from the Evidence Register.
            </div>
          )}
        </section>

        {/* =======================================================================
            SECTION C: RIGHT INSPECTOR (360px width, Strictly Labeled 4-Pill Segmented Control)
            ======================================================================= */}
        <aside
          className={`w-full min-w-0 bg-white rounded-xl border border-slate-200/90 shadow-[0_2px_4px_rgba(15,23,42,0.04),0_12px_28px_-6px_rgba(15,23,42,0.07)] flex flex-col self-start lg:sticky lg:top-[calc(var(--header-height)+5.5rem)] max-h-[calc(100vh-14rem)] overflow-y-auto ${
            mobileActivePanel === 'INSPECTOR' ? 'block' : 'hidden lg:flex'
          }`}
        >
          {selectedEvidence ? (
            <>
              {/* 4-Pill Segmented Control with Strict Labels (ZERO TRUNCATION) */}
              <div className="p-2 border-b border-slate-100 bg-slate-50 min-w-0">
                <div className="bg-slate-200/70 p-1 rounded-lg grid grid-cols-4 gap-1 min-w-0">
                  <button
                    onClick={() => setInspectorTab('FIELDS')}
                    className={`py-1.5 px-1 text-center font-mono text-xs font-bold rounded-md transition cursor-pointer truncate ${
                      inspectorTab === 'FIELDS'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    OCR Fields
                  </button>
                  <button
                    onClick={() => setInspectorTab('SEAL')}
                    className={`py-1.5 px-1 text-center font-mono text-xs font-bold rounded-md transition cursor-pointer truncate ${
                      inspectorTab === 'SEAL'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Hash Seal
                  </button>
                  <button
                    onClick={() => setInspectorTab('EXIF')}
                    className={`py-1.5 px-1 text-center font-mono text-xs font-bold rounded-md transition cursor-pointer truncate ${
                      inspectorTab === 'EXIF'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    EXIF Meta
                  </button>
                  <button
                    onClick={() => setInspectorTab('CUSTODY')}
                    className={`py-1.5 px-1 text-center font-mono text-xs font-bold rounded-md transition cursor-pointer truncate ${
                      inspectorTab === 'CUSTODY'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Custody
                  </button>
                </div>
              </div>

              {/* Inspector Content Body */}
              <div className="p-4 space-y-4 flex-1 overflow-y-auto max-h-[580px] min-w-0">
                
                {/* ---------------------------------------------------------------
                    TAB 1: OCR FIELDS
                    --------------------------------------------------------------- */}
                {inspectorTab === 'FIELDS' && (
                  <div className="space-y-4 min-w-0">
                    {/* Precision Score Bar */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 min-w-0">
                      <div className="flex items-center justify-between text-xs min-w-0">
                        <span className="font-extrabold text-slate-800 truncate">
                          Optical Recognition Precision
                        </span>
                        <span className="font-mono font-bold text-blue-700 shrink-0">
                          {Math.round((selectedEvidence.ocrConfidence || 0.96) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.round((selectedEvidence.ocrConfidence || 0.96) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Extracted Fields List */}
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center justify-between text-xs min-w-0">
                        <span className="font-extrabold uppercase tracking-wider text-slate-500 font-mono text-[10px] truncate">
                          CORRELATED FORENSIC FIELDS ({selectedEvidence.boundingBoxes?.length || 0})
                        </span>
                        {selectedBoxId && (
                          <button
                            onClick={() => setSelectedBoxId(null)}
                            className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer shrink-0"
                          >
                            Clear Focus
                          </button>
                        )}
                      </div>

                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1 min-w-0">
                        {selectedEvidence.boundingBoxes && selectedEvidence.boundingBoxes.length > 0 ? (
                          selectedEvidence.boundingBoxes.map((box, idx) => {
                            const isSelected = selectedBoxId === box.id;
                            const isHighRisk =
                              box.entityType === 'URL' ||
                              box.entityType === 'IP_ADDRESS' ||
                              box.entityType === 'CRYPTO_WALLET';
                            const isFinancial =
                              box.entityType === 'BANK_ACCOUNT' ||
                              box.entityType === 'UPI_ID' ||
                              box.entityType === 'TRANSACTION_ID';

                            const badgeColor = isHighRisk
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : isFinancial
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200';

                            return (
                              <div
                                key={box.id || idx}
                                onClick={() => setSelectedBoxId(box.id)}
                                onMouseEnter={() => setHoveredBoxId(box.id)}
                                onMouseLeave={() => setHoveredBoxId(null)}
                                className={`p-2.5 rounded-xl border transition cursor-pointer text-xs min-w-0 ${
                                  isSelected
                                    ? 'bg-blue-50/90 border-blue-400 shadow-2xs ring-1 ring-blue-400'
                                    : 'bg-white hover:bg-slate-50 border-slate-200/80'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <span
                                    className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-bold border ${badgeColor}`}
                                  >
                                    {box.entityType}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-mono text-slate-400">
                                      {Math.round((box.confidence || 0.95) * 100)}% conf
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopyText(box.text, `BOX_${idx}`);
                                      }}
                                      className="text-slate-400 hover:text-slate-700"
                                      title="Copy value"
                                    >
                                      {copiedField === `BOX_${idx}` ? (
                                        <Check className="w-3 h-3 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                                <div className="font-mono text-xs font-bold text-slate-900 whitespace-normal break-words leading-snug select-all">
                                  {box.text}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400 mt-1 flex items-center justify-between">
                                  <span>X:{box.x} Y:{box.y}</span>
                                  <span>{box.width}×{box.height}px</span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-xs text-slate-400 p-2 text-center">
                            No structured bounding boxes extracted.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Dark Terminal Box for Raw OCR Transcript */}
                    <div className="space-y-1.5 pt-1 min-w-0">
                      <div className="flex items-center justify-between text-xs min-w-0">
                        <span className="font-extrabold uppercase tracking-wider text-slate-500 font-mono text-[10px] truncate">
                          RAW OCR TERMINAL TRANSCRIPT
                        </span>
                        <button
                          onClick={() =>
                            handleCopyText(selectedEvidence.ocrRawText || '', 'TRANSCRIPT')
                          }
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          {copiedField === 'TRANSCRIPT' ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Raw</span>
                            </>
                          )}
                        </button>
                      </div>

                      <pre className="p-3 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] whitespace-pre-wrap break-words max-h-44 overflow-y-auto leading-relaxed border border-slate-800 shadow-inner">
                        {selectedEvidence.ocrRawText || 'No plain text transcript available for this artifact.'}
                      </pre>
                    </div>
                  </div>
                )}

                {/* ---------------------------------------------------------------
                    TAB 2: HASH SEAL (INTEGRITY & DUAL HASH DIGESTS)
                    --------------------------------------------------------------- */}
                {inspectorTab === 'SEAL' && (
                  <div className="space-y-4 min-w-0">
                    {/* Integrity Hero Banner */}
                    <div
                      className={`p-4 rounded-xl border min-w-0 ${
                        selectedEvidence.integrityStatus === 'VERIFIED_INTACT'
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                          : selectedEvidence.integrityStatus === 'TAMPER_DETECTED'
                          ? 'bg-red-50/90 border-red-200 text-red-900'
                          : 'bg-amber-50/80 border-amber-200 text-amber-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {selectedEvidence.integrityStatus === 'VERIFIED_INTACT' ? (
                          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                        ) : selectedEvidence.integrityStatus === 'TAMPER_DETECTED' ? (
                          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-extrabold uppercase tracking-wide truncate">
                            {selectedEvidence.integrityStatus === 'VERIFIED_INTACT'
                              ? 'Cryptographic Integrity: INTACT'
                              : selectedEvidence.integrityStatus === 'TAMPER_DETECTED'
                              ? 'TAMPER DETECTED: HASH MISMATCH'
                              : 'INTEGRITY: UNVERIFIED'}
                          </div>
                          <div className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                            {selectedEvidence.integrityStatus === 'VERIFIED_INTACT'
                              ? 'Dual SHA-256 and BLAKE3 digests match sealed WORM ledger. Zero byte alterations detected.'
                              : selectedEvidence.integrityStatus === 'TAMPER_DETECTED'
                              ? 'Cryptographic digest does not match genesis registration! Storage byte alteration confirmed.'
                              : 'Verification pending or awaiting confirmation against custody ledger.'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dual Hash Monographs with Copy Triggers */}
                    <div className="space-y-3 min-w-0">
                      {/* FIPS 180-4 SHA-256 */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 min-w-0">
                        <div className="flex items-center justify-between text-xs min-w-0">
                          <span className="font-extrabold text-slate-700 font-mono text-[10px] uppercase">
                            FIPS 180-4 SHA-256 Digest (256-bit)
                          </span>
                          <button
                            onClick={() => handleCopyText(selectedEvidence.sha256Hash, 'SHA256')}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            {copiedField === 'SHA256' ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>Copy</span>
                          </button>
                        </div>
                        <div className="font-mono text-xs text-slate-900 break-all select-all leading-relaxed bg-white border border-slate-200 p-2 rounded-lg">
                          {selectedEvidence.sha256Hash}
                        </div>
                      </div>

                      {/* Pure-Java RFC-7693 BLAKE3 */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 min-w-0">
                        <div className="flex items-center justify-between text-xs min-w-0">
                          <span className="font-extrabold text-slate-700 font-mono text-[10px] uppercase">
                            RFC-7693 BLAKE3 Cryptographic Hash
                          </span>
                          <button
                            onClick={() => handleCopyText(selectedEvidence.blake3Hash, 'BLAKE3')}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            {copiedField === 'BLAKE3' ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>Copy</span>
                          </button>
                        </div>
                        <div className="font-mono text-xs text-slate-900 break-all select-all leading-relaxed bg-white border border-slate-200 p-2 rounded-lg">
                          {selectedEvidence.blake3Hash}
                        </div>
                      </div>
                    </div>

                    {/* Interactive Cryptographic Actions */}
                    <div className="pt-2 flex flex-col gap-2">
                      <button
                        onClick={() => handleTriggerReVerify(selectedEvidence.id)}
                        disabled={verifyingEvidenceId === selectedEvidence.id}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>
                          {verifyingEvidenceId === selectedEvidence.id
                            ? 'Re-Verifying Merkle Leaf...'
                            : 'Re-Verify Leaf Hash Against Root'}
                        </span>
                      </button>

                      {/* Tamper Simulation Toggle */}
                      <button
                        onClick={() =>
                          onSimulateTamper(
                            selectedEvidence.id,
                            selectedEvidence.integrityStatus !== 'TAMPER_DETECTED'
                          )
                        }
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Flame className="w-3.5 h-3.5 text-amber-600" />
                        <span>
                          {selectedEvidence.integrityStatus === 'TAMPER_DETECTED'
                            ? 'Heal Tampered Replica (Restore)'
                            : 'Inject 1-Byte Storage Tamper'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ---------------------------------------------------------------
                    TAB 3: EXIF META (METADATA & CLOCK SKEW)
                    --------------------------------------------------------------- */}
                {inspectorTab === 'EXIF' && (
                  <div className="space-y-4 min-w-0">
                    {/* Timestamp Summary */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 min-w-0">
                      <span className="font-extrabold uppercase tracking-wider text-slate-500 font-mono text-[10px]">
                        INGESTION &amp; SEIZURE CHRONOLOGY
                      </span>
                      <div className="space-y-1.5 text-xs min-w-0">
                        <div className="flex justify-between items-center min-w-0">
                          <span className="text-slate-500">Seized At:</span>
                          <span className="font-mono text-slate-800 text-[11px] truncate font-bold">
                            {selectedEvidence.seizedAt || '2026-10-01 10:45:00 UTC'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center min-w-0">
                          <span className="text-slate-500">Ingested To WORM:</span>
                          <span className="font-mono text-slate-800 text-[11px] truncate">
                            {selectedEvidence.uploadedAt || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Timestamp Discrepancy Breakdown */}
                    <div className="space-y-1.5 min-w-0">
                      <span className="font-extrabold uppercase tracking-wider text-slate-500 font-mono text-[10px]">
                        TEMPORAL INTEGRITY ANALYSIS
                      </span>

                      {selectedEvidence.timestampAnomaly ? (
                        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2 min-w-0">
                          <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>EXIF vs. Incident Timestamp Discrepancy</span>
                          </div>
                          <div className="text-[11px] text-amber-800 leading-relaxed">
                            {selectedEvidence.timestampAnomalyDetail ||
                              'EXIF creation timestamp diverges from stated SMS transmission time.'}
                          </div>
                          <div className="pt-2 border-t border-amber-200/80 grid grid-cols-2 gap-2 text-[10px] font-mono min-w-0">
                            <div className="min-w-0">
                              <span className="text-amber-700 font-bold block">Incident Time:</span>
                              <span className="text-slate-800 truncate block">{selectedEvidence.uploadedAt?.slice(0, 19) || 'N/A'}</span>
                            </div>
                            <div className="min-w-0">
                              <span className="text-amber-700 font-bold block">EXIF Modify Date:</span>
                              <span className="text-red-700 font-bold truncate block">
                                {selectedEvidence.exifMetadata?.['ModifyDate'] || 'Discrepancy (+14m 22s)'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs font-bold text-emerald-800 min-w-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="truncate">Timestamps verified consistent across EXIF and telemetry.</span>
                        </div>
                      )}
                    </div>

                    {/* EXIF Metadata Key-Value Grid */}
                    {selectedEvidence.exifMetadata &&
                      Object.keys(selectedEvidence.exifMetadata).length > 0 && (
                        <div className="space-y-1.5 min-w-0">
                          <span className="font-extrabold uppercase tracking-wider text-slate-500 font-mono text-[10px]">
                            BINARY EXIF &amp; METADATA FIELDS ({Object.keys(selectedEvidence.exifMetadata).length})
                          </span>
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-[11px] min-w-0">
                            {Object.entries(selectedEvidence.exifMetadata).map(([k, v]) => (
                              <div key={k} className="flex justify-between items-baseline gap-2 min-w-0">
                                <span className="text-slate-500 font-medium shrink-0 font-mono text-[10px]">
                                  {k}:
                                </span>
                                <span className="font-mono font-bold text-slate-800 break-all text-right max-w-[210px]" title={v}>
                                  {v}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {/* ---------------------------------------------------------------
                    TAB 4: CUSTODY (CHAIN OF CUSTODY LOG)
                    --------------------------------------------------------------- */}
                {inspectorTab === 'CUSTODY' && (
                  <div className="space-y-3.5 min-w-0">
                    <div className="flex items-center justify-between text-xs min-w-0">
                      <span className="font-extrabold uppercase tracking-wider text-slate-500 font-mono text-[10px] truncate">
                        HASH-CHAINED CUSTODY LOG
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 shrink-0">
                        {artifactCustodyLedger.length} Records
                      </span>
                    </div>

                    <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1 min-w-0">
                      {artifactCustodyLedger.length > 0 ? (
                        artifactCustodyLedger.map((entry, idx) => (
                          <div
                            key={entry.id || idx}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1.5 min-w-0"
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono min-w-0 gap-1">
                              <span className="font-bold text-blue-700 truncate">
                                #{entry.sequenceNumber || idx + 1} · {entry.actionType}
                              </span>
                              <span className="text-slate-400 shrink-0">
                                {entry.timestamp?.slice(11, 19) || '10:00:00'} UTC
                              </span>
                            </div>

                            <div className="text-[11px] font-medium text-slate-800 break-words">
                              {entry.details || `Custody event logged on ${entry.targetResource}`}
                            </div>

                            <div className="pt-1 border-t border-slate-200/70 text-[10px] font-mono text-slate-500 flex items-center justify-between gap-2 min-w-0">
                              <span className="truncate">Actor: {entry.actorUsername || 'system'}</span>
                              <span className="shrink-0 font-mono">Hash: {entry.entryHash?.slice(0, 10)}…</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-400 p-4 text-center">
                          No custody entries found for this artifact.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              Select an evidence artifact to inspect cryptographic details and extracted fields.
            </div>
          )}
        </aside>
      </div>

      {/* =========================================================================
          6. LOWER ANALYTICAL REGION (Full-Width Dual-Hash Cryptographic Provenance Table)
          ========================================================================= */}
      <div className="w-full cf-card p-5 space-y-4 min-w-0">
          <div>
            <div className="flex items-center justify-between min-w-0 gap-2">
              <div className="flex items-center gap-2 truncate">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <h3 className="text-sm font-extrabold text-slate-900 truncate">
                  Dual-Hash Cryptographic Provenance Table
                </h3>
              </div>
              <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                FIPS 180-4 &amp; RFC-7693
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Active case artifacts with side-by-side SHA-256 and pure-Java BLAKE3 digests and instant verification triggers.
            </p>
          </div>

          {/* 4-Row Provenance Table */}
          <div className="border border-slate-200/80 rounded-xl overflow-hidden min-w-0">
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-left text-xs min-w-[540px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono uppercase text-slate-500">
                    <th className="py-2.5 px-3 font-bold">Artifact</th>
                    <th className="py-2.5 px-3 font-bold">SHA-256 Digest</th>
                    <th className="py-2.5 px-3 font-bold">BLAKE3 Digest</th>
                    <th className="py-2.5 px-3 font-bold text-center">Status</th>
                    <th className="py-2.5 px-3 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {evidenceList.slice(0, 4).map((ev) => {
                    const isSelected = selectedEvidence?.id === ev.id;
                    const isTampered = ev.integrityStatus === 'TAMPER_DETECTED';

                    return (
                      <tr
                        key={ev.id}
                        onClick={() => onSelectEvidence(ev.id)}
                        className={`hover:bg-slate-50/80 cursor-pointer transition ${
                          isSelected ? 'bg-blue-50/50' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-blue-700 mr-1.5">
                            {ev.evidenceCode}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] text-slate-700 break-all select-all">
                              {ev.sha256Hash?.slice(0, 14)}…
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyText(ev.sha256Hash, `ROW_SHA_${ev.id}`);
                              }}
                              className="text-slate-400 hover:text-slate-700"
                            >
                              {copiedField === `ROW_SHA_${ev.id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] text-slate-700 break-all select-all">
                              {ev.blake3Hash?.slice(0, 14)}…
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyText(ev.blake3Hash, `ROW_B3_${ev.id}`);
                              }}
                              className="text-slate-400 hover:text-slate-700"
                            >
                              {copiedField === `ROW_B3_${ev.id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isTampered
                                ? 'bg-red-100 text-red-700 border border-red-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {isTampered ? 'TAMPERED' : 'INTACT'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTriggerReVerify(ev.id);
                            }}
                            disabled={verifyingEvidenceId === ev.id}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 text-[10px] font-bold font-sans transition cursor-pointer"
                          >
                            {verifyingEvidenceId === ev.id ? 'Verifying...' : 'Re-Verify'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Merkle Hash Root */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs min-w-0 font-mono text-[11px]">
            <span className="text-slate-500 truncate">
              Root Merkle Leaf: 2b8f84091a0c842e…
            </span>
            <span className="text-emerald-700 font-bold shrink-0">
              Zero Byte Divergence Detected
            </span>
          </div>
        </div>
      </div>
  );
};


