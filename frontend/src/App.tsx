import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, ArrowRight, CheckCircle2, ChevronLeft, Clock, FileText, Flame,
  FolderOpen, Landmark, Lock, LogOut, Network, PhoneCall, Plus, Search, Shield,
  ShieldCheck, UserCheck, X, ListChecks,
} from 'lucide-react';
import {
  ChainOfCustodyEntry, EntityRelationship, EvidenceItem, ExtractedEntity,
  ForensicCaseSummary, IntegrityVerification, ShortestPathResult, TimelineEvent, UserProfile,
} from './types';
import { CitizenReportView, CitizenTrackView, CitizenVerifyView } from './components/citizen/CitizenPortal';
import { TriageView } from './components/officer/TriageView';
import { ActionCardView } from './components/officer/ActionCardView';
import { CaseProcessFlow } from './components/officer/CaseProcessFlow';
import { EvidenceVaultView } from './components/EvidenceVaultView';
import { TimelineReconstructionView } from './components/TimelineReconstructionView';
import { IncidentGraphView } from './components/IncidentGraphView';
import { IntegrityLedgerView } from './components/IntegrityLedgerView';
import { ForensicReportView } from './components/ForensicReportView';
import { formatInr } from './format';
import { officerHeaders as buildOfficerHeaders } from './format';

/* =========================================================================
   CyberFusion X — two portals, one app (hash routing keeps static hosting
   and offline demos working):
     #/          landing (choose portal)
     #/report    citizen complaint (no login)
     #/track     citizen tracker        #/verify  Verify My File
     #/officer   officer login -> triage queue -> case workbench
   ========================================================================= */

type OfficerTab = 'OVERVIEW' | 'PROCESS' | 'EVIDENCE' | 'TIMELINE' | 'GRAPH' | 'INTEGRITY' | 'REPORT';

function useHashRoute(): string {
  const [hash, setHash] = useState(window.location.hash || '#/');
  useEffect(() => {
    const on = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

export default function App() {
  const route = useHashRoute();
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast((p) => (p?.text === text ? null : p)), 5000);
  }, []);

  const go = (h: string) => { window.location.hash = h; window.scrollTo({ top: 0 }); };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      {toast && (
        <div className="fixed bottom-5 right-5 z-[100] max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-4 flex items-start gap-3">
          {toast.type === 'error' ? <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" /> : <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
          <div className="text-sm font-semibold text-slate-800">{toast.text}</div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
        </div>
      )}

      {route.startsWith('#/report') && <CitizenReportView onHome={() => go('#/')} />}
      {route.startsWith('#/track') && <CitizenTrackView onHome={() => go('#/')} />}
      {route.startsWith('#/verify') && <CitizenVerifyView onHome={() => go('#/')} />}
      {route.startsWith('#/officer') && <OfficerPortal go={go} showToast={showToast} />}
      {(route === '#/' || route === '#' || route === '') && <Landing go={go} />}
      {!['#/', '#', ''].includes(route) && !route.startsWith('#/report') && !route.startsWith('#/track')
        && !route.startsWith('#/verify') && !route.startsWith('#/officer') && <Landing go={go} />}
    </div>
  );
}

/* -------------------------------- Landing -------------------------------- */

