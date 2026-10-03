import React, { useState } from 'react';
import {
  TimelineEvent,
  ForensicCaseSummary,
  EvidenceItem,
  ExtractedEntity,
} from '../types';
import {
  ArrowLeft,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Code2,
  ShieldAlert,
  Clock,
  CheckCircle2,
  ExternalLink,
  Terminal,
  Flame,
  Lock,
} from 'lucide-react';

interface TimelineReconstructionViewProps {
  activeCase?: ForensicCaseSummary;
  timeline: TimelineEvent[];
  evidenceList: EvidenceItem[];
  entities?: ExtractedEntity[];
  onSelectEvidence: (evidenceId: string) => void;
  onSelectEntity?: (entityId: string) => void;
  onAddMilestone?: (payload: {
    title: string;
    description: string;
    killChainPhase: string;
    severity: string;
  }) => Promise<void>;
}

export const TimelineReconstructionView: React.FC<
  TimelineReconstructionViewProps
> = ({
  activeCase,
  timeline,
  evidenceList,
  entities = [],
  onSelectEvidence,
  onSelectEntity,
  onAddMilestone,
}) => {
  const [selectedEventIndex, setSelectedEventIndex] = useState<number>(0);
  const [isolateEndpoint, setIsolateEndpoint] = useState<boolean>(true);
  const [openAccordion, setOpenAccordion] = useState<
    'ROOT_CAUSE' | 'SCOPE' | 'COMMUNICATION'
  >('ROOT_CAUSE');
  const [showRawModal, setShowRawModal] = useState<boolean>(false);
  const [eventFilter, setEventFilter] = useState<'ALL' | 'ANOMALIES'>('ALL');
  const [showAddMilestone, setShowAddMilestone] = useState<boolean>(false);
  const [milestoneTitle, setMilestoneTitle] = useState<string>('');
  const [milestoneDesc, setMilestoneDesc] = useState<string>('');
  const [milestonePhase, setMilestonePhase] = useState<string>(
    'FINANCIAL_EXECUTION'
  );
  const [milestoneSeverity, setMilestoneSeverity] = useState<string>('HIGH');

  const filteredTimeline =
    eventFilter === 'ALL'
      ? timeline
      : timeline.filter((t) => t.anomalyFlag);

  const activeEvent =
    filteredTimeline[selectedEventIndex] || timeline[0] || null;

  const relayEntity =
    entities.find((e) => e.entityType === 'IP_ADDRESS') ||
    entities.find((e) => e.entityType === 'URL');
  const domainEntity =
    entities.find((e) => e.entityType === 'URL') ||
    entities.find((e) => e.entityType === 'EMAIL');
  const muleEntity =
    entities.find((e) => e.entityType === 'UPI_ID') ||
    entities.find((e) => e.entityType === 'BANK_ACCOUNT');
  const exitEntity =
    entities.find((e) => e.entityType === 'CRYPTO_WALLET') ||
    entities.find((e) => e.entityType === 'TRANSACTION_ID');

  const formatTimeShort = (iso?: string) => {
    if (!iso) return '14:18:10';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso.slice(11, 19) || '14:18:10';
    return d.toISOString().slice(11, 19);
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Top Discovery Board Header Bar (Ref: image-12.png dark teal bar `#1b3536`) */}
      <div
        className="rounded-2xl px-5 py-3.5 text-white shadow-md flex flex-wrap items-center justify-between gap-4"
        style={{ backgroundColor: '#1b3536' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-teal-200 flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            Alerts /
          </span>
          <span className="text-xs font-extrabold text-white tracking-wide">
            Discovery Board
          </span>
        </div>

        <div className="text-xs sm:text-sm font-bold text-teal-50 truncate">
          Incident #{activeCase?.caseNumber || 'CFX-2026-0891'} ·{' '}
          {activeCase?.title || 'Cross-Channel Attack Timeline'}
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs font-semibold text-teal-100 cursor-pointer select-none">
            <span>Isolate Mule &amp; Endpoint</span>
            <button
              type="button"
              onClick={() => setIsolateEndpoint(!isolateEndpoint)}
              className={`w-9 h-5 rounded-full p-0.5 transition ${
                isolateEndpoint ? 'bg-teal-400' : 'bg-slate-600'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow transition transform ${
                  isolateEndpoint ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </label>

          {onAddMilestone && (
            <button
              onClick={() => setShowAddMilestone(!showAddMilestone)}
              className="px-3.5 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-extrabold transition"
            >
              + Log Milestone
            </button>
          )}

          <button
            onClick={() => setShowRawModal(!showRawModal)}
            className="px-3.5 py-1.5 rounded-lg border border-teal-500/60 hover:bg-teal-900/60 text-xs font-bold text-teal-50 transition"
          >
            {showRawModal ? 'Hide Raw JSON' : 'Verify STIX Trace'}
          </button>
        </div>
      </div>

      {/* Optional Investigator Milestone Form */}
      {showAddMilestone && onAddMilestone && (
        <div className="bg-white rounded-2xl border border-teal-300 p-4 shadow-md flex flex-wrap items-end gap-3 text-xs">
          <div className="flex-1 min-w-[180px]">
            <label className="block font-bold text-slate-700 mb-1">
              Milestone Title
            </label>
            <input
              type="text"
              value={milestoneTitle}
              onChange={(e) => setMilestoneTitle(e.target.value)}
              placeholder="e.g., Bank Freeze Request Issued to NPCI"
              className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-semibold"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block font-bold text-slate-700 mb-1">
              Forensic Note / Observation
            </label>
            <input
              type="text"
              value={milestoneDesc}
              onChange={(e) => setMilestoneDesc(e.target.value)}
              placeholder="Traced secondary IMPS settlement hop..."
              className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Kill-Chain Stage
            </label>
            <select
              value={milestonePhase}
              onChange={(e) => setMilestonePhase(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-mono"
            >
              <option value="RECON_AND_LURE">RECON_AND_LURE</option>
              <option value="CREDENTIAL_HARVEST">CREDENTIAL_HARVEST</option>
              <option value="FINANCIAL_EXECUTION">FINANCIAL_EXECUTION</option>
              <option value="MULE_LAYERING">MULE_LAYERING</option>
              <option value="CASH_OUT_EXIT">CASH_OUT_EXIT</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Severity
            </label>
            <select
              value={milestoneSeverity}
              onChange={(e) => setMilestoneSeverity(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-bold"
            >
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
            </select>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (!milestoneTitle.trim()) return;
              await onAddMilestone({
                title: milestoneTitle,
                description: milestoneDesc || milestoneTitle,
                killChainPhase: milestonePhase,
                severity: milestoneSeverity,
              });
              setMilestoneTitle('');
              setMilestoneDesc('');
              setShowAddMilestone(false);
            }}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold transition"
          >
            Save Milestone
          </button>
        </div>
      )}

      {/* Main Discovery Board Split Layout (Ref: image-12.png) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 4 Columns: Contextualized Alert Description + Root Cause / Scope / Communication Accordion (Ref: image-12.png) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Description
            </div>

            {/* Alert Title Card */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0 mt-0.5">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900 leading-snug">
                    {activeEvent?.title ||
                      'Credential Injection & Rapid Fund Exfiltration'}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold">
                      {activeEvent?.severity || activeCase?.severity || 'CRITICAL'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {formatTimeShort(activeEvent?.eventTimestamp)} UTC
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {activeEvent?.description || activeCase?.summary}
            </p>

            {/* Collapsible Sections: Root cause, Scope, Communication (Ref: image-12.png left panel) */}
            <div className="border-t border-slate-200 pt-2 space-y-1">
              {/* 1. Root cause */}
              <div className="border-b border-slate-100 py-2.5">
                <button
                  onClick={() => setOpenAccordion('ROOT_CAUSE')}
                  className="w-full flex items-center justify-between text-xs font-extrabold text-slate-800"
                >
                  <span>Root cause</span>
                  {openAccordion === 'ROOT_CAUSE' ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                {openAccordion === 'ROOT_CAUSE' && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-mono font-bold text-slate-900">
                      <Terminal className="w-3.5 h-3.5 text-red-600" />
                      <span>{activeEvent?.evidenceCode || 'EV-2026-001'}</span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Kill-Chain Stage:{' '}
                      <strong className="text-slate-900">
                        {activeEvent?.killChainPhase || 'INITIAL_LURE'}
                      </strong>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Actor{' '}
                      <strong className="text-slate-800">
                        {activeEvent?.actorEntity || 'Threat Actor'}
                      </strong>{' '}
                      targeted{' '}
                      <strong className="text-slate-800">
                        {activeEvent?.targetEntity ||
                          activeCase?.victimName ||
                          'Victim Account'}
                      </strong>
                      .
                    </div>
                    {activeEvent?.evidenceId && (
                      <button
                        onClick={() =>
                          activeEvent.evidenceId &&
                          onSelectEvidence(activeEvent.evidenceId)
                        }
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
                      >
                        <span>Inspect Source Artifact in Vault</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Scope */}
              <div className="border-b border-slate-100 py-2.5">
                <button
                  onClick={() => setOpenAccordion('SCOPE')}
                  className="w-full flex items-center justify-between text-xs font-extrabold text-slate-800"
                >
                  <span className="flex items-center gap-2">
                    <span>Scope</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                      {evidenceList.length}
                    </span>
                  </span>
                  {openAccordion === 'SCOPE' ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                {openAccordion === 'SCOPE' && (
                  <div className="mt-2.5 space-y-1.5 text-xs text-slate-600">
                    <div>
                      • Victim Identity:{' '}
                      {activeCase?.victimName || 'Arjun Mehta'}
                    </div>
                    <div>
                      • Total Quantified Exposure: $
                      {(activeCase?.estimatedLossUsd || 14850).toLocaleString()}
                    </div>
                    <div>
                      • Correlated Evidence Files: {evidenceList.length}{' '}
                      WORM-Sealed
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Communication */}
              <div className="py-2.5">
                <button
                  onClick={() => setOpenAccordion('COMMUNICATION')}
                  className="w-full flex items-center justify-between text-xs font-extrabold text-slate-800"
                >
                  <span className="flex items-center gap-2">
                    <span>Communication</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                      3
                    </span>
                  </span>
                  {openAccordion === 'COMMUNICATION' ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                {openAccordion === 'COMMUNICATION' && (
                  <div className="mt-2.5 space-y-1.5 text-xs font-mono text-slate-600">
                    <div>
                      • C2 Relay:{' '}
                      {relayEntity?.displayLabel || '185.220.101.44 (AS205100)'}
                    </div>
                    <div>
                      • Lure Vector:{' '}
                      {domainEntity?.displayLabel || 'hdfc-kyc-update-in.com'}
                    </div>
                    <div>
                      • Settlement Rail:{' '}
                      {muleEntity?.displayLabel || 'UPI / SWIFT / TRC-20'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Raw Data Button (Ref: image-12.png `</> Raw data`) */}
          <button
            onClick={() => setShowRawModal(!showRawModal)}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition"
          >
            <Code2 className="w-4 h-4 text-slate-500" />
            <span>Raw Forensic Event Telemetry</span>
          </button>
        </div>

        {/* Right 8 Columns: Contextualized Process/Lure Injection Flow Diagram + Horizontal Timeline + Suspicions List (Ref: image-12.png) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Top Panel: Contextualized Lure-to-Settlement Flow Diagram (Ref: image-12.png) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Trust Contextualized Attack Flow · Kill-Chain Injection
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Active Focus:{' '}
                {activeEvent?.killChainPhase || 'CREDENTIAL_HARVEST'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <svg viewBox="0 0 760 225" className="w-full min-w-[620px] h-52">
                {/* Left Red Injector Circle (Ref: image-12.png `colorcpl.exe` red circle) */}
                <g transform="translate(115, 112)">
                  <circle
                    r="62"
                    fill="#fff1f2"
                    stroke="#ef4444"
                    strokeWidth="2.5"
                  />
                  <g transform="translate(0, -62)">
                    <polygon
                      points="0,-11 10,-5 10,5 0,11 -10,5 -10,-5"
                      fill="#ef4444"
                    />
                    <text
                      y="3.5"
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="bold"
                      fill="#ffffff"
                    >
                      !
                    </text>
                  </g>
                  <text
                    y="-8"
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="800"
                    fill="#0f172a"
                  >
                    {activeEvent?.actorEntity
                      ? activeEvent.actorEntity.slice(0, 18)
                      : 'Phishing Lure'}
                  </text>
                  <text
                    y="10"
                    textAnchor="middle"
                    fontSize="9.5"
                    fontFamily="monospace"
                    fill="#dc2626"
                  >
                    {activeEvent?.evidenceCode || 'EV-2026-001'}
                  </text>
                  <text
                    y="26"
                    textAnchor="middle"
                    fontSize="8.5"
                    fill="#64748b"
                  >
                    Initial Lure / Injector
                  </text>
                </g>

                {/* Horizontal Injection Line + `[</>]` Badge (Ref: image-12.png) */}
                <line
                  x1="177"
                  y1="112"
                  x2="288"
                  y2="112"
                  stroke="#94a3b8"
                  strokeWidth="2"
                />
                <polygon points="288,112 280,107 280,117" fill="#64748b" />
                <g transform="translate(232, 112)">
                  <rect
                    x="-18"
                    y="-12"
                    width="36"
                    height="24"
                    rx="6"
                    fill="#f8fafc"
                    stroke="#cbd5e1"
                    strokeWidth="1.5"
                  />
                  <text
                    y="4"
                    textAnchor="middle"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                    fill="#334155"
                  >
                    &lt;/&gt;
                  </text>
                </g>

                {/* Center Blue Target Circle (Ref: image-12.png `ConvertTo-Json` blue circle) */}
                <g transform="translate(355, 112)">
                  <circle
                    r="64"
                    fill="#eff6ff"
                    stroke="#3b82f6"
                    strokeWidth="2.5"
                  />
                  <g transform="translate(0, -64)">
                    <circle r="11" fill="#f97316" />
                    <text
                      y="3.5"
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="bold"
                      fill="#ffffff"
                    >
                      ⚡
                    </text>
                  </g>
                  <text
                    y="-8"
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="800"
                    fill="#0f172a"
                  >
                    {activeEvent?.targetEntity
                      ? activeEvent.targetEntity.slice(0, 18)
                      : activeCase?.victimName || 'Victim Session'}
                  </text>
                  <text
                    y="10"
                    textAnchor="middle"
                    fontSize="9.5"
                    fontFamily="monospace"
                    fill="#2563eb"
                  >
                    {activeEvent?.killChainPhase || 'SESSION_HIJACK'}
                  </text>
                  <text
                    y="26"
                    textAnchor="middle"
                    fontSize="8.5"
                    fill="#64748b"
                  >
                    Target Session / Rail
                  </text>
                </g>

                {/* Branching Curved Connectors to Right-hand Outgoing Connections (Ref: image-12.png) */}
                <path
                  d="M 419 112 C 465 112, 470 42, 520 42"
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="1.8"
                />
                <path
                  d="M 419 112 L 520 112"
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="1.8"
                />
                <path
                  d="M 419 112 C 465 112, 470 182, 520 182"
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="1.8"
                />

                {[
                  {
                    y: 42,
                    badge: 'C2 / Lure Relay',
                    value: (
                      relayEntity?.displayLabel || '185.220.101.44 (DE)'
                    ).slice(0, 26),
                    entityId: relayEntity?.id,
                    color: '#ef4444',
                  },
                  {
                    y: 112,
                    badge: 'Mule Aggregation Rail',
                    value: (
                      muleEntity?.displayLabel ||
                      'apex.verify.settlement@okaxis'
                    ).slice(0, 26),
                    entityId: muleEntity?.id,
                    color: '#ea580c',
                  },
                  {
                    y: 182,
                    badge: 'Settlement / Exit',
                    value: (
                      exitEntity?.displayLabel || 'TQn9Y2khEsLJW1ChVWF… (USDT)'
                    ).slice(0, 26),
                    entityId: exitEntity?.id,
                    color: '#2563eb',
                  },
                ].map((out, idx) => (
                  <g
                    key={idx}
                    transform={`translate(525, ${out.y - 18})`}
                    onClick={() =>
                      out.entityId &&
                      onSelectEntity &&
                      onSelectEntity(out.entityId)
                    }
                    className={out.entityId ? 'cursor-pointer' : undefined}
                  >
                    <rect
                      width="215"
                      height="36"
                      rx="10"
                      fill="#f8fafc"
                      stroke="#cbd5e1"
                      strokeWidth="1.4"
                    />
                    <circle cx="18" cy="18" r="5" fill={out.color} />
                    <text
                      x="32"
                      y="15"
                      fontSize="8.5"
                      fontWeight="bold"
                      fill="#64748b"
                    >
                      {out.badge}
                    </text>
                    <text
                      x="32"
                      y="27"
                      fontSize="9.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                      fill="#0f172a"
                    >
                      {out.value}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Middle Panel: Horizontal Milestone Timeline (Ref: image-12.png) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <h3 className="text-sm font-extrabold text-slate-900">
                  Timeline
                </h3>
                <span className="text-xs font-bold text-teal-700 border-b-2 border-teal-600 pb-0.5">
                  Events ({filteredTimeline.length})
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block rotate-45" />
                  Suspicions &amp; EXIF Anomalies
                </span>
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-teal-600 inline-block" />
                  Verified Events
                </span>

                <select
                  aria-label="Filter timeline events"
                  value={eventFilter}
                  onChange={(e) => {
                    setEventFilter(e.target.value as 'ALL' | 'ANOMALIES');
                    setSelectedEventIndex(0);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700"
                >
                  <option value="ALL">All events ({timeline.length})</option>
                  <option value="ANOMALIES">
                    Timestamp Anomalies Only (
                    {timeline.filter((t) => t.anomalyFlag).length})
                  </option>
                </select>
              </div>
            </div>

            {/* Horizontal Interactive Node Strip with Elapsed Time Pills (Ref: image-12.png) */}
            <div className="overflow-x-auto py-3">
              <div className="flex items-center min-w-[600px] px-2">
                {filteredTimeline.map((ev, idx) => {
                  const isSelected = idx === selectedEventIndex;
                  const elapsedLabels = ['10m', '8m', '9m', '14m', '22m'];
                  return (
                    <React.Fragment key={ev.id}>
                      <button
                        onClick={() => setSelectedEventIndex(idx)}
                        className={`group flex flex-col items-center text-center transition px-2 py-2 rounded-xl ${
                          isSelected
                            ? 'bg-teal-50/90 border border-teal-300 shadow-sm'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-[10px] font-bold text-slate-500 mb-1.5 max-w-[110px] truncate">
                          {ev.killChainPhase.replace(/_/g, ' ')}
                        </span>

                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition ${
                            ev.anomalyFlag
                              ? 'bg-red-600 text-white ring-4 ring-red-100'
                              : isSelected
                              ? 'bg-teal-700 text-white ring-4 ring-teal-100'
                              : 'bg-white border-2 border-teal-600 text-teal-700'
                          }`}
                        >
                          {ev.anomalyFlag ? '!' : idx + 1}
                        </div>

                        <span className="text-[11px] font-mono font-bold text-slate-700 mt-1.5">
                          {formatTimeShort(ev.eventTimestamp)}
                        </span>
                      </button>

                      {idx < filteredTimeline.length - 1 && (
                        <div className="flex-1 flex items-center min-w-[54px]">
                          <div className="h-0.5 flex-1 bg-slate-300" />
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-mono font-semibold text-slate-500">
                            {elapsedLabels[idx % elapsedLabels.length]}
                          </span>
                          <div className="h-0.5 flex-1 bg-slate-300" />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Bottom Suspicions & Trust Contextualized Alerts List (Ref: image-12.png bottom section) */}
            <div className="pt-2 border-t border-slate-100 space-y-2.5">
              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Suspicions &amp; Trust Contextualized Alerts
              </div>

              {filteredTimeline.map((ev, idx) => {
                const isSelected = idx === selectedEventIndex;
                return (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEventIndex(idx)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer ${
                      ev.anomalyFlag
                        ? 'bg-red-50/60 border-red-200 hover:bg-red-50'
                        : isSelected
                        ? 'bg-slate-50 border-teal-300'
                        : 'bg-white border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        {ev.anomalyFlag ? (
                          <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                        )}
                        <span className="text-xs font-extrabold text-slate-900">
                          {ev.title}
                        </span>
                        {ev.evidenceCode && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                            {ev.evidenceCode}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{ev.eventTimestamp}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      {ev.description}
                    </p>

                    {ev.anomalyFlag && ev.anomalyReason && (
                      <div className="mt-2.5 p-2.5 rounded-lg bg-white border border-red-200 flex items-start gap-2 text-xs text-red-700">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-extrabold">
                            FORENSIC METADATA TAMPERING DETECTED:
                          </div>
                          <div className="text-[11px] mt-0.5">
                            {ev.anomalyReason}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {showRawModal && activeEvent && (
            <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 font-mono text-xs overflow-x-auto">
              <div className="flex items-center justify-between text-slate-400 pb-2 mb-2 border-b border-slate-800">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-teal-400" />
                  STIX 2.1 Observed-Data &amp; Chronological Event Payload
                </span>
                <span>{activeEvent.id}</span>
              </div>
              <pre className="text-[11px] leading-relaxed text-teal-300">
                {JSON.stringify(activeEvent, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
