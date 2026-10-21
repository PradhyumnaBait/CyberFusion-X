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
        public String caseNumber;   // Citizen-facing complaint no, e.g. CFX-MH-2026-000123
        public String title;
        public String incidentType; // UPI_PAYMENT_FRAUD, FAKE_JOB_INVESTMENT, PHISHING_LINK, ACCOUNT_HACKED, HARASSMENT_THREATS, OTHER
        public String status;       // DRAFT, SUBMITTED, TRIAGED, FREEZE_SENT, INVESTIGATING, CLOSED, OPEN (officer-created)
        public String severity;     // CRITICAL, HIGH, MEDIUM, LOW
        public int riskScore;
        public int urgencyScore;
        public String summary;
        public String victimName;
        /** Money lost, stored as paise (INR * 100). Never use double for money. */
        public long amountLostPaise;
        public String leadInvestigatorId;
        public String leadInvestigatorName;
        public String createdAt;
        public String updatedAt;
        // --- Citizen complaint fields (Phase: two-portal) ---
        public String origin;              // CITIZEN, OFFICER
        public String citizenContactMasked; // e.g. +91 98XXX XX210 (never store full phone in display fields)
        public String district;            // Maharashtra district
        public String stationId;
        public String language;            // UI language used by citizen: en, hi, mr
        public String incidentAt;          // When the incident/transaction happened (ISO-8601 UTC)
        public String reportedAt;          // When the citizen submitted
        public String draftTokenHash;      // SHA-256 of the citizen draft/track token (raw token never stored)
        public String assignedOfficerId;
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
        public String ocrEngine; // TESSERACT, FIXTURE_EMBEDDED_TEXT, PDF_TEXT, PLAIN_TEXT, NONE
        public boolean needsReview; // true when text could not be read automatically (honest fallback, never invented)
        public String phash; // perceptual aHash (16 hex chars) for near-duplicate image detection
        public List<BoundingBox> boundingBoxes = new ArrayList<>();
        public String processingStage; // COMPLETED, NEEDS_REVIEW, FAILED
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

    /** Citizen-visible status event (drives the complaint tracker). Only real recorded events appear. */
    public static class StatusUpdate {
        public String id;
        public String caseId;
        public String status;   // RECEIVED, UNDER_REVIEW, BANK_INTIMATED, INVESTIGATING, CLOSED
        public String note;     // plain-language note for the citizen
        public String createdAt;
    }

    /** Bank freeze intimation packet lifecycle (sent to a mock bank in demo mode). */
    public static class FreezeRequest {
        public String id;
        public String caseId;
        public String bankName;
        public String accountRef;    // beneficiary UPI ID or account number
        public String ifsc;
        public String utr;
        public long amountPaise;
        public String packetHash;    // SHA-256 of the generated packet contents
        public String status;        // DRAFT, SENT, ACKNOWLEDGED, REJECTED
        public String ackRef;        // acknowledgement reference returned by (mock) bank
        public String idempotencyKey;
        public String requestedBy;
        public String createdAt;
        public String sentAt;
    }

    public static class PoliceStation {
        public String id;
        public String name;
        public String district;
        public String type; // CYBER_PS, MAHARASHTRA_CYBER_HQ
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