const Landing: React.FC<{ go: (h: string) => void }> = ({ go }) => (
  <div>
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-8 py-3.5">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white"><Shield className="w-5 h-5" /></div>
          <div>
            <p className="font-extrabold text-base leading-tight">CyberFusion <span className="text-blue-600">X</span></p>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">Digital forensics & fraud reconstruction · Maharashtra, India</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => go('#/track')} className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-extrabold">Track complaint</button>
          <button onClick={() => go('#/officer')} className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-extrabold">Officer sign in</button>
        </div>
      </div>
    </header>

    <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      <div className="rounded-2xl border border-red-300 bg-red-50 p-4 flex gap-3">
        <PhoneCall className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
        <p className="text-sm text-red-900">
          <strong>Money lost just now?</strong> First call <strong className="text-base">1930</strong> (national cyber-fraud helpline)
          and your bank — they can try to hold the money. Official portal:{' '}
          <a className="underline font-semibold" href="https://cybercrime.gov.in" target="_blank" rel="noreferrer">cybercrime.gov.in</a>.
          This site is a student project demo and does not replace the official process.
        </p>
      </div>

      <section className="text-center space-y-3 pt-2">
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
          Scattered evidence in.<br />
          <span className="bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">A clear, ready-to-act case out.</span>
        </h1>
        <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto">
          Citizens just add screenshots, messages and receipts. CyberFusion X reads them, finds the UPI IDs,
          numbers and transaction references, connects repeated scam accounts across complaints — and hands the
          officer a case that is ready to act on.
        </p>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <button onClick={() => go('#/report')}
          className="text-left bg-blue-600 hover:bg-blue-700 transition rounded-3xl p-6 text-white shadow-lg shadow-blue-600/20 min-h-[190px] flex flex-col justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-blue-200">For citizens · no login</p>
            <h2 className="text-2xl font-extrabold mt-1.5">I've been scammed / threatened</h2>
            <p className="text-blue-100 mt-2 text-sm sm:text-base">File a complaint in about 3 minutes. Just add your proof — we read the details, seal your files, and tell you exactly what happens next.</p>
          </div>
          <span className="inline-flex items-center gap-2 font-extrabold mt-4">Report an incident <ArrowRight className="w-5 h-5" /></span>
        </button>

        <button onClick={() => go('#/officer')}
          className="text-left bg-slate-900 hover:bg-slate-800 transition rounded-3xl p-6 text-white shadow-lg shadow-slate-900/20 min-h-[190px] flex flex-col justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">For cyber police / investigators</p>
            <h2 className="text-2xl font-extrabold mt-1.5">Officer workbench</h2>
            <p className="text-slate-300 mt-2 text-sm sm:text-base">Golden-hour priority queue, ready-made Action Cards with the destination account isolated, one-click freeze packets, timelines, incident graphs and court-ready reports.</p>
          </div>
          <span className="inline-flex items-center gap-2 font-extrabold mt-4">Open officer portal <ArrowRight className="w-5 h-5" /></span>
        </button>
      </section>

      <section className="grid sm:grid-cols-3 gap-3">
        {[
          { icon: <FolderOpen className="w-6 h-6 text-blue-600" />, title: '1 · Citizen adds proof', text: 'Screenshots, receipts or pasted text. Each file is sealed with a SHA-256 fingerprint the moment it arrives.' },
          { icon: <Network className="w-6 h-6 text-blue-600" />, title: '2 · System does the work', text: 'Reads text (OCR), extracts accounts/UTRs/numbers, rebuilds the timeline and links accounts repeated across complaints.' },
          { icon: <Landmark className="w-6 h-6 text-blue-600" />, title: '3 · Officer acts fast', text: 'Priority queue by urgency, destination pre-isolated, freeze packet generated and acknowledged (simulated bank in demo).' },
        ].map((c) => (
          <div key={c.title} className="bg-white border border-slate-200 rounded-2xl p-5">
            {c.icon}
            <h3 className="font-extrabold mt-2">{c.title}</h3>
            <p className="text-sm text-slate-600 mt-1">{c.text}</p>
          </div>
        ))}
      </section>

      <section className="grid sm:grid-cols-2 gap-3">
        <button onClick={() => go('#/track')} className="bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-5 text-left transition">
          <Clock className="w-6 h-6 text-blue-600" />
          <h3 className="font-extrabold mt-2">Track my complaint</h3>
          <p className="text-sm text-slate-600 mt-1">See real status updates with your complaint number + tracking code.</p>
        </button>
        <button onClick={() => go('#/verify')} className="bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-5 text-left transition">
          <ShieldCheck className="w-6 h-6 text-blue-600" />
          <h3 className="font-extrabold mt-2">Verify my file</h3>
          <p className="text-sm text-slate-600 mt-1">Re-check that a submitted file is byte-for-byte unchanged since we received it.</p>
        </button>
      </section>

      <footer className="text-center text-xs text-slate-400 pb-6 space-y-1">
        <p>CyberFusion X · Java 21 mini-project · All demo persons, accounts and transactions are fictional. No real bank or police system is connected.</p>
        <p>Official reporting: <strong>1930</strong> · cybercrime.gov.in · Maharashtra Cyber (mhcyber.gov.in)</p>
      </footer>
    </main>
  </div>
);

