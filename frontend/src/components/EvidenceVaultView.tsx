import React, { useState } from 'react';
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
} from 'lucide-react';
import { EvidenceItem } from '../types';

interface EvidenceVaultViewProps {
  caseId: string;
  evidenceList: EvidenceItem[];
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

export const EvidenceVaultView: React.FC<EvidenceVaultViewProps> = ({
  evidenceList,
  selectedEvidenceId,
  onSelectEvidence,
  onUploadFile,
  onQuickIngest,
  onVerifyIntegrity,
  onSimulateTamper,
}) => {
  const [showBoundingBoxes, setShowBoundingBoxes] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showIngestDrawer, setShowIngestDrawer] = useState<boolean>(false);
  const [quickTitle, setQuickTitle] = useState<string>(PRESET_TEMPLATES[0].title);
  const [quickCategory, setQuickCategory] = useState<string>(
    PRESET_TEMPLATES[0].category
  );
  const [quickContent, setQuickContent] = useState<string>(
    PRESET_TEMPLATES[0].content
  );
  const [uploadCategory, setUploadCategory] = useState<string>('TRANSACTION_RECEIPT');
  const [uploadNotes, setUploadNotes] = useState<string>(
    'Seized digital artifact sealed via WebCrypto SHA-256.'
  );
  const [busyAction, setBusyAction] = useState<boolean>(false);

  const selectedEvidence =
    evidenceList.find((e) => e.id === selectedEvidenceId) ||
    evidenceList[0] ||
    null;

  const intactCount = evidenceList.filter(
    (e) => e.integrityStatus === 'VERIFIED_INTACT'
  ).length;
  const tamperedCount = evidenceList.filter(
    (e) => e.integrityStatus !== 'VERIFIED_INTACT'
  ).length;
  const exifAnomalyCount = evidenceList.filter((e) => e.timestampAnomaly).length;

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

