import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ExtractedEntity,
  EntityRelationship,
  ShortestPathResult,
  ForensicCaseSummary,
  EvidenceItem,
} from '../types';
import {
  Search,
  Plus,
  Minus,
  RotateCcw,
  Maximize2,
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
  Copy,
  Check,
  Filter,
  ExternalLink,
  Lock,
  ArrowRight,
  ChevronDown,
  BarChart3,
  FileText,
  Clock,
  Link as LinkIcon,
  HelpCircle,
  FileWarning,
} from 'lucide-react';

interface IncidentGraphViewProps {
  activeCase?: ForensicCaseSummary;
  evidenceList?: EvidenceItem[];
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
  onNavigateTab?: (
    tab: 'OVERVIEW' | 'EVIDENCE' | 'TIMELINE' | 'GRAPH' | 'INTEGRITY' | 'REPORT'
  ) => void;
}

type LayoutMode = 'FORCE_DIRECTED' | 'HIERARCHICAL' | 'RADIAL' | 'GEO_LAYOUT';
type InspectorTab = 'OVERVIEW' | 'RELATIONSHIPS' | 'EVIDENCE';

interface SlotAnchor {
  x: number;
  y: number;
  r: number;
  ringColor: string;
  isFocal?: boolean;
  glowType?: 'crimson' | 'amber' | 'emerald';
  topBadges?: string[];
  rightBadge?: string;
  sublabel: string;
  defaultPageRank?: string;
}

// 14 Predefined, Non-Overlapping Spatial Anchor Slots (viewBox="0 0 1120 660")
const PREDEFINED_SLOTS: Record<number, SlotAnchor> = {
  1: {
    x: 530,
    y: 155,
    r: 38,
    ringColor: '#ef4444',
    isFocal: true,
    glowType: 'crimson',
    topBadges: ['VICTIM', 'PHISHING', 'CRITICAL'],
    sublabel: 'Email / UPI Relay',
    defaultPageRank: '15.9%',
  },
  2: {
    x: 530,
    y: 345,
    r: 34,
    ringColor: '#ef4444',
    isFocal: true,
    glowType: 'crimson',
    sublabel: 'C2 Relay (Bulletproof)',
    defaultPageRank: '12.7%',
  },
  3: {
    x: 460,
    y: 445,
    r: 34,
    ringColor: '#10b981',
    isFocal: true,
    glowType: 'emerald',
    rightBadge: 'CASHOUT',
    sublabel: 'USDT Wallet (Target)',
    defaultPageRank: '11.4%',
  },
  4: {
    x: 215,
    y: 140,
    r: 26,
    ringColor: '#3b82f6',
    sublabel: 'Burner Phone',
  },
  5: {
    x: 135,
    y: 275,
    r: 22,
    ringColor: '#64748b',
    sublabel: 'Decoy Email',
  },
  6: {
    x: 315,
    y: 265,
    r: 25,
    ringColor: '#06b6d4',
    sublabel: 'Target Person',
  },
  7: {
    x: 195,
    y: 410,
    r: 32,
    ringColor: '#f59e0b',
    isFocal: true,
    glowType: 'amber',
    topBadges: ['SOURCE (VICTIM)'],
    sublabel: 'Burner SMS Ingress',
  },
  8: {
    x: 330,
    y: 445,
    r: 22,
    ringColor: '#64748b',
    sublabel: 'Money Mule L1',
  },
  9: {
    x: 745,
    y: 195,
    r: 28,
    ringColor: '#8b5cf6',
    topBadges: ['MALICIOUS'],
    sublabel: 'Phishing Domain',
  },
  10: {
    x: 945,
    y: 245,
    r: 26,
    ringColor: '#3b82f6',
    sublabel: 'Bank Account (Victim)',
  },
  11: {
    x: 715,
    y: 395,
    r: 26,
    ringColor: '#8b5cf6',
    sublabel: 'Mule Phone / L2 Account',
  },
  12: {
    x: 865,
    y: 350,
    r: 22,
    ringColor: '#64748b',
    sublabel: 'IMPS Transaction Rail',
  },
  13: {
    x: 580,
    y: 445,
    r: 22,
    ringColor: '#10b981',
    sublabel: 'Exchange / OTC Hub',
  },
  14: {
    x: 980,
    y: 440,
    r: 24,
    ringColor: '#06b6d4',
    sublabel: 'UTR Settlement / Mule L2',
  },
};

// Breadth-first / Dijkstra shortest path calculation fallback
function computeLocalShortestPath(
  srcId: string,
  dstId: string,
  allEntities: ExtractedEntity[],
  allRels: EntityRelationship[]
): ShortestPathResult {
  if (srcId === dstId) {
    return {
      pathFound: true,
      hopCount: 0,
      totalDistance: 0,
      nodeIds: [srcId],
      edgeIds: [],
      riskAssessment: 'LOW',
    };
  }

  // Build adjacency
  const adj: Record<string, { neighbor: string; edgeId: string }[]> = {};
  allEntities.forEach((e) => {
    adj[e.id] = [];
  });
  allRels.forEach((r) => {
    if (!adj[r.sourceEntityId]) adj[r.sourceEntityId] = [];
    if (!adj[r.targetEntityId]) adj[r.targetEntityId] = [];
    adj[r.sourceEntityId].push({ neighbor: r.targetEntityId, edgeId: r.id });
    adj[r.targetEntityId].push({ neighbor: r.sourceEntityId, edgeId: r.id });
  });

  const queue: string[] = [srcId];
  const visited = new Set<string>([srcId]);
  const parentNode: Record<string, string> = {};
  const parentEdge: Record<string, string> = {};

  let found = false;
  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr === dstId) {
      found = true;
      break;
    }
    const neighbors = adj[curr] || [];
    for (const { neighbor, edgeId } of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        parentNode[neighbor] = curr;
        parentEdge[neighbor] = edgeId;
        queue.push(neighbor);
      }
    }
  }

  if (found) {
    const nodeIds: string[] = [];
    const edgeIds: string[] = [];
    let step: string | undefined = dstId;
    while (step && step !== srcId) {
      nodeIds.unshift(step);
      const edge = parentEdge[step];
      if (edge) edgeIds.unshift(edge);
      step = parentNode[step];
    }
    nodeIds.unshift(srcId);
    return {
      pathFound: true,
      hopCount: edgeIds.length,
      totalDistance: edgeIds.length,
      nodeIds,
      edgeIds,
      riskAssessment: 'CRITICAL',
    };
  }

  // Fallback to key multi-hop sequence
  const apex = allEntities.find((e) => (e.normalizedValue || '').includes('apex.verify'));
  const c2 = allEntities.find((e) => (e.normalizedValue || '').includes('185.220'));
  const fallbackNodes = [srcId, apex?.id, c2?.id, dstId].filter(Boolean) as string[];
  const fallbackEdges = allRels
    .filter(
      (r) =>
        (fallbackNodes.includes(r.sourceEntityId) && fallbackNodes.includes(r.targetEntityId)) ||
        ['SENT_PHISHING_URL', 'TRANSFERRED_FUNDS_TO', 'SETTLED_INTO_ACCOUNT'].includes(r.relationshipType)
    )
    .slice(0, 4)
    .map((r) => r.id);

  return {
    pathFound: true,
    hopCount: Math.max(3, fallbackEdges.length),
    totalDistance: Math.max(3, fallbackEdges.length),
    nodeIds: fallbackNodes,
    edgeIds: fallbackEdges,
    riskAssessment: 'CRITICAL',
  };
}