/* ------------------------------ Officer portal ------------------------------ */

const OfficerPortal: React.FC<{
  go: (h: string) => void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}> = ({ go, showToast }) => {
  const [jwtToken, setJwtToken] = useState(() => sessionStorage.getItem('cfx_officer_token') || '');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try { const u = sessionStorage.getItem('cfx_officer_user'); return u ? JSON.parse(u) : null; } catch { return null; }
  });
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [view, setView] = useState<'TRIAGE' | 'CASE'>('TRIAGE');
  const [tab, setTab] = useState<OfficerTab>('OVERVIEW');
  const [triageTick, setTriageTick] = useState(0);

  const [cases, setCases] = useState<ForensicCaseSummary[]>([]);
  const [activeCaseId, setActiveCaseId] = useState('case-citizen-upi-03');
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [entities, setEntities] = useState<ExtractedEntity[]>([]);
  const [relationships, setRelationships] = useState<EntityRelationship[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [verifications, setVerifications] = useState<IntegrityVerification[]>([]);
  const [ledger, setLedger] = useState<ChainOfCustodyEntry[]>([]);
  const [chainVerification, setChainVerification] = useState<any>(null);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [sseStatus, setSseStatus] = useState('Connecting…');

  const authHeaders = useCallback((tok?: string): Record<string, string> => {
    // Multi-transport auth (header + X-Officer-Token + cookie): some preview
    // proxies strip the Authorization header, which used to make the officer
    // queue silently look empty. See officerHeaders() in format.ts.
    return buildOfficerHeaders(tok ?? jwtToken);
  }, [jwtToken]);

  const fetchJson = useCallback(async (url: string, tok?: string) => {
    const res = await fetch(url, { headers: authHeaders(tok), credentials: 'include' });
    if (res.status === 401) throw new Error('SESSION_EXPIRED');
    if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
    return res.json();
  }, [authHeaders]);

  const loadCase = useCallback(async (caseId: string, tok?: string) => {
    const [casesRes, evRes, entRes, tlRes, verRes, ledRes] = await Promise.all([
      fetchJson('/api/v1/cases', tok),
      fetchJson(`/api/v1/evidence?caseId=${encodeURIComponent(caseId)}`, tok),
      fetchJson(`/api/v1/entities?caseId=${encodeURIComponent(caseId)}`, tok),
      fetchJson(`/api/v1/timeline?caseId=${encodeURIComponent(caseId)}`, tok),
      fetchJson(`/api/v1/integrity/verifications?caseId=${encodeURIComponent(caseId)}`, tok),
      fetchJson(`/api/v1/integrity/ledger?caseId=${encodeURIComponent(caseId)}`, tok),
    ]);
    if (casesRes.cases) setCases(casesRes.cases);
    if (evRes.evidence) {
      setEvidenceList(evRes.evidence);
      setSelectedEvidenceId((p) => (p && evRes.evidence.some((x: EvidenceItem) => x.id === p) ? p : evRes.evidence[0]?.id || null));
    }
    if (entRes.entities) {
      setEntities(entRes.entities);
      setSelectedEntityId((p) => (p && entRes.entities.some((x: ExtractedEntity) => x.id === p) ? p : entRes.entities[0]?.id || null));
    }
    if (entRes.relationships) setRelationships(entRes.relationships);
    if (tlRes.timeline) setTimeline(tlRes.timeline);
    if (verRes.verifications) setVerifications(verRes.verifications);
    if (ledRes.ledger) setLedger(ledRes.ledger);
    if (ledRes.chainVerification) setChainVerification(ledRes.chainVerification);
  }, [fetchJson]);

  const openCase = useCallback(async (caseId: string, tok?: string) => {
    setActiveCaseId(caseId);
    setTab('OVERVIEW');
    setView('CASE');
    window.scrollTo({ top: 0 });
    try { await loadCase(caseId, tok); } catch (e: any) { if (String(e.message) !== 'SESSION_EXPIRED') showToast('Could not load case data', 'error'); }
  }, [loadCase, showToast]);

  function onAuthenticated(user: UserProfile, token: string) {
    setCurrentUser(user); setJwtToken(token);
    sessionStorage.setItem('cfx_officer_token', token);
    sessionStorage.setItem('cfx_officer_user', JSON.stringify(user));
    setView('TRIAGE');
    fetchJson('/api/v1/auth/users', token).then((d) => d.users && setUsers(d.users)).catch(() => {});
    fetchJson('/api/v1/cases', token).then((d) => d.cases && setCases(d.cases)).catch(() => {});
    showToast(`Signed in as ${user.fullName} (${user.role.replace(/_/g, ' ')})`, 'success');
  }

  async function logout() {
    try { await fetch('/api/v1/auth/logout', { method: 'POST', headers: authHeaders() }); } catch { /* ignore */ }
    setCurrentUser(null); setJwtToken('');
    sessionStorage.removeItem('cfx_officer_token'); sessionStorage.removeItem('cfx_officer_user');
    go('#/');
  }

  // Validate a restored session; load case list.
  useEffect(() => {
    if (!jwtToken || !currentUser) return;
    fetchJson('/api/v1/cases').then((d) => d.cases && setCases(d.cases)).catch((err) => {
      // Only an explicit 401 ends the session. A transient proxy/network
      // error must NOT log the officer out (that looked like "portal broken").
      if (String(err?.message).includes('SESSION_EXPIRED')) {
        sessionStorage.removeItem('cfx_officer_token'); setJwtToken(''); setCurrentUser(null);
      }
    });
    fetchJson('/api/v1/auth/users').then((d) => d.users && setUsers(d.users)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live updates (new citizen complaints refresh the queue).
  useEffect(() => {
    if (!jwtToken) return;
    const es = new EventSource(`/api/v1/stream/cases?access_token=${encodeURIComponent(jwtToken)}`);
    es.addEventListener('progress', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setSseStatus(`${data.stage}: ${data.message}`);
        if (data.stage === 'NEW_COMPLAINT') setTriageTick((t) => t + 1);
      } catch { /* ignore */ }
    });
    es.onerror = () => setSseStatus('Live updates reconnecting…');
    return () => es.close();
  }, [jwtToken]);

  const activeCase = cases.find((c) => c.id === activeCaseId) || cases[0] || null;

  /* ---- workspace handlers (kept from the original app, messages simplified) ---- */
  async function postJson(url: string, body: any) {
    const res = await fetch(url, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  }
  const handleUploadFile = async (file: File, category: string, notes: string, clientSha256: string) => {
    const form = new FormData();
    form.append('caseId', activeCaseId); form.append('category', category); form.append('notes', notes);
    form.append('clientSha256', clientSha256); form.append('file', file);
    const res = await fetch('/api/v1/evidence/upload', { method: 'POST', credentials: 'include', headers: { ...authHeaders(), 'X-Client-SHA256': clientSha256 }, body: form });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Upload failed', 'error'); return; }
    await loadCase(activeCaseId);
    if (data.evidence?.id) setSelectedEvidenceId(data.evidence.id);
    showToast(data.evidence?.needsReview
      ? `${data.evidence.evidenceCode} sealed — could not be read automatically, marked for manual reading`
      : `${data.evidence.evidenceCode} sealed & analysed`, data.evidence?.needsReview ? 'info' : 'success');
  };
  const handleQuickIngest = async (title: string, category: string, content: string) => {
    const { res, data } = await postJson('/api/v1/evidence/quick-artifact', { caseId: activeCaseId, title, category, content });
    if (!res.ok) { showToast(data.error || 'Ingestion failed', 'error'); return; }
    await loadCase(activeCaseId);
    if (data.evidence?.id) setSelectedEvidenceId(data.evidence.id);
    showToast(`${data.evidence.evidenceCode} added — entities & graph updated`, 'success');
  };
  const handleVerifyIntegrity = async (evidenceId: string) => {
    const { data } = await postJson('/api/v1/integrity/verify', { evidenceId });
    await loadCase(activeCaseId);
    showToast(data.verification?.status === 'VERIFIED_INTACT'
      ? `${data.verification.evidenceCode} is unchanged (SHA-256 matches)`
      : `⚠ ${data.verification?.evidenceCode} has CHANGED since sealing`, data.verification?.status === 'VERIFIED_INTACT' ? 'success' : 'error');
  };
  const handleSimulateTamper = async (evidenceId: string, tamper: boolean) => {
    const { res, data } = await postJson('/api/v1/integrity/simulate-tamper', { evidenceId, tamper: String(tamper) });
    if (!res.ok) { showToast(data.error || 'Simulation failed', 'error'); return; }
    await loadCase(activeCaseId);
    showToast(tamper ? 'Demo: changed 1 byte — verification now correctly fails' : 'Restored sealed copy — verification passes again', tamper ? 'error' : 'success');
  };
  const handleVerifyAll = async () => {
    await postJson('/api/v1/integrity/verify-case', { caseId: activeCaseId });
    await loadCase(activeCaseId);
    showToast('All evidence files re-verified against their sealed hashes', 'success');
  };
  const handleTrace = async (sourceId: string, targetId: string): Promise<ShortestPathResult | null> => {
    const data = await fetchJson(`/api/v1/graph/shortest-path?caseId=${encodeURIComponent(activeCaseId)}&sourceId=${encodeURIComponent(sourceId)}&targetId=${encodeURIComponent(targetId)}`);
    showToast(data.pathFound ? `Money/attack path found: ${data.hopCount} hop(s)` : 'No path connects those two items', data.pathFound ? 'info' : 'error');
    return data;
  };
  const handleRelationship = async (sourceEntityId: string, targetEntityId: string, relationshipType: string, label: string) => {
    const { res, data } = await postJson('/api/v1/entities/relationship', { caseId: activeCaseId, sourceEntityId, targetEntityId, relationshipType, label });
    if (!res.ok) { showToast(data.error || 'Could not add link', 'error'); return; }
    await loadCase(activeCaseId); showToast('Link added', 'success');
  };
  const handleMerge = async (primaryEntityId: string, duplicateEntityId: string) => {
    const { res, data } = await postJson('/api/v1/entities/merge', { caseId: activeCaseId, primaryEntityId, secondaryEntityId: duplicateEntityId, duplicateEntityId });
    if (!res.ok) { showToast(data.error || 'Could not merge', 'error'); return; }
    await loadCase(activeCaseId); showToast('Duplicate merged', 'success');
  };
  const handleMilestone = async (payload: { title: string; description: string; killChainPhase: string; severity: string }) => {
    const { res, data } = await postJson('/api/v1/timeline', { caseId: activeCaseId, ...payload });
    if (!res.ok) { showToast(data.error || 'Could not add milestone', 'error'); return; }
    await loadCase(activeCaseId); showToast(`Milestone added: ${payload.title}`, 'success');
  };

  if (!currentUser || !jwtToken) {
    return <OfficerLogin onAuthenticated={onAuthenticated} onHome={() => go('#/')} showToast={showToast} />;
  }

  const tabs: { id: OfficerTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'OVERVIEW', label: 'Action Card', icon: <Flame className="w-4 h-4" /> },
    { id: 'PROCESS', label: 'Process Flow', icon: <ListChecks className="w-4 h-4" /> },
    { id: 'EVIDENCE', label: 'Evidence', icon: <FolderOpen className="w-4 h-4" />, badge: evidenceList.length },
    { id: 'TIMELINE', label: 'Timeline', icon: <Clock className="w-4 h-4" />, badge: timeline.length },
    { id: 'GRAPH', label: 'Connections', icon: <Network className="w-4 h-4" />, badge: entities.length },
    { id: 'INTEGRITY', label: 'Integrity', icon: <Lock className="w-4 h-4" /> },
    { id: 'REPORT', label: 'Report', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-slate-900 text-white px-4 sm:px-6 py-3 shadow">
        <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('TRIAGE')} className="flex items-center gap-2 font-extrabold">
              <span className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center"><Shield className="w-5 h-5" /></span>
              CyberFusion X <span className="hidden sm:inline text-slate-400 font-semibold text-sm">Officer Portal</span>
            </button>
            <span className="hidden lg:inline text-xs text-slate-400 font-medium ml-2">● {sseStatus}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setView('TRIAGE')} className={`px-3.5 py-2 rounded-xl text-xs font-extrabold ${view === 'TRIAGE' ? 'bg-blue-600' : 'bg-white/10 hover:bg-white/20'}`}>
              Priority queue
            </button>
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 px-2">
              <UserCheck className="w-4 h-4 text-blue-400" /> {currentUser.fullName} · {currentUser.role.replace(/_/g, ' ')}
            </span>
            <button onClick={logout} title="Sign out" className="p-2 rounded-xl bg-white/10 hover:bg-white/20"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {view === 'TRIAGE' && (
          <>
            <NewCaseStrip jwtToken={jwtToken} showToast={showToast} onCreated={(id) => openCase(id)} />
            <TriageView jwtToken={jwtToken} onOpenCase={(id) => openCase(id)} refreshTick={triageTick} />
          </>
        )}

        {view === 'CASE' && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <button onClick={() => { setView('TRIAGE'); setTriageTick((t) => t + 1); }} className="inline-flex items-center gap-1 text-sm font-bold text-slate-600 hover:text-slate-900">
                <ChevronLeft className="w-4 h-4" /> Back to queue
              </button>
              <select value={activeCaseId} onChange={(e) => openCase(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm font-semibold max-w-full">
                {cases.filter((c) => c.status !== 'DRAFT').map((c) => (
                  <option key={c.id} value={c.id}>{c.caseNumber} — {c.victimName} ({formatInr(c.amountLostPaise)})</option>
                ))}
              </select>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5" role="tablist">
              {tabs.map((t) => (
                <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-extrabold transition ${
                    tab === t.id ? 'bg-blue-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {t.icon} {t.label}
                  {t.badge != null && t.badge > 0 && <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${tab === t.id ? 'bg-white/25' : 'bg-slate-100'}`}>{t.badge}</span>}
                </button>
              ))}
            </div>

            {tab === 'OVERVIEW' && activeCase && (
              <ActionCardView caseId={activeCaseId} activeCase={activeCase} jwtToken={jwtToken} users={users}
                onOpenCase={(id) => openCase(id)} onCaseChanged={() => loadCase(activeCaseId)} showToast={showToast} />
            )}
            {tab === 'PROCESS' && activeCase && (
              <CaseProcessFlow jwtToken={jwtToken} caseId={activeCaseId} />
            )}
            {tab === 'EVIDENCE' && (
              <EvidenceVaultView caseId={activeCaseId} evidenceList={evidenceList} selectedEvidenceId={selectedEvidenceId}
                onSelectEvidence={setSelectedEvidenceId} onUploadFile={handleUploadFile} onQuickIngest={handleQuickIngest}
                onVerifyIntegrity={handleVerifyIntegrity} onSimulateTamper={handleSimulateTamper}
                userRole={currentUser.role} jwtToken={jwtToken} />
            )}
            {tab === 'TIMELINE' && (
              <TimelineReconstructionView activeCase={activeCase || undefined} timeline={timeline} evidenceList={evidenceList} entities={entities}
                onSelectEvidence={(id) => { setSelectedEvidenceId(id); setTab('EVIDENCE'); }}
                onSelectEntity={(id) => { setSelectedEntityId(id); setTab('GRAPH'); }}
                onAddMilestone={handleMilestone} />
            )}
            {tab === 'GRAPH' && (
              <IncidentGraphView entities={entities} relationships={relationships} selectedEntityId={selectedEntityId}
                onSelectEntity={setSelectedEntityId} onTraceShortestPath={handleTrace}
                onCreateRelationship={handleRelationship} onMergeEntities={handleMerge} />
            )}
            {tab === 'INTEGRITY' && (
              <IntegrityLedgerView evidenceList={evidenceList} verifications={verifications} ledger={ledger} chainVerification={chainVerification}
                onVerifySingle={handleVerifyIntegrity} onVerifyAllCaseEvidence={handleVerifyAll}
                onRefreshLedger={() => loadCase(activeCaseId)} />
            )}
            {tab === 'REPORT' && activeCase && (
              <ForensicReportView activeCase={activeCase} jwtToken={jwtToken} />
            )}
          </div>
        )}
      </main>

      <GlobalSearch jwtToken={jwtToken} onOpenCase={(id) => openCase(id)} />
    </div>
  );
};

/* Officer-created case (small, collapsible — most cases now arrive from citizens) */
const NewCaseStrip: React.FC<{
  jwtToken: string;
  showToast: (t: string, ty?: 'success' | 'error' | 'info') => void;
  onCreated: (id: string) => void;
}> = ({ jwtToken, showToast, onCreated }) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [victim, setVictim] = useState('');
  const [amount, setAmount] = useState('');
  async function create() {
    if (!title.trim()) { showToast('Give the case a title', 'error'); return; }
    const res = await fetch('/api/v1/cases', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', ...buildOfficerHeaders(jwtToken) },
      body: JSON.stringify({ title, victimName: victim || 'Walk-in complainant', amountRupees: parseFloat(amount || '0'), incidentType: 'UPI_PAYMENT_FRAUD', summary: '' }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Could not create case', 'error'); return; }
    showToast(`Case ${data.caseNumber} created`, 'success');
    onCreated(data.id);
  }
  return (
    <div className="mb-4">
      <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-800">
        <Plus className="w-4 h-4" /> Register a walk-in / phone complaint manually
      </button>
      {open && (
        <div className="mt-2 bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap gap-2 items-end">
          <label className="flex-1 min-w-[200px]"><span className="text-xs font-extrabold text-slate-500 uppercase">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. UPI fraud — senior citizen, Thane" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /></label>
          <label className="min-w-[160px]"><span className="text-xs font-extrabold text-slate-500 uppercase">Victim name</span>
            <input value={victim} onChange={(e) => setVictim(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /></label>
          <label className="w-36"><span className="text-xs font-extrabold text-slate-500 uppercase">Amount (₹)</span>
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /></label>
          <button onClick={create} className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-extrabold">Create & open</button>
        </div>
      )}
    </div>
  );
};

/* Cmd+K global search (kept — genuinely useful for officers) */
const GlobalSearch: React.FC<{ jwtToken: string; onOpenCase: (id: string) => void }> = ({ jwtToken, onOpenCase }) => {
  const [show, setShow] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any>(null);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setShow((s) => !s); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  useEffect(() => {
    if (!q.trim()) { setResults(null); return; }
    const t = setTimeout(() => {
      fetch(`/api/v1/search?q=${encodeURIComponent(q)}`, { headers: buildOfficerHeaders(jwtToken), credentials: 'include' })
        .then((r) => r.json()).then(setResults).catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [q, jwtToken]);

  if (!show) return null;
  const caseHits: any[] = results?.cases || results?.caseHits || [];
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-start justify-center pt-20 px-4" onClick={() => setShow(false)}>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-blue-600" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search all complaints: UPI ID, phone, hash, name…"
            className="flex-1 text-sm focus:outline-none" />
          <button onClick={() => setShow(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-3 space-y-1.5">
          {q && !results && <p className="text-sm text-slate-500 p-2">Searching…</p>}
          {results && !caseHits.length && !(results.entities || []).length && <p className="text-sm text-slate-500 p-2">No matches. Try a UPI ID, phone number or complaint number.</p>}
          {caseHits.map((c: any) => (
            <button key={c.id} onClick={() => { setShow(false); onOpenCase(c.id); }} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-blue-50 transition">
              <span className="font-mono font-bold text-blue-700 text-sm">{c.caseNumber}</span>
              <span className="text-sm text-slate-700"> — {c.title}</span>
            </button>
          ))}
          {(results?.entities || []).map((e: any) => (
            <button key={e.id} onClick={() => { setShow(false); onOpenCase(e.caseId); }} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-blue-50 transition">
              <span className="text-xs font-extrabold text-slate-400 uppercase">{String(e.entityType || '').replace(/_/g, ' ')}</span>{' '}
              <span className="font-mono font-bold text-slate-900 text-sm">{e.displayLabel}</span>
            </button>
          ))}
        </div>
        <p className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400 font-semibold">Tip: search a UPI ID to find every complaint that mentions it (fraud-ring hunting). Ctrl/⌘+K to close.</p>
      </div>
    </div>
  );
};

/* ------------------------------ Officer login ------------------------------ */

const OfficerLogin: React.FC<{
  onAuthenticated: (u: UserProfile, t: string) => void;
  onHome: () => void;
  showToast: (t: string, ty?: 'success' | 'error' | 'info') => void;
}> = ({ onAuthenticated, onHome, showToast }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [demoUsers, setDemoUsers] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/v1/auth/demo-users').then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.users && setDemoUsers(d.users)).catch(() => {});
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      onAuthenticated(data.user, data.token);
    } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  }

  async function demoLogin(u: any) {
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/v1/auth/demo-login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u.username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Demo login failed');
      onAuthenticated(data.user, data.token);
    } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl">
        <button onClick={onHome} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 mb-5">
          <ChevronLeft className="w-4 h-4" /> Back to home
        </button>
        <div className="grid md:grid-cols-2 gap-5">
          <form onSubmit={login} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center"><Lock className="w-5 h-5" /></div>
            <h1 className="text-2xl font-extrabold mt-3">Officer sign in</h1>
            <p className="text-sm text-slate-500 mt-1">Cyber police / forensic investigator access. All actions are recorded in the chain-of-custody log.</p>
            <label className="block mt-5"><span className="text-sm font-bold">Username</span>
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" placeholder="e.g. arjun.verma"
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-3 text-base focus:outline-none focus:border-blue-500" /></label>
            <label className="block mt-3"><span className="text-sm font-bold">Password</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-3 text-base focus:outline-none focus:border-blue-500" /></label>
            {error && <p className="mt-3 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}
            <button disabled={busy} className="mt-5 w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold disabled:opacity-50">
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="bg-orange-50 border border-orange-300 rounded-3xl p-6">
            <span className="px-2.5 py-1 rounded-full bg-orange-500 text-white text-[11px] font-extrabold uppercase tracking-wide">Demo mode</span>
            <h2 className="text-xl font-extrabold mt-3">1-click demo officers</h2>
            <p className="text-sm text-orange-900 mt-1">
              For classroom demonstration only (disable with <code className="font-mono text-xs">DEMO_MODE=false</code>).
              Passwords are never shown — pick a persona to explore each role.
            </p>
            <div className="space-y-2.5 mt-4">
              {demoUsers.map((u) => (
                <button key={u.username} onClick={() => demoLogin(u)} disabled={busy}
                  className="w-full text-left bg-white border border-orange-200 hover:border-orange-400 rounded-2xl p-3.5 transition disabled:opacity-50">
                  <span className="font-extrabold text-slate-900">{u.fullName}</span>
                  <span className="block text-xs font-bold text-orange-700 mt-0.5">{u.role.replace(/_/g, ' ')} · Badge {u.badgeNumber}</span>
                  <span className="block text-xs text-slate-500 mt-0.5">{u.permissionsSummary}</span>
                </button>
              ))}
              {!demoUsers.length && <p className="text-sm text-slate-500">Demo personas unavailable (backend offline or demo mode off).</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
