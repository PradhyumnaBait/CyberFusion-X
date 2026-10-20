import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Search,
  Sparkles,
  X,
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
import { WorkspaceHeader } from './components/layout/WorkspaceHeader';
import { InvestigationStepper } from './components/layout/InvestigationStepper';

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
  const [pendingCaseId, setPendingCaseId] = useState<string | null>(null);

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
    const targetCaseId = pendingCaseId || activeCaseId;
    setActiveCaseId(targetCaseId);
    setPendingCaseId(null);
    showToast(
      `Authenticated as ${user.fullName} [${user.role}] — Forensic Workspace Unlocked`,
      'success'
    );
    const usersRes = await fetch('/api/v1/auth/users').then((r) =>
      r.ok ? r.json() : null
    );
    if (usersRes?.users) setAvailableUsers(usersRes.users);
    await loadCaseWorkspaceData(targetCaseId, token);
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
    setPendingCaseId(null);
    setActiveTab('OVERVIEW');
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



  // =========================================================================
  // STAGE 1: PUBLIC HOME PAGE (Default entry point at start of website)
  // =========================================================================
  if (appStage === 'HOME') {
    return (
      <>
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 max-w-md bg-cfx-surface-elevated border border-cfx-border rounded-2xl shadow-cfx-elevated p-4 flex items-start gap-3 text-cfx-text-primary">
            {toastMessage.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-cfx-danger shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-cfx-success shrink-0 mt-0.5" />
            )}
            <div className="text-xs font-semibold text-cfx-text-primary leading-relaxed">
              {toastMessage.text}
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-cfx-text-muted hover:text-cfx-text-primary transition"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <HomeLandingView
          activeCase={activeCase}
          cases={cases}
          isAuthenticated={isAuthenticated}
          onSelectCase={(id) => {
            setActiveCaseId(id);
            if (!isAuthenticated) {
              setPendingCaseId(id);
            }
          }}
          onNavigate={(tab) => {
            if (!isAuthenticated || !currentUser) {
              setAuthInitialMode('LOGIN');
              setAppStage('AUTH');
              return;
            }
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
  // Guard: unauthenticated visits cannot enter the workspace without logging in
  if (!isAuthenticated || !currentUser) {
    return (
      <AuthPortalView
        initialMode="LOGIN"
        onAuthenticated={handleAuthenticated}
        onBackToHome={() => setAppStage('HOME')}
      />
    );
  }
  return (
    <div className="min-h-screen bg-cfx-canvas text-cfx-text-primary flex flex-col font-sans">
      {/* Level 1 (Global Application Header) & Level 2 (Investigation Stepper) */}
      <header className="sticky top-0 z-40 bg-cfx-surface border-b border-cfx-border shadow-xs">
        <WorkspaceHeader
          onNavigateHome={() => setAppStage('HOME')}
          cases={cases}
          activeCaseId={activeCaseId}
          onSelectCase={handleSwitchCase}
          onOpenNewCaseModal={() => setShowNewCaseModal(true)}
          onReanalyzeCase={handleReanalyzeCase}
          onResetDemo={handleResetDemo}
          onOpenSearchModal={() => setShowSearchModal(true)}
          currentUser={currentUser}
          availableUsers={availableUsers}
          onSwitchInvestigatorRole={handleSwitchInvestigatorRole}
          onLogout={handleLogout}
          sseStatus={sseStatus}
        />
        <InvestigationStepper
          activeStage={activeTab}
          onSelectStage={(stage) => setActiveTab(stage)}
          evidenceCount={evidenceList.length}
          entityCount={entities.length}
          timelineCount={timeline.length}
        />
      </header>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md bg-cfx-surface border border-cfx-border rounded-2xl shadow-cfx-elevated p-4 flex items-start gap-3 text-cfx-text-primary">
          {toastMessage.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-cfx-danger shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-cfx-success shrink-0 mt-0.5" />
          )}
          <div className="text-xs font-semibold text-cfx-text-primary leading-relaxed">
            {toastMessage.text}
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-cfx-text-muted hover:text-cfx-text-primary transition"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Level 3: Current Investigation Stage (Cleanly rendered below shell) */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 pt-5 pb-8 min-w-0">

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
            entities={entities}
            ledger={ledger}
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
        <div className="fixed inset-0 z-[60] bg-slate-900/50 flex items-start justify-center pt-20 px-4">
          <div className="bg-white border border-[#DCE2E8] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden text-[#202733]">
            <div className="p-4 border-b border-[#DCE2E8] flex items-center gap-3 bg-[#F0F2F4]">
              <Search className="w-5 h-5 text-[#2563EB]" />
              <input
                type="text"
                autoFocus
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                placeholder="Search across all cases: phone numbers, UPI IDs, SHA-256 hashes, wallets..."
                className="flex-1 text-sm bg-transparent text-[#202733] placeholder-[#8492A6] focus:outline-none font-medium"
              />
              <button
                onClick={() => setShowSearchModal(false)}
                className="text-[#8492A6] hover:text-[#202733] transition p-1 rounded-lg hover:bg-white/80"
                aria-label="Close search"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 max-h-96 overflow-y-auto space-y-4">
              {!globalSearchResults ? (
                <div className="text-xs text-[#8492A6] text-center py-6">
                  Type any entity name, phone number, wallet, or SHA-256 prefix to search across the entire forensic repository.
                </div>
              ) : (
                <>
                  {globalSearchResults.entities?.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#8492A6]">
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
                            className="p-3 rounded-xl bg-[#F0F2F4] hover:bg-[#E2E6EA] border border-[#DCE2E8] cursor-pointer flex items-center justify-between text-xs transition shadow-2xs"
                          >
                            <div>
                              <span className="font-semibold text-[#202733]">
                                {ent.displayLabel}
                              </span>
                              <span className="ml-2 font-mono text-[11px] text-[#8492A6]">
                                ({ent.entityType})
                              </span>
                            </div>
                            <span className="text-[#2563EB] font-semibold">
                              Inspect Graph →
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {globalSearchResults.evidence?.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#8492A6]">
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
                          className="p-3 rounded-xl bg-[#F0F2F4] hover:bg-[#E2E6EA] border border-[#DCE2E8] cursor-pointer flex items-center justify-between text-xs transition shadow-2xs"
                        >
                          <div>
                            <span className="font-mono font-bold text-[#2563EB] mr-2">
                              {ev.evidenceCode}
                            </span>
                            <span className="font-semibold text-[#202733]">
                              {ev.originalFilename}
                            </span>
                          </div>
                          <span className="text-[#2563EB] font-semibold">
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
        <div className="fixed inset-0 z-[60] bg-slate-900/50 flex items-center justify-center px-4">
          <form
            onSubmit={handleCreateNewCase}
            className="bg-white border border-[#DCE2E8] rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 text-[#202733]"
          >
            <div className="flex items-center justify-between border-b border-[#DCE2E8] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#2563EB]" />
                <h3 className="text-base font-bold text-[#202733]">
                  Initialize New Forensic Investigation Case
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewCaseModal(false)}
                className="text-[#8492A6] hover:text-[#202733] p-1 rounded-lg hover:bg-slate-100 transition"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#202733] mb-1">
                  Investigation Title
                </label>
                <input
                  type="text"
                  required
                  value={newCaseTitle}
                  onChange={(e) => setNewCaseTitle(e.target.value)}
                  placeholder="e.g., Operation MuleBridge — Multi-Hop UPI & Crypto Phishing"
                  style={{ backgroundColor: '#FFFFFF', color: '#202733' }}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#DCE2E8] text-[#202733] placeholder-[#8492A6] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#202733] mb-1">
                    Incident Typology
                  </label>
                  <select
                    value={newCaseType}
                    onChange={(e) => setNewCaseType(e.target.value)}
                    style={{ backgroundColor: '#FFFFFF', color: '#202733' }}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#DCE2E8] text-[#202733] focus:outline-none focus:border-[#2563EB] cursor-pointer"
                  >
                    <option value="UPI_WIRE_FRAUD" style={{ backgroundColor: '#FFFFFF', color: '#202733' }} className="bg-white text-[#202733]">
                      UPI &amp; IMPS Mule Fraud
                    </option>
                    <option value="BEC_INVOICE_HIJACK" style={{ backgroundColor: '#FFFFFF', color: '#202733' }} className="bg-white text-[#202733]">
                      BEC SWIFT Invoice Hijack
                    </option>
                    <option value="CRYPTO_DRAINER" style={{ backgroundColor: '#FFFFFF', color: '#202733' }} className="bg-white text-[#202733]">
                      Crypto Wallet Phishing
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#202733] mb-1">
                    Estimated Loss (USD)
                  </label>
                  <input
                    type="number"
                    value={newCaseLoss}
                    onChange={(e) => setNewCaseLoss(e.target.value)}
                    style={{ backgroundColor: '#FFFFFF', color: '#202733' }}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#DCE2E8] text-[#202733] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#202733] mb-1">
                  Victim Name / Organization
                </label>
                <input
                  type="text"
                  value={newCaseVictim}
                  onChange={(e) => setNewCaseVictim(e.target.value)}
                  placeholder="e.g., Horizon FinServe Pvt. Ltd."
                  style={{ backgroundColor: '#FFFFFF', color: '#202733' }}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#DCE2E8] text-[#202733] placeholder-[#8492A6] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#202733] mb-1">
                  Initial Incident Summary
                </label>
                <textarea
                  rows={3}
                  value={newCaseSummary}
                  onChange={(e) => setNewCaseSummary(e.target.value)}
                  placeholder="Describe initial indicators of compromise..."
                  style={{ backgroundColor: '#FFFFFF', color: '#202733' }}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#DCE2E8] text-[#202733] placeholder-[#8492A6] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewCaseModal(false)}
                className="px-4 py-2 rounded-xl bg-[#F0F2F4] hover:bg-[#E9EDF2] border border-[#DCE2E8] text-[#566274] hover:text-[#202733] text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-xs transition"
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
