import React, { useState } from 'react';
import {
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Shield,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Lock,
  Mail,
  FileWarning,
  Network,
} from 'lucide-react';
import {
  ForensicCaseSummary,
  EvidenceItem,
  ExtractedEntity,
  EntityRelationship,
  TimelineEvent,
  UserProfile,
} from '../types';
import { GlobalThreatOriginMap } from './GlobalThreatOriginMap';

interface ExecutiveDashboardViewProps {
  currentUser: UserProfile | null;
  activeCase: ForensicCaseSummary;
  evidenceList: EvidenceItem[];
  entities: ExtractedEntity[];
  relationships: EntityRelationship[];
  timeline: TimelineEvent[];
  onNavigateTab: (tab: 'OVERVIEW' | 'EVIDENCE' | 'TIMELINE' | 'GRAPH' | 'INTEGRITY' | 'REPORT') => void;
  onSelectEntityForGraph: (entityId: string) => void;
  onSelectEvidenceForVault: (evidenceId: string) => void;
}

export const ExecutiveDashboardView: React.FC<ExecutiveDashboardViewProps> = ({
  currentUser,
  activeCase,
  evidenceList,
  entities,
  relationships,
  timeline,
  onNavigateTab,
  onSelectEntityForGraph,
  onSelectEvidenceForVault,
}) => {
  const [findingFilter, setFindingFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');

  const criticalEntities = entities.filter((e) => e.riskLevel === 'CRITICAL').length;
  const highEntities = entities.filter((e) => e.riskLevel === 'HIGH').length;
  const mediumEntities = entities.filter(
    (e) => e.riskLevel !== 'CRITICAL' && e.riskLevel !== 'HIGH'
  ).length;

  const phoneCount = entities.filter((e) => e.entityType === 'PHONE').length;
  const urlCount = entities.filter((e) => e.entityType === 'URL').length;
  const accountCount = entities.filter(
    (e) => e.entityType === 'UPI_ID' || e.entityType === 'BANK_ACCOUNT' || e.entityType === 'CRYPTO_WALLET'
  ).length;
  const ipCount = entities.filter((e) => e.entityType === 'IP_ADDRESS').length;

  const firstName = currentUser?.fullName
    ? currentUser.fullName.replace('Cmdr. ', '').split(' ')[0]
    : 'Investigator';

  return (
    <div className="space-y-6 pb-8">
      {/* Top Greeting Banner (Ref: image-1.png "Welcome back, Shafayet 👋" + Testing status: Active) */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Welcome back, {firstName}</span>
            <span role="img" aria-label="wave">
              👋
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            The forensic workspace is where you analyze digital evidence efficacy, reconstruct fraud timelines, and verify attack surfaces.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm flex items-center gap-2 text-xs font-medium text-slate-600">
            <span>Forensic Engine:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              Active
            </span>
          </div>

          <button
            onClick={() => onNavigateTab('REPORT')}
            className="px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
          >
            <span>Export Case Report</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Row 1: ThreatLens Blue Gradient Score Card + 4 Executive Metric Cards (Ref: image-1.png & image-5.png) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Blue Gradient Integrity & Risk Score Card (Ref: image-5.png) */}
        <div
          onClick={() => onNavigateTab('INTEGRITY')}
          className="cursor-pointer rounded-2xl p-5 text-white shadow-lg shadow-blue-500/15 flex flex-col justify-between transition hover:scale-[1.01]"
          style={{
            background: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 55%, #4f46e5 100%)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-50 flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              Case Risk Score
            </span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/20 text-white font-bold">
              {activeCase.severity}
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold tracking-tight font-mono">
              {activeCase.riskScore}
            </span>
            <span className="text-sm text-blue-100 font-medium">/ 100</span>
          </div>
          <div className="mt-3 text-[11px] text-blue-100 flex items-center justify-between">
            <span>{activeCase.caseNumber}</span>
            <span className="underline font-semibold">Inspect →</span>
          </div>
        </div>

        {/* Card 2: Sealed Evidence Artifacts (Ref: image-1.png) */}
        <div
          onClick={() => onNavigateTab('EVIDENCE')}
          className="cursor-pointer bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:border-blue-300 transition flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-700" />
              Sealed Evidence
            </span>
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-3 font-mono">
            {evidenceList.length}
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">SHA-256 &amp; BLAKE3</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">
              {activeCase.verifiedIntactCount}/{evidenceList.length} Intact ▲
            </span>
          </div>
        </div>

        {/* Card 3: Extracted Entities & IOCs */}
        <div
          onClick={() => onNavigateTab('GRAPH')}
          className="cursor-pointer bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:border-blue-300 transition flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-700" />
              Extracted Entities
            </span>
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-3 font-mono">
            {entities.length}
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Graph Topology</span>
            <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 font-bold">
              {relationships.length} Links ▲
            </span>
          </div>
        </div>

        {/* Card 4: Chronological Attack Events */}
        <div
          onClick={() => onNavigateTab('TIMELINE')}
          className="cursor-pointer bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:border-blue-300 transition flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-slate-700" />
              Attack Milestones
            </span>
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-3 font-mono">
            {timeline.length}
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Kill-Chain Stages</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold">
              {activeCase.metadataAnomalyCount} EXIF Alert ▲
            </span>
          </div>
        </div>

        {/* Card 5: Estimated Fraud Exposure */}
        <div
          onClick={() => onNavigateTab('REPORT')}
          className="cursor-pointer bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:border-blue-300 transition flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-700" />
              Fraud Exposure
            </span>
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-3 font-mono">
            ${activeCase.estimatedLossUsd.toLocaleString()}
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Lure-to-Settlement</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">
              27m Velocity ▲
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Finding Overview Stacked Severity Bar + Attack Surface Semicircle Gauge (Ref: image-1.png) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Finding & Entity Overview (Ref: image-1.png) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Forensic Finding &amp; Risk Overview
              </h2>
              <p className="text-xs text-slate-500">
                Active Case: <strong className="text-slate-800">{activeCase.title}</strong> ({activeCase.victimName})
              </p>
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              {(['ALL', 'OPEN', 'CLOSED'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFindingFilter(tab)}
                  className={`px-3 py-1 rounded-lg transition ${
                    findingFilter === tab
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab === 'ALL' ? 'All' : tab === 'OPEN' ? 'Active IOCs' : 'Verified'}
                </button>
              ))}
            </div>
          </div>

          {/* Severity Horizontal Segmented Bar (Ref: image-1.png) */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500">Severity Distribution</div>
            <div className="grid grid-cols-12 gap-2 h-12">
              <button
                onClick={() => onNavigateTab('GRAPH')}
                className="col-span-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center shadow-sm transition"
              >
                {criticalEntities} Critical
              </button>
              <button
                onClick={() => onNavigateTab('GRAPH')}
                className="col-span-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center justify-center shadow-sm transition"
              >
                {highEntities} High Risk
              </button>
              <button
                onClick={() => onNavigateTab('GRAPH')}
                className="col-span-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs flex items-center justify-center transition"
              >
                {mediumEntities} Medium
              </button>
              <div
                className="col-span-1 rounded-xl border border-slate-200"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(90deg, #e2e8f0, #e2e8f0 2px, transparent 2px, transparent 5px)',
                }}
              />
            </div>
          </div>

          {/* Investigation State Pills (Ref: image-1.png) */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500">Investigation Pipeline State</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div
                onClick={() => onNavigateTab('EVIDENCE')}
                className="cursor-pointer py-3.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-center text-xs font-bold text-slate-800 transition"
              >
                {evidenceList.length} Vault Artifacts Sealed
              </div>
              <div
                onClick={() => onNavigateTab('TIMELINE')}
                className="cursor-pointer py-3.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-center text-xs font-bold text-slate-800 transition"
              >
                {activeCase.riskIndicators?.length || 0} Forensic Alerts Active
              </div>
              <div
                onClick={() => onNavigateTab('REPORT')}
                className="cursor-pointer py-3.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-center text-xs font-bold text-slate-800 transition"
              >
                {activeCase.verifiedIntactCount} Hashes Court-Ready
              </div>
            </div>
          </div>

          {/* Attack Kill-Chain Duration Bar (Ref: image-1.png) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-500">Attack Reconstruction Window</span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[11px] font-bold">
                {timeline.length} Chronological Findings
              </span>
            </div>
            <div
              className="h-9 rounded-xl border border-slate-200/90 flex items-center px-4"
              style={{
                background:
                  'linear-gradient(90deg, #f8fafc 0%, #cbd5e1 45%, #f97316 70%, #f8fafc 100%)',
              }}
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>0m (Initial SMS Lure)</span>
              <span>10m (Evilginx Harvest)</span>
              <span>18m (UPI Transfer)</span>
              <span>27m (Mule Layer-2)</span>
              <span>40m (USDT Off-Ramp)</span>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Attack Surface Semicircle Gauge & Asset Breakdown (Ref: image-1.png) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900">Attack Surface &amp; IOCs</h2>
              <span className="text-xs font-mono text-slate-400">JGraphT Indexed</span>
            </div>

            {/* Semicircular Multi-Segment Gauge (Ref: image-1.png) */}
            <div className="relative flex flex-col items-center justify-center my-4">
              <svg viewBox="0 0 220 125" className="w-56 h-32">
                {/* Background Track */}
                <path
                  d="M 20 105 A 90 90 0 0 1 200 105"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="22"
                  strokeLinecap="butt"
                />
                {/* Segment 1: Deep Orange */}
                <path
                  d="M 20 105 A 90 90 0 0 1 75 26"
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="22"
                />
                {/* Segment 2: Coral Orange */}
                <path
                  d="M 78 25 A 90 90 0 0 1 142 25"
                  fill="none"
                  stroke="#fb923c"
                  strokeWidth="22"
                />
                {/* Segment 3: Soft Peach */}
                <path
                  d="M 145 26 A 90 90 0 0 1 182 60"
                  fill="none"
                  stroke="#fdba74"
                  strokeWidth="22"
                />
                {/* Segment 4: Pale Blush */}
                <path
                  d="M 184 63 A 90 90 0 0 1 200 105"
                  fill="none"
                  stroke="#ffedd5"
                  strokeWidth="22"
                />
              </svg>
              <div className=" -mt-12 text-center">
                <div className="text-3xl font-extrabold text-slate-900 font-mono">
                  {entities.length}
                </div>
                <div className="text-xs text-slate-500 font-medium">Correlated IOCs</div>
              </div>
            </div>

            {/* Breakdown List (Ref: image-1.png) */}
            <div className="space-y-2.5 mt-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2.5 text-slate-600 font-medium">
                  <span className="w-3 h-3 rounded bg-orange-500 inline-block" />
                  Mule Accounts &amp; Wallets
                </span>
                <span className="font-mono font-bold text-slate-900">{accountCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2.5 text-slate-600 font-medium">
                  <span className="w-3 h-3 rounded bg-orange-400 inline-block" />
                  Burner Phones (E.164)
                </span>
                <span className="font-mono font-bold text-slate-900">{phoneCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2.5 text-slate-600 font-medium">
                  <span className="w-3 h-3 rounded bg-orange-300 inline-block" />
                  Phishing Domains &amp; URLs
                </span>
                <span className="font-mono font-bold text-slate-900">{urlCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2.5 text-slate-600 font-medium">
                  <span className="w-3 h-3 rounded bg-orange-100 border border-orange-200 inline-block" />
                  C2 Relay IP Addresses
                </span>
                <span className="font-mono font-bold text-slate-900">{ipCount}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('GRAPH')}
            className="w-full mt-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-800 transition"
          >
            View Knowledge Graph Details
          </button>
        </div>
      </div>

      {/* Row 3: CORETIS Global Threat & Infrastructure Origin Map (Ref: image-1.png) */}
      <GlobalThreatOriginMap
        entities={entities}
        onInspectGraph={() => onNavigateTab('GRAPH')}
      />

      {/* Row 4: Live Correlated Evidence Stream + AI Forensic Reconstruction Insight & Recommended Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Live Correlated Evidence Stream */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">
              Live Correlated Evidence Stream
            </h3>
            <button
              onClick={() => onNavigateTab('EVIDENCE')}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              View Vault ↗
            </button>
          </div>

          <div className="space-y-2.5">
            {evidenceList.slice(0, 4).map((ev, i) => (
              <div
                key={ev.id}
                onClick={() => {
                  onSelectEvidenceForVault(ev.id);
                  onNavigateTab('EVIDENCE');
                }}
                className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-between gap-3 cursor-pointer transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                    {i === 0 ? (
                      <Mail className="w-4 h-4 text-red-500" />
                    ) : i === 1 ? (
                      <Lock className="w-4 h-4 text-blue-600" />
                    ) : (
                      <FileWarning className="w-4 h-4 text-orange-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {ev.originalFilename}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 truncate">
                      {ev.evidenceCode} → SHA256: {ev.sha256Hash.slice(0, 12)}…
                    </div>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                    ev.timestampAnomaly
                      ? 'bg-red-50 text-red-600 border border-red-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {ev.timestampAnomaly ? 'EXIF Tamper' : 'Verified'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right 5 Cols: Security Insight & Recommended Actions */}
        <div className="lg:col-span-5">
          <div
            className="h-full rounded-2xl border border-blue-200/80 p-5 shadow-sm flex flex-col justify-between space-y-3"
            style={{
              background:
                'linear-gradient(135deg, #f0f9ff 0%, #ffffff 60%, #f5f3ff 100%)',
            }}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-extrabold text-blue-700">
                <Sparkles className="w-4 h-4" />
                <span>AI Forensic Reconstruction Insight</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                PageRank centrality identifies{' '}
                <strong className="text-slate-900 font-mono">
                  {entities[0]?.displayLabel || 'apex.verify.settlement@okaxis'}
                </strong>{' '}
                as the primary aggregation hub linking burner VoIP lures to offshore settlement.
              </p>
            </div>

            <div className="space-y-1.5 pt-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                RECOMMENDED INVESTIGATOR ACTIONS
              </div>
              <button
                onClick={() => {
                  if (entities[0]) onSelectEntityForGraph(entities[0].id);
                  onNavigateTab('GRAPH');
                }}
                className="w-full px-3 py-2 rounded-xl bg-white hover:bg-blue-50/50 border border-slate-200/90 text-xs font-semibold text-slate-800 flex items-center justify-between transition"
              >
                <span className="flex items-center gap-2">
                  <Network className="w-3.5 h-3.5 text-blue-600" />
                  Trace Dijkstra Shortest Path to Crypto Off-Ramp
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <button
                onClick={() => onNavigateTab('TIMELINE')}
                className="w-full px-3 py-2 rounded-xl bg-white hover:bg-blue-50/50 border border-slate-200/90 text-xs font-semibold text-slate-800 flex items-center justify-between transition"
              >
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  Inspect EXIF Timestamp Tampering in Discovery Board
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
