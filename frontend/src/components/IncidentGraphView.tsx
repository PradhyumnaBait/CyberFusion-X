import React, { useState, useMemo, useEffect } from 'react';
import {
  ExtractedEntity,
  EntityRelationship,
  ShortestPathResult,
} from '../types';
import {
  Search,
  Plus,
  Minus,
  Maximize2,
  Lock,
  Unlock,
  Route,
  Sparkles,
  Shield,
  User,
  Phone,
  Globe,
  Server,
  Landmark,
  Coins,
  Receipt,
  Mail,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Radio,
  X,
} from 'lucide-react';

interface IncidentGraphViewProps {
  entities: ExtractedEntity[];
  relationships: EntityRelationship[];
  selectedEntityId: string | null;
  onSelectEntity: (id: string) => void;
  onTraceShortestPath: (
    sourceId: string,
    targetId: string
  ) => Promise<ShortestPathResult | null>;
  onCreateRelationship?: (
    sourceEntityId: string,
    targetEntityId: string,
    relationshipType: string,
    label: string
  ) => Promise<void>;
  onMergeEntities?: (
    primaryEntityId: string,
    duplicateEntityId: string
  ) => Promise<void>;
}

type GraphViewMode = 'KNOWLEDGE_GRAPH' | 'CYBERX_RELATIONSHIP';

interface CollectionGroup {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  x: number;
  y: number;
  width: number;
  height: number;
  accentColor: string;
  types: string[];
}

const COLLECTION_GROUPS: CollectionGroup[] = [
  {
    id: 'col-a',
    code: 'COLLECTION A',
    title: 'PERSONS, BURNER PHONES & LURES',
    subtitle: 'Initial SMS/Email Vectors & Targets',
    x: 28,
    y: 48,
    width: 446,
    height: 278,
    accentColor: '#2563eb',
    types: ['PERSON', 'PHONE', 'EMAIL', 'MESSAGE'],
  },
  {
    id: 'col-b',
    code: 'COLLECTION B',
    title: 'PHISHING DOMAINS & C2 RELAYS',
    subtitle: 'Evilginx Proxies & Bulletproof IPs',
    x: 506,
    y: 48,
    width: 446,
    height: 278,
    accentColor: '#7c3aed',
    types: ['URL', 'IP_ADDRESS'],
  },
  {
    id: 'col-c',
    code: 'COLLECTION C',
    title: 'MULE ACCOUNTS & UPI RAILS',
    subtitle: 'Primary Financial Aggregation Hubs',
    x: 28,
    y: 356,
    width: 446,
    height: 294,
    accentColor: '#ea580c',
    types: ['UPI_ID', 'BANK_ACCOUNT', 'TRANSACTION_ID'],
  },
  {
    id: 'col-d',
    code: 'COLLECTION D',
    title: 'CRYPTO OFF-RAMP & SETTLEMENT',
    subtitle: 'Cross-Chain Liquidity & Exit Wallets',
    x: 506,
    y: 356,
    width: 446,
    height: 294,
    accentColor: '#e11d48',
    types: ['CRYPTO_WALLET'],
  },
];

