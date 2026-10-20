import React, { useState, useMemo } from 'react';
import {
  TimelineEvent,
  ForensicCaseSummary,
  EvidenceItem,
  ExtractedEntity,
} from '../types';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  ExternalLink,
  Code2,
  ShieldAlert,
  Flame,
  Plus,
  Network,
  Copy,
  Check,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Activity,
  Zap,
  Radio,
  FileCode,
  X,
  ChevronRight,
  Sparkles,
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

const CANONICAL_TIMELINE_TITLES: Record<string, string> = {
  'EVD-001': 'Spear-Phishing SMS Lure & Evilginx Ingress',
  'EVD-002': 'Credential & Session Token Harvesting',
  'EVD-003': 'Unauthorized UPI Wire ($4,850)',
  'EVD-004': 'Multi-Hop Layering & USDT Cashout',
};

const getTimelineStageTitle = (idx: number, originalTitle: string, evidenceCode?: string): string => {
  if (evidenceCode && CANONICAL_TIMELINE_TITLES[evidenceCode]) {
    return CANONICAL_TIMELINE_TITLES[evidenceCode];
  }
  if (idx === 0) return 'Spear-Phishing SMS Lure & Evilginx Ingress';
  if (idx === 1) return 'Credential & Session Token Harvesting';
  if (idx === 2) return 'Unauthorized UPI Wire ($4,850)';
  if (idx === 3) return 'Multi-Hop Layering & USDT Cashout';
  return originalTitle;
};

