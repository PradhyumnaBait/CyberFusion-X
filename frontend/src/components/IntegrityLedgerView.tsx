import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  CheckCircle2,
  Link2,
  FileCheck2,
  RefreshCw,
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

export const IntegrityLedgerView: React.FC<IntegrityLedgerViewProps> = ({
  evidenceList,
  verifications,
  ledger,
  chainVerification,
  onVerifySingle,
  onVerifyAllCaseEvidence,
  onRefreshLedger,
}) => {
  return (
    <div className="space-y-6 pb-8">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold mb-2">
            <Lock className="w-3.5 h-3.5" />
            <span>Cryptographic Chain-of-Custody &amp; Dual-Hash Verification</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            Cryptographic Integrity &amp; Merkle Custody Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Every evidence operation is appended to a hash-chained ledger (`EntryHash = SHA256(PrevHash || Timestamp || Actor || Action || EvidenceSHA256)`).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onVerifyAllCaseEvidence}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Re-Verify All Case Hashes</span>
          </button>
          <button
            onClick={onRefreshLedger}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Verify Merkle Chain</span>
          </button>
        </div>
      </div>

      {/* Merkle Chain Status Banner */}
      {chainVerification && (
        <div
          className={`rounded-2xl p-5 border shadow-sm flex flex-wrap items-center justify-between gap-4 ${
            chainVerification.chainIntact
              ? 'bg-emerald-50/70 border-emerald-200'
              : 'bg-red-50/70 border-red-200'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                chainVerification.chainIntact
                  ? 'bg-emerald-600 text-white'
                  : 'bg-red-600 text-white'
              }`}
            >
              {chainVerification.chainIntact ? (
                <ShieldCheck className="w-6 h-6" />
              ) : (
                <ShieldAlert className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="text-sm font-extrabold text-slate-900">
                {chainVerification.chainIntact
                  ? 'CHAIN-OF-CUSTODY MERKLE LEDGER VERIFIED INTACT'
                  : 'CHAIN-OF-CUSTODY TAMPER DETECTED'}
              </div>
              <div className="text-xs text-slate-600 font-mono mt-0.5">
                Head Merkle Digest: {chainVerification.headMerkleHash}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs font-bold text-slate-500">
              Verified Blocks
            </div>
            <div className="text-xl font-extrabold font-mono text-slate-900">
              {chainVerification.totalEntriesVerified} Entries
            </div>
          </div>
        </div>
      )}

      {/* Dual-Hash Evidence Verification Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-900">
            Evidence Cryptographic Seal Matrix (SHA-256 + BLAKE3)
          </h2>
          <span className="text-xs font-mono text-slate-400">
            Zero-Tolerance Bit-Flip Detection
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {evidenceList.map((ev) => {
            const latestVer = verifications.find((v) => v.evidenceId === ev.id);
            const intact = ev.integrityStatus === 'VERIFIED_INTACT';
            return (
              <div
                key={ev.id}
                className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono text-xs font-bold border border-blue-200">
                      {ev.evidenceCode}
                    </span>
                    <span className="text-sm font-extrabold text-slate-900">
                      {ev.originalFilename}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        intact
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {ev.integrityStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-slate-600 pt-1">
                    <div className="truncate">
                      <span className="text-slate-400">Expected SHA-256: </span>
                      {ev.sha256Hash}
                    </div>
                    <div className="truncate">
                      <span className="text-slate-400">Expected BLAKE3: </span>
                      {ev.blake3Hash}
                    </div>
                  </div>

                  {latestVer && (
                    <div className="text-[11px] font-mono text-slate-500">
                      Last Re-Computed ({latestVer.verifiedAt}):{' '}
                      <strong
                        className={
                          latestVer.status === 'VERIFIED_INTACT'
                            ? 'text-emerald-700'
                            : 'text-red-600'
                        }
                      >
                        {(latestVer.computedSha256 || '').slice(0, 24)}…
                      </strong>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onVerifySingle(ev.id)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-800 shrink-0 transition"
                >
                  Re-Hash Artifact Now
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hash-Chained Chain-of-Custody Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-extrabold text-slate-900">
              Immutable Chain-of-Custody Audit Ledger
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {ledger.length} Chained Custody Blocks
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase text-slate-400">
                <th className="py-3 px-4">Seq</th>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Custody Action</th>
                <th className="py-3 px-4">Previous Block Hash</th>
                <th className="py-3 px-4">Current Merkle Entry Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {ledger.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    #{item.sequenceNumber}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                    {item.timestamp}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {item.actorUsername}{' '}
                    <span className="text-[10px] text-slate-400">
                      ({item.actorRole})
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-[10px] font-bold border border-blue-200">
                      {item.actionType}
                    </span>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {item.details}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                    {(item.previousHash || '').slice(0, 16)}…
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] font-bold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{(item.entryHash || '').slice(0, 18)}…</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
