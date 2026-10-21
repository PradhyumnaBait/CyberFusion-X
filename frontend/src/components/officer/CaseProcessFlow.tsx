import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Clock3, FileText, Gauge, Landmark, ListChecks, Loader2, RefreshCw, ScanText, ShieldCheck, WifiOff } from 'lucide-react';
import { formatDateTime, officerFetch } from '../../format';

/**
 * "Process Flow" tab: the complete journey of ONE complaint, stage by stage.
 * Every stage state is computed server-side from records that actually exist
 * (/api/v1/officer/cases/{id}/pipeline) — DONE means provable (hashes stored,
 * entities counted, ACK reference present), never simulated progress.
 */
export const CaseProcessFlow: React.FC<{ jwtToken: string; caseId: string }> = ({ jwtToken, caseId }) => {
  const [pipeline, setPipeline] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [p, a] = await Promise.all([
        officerFetch<any>(`/api/v1/officer/cases/${encodeURIComponent(caseId)}/pipeline`, jwtToken),
        officerFetch<any>(`/api/v1/officer/cases/${encodeURIComponent(caseId)}/activity`, jwtToken),
      ]);
      setPipeline(p);
      setActivity(a.activity || []);
      setError('');
    } catch (err: any) {
      setError(`Could not load the process flow (${err?.message || 'network error'}).`);
    } finally { setLoading(false); }
  }

  useEffect(() => { if (jwtToken && caseId) load(); /* eslint-disable-next-line */ }, [jwtToken, caseId]);

  if (loading && !pipeline) return <p className="text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading process flow…</p>;
  if (error && !pipeline) return (
    <div className="rounded-2xl border-2 border-red-400 bg-red-50 p-4 flex flex-wrap items-center gap-3" role="alert">
      <WifiOff className="w-6 h-6 text-red-600" />
      <p className="flex-1 text-sm font-semibold text-red-900">{error}</p>
      <button onClick={load} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-extrabold">Retry</button>
    </div>
  );
  if (!pipeline) return null;

  const stages: any[] = pipeline.stages || [];
  const doneCount = stages.filter((s) => s.state === 'DONE').length;
  const stageIcon = (s: any) => s.state === 'DONE'
    ? <CheckCircle2 className="w-6 h-6 text-emerald-600" />
    : s.state === 'CURRENT'
      ? <Loader2 className="w-6 h-6 text-blue-600 animate-spin" style={{ animationDuration: '2.5s' }} />
      : <Circle className="w-6 h-6 text-slate-300" />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2"><ListChecks className="w-5 h-5 text-blue-600" /> Full process flow — {pipeline.complaintNumber || pipeline.caseNumber}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{doneCount} of {stages.length} stages complete. Every ✓ is backed by a stored record shown below.</p>
        </div>
        <button onClick={load} className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm font-bold inline-flex items-center gap-1.5">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all" style={{ width: `${stages.length ? (doneCount / stages.length) * 100 : 0}%` }} />
      </div>

      <ol className="relative border-l-2 border-slate-200 ml-3 space-y-4">
        {stages.map((s) => (
          <li key={s.id} className="pl-6 relative">
            <span className="absolute -left-[13px] top-0 bg-slate-50 rounded-full">{stageIcon(s)}</span>
            <div className={`rounded-2xl border p-3.5 ${s.state === 'CURRENT' ? 'border-blue-400 bg-blue-50' : s.state === 'DONE' ? 'border-slate-200 bg-white' : 'border-slate-200 bg-white opacity-60'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-extrabold text-slate-900 text-sm">{s.title}</p>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${s.state === 'DONE' ? 'bg-emerald-100 text-emerald-800' : s.state === 'CURRENT' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {s.state === 'DONE' ? 'Complete' : s.state === 'CURRENT' ? 'In progress' : 'Not started'}
                </span>
                {s.at && <span className="text-xs text-slate-400 inline-flex items-center gap-1"><Clock3 className="w-3.5 h-3.5" />{formatDateTime(s.at)}</span>}
              </div>
              <p className="text-sm text-slate-600 mt-1">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <p className="font-extrabold text-slate-900 flex items-center gap-2 text-sm"><ScanText className="w-4 h-4 text-amber-600" /> How each evidence file was processed</p>
          <div className="mt-3 space-y-2.5">
            {(pipeline.evidenceProcessing || []).length === 0 && <p className="text-xs text-slate-400">No evidence files yet.</p>}
            {(pipeline.evidenceProcessing || []).map((e: any) => (
              <div key={e.evidenceId} className="rounded-xl border border-slate-200 p-3 text-xs space-y-1">
                <p className="font-extrabold text-slate-900 text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-slate-400" /> {e.code} — {e.filename}</p>
                <p className="text-slate-600">1. Received {formatDateTime(e.receivedAt)} → sealed with SHA-256 + BLAKE3.</p>
                <p className="text-slate-600">2. Text read by <span className="font-bold">{engineLabel(e.engine)}</span>
                  {e.textChars > 0 ? ` — ${e.textChars} characters${e.confidence ? `, ${Math.round(e.confidence * 100)}% confidence` : ''}.` : ' — no readable text.'}
                  {e.needsReview && <span className="font-bold text-amber-700"> Flagged: officer should read it manually (the system never guesses).</span>}
                </p>
                <p className="text-slate-600">3. {e.entityCount} detail(s) auto-detected from this file.</p>
                <p className="text-slate-600 flex items-center gap-1.5">
                  <ShieldCheck className={`w-3.5 h-3.5 ${e.integrity === 'TAMPER_DETECTED' ? 'text-red-600' : 'text-emerald-600'}`} />
                  Integrity: <span className="font-bold">{String(e.integrity || 'UNVERIFIED').replace(/_/g, ' ')}</span>
                  {e.lastVerifiedAt ? ` (last checked ${formatDateTime(e.lastVerifiedAt)})` : ''}
                  {e.metadataAnomaly ? ' · metadata time mismatch found' : ''}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="font-extrabold text-slate-900 flex items-center gap-2 text-sm"><Gauge className="w-4 h-4 text-red-600" /> Why this risk & urgency score?</p>
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400 mt-3 mb-1.5">Risk factors (each adds points)</p>
            <ul className="space-y-1.5 text-sm">
              {(pipeline.riskFactors || []).map((f: any, i: number) => (
                <li key={i} className="flex justify-between gap-2 border-b border-slate-100 pb-1">
                  <span className="text-slate-700"><span className="font-bold">{f.title}</span> — {f.description}</span>
                  <span className="font-extrabold text-red-700 shrink-0">+{f.scoreImpact}</span>
                </li>
              ))}
              {!(pipeline.riskFactors || []).length && <li className="text-xs text-slate-400">No measured risk signals beyond the base score.</li>}
            </ul>
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400 mt-3 mb-1.5">Urgency reasons</p>
            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-0.5">
              {(pipeline.urgencyReasons || []).map((r: string, i: number) => <li key={i}>{r}</li>)}
            </ul>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="font-extrabold text-slate-900 flex items-center gap-2 text-sm"><Landmark className="w-4 h-4 text-blue-700" /> Everything that happened (newest first)</p>
            <div className="mt-3 space-y-2 max-h-96 overflow-auto pr-1">
              {activity.length === 0 && <p className="text-xs text-slate-400">No activity recorded yet.</p>}
              {activity.map((ev: any, i: number) => (
                <div key={i} className="flex gap-2.5 text-xs">
                  <span className={`px-2 py-0.5 rounded-full font-extrabold uppercase text-[9px] h-fit shrink-0 ${kindStyle(ev.kind)}`}>{ev.kind}</span>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800">{ev.title} <span className="font-medium text-slate-400">· {formatDateTime(ev.at)}</span></p>
                    {ev.detail && <p className="text-slate-500 break-words">{ev.detail}</p>}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Workflow + hash-chained custody ledger + freeze + uploads, merged. Custody entries are tamper-evident (see Integrity tab).</p>
          </div>
        </div>
      </div>
    </div>
  );
};

function engineLabel(engine?: string): string {
  switch (engine) {
    case 'TESSERACT': return 'Tesseract OCR (real text recognition)';
    case 'FIXTURE_EMBEDDED_TEXT': return 'demo file\'s embedded text (test fixture)';
    case 'PDF_TEXT': return 'the PDF\'s own text layer';
    case 'PLAIN_TEXT': return 'plain text file contents';
    case 'NONE': return 'nothing — could not be read automatically';
    default: return engine || 'unknown';
  }
}

function kindStyle(kind?: string): string {
  switch (kind) {
    case 'WORKFLOW': return 'bg-blue-100 text-blue-800';
    case 'CUSTODY': return 'bg-emerald-100 text-emerald-800';
    case 'FREEZE': return 'bg-violet-100 text-violet-800';
    case 'EVIDENCE': return 'bg-amber-100 text-amber-800';
    default: return 'bg-slate-100 text-slate-600';
  }
}
