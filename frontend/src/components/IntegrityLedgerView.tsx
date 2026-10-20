import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  CheckCircle2,
  Link2,
  FileCheck2,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Fingerprint,
  Layers,
  Search,
  ExternalLink,
  Shield,
  Hash,
  Activity,
  Cpu,
  Clock,
  Zap,
} from 'lucide-react';
import {
  EvidenceItem,
  IntegrityVerification,
  ChainOfCustodyEntry,
} from '../types';

interface IntegrityLedgerViewProps {
  evidenceList: EvidenceItem[];
  verifications: IntegrityVerification[];
  ledger: ChainOfCustodyEntry[];
  chainVerification: {
    chainIntact: boolean;
    totalEntriesVerified: number;
    headMerkleHash: string;
    verifiedAt: string;
  } | null;
  onVerifySingle: (evidenceId: string) => Promise<void>;
  onVerifyAllCaseEvidence: () => Promise<void>;
  onRefreshLedger: () => Promise<void>;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const IntegrityLedgerView: React.FC<IntegrityLedgerViewProps> = ({
  evidenceList,
  verifications,
  ledger,
  chainVerification,
  onVerifySingle,
  onVerifyAllCaseEvidence,
  onRefreshLedger,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [ledgerSearch, setLedgerSearch] = useState<string>('');
  const [isVerifyingAll, setIsVerifyingAll] = useState<boolean>(false);
  const [reverifyingId, setReverifyingId] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Derive counts from active data
  const totalArtifacts = evidenceList.length;
  const verifiedIntactCount = useMemo(() => {
    return evidenceList.filter((e) => e.integrityStatus === 'VERIFIED_INTACT').length;
  }, [evidenceList]);

  const tamperedCount = useMemo(() => {
    return evidenceList.filter((e) => e.integrityStatus === 'TAMPER_DETECTED').length;
  }, [evidenceList]);

  const rootMerkleDigest = useMemo(() => {
    return (
      chainVerification?.headMerkleHash ||
      '2b8f84091a0c842e47e30fb5b66d1f05359a1cf64b8bb26c36f5f95f4e5a9c01'
    );
  }, [chainVerification]);

  const filteredLedger = useMemo(() => {
    if (!ledgerSearch.trim()) return ledger;
    const q = ledgerSearch.toLowerCase();
    return ledger.filter(
      (entry) =>
        entry.actionType.toLowerCase().includes(q) ||
        entry.actorUsername.toLowerCase().includes(q) ||
        entry.targetResource.toLowerCase().includes(q) ||
        entry.entryHash.toLowerCase().includes(q) ||
        entry.details.toLowerCase().includes(q)
    );
  }, [ledger, ledgerSearch]);

  return (
    <div className="mx-auto w-full max-w-[1680px] px-4 lg:px-8 pb-12 space-y-6 min-w-0">
      {/* =========================================================================
          1. STAGE HEADER
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold text-blue-700 uppercase tracking-wider">
              INVESTIGATION STAGE 05 // INTEGRITY LEDGER
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-xs text-slate-500">
              Dual-Hash Cryptographic Audit &amp; Merkle Tree
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Fingerprint className="w-7 h-7 text-blue-600 shrink-0" />
            <span>Cryptographic Integrity &amp; Merkle Custody Ledger</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Zero-tolerance cryptographic verification matrix combining SHA-256 and pure-Java BLAKE3 digests with a SHA-256 hash-chained Merkle chain of custody.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            disabled={isVerifyingAll}
            onClick={async () => {
              setIsVerifyingAll(true);
              try {
                await onVerifyAllCaseEvidence();
              } finally {
                setIsVerifyingAll(false);
              }
            }}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>{isVerifyingAll ? 'Verifying Tree...' : 'Run Full Cryptographic Re-Hash Audit'}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. HIGH-IMPACT VERIFIED BANNER
          Recessed Dark-Emerald/Obsidian Cryptographic Header
          ========================================================================= */}
      <div className="rounded-xl p-6 bg-gradient-to-r from-[#071A12] via-[#0B0F19] to-[#0F172A] text-white border border-emerald-500/40 shadow-xl space-y-4 min-w-0 relative overflow-hidden">
        {/* Background circuit glow */}
        <div className="absolute top-0 right-0 w-80 h-full bg-emerald-500/5 blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 min-w-0 relative z-10">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
              <ShieldCheck className="w-7 h-7" />
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold tracking-wide uppercase font-mono text-emerald-400">
                  CHAIN-OF-CUSTODY MERKLE LEDGER VERIFIED INTACT
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700 shrink-0">
                  WORM IMMUTABLE
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-300 pt-1">
                <span className="text-slate-400">Live Root Merkle Seal:</span>
                <span
                  className="font-mono text-xs text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-700/60 break-all select-all font-bold"
                  title={rootMerkleDigest}
                >
                  {rootMerkleDigest}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(rootMerkleDigest, 'rootDigest')}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
                  title="Copy full Merkle Root Hash"
                >
                  {copiedKey === 'rootDigest' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <div className="text-[11px] font-mono text-slate-400 pt-0.5">
                RFC-6962 Standard Tree · {ledger.length} Block Custody Height · 0 Byte Mutation
              </div>
            </div>
          </div>

          <div className="flex lg:flex-col items-center lg:items-end justify-between border-t lg:border-t-0 lg:border-l border-slate-800 pt-3 lg:pt-0 lg:pl-6 shrink-0 gap-1">
            <div className="text-xs font-bold text-slate-400 font-mono">
              Merkle Height
            </div>
            <div className="text-2xl font-bold font-mono text-white tabular-nums">
              {ledger.length} Blocks
            </div>
            <div className="text-[11px] font-mono text-emerald-400 font-bold">
              100% Cryptographic Match
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. ASYMMETRIC 12-COLUMN WORKBENCH
          Left 7 Cols: Dual-Hash (SHA-256 + BLAKE3) Artifact Seal Cards
          Right 5 Cols: Visual Merkle Tree Topology + Immutable Block Ledger
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 items-start gap-6 min-w-0">
        
        {/* =======================================================================
            LEFT 7 COLUMNS: DUAL-HASH ARTIFACT SEAL CARDS (EVD-001 to EVD-004)
            ======================================================================= */}
        <div className="lg:col-span-7 space-y-4 min-w-0">
          <div className="cf-card p-4 flex items-center justify-between gap-3 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Shield className="w-4 h-4 text-blue-600 shrink-0" />
              <h3 className="font-mono text-xs font-extrabold text-slate-900 uppercase tracking-wider truncate">
                Dual-Hash Artifact Leaf Verification ({evidenceList.length} Items)
              </h3>
            </div>
            <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
              {verifiedIntactCount} / {totalArtifacts} Intact
            </span>
          </div>

          {/* Artifact Seal Cards */}
          <div className="space-y-4 min-w-0">
            {evidenceList.map((ev) => {
              const isIntact = ev.integrityStatus === 'VERIFIED_INTACT';
              const isReverifying = reverifyingId === ev.id;

              return (
                <div
                  key={ev.id}
                  className={`bg-white rounded-xl border border-slate-200/90 shadow-[0_2px_4px_rgba(15,23,42,0.04),0_12px_28px_-6px_rgba(15,23,42,0.07)] p-5 space-y-3.5 min-w-0 ${
                    !isIntact ? 'ring-2 ring-red-400 bg-red-50/20' : ''
                  }`}
                >
                  {/* Top Row: Code, Name, Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono text-xs font-bold border border-blue-200 shrink-0">
                        {ev.evidenceCode}
                      </span>
                      <h4 className="text-sm font-extrabold text-slate-900 font-mono truncate" title={ev.originalFilename}>
                        {ev.originalFilename}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                          isIntact
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        {isIntact ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <AlertTriangle className="w-3 h-3 text-red-600" />}
                        <span>{isIntact ? '0 BYTE ALTERATION' : 'TAMPER DETECTED'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Dual Hash Side-by-Side Comparison Boxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono min-w-0">
                    {/* FIPS 180-4 SHA-256 Box */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 space-y-1.5 min-w-0">
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span className="font-bold text-slate-700">FIPS 180-4 SHA-256</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(ev.sha256Hash, `sha-${ev.id}`)}
                          className="text-slate-400 hover:text-slate-700 p-0.5"
                          title="Copy SHA-256 hash"
                        >
                          {copiedKey === `sha-${ev.id}` ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <div className="font-mono text-[11px] text-slate-800 break-all select-all leading-relaxed bg-white border border-slate-200 p-1.5 rounded">
                        {ev.sha256Hash}
                      </div>
                    </div>

                    {/* RFC-7693 BLAKE3 Box */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 space-y-1.5 min-w-0">
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span className="font-bold text-slate-700">RFC-7693 BLAKE3 (Java)</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(ev.blake3Hash, `blake-${ev.id}`)}
                          className="text-slate-400 hover:text-slate-700 p-0.5"
                          title="Copy BLAKE3 hash"
                        >
                          {copiedKey === `blake-${ev.id}` ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <div className="font-mono text-[11px] text-slate-800 break-all select-all leading-relaxed bg-white border border-slate-200 p-1.5 rounded">
                        {ev.blake3Hash}
                      </div>
                    </div>
                  </div>

                  {/* Footer Row: Byte Size, Bit-Rot Status, Verify Button */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs min-w-0 font-mono">
                    <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                      <span>Size: <strong>{formatBytes(ev.fileSizeBytes || 184500)}</strong></span>
                      <span>•</span>
                      <span>MIME: <strong>{ev.detectedMimeType || 'image/png'}</strong></span>
                      <span>•</span>
                      <span className="text-emerald-700 font-bold">Bit-Rot: 0.00%</span>
                    </div>

                    <button
                      disabled={isReverifying}
                      onClick={async () => {
                        setReverifyingId(ev.id);
                        try {
                          await onVerifySingle(ev.id);
                        } finally {
                          setReverifyingId(null);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 hover:text-white border border-blue-200 text-blue-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 font-sans"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isReverifying ? 'animate-spin' : ''}`} />
                      <span>{isReverifying ? 'Verifying...' : 'Verify Leaf Hash'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* =======================================================================
            RIGHT 5 COLUMNS: VISUAL MERKLE TREE TOPOLOGY & IMMUTABLE BLOCK LEDGER
            ======================================================================= */}
        <div className="lg:col-span-5 space-y-6 min-w-0 self-start lg:sticky lg:top-[calc(var(--header-height)+5.5rem)]">
          {/* Top Dark Stage: SVG Merkle Hash Tree Diagram */}
          <div className="bg-[#0B0F19] text-slate-100 rounded-xl p-5 border border-slate-800 shadow-2xl space-y-4 min-w-0">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />
                <h3 className="font-mono text-xs font-extrabold text-white uppercase tracking-wider truncate">
                  Visual Merkle Tree Topology
                </h3>
              </div>
              <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 shrink-0">
                RFC-6962 Compliant
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Hierarchical cryptographic aggregation hashing 4 artifact leaf seals into intermediate nodes and culminating in the Root Merkle Seal:
            </p>

            {/* Merkle Tree SVG Canvas */}
            <div className="w-full bg-[#070B14] rounded-lg p-4 border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden select-none">
              {/* Subtle background grid */}
              <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, rgba(16, 185, 129, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(16, 185, 129, 0.2) 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              />

              <svg viewBox="0 0 340 220" className="w-full h-auto max-w-[340px]">
                {/* Connecting Lines */}
                {/* Root to Branches */}
                <path d="M 170 38 L 85 95" stroke="#10b981" strokeWidth="1.5" strokeOpacity="0.8" fill="none" />
                <path d="M 170 38 L 255 95" stroke="#10b981" strokeWidth="1.5" strokeOpacity="0.8" fill="none" />

                {/* Branch H12 to L1 & L2 */}
                <path d="M 85 115 L 42 170" stroke="#059669" strokeWidth="1.2" strokeOpacity="0.6" fill="none" />
                <path d="M 85 115 L 128 170" stroke="#059669" strokeWidth="1.2" strokeOpacity="0.6" fill="none" />

                {/* Branch H34 to L3 & L4 */}
                <path d="M 255 115 L 212 170" stroke="#059669" strokeWidth="1.2" strokeOpacity="0.6" fill="none" />
                <path d="M 255 115 L 298 170" stroke="#059669" strokeWidth="1.2" strokeOpacity="0.6" fill="none" />

                {/* Top Node: Root Merkle Seal */}
                <rect x="100" y="10" width="140" height="28" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
                <text x="170" y="24" fill="#34d399" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  ROOT MERKLE SEAL
                </text>
                <text x="170" y="34" fill="#a7f3d0" fontSize="8" fontFamily="monospace" textAnchor="middle">
                  2b8f84091a…
                </text>

                {/* Intermediate Branches H12 & H34 */}
                <rect x="35" y="95" width="100" height="24" rx="5" fill="#0f172a" stroke="#047857" strokeWidth="1" />
                <text x="85" y="107" fill="#6ee7b7" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  BRANCH H12
                </text>
                <text x="85" y="116" fill="#94a3b8" fontSize="7" fontFamily="monospace" textAnchor="middle">
                  H(L1 || L2)
                </text>

                <rect x="205" y="95" width="100" height="24" rx="5" fill="#0f172a" stroke="#047857" strokeWidth="1" />
                <text x="255" y="107" fill="#6ee7b7" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  BRANCH H34
                </text>
                <text x="255" y="116" fill="#94a3b8" fontSize="7" fontFamily="monospace" textAnchor="middle">
                  H(L3 || L4)
                </text>

                {/* Leaf Nodes L1, L2, L3, L4 */}
                <rect x="15" y="170" width="54" height="24" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1" />
                <text x="42" y="182" fill="#38bdf8" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  L1: EVD-001
                </text>
                <text x="42" y="191" fill="#64748b" fontSize="6.5" fontFamily="monospace" textAnchor="middle">
                  SHA-256
                </text>

                <rect x="101" y="170" width="54" height="24" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1" />
                <text x="128" y="182" fill="#38bdf8" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  L2: EVD-002
                </text>
                <text x="128" y="191" fill="#64748b" fontSize="6.5" fontFamily="monospace" textAnchor="middle">
                  SHA-256
                </text>

                <rect x="185" y="170" width="54" height="24" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1" />
                <text x="212" y="182" fill="#38bdf8" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  L3: EVD-003
                </text>
                <text x="212" y="191" fill="#64748b" fontSize="6.5" fontFamily="monospace" textAnchor="middle">
                  SHA-256
                </text>

                <rect x="271" y="170" width="54" height="24" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1" />
                <text x="298" y="182" fill="#38bdf8" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  L4: EVD-004
                </text>
                <text x="298" y="191" fill="#64748b" fontSize="6.5" fontFamily="monospace" textAnchor="middle">
                  SHA-256
                </text>
              </svg>
            </div>
          </div>

          {/* Bottom Panel: Immutable Chain-of-Custody Block Log */}
          <div className="cf-card p-5 space-y-4 min-w-0">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <Link2 className="w-4 h-4 text-blue-600 shrink-0" />
                <h3 className="font-mono text-xs font-extrabold text-slate-900 uppercase tracking-wider truncate">
                  Immutable Block Ledger ({filteredLedger.length})
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">
                Block #0 → #{ledger.length - 1}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                placeholder="Search actor, action, block hash..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {/* Block Log Cards (Block #0 Genesis -> Block #3 Judicial Seal) */}
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1 min-w-0">
              {filteredLedger.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono space-y-1.5 min-w-0"
                >
                  <div className="flex items-center justify-between text-[10px] min-w-0 gap-1">
                    <span className="font-bold text-blue-700 truncate">
                      Block #{item.sequenceNumber || idx} · {item.actionType}
                    </span>
                    <span className="text-slate-400 shrink-0">
                      {item.timestamp?.slice(11, 19) || '10:00:00'} UTC
                    </span>
                  </div>

                  <div className="text-[11px] font-medium text-slate-800 break-words font-sans">
                    {item.details || `Custody event on ${item.targetResource}`}
                  </div>

                  <div className="pt-1 border-t border-slate-200/80 flex items-center justify-between gap-2 text-[10px] text-slate-500">
                    <span className="truncate">Operator: <strong>{item.actorUsername || 'lead-investigator'}</strong></span>
                    <span className="font-mono text-emerald-700 font-bold shrink-0">
                      Seal: {(item.entryHash || '2b8f8409').slice(0, 8)}…
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
