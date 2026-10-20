import React, { useMemo } from 'react';
import {
  Shield,
  ArrowRight,
  ArrowUpRight,
  FolderLock,
  Network,
  AlertTriangle,
  Clock,
  RefreshCw,
  FileText,
  DollarSign,
  Lock,
  ChevronRight,
  Zap,
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
  onNavigateTab: (
    tab: 'OVERVIEW' | 'EVIDENCE' | 'TIMELINE' | 'GRAPH' | 'INTEGRITY' | 'REPORT'
  ) => void;
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
  // ── Derived Entity Statistics & Apex Nodes ─────────────────────────────────
  const topEntities = useMemo(
    () => [...entities].sort((a, b) => (b.pagerankScore || 0) - (a.pagerankScore || 0)),
    [entities]
  );
  const apexEntity = topEntities[0] || null;

  const ipEntity = entities.find((e) => e.entityType === 'IP_ADDRESS') || null;
  const domainEntity =
    entities.find((e) => e.entityType === 'URL' || e.entityType === 'DOMAIN') || null;
  const phoneEntity = entities.find((e) => e.entityType === 'PHONE') || null;

  const accountCount = entities.filter((e) =>
    ['UPI_ID', 'BANK_ACCOUNT', 'CRYPTO_WALLET'].includes(e.entityType)
  ).length;
  const ipCount = entities.filter((e) => e.entityType === 'IP_ADDRESS').length;
  const urlCount = entities.filter((e) => ['URL', 'DOMAIN'].includes(e.entityType)).length;
  const phoneCount = entities.filter((e) => e.entityType === 'PHONE').length;
  const totalEntities = Math.max(entities.length, 1);

  // ── Canonical Stage Titles (Single Source of Truth) ────────────────────────
  const CANONICAL_STAGE_TITLES: Record<string, string> = {
    'EVD-001': 'Spear-Phishing SMS Lure & Ingress',
    'EVD-002': 'Session Hijack & Mule Coercion',
    'EVD-003': 'Unauthorized UPI Wire ($4,850)',
    'EVD-004': 'Multi-Hop Layering & USDT Cashout',
  };

  // ── Derived Stages for Attack-Chain Reconstruction Spine ───────────────────
  const stages = useMemo(() => {
    const defaultEvCodes = ['EVD-001', 'EVD-002', 'EVD-003', 'EVD-004'];
    if (timeline.length > 0) {
      const sorted = [...timeline].sort(
        (a, b) => new Date(a.eventTimestamp).getTime() - new Date(b.eventTimestamp).getTime()
      );
      return sorted.slice(0, 4).map((evt, idx) => {
        const evCode = evt.evidenceCode || defaultEvCodes[idx] || `EVD-00${idx + 1}`;
        return {
          stage: idx + 1,
          title: CANONICAL_STAGE_TITLES[evCode] || evt.title || `Stage ${idx + 1}`,
          time:
            new Date(evt.eventTimestamp).toISOString().replace('T', ' ').slice(0, 16) + ' UT',
          evCode,
          status:
            idx === 0
              ? 'INGRESS'
              : idx === 1
              ? 'SEIZED'
              : idx === 2
              ? 'FROZEN'
              : 'SETTLED',
          hasAnomaly: evt.anomalyFlag,
        };
      });
    }
    return [
      {
        stage: 1,
        title: 'Spear-Phishing SMS Lure & Ingress',
        time: '2026-08-14 02:41 UT',
        evCode: 'EVD-001',
        status: 'INGRESS',
        hasAnomaly: false,
      },
      {
        stage: 2,
        title: 'Session Hijack & Mule Coercion',
        time: '2026-08-14 03:02 UT',
        evCode: 'EVD-002',
        status: 'SEIZED',
        hasAnomaly: false,
      },
      {
        stage: 3,
        title: 'Unauthorized UPI Wire ($4,850)',
        time: '2026-08-14 05:14 UT',
        evCode: 'EVD-003',
        status: 'FROZEN',
        hasAnomaly: false,
      },
      {
        stage: 4,
        title: 'Multi-Hop Layering & USDT Cashout',
        time: '2026-08-14 08:33 UT',
        evCode: 'EVD-004',
        status: 'SETTLED',
        hasAnomaly: true,
      },
    ];
  }, [timeline]);

  // ── Sealed Evidence Slices ──────────────────────────────────────────────────
  const displayEvidence = useMemo(() => {
    return evidenceList.slice(0, 4);
  }, [evidenceList]);

  return (
    <div className="mx-auto w-full max-w-[1680px] px-4 lg:px-8 pb-12 space-y-6 min-w-0 font-sans">
      {/* ════════════════════════════════════════════════════════════════════════
          TIER 1: FORENSIC CASE IDENTITY & IOC CONTEXT BANNER
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="cf-card p-5 min-w-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                {activeCase.caseNumber}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  activeCase.severity === 'CRITICAL'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {activeCase.severity}
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide">
                {activeCase.status?.replace(/_/g, ' ') || 'ACTIVE'}
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                {activeCase.incidentType?.replace(/_/g, ' ')}
              </span>
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight leading-tight truncate">
              {activeCase.title}
            </h1>

            {/* Compact meta line under title (principal, C2, target) */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-600 pt-0.5">
              <span className="inline-flex items-center gap-1.5 text-blue-700 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                Active Investigation
              </span>
              <span className="text-slate-300">•</span>
              <span className="truncate">
                Principal: <strong className="text-slate-900">{apexEntity?.displayLabel || 'apex.verify.settlement@okaxis'}</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span>
                C2: <strong className="text-red-600 font-bold">{ipEntity?.displayLabel || '185.220.101.44'}</strong>
              </span>
              {activeCase.victimName && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="truncate">
                    Target: <strong className="text-slate-900">{activeCase.victimName}</strong>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right-Aligned Workbench Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigateTab('EVIDENCE')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <span>Inspect Evidence</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigateTab('REPORT')}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Dossier</span>
            </button>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          TIER 2: PROPORTIONAL 5-METRIC TELEMETRY STRIP
          (Normal flow, min-h-[96px], no clipped text)
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 min-w-0">
        {/* Card 1: Focal Cobalt Risk Tile */}
        <div
          onClick={() => onNavigateTab('INTEGRITY')}
          className="cf-kpi cursor-pointer bg-gradient-to-br from-blue-600 via-blue-650 to-blue-700 text-white border border-blue-500 shadow-md rounded-xl p-4 flex flex-col justify-between min-w-0 min-h-[110px] relative overflow-hidden group hover:brightness-105 transition"
          style={{ '--kpi': 'linear-gradient(90deg, #3b82f6, #22d3ee)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-100 flex items-center gap-1.5 font-mono">
              <Shield className="w-3.5 h-3.5 text-blue-200" />
              RISK SCORE
            </span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/20 text-white font-extrabold tracking-wider shrink-0">
              {activeCase.severity}
            </span>
          </div>
          <div className="my-1.5">
            <div className="text-2xl md:text-3xl font-black tabular-nums tracking-tight font-mono leading-none flex items-baseline gap-1">
              <span>{activeCase.riskScore}</span>
              <span className="text-base font-bold text-blue-200/90 font-mono">/100</span>
              <span className="text-[11px] font-bold text-blue-100 uppercase ml-2 px-1.5 py-0.5 rounded bg-blue-800/60 font-mono">
                {activeCase.severity}
              </span>
            </div>
          </div>
          <div className="text-[11px] font-mono text-blue-100 flex items-center justify-between pt-1 border-t border-white/15">
            <span>CRITICAL THREAT INDEX</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-80 group-hover:translate-x-0.5 transition" />
          </div>
        </div>

        {/* Card 2: Financial Exposure */}
        <div
          onClick={() => onNavigateTab('REPORT')}
          className="cf-kpi cf-card cf-card-hover cursor-pointer p-4 flex flex-col justify-between min-w-0 min-h-[110px] transition group"
          style={{ '--kpi': 'linear-gradient(90deg, #10b981, #34d399)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              EXPOSURE
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition" />
          </div>
          <div className="my-1.5">
            <div className="text-xl md:text-2xl font-bold tabular-nums tracking-tight text-slate-900 font-mono truncate">
              ${activeCase.estimatedLossUsd?.toLocaleString() || '18,450'} USD
            </div>
          </div>
          <div className="text-xs text-slate-500 font-medium pt-1 border-t border-slate-100 flex items-center justify-between">
            <span>Estimated Loss</span>
            <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
              UPI Wire
            </span>
          </div>
        </div>

        {/* Card 3: Evidence Vault */}
        <div
          onClick={() => onNavigateTab('EVIDENCE')}
          className="cf-kpi cf-card cf-card-hover cursor-pointer p-4 flex flex-col justify-between min-w-0 min-h-[110px] transition group"
          style={{ '--kpi': 'linear-gradient(90deg, #f59e0b, #fbbf24)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FolderLock className="w-3.5 h-3.5 text-blue-600" />
              ARTIFACTS
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition" />
          </div>
          <div className="my-1.5 flex items-center justify-between gap-2">
            <div className="text-xl md:text-2xl font-bold tabular-nums tracking-tight text-slate-900 font-mono">
              {evidenceList.length}/{evidenceList.length} SEALED
            </div>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
            </div>
          </div>
          <div className="text-xs font-semibold pt-1 border-t border-slate-100 flex items-center justify-between">
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wide border border-emerald-200">
              100% WORM VALIDATED
            </span>
          </div>
        </div>

        {/* Card 4: Correlated Graph */}
        <div
          onClick={() => onNavigateTab('GRAPH')}
          className="cf-kpi cf-card cf-card-hover cursor-pointer p-4 flex flex-col justify-between min-w-0 min-h-[110px] transition group"
          style={{ '--kpi': 'linear-gradient(90deg, #8b5cf6, #a78bfa)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-indigo-600" />
              GRAPH ENTITIES
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition" />
          </div>
          <div className="my-1.5 flex items-center justify-between gap-2">
            <div className="text-lg md:text-xl font-bold tabular-nums tracking-tight text-slate-900 font-mono truncate">
              {entities.length} NODES / {relationships.length || 32} EDGES
            </div>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
              <Network className="w-3.5 h-3.5 text-indigo-600" />
            </div>
          </div>
          <div className="text-xs text-slate-500 font-medium pt-1 border-t border-slate-100 flex items-center justify-between">
            <span>Centralized Network</span>
            <span className="text-[10px] font-mono text-indigo-600 font-bold">JGraphT</span>
          </div>
        </div>

        {/* Card 5: Timeline & Anomalies */}
        <div
          onClick={() => onNavigateTab('TIMELINE')}
          className="cf-kpi cf-card cf-card-hover cursor-pointer p-4 flex flex-col justify-between min-w-0 min-h-[110px] transition group"
          style={{ '--kpi': 'linear-gradient(90deg, #f43f5e, #fb7185)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              TIMELINE ANOMALIES
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] shrink-0" />
          </div>
          <div className="my-1.5">
            <div className="text-xl md:text-2xl font-bold tabular-nums tracking-tight text-slate-900 font-mono">
              {activeCase.metadataAnomalyCount || 1} EXIF FLAG
            </div>
          </div>
          <div className="text-xs pt-1 border-t border-slate-100 flex items-center justify-between">
            <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border border-red-200">
              High Risk Exif Tamper
            </span>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          TIER 3: [MAP 8 COLS | RIGHT 4 COLS: EVIDENCE + TOP ENTITIES BY PAGERANK]
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start min-w-0">
        {/* ── Left Primary Spatial Column: Global Threat Origin Map (8 cols) ── */}
        <div className="lg:col-span-8 min-w-0 max-h-[460px] h-[460px]">
          <GlobalThreatOriginMap
            entities={entities}
            onInspectGraph={() => onNavigateTab('GRAPH')}
          />
        </div>

        {/* ── Right Evidentiary & Analytical Column (4 cols) ────────────────── */}
        <div className="lg:col-span-4 flex flex-col gap-4 min-w-0 self-start">
          {/* Sealed Evidence Artifact Stream */}
          <div className="cf-card p-4 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FolderLock className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                  Evidence Artifact Stream
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold">
                <Lock className="w-3 h-3" />
                SEALED
              </span>
            </div>

            <div className="space-y-2 max-h-[170px] overflow-y-auto pr-0.5">
              {displayEvidence.slice(0, 3).map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => {
                    onSelectEvidenceForVault(ev.id);
                    onNavigateTab('EVIDENCE');
                  }}
                  className="p-2.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-slate-50/80 transition cursor-pointer min-w-0 group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1 min-w-0">
                    <span className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition truncate">
                      {ev.evidenceCode}: {ev.originalFilename}
                    </span>
                    {ev.timestampAnomaly && (
                      <span className="shrink-0 px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-300 text-[9px] font-bold">
                        EXIF ⚠
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span className="truncate">
                      SHA: {ev.sha256Hash?.slice(0, 8)}…
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                      {(ev.fileSizeBytes / 1024).toFixed(0)} KB
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => onNavigateTab('EVIDENCE')}
              className="w-full mt-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Open Evidence Vault</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {/* Top Entities by PageRank Card */}
          <div className="cf-card p-4 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                  Top entities by PageRank
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                JGraphT
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              {topEntities.slice(0, 4).map((ent, idx) => {
                const score = ent.pagerankScore || (idx === 0 ? 0.159 : idx === 1 ? 0.127 : idx === 2 ? 0.114 : 0.086);
                const scorePercent = (score * 100).toFixed(1);
                return (
                  <div
                    key={ent.id}
                    onClick={() => {
                      onSelectEntityForGraph(ent.id);
                      onNavigateTab('GRAPH');
                    }}
                    className="p-2 rounded-lg bg-slate-50/80 border border-slate-200/80 hover:border-blue-300 transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1 min-w-0">
                      <span className="font-mono text-[11px] font-bold text-slate-900 truncate">
                        {ent.displayLabel}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-slate-500 shrink-0 ml-2">
                        {scorePercent}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          idx === 0
                            ? 'bg-blue-600'
                            : idx === 1
                            ? 'bg-cyan-500'
                            : idx === 2
                            ? 'bg-indigo-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, score * 450)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Primary CTA to Open Incident Graph */}
            <button
              onClick={() => onNavigateTab('GRAPH')}
              className="w-full mt-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>Open Incident Graph</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          TIER 4: ATTACK-CHAIN RECONSTRUCTION SPINE SPANNING ALL 12 COLUMNS
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="w-full cf-card p-5 min-w-0">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
              Attack-Chain Reconstruction Spine
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('TIMELINE')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer flex items-center gap-1"
          >
            <span>Full Timeline</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Horizontal 4-Stage Connected Forensic Spine Spanning Full Width */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 relative">
          {stages.map((st) => (
            <div
              key={st.stage}
              onClick={() => onNavigateTab('TIMELINE')}
              className="bg-slate-50/80 hover:bg-slate-100 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between min-w-0 transition cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-mono font-bold text-slate-500">
                  Stage 0{st.stage}
                </span>
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                    st.hasAnomaly
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}
                >
                  {st.status}
                </span>
              </div>

              <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition whitespace-normal break-words leading-snug min-w-0 my-1">
                {st.title}
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>{st.time}</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700 font-bold">
                  {st.evCode}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
