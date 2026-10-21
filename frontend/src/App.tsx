import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Home,
  LayoutDashboard,
  FolderKanban,
  Clock,
  Network,
  Lock,
  FileText,
  Search,
  Plus,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Activity,
  X,
  Sparkles,
  LogOut,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import {
  UserProfile,
  ForensicCaseSummary,
  EvidenceItem,
  ExtractedEntity,
  EntityRelationship,
  TimelineEvent,
  IntegrityVerification,
  ChainOfCustodyEntry,
  ShortestPathResult,
} from './types';
import { HomeLandingView, WorkspaceTabType } from './components/HomeLandingView';
import { AuthPortalView } from './components/AuthPortalView';
import { ExecutiveDashboardView } from './components/ExecutiveDashboardView';
import { EvidenceVaultView } from './components/EvidenceVaultView';
import { TimelineReconstructionView } from './components/TimelineReconstructionView';
import { IncidentGraphView } from './components/IncidentGraphView';
import { IntegrityLedgerView } from './components/IntegrityLedgerView';
import { ForensicReportView } from './components/ForensicReportView';

export type AppStage = 'HOME' | 'AUTH' | 'WORKSPACE';
export type TabType = WorkspaceTabType;

export function App() {
  // 3-Stage Sequenced User Flow:
  // 1. HOME (Standalone Project Home Page at start of website)
  // 2. AUTH (Login / Sign Up / Demo Users Portal accessible from Home Page)
  // 3. WORKSPACE (Authenticated Sequenced Forensic Investigation Workspace)
  const [appStage, setAppStage] = useState<AppStage>('HOME');
  const [authInitialMode, setAuthInitialMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>('OVERVIEW');

  // Auth & RBAC State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [jwtToken, setJwtToken] = useState<string>('');
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);

  // Cases & Active Case State
  const [cases, setCases] = useState<ForensicCaseSummary[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string>('case-phantom-upi-01');
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [entities, setEntities] = useState<ExtractedEntity[]>([]);
  const [relationships, setRelationships] = useState<EntityRelationship[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [verifications, setVerifications] = useState<IntegrityVerification[]>([]);
  const [ledger, setLedger] = useState<ChainOfCustodyEntry[]>([]);
  const [chainVerification, setChainVerification] = useState<any | null>(null);

  // Cross-view selection state
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(
    null
  );
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  // UI Modals & Notifications
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [sseStatus, setSseStatus] = useState<string>(
    'Java 21 Virtual Threads & SSE Active'
  );
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [newCaseType, setNewCaseType] = useState('UPI_WIRE_FRAUD');
  const [newCaseVictim, setNewCaseVictim] = useState('');
  const [newCaseLoss, setNewCaseLoss] = useState('12500');
  const [newCaseSummary, setNewCaseSummary] = useState('');

  // Global Cmd+K Search State
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<any | null>(
    null
  );

  const showToast = useCallback(
    (text: string, type: 'success' | 'error' | 'info' = 'info') => {
      setToastMessage({ text, type });
      setTimeout(() => {
        setToastMessage((prev) => (prev?.text === text ? null : prev));
      }, 4500);
    },
    []
  );

  const authHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = {};
    if (jwtToken) {
      h['Authorization'] = `Bearer ${jwtToken}`;
    }
    return h;
  }, [jwtToken]);

  const fetchJsonChecked = async (
    url: string,
    headers?: Record<string, string>
  ) => {
    const res = await fetch(url, headers ? { headers } : undefined);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} on ${url}`);
    }
    return res.json();
  };

  const loadCaseWorkspaceData = useCallback(
    async (caseId: string, tokenOverride?: string) => {
      const headers: Record<string, string> = {};
      const tok = tokenOverride ?? jwtToken;
      if (tok) headers['Authorization'] = `Bearer ${tok}`;

      const [casesRes, evRes, entRes, tlRes, verRes, ledRes] =
        await Promise.all([
          fetchJsonChecked('/api/v1/cases', headers),
          fetchJsonChecked(
            `/api/v1/evidence?caseId=${encodeURIComponent(caseId)}`,
            headers
          ),
          fetchJsonChecked(
            `/api/v1/entities?caseId=${encodeURIComponent(caseId)}`,
            headers
          ),
          fetchJsonChecked(
            `/api/v1/timeline?caseId=${encodeURIComponent(caseId)}`,
            headers
          ),
          fetchJsonChecked(
            `/api/v1/integrity/verifications?caseId=${encodeURIComponent(
              caseId
            )}`,
            headers
          ),
          fetchJsonChecked(
            `/api/v1/integrity/ledger?caseId=${encodeURIComponent(caseId)}`,
            headers
          ),
        ]);

      if (casesRes.cases) setCases(casesRes.cases);
      if (evRes.evidence) {
        setEvidenceList(evRes.evidence);
        setSelectedEvidenceId((prev) =>
          prev && evRes.evidence.some((x: EvidenceItem) => x.id === prev)
            ? prev
            : evRes.evidence[0]?.id || null
        );
      }
      if (entRes.entities) {
        setEntities(entRes.entities);
        setSelectedEntityId((prev) =>
          prev && entRes.entities.some((x: ExtractedEntity) => x.id === prev)
            ? prev
            : entRes.entities[0]?.id || null
        );
      }
      if (entRes.relationships) setRelationships(entRes.relationships);
      if (tlRes.timeline) setTimeline(tlRes.timeline);
      if (verRes.verifications) setVerifications(verRes.verifications);
      if (ledRes.ledger) setLedger(ledRes.ledger);
      if (ledRes.chainVerification)
        setChainVerification(ledRes.chainVerification);
    },
    [jwtToken]
  );

  // Initial Bootstrap with Automatic Retry if Backend is Warming Up
  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    async function init(attempt = 1) {
      try {
        const usersRes = await fetchJsonChecked('/api/v1/auth/users');
        if (cancelled) return;
        if (usersRes.users) setAvailableUsers(usersRes.users);

        await loadCaseWorkspaceData('case-phantom-upi-01');
        if (!cancelled) {
          setSseStatus('Java 21 Virtual Threads & SSE Active');
        }
      } catch {
        if (!cancelled && attempt < 30) {
          setSseStatus(
            `Connecting to Java 21 Forensic Engine (Attempt ${attempt})...`
          );
          retryTimer = setTimeout(() => init(attempt + 1), 700);
        }
      }
    }
    init();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [loadCaseWorkspaceData]);

  // Connect to Jakarta Servlet Async SSE stream
  useEffect(() => {
    const es = new EventSource('/api/v1/stream/cases');
    es.addEventListener('progress', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setSseStatus(`${data.stage}: ${data.message} (${data.percent}%)`);
      } catch {
        // ignore
      }
    });
    return () => {
      es.close();
    };
  }, []);

  // Keyboard shortcut Cmd+K / Ctrl+K for global search inside workspace
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (appStage === 'WORKSPACE') {
          setShowSearchModal((v) => !v);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [appStage]);

  useEffect(() => {
    if (!globalSearchQuery.trim()) {
      setGlobalSearchResults(null);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/v1/search?q=${encodeURIComponent(globalSearchQuery)}`)
        .then((r) => r.json())
        .then(setGlobalSearchResults);
    }, 180);
    return () => clearTimeout(timer);
  }, [globalSearchQuery]);

  const activeCase =
    cases.find((c) => c.id === activeCaseId) || cases[0] || null;

  const handleAuthenticated = async (user: UserProfile, token: string) => {
    setCurrentUser(user);
    setJwtToken(token);
    setIsAuthenticated(true);
    setAppStage('WORKSPACE');
    setActiveTab('OVERVIEW');
    showToast(
      `Authenticated as ${user.fullName} [${user.role}] — Forensic Workspace Unlocked`,
      'success'
    );
    const usersRes = await fetch('/api/v1/auth/users').then((r) =>
      r.ok ? r.json() : null
    );
    if (usersRes?.users) setAvailableUsers(usersRes.users);
    await loadCaseWorkspaceData(activeCaseId, token);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: authHeaders(),
      });
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
    setCurrentUser(null);
    setJwtToken('');
    setAppStage('HOME');
    showToast('Signed out of forensic session.', 'info');
  };

  const handleSwitchCase = async (newId: string) => {
    setActiveCaseId(newId);
    await loadCaseWorkspaceData(newId);
  };

  const handleSwitchInvestigatorRole = async (username: string) => {
    const res = await fetch('/api/v1/auth/switch-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ username }),
    });
    const data = await res.json();
    if (res.ok && data.user) {
      setCurrentUser(data.user);
      setJwtToken(data.token);
      showToast(
        `Switched Investigator Session to ${data.user.fullName} [${data.user.role}]`,
        'info'
      );
      await loadCaseWorkspaceData(activeCaseId, data.token);
    }
  };

  const handleReanalyzeCase = async () => {
    const res = await fetch(
      `/api/v1/cases/${encodeURIComponent(activeCaseId)}/reanalyze`,
      {
        method: 'POST',
        headers: authHeaders(),
      }
    );
    if (res.ok) {
      await loadCaseWorkspaceData(activeCaseId);
      showToast(
        'Re-ran OCR/NLP, JGraphT PageRank Centrality, and Heuristic Risk Scoring!',
        'success'
      );
    }
  };

  const handleResetDemo = async () => {
    const res = await fetch('/api/v1/cases/reset-demo', {
      method: 'POST',
      headers: authHeaders(),
    });
    if (res.ok) {
      setActiveCaseId('case-phantom-upi-01');
      await loadCaseWorkspaceData('case-phantom-upi-01');
      showToast(
        'Demo Environment Reset: Restored clean baseline cases, WORM vault binaries, and entity graph!',
        'success'
      );
    }
  };

  const handleCreateNewCase = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/v1/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        title: newCaseTitle,
        incidentType: newCaseType,
        victimName: newCaseVictim || 'Corporate Account Holder',
        estimatedLossUsd: parseFloat(newCaseLoss || '0'),
        summary: newCaseSummary,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Failed to create case', 'error');
      return;
    }
    setShowNewCaseModal(false);
    setNewCaseTitle('');
    setNewCaseSummary('');
    setActiveCaseId(data.id);
    await loadCaseWorkspaceData(data.id);
    showToast(`Created Investigation ${data.caseNumber}`, 'success');
  };

  const handleUploadFile = async (
    file: File,
    category: string,
    notes: string,
    clientSha256: string
  ) => {
    const form = new FormData();
    form.append('caseId', activeCaseId);
    form.append('category', category);
    form.append('notes', notes);
    form.append('clientSha256', clientSha256);
    form.append('file', file);

    const res = await fetch('/api/v1/evidence/upload', {
      method: 'POST',
      headers: {
        ...authHeaders(),
        'X-Client-SHA256': clientSha256,
      },
      body: form,
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Upload failed', 'error');
      return;
    }
    await loadCaseWorkspaceData(activeCaseId);
    if (data.evidence?.id) setSelectedEvidenceId(data.evidence.id);
    showToast(
      `Ingested & Sealed ${data.evidence.evidenceCode} (SHA-256 & BLAKE3 Verified)`,
      'success'
    );
  };

  const handleQuickIngest = async (
    title: string,
    category: string,
    content: string
  ) => {
    const res = await fetch('/api/v1/evidence/quick-artifact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        caseId: activeCaseId,
        title,
        category,
        content,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Artifact ingestion failed', 'error');
      return;
    }
    await loadCaseWorkspaceData(activeCaseId);
    if (data.evidence?.id) setSelectedEvidenceId(data.evidence.id);
    showToast(
      `Synthesized & Correlated ${data.evidence.evidenceCode} — Entities & Graph Updated!`,
      'success'
    );
  };

  const handleVerifyIntegrity = async (evidenceId: string) => {
    const res = await fetch('/api/v1/integrity/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ evidenceId }),
    });
    const data = await res.json();
    await loadCaseWorkspaceData(activeCaseId);
    if (data.verification?.status === 'VERIFIED_INTACT') {
      showToast(
        `Integrity Verified INTACT for ${data.verification.evidenceCode} (SHA-256 & BLAKE3 Match)`,
        'success'
      );
    } else {
      showToast(
        `CRITICAL ALERT: Cryptographic Hash Mismatch Detected on ${data.verification?.evidenceCode}!`,
        'error'
      );
    }
  };

  const handleSimulateTamper = async (evidenceId: string, tamper: boolean) => {
    const res = await fetch('/api/v1/integrity/simulate-tamper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ evidenceId, tamper: String(tamper) }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Tamper simulation failed', 'error');
      return;
    }
    await loadCaseWorkspaceData(activeCaseId);
    if (tamper) {
      showToast(
        `TAMPER_DETECTED: 1-byte storage alteration caused SHA-256 & BLAKE3 mismatch on ${data.verification.evidenceCode}!`,
        'error'
      );
    } else {
      showToast(
        `Restored WORM Vault Copy for ${data.verification.evidenceCode} — Integrity VERIFIED_INTACT`,
        'success'
      );
    }
  };

  const handleVerifyAllCaseEvidence = async () => {
    await fetch('/api/v1/integrity/verify-case', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ caseId: activeCaseId }),
    });
    await loadCaseWorkspaceData(activeCaseId);
    showToast(
      'Verified SHA-256 & BLAKE3 digests across all case evidence items',
      'success'
    );
  };

  const handleTraceShortestPath = async (
    sourceId: string,
    targetId: string
  ): Promise<ShortestPathResult | null> => {
    const res = await fetch(
      `/api/v1/graph/shortest-path?caseId=${encodeURIComponent(
        activeCaseId
      )}&sourceId=${encodeURIComponent(sourceId)}&targetId=${encodeURIComponent(
        targetId
      )}`,
      { headers: authHeaders() }
    );
    const data = await res.json();
    if (data.pathFound) {
      showToast(
        `Dijkstra Shortest Path Traced: ${data.hopCount} Hops (Weight ${data.totalWeight})`,
        'info'
      );
    } else {
      showToast(
        'No directed or undirected path connects those two entities.',
        'error'
      );
    }
    return data;
  };

  const handleCreateRelationship = async (
    sourceEntityId: string,
    targetEntityId: string,
    relationshipType: string,
    label: string
  ) => {
    const res = await fetch('/api/v1/entities/relationship', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        caseId: activeCaseId,
        sourceEntityId,
        targetEntityId,
        relationshipType,
        label,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Could not create relationship', 'error');
      return;
    }
    await loadCaseWorkspaceData(activeCaseId);
    showToast(
      `Created directed graph edge [${relationshipType}] & recomputed PageRank`,
      'success'
    );
  };

  const handleMergeEntities = async (
    primaryEntityId: string,
    duplicateEntityId: string
  ) => {
    const res = await fetch('/api/v1/entities/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        caseId: activeCaseId,
        primaryEntityId,
        secondaryEntityId: duplicateEntityId,
        duplicateEntityId,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Could not merge entities', 'error');
      return;
    }
    await loadCaseWorkspaceData(activeCaseId);
    showToast(
      `Merged duplicate alias into ${data.mergedEntity?.displayLabel || primaryEntityId}`,
      'success'
    );
  };

  const handleAddTimelineMilestone = async (payload: {
    title: string;
    description: string;
    killChainPhase: string;
    severity: string;
  }) => {
    const res = await fetch('/api/v1/timeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        caseId: activeCaseId,
        ...payload,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Could not add timeline milestone', 'error');
      return;
    }
    await loadCaseWorkspaceData(activeCaseId);
    showToast(`Added Investigator Milestone: ${payload.title}`, 'success');
  };

  // Sequenced 6-Step Forensic Investigation Workflow inside Workspace
  const WORKFLOW_STEPS: {
    stepNumber: number;
    id: TabType;
    label: string;
    shortDesc: string;
    icon: React.ReactNode;
    badge?: string | number;
  }[] = [
    {
      stepNumber: 1,
      id: 'OVERVIEW',
      label: '1. Case Overview',
      shortDesc: 'Risk score, KPIs & threat indicators',
      icon: <LayoutDashboard className="w-3.5 h-3.5" />,
    },
    {
      stepNumber: 2,
      id: 'EVIDENCE',
      label: '2. Evidence Vault',
      shortDesc: 'Upload files, OCR boxes & WORM seal',
      icon: <FolderKanban className="w-3.5 h-3.5" />,
      badge: evidenceList.length,
    },
    {
      stepNumber: 3,
      id: 'GRAPH',
      label: '3. Incident Graph',
      shortDesc: 'VISLABS Knowledge & CyberX Map',
      icon: <Network className="w-3.5 h-3.5" />,
      badge: entities.length,
    },
    {
      stepNumber: 4,
      id: 'TIMELINE',
      label: '4. Attack Timeline',
      shortDesc: 'Kill-chain & EXIF anomaly alerts',
      icon: <Clock className="w-3.5 h-3.5" />,
      badge: timeline.length,
    },
    {
      stepNumber: 5,
      id: 'INTEGRITY',
      label: '5. Integrity Ledger',
      shortDesc: 'SHA-256/BLAKE3 & Merkle custody chain',
      icon: <Lock className="w-3.5 h-3.5" />,
    },
    {
      stepNumber: 6,
      id: 'REPORT',
      label: '6. Court Dossier',
      shortDesc: 'Export PDF 1.7, STIX 2.1 & Markdown',
      icon: <FileText className="w-3.5 h-3.5" />,
    },
  ];

  const currentStepIdx = WORKFLOW_STEPS.findIndex((s) => s.id === activeTab);
  const prevStep =
    currentStepIdx > 0 ? WORKFLOW_STEPS[currentStepIdx - 1] : null;
  const nextStep =
    currentStepIdx >= 0 && currentStepIdx < WORKFLOW_STEPS.length - 1
      ? WORKFLOW_STEPS[currentStepIdx + 1]
      : null;

  // =========================================================================
  // STAGE 1: PUBLIC HOME PAGE (Default entry point at start of website)
  // =========================================================================
  if (appStage === 'HOME') {
    return (
      <>
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-4 flex items-start gap-3">
            {toastMessage.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs font-bold text-slate-800 leading-relaxed">
              {toastMessage.text}
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <HomeLandingView
          activeCase={activeCase}
          cases={cases}
          isAuthenticated={isAuthenticated}
          onSelectCase={(id) => setActiveCaseId(id)}
          onNavigate={(tab) => {
            setActiveTab(tab);
            setAppStage('WORKSPACE');
          }}
          onOpenAuthPortal={(mode) => {
            setAuthInitialMode(mode);
            setAppStage('AUTH');
          }}
          onRunGlobalVerify={handleVerifyAllCaseEvidence}
        />
      </>
    );
  }

  // =========================================================================
  // STAGE 2: LOGIN / SIGN UP & DEMO USERS PORTAL
  // =========================================================================
  if (appStage === 'AUTH') {
    return (
      <AuthPortalView
        initialMode={authInitialMode}
        onAuthenticated={handleAuthenticated}
        onBackToHome={() => setAppStage('HOME')}
      />
    );
  }

  // =========================================================================
  // STAGE 3: AUTHENTICATED SEQUENCED FORENSIC WORKSPACE
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900 flex flex-col font-sans">
      {/* Top Daylight Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Back to Home + Brand Identity */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAppStage('HOME')}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
              title="View Project Home Page"
            >
              <Home className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Home Page</span>
            </button>

            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base tracking-tight text-slate-900">
                    CyberFusion <span className="text-blue-600">X</span>
                  </span>
                  <span className="hidden md:inline-block px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                    Forensic Workspace
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Center: Case Switcher + New Case + Reanalyze + Global Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-500 px-2.5 hidden md:inline">
                Case:
              </span>
              <select
                aria-label="Select Active Forensic Case"
                value={activeCaseId}
                onChange={(e) => handleSwitchCase(e.target.value)}
                className="bg-white text-slate-900 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs focus:outline-none focus:border-blue-500"
              >
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.caseNumber} — {c.title.slice(0, 34)} ({c.severity})
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowNewCaseModal(true)}
                className="ml-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 transition"
                title="Create New Investigation Case"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Case</span>
              </button>
              <button
                onClick={handleReanalyzeCase}
                className="ml-1 px-2 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition"
                title="Re-run OCR/NLP, JGraphT PageRank & Risk Engine"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
              </button>
              <button
                onClick={handleResetDemo}
                className="ml-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold transition"
                title="Reset Demo Data to Pristine Initial State"
              >
                Reset Demo
              </button>
            </div>

            <button
              onClick={() => setShowSearchModal(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-xs font-semibold text-slate-600 flex items-center gap-2 transition"
            >
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden lg:inline">Search IOCs...</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white rounded border border-slate-200 text-slate-500">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right: Active Investigator Role Switcher & Sign Out */}
          <div className="flex items-center gap-2">
            <div
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-700"
              title={sseStatus}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span className="max-w-[150px] truncate">{sseStatus}</span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              <select
                aria-label="Switch Investigator Role"
                value={currentUser?.username || 'arjun.verma'}
                onChange={(e) => handleSwitchInvestigatorRole(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
              >
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.username}>
                    {u.fullName} ({u.role.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-1.5 transition"
              title="Sign Out of Investigator Session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Sequenced 6-Step Investigation Workflow Bar (Non-Overlapping Flex Layout) */}
        <div className="bg-slate-50/95 border-t border-slate-200/80">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {WORKFLOW_STEPS.map((step) => {
                const active = activeTab === step.id;
                return (
                  <button
                    key={step.id}
                    onClick={() => setActiveTab(step.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition ${
                      active
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white/80 border border-slate-200/70 text-slate-600 hover:bg-white hover:text-slate-900'
                    }`}
                  >
                    {step.icon}
                    <span>{step.label}</span>
                    {step.badge !== undefined && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          active
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {step.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Guided Step Navigation Controls (Previous / Next Step) */}
            <div className="flex items-center gap-2 shrink-0 ml-auto pl-2">
              {prevStep && (
                <button
                  onClick={() => setActiveTab(prevStep.id)}
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 flex items-center gap-1 shadow-2xs transition"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Prev</span>
                </button>
              )}
              {nextStep && (
                <button
                  onClick={() => setActiveTab(nextStep.id)}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition"
                >
                  <span>Next: {nextStep.label.replace(/^\d+\.\s*/, '')}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-4 flex items-start gap-3">
          {toastMessage.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          )}
          <div className="text-xs font-bold text-slate-800 leading-relaxed">
            {toastMessage.text}
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 pt-5">
        {/* Simple Guided Step Banner with 1-Click Interactive Demo Action */}
        <div className="mb-5 bg-white rounded-2xl border border-blue-200/90 px-4 py-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-extrabold font-mono">
              STEP {currentStepIdx + 1} OF 6
            </span>
            <div>
              <div className="text-xs sm:text-sm font-extrabold text-slate-900">
                {WORKFLOW_STEPS[currentStepIdx]?.label.replace(/^\d+\.\s*/, '')}
              </div>
              <div className="text-[11px] text-slate-500">
                {activeTab === 'OVERVIEW' &&
                  'Inspect composite risk scores, CORETIS global threat map, and correlated IOC breakdown.'}
                {activeTab === 'EVIDENCE' &&
                  'Upload or synthesize evidence artifacts, view pixel-aligned OCR bounding boxes, or simulate a 1-byte tamper attack.'}
                {activeTab === 'GRAPH' &&
                  'Explore VISLABS Knowledge Graph & CyberX Activity Map, trace Dijkstra shortest paths, or link/merge entities.'}
                {activeTab === 'TIMELINE' &&
                  'Review chronological attack milestones across the MITRE kill-chain and inspect EXIF vs. content timestamp anomalies.'}
                {activeTab === 'INTEGRITY' &&
                  'Verify SHA-256 & BLAKE3 digests across all evidence files and audit the hash-chained Merkle custody ledger.'}
                {activeTab === 'REPORT' &&
                  'Export court-admissible ISO/IEC 27037 PDF 1.7 reports, OASIS STIX 2.1 JSON bundles, and Markdown briefs.'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'OVERVIEW' && (
              <button
                onClick={() => setActiveTab('EVIDENCE')}
                className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>⚡ Next: Inspect Evidence Vault &amp; OCR</span>
              </button>
            )}
            {activeTab === 'EVIDENCE' && (
              <button
                onClick={() =>
                  handleQuickIngest(
                    'Layer-3 Crypto Exchange Settlement Alert',
                    'TRANSACTION_RECEIPT',
                    'Sender: +919820411892\nTimestamp: 2026-10-01T10:52:10Z\nFrom UPI: fast.liquidity.hub@ybl\nSettlement Reference: UTR992018472610\nAmount Routed: $9,400.00\nCrypto Off-Ramp Wallet: TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE\nC2 Proxy IP: 185.220.101.44'
                  )
                }
                className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>⚡ 1-Click Demo: Ingest New Evidence Artifact</span>
              </button>
            )}
            {activeTab === 'GRAPH' && (
              <button
                onClick={handleReanalyzeCase}
                className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>⚡ 1-Click Demo: Recompute PageRank &amp; Graph</span>
              </button>
            )}
            {activeTab === 'TIMELINE' && (
              <button
                onClick={() =>
                  handleAddTimelineMilestone({
                    title: 'Emergency NPCI & Exchange Freeze Issued',
                    description:
                      'Lead Investigator transmitted freeze directive for apex.verify.settlement@okaxis and Tron wallet TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE.',
                    killChainPhase: 'CASH_OUT_EXIT',
                    severity: 'CRITICAL',
                  })
                }
                className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>⚡ 1-Click Demo: Log Freeze Milestone</span>
              </button>
            )}
            {activeTab === 'INTEGRITY' && (
              <button
                onClick={handleVerifyAllCaseEvidence}
                className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>⚡ 1-Click Demo: Re-Verify All SHA-256 &amp; BLAKE3 Hashes</span>
              </button>
            )}
            {activeTab === 'REPORT' && activeCase && (
              <a
                href={`/api/v1/reports/pdf?caseId=${encodeURIComponent(
                  activeCase.id
                )}`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>⚡ 1-Click Demo: Download Signed PDF Dossier</span>
              </a>
            )}
          </div>
        </div>

        {activeTab === 'OVERVIEW' && activeCase && (
          <ExecutiveDashboardView
            currentUser={currentUser}
            activeCase={activeCase}
            evidenceList={evidenceList}
            entities={entities}
            relationships={relationships}
            timeline={timeline}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onSelectEntityForGraph={(id) => setSelectedEntityId(id)}
            onSelectEvidenceForVault={(id) => setSelectedEvidenceId(id)}
          />
        )}

        {activeTab === 'EVIDENCE' && (
          <EvidenceVaultView
            caseId={activeCaseId}
            evidenceList={evidenceList}
            selectedEvidenceId={selectedEvidenceId}
            onSelectEvidence={(id) => setSelectedEvidenceId(id)}
            onUploadFile={handleUploadFile}
            onQuickIngest={handleQuickIngest}
            onVerifyIntegrity={handleVerifyIntegrity}
            onSimulateTamper={handleSimulateTamper}
            userRole={currentUser?.role || 'LEAD_INVESTIGATOR'}
          />
        )}

        {activeTab === 'GRAPH' && (
          <IncidentGraphView
            entities={entities}
            relationships={relationships}
            selectedEntityId={selectedEntityId}
            onSelectEntity={(id) => setSelectedEntityId(id)}
            onTraceShortestPath={handleTraceShortestPath}
            onCreateRelationship={handleCreateRelationship}
            onMergeEntities={handleMergeEntities}
          />
        )}

        {activeTab === 'TIMELINE' && (
          <TimelineReconstructionView
            activeCase={activeCase || undefined}
            timeline={timeline}
            evidenceList={evidenceList}
            entities={entities}
            onSelectEvidence={(evId) => {
              setSelectedEvidenceId(evId);
              setActiveTab('EVIDENCE');
            }}
            onSelectEntity={(entId) => {
              setSelectedEntityId(entId);
              setActiveTab('GRAPH');
            }}
            onAddMilestone={handleAddTimelineMilestone}
          />
        )}

        {activeTab === 'INTEGRITY' && (
          <IntegrityLedgerView
            evidenceList={evidenceList}
            verifications={verifications}
            ledger={ledger}
            chainVerification={chainVerification}
            onVerifySingle={handleVerifyIntegrity}
            onVerifyAllCaseEvidence={handleVerifyAllCaseEvidence}
            onRefreshLedger={() => loadCaseWorkspaceData(activeCaseId)}
          />
        )}

        {activeTab === 'REPORT' && activeCase && (
          <ForensicReportView activeCase={activeCase} />
        )}
      </main>

      {/* Global Search Modal (Cmd+K) */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-start justify-center pt-20 px-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3">
              <Search className="w-5 h-5 text-blue-600" />
              <input
                type="text"
                autoFocus
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                placeholder="Search across all cases: phone numbers, UPI IDs, SHA-256 hashes, wallets..."
                className="flex-1 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
              />
              <button
                onClick={() => setShowSearchModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 max-h-96 overflow-y-auto space-y-4">
              {!globalSearchResults ? (
                <div className="text-xs text-slate-400 text-center py-6">
                  Type any entity name, phone number, wallet, or SHA-256 prefix to search across the entire forensic repository.
                </div>
              ) : (
                <>
                  {globalSearchResults.entities?.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold uppercase text-slate-400">
                        Matching Entities ({globalSearchResults.entities.length})
                      </div>
                      {globalSearchResults.entities.map(
                        (ent: ExtractedEntity) => (
                          <div
                            key={ent.id}
                            onClick={() => {
                              setSelectedEntityId(ent.id);
                              setActiveTab('GRAPH');
                              setShowSearchModal(false);
                            }}
                            className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200/80 cursor-pointer flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-bold text-slate-900">
                                {ent.displayLabel}
                              </span>
                              <span className="ml-2 font-mono text-[11px] text-slate-500">
                                ({ent.entityType})
                              </span>
                            </div>
                            <span className="text-blue-600 font-bold">
                              Inspect Graph →
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {globalSearchResults.evidence?.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold uppercase text-slate-400">
                        Matching Evidence ({globalSearchResults.evidence.length})
                      </div>
                      {globalSearchResults.evidence.map((ev: EvidenceItem) => (
                        <div
                          key={ev.id}
                          onClick={() => {
                            setSelectedEvidenceId(ev.id);
                            setActiveTab('EVIDENCE');
                            setShowSearchModal(false);
                          }}
                          className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200/80 cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-mono font-bold text-teal-700 mr-2">
                              {ev.evidenceCode}
                            </span>
                            <span className="font-bold text-slate-900">
                              {ev.originalFilename}
                            </span>
                          </div>
                          <span className="text-teal-700 font-bold">
                            Open Vault →
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create New Investigation Case Modal */}
      {showNewCaseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center px-4">
          <form
            onSubmit={handleCreateNewCase}
            className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Initialize New Forensic Investigation Case
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewCaseModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Investigation Title
                </label>
                <input
                  type="text"
                  required
                  value={newCaseTitle}
                  onChange={(e) => setNewCaseTitle(e.target.value)}
                  placeholder="e.g., Operation MuleBridge — Multi-Hop UPI & Crypto Phishing"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Incident Typology
                  </label>
                  <select
                    value={newCaseType}
                    onChange={(e) => setNewCaseType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                  >
                    <option value="UPI_WIRE_FRAUD">
                      UPI &amp; IMPS Mule Fraud
                    </option>
                    <option value="BEC_INVOICE_HIJACK">
                      BEC SWIFT Invoice Hijack
                    </option>
                    <option value="CRYPTO_DRAINER">
                      Crypto Wallet Phishing
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Estimated Loss (USD)
                  </label>
                  <input
                    type="number"
                    value={newCaseLoss}
                    onChange={(e) => setNewCaseLoss(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Victim Name / Organization
                </label>
                <input
                  type="text"
                  value={newCaseVictim}
                  onChange={(e) => setNewCaseVictim(e.target.value)}
                  placeholder="e.g., Horizon FinServe Pvt. Ltd."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Initial Incident Summary
                </label>
                <textarea
                  rows={3}
                  value={newCaseSummary}
                  onChange={(e) => setNewCaseSummary(e.target.value)}
                  placeholder="Describe initial indicators of compromise..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewCaseModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              >
                Create &amp; Open Case
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
export default App;
