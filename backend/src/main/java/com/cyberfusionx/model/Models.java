package com.cyberfusionx.model;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Domain models and DTOs for CyberFusion X Digital Forensics Platform.
 */
public final class Models {

    private Models() {}

    public static class User {
        public String id;
        public String username;
        public String email;
        public String fullName;
        public String role; // LEAD_INVESTIGATOR, FORENSIC_ANALYST, AUDITOR
        public String badgeNumber;
        public String organization;
        public String passwordHash;
        public String passwordSalt;
        public boolean mfaEnabled;
        public String mfaSecret;
        public String createdAt;

        public User() {}

        public User(String id, String username, String email, String fullName, String role,
                    String badgeNumber, String organization, String passwordHash, String passwordSalt,
                    boolean mfaEnabled, String mfaSecret, String createdAt) {
            this.id = id;
            this.username = username;
            this.email = email;
            this.fullName = fullName;
            this.role = role;
            this.badgeNumber = badgeNumber;
            this.organization = organization;
            this.passwordHash = passwordHash;
            this.passwordSalt = passwordSalt;
            this.mfaEnabled = mfaEnabled;
            this.mfaSecret = mfaSecret;
            this.createdAt = createdAt;
        }

        public Map<String, Object> toSafeMap() {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", id);
            map.put("username", username);
            map.put("email", email);
            map.put("fullName", fullName);
            map.put("role", role);
            map.put("badgeNumber", badgeNumber);
            map.put("organization", organization);
            map.put("mfaEnabled", mfaEnabled);
            map.put("createdAt", createdAt);
            return map;
        }
    }

    public static class ForensicCase {
        public String id;
        public String caseNumber;
        public String title;
        public String incidentType; // UPI_WIRE_FRAUD, BEC_WIRE_INTERCEPT, PHISHING_CAMPAIGN, ACCOUNT_TAKEOVER, CRYPTO_DRAIN
        public String status;       // OPEN, ANALYZING, VERIFIED, CLOSED
        public String severity;     // CRITICAL, HIGH, MEDIUM, LOW
        public int riskScore;
        public String summary;
        public String victimName;
        public double estimatedLossUsd;
        public String leadInvestigatorId;
        public String leadInvestigatorName;
        public String createdAt;
        public String updatedAt;
    }

    public static class BoundingBox {
        public String id;
        public int x;
        public int y;
        public int width;
        public int height;
        public String text;
        public String entityType;
        public double confidence;

        public BoundingBox() {}

        public BoundingBox(String id, int x, int y, int width, int height, String text, String entityType, double confidence) {
            this.id = id;
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.text = text;
            this.entityType = entityType;
            this.confidence = confidence;
        }
    }

    public static class EvidenceItem {
        public String id;
        public String caseId;
        public String evidenceCode;
        public String originalFilename;
        public String evidenceCategory; // SCREENSHOT, TRANSACTION_RECEIPT, CHAT_LOG, URL_IOC, PHONE_IOC, EMAIL_HEADER, DOCUMENT
        public String detectedMimeType;
        public long fileSizeBytes;
        public String storagePath;
        public String sha256Hash;
        public String blake3Hash;
        public String clientProvidedSha256;
        public boolean transitVerified;
        public String integrityStatus; // VERIFIED_INTACT, TAMPER_DETECTED, UNVERIFIED
        public Map<String, String> exifMetadata = new LinkedHashMap<>();
        public String ocrRawText;
        public double ocrConfidence;
        public List<BoundingBox> boundingBoxes = new ArrayList<>();
        public String processingStage; // COMPLETED, OCR_EXTRACTING, AI_CORRELATING, FAILED
        public boolean timestampAnomaly;
        public String timestampAnomalyDetail;
        public String uploadedBy;
        public String uploadedAt;
        public String lastVerifiedAt;
    }

    public static class IntegrityVerification {
        public String id;
        public String caseId;
        public String evidenceId;
        public String evidenceCode;
        public String evidenceFilename;
        public String expectedSha256;
        public String computedSha256;
        public String expectedBlake3;
        public String computedBlake3;
        public String status; // VERIFIED_INTACT, TAMPER_DETECTED
        public String verifiedBy;
        public String verifiedAt;
        public String certificateSignature;
    }

