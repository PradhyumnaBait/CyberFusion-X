import rawSeed from './demoSeedSnapshot.json';

interface FallbackState {
  cases: any[];
  demoUsersResponse: any;
  usersResponse: any;
  byCase: Record<string, any>;
  customImages: Record<string, string>;
}

function cloneSeed(): FallbackState {
  const cloned = JSON.parse(JSON.stringify(rawSeed));
  return {
    ...cloned,
    customImages: {},
  };
}

function renderSyntheticEvidenceDataUrl(
  evidenceCode: string,
  title: string,
  category: string,
  lines: string[]
): string {
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 920;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 720, 920);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(24, 24, 672, 872);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, 672, 872);

  ctx.fillStyle = '#eff6ff';
  ctx.fillRect(26, 26, 668, 86);
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(26, 26, 668, 6);

  ctx.fillStyle = '#1d4ed8';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(`CYBERFUSION X // DIGITAL FORENSIC ARTIFACT [${evidenceCode}]`, 48, 56);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 19px sans-serif';
  ctx.fillText(title.slice(0, 48), 48, 84);

  ctx.fillStyle = '#475569';
  ctx.font = '12px monospace';
  ctx.fillText(`CATEGORY: ${category}   |   CHAIN-OF-CUSTODY: WORM-SEALED`, 48, 103);

  const BOX_X = 44;
  const FIRST_BOX_Y = 144;
  const LINE_STEP = 64;
  const BOX_W = 632;
  const BOX_H = 42;

  lines.forEach((line, i) => {
    const boxY = FIRST_BOX_Y + i * LINE_STEP;
    const isIoc =
      line.includes('@') ||
      line.includes('+') ||
      line.includes('UTR') ||
      line.includes('IMPS') ||
      line.includes('185.') ||
      line.includes('TQn9');
    ctx.fillStyle = isIoc ? '#fffbeb' : '#f8fafc';
    ctx.fillRect(BOX_X, boxY, BOX_W, BOX_H);
    ctx.strokeStyle = isIoc ? '#fcd34d' : '#e2e8f0';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(BOX_X, boxY, BOX_W, BOX_H);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(String(i + 1).padStart(2, '0'), BOX_X + 12, boxY + 26);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(line.slice(0, 62), BOX_X + 42, boxY + 26);
  });

  return canvas.toDataURL('image/png');
}

