export interface UserProfile {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: 'LEAD_INVESTIGATOR' | 'FORENSIC_ANALYST' | 'AUDITOR';
  badgeNumber: string;
  organization: string;
  mfaEnabled: boolean;
  createdAt: string;
}

export interface RiskIndicator {
  id: string;
  code: string;
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  scoreImpact: number;
  title: string;
  description: string;
  evidenceRef: string;
  mitreTechnique: string;
}

export interface ForensicCaseSummary {
  id: string;
  caseNumber: string;
  title: string;
  incidentType: string;
  status: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  riskScore: number;
  summary: string;
  victimName: string;
  amountLostPaise: number;
  complaintNo?: string;
  origin?: string;
  district?: string;
  stationId?: string;
  citizenContactMasked?: string;
  incidentAt?: string;
  reportedAt?: string;
  urgencyScore?: number;
  assignedOfficerId?: string;
  crossCaseHitCount?: number;
  freezeRequestCount?: number;
  leadInvestigatorId: string;
  leadInvestigatorName: string;
  createdAt: string;
  updatedAt: string;
  evidenceCount: number;
  entityCount: number;
  relationshipCount: number;
  timelineEventCount: number;
  verifiedIntactCount: number;
  tamperedCount: number;
  metadataAnomalyCount: number;
  riskIndicators: RiskIndicator[];
}

export interface BoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  entityType: string;
  confidence: number;
}

export interface EvidenceItem {
  id: string;
  caseId: string;
  evidenceCode: string;
  originalFilename: string;
  evidenceCategory: string;
  detectedMimeType: string;
  fileSizeBytes: number;
  storagePath: string;
  sha256Hash: string;
  blake3Hash: string;
  clientProvidedSha256: string;
  transitVerified: boolean;
  integrityStatus: 'VERIFIED_INTACT' | 'TAMPER_DETECTED' | 'UNVERIFIED';
  exifMetadata: Record<string, string>;
  ocrRawText: string;
  ocrConfidence: number;
  ocrEngine?: string;
  needsReview?: boolean;
  phash?: string;
  boundingBoxes: BoundingBox[];
  processingStage: string;
  timestampAnomaly: boolean;
  timestampAnomalyDetail?: string;
  uploadedBy: string;
  uploadedAt: string;
  lastVerifiedAt: string;
}

export interface ExtractedEntity {
  id: string;
  caseId: string;
  entityType: string;
  normalizedValue: string;
  displayLabel: string;
  roleInIncident: string;
  confidenceScore: number;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  pagerankScore: number;
  betweennessScore: number;
  clusterId: number;
  osintEnrichment: Record<string, string>;
  evidenceIds: string[];
  mentions: BoundingBox[];
  firstSeenAt: string;
}

export interface EntityRelationship {
  id: string;
  caseId: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationshipType: string;
  label: string;
  weight: number;
  confidence: number;
  evidenceId?: string;
  eventTimestamp?: string;
}

export interface TimelineEvent {
  id: string;
  caseId: string;
  evidenceId?: string;
  evidenceCode?: string;
  eventTimestamp: string;
  timestampSource: string;
  killChainPhase: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  actorEntity?: string;
  targetEntity?: string;
  amountInvolved?: string;
  linkedEntityIds: string[];
  anomalyFlag: boolean;
  anomalyReason?: string;
  confidence: number;
}

export interface IntegrityVerification {
  id: string;
  caseId: string;
  evidenceId: string;
  evidenceCode: string;
  evidenceFilename: string;
  expectedSha256: string;
  computedSha256: string;
  expectedBlake3: string;
  computedBlake3: string;
  status: 'VERIFIED_INTACT' | 'TAMPER_DETECTED';
  verifiedBy: string;
  verifiedAt: string;
  certificateSignature: string;
}

export interface ChainOfCustodyEntry {
  id: string;
  sequenceNumber: number;
  caseId?: string;
  actorUsername: string;
  actorRole: string;
  actionType: string;
  targetResource: string;
  details: string;
  clientIp: string;
  previousHash: string;
  entryHash: string;
  timestamp: string;
}

export interface ShortestPathResult {
  sourceEntityId: string;
  targetEntityId: string;
  pathFound: boolean;
  totalWeight: number;
  hopCount: number;
  nodeIds: string[];
  edgeIds: string[];
  narrativeSteps: string[];
}


export interface FreezeRequest {
  id: string;
  caseId: string;
  bankName?: string;
  accountRef: string;
  ifsc?: string;
  utr?: string;
  amountPaise: number;
  packetHash: string;
  status: string;
  ackRef?: string;
  requestedBy?: string;
  createdAt: string;
  sentAt?: string;
}

export interface StatusUpdate {
  id: string;
  caseId: string;
  status: string;
  note: string;
  createdAt: string;
}

export interface TriageRow extends ForensicCaseSummary {
  destination?: string;
  minutesSinceIncident?: number | null;
}

export interface ActionCard {
  case: ForensicCaseSummary;
  destinations: {
    type: string; value: string; label: string; bank?: string;
    confidence: number; evidenceIds: string[]; seenInOtherComplaints: number;
  }[];
  utrs: string[];
  ifscs: string[];
  urgencyScore: number;
  urgencyReasons: string[];
  minutesSinceIncident?: number | null;
  related: {
    caseId: string; complaintNo: string; title: string; status: string;
    amountLostPaise: number; sharedEntities: string[];
  }[];
  freezeRequests: FreezeRequest[];
  recommendedActions: string[];
  suggestedLegalSections: string[];
  legalNote: string;
}