    public static class ExtractedEntity {
        public String id;
        public String caseId;
        public String entityType; // PERSON, PHONE, EMAIL, BANK_ACCOUNT, UPI_ID, CRYPTO_WALLET, TRANSACTION_ID, URL, IP_ADDRESS, MESSAGE, DEVICE
        public String normalizedValue;
        public String displayLabel;
        public String roleInIncident; // VICTIM, THREAT_ACTOR, MULE_ACCOUNT, PHISHING_INFRASTRUCTURE, PAYMENT_RAIL, EVIDENCE_ARTIFACT
        public double confidenceScore;
        public String riskLevel; // CRITICAL, HIGH, MEDIUM, LOW, INFO
        public double pagerankScore;
        public double betweennessScore;
        public int clusterId;
        public Map<String, String> osintEnrichment = new LinkedHashMap<>();
        public List<String> evidenceIds = new ArrayList<>();
        public List<BoundingBox> mentions = new ArrayList<>();
        public String firstSeenAt;
    }

    public static class EntityRelationship {
        public String id;
        public String caseId;
        public String sourceEntityId;
        public String targetEntityId;
        public String relationshipType; // SENT_MESSAGE_TO, TRANSFERRED_FUNDS_TO, CLICKED_URL, OWNS_ACCOUNT, IMPERSONATED, HOSTED_ON_IP, EXTRACTED_FROM, CORRELATED_WITH
        public String label;
        public double weight;
        public double confidence;
        public String evidenceId;
        public String eventTimestamp;
    }

    public static class TimelineEvent {
        public String id;
        public String caseId;
        public String evidenceId;
        public String evidenceCode;
        public String eventTimestamp;
        public String timestampSource; // OCR_CONTENT, EXIF_METADATA, TRANSACTION_RECEIPT, ANALYST_ANNOTATION
        public String killChainPhase;  // RECON_LURE, INITIAL_CONTACT, DECEPTION_PHISHING, CREDENTIAL_HARVEST, FINANCIAL_EXECUTION, CASHOUT_LAUNDERING
        public String severity;        // CRITICAL, HIGH, MEDIUM, LOW
        public String title;
        public String description;
        public String actorEntity;
        public String targetEntity;
        public String amountInvolved;
        public List<String> linkedEntityIds = new ArrayList<>();
        public boolean anomalyFlag;
        public String anomalyReason;
        public double confidence;
    }

    public static class RiskIndicator {
        public String id;
        public String code;
        public String category; // CRYPTOGRAPHIC_INTEGRITY, PHISHING_INFRASTRUCTURE, FINANCIAL_VELOCITY, METADATA_FORENSICS, MULE_TOPOLOGY, SOCIAL_ENGINEERING
        public String severity; // CRITICAL, HIGH, MEDIUM, LOW
        public int scoreImpact;
        public String title;
        public String description;
        public String evidenceRef;
        public String mitreTechnique;

        public RiskIndicator() {}

        public RiskIndicator(String id, String code, String category, String severity, int scoreImpact,
                             String title, String description, String evidenceRef, String mitreTechnique) {
            this.id = id;
            this.code = code;
            this.category = category;
            this.severity = severity;
            this.scoreImpact = scoreImpact;
            this.title = title;
            this.description = description;
            this.evidenceRef = evidenceRef;
            this.mitreTechnique = mitreTechnique;
        }
    }

    public static class ChainOfCustodyEntry {
        public String id;
        public long sequenceNumber;
        public String caseId;
        public String actorUsername;
        public String actorRole;
        public String actionType;
        public String targetResource;
        public String details;
        public String clientIp;
        public String previousHash;
        public String entryHash;
        public String timestamp;
    }

    public static class ShortestPathResult {
        public String sourceEntityId;
        public String targetEntityId;
        public boolean pathFound;
        public double totalWeight;
        public int hopCount;
        public List<String> nodeIds = new ArrayList<>();
        public List<String> edgeIds = new ArrayList<>();
        public List<String> narrativeSteps = new ArrayList<>();
    }
}
