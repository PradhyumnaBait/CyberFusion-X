import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, BarChart3, Clock, Flame, IndianRupee, Link2, ListOrdered, RefreshCw, Search, ShieldAlert, WifiOff } from 'lucide-react';
import { TriageRow } from '../../types';
import { ageLabel, formatInr, goldenWindow, officerFetch, scamLabel } from '../../format';
import { OfficerAnalytics } from './OfficerAnalytics';

/**
 * Officer landing screen: the Golden-Hour priority queue + analytics.
 * Answers "what needs my attention right now?" — and says so LOUDLY when the
 * data could not be loaded instead of silently showing an empty queue
 * (that silent failure is what made the portal look broken).
 */
export const TriageView: React.FC<{
  jwtToken: string;
  onOpenCase: (caseId: string) => void;
  refreshTick: number;
}> = ({ jwtToken, onOpenCase, refreshTick }) => {
  const [queue, setQueue] = useState<TriageRow[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);
  const [subTab, setSubTab] = useState<'QUEUE' | 'ANALYTICS'>('QUEUE');

  async function load() {
    setLoading(true);
    try {
      const [t, a] = await Promise.all([
        officerFetch<{ queue: TriageRow[] }>('/api/v1/officer/triage', jwtToken),
        officerFetch<any>('/api/v1/officer/analytics', jwtToken),
      ]);
      setQueue(t.queue || []);
      setAnalytics(a);
      setError('');
      setLastLoadedAt(new Date());
    } catch (err: any) {
      // NEVER silently empty the queue. Show exactly what failed + a retry.
      const status = err?.status;
      setError(status === 401
        ? 'Your officer session was rejected by the server (401). Please sign in again — complaints are safe and still stored.'
        : `Could not load complaints (${err?.message || 'network error'}). The server may be restarting — retry in a few seconds.`);
    } finally { setLoading(false); }
  }

  useEffect(() => { if (jwtToken) load(); /* eslint-disable-next-line */ }, [jwtToken, refreshTick]);

  // Keep the queue fresh even if the live stream drops: poll every 20s.
  useEffect(() => {
    if (!jwtToken) return;
    const id = setInterval(() => { load(); }, 20000);
    return () => clearInterval(id);
    /* eslint-disable-next-line */
  }, [jwtToken]);

  const filtered = useMemo(() => queue.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return [c.caseNumber, c.title, c.victimName, c.destination || '', c.district || '']
      .some((v) => v.toLowerCase().includes(q));
  }), [queue, query, statusFilter]);

  const fresh = queue.filter((c) => (c.minutesSinceIncident ?? 99999) <= 360 && (c.amountLostPaise ?? 0) > 0).length;
  const atRisk = queue.reduce((s, c) => s + (c.amountLostPaise || 0), 0);
  const unassigned = analytics?.unassigned ?? queue.filter((c) => c.status === 'SUBMITTED').length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Flame className="w-6 h-6 text-orange-500" /> Priority queue
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Sorted by urgency — freshest money-loss cases first, so bank holds can still be attempted.
            {lastLoadedAt && <span className="text-slate-400"> · Updated {lastLoadedAt.toLocaleTimeString('en-IN')}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="inline-flex rounded-xl border border-slate-300 bg-white p-1">
            <button onClick={() => setSubTab('QUEUE')} className={`px-3 py-1.5 rounded-lg text-sm font-bold inline-flex items-center gap-1.5 ${subTab === 'QUEUE' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>
              <ListOrdered className="w-4 h-4" /> Queue
            </button>
            <button onClick={() => setSubTab('ANALYTICS')} className={`px-3 py-1.5 rounded-lg text-sm font-bold inline-flex items-center gap-1.5 ${subTab === 'ANALYTICS' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>
              <BarChart3 className="w-4 h-4" /> Analytics
            </button>
          </div>
          <button onClick={load} className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-700 inline-flex items-center gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border-2 border-red-400 bg-red-50 p-4 flex flex-wrap items-center gap-3" role="alert">
          <WifiOff className="w-6 h-6 text-red-600 shrink-0" />
          <p className="flex-1 min-w-[260px] text-sm font-semibold text-red-900">{error}</p>
          <button onClick={load} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-extrabold">Retry now</button>
        </div>
      )}

      {subTab === 'ANALYTICS' ? (
        <OfficerAnalytics analytics={analytics} onOpenCase={onOpenCase} />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: 'Complaints in queue', value: String(queue.length) },
              { label: 'Awaiting review', value: String(unassigned) },
              { label: 'Fresh (≤6h, money lost)', value: String(fresh) },
              { label: 'Total amount at risk', value: formatInr(atRisk) },
              { label: 'Freeze ACKs (simulation)', value: `${analytics?.freeze?.acknowledged ?? 0} / ${analytics?.freeze?.sent ?? analytics?.freezeRequestsSent ?? 0}` },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-4">
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">{s.label}</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">{s.value}</p>
              </div>
            ))}
          </div>

          {!!analytics?.repeatDestinations?.length && (
            <div className="rounded-2xl border border-red-300 bg-red-50 p-4">
              <p className="font-extrabold text-red-900 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Repeat destinations across complaints</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {analytics.repeatDestinations.map((d: any) => (
                  <span key={d.destination} className="px-3 py-1.5 rounded-full bg-white border border-red-200 text-red-900 text-xs font-bold">
                    {d.destination} — in {d.complaints} complaints
                  </span>
                ))}
              </div>
              <p className="text-xs text-red-800 mt-2">The same account/number reported by multiple victims usually means an organised ring or a repeat mule account.</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search complaint no, victim, UPI ID, district…"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-300 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-sm font-semibold">
              <option value="ALL">All statuses</option>
              {['SUBMITTED', 'TRIAGED', 'FREEZE_SENT', 'INVESTIGATING', 'CLOSED', 'OPEN'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>

          <div className="space-y-3">
            {loading && !queue.length && !error && <p className="text-sm text-slate-500">Loading queue…</p>}
            {!loading && !error && !filtered.length && (
              <div className="text-sm text-slate-500 bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-1">
                <ShieldAlert className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-bold text-slate-700">No complaints match this filter.</p>
                <p>New citizen complaints appear here automatically (live + every 20 seconds).</p>
              </div>
            )}
            {filtered.map((c) => {
              const gw = goldenWindow(c.minutesSinceIncident);
              return (
                <button key={c.id} onClick={() => onOpenCase(c.id)}
                  className="w-full text-left bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition rounded-2xl p-4 flex flex-wrap items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 ${
                    (c.urgencyScore ?? 0) >= 65 ? 'bg-red-600 text-white' : (c.urgencyScore ?? 0) >= 40 ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    <span className="text-lg font-extrabold leading-none">{c.urgencyScore ?? 0}</span>
                    <span className="text-[9px] font-bold uppercase">urgency</span>
                  </div>
                  <div className="flex-1 min-w-[240px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-extrabold text-blue-700">{c.caseNumber}</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700">{scamLabel(c.incidentType)}</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[11px] font-bold">{c.status.replace(/_/g, ' ')}</span>
                      {(c.crossCaseHitCount ?? 0) > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 border border-red-300 text-[11px] font-extrabold text-red-800 inline-flex items-center gap-1">
                          <Link2 className="w-3 h-3" /> Linked to {c.crossCaseHitCount} other complaint(s)
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-slate-900 mt-1">{c.victimName}{c.district ? <span className="text-slate-500 font-medium"> · {c.district}</span> : null}</p>
                    <p className="text-sm text-slate-600 mt-0.5 line-clamp-2">{c.summary}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs font-semibold">
                      <span className="inline-flex items-center gap-1 text-slate-700"><IndianRupee className="w-3.5 h-3.5" />{formatInr(c.amountLostPaise)}</span>
                      <span className={`inline-flex items-center gap-1 ${gw.tone === 'red' ? 'text-red-700' : gw.tone === 'amber' ? 'text-amber-700' : 'text-slate-500'}`}>
                        <Clock className="w-3.5 h-3.5" /> {ageLabel(c.minutesSinceIncident)} · {gw.text}
                      </span>
                      {c.destination && <span className="text-slate-700">To: <span className="font-mono font-bold">{c.destination}</span></span>}
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-extrabold shrink-0">
                    Open Action Card <ArrowRight className="w-4 h-4" />
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