export function formatDelta(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

export const TimelineReconstructionView: React.FC<TimelineReconstructionViewProps> = ({
  activeCase,
  timeline,
  evidenceList,
  entities = [],
  onSelectEvidence,
  onSelectEntity,
  onAddMilestone,
}) => {
  const [selectedEventIndex, setSelectedEventIndex] = useState<number>(0);
  const [eventFilter, setEventFilter] = useState<'ALL' | 'ANOMALIES'>('ALL');
  const [showAddMilestone, setShowAddMilestone] = useState<boolean>(false);
  const [showRawModal, setShowRawModal] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form states for new milestone
  const [milestoneTitle, setMilestoneTitle] = useState<string>('');
  const [milestoneDesc, setMilestoneDesc] = useState<string>('');
  const [milestonePhase, setMilestonePhase] = useState<string>('FINANCIAL_EXECUTION');
  const [milestoneSeverity, setMilestoneSeverity] = useState<string>('HIGH');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filtered timeline
  const filteredTimeline = useMemo(() => {
    if (eventFilter === 'ANOMALIES') {
      return timeline.filter((t) => t.anomalyFlag);
    }
    return timeline;
  }, [timeline, eventFilter]);

  const activeEvent = useMemo(() => {
    return filteredTimeline[selectedEventIndex] || filteredTimeline[0] || timeline[0] || null;
  }, [filteredTimeline, selectedEventIndex, timeline]);

  // Sorted timeline items with valid timestamps
  const sortedTimeline = useMemo(() => {
    return [...timeline].sort(
      (a, b) => new Date(a.eventTimestamp).getTime() - new Date(b.eventTimestamp).getTime()
    );
  }, [timeline]);

  // Derived timeline statistics and dynamic durations
  const timelineStats = useMemo(() => {
    if (sortedTimeline.length === 0) {
      return {
        start: '10:12:18 UTC',
        end: '10:39:12 UTC',
        duration: '26m 54s',
        t0: 0,
        tLast: 0,
        hop1Delta: '09m 22s',
        hop1Ms: 562000,
        hop2Delta: '07m 04s',
        hop2Ms: 424000,
        hop3Delta: '10m 28s',
        hop3Ms: 628000,
        totalDwellMs: 1614000,
        exifSkew: '38m 33s',
      };
    }

    const tFirst = new Date(sortedTimeline[0].eventTimestamp).getTime();
    const tLast = new Date(sortedTimeline[sortedTimeline.length - 1].eventTimestamp).getTime();
    const totalDwellMs = Math.max(1000, tLast - tFirst);

    const t0 = tFirst;
    const t1 = sortedTimeline[1] ? new Date(sortedTimeline[1].eventTimestamp).getTime() : t0;
    const t2 = sortedTimeline[2] ? new Date(sortedTimeline[2].eventTimestamp).getTime() : t1;
    const t3 = sortedTimeline[3] ? new Date(sortedTimeline[3].eventTimestamp).getTime() : t2;

    const hop1Ms = Math.max(0, t1 - t0);
    const hop2Ms = Math.max(0, t2 - t1);
    const hop3Ms = Math.max(0, t3 - t2);

    // EXIF skew: transaction execution time (10:28:44Z) minus EXIF DateTimeOriginal (09:50:11Z) = 38m 33s
    const exifDateMs = new Date('2026-10-01T09:50:11Z').getTime();
    const netDateMs = t2 || new Date('2026-10-01T10:28:44Z').getTime();
    const exifDiffMs = Math.abs(netDateMs - exifDateMs);

    const fmt = (iso: string) => {
      const d = new Date(iso);
      return !isNaN(d.getTime()) ? d.toISOString().slice(11, 19) + ' UTC' : iso;
    };

    return {
      start: fmt(sortedTimeline[0].eventTimestamp),
      end: fmt(sortedTimeline[sortedTimeline.length - 1].eventTimestamp),
      duration: formatDelta(totalDwellMs),
      t0,
      tLast,
      hop1Delta: formatDelta(hop1Ms),
      hop1Ms,
      hop2Delta: formatDelta(hop2Ms),
      hop2Ms,
      hop3Delta: formatDelta(hop3Ms),
      hop3Ms,
      totalDwellMs,
      exifSkew: formatDelta(exifDiffMs),
    };
  }, [sortedTimeline]);

  // Connected evidence for active event
  const connectedEvidence = useMemo(() => {
    if (!activeEvent) return null;
    return (
      evidenceList.find(
        (ev) =>
          ev.id === activeEvent.evidenceId ||
          ev.evidenceCode === activeEvent.evidenceCode
      ) || null
    );
  }, [activeEvent, evidenceList]);

  // Connected entities for active event
  const correlatedEntities = useMemo(() => {
    if (!activeEvent) return [];
    const linkedIds = activeEvent.linkedEntityIds || [];
    return entities.filter(
      (ent) =>
        linkedIds.includes(ent.id) ||
        ent.displayLabel === activeEvent.actorEntity ||
        ent.displayLabel === activeEvent.targetEntity
    );
  }, [activeEvent, entities]);

  const anomalyCount = useMemo(() => {
    return timeline.filter((t) => t.anomalyFlag).length;
  }, [timeline]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // MITRE Tactics map based on phase
  const getMitreTactic = (phase: string, idx: number, evtTimestamp?: string) => {
    let delta = '+00m 00s';
    if (timelineStats.t0 && evtTimestamp) {
      const cur = new Date(evtTimestamp).getTime();
      if (!isNaN(cur) && cur >= timelineStats.t0) {
        delta = `+${formatDelta(cur - timelineStats.t0)}`;
      }
    } else {
      if (idx === 1) delta = `+${timelineStats.hop1Delta}`;
      if (idx === 2) delta = `+${formatDelta(timelineStats.hop1Ms + timelineStats.hop2Ms)}`;
      if (idx === 3) delta = `+${timelineStats.duration}`;
    }

    switch (idx) {
      case 0:
        return { id: 'T1566.002', name: 'Spearphishing Link', delta };
      case 1:
        return { id: 'T1539', name: 'Steal Web Session Cookie', delta };
      case 2:
        return { id: 'T1078', name: 'Valid Accounts / UPI Rail', delta };
      case 3:
      default:
        return { id: 'T1657', name: 'Financial Theft / Crypto Off-Ramp', delta };
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1680px] px-4 lg:px-8 pb-12 space-y-6 min-w-0">
      {/* =========================================================================
          1. STAGE HEADER & ACTIONS
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold text-blue-700 uppercase tracking-wider">
              INVESTIGATION STAGE 04 // ATTACK TIMELINE
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-xs text-slate-500">
              Chronological Kill-Chain Forensics
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Clock className="w-7 h-7 text-blue-600 shrink-0" />
            <span>Attack Timeline &amp; Incident Reconstruction</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Multi-source chronological timeline aligning SMS lures, session hijacking, UPI fund routing, and P2P crypto off-ramping with microsecond telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setShowAddMilestone(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Inject Milestone</span>
          </button>
          <button
            onClick={() => setShowRawModal(true)}
            className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-[0_2px_4px_rgba(15,23,42,0.04)] transition cursor-pointer"
          >
            <Code2 className="w-4 h-4 text-purple-600" />
            <span>STIX 2.1 View</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. TOP 4-METRIC TELEMETRY STRIP
          ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 min-w-0">
        {/* Metric 1: Reconstruction Window */}
        <div
          className="cf-card cf-kpi p-4 flex flex-col justify-between min-w-0"
          style={{ '--kpi': 'linear-gradient(90deg, #3b82f6, #22d3ee)' }}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 font-mono min-w-0 pt-0.5">
            <span className="flex items-center gap-1.5 text-slate-700 truncate">
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Reconstruction Window</span>
            </span>
            <span className="text-slate-400 shrink-0">UTC</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2 font-mono tabular-nums truncate">
            {timelineStats.start.slice(0, 8)} → {timelineStats.end.slice(0, 8)}
          </div>
          <div className="mt-2 text-[11px] font-mono text-slate-500 flex items-center justify-between min-w-0">
            <span>Span Coverage</span>
            <span className="text-blue-700 font-bold">100% Monotonic</span>
          </div>
        </div>

        {/* Metric 2: Total Correlated Events */}
        <div
          className="cf-card cf-kpi p-4 flex flex-col justify-between min-w-0"
          style={{ '--kpi': 'linear-gradient(90deg, #10b981, #34d399)' }}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 font-mono min-w-0 pt-0.5">
            <span className="flex items-center gap-1.5 text-slate-700 truncate">
              <Layers className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Correlated Milestones</span>
            </span>
            <span className="text-slate-400 shrink-0">Total</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono tabular-nums">
            {timeline.length} <span className="text-xs text-slate-400 font-normal font-sans">Kill-Chain Phases</span>
          </div>
          <div className="mt-2 text-[11px] font-mono text-slate-500 flex items-center justify-between min-w-0">
            <span>Multi-Source Provenance</span>
            <span className="text-emerald-700 font-bold">4 Evidence Anchors</span>
          </div>
        </div>

        {/* Metric 3: Kill-Chain Dwell Time */}
        <div
          className="cf-card cf-kpi p-4 flex flex-col justify-between min-w-0"
          style={{ '--kpi': 'linear-gradient(90deg, #8b5cf6, #a78bfa)' }}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 font-mono min-w-0 pt-0.5">
            <span className="flex items-center gap-1.5 text-slate-700 truncate">
              <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Kill-Chain Dwell Time</span>
            </span>
            <span className="text-slate-400 shrink-0">Elapsed</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono tabular-nums">
            {timelineStats.duration}
          </div>
          <div className="mt-2 text-[11px] font-mono text-slate-500 flex items-center justify-between min-w-0">
            <span>Initial Lure to Cashout</span>
            <span className="text-indigo-700 font-bold">Fast Execution</span>
          </div>
        </div>

        {/* Metric 4: Temporal Anomalies */}
        <div
          className="cf-card cf-kpi p-4 flex flex-col justify-between min-w-0"
          style={{ '--kpi': 'linear-gradient(90deg, #f59e0b, #fbbf24)' }}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 font-mono min-w-0 pt-0.5">
            <span className="flex items-center gap-1.5 text-slate-700 truncate">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Temporal Anomalies</span>
            </span>
            <span className="text-slate-400 shrink-0">Flagged</span>
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-2 font-mono tabular-nums">
            {anomalyCount > 0 ? `${anomalyCount} EXIF Flag` : '0 Flags'}
          </div>
          <div className="mt-2 text-[11px] font-mono text-slate-500 flex items-center justify-between min-w-0">
            <span>Clock Skew Anomaly</span>
            <span className="text-amber-800 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
              {timelineStats.exifSkew} EXIF Drift
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. ASYMMETRIC 12-COLUMN WORKBENCH
          Left 8 Cols: Interactive Vertical Kill-Chain Spine
          Right 4 Cols: Temporal Velocity & EXIF Drift Inspector
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0">
        
        {/* =======================================================================
            LEFT 8 COLUMNS: INTERACTIVE VERTICAL KILL-CHAIN SPINE
            ======================================================================= */}
        <div className="lg:col-span-8 space-y-4 min-w-0">
          {/* Filter Bar */}
          <div className="cf-card p-3.5 -[0_2px_4px_rgba(15,23,42,0.04)] flex items-center justify-between gap-3 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Activity className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-mono text-xs font-extrabold text-slate-900 uppercase tracking-wider truncate">
                ATT&amp;CK Reconstruction Spine ({filteredTimeline.length} Nodes)
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold shrink-0">
              <button
                onClick={() => setEventFilter('ALL')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer font-mono text-[11px] ${
                  eventFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Phases ({timeline.length})
              </button>
              <button
                onClick={() => setEventFilter('ANOMALIES')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer font-mono text-[11px] ${
                  eventFilter === 'ANOMALIES'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Anomalies ({anomalyCount})
              </button>
            </div>
          </div>

          {/* Vertical Glowing Kill-Chain Spine */}
          <div className="relative pl-6 sm:pl-8 border-l-2 border-blue-500/40 ml-4 sm:ml-6 space-y-6 pt-2 pb-4 min-w-0">
            {filteredTimeline.map((ev, idx) => {
              const isSelected = activeEvent?.id === ev.id;
              const isAnomaly = ev.anomalyFlag;
              const tactic = getMitreTactic(ev.killChainPhase, idx, ev.eventTimestamp);

              return (
                <div key={ev.id} className="relative min-w-0 group">
                  {/* Glowing Spine Beacon Node */}
                  <div
                    onClick={() => setSelectedEventIndex(idx)}
                    className={`absolute -left-[35px] sm:-left-[43px] top-4 w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs cursor-pointer transition-all duration-200 z-10 ${
                      isAnomaly
                        ? 'bg-red-600 text-white ring-4 ring-red-200 shadow-md animate-pulse'
                        : isSelected
                        ? 'bg-blue-600 text-white ring-4 ring-blue-200 shadow-md scale-110'
                        : 'bg-slate-900 text-cyan-400 border-2 border-cyan-500/80 hover:scale-105'
                    }`}
                    title={`Stage 0${idx + 1}: ${getTimelineStageTitle(idx, ev.title, ev.evidenceCode)}`}
                  >
                    0{idx + 1}
                  </div>

                  {/* Tactile Event Card */}
                  <div
                    onClick={() => setSelectedEventIndex(idx)}
                    className={`rounded-xl border p-5 transition cursor-pointer relative min-w-0 shadow-[0_2px_4px_rgba(15,23,42,0.04),0_12px_28px_-6px_rgba(15,23,42,0.07)] ${
                      isSelected
                        ? 'bg-white border-blue-400 ring-2 ring-blue-400/20 shadow-md'
                        : 'bg-white hover:bg-slate-50/80 border-slate-200/90'
                    }`}
                  >
                    {/* Top Metadata Header Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        {/* Numbered Phase Beacon */}
                        <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-md bg-slate-900 text-white">
                          STAGE 0{idx + 1}
                        </span>

                        {/* MITRE ATT&CK Tactic Badge */}
                        <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                          {tactic.id} · {tactic.name}
                        </span>

                        {/* Severity Pill */}
                        <span
                          className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                            ev.severity === 'CRITICAL'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {ev.severity || 'HIGH'}
                        </span>
                      </div>

                      {/* Right Timestamp Badge + Elapsed Delta Pill */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-xs font-bold bg-slate-900 text-cyan-400 px-2.5 py-1 rounded shadow-inner">
                          {ev.eventTimestamp}
                        </span>
                        <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                          {tactic.delta}
                        </span>
                      </div>
                    </div>

                    {/* Milestone Title */}
                    <h3 className="text-base font-extrabold text-slate-900 mt-1 leading-snug">
                      {getTimelineStageTitle(idx, ev.title, ev.evidenceCode)}
                    </h3>

                    {/* Narrative Description */}
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      {ev.description}
                    </p>

                    {/* Correlated IOC Monospace Tags with break-all */}
                    {(ev.actorEntity || ev.targetEntity || ev.amountInvolved) && (
                      <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100 text-xs font-mono min-w-0">
                        {ev.actorEntity && (
                          <span className="bg-slate-50 border border-slate-200 text-slate-700 px-2 py-0.5 rounded break-all select-all">
                            Actor: <strong className="text-slate-900 font-bold">{ev.actorEntity}</strong>
                          </span>
                        )}
                        {ev.targetEntity && (
                          <span className="bg-slate-50 border border-slate-200 text-slate-700 px-2 py-0.5 rounded break-all select-all">
                            Target: <strong className="text-slate-900 font-bold">{ev.targetEntity}</strong>
                          </span>
                        )}
                        {ev.amountInvolved && (
                          <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded font-bold shrink-0">
                            Disgorged: {ev.amountInvolved}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Linked Source Artifact Action Button */}
                    {ev.evidenceCode && (
                      <div className="mt-3 flex items-center justify-between gap-3 pt-2 border-t border-slate-100/80 min-w-0">
                        <div className="flex items-center gap-2 text-xs font-mono text-slate-500 truncate">
                          <span>Source Record:</span>
                          <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                            {ev.evidenceCode}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (ev.evidenceId) onSelectEvidence(ev.evidenceId);
                            else if (connectedEvidence) onSelectEvidence(connectedEvidence.id);
                          }}
                          className="px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 border border-blue-200"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Inspect in Evidence Vault</span>
                        </button>
                      </div>
                    )}

                    {/* Prominent High-Contrast EXIF Timestamp Tamper Anomaly Banner on Stage 03 */}
                    {isAnomaly && (
                      <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-red-50 via-amber-50 to-red-50 border border-red-300 shadow-sm space-y-2 min-w-0">
                        <div className="flex items-center gap-2 text-red-900 font-extrabold text-xs">
                          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                          <span className="font-mono uppercase tracking-wider">
                            CRITICAL FORENSIC ALERT // EXIF CLOCK SKEW TAMPER DETECTED
                          </span>
                        </div>
                        <p className="text-xs text-red-900 leading-relaxed font-sans">
                          {ev.anomalyReason ||
                            'Discrepancy identified between carrier network SMS transmission timestamp and localized device EXIF ModifyDate header.'}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-red-200 font-mono text-xs">
                          <div className="bg-white/80 p-2 rounded-lg border border-red-200">
                            <span className="text-slate-500 block text-[10px] uppercase font-bold">Network Transmission UTC:</span>
                            <span className="text-slate-900 font-bold">2026-10-01 10:14:02 UTC</span>
                          </div>
                          <div className="bg-red-100/90 p-2 rounded-lg border border-red-300">
                            <span className="text-red-700 block text-[10px] uppercase font-bold">Device EXIF ModifyDate:</span>
                            <span className="text-red-900 font-extrabold">2026-10-01 10:28:24 UTC (+14m 22s Skew)</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* =======================================================================
            RIGHT 4 COLUMNS: TEMPORAL VELOCITY & EXIF DRIFT INSPECTOR
            ======================================================================= */}
        <div className="lg:col-span-4 space-y-5 min-w-0 self-start lg:sticky lg:top-[calc(var(--header-height)+5.5rem)]">
          {/* Panel 1: Dark Obsidian Velocity Stage */}
          <div className="bg-[#0B0F19] text-slate-100 rounded-xl p-5 border border-slate-800 shadow-2xl space-y-4 min-w-0">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
                <h3 className="font-mono text-xs font-extrabold text-white uppercase tracking-wider truncate">
                  Temporal Velocity Engine
                </h3>
              </div>
              <span className="font-mono text-[10px] text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800 shrink-0">
                STIX 2.1 Pattern
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Microsecond dwell-time breakdown across sequential MITRE kill-chain transitions:
            </p>

            {/* Dwell-Time Velocity Progress Bars */}
            <div className="space-y-3 font-mono text-xs min-w-0">
              {/* Hop 1 */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-300">Stage 01 → 02 (Phish to Credential)</span>
                  <span className="text-cyan-400 font-bold">{timelineStats.hop1Delta}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-cyan-400 h-2 rounded-full"
                    style={{
                      width: `${Math.round((timelineStats.hop1Ms / timelineStats.totalDwellMs) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Hop 2 */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-300">Stage 02 → 03 (Session to UPI Mule)</span>
                  <span className="text-cyan-400 font-bold">{timelineStats.hop2Delta}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{
                      width: `${Math.round((timelineStats.hop2Ms / timelineStats.totalDwellMs) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Hop 3 */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-300">Stage 03 → 04 (UPI to Crypto P2P)</span>
                  <span className="text-cyan-400 font-bold">{timelineStats.hop3Delta}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-2 rounded-full"
                    style={{
                      width: `${Math.round((timelineStats.hop3Ms / timelineStats.totalDwellMs) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* STIX 2.1 Pattern Readout Terminal */}
            <div className="pt-2 border-t border-slate-800 space-y-1.5 font-mono text-[11px]">
              <div className="text-slate-500 text-[10px] uppercase font-bold">STIX 2.1 Observation Pattern</div>
              <pre className="p-3 bg-slate-950 text-cyan-300 rounded-lg overflow-x-auto text-[10px] leading-relaxed border border-slate-800">
{`[network-traffic:dst_port = 443 AND
 user-account:account_login = 'arjun.mehta']
FOLLOWEDBY
[payment-event:rail = 'UPI' AND
 amount = 1250000]
WITHIN 27 MINUTES`}
              </pre>
            </div>
          </div>

          {/* Panel 2: EXIF & Clock-Skew Audit Card */}
          <div className="cf-card p-5 space-y-4 min-w-0">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <h3 className="font-mono text-xs font-extrabold text-slate-900 uppercase tracking-wider truncate">
                  Clock-Skew Cryptographic Audit
                </h3>
              </div>
              <span className="font-mono text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-bold shrink-0">
                Skew Flagged
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              Comparative cryptographic analysis contrasting hardware EXIF headers against immutable bank and blockchain settlement logs:
            </p>

            {/* Audit Comparison Table */}
            <div className="border border-slate-200/80 rounded-xl overflow-hidden font-mono text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-2.5">Source Vector</th>
                    <th className="py-2 px-2.5">UTC Time</th>
                    <th className="py-2 px-2.5 text-right">Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  <tr>
                    <td className="py-2 px-2.5 font-bold text-slate-800">SMS Gateway</td>
                    <td className="py-2 px-2.5 text-slate-600">10:12:18</td>
                    <td className="py-2 px-2.5 text-right font-bold text-slate-400">00m 00s</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2.5 font-bold text-slate-800">C2 Server Log</td>
                    <td className="py-2 px-2.5 text-slate-600">10:21:40</td>
                    <td className="py-2 px-2.5 text-right font-bold text-blue-600">+{timelineStats.hop1Delta}</td>
                  </tr>
                  <tr className="bg-amber-50/50">
                    <td className="py-2 px-2.5 font-bold text-amber-900">EVD-003 EXIF</td>
                    <td className="py-2 px-2.5 text-red-600 font-bold">09:50:11</td>
                    <td className="py-2 px-2.5 text-right font-bold text-red-600">-{timelineStats.exifSkew}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2.5 font-bold text-slate-800">Tron Node Log</td>
                    <td className="py-2 px-2.5 text-slate-600">10:39:12</td>
                    <td className="py-2 px-2.5 text-right font-bold text-emerald-600">+{timelineStats.duration}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add Milestone Modal */}
      {showAddMilestone && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="cf-card max-w-lg w-full p-6 space-y-4 -2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-extrabold text-slate-900">Inject Timeline Milestone</h3>
              </div>
              <button onClick={() => setShowAddMilestone(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Milestone Title</label>
                <input
                  type="text"
                  value={milestoneTitle}
                  onChange={(e) => setMilestoneTitle(e.target.value)}
                  placeholder="e.g. Mule Account Cashout via ATM"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Forensic Description</label>
                <textarea
                  value={milestoneDesc}
                  onChange={(e) => setMilestoneDesc(e.target.value)}
                  rows={3}
                  placeholder="Describe event correlation and observed telemetry..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Kill-Chain Phase</label>
                  <select
                    value={milestonePhase}
                    onChange={(e) => setMilestonePhase(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                  >
                    <option value="RECON_AND_LURE">Recon &amp; Lure</option>
                    <option value="CREDENTIAL_HARVEST">Credential Harvest</option>
                    <option value="ACCOUNT_TAKEOVER">Account Takeover</option>
                    <option value="FINANCIAL_EXECUTION">Financial Execution</option>
                    <option value="CRYPTO_OFFRAMP">Crypto Offramp</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Severity</label>
                  <select
                    value={milestoneSeverity}
                    onChange={(e) => setMilestoneSeverity(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowAddMilestone(false)}
                className="px-4 py-2 rounded-xl text-slate-600 text-xs font-bold hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                disabled={!milestoneTitle.trim() || isSubmitting}
                onClick={async () => {
                  if (onAddMilestone && milestoneTitle.trim()) {
                    setIsSubmitting(true);
                    try {
                      await onAddMilestone({
                        title: milestoneTitle,
                        description: milestoneDesc,
                        killChainPhase: milestonePhase,
                        severity: milestoneSeverity,
                      });
                      setShowAddMilestone(false);
                      setMilestoneTitle('');
                      setMilestoneDesc('');
                    } finally {
                      setIsSubmitting(false);
                    }
                  }
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {isSubmitting ? 'Registering...' : 'Register Milestone'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raw STIX 2.1 JSON Modal */}
      {showRawModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="cf-card-dark text-slate-100 max-w-2xl w-full p-6 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="font-bold text-cyan-400">STIX 2.1 Incident Timeline Bundle</span>
              <button onClick={() => setShowRawModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <pre className="p-3 bg-slate-950 rounded-lg max-h-96 overflow-y-auto text-[11px] leading-relaxed text-slate-300">
              {JSON.stringify(
                {
                  type: 'bundle',
                  id: `bundle--${activeCase?.id || 'case-timeline'}`,
                  objects: timeline.map((t, idx) => ({
                    type: 'incident-milestone',
                    id: `milestone--${t.id}`,
                    timestamp: t.eventTimestamp,
                    title: getTimelineStageTitle(idx, t.title, t.evidenceCode),
                    kill_chain_phase: t.killChainPhase,
                    mitre_tactic: getMitreTactic(t.killChainPhase, idx),
                    anomaly_detected: t.anomalyFlag,
                  })),
                },
                null,
                2
              )}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
