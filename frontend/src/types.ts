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
  estimatedLossUsd: number;
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
