import React from 'react';
import { AlertTriangle, CheckCircle2, FileSearch, IndianRupee, Landmark, Network, ShieldCheck, TrendingUp } from 'lucide-react';
import { formatInr, scamLabel } from '../../format';

/**
 * Officer analytics dashboard. Every number comes straight from
 * /api/v1/officer/analytics, which aggregates real stored records —
 * nothing is estimated or invented. Bars are plain CSS (no chart lib).
 */
export const OfficerAnalytics: React.FC<{
  analytics: any;
  onOpenCase: (caseId: string) => void;
}> = ({ analytics: a, onOpenCase }) => {
  if (!a) return <p className="text-sm text-slate-500">Analytics not loaded yet — press Refresh.</p>;
  const p = a.evidenceProcessing || {};
  const freeze = a.freeze || {};

  const entries = (obj: Record<string, number> | undefined) =>
    Object.entries(obj || {}).map(([k, v]) => [k, Number(v)] as [string, number]).sort((x, y) => y[1] - x[1]);

  const BarRows: React.FC<{ rows: [string, number][]; format?: (v: number) => string; label?: (k: string) => string; tone?: string }> =
    ({ rows, format, label, tone = 'bg-blue-500' }) => {
      const max = Math.max(1, ...rows.map((r) => r[1]));
      if (!rows.length) return <p className="text-xs text-slate-400">No data yet.</p>;
      return (
        <div className="space-y-2">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[130px_1fr_64px] items-center gap-2 text-xs">
              <span className="font-semibold text-slate-600 truncate" title={label ? label(k) : k}>{label ? label(k) : k}</span>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(3, (v / max) * 100)}%` }} />
              </div>
              <span className="font-extrabold text-slate-800 text-right">{format ? format(v) : v}</span>
            </div>
          ))}
        </div>
      );
    };

  const Card: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; wide?: boolean }> = ({ title, icon, children, wide }) => (
    <div className={`bg-white border border-slate-200 rounded-2xl p-4 ${wide ? 'lg:col-span-2' : ''}`}>
      <p className="font-extrabold text-slate-900 flex items-center gap-2 text-sm">{icon} {title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );

  const Stat: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone = 'text-slate-900' }) => (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-2xl font-extrabold mt-1 ${tone}`}>{value}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Total complaints" value={String(a.totalComplaints ?? 0)} />
        <Stat label="Filed by citizens online" value={String(a.citizenOriginCount ?? 0)} />
        <Stat label="Average urgency" value={String(a.avgUrgencyScore ?? 0)} tone={(a.avgUrgencyScore ?? 0) >= 60 ? 'text-red-600' : 'text-slate-900'} />
        <Stat label="Average risk score" value={String(a.avgRiskScore ?? 0)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Complaints by scam type" icon={<TrendingUp className="w-4 h-4 text-blue-600" />}>
          <BarRows rows={entries(a.byScamType)} label={scamLabel} />
        </Card>
        <Card title="Money at risk by scam type" icon={<IndianRupee className="w-4 h-4 text-emerald-600" />}>
          <BarRows rows={entries(a.amountByScamType)} label={scamLabel} format={(v) => formatInr(v)} tone="bg-emerald-500" />
        </Card>
        <Card title="Complaints by district" icon={<Network className="w-4 h-4 text-violet-600" />}>
          <BarRows rows={entries(a.byDistrict)} tone="bg-violet-500" />
        </Card>
        <Card title="Workflow status" icon={<CheckCircle2 className="w-4 h-4 text-slate-600" />}>
          <BarRows rows={entries(a.byStatus)} label={(k) => k.replace(/_/g, ' ')} tone="bg-slate-500" />
        </Card>
        <Card title="Complaints by day reported" icon={<TrendingUp className="w-4 h-4 text-cyan-600" />} wide>
          <BarRows rows={entries(a.complaintsByDay).sort((x, y) => x[0].localeCompare(y[0]))} tone="bg-cyan-500" />
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Evidence processing pipeline" icon={<FileSearch className="w-4 h-4 text-amber-600" />} wide>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-center">
            {[
              { v: p.totalFiles ?? 0, l: 'files sealed' },
              { v: `${p.intact ?? 0} intact · ${p.tampered ?? 0} tampered`, l: 'integrity checks' },
              { v: p.needsReview ?? 0, l: 'need manual reading' },
              { v: p.metadataAnomalies ?? 0, l: 'metadata anomalies' },
              { v: p.totalEntities ?? 0, l: 'details auto-detected' },
              { v: p.totalRelationships ?? 0, l: 'connections mapped' },
              { v: p.totalTimelineEvents ?? 0, l: 'timeline events' },
              { v: p.avgOcrConfidence != null ? `${Math.round(p.avgOcrConfidence * 100)}%` : '—', l: 'avg OCR confidence (where run)' },
            ].map((s) => (
              <div key={s.l} className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <p className="text-lg font-extrabold text-slate-900">{s.v}</p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400 mt-4 mb-2">Text-reading engine used (honest reporting)</p>
          <BarRows rows={entries(p.byEngine)} label={(k) => ({
            TESSERACT: 'Tesseract OCR (real)',
            FIXTURE_EMBEDDED_TEXT: 'Demo file embedded text',
            PDF_TEXT: 'PDF text layer',
            PLAIN_TEXT: 'Plain text file',
            NONE: 'Could not read — manual',
          } as Record<string, string>)[k] || k} tone="bg-amber-500" />
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400 mt-4 mb-2">Details detected by type</p>
          <BarRows rows={entries(p.entitiesByType)} label={(k) => k.replace(/_/g, ' ')} tone="bg-indigo-500" />
        </Card>

        <Card title="Bank freeze packets (simulation)" icon={<Landmark className="w-4 h-4 text-blue-700" />}>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-3"><p className="text-xl font-extrabold">{freeze.sent ?? 0}</p><p className="text-[11px] font-bold uppercase text-slate-500">sent</p></div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3"><p className="text-xl font-extrabold">{freeze.acknowledged ?? 0}</p><p className="text-[11px] font-bold uppercase text-slate-500">acknowledged</p></div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3"><p className="text-xl font-extrabold">{formatInr(freeze.totalAmountPaise ?? 0)}</p><p className="text-[11px] font-bold uppercase text-slate-500">amount requested</p></div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Simulation only — the packet is what an officer would send through CFCFRMS / the bank nodal officer. No real bank is contacted.</p>
        </Card>

        <Card title="Repeat destinations (possible rings)" icon={<AlertTriangle className="w-4 h-4 text-red-600" />}>
          {(a.repeatDestinations || []).length === 0 && <p className="text-xs text-slate-400">No destination repeats across complaints yet.</p>}
          <div className="space-y-1.5">
            {(a.repeatDestinations || []).map((d: any) => (
              <p key={d.destination} className="text-sm flex justify-between gap-2 border-b border-slate-100 pb-1.5">
                <span className="font-mono font-semibold text-slate-800 truncate">{d.destination}</span>
                <span className="font-extrabold text-red-700 shrink-0">{d.complaints} complaints</span>
              </p>
            ))}
          </div>
        </Card>

        <Card title="Most connected entities" icon={<Network className="w-4 h-4 text-violet-600" />}>
          <div className="space-y-1.5">
            {(a.topEntities || []).map((e: any, i: number) => (
              <button key={i} onClick={() => e.caseId && onOpenCase(e.caseId)}
                className="w-full text-left text-sm flex justify-between gap-2 border-b border-slate-100 pb-1.5 hover:text-blue-700">
                <span className="font-mono font-semibold truncate">{e.label}</span>
                <span className="text-xs font-bold text-slate-500 shrink-0">{String(e.type).replace(/_/g, ' ')} · {e.evidenceCount} file(s)</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">Ranked by graph centrality (PageRank over the incident graph). Click to open the case.</p>
        </Card>

        <Card title="Chain-of-custody ledger" icon={<ShieldCheck className="w-4 h-4 text-emerald-600" />}>
          <p className="text-sm text-slate-700">
            Ledger verification: <span className={`font-extrabold ${a.custodyLedger?.chainIntact ? 'text-emerald-700' : 'text-red-700'}`}>
              {a.custodyLedger?.chainIntact ? 'INTACT — every entry hash-links to the previous one' : 'CHECK FAILED'}
            </span>
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {a.custodyLedger?.totalEntriesVerified ?? 0} entries re-hashed and compared live.
            A broken link would mean a custody record was altered after the fact.
          </p>
        </Card>
      </div>

      <p className="text-xs text-slate-400">All figures are computed live from stored complaints, evidence records, and the custody ledger. ₹ values are exact (stored in paise).</p>
    </div>
  );
};