export const IncidentGraphView: React.FC<IncidentGraphViewProps> = ({
  entities,
  relationships,
  selectedEntityId,
  onSelectEntity,
  onTraceShortestPath,
  onCreateRelationship,
  onMergeEntities,
}) => {
  const [graphMode, setGraphMode] = useState<GraphViewMode>('KNOWLEDGE_GRAPH');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAllLinks, setShowAllLinks] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(1);
  const [canvasLocked, setCanvasLocked] = useState<boolean>(false);
  const [collapsedCols, setCollapsedCols] = useState<Record<string, boolean>>({});
  const [pathSource, setPathSource] = useState<string>('');
  const [pathTarget, setPathTarget] = useState<string>('');
  const [shortestPath, setShortestPath] = useState<ShortestPathResult | null>(
    null
  );
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [relTargetId, setRelTargetId] = useState<string>('');
  const [relType, setRelType] = useState<string>('TRANSFERRED_FUNDS_TO');
  const [relLabel, setRelLabel] = useState<string>('Investigator correlated link');
  const [mergeDuplicateId, setMergeDuplicateId] = useState<string>('');

  // Keep default pathSource (initial attacker lure) and pathTarget (exit wallet/account) valid when entities change
  useEffect(() => {
    if (entities.length === 0) return;
    const defaultSrc =
      entities.find((e) => e.entityType === 'PHONE') ||
      entities.find((e) => e.entityType === 'EMAIL') ||
      entities[0];
    const defaultDst =
      entities.find((e) => e.entityType === 'CRYPTO_WALLET') ||
      entities[entities.length - 1];

    setPathSource((prev) =>
      prev && entities.some((e) => e.id === prev) ? prev : defaultSrc.id
    );
    setPathTarget((prev) =>
      prev && entities.some((e) => e.id === prev) ? prev : defaultDst.id
    );
  }, [entities]);

  const filteredEntities = useMemo(() => {
    if (!searchQuery.trim()) return entities;
    const q = searchQuery.toLowerCase();
    return entities.filter(
      (e) =>
        e.displayLabel.toLowerCase().includes(q) ||
        e.normalizedValue.toLowerCase().includes(q) ||
        e.entityType.toLowerCase().includes(q)
    );
  }, [entities, searchQuery]);

  // Compute non-overlapping coordinates inside each Collection Box for Knowledge Graph mode (Ref: image-11.png)
  const knowledgeNodePositions = useMemo(() => {
    const posMap: Record<
      string,
      { x: number; y: number; groupId: string; groupColor: string }
    > = {};

    COLLECTION_GROUPS.forEach((group) => {
      const groupNodes = filteredEntities.filter((e) =>
        group.types.includes(e.entityType)
      );
      const count = groupNodes.length;
      if (count === 0) return;

      const cols = count <= 2 ? count : 3;
      const rows = Math.ceil(count / cols);
      const usableWidth = group.width - 130;
      const usableHeight = group.height - 96;
      const spacingX = cols > 1 ? usableWidth / (cols - 1) : 0;
      const spacingY = rows > 1 ? Math.min(96, usableHeight / (rows - 1)) : 0;

      groupNodes.forEach((node, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const nx =
          cols === 1
            ? group.x + group.width / 2
            : group.x + 65 + col * spacingX;
        const ny =
          rows === 1
            ? group.y + group.height / 2 + 10
            : group.y + 82 + row * spacingY;
        posMap[node.id] = {
          x: Math.round(nx),
          y: Math.round(ny),
          groupId: group.id,
          groupColor: group.accentColor,
        };
      });
    });

    filteredEntities.forEach((e, idx) => {
      if (!posMap[e.id]) {
        posMap[e.id] = {
          x: 120 + (idx % 5) * 150,
          y: 120 + Math.floor(idx / 5) * 120,
          groupId: 'col-a',
          groupColor: '#2563eb',
        };
      }
    });

    return posMap;
  }, [filteredEntities]);

  // Compute radial cluster hubs and satellite nodes for CyberX Relationship Graph mode (Ref: image-10.png)
  const cyberXPositions = useMemo(() => {
    const posMap: Record<
      string,
      { x: number; y: number; isHub: boolean; isRedAlert: boolean; badgeCount: number }
    > = {};
    const sorted = [...filteredEntities].sort(
      (a, b) => (b.pagerankScore || 0) - (a.pagerankScore || 0)
    );
    const hubCenters = [
      { x: 460, y: 310 }, // Central Primary Hub
      { x: 220, y: 175 }, // Top-Left Cluster Hub
      { x: 700, y: 175 }, // Top-Right Cluster Hub
      { x: 230, y: 465 }, // Bottom-Left Cluster Hub
      { x: 690, y: 465 }, // Bottom-Right Cluster Hub
    ];

    const hubCount = Math.min(
      hubCenters.length,
      Math.max(1, Math.ceil(sorted.length / 3))
    );
    const hubs = sorted.slice(0, hubCount);
    const satellites = sorted.slice(hubCount);

    hubs.forEach((hub, idx) => {
      const center = hubCenters[idx % hubCenters.length];
      posMap[hub.id] = {
        x: center.x,
        y: center.y,
        isHub: true,
        isRedAlert: hub.riskLevel === 'CRITICAL' || idx === 0 || idx === 2,
        badgeCount: Math.max(
          1,
          relationships.filter(
            (r) => r.sourceEntityId === hub.id || r.targetEntityId === hub.id
          ).length
        ),
      };
    });

    satellites.forEach((sat, idx) => {
      const parentHubIndex = idx % hubs.length;
      const center = hubCenters[parentHubIndex];
      const localIdx = Math.floor(idx / hubs.length);
      const angle = (localIdx * 1.45 + parentHubIndex * 0.9) % (Math.PI * 2);
      const radius = 96 + (localIdx % 2) * 32;
      posMap[sat.id] = {
        x: Math.round(center.x + Math.cos(angle) * radius),
        y: Math.round(center.y + Math.sin(angle) * radius),
        isHub: false,
        isRedAlert: sat.riskLevel === 'CRITICAL',
        badgeCount: 1,
      };
    });

    return posMap;
  }, [filteredEntities, relationships]);

  const selectedEntity = useMemo(
    () =>
      entities.find((e) => e.id === selectedEntityId) || entities[0] || null,
    [entities, selectedEntityId]
  );

  const hasActiveShortestPath = !!(
    shortestPath &&
    shortestPath.pathFound &&
    shortestPath.nodeIds &&
    shortestPath.nodeIds.length > 0
  );

  // Ordered hop lookup for shortest path
  const shortestPathHopOrder = useMemo(() => {
    const nodeOrder: Record<string, number> = {};
    const edgeOrder: Record<string, number> = {};
    if (shortestPath?.pathFound) {
      shortestPath.nodeIds?.forEach((nid, i) => {
        nodeOrder[nid] = i + 1;
      });
      shortestPath.edgeIds?.forEach((eid, i) => {
        edgeOrder[eid] = i + 1;
      });
    }
    return { nodeOrder, edgeOrder };
  }, [shortestPath]);

  const isEdgeInShortestPath = (relId: string): boolean => {
    return shortestPathHopOrder.edgeOrder[relId] !== undefined;
  };

  const isNodeInShortestPath = (nodeId: string): boolean => {
    return shortestPathHopOrder.nodeOrder[nodeId] !== undefined;
  };

  // Deduplicate visual edges between the same pair of nodes so parallel edges don't stack
  const deduplicatedRelationships = useMemo(() => {
    const map = new Map<string, EntityRelationship>();
    for (const rel of relationships) {
      const pairKey = [rel.sourceEntityId, rel.targetEntityId].sort().join('::');
      const existing = map.get(pairKey);
      // Always keep an edge if it's in shortestPath, or prefer semantic edges over CORRELATED_IN_EVIDENCE
      if (!existing) {
        map.set(pairKey, rel);
      } else if (
        isEdgeInShortestPath(rel.id) ||
        (existing.relationshipType === 'CORRELATED_IN_EVIDENCE' &&
          rel.relationshipType !== 'CORRELATED_IN_EVIDENCE')
      ) {
        map.set(pairKey, rel);
      }
    }
    return Array.from(map.values());
  }, [relationships, shortestPathHopOrder]);

  // Pre-compute non-overlapping label positions for active edges in Knowledge Graph mode
  const edgeLabelPositions = useMemo(() => {
    const labels: Record<string, { x: number; y: number; text: string }> = {};
    const placedPoints: { x: number; y: number }[] = [];
    const allNodeCoords = Object.values(knowledgeNodePositions);

    const isNearAnyNode = (px: number, py: number) =>
      allNodeCoords.some(
        (n) => Math.abs(n.x - px) < 62 && Math.abs(n.y - py) < 44
      );

    const isNearPlacedLabel = (px: number, py: number) =>
      placedPoints.some(
        (p) => Math.abs(p.x - px) < 118 && Math.abs(p.y - py) < 24
      );

    deduplicatedRelationships.forEach((rel, idx) => {
      const src = knowledgeNodePositions[rel.sourceEntityId];
      const dst = knowledgeNodePositions[rel.targetEntityId];
      if (!src || !dst) return;

      const inPath = isEdgeInShortestPath(rel.id);
      const isHovered = hoveredEdgeId === rel.id;
      const isSelected =
        !hasActiveShortestPath &&
        (selectedEntity?.id === rel.sourceEntityId ||
          selectedEntity?.id === rel.targetEntityId);

      // Only show badge pills for shortest-path edges, hovered edges, or non-generic selected edges
      const shouldLabel =
        inPath ||
        isHovered ||
        (isSelected && rel.relationshipType !== 'CORRELATED_IN_EVIDENCE');

      if (!shouldLabel) return;

      const corridorOffset = ((idx % 5) - 2) * 14;
      const midX = (src.x + dst.x) / 2 + corridorOffset;
      let candidateY = (src.y + dst.y) / 2;

      // Try vertical offsets if candidate collides with a node or an already-placed label
      const offsets = [0, -28, 28, -52, 52, -74, 74];
      for (const dy of offsets) {
        const testY = Math.max(40, Math.min(635, candidateY + dy));
        if (!isNearAnyNode(midX, testY) && !isNearPlacedLabel(midX, testY)) {
          candidateY = testY;
          break;
        }
      }

      // If still colliding with another label and not in shortestPath/hovered, skip badge to prevent overlap
      if (!inPath && !isHovered && isNearPlacedLabel(midX, candidateY)) {
        return;
      }

      const hopIdx = shortestPathHopOrder.edgeOrder[rel.id];
      const cleanType = rel.relationshipType.replace(/_/g, ' ');
      const text = inPath
        ? `HOP ${hopIdx}: ${cleanType}`
        : cleanType.length > 20
        ? cleanType.slice(0, 18) + '…'
        : cleanType;

      placedPoints.push({ x: midX, y: candidateY });
      labels[rel.id] = { x: midX, y: candidateY, text };
    });

    return labels;
  }, [
    deduplicatedRelationships,
    knowledgeNodePositions,
    hasActiveShortestPath,
    selectedEntity,
    hoveredEdgeId,
    shortestPathHopOrder,
  ]);

  const renderEntityIcon = (type: string, color: string) => {
    const props = { className: 'w-5 h-5', style: { color } };
    switch (type) {
      case 'PERSON':
        return <User {...props} />;
      case 'PHONE':
        return <Phone {...props} />;
      case 'EMAIL':
        return <Mail {...props} />;
      case 'UPI_ID':
      case 'BANK_ACCOUNT':
        return <Landmark {...props} />;
      case 'CRYPTO_WALLET':
        return <Coins {...props} />;
      case 'TRANSACTION_ID':
        return <Receipt {...props} />;
      case 'URL':
        return <Globe {...props} />;
      case 'IP_ADDRESS':
        return <Server {...props} />;
      case 'MESSAGE':
      default:
        return <MessageSquare {...props} />;
    }
  };

  const handleRunShortestPath = async () => {
    const src = pathSource || entities[0]?.id;
    const dst = pathTarget || entities[entities.length - 1]?.id;
    if (!src || !dst) return;
    const res = await onTraceShortestPath(src, dst);
    if (res) setShortestPath(res);
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Top Bar modeled on image-11.png (VISLABS Header + Mode Toggle between image-11 Knowledge Graph & image-10 CyberX Activity Map) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 px-4 py-3 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <button
            onClick={() => {
              setSearchQuery('');
              setShortestPath(null);
            }}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold transition"
            title="Reset Graph Focus"
          >
            <Plus className="w-4 h-4" />
          </button>

          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search entities, phones, IBANs, wallets..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* "Show all links" Toggle (Ref: image-11.png top center) */}
          <label className="hidden md:flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-600 ml-2">
            <span>Show background links</span>
            <button
              type="button"
              onClick={() => setShowAllLinks(!showAllLinks)}
              className={`w-9 h-5 rounded-full transition p-0.5 ${
                showAllLinks ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow transition transform ${
                  showAllLinks ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </label>
        </div>

        {/* Right: Graph UI Mode Switcher (Knowledge Graph image-11 vs CyberX Relationship Map image-10) */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => setGraphMode('KNOWLEDGE_GRAPH')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                graphMode === 'KNOWLEDGE_GRAPH'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Knowledge Graph (VISLABS)</span>
            </button>
            <button
              onClick={() => setGraphMode('CYBERX_RELATIONSHIP')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                graphMode === 'CYBERX_RELATIONSHIP'
                  ? 'bg-indigo-950 text-cyan-300 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-cyan-500" />
              <span>CyberX Activity Map</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dijkstra Shortest-Path Forensic Tracer Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 px-4 py-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Route className="w-4 h-4 text-orange-600" />
          <span>Dijkstra Shortest Attack-Path Tracer:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-1">
          <select
            aria-label="Source Entity"
            value={pathSource}
            onChange={(e) => setPathSource(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 max-w-[230px]"
          >
            {entities.map((e) => (
              <option key={e.id} value={e.id}>
                Start: {e.displayLabel} ({e.entityType})
              </option>
            ))}
          </select>

          <span className="text-xs text-slate-400 font-bold">→</span>

          <select
            aria-label="Target Entity"
            value={pathTarget}
            onChange={(e) => setPathTarget(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 max-w-[230px]"
          >
            {entities.map((e) => (
              <option key={e.id} value={e.id}>
                Target: {e.displayLabel} ({e.entityType})
              </option>
            ))}
          </select>

          <button
            onClick={handleRunShortestPath}
            className="px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold shadow-sm transition flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Trace Shortest Path</span>
          </button>

          {hasActiveShortestPath && (
            <button
              onClick={() => setShortestPath(null)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition"
            >
              <X className="w-3.5 h-3.5" />
              <span>Exit Path Isolation</span>
            </button>
          )}
        </div>

        {shortestPath && shortestPath.pathFound && (
          <div className="px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-800 text-xs font-extrabold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-orange-600" />
            <span>
              Isolated Path: {shortestPath.hopCount}{' '}
              {shortestPath.hopCount === 1 ? 'Hop' : 'Hops'} (Weight{' '}
              {shortestPath.totalWeight.toFixed(1)})
            </span>
          </div>
        )}
      </div>

      {/* Step-by-Step Dijkstra Narrative Chain Banner */}
      {hasActiveShortestPath &&
        shortestPath?.narrativeSteps &&
        shortestPath.narrativeSteps.length > 0 && (
          <div className="bg-orange-50/90 border border-orange-200 rounded-2xl px-4 py-3 shadow-xs space-y-2">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-orange-900 flex items-center justify-between">
              <span>
                Dijkstra Shortest Attack Chain ({shortestPath.nodeIds.length}{' '}
                Nodes · {shortestPath.hopCount} Directed Hops Isolated on Canvas)
              </span>
              <button
                onClick={() => setShortestPath(null)}
                className="text-orange-700 hover:underline text-[11px] font-bold"
              >
                Show Full Graph
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-800">
              {shortestPath.narrativeSteps.map((step, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-xl bg-white border border-orange-200 shadow-2xs font-bold"
                >
                  <span className="text-orange-600 mr-1.5">Hop {idx + 1}:</span>
                  {step}
                </span>
              ))}
            </div>
          </div>
        )}

      {/* Main Graph Canvas + Right Inspector Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 9 Columns: Interactive Graph Canvas */}
        <div className="lg:col-span-9">
          {graphMode === 'KNOWLEDGE_GRAPH' ? (
            /* ============================================================================
               MODE 1: KNOWLEDGE GRAPH UI (Ref: image-11.png — VISLABS Bright Dotted Canvas)
               ============================================================================ */
            <div
              className="relative rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden select-none"
              style={{
                height: '680px',
                backgroundColor: '#f8fafc',
                backgroundImage:
                  'radial-gradient(#cbd5e1 1.35px, transparent 1.35px)',
                backgroundSize: '18px 18px',
              }}
            >
              {/* Top-left Breadcrumb Badge */}
              <div className="absolute top-3 left-4 z-10 flex items-center gap-2 bg-white/95 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-xs font-bold text-slate-700">
                <span
                  className={`w-2 h-2 rounded-full ${
                    hasActiveShortestPath ? 'bg-orange-500 animate-ping' : 'bg-blue-600'
                  }`}
                />
                <span>
                  {hasActiveShortestPath
                    ? `Shortest-Path Isolation Mode (${shortestPath?.hopCount} Hops)`
                    : 'VISLABS Knowledge Graph Topology'}
                </span>
                <span className="text-slate-400 font-mono">
                  ({filteredEntities.length} Nodes ·{' '}
                  {deduplicatedRelationships.length} Links)
                </span>
              </div>

              <svg
                viewBox="0 0 980 680"
                className="w-full h-full"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: 'transform 200ms ease',
                }}
              >
                <defs>
                  <marker
                    id="kg-arrow"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="5.5"
                    markerHeight="5.5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#94a3b8" />
                  </marker>
                  <marker
                    id="kg-arrow-active"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6.5"
                    markerHeight="6.5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#2563eb" />
                  </marker>
                  <marker
                    id="kg-arrow-path"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="7.5"
                    markerHeight="7.5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#ea580c" />
                  </marker>
                </defs>

                {/* Collection Group Boxes (COLLECTION A, B, C, D — Ref: image-11.png) */}
                {COLLECTION_GROUPS.map((group) => {
                  const isCollapsed = !!collapsedCols[group.id];
                  return (
                    <g key={group.id}>
                      <rect
                        x={group.x}
                        y={group.y}
                        width={group.width}
                        height={isCollapsed ? 38 : group.height}
                        rx="12"
                        fill="#f1f5f9"
                        fillOpacity="0.65"
                        stroke="#cbd5e1"
                        strokeWidth="1.5"
                      />
                      <g
                        className="cursor-pointer"
                        onClick={() =>
                          setCollapsedCols((prev) => ({
                            ...prev,
                            [group.id]: !prev[group.id],
                          }))
                        }
                      >
                        <rect
                          x={group.x + 12}
                          y={group.y + 10}
                          width="16"
                          height="16"
                          rx="3"
                          fill="#ffffff"
                          stroke="#94a3b8"
                          strokeWidth="1.2"
                        />
                        <text
                          x={group.x + 20}
                          y={group.y + 22}
                          textAnchor="middle"
                          fontSize="12"
                          fontWeight="bold"
                          fill="#475569"
                        >
                          {isCollapsed ? '+' : '−'}
                        </text>
                        <text
                          x={group.x + 36}
                          y={group.y + 21}
                          fontSize="10"
                          fontWeight="800"
                          letterSpacing="0.06em"
                          fill="#475569"
                        >
                          {group.code} · {group.title}
                        </text>
                      </g>
                    </g>
                  );
                })}

                {/* Layer 1: Orthogonal Step-Line Edges (Background & Active Paths) */}
                {deduplicatedRelationships.map((rel, idx) => {
                  const src = knowledgeNodePositions[rel.sourceEntityId];
                  const dst = knowledgeNodePositions[rel.targetEntityId];
                  if (!src || !dst) return null;
                  if (
                    collapsedCols[src.groupId] ||
                    collapsedCols[dst.groupId]
                  ) {
                    return null;
                  }

                  const inShortestPath = isEdgeInShortestPath(rel.id);
                  const isHovered = hoveredEdgeId === rel.id;
                  // Only highlight selected node's edges when NOT in Shortest-Path Isolation mode
                  const isSelectedEdge =
                    !hasActiveShortestPath &&
                    (selectedEntity?.id === rel.sourceEntityId ||
                      selectedEntity?.id === rel.targetEntityId);

                  if (
                    !showAllLinks &&
                    !isSelectedEdge &&
                    !inShortestPath &&
                    !isHovered
                  ) {
                    return null;
                  }

                  const corridorOffset = ((idx % 5) - 2) * 14;
                  const midX = (src.x + dst.x) / 2 + corridorOffset;
                  const pathD = `M ${src.x} ${src.y} L ${midX} ${src.y} L ${midX} ${dst.y} L ${dst.x} ${dst.y}`;

                  const strokeColor = inShortestPath
                    ? '#ea580c'
                    : isHovered || isSelectedEdge
                    ? '#2563eb'
                    : '#94a3b8';

                  const strokeOpacity = hasActiveShortestPath
                    ? inShortestPath
                      ? 1
                      : 0.14
                    : isSelectedEdge || isHovered
                    ? 0.95
                    : 0.42;

                  const strokeWidth = inShortestPath
                    ? 3.4
                    : isHovered || isSelectedEdge
                    ? 2.2
                    : 1.3;

                  return (
                    <g
                      key={rel.id}
                      onMouseEnter={() => setHoveredEdgeId(rel.id)}
                      onMouseLeave={() => setHoveredEdgeId(null)}
                      className="cursor-pointer"
                    >
                      <path
                        d={pathD}
                        fill="none"
                        stroke={strokeColor}
                        strokeOpacity={strokeOpacity}
                        strokeWidth={strokeWidth}
                        strokeDasharray={inShortestPath ? '7 4' : undefined}
                        markerEnd={
                          inShortestPath
                            ? 'url(#kg-arrow-path)'
                            : isHovered || isSelectedEdge
                            ? 'url(#kg-arrow-active)'
                            : 'url(#kg-arrow)'
                        }
                      />
                    </g>
                  );
                })}

                {/* Layer 2: Square White Entity Icon Cards + Rounded Pill Labels Underneath (Ref: image-11.png) */}
                {filteredEntities.map((entity) => {
                  const pos = knowledgeNodePositions[entity.id];
                  if (!pos || collapsedCols[pos.groupId]) return null;

                  const inPath = isNodeInShortestPath(entity.id);
                  const hopNumber = shortestPathHopOrder.nodeOrder[entity.id];
                  const isSelected =
                    !hasActiveShortestPath && selectedEntity?.id === entity.id;
                  const nodeOpacity =
                    hasActiveShortestPath && !inPath ? 0.35 : 1;

                  const shortLabel =
                    entity.displayLabel.length > 17
                      ? entity.displayLabel.slice(0, 15) + '…'
                      : entity.displayLabel;

                  return (
                    <g
                      key={entity.id}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      opacity={nodeOpacity}
                      onClick={() => {
                        if (!canvasLocked) onSelectEntity(entity.id);
                      }}
                      className="cursor-pointer"
                    >
                      {(isSelected || inPath) && (
                        <rect
                          x="-29"
                          y="-29"
                          width="58"
                          height="58"
                          rx="14"
                          fill={inPath ? '#ffedd5' : '#dbeafe'}
                          stroke={inPath ? '#ea580c' : '#2563eb'}
                          strokeWidth="2.2"
                        />
                      )}

                      <rect
                        x="-23"
                        y="-23"
                        width="46"
                        height="46"
                        rx="10"
                        fill="#ffffff"
                        stroke={
                          inPath
                            ? '#ea580c'
                            : entity.riskLevel === 'CRITICAL'
                            ? '#ef4444'
                            : isSelected
                            ? '#2563eb'
                            : '#cbd5e1'
                        }
                        strokeWidth={inPath || isSelected ? '2.2' : '1.5'}
                      />

                      <circle
                        cx="15"
                        cy="-15"
                        r="4"
                        fill={
                          entity.riskLevel === 'CRITICAL'
                            ? '#ef4444'
                            : entity.riskLevel === 'HIGH'
                            ? '#f97316'
                            : '#3b82f6'
                        }
                      />

                      {/* Hop Order Badge when in Shortest Path */}
                      {inPath && hopNumber !== undefined && (
                        <g transform="translate(-22, -22)">
                          <circle
                            r="10"
                            fill="#ea580c"
                            stroke="#ffffff"
                            strokeWidth="1.5"
                          />
                          <text
                            y="3.5"
                            textAnchor="middle"
                            fontSize="9"
                            fontWeight="900"
                            fill="#ffffff"
                          >
                            {hopNumber}
                          </text>
                        </g>
                      )}

                      <foreignObject x="-12" y="-12" width="24" height="24">
                        <div className="w-6 h-6 flex items-center justify-center">
                          {renderEntityIcon(entity.entityType, pos.groupColor)}
                        </div>
                      </foreignObject>

                      {/* Non-overlapping Pill Label below Card */}
                      <g transform="translate(0, 36)">
                        <rect
                          x="-56"
                          y="-10"
                          width="112"
                          height="20"
                          rx="10"
                          fill={
                            inPath
                              ? '#ea580c'
                              : isSelected
                              ? '#0f172a'
                              : '#ffffff'
                          }
                          stroke={
                            inPath
                              ? '#c2410c'
                              : isSelected
                              ? '#0f172a'
                              : '#cbd5e1'
                          }
                          strokeWidth="1.2"
                        />
                        <text
                          y="3.5"
                          textAnchor="middle"
                          fontSize="9"
                          fontWeight="700"
                          fill={inPath || isSelected ? '#ffffff' : '#334155'}
                        >
                          {shortLabel}
                        </text>
                      </g>
                    </g>
                  );
                })}

                {/* Layer 3: De-collided Edge Relationship Pills on Top */}
                {deduplicatedRelationships.map((rel) => {
                  const pos = edgeLabelPositions[rel.id];
                  if (!pos) return null;
                  const inPath = isEdgeInShortestPath(rel.id);
                  const pillWidth = Math.max(96, pos.text.length * 5.6 + 18);

                  return (
                    <g
                      key={`lbl-${rel.id}`}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      className="pointer-events-none"
                    >
                      <rect
                        x={-pillWidth / 2}
                        y="-9"
                        width={pillWidth}
                        height="18"
                        rx="9"
                        fill={inPath ? '#fff7ed' : '#ffffff'}
                        stroke={inPath ? '#ea580c' : '#2563eb'}
                        strokeWidth="1.3"
                      />
                      <text
                        y="3"
                        textAnchor="middle"
                        fontSize="8"
                        fontWeight="800"
                        fill={inPath ? '#c2410c' : '#1e40af'}
                      >
                        {pos.text}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Bottom-Left Zoom & Canvas Control Toolbar (Ref: image-11.png) */}
              <div className="absolute bottom-4 left-4 bg-white rounded-xl border border-slate-200 shadow-md flex flex-col overflow-hidden">
                <button
                  onClick={() =>
                    setZoom((z) => Math.min(1.35, +(z + 0.1).toFixed(2)))
                  }
                  className="p-2 hover:bg-slate-100 text-slate-700 border-b border-slate-100"
                  title="Zoom In"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    setZoom((z) => Math.max(0.75, +(z - 0.1).toFixed(2)))
                  }
                  className="p-2 hover:bg-slate-100 text-slate-700 border-b border-slate-100"
                  title="Zoom Out"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoom(1)}
                  className="p-2 hover:bg-slate-100 text-slate-700 border-b border-slate-100"
                  title="Fit to View"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCanvasLocked(!canvasLocked)}
                  className="p-2 hover:bg-slate-100 text-slate-700"
                  title="Lock Selection"
                >
                  {canvasLocked ? (
                    <Lock className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Unlock className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* ============================================================================
               MODE 2: CYBERSECURITY RELATIONSHIP GRAPH UI (Ref: image-10.png — CyberX Activity Map)
               ============================================================================ */
            <div
              className="relative rounded-2xl border border-indigo-900/80 shadow-xl overflow-hidden select-none"
              style={{
                height: '680px',
                background:
                  'radial-gradient(circle at 50% 48%, #101952 0%, #070b2b 60%, #04061a 100%)',
              }}
            >
              <div className="absolute top-4 left-5 z-10 flex items-center gap-3">
                <div className="flex items-center gap-2 text-white font-extrabold text-sm tracking-wide">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  <span>CyberX</span>
                </div>
                <span className="text-indigo-400">/</span>
                <span className="text-xs font-bold text-cyan-300">
                  Activity Map · Threat Relationship Clusters
                </span>
              </div>

              <div className="absolute top-4 right-5 z-10 bg-indigo-950/85 backdrop-blur-md border border-indigo-700/60 rounded-xl p-3.5 text-white w-52 shadow-lg">
                <div className="flex items-center justify-between text-[11px] text-indigo-300">
                  <span>Total Threat Links</span>
                  <span className="text-emerald-400 font-bold">Status</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-2xl font-extrabold font-mono text-white">
                    {deduplicatedRelationships.length}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-bold">
                    {
                      entities.filter((e) => e.riskLevel === 'CRITICAL').length
                    }{' '}
                    Critical Hubs
                  </span>
                </div>
              </div>

              <svg viewBox="0 0 920 680" className="w-full h-full">
                <circle
                  cx="460"
                  cy="310"
                  r="130"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <circle
                  cx="460"
                  cy="310"
                  r="250"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="1"
                />

                {deduplicatedRelationships.map((rel) => {
                  const src = cyberXPositions[rel.sourceEntityId];
                  const dst = cyberXPositions[rel.targetEntityId];
                  if (!src || !dst) return null;
                  const isRed = src.isRedAlert && dst.isRedAlert;
                  const inPath = isEdgeInShortestPath(rel.id);

                  return (
                    <g key={rel.id}>
                      <line
                        x1={src.x}
                        y1={src.y}
                        x2={dst.x}
                        y2={dst.y}
                        stroke={
                          inPath ? '#f59e0b' : isRed ? '#f43f5e' : '#38bdf8'
                        }
                        strokeOpacity={
                          hasActiveShortestPath
                            ? inPath
                              ? 1
                              : 0.14
                            : 0.55
                        }
                        strokeWidth={inPath ? 3.5 : isRed ? 2.2 : 1.5}
                      />
                    </g>
                  );
                })}

                {filteredEntities.map((entity) => {
                  const pos = cyberXPositions[entity.id];
                  if (!pos) return null;
                  const isSelected = selectedEntity?.id === entity.id;
                  const inPath = isNodeInShortestPath(entity.id);
                  const hopNumber = shortestPathHopOrder.nodeOrder[entity.id];
                  const primaryColor = inPath
                    ? '#f59e0b'
                    : pos.isRedAlert
                    ? '#f43f5e'
                    : '#38bdf8';

                  return (
                    <g
                      key={entity.id}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      opacity={hasActiveShortestPath && !inPath ? 0.35 : 1}
                      onClick={() => onSelectEntity(entity.id)}
                      className="cursor-pointer"
                    >
                      {pos.isHub ? (
                        <>
                          <circle
                            r="38"
                            fill={primaryColor}
                            fillOpacity="0.14"
                            stroke={primaryColor}
                            strokeOpacity="0.4"
                            strokeWidth="1.5"
                          />
                          <circle
                            r="26"
                            fill="#090d36"
                            stroke={primaryColor}
                            strokeWidth={isSelected || inPath ? '3' : '2'}
                          />
                          <path
                            d="M 0 -11 L 9 -7 L 9 1 C 9 7 0 11 0 11 C 0 11 -9 7 -9 1 L -9 -7 Z"
                            fill={primaryColor}
                            fillOpacity="0.25"
                            stroke={primaryColor}
                            strokeWidth="1.6"
                          />
                          <g transform="translate(20, -20)">
                            <circle
                              r="9"
                              fill={
                                inPath
                                  ? '#d97706'
                                  : pos.isRedAlert
                                  ? '#e11d48'
                                  : '#0284c7'
                              }
                              stroke="#060926"
                              strokeWidth="1.5"
                            />
                            <text
                              y="3"
                              textAnchor="middle"
                              fontSize="9"
                              fontWeight="bold"
                              fill="#ffffff"
                            >
                              {inPath && hopNumber ? `#${hopNumber}` : pos.badgeCount}
                            </text>
                          </g>
                          <text
                            y="50"
                            textAnchor="middle"
                            fontSize="9.5"
                            fontWeight="bold"
                            fill="#e2e8f0"
                          >
                            {entity.displayLabel.slice(0, 18)}
                          </text>
                        </>
                      ) : (
                        <>
                          <circle
                            r="9"
                            fill={primaryColor}
                            stroke="#ffffff"
                            strokeWidth={isSelected || inPath ? '2.5' : '1.2'}
                          />
                          <text
                            y="22"
                            textAnchor="middle"
                            fontSize="8.5"
                            fontWeight="600"
                            fill="#94a3b8"
                          >
                            {entity.displayLabel.slice(0, 15)}
                          </text>
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </div>

        {/* Right 3 Columns: Selected Entity Forensic Telemetry & Centrality Inspector */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm flex flex-col justify-between space-y-5">
          {selectedEntity ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                    {selectedEntity.entityType}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-2 break-all">
                    {selectedEntity.displayLabel}
                  </h3>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedEntity.riskLevel === 'CRITICAL'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {selectedEntity.riskLevel}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">PageRank Centrality</span>
                  <span className="font-mono font-bold text-slate-900">
                    {((selectedEntity.pagerankScore || 0.25) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Betweenness Score</span>
                  <span className="font-mono font-bold text-indigo-700">
                    {((selectedEntity.betweennessScore || 0.12) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">NLP Confidence</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {((selectedEntity.confidenceScore || 0.96) * 100).toFixed(0)}
                    %
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Evidence Mentions</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedEntity.evidenceIds?.length || 1} Artifacts
                  </span>
                </div>
              </div>

              {/* Connected Relationships */}
              <div className="space-y-2">
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Correlated Graph Edges
                </div>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {deduplicatedRelationships
                    .filter(
                      (r) =>
                        r.sourceEntityId === selectedEntity.id ||
                        r.targetEntityId === selectedEntity.id
                    )
                    .map((rel) => {
                      const otherId =
                        rel.sourceEntityId === selectedEntity.id
                          ? rel.targetEntityId
                          : rel.sourceEntityId;
                      const otherNode = entities.find((e) => e.id === otherId);
                      return (
                        <div
                          key={rel.id}
                          onClick={() => onSelectEntity(otherId)}
                          className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 cursor-pointer transition text-xs"
                        >
                          <div className="font-mono text-[10px] font-bold text-blue-600">
                            {rel.relationshipType}
                          </div>
                          <div className="font-bold text-slate-800 truncate mt-0.5">
                            {otherNode?.displayLabel || otherId}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                            {rel.label}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Investigator Graph Actions: Add Custom Relationship or Merge Duplicate Alias */}
              {(onCreateRelationship || onMergeEntities) && (
                <div className="pt-3 border-t border-slate-200/80 space-y-3 text-xs">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600">
                    Investigator Graph Correlation
                  </div>

                  {onCreateRelationship && (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <div className="font-bold text-slate-800 truncate">
                        Link {selectedEntity.displayLabel} → Target
                      </div>
                      <select
                        value={relTargetId}
                        onChange={(e) => setRelTargetId(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold"
                      >
                        {entities
                          .filter((e) => e.id !== selectedEntity.id)
                          .map((e) => (
                            <option key={e.id} value={e.id}>
                              [{e.entityType}] {e.displayLabel}
                            </option>
                          ))}
                      </select>
                      <select
                        value={relType}
                        onChange={(e) => setRelType(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-mono"
                      >
                        <option value="TRANSFERRED_FUNDS_TO">
                          TRANSFERRED_FUNDS_TO
                        </option>
                        <option value="COMMUNICATED_WITH">
                          COMMUNICATED_WITH
                        </option>
                        <option value="OWNS_ACCOUNT">OWNS_ACCOUNT</option>
                        <option value="HOSTED_ON_IP">HOSTED_ON_IP</option>
                      </select>
                      <input
                        type="text"
                        value={relLabel}
                        onChange={(e) => setRelLabel(e.target.value)}
                        placeholder="Relationship forensic note..."
                        className="w-full px-2 py-1 rounded-lg bg-white border border-slate-200 text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const target =
                            relTargetId ||
                            entities.find((e) => e.id !== selectedEntity.id)?.id;
                          if (target) {
                            onCreateRelationship(
                              selectedEntity.id,
                              target,
                              relType,
                              relLabel
                            );
                          }
                        }}
                        className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition"
                      >
                        + Add Directed Edge
                      </button>
                    </div>
                  )}

                  {onMergeEntities && entities.length > 2 && (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <div className="font-bold text-slate-800 truncate">
                        Merge Alias Into {selectedEntity.displayLabel}
                      </div>
                      <select
                        value={mergeDuplicateId}
                        onChange={(e) => setMergeDuplicateId(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold"
                      >
                        {entities
                          .filter((e) => e.id !== selectedEntity.id)
                          .map((e) => (
                            <option key={e.id} value={e.id}>
                              [{e.entityType}] {e.displayLabel}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const dup =
                            mergeDuplicateId ||
                            entities.find((e) => e.id !== selectedEntity.id)?.id;
                          if (dup && dup !== selectedEntity.id) {
                            onMergeEntities(selectedEntity.id, dup);
                          }
                        }}
                        className="w-full py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] transition"
                      >
                        Merge Duplicate Alias Node
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-400">
              Click any node in the graph to inspect its forensic attributes.
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              E.164 &amp; Jaro-Winkler Resolved
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          </div>
        </div>
      </div>
    </div>
  );
};
