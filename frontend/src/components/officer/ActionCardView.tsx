import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, ArrowRight, CheckCircle2, Clock, Download, FileText, Landmark,
  Link2, Loader2, Scale, Send, ShieldAlert, UserCheck,
} from 'lucide-react';
import { ActionCard, ForensicCaseSummary, UserProfile } from '../../types';
import { ageLabel, downloadAuthed, formatDateTime, formatInr, goldenWindow, officerHeaders, scamLabel } from '../../format';

/**
 * Case Overview tab = the Action Card. Everything an officer needs to decide
 * the next action, with every automated claim traceable to evidence.
 */
export const ActionCardView: React.FC<{
  caseId: string;
  activeCase: ForensicCaseSummary;
  jwtToken: string;
  users: UserProfile[];
  onOpenCase: (caseId: string) => void;
  onCaseChanged: () => Promise<void>;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}> = ({ caseId, activeCase, jwtToken, users, onOpenCase, onCaseChanged, showToast }) => {
  const [card, setCard] = useState<ActionCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedDest, setSelectedDest] = useState(0);
  const [bankName, setBankName] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [utr, setUtr] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [verified, setVerified] = useState(false);
  const [sending, setSending] = useState(false);
  const [wfStatus, setWfStatus] = useState('');
  const [wfOfficer, setWfOfficer] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/officer/cases/${caseId}/action-card`, {
        headers: officerHeaders(jwtToken), credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ActionCard = await res.json();
      setCard(data);
      const dest = data.destinations?.[0];
      if (dest) setBankName(dest.bank || '');
      setIfsc(data.ifscs?.[0] || '');
      setUtr(data.utrs?.[0] || '');
      setAmountRupees(data.case?.amountLostPaise ? String(data.case.amountLostPaise / 100) : '');
      setWfStatus(data.case?.status || '');
      setLoadError('');
    } catch {
      setLoadError('Could not load this case\'s Action Card. Your session may have been rejected — use Retry, or sign in again.');
    } finally { setLoading(false); }
  }, [caseId, jwtToken]);

  useEffect(() => { load(); }, [load]);

  async function sendFreeze() {
    const dest = card?.destinations[selectedDest];
    if (!dest) return;
    setSending(true);
    try {
      const res = await fetch(`/api/v1/officer/cases/${caseId}/freeze`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...officerHeaders(jwtToken) },
        body: JSON.stringify({
          accountRef: dest.value, bankName, ifsc, utr,
          amountPaise: Math.round(parseFloat(amountRupees || '0') * 100),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Freeze request failed');
      showToast(`Freeze packet sent (simulation). Mock bank ACK: ${data.freezeRequest.ackRef}`, 'success');
      setVerified(false);
      await load();
      await onCaseChanged();
    } catch (e: any) { showToast(e.message, 'error'); } finally { setSending(false); }
  }

  async function applyWorkflow() {
    try {
      const res = await fetch(`/api/v1/officer/cases/${caseId}/workflow`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...officerHeaders(jwtToken) },
        body: JSON.stringify({ status: wfStatus, assignedOfficerId: wfOfficer }),
      });
      if (!res.ok) throw new Error('Update failed');
      showToast('Case updated — citizen tracker updated too.', 'success');
      await load(); await onCaseChanged();
    } catch (e: any) { showToast(e.message, 'error'); }
  }

  if (loading && !card) return <p className="text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Preparing Action Card…</p>;
  if (!card) return (
    <div className="rounded-2xl border-2 border-red-400 bg-red-50 p-4 flex flex-wrap items-center gap-3" role="alert">
      <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
      <p className="flex-1 min-w-[240px] text-sm font-semibold text-red-900">{loadError || 'Could not load the Action Card.'}</p>
      <button onClick={load} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-extrabold">Retry</button>
    </div>
  );

  const gw = goldenWindow(card.minutesSinceIncident);
  const dest = card.destinations[selectedDest];
  const risk = activeCase.riskIndicators || [];

  return (
    <div className="space-y-5 pb-8">
      {/* Header summary */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
        <div className="flex flex-wrap justify-between gap-4">
          <div className="min-w-[260px] flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-extrabold text-blue-700 text-lg">{activeCase.caseNumber}</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-bold">{scamLabel(activeCase.incidentType)}</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[11px] font-bold">{activeCase.status.replace(/_/g, ' ')}</span>
              {activeCase.origin === 'CITIZEN' && <span className="px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-[11px] font-extrabold text-emerald-800">Citizen portal</span>}
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 mt-1.5">{activeCase.victimName}
              {activeCase.district ? <span className="text-slate-500 text-base font-semibold"> · {activeCase.district}</span> : null}
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">{activeCase.summary}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 text-sm font-semibold">
              <span>Amount: <span className="text-slate-900">{formatInr(activeCase.amountLostPaise)}</span></span>
              <span className={gw.tone === 'red' ? 'text-red-700' : 'text-slate-600'}>
                <Clock className="w-4 h-4 inline -mt-0.5" /> Incident {ageLabel(card.minutesSinceIncident)} — {gw.text}
              </span>
              {activeCase.citizenContactMasked && <span className="text-slate-600">Citizen: {activeCase.citizenContactMasked}</span>}
              <span className="text-slate-600">Reported: {formatDateTime(activeCase.reportedAt || activeCase.createdAt)}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <div className={`w-24 rounded-2xl p-3 text-center ${card.urgencyScore >= 65 ? 'bg-red-600 text-white' : card.urgencyScore >= 40 ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-800'}`}>
              <p className="text-3xl font-extrabold">{card.urgencyScore}</p>
              <p className="text-[10px] font-extrabold uppercase">Urgency</p>
            </div>
            <div className="w-24 rounded-2xl p-3 text-center bg-slate-900 text-white">
              <p className="text-3xl font-extrabold">{activeCase.riskScore}</p>
              <p className="text-[10px] font-extrabold uppercase">Risk</p>
            </div>
          </div>
        </div>
        {!!card.urgencyReasons.length && (
          <div className="flex flex-wrap gap-2 mt-4">
            {card.urgencyReasons.map((r) => (
              <span key={r} className="px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-900 text-xs font-bold">{r}</span>
            ))}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        {/* Freeze / destination column */}
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <h2 className="font-extrabold text-slate-900 flex items-center gap-2"><Landmark className="w-5 h-5 text-blue-600" /> Destination account — ready for bank action</h2>
            {!card.destinations.length && <p className="text-sm text-slate-500 mt-2">No destination UPI/account could be extracted. Check the Evidence tab or ask the citizen for the UPI Ref (UTR).</p>}
            <div className="space-y-2 mt-3">
              {card.destinations.map((d, i) => (
                <button key={d.value + i} onClick={() => { setSelectedDest(i); setBankName(d.bank || ''); }}
                  className={`w-full text-left rounded-2xl border-2 p-3.5 transition ${selectedDest === i ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                  <span className="text-[11px] font-extrabold uppercase text-slate-400">{d.type.replace('_', ' ')}</span>
                  <span className="block font-mono font-extrabold text-slate-900 break-all">{d.value}</span>
                  <span className="block text-xs text-slate-600 mt-0.5">
                    {d.bank ? `${d.bank} · ` : ''}found in {d.evidenceIds.length} evidence file(s) · extraction confidence {Math.round(d.confidence * 100)}%
                  </span>
                  {d.seenInOtherComplaints > 0 && (
                    <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-red-100 border border-red-300 text-[11px] font-extrabold text-red-800">
                      <AlertTriangle className="w-3 h-3" /> Also in {d.seenInOtherComplaints} other complaint(s) — possible repeat mule
                    </span>
                  )}
                </button>
              ))}
            </div>

            {dest && (
              <div className="mt-4 border-t border-slate-100 pt-4 space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="block"><span className="text-xs font-extrabold text-slate-500 uppercase">Bank / PSP</span>
                    <input value={bankName} onChange={(e) => setBankName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" /></label>
                  <label className="block"><span className="text-xs font-extrabold text-slate-500 uppercase">IFSC</span>
                    <input value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase())} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-500" /></label>
                  <label className="block"><span className="text-xs font-extrabold text-slate-500 uppercase">UTR / UPI Ref</span>
                    <input value={utr} onChange={(e) => setUtr(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-500" /></label>
                  <label className="block"><span className="text-xs font-extrabold text-slate-500 uppercase">Amount to hold (₹)</span>
                    <input inputMode="decimal" value={amountRupees} onChange={(e) => setAmountRupees(e.target.value.replace(/[^0-9.]/g, ''))} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" /></label>
                </div>
                <label className="flex items-start gap-2.5 text-sm text-slate-700 font-medium cursor-pointer">
                  <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} className="mt-1 w-4 h-4 accent-blue-600" />
                  I have checked this account and UTR against the sealed evidence (see Evidence tab).
                </label>
                <button onClick={sendFreeze} disabled={!verified || sending}
                  className="w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold disabled:opacity-40 flex items-center justify-center gap-2">
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  Send freeze / hold packet
                </button>
                <p className="text-xs text-slate-500">
                  <strong>Simulation:</strong> the packet is sent to this demo's mock bank and acknowledged instantly.
                  In production it goes via I4C/CFCFRMS to the bank's nodal officer. Sending twice is safe — duplicates are blocked.
                </p>
              </div>
            )}

            {!!card.freezeRequests.length && (
              <div className="mt-4 space-y-2">
                <h3 className="text-sm font-extrabold text-slate-900">Freeze packets on this case</h3>
                {card.freezeRequests.map((fr) => (
                  <div key={fr.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                    <div className="text-sm">
                      <span className="font-mono font-bold">{fr.accountRef}</span>
                      <span className="text-slate-600"> · {formatInr(fr.amountPaise)} · </span>
                      <span className="font-bold text-emerald-800">{fr.status}</span>
                      {fr.ackRef && <span className="text-slate-600"> · ACK {fr.ackRef} (mock)</span>}
                    </div>
                    <button onClick={() => downloadAuthed(`/api/v1/officer/cases/${caseId}/${fr.id}/packet.pdf`, jwtToken, `FreezePacket_${fr.id}.pdf`).catch((e) => showToast(e.message, 'error'))}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold inline-flex items-center gap-1">
                      <Download className="w-3.5 h-3.5" /> Packet PDF
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Workflow */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <h2 className="font-extrabold text-slate-900 flex items-center gap-2"><UserCheck className="w-5 h-5 text-blue-600" /> Assignment & status</h2>
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              <label className="block"><span className="text-xs font-extrabold text-slate-500 uppercase">Status</span>
                <select value={wfStatus} onChange={(e) => setWfStatus(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white">
                  {['SUBMITTED', 'TRIAGED', 'FREEZE_SENT', 'INVESTIGATING', 'CLOSED', 'OPEN'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select></label>
              <label className="block"><span className="text-xs font-extrabold text-slate-500 uppercase">Assign to</span>
                <select value={wfOfficer} onChange={(e) => setWfOfficer(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white">
                  <option value="">Keep current ({activeCase.leadInvestigatorName || 'Unassigned'})</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.fullName} ({u.role.replace(/_/g, ' ')})</option>)}
                </select></label>
            </div>
            <button onClick={applyWorkflow} className="mt-3 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold">Save changes</button>
            <p className="text-xs text-slate-500 mt-2">Status changes appear on the citizen's tracking page.</p>
          </div>
        </div>

        {/* Right column: why, related, legal, docs */}
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <h2 className="font-extrabold text-slate-900 flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-orange-500" /> Why this risk score?</h2>
            <p className="text-xs text-slate-500 mt-1">Every indicator below is measured from this case's evidence — nothing is guessed.</p>
            <div className="space-y-2.5 mt-3">
              {!risk.length && <p className="text-sm text-slate-500">No risk indicators triggered yet.</p>}
              {risk.map((r) => (
                <div key={r.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm text-slate-900">{r.title}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${r.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' : r.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-700'}`}>+{r.scoreImpact}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{r.description}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Source: {r.evidenceRef}</p>
                </div>
              ))}
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 mt-4">Recommended next actions</h3>
            <ul className="mt-2 space-y-1.5">
              {card.recommendedActions.map((a) => (
                <li key={a} className="flex gap-2 text-sm text-slate-700"><CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" /> {a}</li>
              ))}
            </ul>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <h2 className="font-extrabold text-slate-900 flex items-center gap-2"><Link2 className="w-5 h-5 text-blue-600" /> Related complaints</h2>
            {!card.related.length && <p className="text-sm text-slate-500 mt-2">No shared phone/UPI/account/link with other complaints (yet).</p>}
            <div className="space-y-2 mt-3">
              {card.related.map((r) => (
                <button key={r.caseId} onClick={() => onOpenCase(r.caseId)}
                  className="w-full text-left rounded-xl border border-slate-200 hover:border-blue-400 p-3 transition">
                  <span className="font-mono font-bold text-blue-700 text-sm">{r.complaintNo}</span>
                  <span className="text-slate-500 text-sm"> · {formatInr(r.amountLostPaise)} · {r.status.replace(/_/g, ' ')}</span>
                  <span className="block text-xs text-slate-600 mt-1">Shared: {r.sharedEntities.join(' · ')}</span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 mt-1">Open case <ArrowRight className="w-3 h-3" /></span>
                </button>
              ))}
            </div>
            {card.related.length >= 2 && (
              <p className="mt-3 text-sm font-bold text-red-800 bg-red-50 border border-red-200 rounded-xl p-3">
                ⚠ Multiple complaints share the same destination — treat as a possible organised fraud ring and consider a combined investigation.
              </p>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <h2 className="font-extrabold text-slate-900 flex items-center gap-2"><Scale className="w-5 h-5 text-blue-600" /> Legal & documents</h2>
            <p className="text-xs text-slate-500 mt-1">Suggested provisions for this fact pattern — <strong>for the officer to confirm</strong>, never auto-applied:</p>
            <ul className="mt-2 space-y-1.5">
              {card.suggestedLegalSections.map((s) => <li key={s} className="text-sm text-slate-700">• {s}</li>)}
            </ul>
            <div className="flex flex-wrap gap-2 mt-4">
              <button onClick={() => downloadAuthed(`/api/v1/officer/cases/${caseId}/certificate.pdf`, jwtToken, `${activeCase.caseNumber}_BSA63_DRAFT.pdf`).catch((e) => showToast(e.message, 'error'))}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold inline-flex items-center gap-1.5">
                <FileText className="w-4 h-4" /> BSA §63 certificate (draft)
              </button>
              <button onClick={() => downloadAuthed(`/api/v1/reports/pdf?caseId=${encodeURIComponent(caseId)}`, jwtToken, `${activeCase.caseNumber}_Case_Report.pdf`).catch((e) => showToast(e.message, 'error'))}
                className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-sm font-bold inline-flex items-center gap-1.5">
                <Download className="w-4 h-4" /> Case report PDF
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">BSA draft has Part A pre-filled with SHA-256 hashes; Part B (expert) is left for signature. More exports are in the Report tab.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