export function installStandaloneDemoFallback() {
  const nativeFetch = window.fetch.bind(window);
  let state: FallbackState = cloneSeed();
  let standaloneModeActive = false;

  const jsonResp = (data: any, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  const enableDomInterceptors = () => {
    if (standaloneModeActive) return;
    standaloneModeActive = true;

    const rewriteImages = () => {
      document.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
        const rawAttr = img.getAttribute('src') || '';
        const m = rawAttr.match(/\/api\/v1\/evidence\/([^/?#]+)\/raw/);
        if (m) {
          const evId = decodeURIComponent(m[1]);
          const nextSrc = state.customImages[evId] || `./demo-vault/${evId}.png`;
          if (img.src !== nextSrc && !img.src.endsWith(`/demo-vault/${evId}.png`)) {
            img.src = nextSrc;
          }
        }
      });
    };

    rewriteImages();
    const observer = new MutationObserver(() => rewriteImages());
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src'],
    });

    document.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement)?.closest?.('a');
      if (!target) return;
      const href = target.getAttribute('href') || '';
      if (!href.startsWith('/api/v1/reports/')) return;
      e.preventDefault();
      const url = new URL(href, window.location.origin);
      const caseId = url.searchParams.get('caseId') || 'case-phantom-upi-01';
      const caseBundle = state.byCase[caseId] || state.byCase['case-phantom-upi-01'];

      if (href.includes('/api/v1/reports/markdown')) {
        const blob = new Blob([caseBundle.markdown || '# CyberFusion X Report'], {
          type: 'text/markdown;charset=utf-8',
        });
        triggerDownload(blob, `${caseId}-forensic-report.md`);
      } else if (href.includes('/api/v1/reports/stix')) {
        const blob = new Blob([JSON.stringify(caseBundle.stix || {}, null, 2)], {
          type: 'application/json;charset=utf-8',
        });
        triggerDownload(blob, `${caseId}-stix21-bundle.json`);
      } else if (href.includes('/api/v1/reports/pdf')) {
        const pdfText = buildMinimalPdf(caseBundle.report);
        const blob = new Blob([pdfText], { type: 'application/pdf' });
        triggerDownload(blob, `${caseId}-court-dossier.pdf`);
      }
    });
  };

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  function buildMinimalPdf(report: any): string {
    const title = report?.caseDetails?.title || 'CyberFusion X Forensic Dossier';
    const caseNum = report?.caseDetails?.caseNumber || 'CFX-2026-0914';
    const content = `BT /F1 14 Tf 50 750 Td (CYBERFUSION X - COURT-ADMISSIBLE FORENSIC DOSSIER) Tj 0 -24 Td /F1 11 Tf (Case: ${caseNum} - ${title.replace(/[()\\]/g, '')}) Tj 0 -20 Td (Standard: ISO/IEC 27037 & NIST SP 800-86 Verified) Tj 0 -20 Td (Cryptographic Chain-of-Custody: SHA-256 + BLAKE3 INTACT) Tj ET`;
    return `%PDF-1.7
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length ${content.length} >> stream
${content}
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000241 00000 n 
0000000490 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
558
%%EOF`;
  }

  async function handleFallbackRequest(input: string, init?: RequestInit): Promise<Response> {
    enableDomInterceptors();
    const url = new URL(input, window.location.origin);
    const path = url.pathname;
    const method = (init?.method || 'GET').toUpperCase();
    const bodyText = typeof init?.body === 'string' ? init.body : '';
    const bodyJson = bodyText ? safeParseJson(bodyText) : {};

    if (path === '/api/v1/auth/demo-users') {
      return jsonResp(state.demoUsersResponse);
    }
    if (path === '/api/v1/auth/users') {
      return jsonResp(state.usersResponse);
    }
    if (path === '/api/v1/auth/login' && method === 'POST') {
      const uname = bodyJson.username || 'arjun.verma';
      const users = state.usersResponse?.users || [];
      const found =
        users.find((u: any) => u.username === uname) ||
        users[0] || {
          id: 'usr-lead-01',
          username: uname,
          fullName: 'Cmdr. Arjun Verma (Lead Forensics)',
          role: 'LEAD_INVESTIGATOR',
          department: 'Financial Cybercrime & Mule Intelligence',
          clearanceBadge: 'CFX-CLEARANCE-L5',
        };
      return jsonResp({
        authenticated: true,
        token: `demo-jwt-${found.username}-${Date.now()}`,
        user: found,
      });
    }
    if (path === '/api/v1/auth/register' && method === 'POST') {
      const newUser = {
        id: `usr-${Date.now().toString(16).slice(-6)}`,
        username: bodyJson.username || 'investigator.new',
        fullName: bodyJson.fullName || 'Special Forensic Investigator',
        email: bodyJson.email || 'investigator@cyberfusion.gov',
        role: bodyJson.role || 'LEAD_INVESTIGATOR',
        department: bodyJson.department || 'Digital Forensics Unit',
        clearanceBadge: `CFX-BADGE-${Math.floor(1000 + Math.random() * 9000)}`,
      };
      state.usersResponse.users.push(newUser);
      return jsonResp(
        {
          authenticated: true,
          token: `demo-jwt-${newUser.username}-${Date.now()}`,
          user: newUser,
        },
        201
      );
    }
    if (path === '/api/v1/auth/logout') {
      return jsonResp({ status: 'LOGGED_OUT' });
    }
    if (path === '/api/v1/cases/reset-demo' && method === 'POST') {
      state = cloneSeed();
      return jsonResp({ status: 'RESET_COMPLETE', cases: state.cases });
    }
    if (path === '/api/v1/cases' && method === 'GET') {
      return jsonResp({ cases: state.cases });
    }
    if (path === '/api/v1/cases' && method === 'POST') {
      const newId = `case-${Date.now().toString(16).slice(-6)}`;
      const template = JSON.parse(
        JSON.stringify(state.byCase['case-phantom-upi-01'])
      );
      const newCase = {
        ...state.cases[0],
        id: newId,
        caseNumber: `CFX-2026-${Math.floor(1000 + Math.random() * 8999)}`,
        title: bodyJson.title || 'New Digital Forensic Investigation',
        description:
          bodyJson.description || 'Multi-source fraud correlation workspace.',
        severity: bodyJson.severity || 'HIGH',
        evidenceCount: 0,
        entityCount: 0,
        relationshipCount: 0,
        timelineEventCount: 0,
      };
      state.cases.unshift(newCase);
      state.byCase[newId] = {
        ...template,
        evidence: { caseId: newId, count: 0, evidence: [] },
        entities: { caseId: newId, entities: [], relationships: [] },
        graph: { ...template.graph, nodes: [], edges: [] },
        timeline: { caseId: newId, count: 0, events: [], anomalies: [] },
      };
      return jsonResp({ case: newCase }, 201);
    }
    if (path.endsWith('/reanalyze') && method === 'POST') {
      return jsonResp({ status: 'REANALYZED', cases: state.cases });
    }

    const caseId =
      url.searchParams.get('caseId') ||
      bodyJson.caseId ||
      'case-phantom-upi-01';
    const bundle =
      state.byCase[caseId] || state.byCase['case-phantom-upi-01'];

    if (path === '/api/v1/evidence' && method === 'GET') {
      return jsonResp(bundle.evidence);
    }
    if (
      (path === '/api/v1/evidence/quick-artifact' ||
        path === '/api/v1/evidence') &&
      method === 'POST'
    ) {
      const evList = bundle.evidence.evidence;
      const nextCode = `EVD-00${evList.length + 1}`;
      const newId = `evd-${Date.now().toString(16).slice(-8)}`;
      const contentStr =
        bodyJson.content ||
        'Sender: +919820411892\nTimestamp: 2026-10-01T10:52:10Z\nFrom UPI: fast.liquidity.hub@ybl\nSettlement Reference: UTR992018472610';
      const lines = contentStr.split(/\r?\n/).filter(Boolean);
      const dataUrl = renderSyntheticEvidenceDataUrl(
        nextCode,
        bodyJson.title || 'Synthesized Forensic Evidence',
        bodyJson.category || 'TRANSACTION_RECEIPT',
        lines
      );
      state.customImages[newId] = dataUrl;
      const newEv = {
        ...(evList[0] || {}),
        id: newId,
        caseId,
        evidenceCode: nextCode,
        title: bodyJson.title || 'Synthesized Forensic Evidence',
        category: bodyJson.category || 'TRANSACTION_RECEIPT',
        originalFileName: `${nextCode.toLowerCase()}_artifact.png`,
        extractedText: contentStr,
        tamperedFlag: false,
        integrityStatus: 'VERIFIED_INTACT',
        ocrBlocks: lines.map((line: string, idx: number) => ({
          blockId: `BLK-${idx + 1}`,
          text: line,
          x: 44,
          y: 144 + idx * 64,
          width: 632,
          height: 42,
          confidence: 98.4,
          detectedTag: line.includes('@')
            ? 'UPI_ID'
            : line.includes('+')
            ? 'PHONE'
            : line.includes('UTR')
            ? 'TRANSACTION_ID'
            : 'TEXT_LINE',
        })),
      };
      evList.push(newEv);
      return jsonResp({ evidence: newEv }, 201);
    }
    if (path === '/api/v1/entities' && method === 'GET') {
      return jsonResp(bundle.entities);
    }
    if (path === '/api/v1/entities/relationship' && method === 'POST') {
      const newRel = {
        id: `rel-${Date.now().toString(16).slice(-6)}`,
        caseId,
        sourceEntityId: bodyJson.sourceEntityId,
        targetEntityId: bodyJson.targetEntityId,
        relationshipType: bodyJson.relationshipType || 'TRANSFERRED_TO',
        label: bodyJson.label || bodyJson.relationshipType || 'TRANSFERRED_TO',
        weight: 8.5,
        evidenceIds: [],
        timestamp: new Date().toISOString(),
      };
      bundle.entities.relationships.push(newRel);
      bundle.graph.edges.push({
        id: newRel.id,
        source: newRel.sourceEntityId,
        target: newRel.targetEntityId,
        type: newRel.relationshipType,
        label: newRel.label,
        weight: newRel.weight,
        evidenceIds: [],
      });
      return jsonResp({ relationship: newRel }, 201);
    }
    if (path === '/api/v1/entities/merge' && method === 'POST') {
      const primaryId = bodyJson.primaryEntityId;
      const dupId = bodyJson.secondaryEntityId || bodyJson.duplicateEntityId;
      const primary = bundle.entities.entities.find(
        (e: any) => e.id === primaryId
      );
      bundle.entities.entities = bundle.entities.entities.filter(
        (e: any) => e.id !== dupId
      );
      bundle.graph.nodes = bundle.graph.nodes.filter(
        (n: any) => n.id !== dupId
      );
      return jsonResp({ mergedEntity: primary || { id: primaryId } });
    }
    if (path === '/api/v1/graph' && method === 'GET') {
      return jsonResp(bundle.graph);
    }
    if (path === '/api/v1/graph/shortest-path' && method === 'GET') {
      const sourceId = url.searchParams.get('sourceId') || '';
      const targetId = url.searchParams.get('targetId') || '';
      const sp = computeShortestPath(bundle.graph, sourceId, targetId);
      return jsonResp(sp);
    }
    if (path === '/api/v1/timeline' && method === 'GET') {
      return jsonResp(bundle.timeline);
    }
    if (path === '/api/v1/timeline' && method === 'POST') {
      const newEvt = {
        id: `evt-${Date.now().toString(16).slice(-6)}`,
        caseId,
        timestamp: new Date().toISOString(),
        killChainPhase: bodyJson.killChainPhase || 'CASH_OUT_EXIT',
        title: bodyJson.title || 'Investigator Milestone',
        description: bodyJson.description || '',
        sourceEvidenceId: 'MANUAL_ENTRY',
        sourceEvidenceCode: 'ANALYST',
        involvedEntityIds: [],
        timestampDiscrepancyFlag: false,
        discrepancyReason: 'Verified manual investigator entry',
        severity: bodyJson.severity || 'HIGH',
      };
      bundle.timeline.events.push(newEvt);
      return jsonResp({ event: newEvt }, 201);
    }
    if (path === '/api/v1/integrity/ledger' && method === 'GET') {
      return jsonResp(bundle.ledger);
    }
    if (path === '/api/v1/integrity/verify' && method === 'POST') {
      const evId = bodyJson.evidenceId;
      const ev = bundle.evidence.evidence.find((e: any) => e.id === evId);
      const intact = !ev?.tamperedFlag;
      return jsonResp({
        verification: {
          evidenceId: evId,
          evidenceCode: ev?.evidenceCode || 'EVD-001',
          status: intact ? 'VERIFIED_INTACT' : 'TAMPER_DETECTED',
          intact,
        },
      });
    }
    if (path === '/api/v1/integrity/simulate-tamper' && method === 'POST') {
      const evId = bodyJson.evidenceId;
      const tamper =
        bodyJson.tamper === true || String(bodyJson.tamper) === 'true';
      const ev = bundle.evidence.evidence.find((e: any) => e.id === evId);
      if (ev) {
        ev.tamperedFlag = tamper;
        ev.integrityStatus = tamper ? 'TAMPER_DETECTED' : 'VERIFIED_INTACT';
      }
      return jsonResp({
        verification: {
          evidenceId: evId,
          evidenceCode: ev?.evidenceCode || 'EVD-001',
          status: tamper ? 'TAMPER_DETECTED' : 'VERIFIED_INTACT',
          intact: !tamper,
          expectedSha256: ev?.sha256Hash || '',
          computedSha256: tamper
            ? 'f9bad00019c48a109e22411892ff01a8c0019283746554112233445566778899'
            : ev?.sha256Hash || '',
          expectedBlake3: ev?.blake3Hash || '',
          computedBlake3: tamper
            ? 'e000tampered9981726354123891029384756102938475610293847561029384'
            : ev?.blake3Hash || '',
        },
      });
    }
    if (path === '/api/v1/integrity/verify-case' && method === 'POST') {
      return jsonResp({ status: 'CASE_VERIFIED' });
    }
    if (path === '/api/v1/reports' && method === 'GET') {
      return jsonResp(bundle.report);
    }
    if (path === '/api/v1/search' && method === 'GET') {
      const q = (url.searchParams.get('q') || '').toLowerCase();
      const entities = bundle.entities.entities.filter(
        (e: any) =>
          e.displayLabel.toLowerCase().includes(q) ||
          e.normalizedValue.toLowerCase().includes(q)
      );
      const evidence = bundle.evidence.evidence.filter(
        (ev: any) =>
          ev.title.toLowerCase().includes(q) ||
          ev.extractedText.toLowerCase().includes(q)
      );
      return jsonResp({ query: q, entities, evidence, timelineEvents: [] });
    }

    return jsonResp({ status: 'OK' });
  }

  function computeShortestPath(
    graph: any,
    sourceId: string,
    targetId: string
  ) {
    const edges = graph?.edges || [];
    const adj: Record<string, { to: string; edgeId: string; w: number }[]> = {};
    edges.forEach((e: any) => {
      adj[e.source] = adj[e.source] || [];
      adj[e.target] = adj[e.target] || [];
      adj[e.source].push({ to: e.target, edgeId: e.id, w: 2.95 });
      adj[e.target].push({ to: e.source, edgeId: e.id, w: 2.95 });
    });
    const q: { node: string; nodes: string[]; edges: string[]; w: number }[] = [
      { node: sourceId, nodes: [sourceId], edges: [], w: 0 },
    ];
    const visited = new Set<string>([sourceId]);
    while (q.length > 0) {
      const cur = q.shift()!;
      if (cur.node === targetId) {
        return {
          pathFound: true,
          sourceId,
          targetId,
          hopCount: cur.edges.length,
          nodeIds: cur.nodes,
          edgeIds: cur.edges,
          totalWeight: Number(cur.w.toFixed(2)),
        };
      }
      for (const nxt of adj[cur.node] || []) {
        if (!visited.has(nxt.to)) {
          visited.add(nxt.to);
          q.push({
            node: nxt.to,
            nodes: [...cur.nodes, nxt.to],
            edges: [...cur.edges, nxt.edgeId],
            w: cur.w + nxt.w,
          });
        }
      }
    }
    return {
      pathFound: false,
      sourceId,
      targetId,
      hopCount: 0,
      nodeIds: [],
      edgeIds: [],
      totalWeight: 0,
    };
  }

  function safeParseJson(str: string) {
    try {
      return JSON.parse(str);
    } catch {
      return {};
    }
  }

  window.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const urlStr =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;

    if (!urlStr.includes('/api/v1/')) {
      return nativeFetch(input, init);
    }

    if (standaloneModeActive) {
      return handleFallbackRequest(urlStr, init);
    }

    try {
      const res = await nativeFetch(input, init);
      const ct = res.headers.get('content-type') || '';
      if (
        res.status === 404 ||
        res.status === 405 ||
        res.status >= 502 ||
        (!ct.includes('application/json') &&
          !urlStr.includes('/raw') &&
          !urlStr.includes('/reports/'))
      ) {
        return handleFallbackRequest(urlStr, init);
      }
      return res;
    } catch {
      return handleFallbackRequest(urlStr, init);
    }
  };
}
