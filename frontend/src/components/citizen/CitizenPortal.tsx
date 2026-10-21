import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, ArrowRight, Briefcase, CheckCircle2, ClipboardPaste,
  Copy, Download, FileCheck2, IndianRupee, Link2, Loader2, MessageSquareWarning,
  PhoneCall, ShieldCheck, Trash2, UploadCloud, UserX, HelpCircle, Sparkles, XCircle,
} from 'lucide-react';
import { EvidenceItem, ExtractedEntity, StatusUpdate } from '../../types';
import { entityLabel, formatDateTime, formatInr, scamLabel } from '../../format';

/* =========================================================================
   Citizen portal: Report (3 steps) · Track · Verify My File
   Plain language, mobile-first. The system fills — the citizen confirms.
   ========================================================================= */

const SCAM_TYPES = [
  { id: 'UPI_PAYMENT_FRAUD', label: 'I lost money (UPI / bank payment)', icon: <IndianRupee className="w-6 h-6" /> },
  { id: 'PHISHING_LINK', label: 'Fake link or message', icon: <Link2 className="w-6 h-6" /> },
  { id: 'FAKE_JOB_INVESTMENT', label: 'Fake job / investment offer', icon: <Briefcase className="w-6 h-6" /> },
  { id: 'ACCOUNT_HACKED', label: 'My account was hacked', icon: <UserX className="w-6 h-6" /> },
  { id: 'HARASSMENT_THREATS', label: 'Threats / harassment / blackmail', icon: <MessageSquareWarning className="w-6 h-6" /> },
  { id: 'OTHER', label: 'Something else / not sure', icon: <HelpCircle className="w-6 h-6" /> },
];

const DEMO_PASTE = [
  'DEMO EVIDENCE (fictional) — WhatsApp message',
  'Sender: +919820411892',
  'URGENT: Your bank account will be frozen today. Complete KYC immediately:',
  'https://secure-hdfc-kyc-update.top/auth-login',
  'Pay verification amount of Rs. 24,500 to UPI: apex.verify.settlement@okaxis',
  'UPI Ref No: 427188390214',
  'Beneficiary Account: 918020048192831 (IFSC: UTIB0001842)',
].join('\n');

interface DraftSession { caseId: string; token: string }

function loadDraft(): DraftSession | null {
  try { const raw = localStorage.getItem('cfx_citizen_draft'); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function saveDraft(d: DraftSession | null) {
  try { d ? localStorage.setItem('cfx_citizen_draft', JSON.stringify(d)) : localStorage.removeItem('cfx_citizen_draft'); } catch { /* ignore */ }
}

async function apiJson(url: string, opts: RequestInit = {}) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || `Request failed (${res.status})`);
  return data;
}

function EmergencyBanner() {
  return (
    <div className="rounded-2xl border border-red-300 bg-red-50 p-4 flex gap-3">
      <PhoneCall className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
      <div className="text-sm text-red-900">
        <p className="font-extrabold">Lost money in the last few hours? Call <span className="text-base">1930</span> right now.</p>
        <p className="mt-1 text-red-800">
          The national cyber-fraud helpline (1930, 24×7) and your bank can try to hold the money before it moves.
          Then complete the official complaint at{' '}
          <a className="underline font-semibold" href="https://cybercrime.gov.in" target="_blank" rel="noreferrer">cybercrime.gov.in</a>.
          Don't wait to finish this form first.
        </p>
      </div>
    </div>
  );
}

function EntityChips({ entities }: { entities: ExtractedEntity[] }) {
  if (!entities.length) return <p className="text-sm text-slate-500">No details found yet. You can still continue — an officer will read your files.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {entities.map((e) => (
        <span key={e.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold">
          <span className="text-blue-500">{entityLabel(e.entityType)}:</span> {e.displayLabel}
        </span>
      ))}
    </div>
  );
}