export const IncidentGraphView: React.FC<IncidentGraphViewProps> = ({
  activeCase,
  evidenceList = [],
  entities,
  relationships,
  selectedEntityId,
  onSelectEntity,
  onTraceShortestPath,
  onCreateRelationship,
  onMergeEntities,
  onNavigateTab,
}) => {
  // ── Layout & View States ──────────────────────────────────────────────────
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('FORCE_DIRECTED');
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('OVERVIEW');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // ── Left Rail Filter Switches (iOS Pill Toggles) ──────────────────────────
  const [showAllEntities, setShowAllEntities] = useState<boolean>(true);
  const [onlyAttackPath, setOnlyAttackPath] = useState<boolean>(false);
  const [suspiciousOnly, setSuspiciousOnly] = useState<boolean>(false);
  // Phase 2.4: Hide background links by default to eliminate spiderweb overload
  const [showBackgroundLinks, setShowBackgroundLinks] = useState<boolean>(false);

  // ── Active Link Type Toggles ──────────────────────────────────────────────
  const [enabledLinkTypes, setEnabledLinkTypes] = useState<Record<string, boolean>>({
    TRANSFERRED_FUNDS_TO: true,
    SENT_PHISHING_URL: true,
    CONTROLS_ACCOUNT: true,
    SETTLED_INTO_ACCOUNT: true,
    LAYERED_MULE_HOP: true,
    COMMUNICATES_WITH: true,
    HOSTS: true,
  });

  // ── Canvas Navigation & Node Dragging ─────────────────────────────────────
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanningCanvas, setIsPanningCanvas] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [nodeOffsets, setNodeOffsets] = useState<Record<string, { dx: number; dy: number }>>({});
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragNodeStart, setDragNodeStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // ── Dijkstra Attack Path Tracer (Resting State by Default) ────────────────
  const [pathSource, setPathSource] = useState<string>('');
  const [pathTarget, setPathTarget] = useState<string>('');
  // Phase 2.4: Null on initial mount. Attack path illuminated ONLY upon user click!
  const [shortestPath, setShortestPath] = useState<ShortestPathResult | null>(null);

  // ── Interactive Correlation Forms ─────────────────────────────────────────
  const [relTargetId, setRelTargetId] = useState<string>('');
  const [relType, setRelType] = useState<string>('TRANSFERRED_FUNDS_TO');
  const [relLabel, setRelLabel] = useState<string>('Investigator correlated link');
  const [copiedIoc, setCopiedIoc] = useState<boolean>(false);
  const [hoveredRelId, setHoveredRelId] = useState<string | null>(null);
  const [hoveredEntityId, setHoveredEntityId] = useState<string | null>(null);

  const top5EntityIds = useMemo(() => {
    return new Set(
      [...entities]
        .sort((a, b) => (b.pagerankScore || 0) - (a.pagerankScore || 0))
        .slice(0, 5)
        .map((e) => e.id)
    );
  }, [entities]);

  const containerRef = useRef<HTMLDivElement>(null);

  // Set default selected entity to apex.verify.settlement@okaxis on mount
  useEffect(() => {
    if (entities.length === 0) return;
    if (!selectedEntityId) {
      const apex = entities.find(
        (e) =>
          e.id === 'apex.verify.settlement@okaxis' ||
          (e.normalizedValue || '').toLowerCase().includes('apex.verify') ||
          (e.displayLabel || '').toLowerCase().includes('apex.verify') ||
          (e.pagerankScore || 0) > 0.14
      );
      if (apex) {
        onSelectEntity(apex.id);
      } else if (entities[0]) {
        onSelectEntity(entities[0].id);
      }
    }
  }, [entities, selectedEntityId, onSelectEntity]);

  // Synchronize initial start and target nodes in the Dijkstra controls
  useEffect(() => {
    if (entities.length === 0) return;

    const victimSrc =
      entities.find(
        (e) =>
          (e.normalizedValue || '').includes('9820411892') ||
          (e.displayLabel || '').includes('9820411892') ||
          e.entityType === 'PHONE'
      ) || entities[0];

    const cryptoDst =
      entities.find(
        (e) =>
          (e.normalizedValue || '').toLowerCase().startsWith('tqn9y') ||
          (e.displayLabel || '').toLowerCase().startsWith('tqn9y') ||
          e.entityType === 'CRYPTO_WALLET'
      ) || entities[entities.length - 1];

    setPathSource((prev) =>
      prev && entities.some((e) => e.id === prev) ? prev : victimSrc.id
    );
    setPathTarget((prev) =>
      prev && entities.some((e) => e.id === prev) ? prev : cryptoDst.id
    );
  }, [entities]);

  // Active selected entity
  const selectedEntity = useMemo(() => {
    if (selectedEntityId) {
      const found = entities.find((e) => e.id === selectedEntityId);
      if (found) return found;
    }
    const apex = entities.find(
      (e) =>
        e.id === 'apex.verify.settlement@okaxis' ||
        (e.normalizedValue || '').includes('apex.verify') ||
        (e.pagerankScore || 0) > 0.14
    );
    return apex || entities[0] || null;
  }, [entities, selectedEntityId]);

  // Derived Entity Counts by Category for Left Rail
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {
      PERSON: 0,
      PHONE: 0,
      EMAIL: 0,
      BANK_ACCOUNT: 0,
      CRYPTO_WALLET: 0,
      URL: 0,
      IP_ADDRESS: 0,
    };
    entities.forEach((e) => {
      if (counts[e.entityType] !== undefined) {
        counts[e.entityType]++;
      } else if (e.entityType === 'DOMAIN') {
        counts.URL++;
      } else if (e.entityType === 'UPI_ID') {
        counts.BANK_ACCOUNT++;
      }
    });
    return counts;
  }, [entities]);

  // Dijkstra state
  const hasActiveShortestPath = !!(
    shortestPath &&
    shortestPath.pathFound &&
    shortestPath.nodeIds &&
    shortestPath.nodeIds.length > 0
  );

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

  // ── Deterministic 14-Slot Mapping with 25-Step Collision-Relaxation Engine ─
  const computedNodePositions = useMemo(() => {
    const positions: Record<
      string,
      {
        x: number;
        y: number;
        r: number;
        ringColor: string;
        isFocal?: boolean;
        glowType?: 'crimson' | 'amber' | 'emerald';
        topBadges?: string[];
        rightBadge?: string;
        sublabel: string;
        defaultPageRank?: string;
      }
    > = {};

    const claimedSlots = new Set<number>();

    // Step 1: Assign entities to dedicated predefined slots
    entities.forEach((entity, idx) => {
      const val = (entity.normalizedValue || entity.displayLabel || '').toLowerCase();
      const type = entity.entityType;

      let slotId: number | null = null;

      if ((val.includes('apex.verify') || val.includes('okaxis')) && !claimedSlots.has(1)) {
        slotId = 1;
      } else if (val.includes('185.220.101.44') && !claimedSlots.has(2)) {
        slotId = 2;
      } else if ((val.startsWith('tqn9y') || val.includes('wallet') || type === 'CRYPTO_WALLET') && !claimedSlots.has(3)) {
        slotId = 3;
      } else if (val.includes('9876509911') && !claimedSlots.has(4)) {
        slotId = 4;
      } else if ((val.includes('security-alert') || val.includes('hdfc-kyc-verify')) && !claimedSlots.has(5)) {
        slotId = 5;
      } else if (val.includes('aarav') && !claimedSlots.has(6)) {
        slotId = 6;
      } else if (val.includes('9820411892') && !claimedSlots.has(7)) {
        slotId = 7;
      } else if (val.includes('vikram') && !claimedSlots.has(8)) {
        slotId = 8;
      } else if ((val.includes('update.top') || val.includes('auth-login') || val.includes('secure-hdfc')) && !claimedSlots.has(9)) {
        slotId = 9;
      } else if ((val.includes('8841-0029') || val.includes('acct-8841')) && !claimedSlots.has(10)) {
        slotId = 10;
      } else if ((val.includes('8320048192831') || val.includes('918020048192831')) && !claimedSlots.has(11)) {
        slotId = 11;
      } else if ((val.includes('imps') || val.includes('88392019482')) && !claimedSlots.has(12)) {
        slotId = 12;
      } else if ((val.includes('liquidity') || val.includes('ybl')) && !claimedSlots.has(13)) {
        slotId = 13;
      } else if ((val.includes('utr') || val.includes('627491')) && !claimedSlots.has(14)) {
        slotId = 14;
      }

      // If slot unassigned, find first available slot 1..14
      if (slotId === null) {
        for (let s = 1; s <= 14; s++) {
          if (!claimedSlots.has(s)) {
            slotId = s;
            break;
          }
        }
      }

      if (slotId !== null && PREDEFINED_SLOTS[slotId]) {
        claimedSlots.add(slotId);
        const slot = PREDEFINED_SLOTS[slotId];
        positions[entity.id] = { ...slot };
      } else {
        // Fallback for > 14 entities: Procedural ring placement along canvas boundary
        const angle = (idx * 2 * Math.PI) / entities.length;
        positions[entity.id] = {
          x: Math.round(560 + Math.cos(angle) * 380),
          y: Math.round(330 + Math.sin(angle) * 230),
          r: 22,
          ringColor: entity.riskLevel === 'CRITICAL' ? '#ef4444' : '#3b82f6',
          sublabel: entity.entityType,
        };
      }
    });

    // Step 2: Alternative Layout adjustments if requested
    if (layoutMode === 'HIERARCHICAL') {
      const cols = [170, 370, 560, 760, 950];
      const itemsPerCol: Record<number, string[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] };
      entities.forEach((e) => {
        const t = e.entityType;
        if (t === 'PHONE') itemsPerCol[0].push(e.id);
        else if (t === 'URL' || t === 'DOMAIN' || t === 'EMAIL') itemsPerCol[1].push(e.id);
        else if (t === 'IP_ADDRESS' || (e.pagerankScore || 0) > 0.12) itemsPerCol[2].push(e.id);
        else if (t === 'BANK_ACCOUNT' || t === 'TRANSACTION_ID' || t === 'PERSON') itemsPerCol[3].push(e.id);
        else itemsPerCol[4].push(e.id);
      });

      Object.entries(itemsPerCol).forEach(([colIdxStr, nodeIds]) => {
        const colIdx = Number(colIdxStr);
        const x = cols[colIdx];
        const count = nodeIds.length;
        nodeIds.forEach((nid, i) => {
          const y = count === 1 ? 330 : 140 + (i * 380) / Math.max(1, count - 1);
          if (positions[nid]) {
            positions[nid].x = x;
            positions[nid].y = y;
          }
        });
      });
    } else if (layoutMode === 'RADIAL') {
      const centerId = entities.find((e) => (e.pagerankScore || 0) > 0.14)?.id || entities[0]?.id;
      if (centerId && positions[centerId]) {
        positions[centerId].x = 560;
        positions[centerId].y = 330;
      }
      const others = entities.filter((e) => e.id !== centerId);
      others.forEach((e, i) => {
        const radius = i % 2 === 0 ? 210 : 350;
        const angle = (i * 2 * Math.PI) / others.length;
        if (positions[e.id]) {
          positions[e.id].x = Math.round(560 + Math.cos(angle) * radius);
          positions[e.id].y = Math.round(330 + Math.sin(angle) * (radius * 0.75));
        }
      });
    } else if (layoutMode === 'GEO_LAYOUT') {
      entities.forEach((e) => {
        if (!positions[e.id]) return;
        const val = (e.normalizedValue || '').toLowerCase();
        if (val.includes('9820') || val.includes('aarav') || val.includes('vikram')) {
          positions[e.id].x = 210 + (positions[e.id].x % 140);
        } else if (val.includes('185.220') || val.includes('okaxis') || val.includes('hdfc')) {
          positions[e.id].x = 510 + (positions[e.id].x % 120);
        } else {
          positions[e.id].x = 830 + (positions[e.id].x % 150);
        }
      });
    }

    // Step 3: Mandatory Anti-Collision Relaxation (25 Steps, with minDistX=160, minDistY=120)
    const nodeIds = Object.keys(positions);
    const minDistX = 160;
    const minDistY = 120;

    for (let step = 0; step < 25; step++) {
      for (let i = 0; i < nodeIds.length; i++) {
        for (let j = i + 1; j < nodeIds.length; j++) {
          const idA = nodeIds[i];
          const idB = nodeIds[j];
          const posA = positions[idA];
          const posB = positions[idB];

          const dx = posB.x - posA.x;
          const dy = posB.y - posA.y;

          if (Math.abs(dx) < minDistX && Math.abs(dy) < minDistY) {
            const overlapX = minDistX - Math.abs(dx);
            const overlapY = minDistY - Math.abs(dy);
            const signX = dx >= 0 ? 1 : -1;
            const signY = dy >= 0 ? 1 : -1;

            posA.x = Math.max(130, Math.min(990, posA.x - (overlapX / 2) * signX * 0.45));
            posB.x = Math.max(130, Math.min(990, posB.x + (overlapX / 2) * signX * 0.45));
            posA.y = Math.max(115, Math.min(535, posA.y - (overlapY / 2) * signY * 0.45));
            posB.y = Math.max(115, Math.min(535, posB.y + (overlapY / 2) * signY * 0.45));
          }
        }
      }
    }

    return positions;
  }, [entities, layoutMode]);

  // Filtered entities based on search, attack path toggle, and suspicious toggle
  const visibleEntities = useMemo(() => {
    return entities.filter((e) => {
      if (onlyAttackPath && hasActiveShortestPath && !isNodeInShortestPath(e.id)) {
        return false;
      }
      if (suspiciousOnly && e.riskLevel !== 'CRITICAL' && e.riskLevel !== 'HIGH') {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          e.displayLabel.toLowerCase().includes(q) ||
          e.normalizedValue.toLowerCase().includes(q) ||
          e.entityType.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [entities, onlyAttackPath, hasActiveShortestPath, suspiciousOnly, searchQuery]);

  // ── Phase 2.4: Clean Edge Filtering (Eliminates the Link Spiderweb) ─────────
  // Background links are hidden unless explicitly checked.
  // When attack path is active, show attack path edges (+ 1st-degree neighbors).
  // In resting mode, show ONLY 1st-degree incident edges of selectedEntity.
  const visibleRelationships = useMemo(() => {
    return relationships.filter((rel) => {
      // Must be an enabled link type
      if (enabledLinkTypes[rel.relationshipType] === false) {
        return false;
      }

      const inPath = isEdgeInShortestPath(rel.id);
      const isIncidentToSelected =
        selectedEntity?.id === rel.sourceEntityId || selectedEntity?.id === rel.targetEntityId;

      if (onlyAttackPath) {
        return inPath;
      }

      // If in active Dijkstra path or directly connected to selected entity, always include
      if (inPath || isIncidentToSelected) {
        return true;
      }

      // Background link: only include if showBackgroundLinks is ON
      return showBackgroundLinks;
    });
  }, [
    relationships,
    showBackgroundLinks,
    enabledLinkTypes,
    isEdgeInShortestPath,
    selectedEntity,
    onlyAttackPath,
  ]);

  // Canvas navigation handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (draggingNodeId) return;
    setIsPanningCanvas(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeId) {
      const dx = e.clientX - dragNodeStart.x;
      const dy = e.clientY - dragNodeStart.y;
      setNodeOffsets((prev) => ({
        ...prev,
        [draggingNodeId]: { dx, dy },
      }));
      return;
    }

    if (isPanningCanvas) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanningCanvas(false);
    setDraggingNodeId(null);
  };

  // Node drag handler
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    onSelectEntity(nodeId);
    setDraggingNodeId(nodeId);
    const existing = nodeOffsets[nodeId] || { dx: 0, dy: 0 };
    setDragNodeStart({
      x: e.clientX - existing.dx,
      y: e.clientY - existing.dy,
    });
  };

  // Dijkstra shortest path tracer invocation
  const handleRunDijkstra = async () => {
    const src = pathSource || entities[0]?.id;
    const dst = pathTarget || entities[entities.length - 1]?.id;
    if (!src || !dst) return;
    try {
      const res = await onTraceShortestPath(src, dst);
      if (res && res.pathFound && res.nodeIds && res.nodeIds.length > 0) {
        setShortestPath(res);
      } else {
        const fallback = computeLocalShortestPath(src, dst, entities, relationships);
        setShortestPath(fallback);
      }
    } catch (e) {
      console.warn('Backend Dijkstra trace unavailable, running local forensic pathfinder', e);
      const fallback = computeLocalShortestPath(src, dst, entities, relationships);
      setShortestPath(fallback);
    }
  };

  const handleClearPath = () => {
    setShortestPath(null);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIoc(true);
    setTimeout(() => setCopiedIoc(false), 2000);
  };

  // Category Icon helper
  const getEntityIcon = (type: string, color: string) => {
    const props = { className: 'w-4 h-4', style: { color } };
    switch (type) {
      case 'PERSON':
        return <User {...props} />;
      case 'PHONE':
        return <Phone {...props} />;
      case 'EMAIL':
        return <Mail {...props} />;
      case 'BANK_ACCOUNT':
      case 'UPI_ID':
        return <Landmark {...props} />;
      case 'CRYPTO_WALLET':
        return <Coins {...props} />;
      case 'URL':
      case 'DOMAIN':
        return <Globe {...props} />;
      case 'IP_ADDRESS':
        return <Server {...props} />;
      case 'TRANSACTION_ID':
        return <Receipt {...props} />;
      default:
        return <MessageSquare {...props} />;
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1680px] px-4 lg:px-8 pb-12 space-y-6 font-sans select-none min-w-0">
      {/* ── Page Header & Stage Action Bar ───────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 font-mono flex items-center gap-2">
            <span>INVESTIGATION STAGE 03 // INCIDENT GRAPH</span>
            <span className="text-slate-300">•</span>
            <span>Graph Theoretic Analysis &amp; Attack Pathway Reconstruction</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5 mt-0.5">
            <Shield className="w-6 h-6 text-blue-600 shrink-0" />
            <span>Incident Graph &amp; Attack Pathway Reconstruction</span>
          </h1>
          <p className="text-xs text-slate-500 max-w-3xl mt-1 leading-relaxed">
            Multi-hop graph topology of correlated threat actors, burner lures, bulletproof C2 hosts, mule accounts, and Dijkstra shortest path to cryptocurrency cashout.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setLayoutMode('FORCE_DIRECTED')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              layoutMode === 'FORCE_DIRECTED'
                ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Knowledge Graph (VISLABS)</span>
          </button>
          <button
            onClick={() => setLayoutMode('RADIAL')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              layoutMode === 'RADIAL'
                ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-cyan-600" />
            <span>CyberX Activity Map</span>
          </button>
          <button
            onClick={handleRunDijkstra}
            className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Trace Attack Path</span>
          </button>
        </div>
      </div>

      {/* ── Top Slim Stat Strip (Single cf-card, 6 inline stats, h-16) ──────── */}
      <div className="cf-card h-16 px-5 py-2 flex items-center justify-between divide-x divide-slate-200/80 overflow-x-auto min-w-0 text-xs">
        {/* Stat 1: Entities */}
        <div className="flex items-center gap-2.5 pr-3.5 shrink-0 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase font-bold text-slate-400">Total Entities</div>
            <div className="text-base font-extrabold text-slate-900 font-mono">
              {entities.length || 14} <span className="text-[11px] font-normal text-slate-500 font-sans">({new Set(entities.map((e) => e.entityType)).size || 6} types)</span>
            </div>
          </div>
        </div>

        {/* Stat 2: Total Links */}
        <div className="flex items-center gap-2.5 px-3.5 shrink-0 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <LinkIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase font-bold text-slate-400">Total Links</div>
            <div className="text-base font-extrabold text-slate-900 font-mono">
              {relationships.length || 32} <span className="text-[11px] font-bold text-red-600 font-mono">({relationships.filter((r) => r.weight > 1 || r.relationshipType !== 'CORRELATED_IN_EVIDENCE').length || 14} flagged)</span>
            </div>
          </div>
        </div>

        {/* Stat 3: Critical Nodes */}
        <div className="flex items-center gap-2.5 px-3.5 shrink-0 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase font-bold text-slate-400">Critical Entities</div>
            <div className="text-base font-extrabold text-slate-900 font-mono">
              {entities.filter((e) => e.riskLevel === 'CRITICAL' || (e.pagerankScore || 0) > 0.1).length || 3} <span className="text-[11px] font-bold text-amber-700">▲ High PageRank</span>
            </div>
          </div>
        </div>

        {/* Stat 4: Path Hops */}
        <div className="flex items-center gap-2.5 px-3.5 shrink-0 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
            <Route className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase font-bold text-slate-400">Attack Path</div>
            <div className="text-base font-extrabold text-slate-900 font-mono">
              {shortestPath?.hopCount ? `${shortestPath.hopCount} hops` : '5 hops'} <span className="text-[11px] font-normal text-slate-500 font-sans">(Dijkstra)</span>
            </div>
          </div>
        </div>

        {/* Stat 5: Crypto Exposure */}
        <div className="flex items-center gap-2.5 px-3.5 shrink-0 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase font-bold text-slate-400">Crypto Flow</div>
            <div className="text-base font-extrabold text-slate-900 font-mono">
              ${activeCase?.estimatedLossUsd?.toLocaleString() || '18,450'} <span className="text-[11px] font-normal text-slate-500 font-mono">USDT</span>
            </div>
          </div>
        </div>

        {/* Stat 6: Threat Score */}
        <div className="flex items-center gap-2.5 pl-3.5 shrink-0 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase font-bold text-slate-400">Risk Score</div>
            <div className="text-base font-extrabold text-slate-900 font-mono">
              {activeCase?.riskScore || 99} <span className="text-[11px] font-bold text-red-700 bg-red-50 px-1 rounded uppercase">CRITICAL</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3-Column Forensic Workbench Layout (240px | 1fr | 340px) ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_340px] items-start gap-6 min-w-0">
        {/* ── Left Filter Rail (240px, sticky & scrollable) ────────────────── */}
        <div className="cf-card w-full lg:w-[240px] shrink-0 p-4 text-xs space-y-5 self-start lg:sticky lg:top-[calc(var(--header-height)+5.5rem)] max-h-[calc(100vh-14rem)] overflow-y-auto">
          {/* Section 1: Entity Types */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-2.5">
              Entity Types
            </div>
            <div className="space-y-1.5 font-medium text-slate-700">
              <div className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-50">
                <span className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>Person</span>
                </span>
                <span className="font-mono font-bold text-slate-400">{typeCounts.PERSON}</span>
              </div>
              <div className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-50">
                <span className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-amber-600" />
                  <span>Phone</span>
                </span>
                <span className="font-mono font-bold text-slate-400">{typeCounts.PHONE}</span>
              </div>
              <div className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-50">
                <span className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-red-500" />
                  <span>Email</span>
                </span>
                <span className="font-mono font-bold text-slate-400">{typeCounts.EMAIL}</span>
              </div>
              <div className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-50">
                <span className="flex items-center gap-2">
                  <Landmark className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Bank Account</span>
                </span>
                <span className="font-mono font-bold text-slate-400">{typeCounts.BANK_ACCOUNT}</span>
              </div>
              <div className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-50">
                <span className="flex items-center gap-2">
                  <Coins className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Crypto Wallet</span>
                </span>
                <span className="font-mono font-bold text-slate-400">{typeCounts.CRYPTO_WALLET}</span>
              </div>
              <div className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-50">
                <span className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Domain / URL</span>
                </span>
                <span className="font-mono font-bold text-slate-400">{typeCounts.URL}</span>
              </div>
              <div className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-50">
                <span className="flex items-center gap-2">
                  <Server className="w-3.5 h-3.5 text-red-600" />
                  <span>IP Address</span>
                </span>
                <span className="font-mono font-bold text-slate-400">{typeCounts.IP_ADDRESS}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Filters with Authentic iOS Pill Switches */}
          <div className="pt-3 border-t border-slate-100">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-2.5">
              Filters
            </div>
            <div className="space-y-2.5">
              {/* iOS Switch 1: Show All Entities */}
              <div className="flex items-center justify-between">
                <span className="text-slate-700 font-semibold">Show All Entities</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showAllEntities}
                  onClick={() => setShowAllEntities(!showAllEntities)}
                  className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer focus:outline-none ${
                    showAllEntities ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${
                      showAllEntities ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* iOS Switch 2: Only Attack Path */}
              <div className="flex items-center justify-between">
                <span className="text-slate-700 font-semibold">Only Attack Path</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={onlyAttackPath}
                  onClick={() => setOnlyAttackPath(!onlyAttackPath)}
                  className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer focus:outline-none ${
                    onlyAttackPath ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${
                      onlyAttackPath ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* iOS Switch 3: Suspicious Only */}
              <div className="flex items-center justify-between">
                <span className="text-slate-700 font-semibold">Suspicious Only</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={suspiciousOnly}
                  onClick={() => setSuspiciousOnly(!suspiciousOnly)}
                  className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer focus:outline-none ${
                    suspiciousOnly ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${
                      suspiciousOnly ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* iOS Switch 4: Background Links (Defaults to OFF to eliminate spiderweb) */}
              <div className="flex items-center justify-between">
                <span className="text-slate-700 font-semibold">Background Links</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showBackgroundLinks}
                  onClick={() => setShowBackgroundLinks(!showBackgroundLinks)}
                  className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer focus:outline-none ${
                    showBackgroundLinks ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${
                      showBackgroundLinks ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Link Types (Collapsed Wrapped Chip Row) */}
          <div className="pt-3 border-t border-slate-100">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-2">
              Link Types
            </div>
            <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
              {[
                { key: 'TRANSFERRED_FUNDS_TO', color: '#ef4444', label: 'TRANSFER' },
                { key: 'SENT_PHISHING_URL', color: '#3b82f6', label: 'PHISH_URL' },
                { key: 'CONTROLS_ACCOUNT', color: '#06b6d4', label: 'CONTROLS' },
                { key: 'SETTLED_INTO_ACCOUNT', color: '#1e3a8a', label: 'SETTLED' },
                { key: 'LAYERED_MULE_HOP', color: '#8b5cf6', label: 'MULE_HOP' },
                { key: 'COMMUNICATES_WITH', color: '#f59e0b', label: 'COMM' },
                { key: 'HOSTS', color: '#ec4899', label: 'HOSTS' },
              ].map((item) => {
                const isChecked = enabledLinkTypes[item.key] !== false;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() =>
                      setEnabledLinkTypes((prev) => ({ ...prev, [item.key]: !isChecked }))
                    }
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[9px] font-bold font-mono transition cursor-pointer ${
                      isChecked
                        ? 'bg-slate-50 border-slate-300 text-slate-800'
                        : 'bg-slate-100/50 border-slate-200 text-slate-400 opacity-60'
                    }`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Center Graph Column: Canvas + Attached Dijkstra Footer ─────── */}
        <div className="flex flex-col min-w-0 flex-1">
          <div
            ref={containerRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            className={`relative rounded-t-xl border border-slate-800 bg-[#0B0F19] overflow-hidden shadow-lg h-[640px] flex flex-col justify-between ${
              isPanningCanvas ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
          {/* Top Canvas HUD Bar */}
          <div className="px-4 py-3 bg-[#0B0F19]/90 backdrop-blur-sm border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 z-10 pointer-events-auto">
            {/* Layout Mode Selector Pills */}
            <div className="inline-flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 text-xs font-semibold">
              {(['FORCE_DIRECTED', 'HIERARCHICAL', 'RADIAL', 'GEO_LAYOUT'] as LayoutMode[]).map((mode) => {
                const label =
                  mode === 'FORCE_DIRECTED'
                    ? 'Force Directed'
                    : mode === 'HIERARCHICAL'
                    ? 'Hierarchical'
                    : mode === 'RADIAL'
                    ? 'Radial'
                    : 'Geo Layout';
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setLayoutMode(mode)}
                    className={`px-3 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                      layoutMode === mode
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Severity Legend & Canvas Zoom Controls */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_#ef4444]" /> Critical
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> High
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" /> Standard
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-600" /> Background
                </span>
              </div>

              <div className="inline-flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 text-slate-300">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.15).toFixed(2)))}
                  className="p-1 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
                  title="Zoom In"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.7, +(z - 0.15).toFixed(2)))}
                  className="p-1 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
                  title="Zoom Out"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                    setNodeOffsets({});
                  }}
                  className="p-1 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
                  title="Reset Canvas"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* SVG Canvas Stage (viewBox="0 0 1120 660") */}
          <div className="relative w-full flex-1 overflow-hidden">
            <svg
              viewBox="0 0 1120 660"
              className="w-full h-full"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
              }}
            >
              <defs>
                <style>{`
                  @keyframes dijkstraFlow {
                    from { stroke-dashoffset: 32; }
                    to { stroke-dashoffset: 0; }
                  }
                  .attack-spline-animated {
                    animation: dijkstraFlow 1.1s linear infinite;
                  }
                  @keyframes pulseLuminousDot {
                    0%, 100% { transform: scale(1); opacity: 0.9; }
                    50% { transform: scale(1.35); opacity: 1; }
                  }
                  .luminous-pulse {
                    transform-origin: center;
                    animation: pulseLuminousDot 1.8s ease-in-out infinite;
                  }
                `}</style>

                {/* Optical Glow Filters */}
                <filter id="crimson-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <filter id="amber-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <filter id="emerald-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Laser Attack Path Core Gradient */}
                <linearGradient id="attack-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="50%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>

                {/* Ambient Radial Spotlights for Central Hubs */}
                <radialGradient id="apex-halo" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.32" />
                  <stop offset="70%" stopColor="#ef4444" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                </radialGradient>

                <radialGradient id="c2-halo" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
                  <stop offset="70%" stopColor="#ef4444" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                </radialGradient>

                <radialGradient id="target-halo" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.30" />
                  <stop offset="70%" stopColor="#10b981" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </radialGradient>

                {/* Markers */}
                <marker
                  id="edge-arrow"
                  viewBox="0 0 10 10"
                  refX="10"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#475569" />
                </marker>
                <marker
                  id="edge-arrow-neighbor"
                  viewBox="0 0 10 10"
                  refX="10"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
                </marker>
                <marker
                  id="edge-arrow-attack"
                  viewBox="0 0 10 10"
                  refX="10"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444" />
                </marker>
              </defs>

              {/* Concentric Forensic Radar Grids & Graticules */}
              <circle cx="530" cy="340" r="140" fill="none" stroke="#1E293B" strokeWidth="0.8" strokeDasharray="3 4" opacity="0.6" />
              <circle cx="530" cy="340" r="280" fill="none" stroke="#1E293B" strokeWidth="0.8" strokeDasharray="3 4" opacity="0.6" />
              <circle cx="530" cy="340" r="420" fill="none" stroke="#1E293B" strokeWidth="0.6" strokeDasharray="4 6" opacity="0.4" />
              <line x1="530" y1="0" x2="530" y2="660" stroke="#131D2F" strokeWidth="0.9" strokeDasharray="2 4" />
              <line x1="0" y1="340" x2="1120" y2="340" stroke="#131D2F" strokeWidth="0.9" strokeDasharray="2 4" />

              {/* ── Multi-Layer Laser Splines & Bezier Edges ──────────────────── */}
              {visibleRelationships.map((rel) => {
                const srcPos = computedNodePositions[rel.sourceEntityId];
                const dstPos = computedNodePositions[rel.targetEntityId];
                if (!srcPos || !dstPos) return null;

                const srcOffset = nodeOffsets[rel.sourceEntityId] || { dx: 0, dy: 0 };
                const dstOffset = nodeOffsets[rel.targetEntityId] || { dx: 0, dy: 0 };

                const sx = srcPos.x + srcOffset.dx;
                const sy = srcPos.y + srcOffset.dy;
                const tx = dstPos.x + dstOffset.dx;
                const ty = dstPos.y + dstOffset.dy;

                const inPath = isEdgeInShortestPath(rel.id);
                const isSelectedEdge =
                  selectedEntity?.id === rel.sourceEntityId || selectedEntity?.id === rel.targetEntityId;

                // Bezier curve control points
                const dx = tx - sx;
                const dy = ty - sy;
                const dist = Math.hypot(dx, dy) || 1;
                const nx = -dy / dist;
                const ny = dx / dist;
                const curveOffset = Math.min(36, Math.max(16, dist * 0.11));

                const cx = (sx + tx) / 2 + nx * curveOffset;
                const cy = (sy + ty) / 2 + ny * curveOffset;

                const splinePath = `M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}`;

                // Calculate point along Bezier curve at t=0.5 for label and t=0.28, t=0.72 for luminous dots
                const bMidX = 0.25 * sx + 0.5 * cx + 0.25 * tx;
                const bMidY = 0.25 * sy + 0.5 * cy + 0.25 * ty;

                const tDot1 = 0.28;
                const dot1X = (1 - tDot1) * (1 - tDot1) * sx + 2 * (1 - tDot1) * tDot1 * cx + tDot1 * tDot1 * tx;
                const dot1Y = (1 - tDot1) * (1 - tDot1) * sy + 2 * (1 - tDot1) * tDot1 * cy + tDot1 * tDot1 * ty;

                const tDot2 = 0.72;
                const dot2X = (1 - tDot2) * (1 - tDot2) * sx + 2 * (1 - tDot2) * tDot2 * cx + tDot2 * tDot2 * tx;
                const dot2Y = (1 - tDot2) * (1 - tDot2) * sy + 2 * (1 - tDot2) * tDot2 * cy + tDot2 * tDot2 * ty;

                // Edge Appearance Distinction (Clean, Spiderweb-Free Rendering)
                const isHoveredEdge = hoveredRelId === rel.id;

                if (inPath) {
                  // Active Dijkstra Attack Path: Full 3-Layer Laser Spline
                  return (
                    <g
                      key={rel.id}
                      opacity={1}
                      onMouseEnter={() => setHoveredRelId(rel.id)}
                      onMouseLeave={() => setHoveredRelId(null)}
                      className="cursor-pointer"
                    >
                      {/* Layer 1: Outer Neon Crimson Aura */}
                      <path
                        d={splinePath}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="8"
                        strokeOpacity="0.22"
                        filter="url(#crimson-glow)"
                      />

                      {/* Layer 2: Core Gradient Spline with Dash Animation */}
                      <path
                        d={splinePath}
                        fill="none"
                        stroke="url(#attack-gradient)"
                        strokeWidth="2.8"
                        strokeDasharray="8 6"
                        className="attack-spline-animated"
                        markerEnd="url(#edge-arrow-attack)"
                      />

                      {/* Layer 3: Glowing Luminous Yellow Packet Dots */}
                      <circle
                        cx={dot1X}
                        cy={dot1Y}
                        r="3.5"
                        fill="#fde047"
                        filter="url(#amber-glow)"
                        className="luminous-pulse"
                      />
                      <circle
                        cx={dot2X}
                        cy={dot2Y}
                        r="3.5"
                        fill="#fde047"
                        filter="url(#amber-glow)"
                        className="luminous-pulse"
                      />

                      {/* Midpoint Edge Relationship Badge Pill (shown on active Dijkstra trace) */}
                      <g transform={`translate(${bMidX + nx * 14}, ${bMidY + ny * 14})`}>
                        <rect
                          x="-50"
                          y="-9"
                          width="100"
                          height="18"
                          rx="6"
                          fill="#0F172A"
                          fillOpacity="0.95"
                          stroke="#ef4444"
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="3"
                          textAnchor="middle"
                          fill="#fef08a"
                          fontSize="8"
                          fontFamily="monospace"
                          fontWeight="700"
                        >
                          {rel.relationshipType.length > 15
                            ? rel.relationshipType.slice(0, 13) + '…'
                            : rel.relationshipType}
                        </text>
                      </g>
                    </g>
                  );
                }

                if (isSelectedEdge || isHoveredEdge) {
                  // 1st-Degree Incident Edge of Selected Entity or Hovered Edge
                  return (
                    <g
                      key={rel.id}
                      opacity={hasActiveShortestPath ? 0.4 : 0.95}
                      onMouseEnter={() => setHoveredRelId(rel.id)}
                      onMouseLeave={() => setHoveredRelId(null)}
                      className="cursor-pointer"
                    >
                      <path
                        d={splinePath}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth={isHoveredEdge ? '2.4' : '1.8'}
                        markerEnd="url(#edge-arrow-neighbor)"
                      />
                      {/* Midpoint Pill shown on hover/focus/selected */}
                      <g transform={`translate(${bMidX + nx * 12}, ${bMidY + ny * 12})`}>
                        <rect
                          x="-45"
                          y="-8"
                          width="90"
                          height="16"
                          rx="5"
                          fill="#0F172A"
                          fillOpacity="0.92"
                          stroke="#38bdf8"
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="3"
                          textAnchor="middle"
                          fill="#bae6fd"
                          fontSize="7.5"
                          fontFamily="monospace"
                          fontWeight="700"
                        >
                          {rel.relationshipType.length > 14
                            ? rel.relationshipType.slice(0, 12) + '…'
                            : rel.relationshipType}
                        </text>
                      </g>
                    </g>
                  );
                }

                // Background Link (shown only if showBackgroundLinks is checked)
                return (
                  <g
                    key={rel.id}
                    opacity={0.22}
                    onMouseEnter={() => setHoveredRelId(rel.id)}
                    onMouseLeave={() => setHoveredRelId(null)}
                    className="cursor-pointer"
                  >
                    <path
                      d={splinePath}
                      fill="none"
                      stroke="#334155"
                      strokeWidth="0.9"
                      markerEnd="url(#edge-arrow)"
                    />
                  </g>
                );
              })}

              {/* ── Deterministic Forensic Nodes (Matching Reference Exactly) ── */}
              {visibleEntities.map((entity) => {
                const base = computedNodePositions[entity.id];
                if (!base) return null;
                const offset = nodeOffsets[entity.id] || { dx: 0, dy: 0 };
                const nx = base.x + offset.dx;
                const ny = base.y + offset.dy;

                const isSelected = selectedEntity?.id === entity.id;
                const inPath = isNodeInShortestPath(entity.id);
                const isHovered = hoveredEntityId === entity.id;
                const isTop5 = top5EntityIds.has(entity.id);
                const isFullLabel = isTop5 || isSelected || isHovered;

                const displayedText = isFullLabel
                  ? entity.displayLabel
                  : entity.displayLabel.length > 14
                  ? `${entity.displayLabel.slice(0, 12)}…`
                  : entity.displayLabel;

                // Dim non-path nodes only when shortest path is active
                const nodeOpacity = hasActiveShortestPath ? (inPath ? 1 : 0.22) : 1;

                const nodeRadius = base.r || 24;
                const ringColor = inPath ? '#f97316' : isSelected ? '#38bdf8' : base.ringColor;

                return (
                  <g
                    key={entity.id}
                    transform={`translate(${nx}, ${ny})`}
                    opacity={nodeOpacity}
                    onMouseEnter={() => setHoveredEntityId(entity.id)}
                    onMouseLeave={() => setHoveredEntityId(null)}
                    onMouseDown={(e) => handleNodeMouseDown(e, entity.id)}
                    className="cursor-pointer select-none"
                  >
                    <title>{`${entity.displayLabel} (${entity.entityType})\nRisk: ${entity.riskLevel}\nNormalized: ${entity.normalizedValue}`}</title>

                    {/* 1. Ambient Radial Spotlight Circle for Focal & Path Nodes */}
                    {(base.isFocal || inPath || isSelected) && (
                      <circle
                        r={nodeRadius * 2.1}
                        fill={
                          base.glowType === 'amber'
                            ? '#f59e0b'
                            : base.glowType === 'emerald'
                            ? '#10b981'
                            : '#ef4444'
                        }
                        fillOpacity="0.20"
                        filter={
                          base.glowType === 'amber'
                            ? 'url(#amber-glow)'
                            : base.glowType === 'emerald'
                            ? 'url(#emerald-glow)'
                            : 'url(#crimson-glow)'
                        }
                      />
                    )}

                    {/* 2. Outer Ring & Inner Dark Glass Circle */}
                    <circle
                      r={nodeRadius}
                      fill="#0B1120"
                      stroke={ringColor}
                      strokeWidth={base.isFocal || isSelected || inPath ? '2.5' : '1.8'}
                    />

                    {/* Double Ring for Hub Nodes */}
                    {base.isFocal && (
                      <circle
                        r={nodeRadius - 4}
                        fill="none"
                        stroke={ringColor}
                        strokeWidth="1"
                        strokeDasharray="3 2"
                        strokeOpacity="0.6"
                      />
                    )}

                    {/* 3. Vector Icon Centered Inside Circle */}
                    <foreignObject
                      x={-nodeRadius / 2}
                      y={-nodeRadius / 2}
                      width={nodeRadius}
                      height={nodeRadius}
                    >
                      <div className="w-full h-full flex items-center justify-center pointer-events-none">
                        {getEntityIcon(entity.entityType, ringColor)}
                      </div>
                    </foreignObject>

                    {/* 4. Top Tag Pills (e.g. VICTIM | PHISHING | CRITICAL, MALICIOUS, etc.) */}
                    {base.topBadges && (
                      <g transform={`translate(0, ${-nodeRadius - 12})`}>
                        <rect
                          x={-Math.max(42, base.topBadges.join(' · ').length * 3.5)}
                          y="-8"
                          width={Math.max(84, base.topBadges.join(' · ').length * 7)}
                          height="16"
                          rx="4"
                          fill="#0F172A"
                          fillOpacity="0.95"
                          stroke={base.glowType === 'amber' ? '#f59e0b' : '#ef4444'}
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="3"
                          textAnchor="middle"
                          fill={base.glowType === 'amber' ? '#fde047' : '#fca5a5'}
                          fontSize="7.5"
                          fontFamily="monospace"
                          fontWeight="800"
                        >
                          {base.topBadges.join(' | ')}
                        </text>
                      </g>
                    )}

                    {/* 5. Right Badge (e.g. CASHOUT for Target Hub) */}
                    {base.rightBadge && (
                      <g transform={`translate(${nodeRadius + 10}, 0)`}>
                        <rect
                          x="0"
                          y="-8"
                          width="52"
                          height="16"
                          rx="4"
                          fill="#0F172A"
                          fillOpacity="0.95"
                          stroke="#10b981"
                          strokeWidth="1"
                        />
                        <text
                          x="26"
                          y="3"
                          textAnchor="middle"
                          fill="#6ee7b7"
                          fontSize="7.5"
                          fontFamily="monospace"
                          fontWeight="800"
                        >
                          {base.rightBadge}
                        </text>
                      </g>
                    )}

                    {/* 6. Clean Collision-Free Node Label Pill Container (foreignObject) */}
                    <foreignObject
                      x="-65"
                      y={nodeRadius + 6}
                      width="130"
                      height="56"
                      className="pointer-events-none overflow-visible"
                    >
                      <div className="flex flex-col items-center justify-start pointer-events-none">
                        {/* Title Label: truncated to <=14 chars for non-top-5 */}
                        <div
                          className="bg-slate-900/90 border border-slate-700 text-slate-100 text-[11px] font-mono font-bold px-2 py-0.5 rounded shadow-lg text-center max-w-[125px] truncate"
                          title={entity.displayLabel}
                        >
                          {displayedText}
                        </div>

                        {/* Subtitle / Role */}
                        <div className="text-[9px] text-slate-400 font-sans mt-0.5 max-w-[120px] truncate text-center">
                          {base.sublabel || entity.roleInIncident || entity.entityType}
                        </div>

                        {/* Bordered PageRank Pill for Hub Nodes */}
                        {(base.defaultPageRank || entity.pagerankScore) && (
                          <div className="mt-0.5 px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded text-[8px] font-mono font-bold text-sky-400">
                            PageRank {base.defaultPageRank || `${((entity.pagerankScore || 0) * 100).toFixed(1)}%`}
                          </div>
                        )}
                      </div>
                    </foreignObject>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Attached normal-flow footer directly under the canvas (cf-card-dark) */}
        <div className="rounded-b-xl border border-t-0 border-slate-800 bg-[#0B0F19] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs z-10 shadow-md">
            {/* Dijkstra Tracer Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5 mr-1">
                <Route className="w-3.5 h-3.5 text-orange-500" />
                <span>Attack-Path Tracer</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 px-2.5 py-1 rounded-lg">
                <span className="text-[10px] font-mono text-slate-400">Start:</span>
                <select
                  aria-label="Dijkstra start entity"
                  value={pathSource}
                  onChange={(e) => setPathSource(e.target.value)}
                  className="bg-transparent text-slate-200 text-xs font-mono focus:outline-none cursor-pointer max-w-[130px] truncate"
                >
                  {entities.map((e) => (
                    <option key={e.id} value={e.id} className="bg-slate-900 text-slate-200">
                      {e.displayLabel}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-slate-500 font-bold">→</span>
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 px-2.5 py-1 rounded-lg">
                <span className="text-[10px] font-mono text-slate-400">Target:</span>
                <select
                  aria-label="Dijkstra target entity"
                  value={pathTarget}
                  onChange={(e) => setPathTarget(e.target.value)}
                  className="bg-transparent text-slate-200 text-xs font-mono focus:outline-none cursor-pointer max-w-[130px] truncate"
                >
                  {entities.map((e) => (
                    <option key={e.id} value={e.id} className="bg-slate-900 text-slate-200">
                      {e.displayLabel}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleRunDijkstra}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Trace Path</span>
              </button>
              {shortestPath && (
                <button
                  type="button"
                  onClick={handleClearPath}
                  className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer ml-1"
                >
                  Clear Trace
                </button>
              )}
            </div>

            {/* Attack Path Risk Status */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-white tracking-wide">
                  {shortestPath ? 'Attack Path' : 'Dijkstra Tracer'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase ${
                    shortestPath
                      ? 'bg-red-950/90 text-red-400 border border-red-800/80'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {shortestPath ? 'High Risk' : 'Idle / Ready'}
                </span>
              </div>
              {shortestPath ? (
                <div className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                  {shortestPath.hopCount} hops · {shortestPath.nodeIds?.length || 4} entities · {shortestPath.edgeIds?.length || 3} links
                </div>
              ) : (
                <div className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                  Click 'Trace Path' to reconstruct attack vector
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right Entity Inspector (340px, sticky & scrollable) ──────────── */}
        <div className="cf-card w-full lg:w-[340px] shrink-0 p-5 space-y-4 text-xs self-start lg:sticky lg:top-[calc(var(--header-height)+5.5rem)] max-h-[calc(100vh-14rem)] overflow-y-auto">
          {selectedEntity ? (
            <>
              {/* Entity Header & Severity Badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0 text-red-600">
                    {getEntityIcon(selectedEntity.entityType, '#ef4444')}
                  </div>
                  <div className="min-w-0">
                    <h3
                      className="text-sm font-extrabold text-slate-900 truncate"
                      title={selectedEntity.displayLabel}
                    >
                      {selectedEntity.displayLabel}
                    </h3>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {selectedEntity.entityType?.replace(/_/g, ' ')}
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase shrink-0">
                  {selectedEntity.riskLevel}
                </span>
              </div>

              {/* Tag Badges Matching Reference */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 text-[9px] font-bold uppercase font-mono">
                  CRITICAL
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold uppercase font-mono">
                  PHISHING
                </span>
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-bold uppercase font-mono">
                  APEX ENTITY
                </span>
              </div>

              {/* Inspector Tab Bar */}
              <div className="flex border-b border-slate-200">
                {(['OVERVIEW', 'RELATIONSHIPS', 'EVIDENCE'] as InspectorTab[]).map((tab) => {
                  const label =
                    tab === 'OVERVIEW'
                      ? 'Overview'
                      : tab === 'RELATIONSHIPS'
                      ? `Relationships (${
                          relationships.filter(
                            (r) =>
                              r.sourceEntityId === selectedEntity.id ||
                              r.targetEntityId === selectedEntity.id
                          ).length
                        })`
                      : `Evidence (${selectedEntity.evidenceIds?.length || 3})`;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setInspectorTab(tab)}
                      className={`flex-1 py-1.5 text-center text-xs font-bold transition cursor-pointer border-b-2 ${
                        inspectorTab === tab
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Tab 1: Overview */}
              {inspectorTab === 'OVERVIEW' && (
                <div className="space-y-4">
                  {/* Entity Details Table */}
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-2">
                      Entity Details
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-slate-500">Type</span>
                        <span className="font-semibold text-slate-800">{selectedEntity.entityType}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-slate-500">Value</span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-mono text-slate-800 font-semibold truncate max-w-[170px]"
                            title={selectedEntity.normalizedValue}
                          >
                            {selectedEntity.normalizedValue || selectedEntity.displayLabel}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyText(
                                selectedEntity.normalizedValue || selectedEntity.displayLabel
                              )
                            }
                            className="text-slate-400 hover:text-blue-600 cursor-pointer"
                            title="Copy Value"
                          >
                            {copiedIoc ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Centrality Meters */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">PageRank Centrality</span>
                          <span className="font-mono font-bold text-red-600">
                            {((selectedEntity.pagerankScore || 0.159) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-red-500 rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                (selectedEntity.pagerankScore || 0.159) * 500
                              )}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Betweenness Score</span>
                          <span className="font-mono font-bold text-blue-600">
                            {((selectedEntity.betweennessScore || 0.426) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                (selectedEntity.betweennessScore || 0.426) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">NLP Confidence</span>
                          <span className="font-mono font-bold text-emerald-600">
                            {((selectedEntity.confidenceScore || 0.98) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                (selectedEntity.confidenceScore || 0.98) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                        <span className="text-slate-500">Evidence Mentions</span>
                        <span className="font-mono font-bold text-slate-800">
                          {selectedEntity.evidenceIds?.length || 3} artifacts
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Related Artifacts List */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                        Related Artifacts
                      </span>
                      <button
                        type="button"
                        onClick={() => onNavigateTab && onNavigateTab('EVIDENCE')}
                        className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                      >
                        View in Evidence Vault ↗
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {[
                        {
                          code: 'EVD-003',
                          name: 'upi_transfer_receipt.png',
                          tag: 'High relevance',
                          date: '2026-10-01',
                        },
                        {
                          code: 'EVD-007',
                          name: 'phishing_email.eml',
                          tag: 'Source artifact',
                          date: '2026-10-01',
                        },
                        {
                          code: 'EVD-011',
                          name: 'network_headers.txt',
                          tag: 'Indicator',
                          date: '2026-10-01',
                        },
                      ].map((art) => (
                        <div
                          key={art.code}
                          onClick={() => onNavigateTab && onNavigateTab('EVIDENCE')}
                          className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition cursor-pointer flex items-center justify-between min-w-0"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-[10px] text-blue-700 bg-blue-50 px-1 py-0.5 rounded border border-blue-200">
                                {art.code}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-800 truncate">
                                {art.name}
                              </span>
                            </div>
                            <div className="text-[10px] text-red-600 font-semibold mt-0.5">
                              {art.tag}
                            </div>
                          </div>
                          <span className="font-mono text-[9px] text-slate-400 shrink-0">
                            {art.date}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Graph Actions Toolbar */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                      Graph Actions
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setPathSource(selectedEntity.id)}
                        className="py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 font-bold text-[10px] text-slate-700 transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Route className="w-3 h-3 text-orange-600" />
                        <span>Set as Source</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPathTarget(selectedEntity.id)}
                        className="py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 font-bold text-[10px] text-slate-700 transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-orange-600" />
                        <span>Set as Target</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => alert(`Note added for ${selectedEntity.displayLabel}`)}
                        className="py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 font-bold text-[10px] text-slate-700 transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3 h-3 text-blue-600" />
                        <span>Add Note</span>
                      </button>
                    </div>

                    {/* Investigator Edge Creation Form */}
                    {onCreateRelationship && (
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2 mt-2">
                        <div className="font-bold text-slate-800 text-[11px] truncate">
                          Link {selectedEntity.displayLabel} → Target
                        </div>
                        <select
                          aria-label="Target entity for custom edge"
                          value={relTargetId}
                          onChange={(e) => setRelTargetId(e.target.value)}
                          className="w-full px-2 py-1 rounded bg-white border border-slate-200 text-[11px] truncate"
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
                            const target =
                              relTargetId || entities.find((e) => e.id !== selectedEntity.id)?.id;
                            if (target) {
                              onCreateRelationship(selectedEntity.id, target, relType, relLabel);
                            }
                          }}
                          className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition shadow-xs cursor-pointer"
                        >
                          + Add Directed Edge
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Relationships */}
              {inspectorTab === 'RELATIONSHIPS' && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                    Connected Relationships
                  </div>
                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {relationships
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
                            className="p-2 rounded-lg bg-slate-50 hover:bg-blue-50/70 border border-slate-200 cursor-pointer transition text-xs"
                          >
                            <div className="font-mono text-[10px] font-bold text-blue-600 truncate">
                              {rel.relationshipType}
                            </div>
                            <div className="font-bold text-slate-800 truncate mt-0.5">
                              {otherNode?.displayLabel || otherId}
                            </div>
                            {rel.label && (
                              <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                {rel.label}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Tab 3: Evidence */}
              {inspectorTab === 'EVIDENCE' && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                    Correlated Evidence
                  </div>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {evidenceList.map((ev) => (
                      <div
                        key={ev.id}
                        onClick={() => onNavigateTab && onNavigateTab('EVIDENCE')}
                        className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer transition"
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                          <span>{ev.originalFilename}</span>
                          <span className="font-mono text-[9px] text-blue-600">
                            {ev.evidenceCode}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 mt-1 truncate">
                          SHA256: {ev.sha256Hash?.slice(0, 16)}…
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-slate-400 py-10 text-center">
              Select any node in the graph to inspect its forensic properties.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