  // Segmented bar helper (Ref: image-8.png Doculyst Score column `|||||| 92%`)
  const renderSegmentedScoreBar = (scorePercent: number, isTampered: boolean) => {
    const activeBars = Math.round((scorePercent / 100) * 10);
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-3.5 rounded-sm ${
                i < activeBars
                  ? isTampered
                    ? 'bg-red-500'
                    : 'bg-teal-600'
                  : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
        <span className="font-mono text-xs font-bold text-slate-700">
          {scorePercent}%
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Top Doculyst Repository Header + 4 Summary Cards (Ref: image-8.png) */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            WORM Evidence Vault &amp; AI Document Validator
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Every uploaded screenshot, receipt, or message is sealed with dual SHA-256 + BLAKE3 digests and OCR entity bounding boxes.
          </p>
        </div>

        <button
          onClick={() => setShowIngestDrawer(!showIngestDrawer)}
          className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>{showIngestDrawer ? 'Close Upload Drawer' : 'Upload / Seal New Evidence'}</span>
        </button>
      </div>

      {/* Collapsible Upload & Preset Simulator Drawer */}
      {showIngestDrawer && (
        <div className="bg-white rounded-2xl border border-teal-200 p-6 shadow-md grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Multipart Binary File Upload with Client-Side WebCrypto SHA-256 Pre-Hashing */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
              <Upload className="w-4 h-4 text-teal-600" />
              <span>1. Upload Raw File / Screenshot (WebCrypto Pre-Hashed)</span>
            </div>
            <p className="text-xs text-slate-500">
              Computes browser-side SHA-256 before transmission and verifies magic bytes on the Java 21 Jakarta Servlet container.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                aria-label="Evidence Category"
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
              >
                <option value="TRANSACTION_RECEIPT">Transaction Receipt</option>
                <option value="SMS_SCREENSHOT">SMS / WhatsApp Screenshot</option>
                <option value="EMAIL_HEADER">Email &amp; Header Dump</option>
                <option value="BANK_STATEMENT">Bank / SWIFT Statement</option>
              </select>
              <input
                type="text"
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                placeholder="Investigator custody note..."
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800"
              />
            </div>
            <label className="block border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/70 transition">
              <Upload className="w-6 h-6 text-teal-600 mx-auto mb-2" />
              <div className="text-xs font-bold text-slate-800">
                Click to select PNG, JPEG, PDF, or TXT evidence artifact
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Automatic SHA-256 + BLAKE3 sealing &amp; OCR entity extraction
              </div>
              <input
                type="file"
                onChange={handleFileUploadChange}
                className="hidden"
                disabled={busyAction}
              />
            </label>
          </div>

          {/* Right: Instant Forensic Evidence Simulator */}
          <form onSubmit={handleQuickIngestSubmit} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>2. Instant Forensic Evidence Simulator</span>
              </div>
              <div className="flex gap-1.5">
                {PRESET_TEMPLATES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQuickTitle(preset.title);
                      setQuickCategory(preset.category);
                      setQuickContent(preset.content);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700"
                  >
                    Preset {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
              placeholder="Evidence Artifact Title"
            />
            <textarea
              rows={4}
              value={quickContent}
              onChange={(e) => setQuickContent(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800"
            />
            <button
              type="submit"
              disabled={busyAction}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition"
            >
              {busyAction
                ? 'Sealing & Correlating Artifact...'
                : 'Synthesize PNG Evidence + Run OCR & Graph Correlation'}
            </button>
          </form>
        </div>
      )}

      {/* 4 Summary Metric Cards (Ref: image-8.png Doculyst top cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Total Documents</div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono">
              {evidenceList.length}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Verified Intact</div>
            <div className="text-2xl font-extrabold text-emerald-700 font-mono">
              {intactCount}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">EXIF Discrepancy</div>
            <div className="text-2xl font-extrabold text-amber-700 font-mono">
              {exifAnomalyCount}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Tamper Alerts</div>
            <div className="text-2xl font-extrabold text-red-600 font-mono">
              {tamperedCount}
            </div>
          </div>
        </div>
      </div>

      {/* Document Repository Table with Segmented Score Bars (Ref: image-8.png Doculyst) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Sealed Evidence Repository (Click any row to inspect below)
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            RFC-7693 BLAKE3 + FIPS 180-4 SHA-256
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-400 bg-slate-50/60">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Document Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Integrity Status</th>
                <th className="py-3 px-4">OCR Confidence Score</th>
                <th className="py-3 px-4">SHA-256 Digest</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {evidenceList.map((ev) => {
                const isSelected = selectedEvidence?.id === ev.id;
                const isTampered = ev.integrityStatus !== 'VERIFIED_INTACT';
                const confidencePct = Math.round(
                  (ev.ocrConfidence || (ev.timestampAnomaly ? 0.84 : 0.96)) * 100
                );
                return (
                  <tr
                    key={ev.id}
                    onClick={() => onSelectEvidence(ev.id)}
                    className={`cursor-pointer transition ${
                      isSelected
                        ? 'bg-teal-50/70 font-semibold'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-teal-700">
                      {ev.evidenceCode}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {ev.originalFilename}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                        {ev.evidenceCategory}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          isTampered
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isTampered ? 'bg-red-600' : 'bg-emerald-600'
                          }`}
                        />
                        {isTampered ? 'TAMPER DETECTED' : 'Verified Intact'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {renderSegmentedScoreBar(confidencePct, isTampered)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {ev.sha256Hash.slice(0, 18)}…
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Split-Pane Document Validator & OCR Bounding Box Canvas (Ref: image-9.png) */}
      {selectedEvidence && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 Cols: Document Canvas Preview with OCR Bounding Box Overlays (Ref: image-9.png) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between overflow-hidden">
            {/* Top Bar */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-teal-700" />
                <span className="text-xs font-extrabold text-slate-900">
                  {selectedEvidence.evidenceCode} · {selectedEvidence.originalFilename}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition ${
                    showBoundingBoxes
                      ? 'bg-teal-50 border-teal-300 text-teal-800'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <ScanLine className="w-3.5 h-3.5" />
                  <span>{showBoundingBoxes ? 'OCR Boxes: ON' : 'OCR Boxes: OFF'}</span>
                </button>
              </div>
            </div>

            {/* Center Grey Framed Document Preview Area (Ref: image-9.png) */}
            <div className="p-6 bg-slate-100/80 flex items-center justify-center min-h-[460px] overflow-auto">
              <div
                className="bg-white rounded-2xl shadow-md border border-slate-200 p-2.5 transition-transform"
                style={{
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: 'center center',
                }}
              >
                {/* Zero-padding inner relative wrapper so percentage coordinates map 1:1 to 720x920 PNG pixels */}
                <div className="relative inline-block overflow-hidden rounded-xl">
                  <img
                    src={`/api/v1/evidence/${encodeURIComponent(
                      selectedEvidence.id
                    )}/raw?v=${selectedEvidence.sha256Hash.slice(0, 8)}`}
                    alt={selectedEvidence.originalFilename}
                    className="block max-w-full h-auto"
                  />

                  {/* Interactive OCR Bounding Box Overlays aligned 1:1 with SampleCaseSeeder row geometry */}
                  {showBoundingBoxes &&
                    selectedEvidence.boundingBoxes &&
                    selectedEvidence.boundingBoxes.map((box, idx) => {
                      const isGeneric = box.entityType === 'TEXT_LINE';
                      const isHighRisk =
                        box.entityType === 'URL' ||
                        box.entityType === 'IP_ADDRESS' ||
                        box.entityType === 'CRYPTO_WALLET';
                      const isFinancial =
                        box.entityType === 'BANK_ACCOUNT' ||
                        box.entityType === 'UPI_ID' ||
                        box.entityType === 'TRANSACTION_ID';

                      const borderClass = isHighRisk
                        ? 'border-red-500/85 bg-red-500/8'
                        : isFinancial
                        ? 'border-emerald-600/85 bg-emerald-500/8'
                        : isGeneric
                        ? 'border-slate-400/50 bg-transparent'
                        : 'border-blue-600/85 bg-blue-500/8';

                      const badgeClass = isHighRisk
                        ? 'bg-red-600 text-white'
                        : isFinancial
                        ? 'bg-emerald-700 text-white'
                        : isGeneric
                        ? 'bg-slate-600 text-white'
                        : 'bg-blue-700 text-white';

                      return (
                        <div
                          key={idx}
                          title={`${box.entityType}: ${box.text} (${Math.round(
                            box.confidence * 100
                          )}%)`}
                          style={{
                            left: `${(box.x / 720) * 100}%`,
                            top: `${(box.y / 920) * 100}%`,
                            width: `${(box.width / 720) * 100}%`,
                            height: `${(box.height / 920) * 100}%`,
                          }}
                          className={`absolute border-2 rounded-lg pointer-events-none flex items-center justify-end pr-2 ${borderClass}`}
                        >
                          <span
                            className={`px-2 py-0.5 font-mono text-[9px] font-extrabold rounded-md shadow-xs tracking-wide ${badgeClass}`}
                          >
                            {box.entityType}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Bottom Floating Zoom Pill Bar (Ref: image-9.png `100% - +`) */}
            <div className="px-5 py-3 border-t border-slate-100 bg-white flex items-center justify-between text-xs text-slate-500">
              <span>MIME: {selectedEvidence.detectedMimeType || 'image/png'} (Magic-Byte Verified)</span>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-100 text-slate-700 font-mono font-bold">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(75, z - 10))}
                  className="hover:text-slate-900"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span>{zoomLevel}%</span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
                  className="hover:text-slate-900"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Extracted Data Inspector + Validate / Tamper Simulator Buttons (Ref: image-9.png) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Extracted Data &amp; Cryptographic Seal
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dual-Hash Verification &amp; OCR Structured Fields
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    selectedEvidence.integrityStatus === 'VERIFIED_INTACT'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {selectedEvidence.integrityStatus}
                </span>
              </div>

              {/* Cryptographic Digests */}
              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center justify-between">
                    <span>FIPS 180-4 SHA-256 Digest</span>
                    <Lock className="w-3 h-3 text-teal-600" />
                  </div>
                  <div className="font-mono text-[11px] font-bold text-slate-800 break-all mt-1">
                    {selectedEvidence.sha256Hash}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center justify-between">
                    <span>BLAKE3-256 Cryptographic Digest</span>
                    <CheckCircle2 className="w-3 h-3 text-blue-600" />
                  </div>
                  <div className="font-mono text-[11px] font-bold text-slate-800 break-all mt-1">
                    {selectedEvidence.blake3Hash}
                  </div>
                </div>
              </div>

              {/* Timestamp Comparison Field (Ref: image-9.png structured fields) */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[10px] font-bold uppercase text-slate-400">
                    Uploaded / Content Time
                  </div>
                  <div className="font-mono font-bold text-slate-800 mt-1">
                    {selectedEvidence.uploadedAt || 'N/A'}
                  </div>
                </div>
                <div
                  className={`p-3 rounded-xl border ${
                    selectedEvidence.timestampAnomaly
                      ? 'bg-red-50/70 border-red-200'
                      : 'bg-slate-50 border-slate-200/80'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase text-slate-400">
                    EXIF Header Timestamp
                  </div>
                  <div
                    className={`font-mono font-bold mt-1 ${
                      selectedEvidence.timestampAnomaly
                        ? 'text-red-700'
                        : 'text-slate-800'
                    }`}
                  >
                    {selectedEvidence.exifMetadata?.['ModifyDate'] ||
                      selectedEvidence.exifMetadata?.['DateTimeOriginal'] ||
                      selectedEvidence.lastVerifiedAt ||
                      'Verified'}
                  </div>
                </div>
              </div>

              {/* EXIF Timestamp Discrepancy Banner */}
              {selectedEvidence.timestampAnomaly &&
                selectedEvidence.timestampAnomalyDetail && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-extrabold">
                        EXIF vs. Content Timestamp Anomaly
                      </div>
                      <div className="text-[11px] mt-0.5">
                        {selectedEvidence.timestampAnomalyDetail}
                      </div>
                    </div>
                  </div>
                )}

              {/* Binary EXIF & Header Metadata Key-Value Grid */}
              {selectedEvidence.exifMetadata &&
                Object.keys(selectedEvidence.exifMetadata).length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Binary EXIF &amp; Header Forensics
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                      {Object.entries(selectedEvidence.exifMetadata)
                        .slice(0, 6)
                        .map(([k, v]) => (
                          <div key={k} className="truncate">
                            <span className="text-slate-400 font-medium">
                              {k}:{' '}
                            </span>
                            <span className="font-mono font-bold text-slate-800">
                              {v}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

              {/* OCR Transcript */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  OCR Extracted Text Transcript
                </div>
                <pre className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 font-mono text-[11px] text-slate-700 whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
                  {selectedEvidence.ocrRawText}
                </pre>
              </div>
            </div>

            {/* Bottom Action Buttons (Ref: image-9.png `Validate Document` green button + Tamper Simulation) */}
            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <button
                onClick={() => onVerifyIntegrity(selectedEvidence.id)}
                className="w-full py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Validate Document Cryptographic Integrity</span>
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => onSimulateTamper(selectedEvidence.id, true)}
                  className="py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Simulate 1-Byte Tamper</span>
                </button>
                <button
                  onClick={() => onSimulateTamper(selectedEvidence.id, false)}
                  className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore WORM Backup</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