export const CitizenReportView: React.FC<{ onHome: () => void }> = ({ onHome }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [draft, setDraft] = useState<DraftSession | null>(loadDraft());
  const [resumed, setResumed] = useState(false);

  const [scamType, setScamType] = useState('UPI_PAYMENT_FRAUD');
  const [amountRupees, setAmountRupees] = useState('');
  const [incidentAtLocal, setIncidentAtLocal] = useState('');
  const [district, setDistrict] = useState('Pune');
  const [districts, setDistricts] = useState<string[]>(['Pune', 'Mumbai', 'Nagpur', 'Thane', 'Nashik']);

  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [entities, setEntities] = useState<ExtractedEntity[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});

  const [victimName, setVictimName] = useState('');
  const [contact, setContact] = useState('');
  const [summary, setSummary] = useState('');
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [consent, setConsent] = useState(false);

  const [submitted, setSubmitted] = useState<any>(null);
  const [guidance, setGuidance] = useState<any>(null);

  useEffect(() => {
    apiJson('/api/v1/public/districts').then((d) => d.districts && setDistricts(d.districts)).catch(() => {});
  }, []);

  useEffect(() => {
    apiJson(`/api/v1/public/guidance?scamType=${scamType}`).then(setGuidance).catch(() => {});
  }, [scamType]);

  const refreshExtraction = useCallback(async (d: DraftSession) => {
    const data = await apiJson(`/api/v1/public/complaints/${d.caseId}/extraction?token=${encodeURIComponent(d.token)}`);
    setEvidence(data.evidence || []);
    setEntities(data.entities || []);
    return data;
  }, []);

  useEffect(() => {
    if (draft && !resumed) {
      setResumed(true);
      refreshExtraction(draft).then((d) => {
        if ((d.evidence || []).length) setStep(2);
      }).catch(() => { saveDraft(null); setDraft(null); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const detectedAmount = useMemo(() => {
    const txn = summary; // placeholder to keep hooks simple
    void txn;
    return null;
  }, [summary]);

  async function ensureDraft(): Promise<DraftSession> {
    if (draft) return draft;
    const created = await apiJson('/api/v1/public/complaints/draft', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incidentType: scamType, district, language: 'en' }),
    });
    const d = { caseId: created.caseId, token: created.token };
    setDraft(d); saveDraft(d);
    return d;
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError('');
    try {
      const d = await ensureDraft();
      for (const file of Array.from(files)) {
        if (file.type.startsWith('image/')) {
          setPreviews((p) => ({ ...p, [file.name]: URL.createObjectURL(file) }));
        }
        setBusy(`Securing & reading ${file.name}…`);
        const form = new FormData();
        form.append('token', d.token);
        form.append('file', file);
        const data = await apiJson(`/api/v1/public/complaints/${d.caseId}/evidence`, { method: 'POST', body: form });
        setEvidence(data.extraction?.evidence || []);
        setEntities(data.extraction?.entities || []);
        if (data.duplicateWarnings?.length) setWarnings((w) => [...new Set([...w, ...data.duplicateWarnings])]);
      }
    } catch (e: any) { setError(e.message); } finally { setBusy(''); }
  }

  async function handlePaste(text: string, title: string) {
    if (!text.trim()) return;
    setError('');
    try {
      const d = await ensureDraft();
      setBusy('Reading your pasted text…');
      const data = await apiJson(`/api/v1/public/complaints/${d.caseId}/paste`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: d.token, title, content: text }),
      });
      setEvidence(data.extraction?.evidence || []);
      setEntities(data.extraction?.entities || []);
      if (data.duplicateWarnings?.length) setWarnings((w) => [...new Set([...w, ...data.duplicateWarnings])]);
      setPasteText('');
    } catch (e: any) { setError(e.message); } finally { setBusy(''); }
  }

  function buildAutoSummary() {
    const upi = entities.find((e) => e.entityType === 'UPI_ID');
    const phone = entities.find((e) => e.entityType === 'PHONE');
    const parts: string[] = [];
    parts.push(`I am reporting: ${scamLabel(scamType)}.`);
    if (amountRupees) parts.push(`Amount involved: ₹${amountRupees}.`);
    if (phone) parts.push(`I was contacted from ${phone.displayLabel}.`);
    if (upi) parts.push(`Money/details went to UPI ID ${upi.displayLabel}.`);
    const ex = entities.filter((e) => excluded.has(e.id));
    if (ex.length) parts.push(`Marked by me as not relevant: ${ex.map((e) => e.displayLabel).join(', ')}.`);
    return parts.join(' ');
  }

  async function handleSubmit() {
    if (!draft) return;
    setError('');
    try {
      setBusy('Submitting your complaint…');
      const incidentAt = incidentAtLocal ? new Date(incidentAtLocal).toISOString() : '';
      await apiJson(`/api/v1/public/complaints/${draft.caseId}/confirm`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: draft.token, victimName, contact, district,
          amountRupees: amountRupees ? parseFloat(amountRupees) : 0,
          summary: summary || buildAutoSummary(), incidentAt,
        }),
      });
      const data = await apiJson(`/api/v1/public/complaints/${draft.caseId}/submit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: draft.token }),
      });
      setSubmitted({ ...data, token: draft.token, caseId: draft.caseId });
      if (data.guidance) setGuidance(data.guidance);
      saveDraft(null);
      setStep(4);
      window.scrollTo({ top: 0 });
    } catch (e: any) { setError(e.message); } finally { setBusy(''); }
  }

  const needsReview = evidence.filter((e) => e.needsReview);
  void detectedAmount;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <button onClick={onHome} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Report a cyber incident</h1>
        <p className="text-slate-600 mt-1">3 simple steps. Just add whatever proof you have — screenshots, receipts, messages. We will find the important details for you. No account needed.</p>
      </div>
      <EmergencyBanner />

      {step < 4 && (
        <div className="flex items-center gap-2" aria-label="Progress">
          {['What happened?', 'Add proof', 'Check & submit'].map((label, i) => (
            <div key={label} className="flex-1">
              <div className={`h-2 rounded-full ${step > i ? 'bg-blue-600' : 'bg-slate-200'}`} />
              <p className={`text-xs mt-1.5 font-semibold ${step === i + 1 ? 'text-blue-700' : 'text-slate-500'}`}>{i + 1}. {label}</p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm font-semibold p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
        </div>
      )}
      {busy && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 text-blue-900 text-sm font-semibold p-3 flex gap-2 items-center">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" /> {busy}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SCAM_TYPES.map((t) => (
              <button key={t.id} onClick={() => setScamType(t.id)}
                className={`text-left p-4 rounded-2xl border-2 transition flex items-center gap-3 min-h-[64px] ${
                  scamType === t.id ? 'border-blue-600 bg-blue-50 text-blue-950' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <span className={scamType === t.id ? 'text-blue-600' : 'text-slate-400'}>{t.icon}</span>
                <span className="font-bold text-sm sm:text-base">{t.label}</span>
              </button>
            ))}
          </div>
          {(scamType === 'UPI_PAYMENT_FRAUD' || scamType === 'FAKE_JOB_INVESTMENT') && (
            <label className="block bg-white border border-slate-200 rounded-2xl p-4">
              <span className="text-sm font-bold text-slate-800">How much money was lost? (₹) <span className="text-slate-400 font-medium">— leave blank if not sure, we may find it in your screenshots</span></span>
              <input inputMode="decimal" value={amountRupees} onChange={(e) => setAmountRupees(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="e.g. 24500" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-base focus:outline-none focus:border-blue-500" />
            </label>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block bg-white border border-slate-200 rounded-2xl p-4">
              <span className="text-sm font-bold text-slate-800">When did it happen?</span>
              <input type="datetime-local" value={incidentAtLocal} onChange={(e) => setIncidentAtLocal(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-base focus:outline-none focus:border-blue-500" />
            </label>
            <label className="block bg-white border border-slate-200 rounded-2xl p-4">
              <span className="text-sm font-bold text-slate-800">Your district (Maharashtra)</span>
              <select value={district} onChange={(e) => setDistrict(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-base bg-white focus:outline-none focus:border-blue-500">
                {districts.map((d) => <option key={d} value={d.replace(/\s*\(.*\)$/, '')}>{d}</option>)}
              </select>
            </label>
          </div>
          <button onClick={async () => { setError(''); try { setBusy('Starting your complaint…'); await ensureDraft(); setStep(2); } catch (e: any) { setError(e.message); } finally { setBusy(''); } }}
            className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base flex items-center justify-center gap-2">
            Continue <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            onClick={() => fileInput.current?.click()}
            className="cursor-pointer rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/60 hover:bg-blue-50 p-8 text-center">
            <UploadCloud className="w-10 h-10 text-blue-600 mx-auto" />
            <p className="font-extrabold text-slate-900 mt-2 text-base sm:text-lg">Tap to add screenshots, receipts or files</p>
            <p className="text-sm text-slate-600 mt-1">WhatsApp chats, payment receipts, SMS screenshots, PDFs — add everything you have. You don't need to label anything.</p>
            <input ref={fileInput} type="file" multiple accept="image/*,.pdf,.txt,.log" className="hidden"
              onChange={(e) => handleFiles(e.target.files)} />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <label className="text-sm font-bold text-slate-800 flex items-center gap-2"><ClipboardPaste className="w-4 h-4 text-blue-600" /> …or paste a message, link or number</label>
            <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} rows={4}
              placeholder="Paste the SMS/WhatsApp message, a suspicious link, a phone number, UPI ID — anything."
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-base focus:outline-none focus:border-blue-500" />
            <div className="flex flex-wrap gap-2 mt-3">
              <button onClick={() => handlePaste(pasteText, 'Pasted message')} disabled={!pasteText.trim() || !!busy}
                className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-40">Add pasted text</button>
              <button onClick={() => handlePaste(DEMO_PASTE, 'Demo WhatsApp message (fictional)')}
                className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold inline-flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Try with demo evidence
              </button>
            </div>
          </div>

          {!!warnings.length && warnings.map((w) => (
            <div key={w} className="rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-sm font-semibold p-3">⚠ {w}</div>
          ))}

          {!!evidence.length && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
              <h2 className="font-extrabold text-slate-900">Your proof ({evidence.length})</h2>
              {evidence.map((ev) => (
                <div key={ev.id} className="flex gap-3 items-start border border-slate-100 rounded-xl p-3">
                  {previews[ev.originalFilename]
                    ? <img src={previews[ev.originalFilename]} alt="" className="w-14 h-14 rounded-lg object-cover border border-slate-200" />
                    : <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><FileCheck2 className="w-6 h-6 text-slate-400" /></div>}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-slate-900 truncate">{ev.originalFilename}</p>
                    <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5" /> Secured — fingerprint {ev.sha256Hash?.slice(0, 10)}…
                    </p>
                    {ev.needsReview
                      ? <p className="text-xs text-amber-700 font-semibold mt-1">We couldn't read this file automatically. It's still saved safely — an officer will read it. If you can, also paste the text above.</p>
                      : <p className="text-xs text-slate-500 mt-1">Read successfully{ev.ocrEngine === 'TESSERACT' ? ' (OCR)' : ''}.</p>}
                  </div>
                </div>
              ))}
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 mb-2">Details we found for you</h3>
                <EntityChips entities={entities} />
              </div>
            </div>
          )}

          {!!needsReview.length && (
            <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3">
              {needsReview.length} file(s) need manual reading by an officer. You can still submit now.
            </p>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="px-5 py-4 rounded-2xl border border-slate-300 bg-white font-bold text-slate-700">Back</button>
            <button onClick={() => { setSummary((s) => s || buildAutoSummary()); setStep(3); }}
              className="flex-1 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base flex items-center justify-center gap-2">
              {evidence.length ? 'Check & submit' : 'Continue without files'} <ArrowRight className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-slate-500 text-center">Your progress is saved on this device — you can close and come back.</p>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <h2 className="font-extrabold text-slate-900">Please check what we found</h2>
            <p className="text-sm text-slate-600 mt-1">Tap ✖ on anything that is wrong or not related. Everything else will be sent to the officer.</p>
            <div className="mt-3 space-y-2">
              {entities.length === 0 && <p className="text-sm text-slate-500">No automatic details found — please describe what happened below.</p>}
              {entities.map((e) => {
                const off = excluded.has(e.id);
                return (
                  <div key={e.id} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${off ? 'border-slate-200 bg-slate-50 opacity-50' : 'border-emerald-200 bg-emerald-50/60'}`}>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-500">{entityLabel(e.entityType)}</span>
                      <p className="font-bold text-slate-900 truncate">{e.displayLabel}</p>
                    </div>
                    <button onClick={() => setExcluded((prev) => { const n = new Set(prev); off ? n.delete(e.id) : n.add(e.id); return n; })}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ${off ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-300 text-slate-600'}`}>
                      {off ? 'Restore' : '✖ Not correct'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <label className="block">
              <span className="text-sm font-bold text-slate-800">Tell us in your words (you can edit this)</span>
              <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-3 text-base focus:outline-none focus:border-blue-500" />
            </label>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-bold text-slate-800">Your name</span>
                <input value={victimName} onChange={(e) => setVictimName(e.target.value)} placeholder="Full name"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-3 text-base focus:outline-none focus:border-blue-500" />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-slate-800">Mobile number <span className="text-slate-400 font-medium">(for updates, shown masked)</span></span>
                <input inputMode="tel" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="98XXXXXXXX"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-3 text-base focus:outline-none focus:border-blue-500" />
              </label>
            </div>
            {amountRupees && <p className="text-sm text-slate-600">Amount reported: <strong className="text-slate-900">{formatInr(Math.round(parseFloat(amountRupees || '0') * 100))}</strong> · District: <strong className="text-slate-900">{district}</strong></p>}
            <label className="flex items-start gap-2.5 text-sm text-slate-700 font-medium cursor-pointer">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 w-4 h-4 accent-blue-600" />
              The information I am submitting is true to the best of my knowledge, and the files are the originals I received.
            </label>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="px-5 py-4 rounded-2xl border border-slate-300 bg-white font-bold text-slate-700">Back</button>
            <button onClick={handleSubmit} disabled={!consent || !victimName.trim() || !!busy}
              className="flex-1 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base disabled:opacity-40 flex items-center justify-center gap-2">
              <ShieldCheck className="w-5 h-5" /> Submit complaint
            </button>
          </div>
          {!victimName.trim() && <p className="text-xs text-slate-500 text-center">Please add your name so the officer knows who filed this.</p>}
        </div>
      )}

      {step === 4 && submitted && (
        <div className="space-y-5">
          <div className="bg-emerald-50 border border-emerald-300 rounded-3xl p-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h2 className="text-2xl font-extrabold text-slate-900 mt-2">Complaint submitted</h2>
            <p className="text-slate-600 mt-1">Your complaint number is</p>
            <p className="text-2xl sm:text-3xl font-mono font-extrabold text-blue-700 mt-1">{submitted.complaintNo}</p>
            <div className="mt-4 bg-white border border-amber-300 rounded-xl p-3 text-left">
              <p className="text-xs font-extrabold text-amber-800">SAVE YOUR TRACKING CODE — you need both to see updates:</p>
              <div className="flex items-center gap-2 mt-1.5">
                <code className="flex-1 font-mono text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 truncate">{submitted.token}</code>
                <button onClick={() => navigator.clipboard?.writeText(submitted.token)} className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold inline-flex items-center gap-1"><Copy className="w-3.5 h-3.5" /> Copy</button>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <a href={`/api/v1/public/complaints/${submitted.caseId}/receipt.pdf?token=${encodeURIComponent(submitted.token)}`}
                className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold inline-flex items-center gap-1.5">
                <Download className="w-4 h-4" /> Download receipt (PDF)
              </a>
              <a href="#/track" className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-sm font-bold">Track my complaint</a>
            </div>
            <p className="text-xs text-slate-500 mt-3">Evidence seal (SHA-256 of all files): <span className="font-mono">{String(submitted.caseSeal || '').slice(0, 20)}…</span></p>
          </div>

          {guidance && (
            <>
              <section className="bg-white border border-slate-200 rounded-2xl p-5">
                <h3 className="font-extrabold text-slate-900 text-lg">Do these things now</h3>
                <ul className="mt-3 space-y-2.5">
                  {(guidance.checklist || []).map((c: string) => (
                    <li key={c} className="flex gap-2.5 text-sm sm:text-base text-slate-700"><CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> {c}</li>
                  ))}
                </ul>
              </section>
              <section className="bg-white border border-slate-200 rounded-2xl p-5">
                <h3 className="font-extrabold text-slate-900 text-lg">What happens next</h3>
                <ol className="mt-3 space-y-2.5 list-decimal ml-5">
                  {(guidance.nextSteps || []).map((c: string) => (
                    <li key={c} className="text-sm sm:text-base text-slate-700">{c}</li>
                  ))}
                </ol>
              </section>
              <section className="bg-white border border-slate-200 rounded-2xl p-5">
                <h3 className="font-extrabold text-slate-900 text-lg">Stay safe from this scam in future</h3>
                <ul className="mt-3 space-y-2.5">
                  {(guidance.safetyTips || []).map((c: string) => (
                    <li key={c} className="flex gap-2.5 text-sm sm:text-base text-slate-700"><ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" /> {c}</li>
                  ))}
                </ul>
              </section>
            </>
          )}
          <button onClick={onHome} className="w-full py-3.5 rounded-2xl border border-slate-300 bg-white font-bold text-slate-700">Go to home</button>
        </div>
      )}
    </div>
  );
};

/* ------------------------------ Track ------------------------------ */

const TRACK_STAGES = ['RECEIVED', 'UNDER_REVIEW', 'BANK_INTIMATED', 'INVESTIGATING', 'CLOSED'];
const STAGE_LABEL: Record<string, string> = {
  RECEIVED: 'Received & sealed', UNDER_REVIEW: 'Under review', BANK_INTIMATED: 'Bank intimated',
  INVESTIGATING: 'Investigating', CLOSED: 'Closed',
};

export const CitizenTrackView: React.FC<{ onHome: () => void }> = ({ onHome }) => {
  const [complaintNo, setComplaintNo] = useState('');
  const [token, setToken] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function lookup() {
    setError(''); setBusy(true);
    try {
      const data = await apiJson('/api/v1/public/track', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaintNo: complaintNo.trim(), token: token.trim() }),
      });
      setResult(data);
    } catch (e: any) { setError(e.message); setResult(null); } finally { setBusy(false); }
  }

  const updates: StatusUpdate[] = result?.statusUpdates || [];
  const reached = new Set(updates.map((u) => u.status));
  const stagesToShow = TRACK_STAGES.filter((s) => s !== 'BANK_INTIMATED' || reached.has('BANK_INTIMATED') || (result?.amountLostPaise ?? 0) > 0);
  const currentIdx = Math.max(0, ...stagesToShow.map((s, i) => (reached.has(s) ? i : -1)));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <button onClick={onHome} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><ArrowLeft className="w-4 h-4" /> Back</button>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Track your complaint</h1>
      <p className="text-slate-600">Enter the complaint number and tracking code from your receipt. Both are needed so only you can see your case.</p>
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
        <label className="block"><span className="text-sm font-bold text-slate-800">Complaint number</span>
          <input value={complaintNo} onChange={(e) => setComplaintNo(e.target.value)} placeholder="CFX-MH-2026-000101"
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-3 font-mono text-base focus:outline-none focus:border-blue-500" /></label>
        <label className="block"><span className="text-sm font-bold text-slate-800">Tracking code</span>
          <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste the long code from your receipt"
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-3 font-mono text-sm focus:outline-none focus:border-blue-500" /></label>
        <button onClick={lookup} disabled={busy || !complaintNo.trim() || !token.trim()}
          className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold disabled:opacity-40">
          {busy ? 'Checking…' : 'See my status'}
        </button>
        {error && <p className="text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}
      </div>

      {result && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
          <div className="flex flex-wrap justify-between gap-2">
            <div>
              <p className="font-mono font-extrabold text-blue-700 text-lg">{result.complaintNo}</p>
              <p className="text-sm text-slate-600">{scamLabel(result.incidentType)}{result.amountLostPaise ? ` · ${formatInr(result.amountLostPaise)}` : ''}</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-extrabold text-slate-700 h-fit">{result.status}</span>
          </div>
          <div className="space-y-0">
            {stagesToShow.map((stage, i) => {
              const update = updates.filter((u) => u.status === stage).pop();
              const done = i <= currentIdx && reached.has(stage);
              const isCurrent = i === currentIdx;
              return (
                <div key={stage} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-extrabold ${done ? 'bg-emerald-600' : 'bg-slate-300'}`}>{done ? '✓' : i + 1}</div>
                    {i < stagesToShow.length - 1 && <div className={`w-0.5 flex-1 min-h-[28px] ${done ? 'bg-emerald-300' : 'bg-slate-200'}`} />}
                  </div>
                  <div className="pb-5">
                    <p className={`font-extrabold ${isCurrent ? 'text-slate-900' : done ? 'text-slate-800' : 'text-slate-400'}`}>{STAGE_LABEL[stage]}</p>
                    {update && <p className="text-sm text-slate-600 mt-0.5 max-w-md">{update.note}</p>}
                    {update && <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(update.createdAt)}</p>}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-500">{(result.evidence || []).length} file(s) sealed · Case seal <span className="font-mono">{String(result.caseSeal || '').slice(0, 16)}…</span></p>
        </div>
      )}
    </div>
  );
};

/* ------------------------------ Verify ------------------------------ */

export const CitizenVerifyView: React.FC<{ onHome: () => void }> = ({ onHome }) => {
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [hashInput, setHashInput] = useState('');

  async function verifyFile(file: File) {
    setBusy(true); setResult(null);
    try {
      const form = new FormData(); form.append('file', file);
      setResult(await apiJson('/api/v1/public/verify', { method: 'POST', body: form }));
    } catch (e: any) { setResult({ verdict: 'ERROR', message: e.message }); } finally { setBusy(false); }
  }
  async function verifyHash() {
    setBusy(true); setResult(null);
    try {
      setResult(await apiJson('/api/v1/public/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sha256: hashInput.trim() }),
      }));
    } catch (e: any) { setResult({ verdict: 'ERROR', message: e.message }); } finally { setBusy(false); }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <button onClick={onHome} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><ArrowLeft className="w-4 h-4" /> Back</button>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Verify my file</h1>
      <p className="text-slate-600">
        When you submit evidence, we save a digital fingerprint (SHA-256) of each file. Re-check any file here:
        if even one pixel or letter changed after submission, the fingerprint will not match.
        <span className="block mt-1 text-sm">Note: this proves the file is unchanged <em>since we received it</em> — it cannot prove a screenshot was genuine before that.</span>
      </p>
      <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/60 hover:bg-blue-50 p-8 text-center">
        <UploadCloud className="w-10 h-10 text-blue-600 mx-auto" />
        <span className="block font-extrabold text-slate-900 mt-2">Tap to choose the file you submitted</span>
        <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && verifyFile(e.target.files[0])} />
      </label>
      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <label className="text-sm font-bold text-slate-800">…or paste a fingerprint from your receipt</label>
        <div className="flex gap-2 mt-2">
          <input value={hashInput} onChange={(e) => setHashInput(e.target.value)} placeholder="64-character SHA-256 fingerprint"
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-xs focus:outline-none focus:border-blue-500" />
          <button onClick={verifyHash} disabled={busy || hashInput.trim().length < 16} className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-40">Check</button>
        </div>
      </div>
      {busy && <p className="text-sm font-semibold text-blue-800 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Computing fingerprint…</p>}
      {result && (
        <div className={`rounded-2xl border-2 p-5 ${result.verdict === 'INTACT' ? 'border-emerald-400 bg-emerald-50' : 'border-red-300 bg-red-50'}`}>
          {result.verdict === 'INTACT'
            ? <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            : <XCircle className="w-10 h-10 text-red-600" />}
          <h2 className="text-xl font-extrabold text-slate-900 mt-2">
            {result.verdict === 'INTACT' ? 'Intact — unchanged since submission ✓' : result.verdict === 'NOT_FOUND' ? 'No matching sealed file ✖' : 'Could not verify'}
          </h2>
          <p className="text-sm text-slate-700 mt-1">{result.message}</p>
          {result.complaintNo && <p className="text-sm mt-2">Complaint: <strong className="font-mono">{result.complaintNo}</strong> · File: {result.originalFilename} · Received: {formatDateTime(result.receivedAt)}</p>}
          <p className="text-[11px] font-mono text-slate-500 mt-2 break-all">SHA-256: {result.sha256}</p>
        </div>
      )}
      <div className="text-center text-slate-400 text-xs flex items-center justify-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Tip for a demo: edit one pixel in a submitted screenshot and verify again — it will fail.</div>
    </div>
  );
};
