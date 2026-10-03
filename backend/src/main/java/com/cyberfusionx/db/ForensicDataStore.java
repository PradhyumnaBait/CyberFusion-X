package com.cyberfusionx.db;

import com.cyberfusionx.crypto.CryptographicHashService;
import com.cyberfusionx.crypto.CryptographicHashService.DualHashResult;
import com.cyberfusionx.forensics.AiForensicExtractorService;
import com.cyberfusionx.forensics.AiForensicExtractorService.ExtractionBundle;
import com.cyberfusionx.forensics.IncidentGraphService;
import com.cyberfusionx.forensics.MetadataForensicsService;
import com.cyberfusionx.forensics.MetadataForensicsService.MetadataAnalysisResult;
import com.cyberfusionx.forensics.OcrExtractionService;
import com.cyberfusionx.forensics.OcrExtractionService.OcrResult;
import com.cyberfusionx.forensics.RiskScoringService;
import com.cyberfusionx.forensics.RiskScoringService.RiskEvaluation;
import com.cyberfusionx.forensics.SampleCaseSeeder;
import com.cyberfusionx.model.Models.*;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.locks.ReentrantReadWriteLock;
import java.util.function.Consumer;

/**
 * Thread-Safe Transactional Forensic Data Store & Vault Engine.
 * Manages cases, binary evidence vault files, SHA-256/BLAKE3 integrity verifications,
 * extracted entities, JGraphT relationships, chronological timelines, and
 * the SHA-256 hash-chained Chain-of-Custody audit ledger.
 */
public final class ForensicDataStore {

    private static final Logger LOG = LoggerFactory.getLogger(ForensicDataStore.class);
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
    private static final ForensicDataStore INSTANCE = new ForensicDataStore();

    private final ReentrantReadWriteLock lock = new ReentrantReadWriteLock();
    private final Path dataDir;
    private final Path vaultDir;
    private final Path vaultBackupDir;
    private final Path stateFile;
    private final List<Consumer<Map<String, Object>>> sseListeners = new CopyOnWriteArrayList<>();

    private PersistentState state = new PersistentState();

    public static class PersistentState {
        public int schemaVersion = 3;
        public List<User> users = new ArrayList<>();
        public List<ForensicCase> cases = new ArrayList<>();
        public List<EvidenceItem> evidenceItems = new ArrayList<>();
        public List<IntegrityVerification> verifications = new ArrayList<>();
        public List<ExtractedEntity> entities = new ArrayList<>();
        public List<EntityRelationship> relationships = new ArrayList<>();
        public List<TimelineEvent> timelineEvents = new ArrayList<>();
        public List<ChainOfCustodyEntry> custodyLedger = new ArrayList<>();
    }

    private ForensicDataStore() {
        String dirEnv = System.getenv().getOrDefault("DATA_DIR", "data");
        this.dataDir = Paths.get(dirEnv).toAbsolutePath();
        this.vaultDir = this.dataDir.resolve("vault");
        this.vaultBackupDir = this.dataDir.resolve("vault-originals");
        this.stateFile = this.dataDir.resolve("cyberfusion-db.json");
        initializeStore();
    }

    public static ForensicDataStore getInstance() {
        return INSTANCE;
    }

    private void initializeStore() {
        lock.writeLock().lock();
        try {
            Files.createDirectories(dataDir);
            Files.createDirectories(vaultDir);
            Files.createDirectories(vaultBackupDir);

            if (Files.exists(stateFile)) {
                try {
                    String json = Files.readString(stateFile, StandardCharsets.UTF_8);
                    PersistentState loaded = GSON.fromJson(json, PersistentState.class);
                    boolean allFilesPresent = loaded != null
                            && loaded.schemaVersion >= 3
                            && loaded.evidenceItems != null
                            && !loaded.evidenceItems.isEmpty()
                            && loaded.evidenceItems.stream().allMatch(ev ->
                                    ev.storagePath != null && Files.exists(Paths.get(ev.storagePath)));
                    if (loaded != null && loaded.cases != null && !loaded.cases.isEmpty() && allFilesPresent) {
                        this.state = loaded;
                        LOG.info("Loaded persistent forensic state with {} cases and {} evidence items.",
                                state.cases.size(), state.evidenceItems.size());
                        return;
                    }
                } catch (Exception e) {
                    LOG.warn("Could not parse existing state file, re-initializing default forensic data.", e);
                }
            }

            seedDefaultUsers();
            seedPrimaryOperationPhantomUpiCase();
            seedSecondaryBecWireInterceptCase();
            saveStateUnlocked();
            LOG.info("Initialized CyberFusion X Forensic Store with {} cases, {} evidence items, {} entities.",
                    state.cases.size(), state.evidenceItems.size(), state.entities.size());
        } catch (IOException e) {
            throw new RuntimeException("Failed to initialize ForensicDataStore directories", e);
        } finally {
            lock.writeLock().unlock();
        }
    }

    public void resetDemoState(String actorUsername) {
        lock.writeLock().lock();
        try {
            this.state = new PersistentState();
            seedDefaultUsers();
            seedPrimaryOperationPhantomUpiCase();
            seedSecondaryBecWireInterceptCase();
            appendLedgerUnlocked("case-phantom-upi-01",
                    actorUsername != null ? actorUsername : "arjun.verma",
                    "LEAD_INVESTIGATOR",
                    "DEMO_ENVIRONMENT_RESET",
                    "ALL_CASES",
                    "Restored clean baseline forensic cases, WORM vault binaries, and entity graph",
                    "127.0.0.1");
            saveStateUnlocked();
        } finally {
            lock.writeLock().unlock();
        }
    }

    private void saveStateUnlocked() {
        try {
            Path tmp = dataDir.resolve("cyberfusion-db.json.tmp");
            Files.writeString(tmp, GSON.toJson(state), StandardCharsets.UTF_8);
            Files.move(tmp, stateFile, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (IOException e) {
            LOG.error("Failed to save state file", e);
        }
    }

    public void registerSseListener(Consumer<Map<String, Object>> listener) {
        sseListeners.add(listener);
    }

    public void unregisterSseListener(Consumer<Map<String, Object>> listener) {
        sseListeners.remove(listener);
    }

    public void broadcastProgress(String caseId, String stage, String message, int percent) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("caseId", caseId);
        payload.put("stage", stage);
        payload.put("message", message);
        payload.put("percent", percent);
        payload.put("timestamp", Instant.now().toString());
        for (Consumer<Map<String, Object>> listener : sseListeners) {
            try {
                listener.accept(payload);
            } catch (Exception ignored) {}
        }
    }

    private void seedDefaultUsers() {
        String salt1 = CryptographicHashService.generateSalt();
        state.users.add(new User(
                "usr-lead-01",
                "arjun.verma",
                "arjun.verma@cyberfusionx.gov.in",
                "Cmdr. Arjun Verma (Lead Forensics)",
                "LEAD_INVESTIGATOR",
                "CFX-IND-001",
                "CyberFusion X Financial Crimes & Digital Forensics Unit",
                CryptographicHashService.hashPassword("Forensics@2026", salt1),
                salt1,
                true,
                "3132333435363738393031323334353637383930",
                "2026-09-15T08:00:00Z"
        ));

        String salt2 = CryptographicHashService.generateSalt();
        state.users.add(new User(
                "usr-analyst-02",
                "priya.nair",
                "priya.nair@cyberfusionx.gov.in",
                "Priya Nair (Senior Threat Analyst)",
                "FORENSIC_ANALYST",
                "CFX-IND-014",
                "CyberFusion X Threat Intelligence Lab",
                CryptographicHashService.hashPassword("Analyst@2026", salt2),
                salt2,
                false,
                "4142434445464748495041424344454647484950",
                "2026-09-18T09:30:00Z"
        ));

        String salt3 = CryptographicHashService.generateSalt();
        state.users.add(new User(
                "usr-auditor-03",
                "rohan.kulkarni",
                "rohan.kulkarni@cyberfusionx.gov.in",
                "Rohan Kulkarni (Judicial Chain-of-Custody Auditor)",
                "AUDITOR",
                "CFX-AUD-088",
                "Judicial Digital Evidence Verification Board",
                CryptographicHashService.hashPassword("Auditor@2026", salt3),
                salt3,
                false,
                null,
                "2026-09-20T11:15:00Z"
        ));
    }

    /**
     * Seeds Case #1: Operation Phantom UPI & Multi-Hop Mule Network.
     */
    private void seedPrimaryOperationPhantomUpiCase() {
        ForensicCase c = new ForensicCase();
        c.id = "case-phantom-upi-01";
        c.caseNumber = "CASE-2026-0841";
        c.title = "Operation Phantom UPI: Spear-Phishing & Multi-Hop Mule Ring";
        c.incidentType = "UPI_WIRE_FRAUD";
        c.status = "ANALYZING";
        c.severity = "CRITICAL";
        c.victimName = "Aarav Mehta (Apex Logistics Pvt Ltd)";
        c.estimatedLossUsd = 18450.00;
        c.leadInvestigatorId = "usr-lead-01";
        c.leadInvestigatorName = "Cmdr. Arjun Verma (Lead Forensics)";
        c.createdAt = "2026-10-01T10:05:00Z";
        c.updatedAt = "2026-10-01T11:30:00Z";
        c.summary = "Coordinated spear-phishing and instant payment fraud targeting corporate signatory Aarav Mehta. "
                + "Initial SMS lure sent from burner VoIP +919820411892 directed the victim to an Evilginx reverse-proxy domain "
                + "(https://secure-hdfc-kyc-update.top/auth-login) hosted on bulletproof IP 185.220.101.44. "
                + "Harvested session tokens authorized two rapid UPI/IMPS transfers totaling $18,450.00 through Level-1 Mule VPA "
                + "apex.verify.settlement@okaxis (Vikram Singh) and Level-2 account 918020048192831 before off-ramping into Tron USDT wallet "
                + "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE.";
        state.cases.add(c);

        appendLedgerUnlocked(c.id, "arjun.verma", "LEAD_INVESTIGATOR", "CASE_INITIALIZED",
                c.caseNumber, "Initialized forensic investigation for Operation Phantom UPI", "10.24.8.14");

        // Evidence 1: Phishing SMS Screenshot
        String[] ev1Lines = {
                "Sender: +919820411892",
                "Victim: Aarav Mehta",
                "Timestamp: 2026-10-01T10:12:18Z",
                "URGENT HDFC CORP ALERT: Account ACCT-8841-0029-VICTIM suspended!",
                "Complete mandatory KYC verification within 15 minutes at:",
                "https://secure-hdfc-kyc-update.top/auth-login",
                "Relay Node IP: 185.220.101.44",
                "Support Contact Email: security-alert@hdfc-kyc-verify.top"
        };
        Map<String, String> ev1Meta = new LinkedHashMap<>();
        ev1Meta.put("DeviceMake", "Apple iPhone 15 Pro (iOS 19.1)");
        ev1Meta.put("DateTimeOriginal", "2026:10:01 10:13:02");
        ev1Meta.put("GPSCoordinates", "19.0760 N, 72.8777 E (Mumbai, IN)");
        ev1Meta.put("Software", "iOS Native Screenshot Service");
        byte[] ev1Bytes = SampleCaseSeeder.renderForensicEvidencePng(
                "PHISHING_SMS",
                "SMS Phishing Lure Screenshot",
                "Captured from Victim Device • +919820411892",
                ev1Lines,
                ev1Meta,
                String.join("\n", ev1Lines)
        );
        ingestEvidenceInternal(c.id, "EVD-001", "sms_phishing_lure_capture.png", "SCREENSHOT",
                ev1Bytes, "arjun.verma", "2026-10-01T10:15:00Z");

        // Evidence 2: WhatsApp Social Engineering Chat Screenshot
        String[] ev2Lines = {
                "Sender: +919820411892",
                "Actor: Vikram Singh (Mule L1)",
                "Timestamp: 2026-10-01T10:21:40Z",
                "WhatsApp Encrypted Session — Impersonating Bank Desk",
                "Message: Sir your OTP token is validated on https://secure-hdfc-kyc-update.top/auth-login",
                "Initiate liquidity verification transfer of $4,850.00 to escrow VPA:",
                "Beneficiary UPI: apex.verify.settlement@okaxis",
                "Secondary Clearing Account: 918020048192831"
        };
        Map<String, String> ev2Meta = new LinkedHashMap<>();
        ev2Meta.put("DeviceMake", "Apple iPhone 15 Pro (iOS 19.1)");
        ev2Meta.put("DateTimeOriginal", "2026:10:01 10:22:15");
        ev2Meta.put("Software", "WhatsApp iOS v2.26.19");
        byte[] ev2Bytes = SampleCaseSeeder.renderForensicEvidencePng(
                "WHATSAPP_CHAT",
                "WhatsApp Impersonation Chat Log",
                "Social Engineering Coercion • Escrow Lure",
                ev2Lines,
                ev2Meta,
                String.join("\n", ev2Lines)
        );
        ingestEvidenceInternal(c.id, "EVD-002", "whatsapp_impersonation_chat.png", "CHAT_LOG",
                ev2Bytes, "arjun.verma", "2026-10-01T10:24:00Z");

        // Evidence 3: Fraudulent UPI/IMPS Bank Transfer Receipt (with EXIF manipulation anomaly!)
        String[] ev3Lines = {
                "INSTANT PAYMENT RECEIPT — UTR627491830521",
                "Timestamp: 2026-10-01T10:28:44Z",
                "From: Aarav Mehta",
                "Origin Account: ACCT-8841-0029-VICTIM",
                "Beneficiary: Vikram Singh (Mule L1)",
                "Paid To UPI: apex.verify.settlement@okaxis",
                "Linked Account: 918020048192831",
                "Transaction ID: UTR627491830521",
                "Amount Transferred: $4,850.00"
        };
        Map<String, String> ev3Meta = new LinkedHashMap<>();
        ev3Meta.put("DeviceMake", "Android Virtual Framebuffer");
        ev3Meta.put("DateTimeOriginal", "2026:10:01 09:50:11");
        ev3Meta.put("Software", "Adobe Photoshop 2026 (Modified Fake Receipt Overlay)");
        ev3Meta.put("TimestampTamperFlag", "true");
        ev3Meta.put("TimestampTamperReason",
                "EXIF DateTimeOriginal (09:50:11Z) predates printed transaction execution time (10:28:44Z) by 38 minutes; Adobe Photoshop header present.");
        byte[] ev3Bytes = SampleCaseSeeder.renderForensicEvidencePng(
                "BANK_RECEIPT",
                "UPI / IMPS Transfer Receipt #UTR627491830521",
                "Amount: $4,850.00 • Beneficiary: apex.verify.settlement@okaxis",
                ev3Lines,
                ev3Meta,
                String.join("\n", ev3Lines)
        );
        ingestEvidenceInternal(c.id, "EVD-003", "upi_transfer_receipt_UTR627491830521.png", "TRANSACTION_RECEIPT",
                ev3Bytes, "priya.nair", "2026-10-01T10:35:00Z");

        // Evidence 4: Second-Hop Mule Layering & Crypto Off-Ramp Ledger Screenshot
        String[] ev4Lines = {
                "MULE LAYERING & CRYPTO OFF-RAMP SETTLEMENT LOG",
                "Timestamp: 2026-10-01T10:39:12Z",
                "Source Account: 918020048192831",
                "Source UPI: apex.verify.settlement@okaxis",
                "Layer-2 Mule UPI: fast.liquidity.hub@ybl",
                "Settlement Reference: IMPS-88392019482",
                "Amount Routed: $13,600.00",
                "Crypto Off-Ramp Wallet: TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
                "Operator Phone: +919876509911",
                "C2 Proxy IP: 185.220.101.44"
        };
        Map<String, String> ev4Meta = new LinkedHashMap<>();
        ev4Meta.put("DeviceMake", "NPCI & Exchange Forensics Export");
        ev4Meta.put("DateTimeOriginal", "2026:10:01 10:41:00");
        ev4Meta.put("Software", "CyberFusion Gateway Telemetry Capture");
        byte[] ev4Bytes = SampleCaseSeeder.renderForensicEvidencePng(
                "CRYPTO_LEDGER",
                "Layer-2 Mule & Tron USDT Off-Ramp Trace",
                "Ref: IMPS-88392019482 -> TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
                ev4Lines,
                ev4Meta,
                String.join("\n", ev4Lines)
        );
        ingestEvidenceInternal(c.id, "EVD-004", "mule_layering_crypto_offramp.png", "TRANSACTION_RECEIPT",
                ev4Bytes, "priya.nair", "2026-10-01T10:45:00Z");

        recalculateCaseIntelligenceUnlocked(c.id);
    }

    /**
     * Seeds Case #2: Executive BEC SWIFT Wire Intercept.
     */
    private void seedSecondaryBecWireInterceptCase() {
        ForensicCase c = new ForensicCase();
        c.id = "case-bec-swift-02";
        c.caseNumber = "CASE-2026-0842";
        c.title = "Apex Global BEC: Lookalike Domain Invoice & SWIFT Wire Intercept";
        c.incidentType = "BEC_WIRE_INTERCEPT";
        c.status = "OPEN";
        c.severity = "HIGH";
        c.victimName = "Meera Deshmukh (CFO, Horizon BioTech)";
        c.estimatedLossUsd = 64200.00;
        c.leadInvestigatorId = "usr-lead-01";
        c.leadInvestigatorName = "Cmdr. Arjun Verma (Lead Forensics)";
        c.createdAt = "2026-10-01T07:30:00Z";
        c.updatedAt = "2026-10-01T09:45:00Z";
        c.summary = "Business Email Compromise (BEC) utilizing lookalike supplier domain (billing@apex-global-supply.xyz) "
                + "to inject a modified IBAN beneficiary account (GB29NWBK60161331926819) into an active vendor settlement thread, "
                + "diverting $64,200.00 via SWIFT wire SWFT-774910239 to an offshore layering wallet 0x71C9656EC7ab88b098defB751B7401B5f6d8976F.";
        state.cases.add(c);

        appendLedgerUnlocked(c.id, "arjun.verma", "LEAD_INVESTIGATOR", "CASE_INITIALIZED",
                c.caseNumber, "Initialized BEC SWIFT wire intercept investigation", "10.24.8.14");

        String[] becLines = {
                "Sender: Elena Rostova",
                "Victim: Meera Deshmukh",
                "Timestamp: 2026-10-01T08:11:05Z",
                "From Email: billing@apex-global-supply.xyz",
                "Portal URL: https://invoice-apex-global.xyz/swift-mandate",
                "Origin Corporate Account: ACCT-4410-CORP-VICTIM",
                "Updated Beneficiary IBAN: GB29NWBK60161331926819",
                "SWIFT Wire Reference: SWFT-774910239",
                "Amount Transferred: $64,200.00",
                "Off-Ramp Wallet: 0x71C9656EC7ab88b098defB751B7401B5f6d8976F",
                "Relay IP: 91.219.236.174",
                "Callback Phone: +447700900412"
        };
        Map<String, String> becMeta = new LinkedHashMap<>();
        becMeta.put("DeviceMake", "Corporate Mail Gateway Forensics");
        becMeta.put("DateTimeOriginal", "2026:10:01 08:12:00");
        becMeta.put("Software", "Mimecast Forensic Header Extractor");
        byte[] becBytes = SampleCaseSeeder.renderForensicEvidencePng(
                "BANK_RECEIPT",
                "BEC Spoofed SWIFT Invoice & Wire Confirmation",
                "Ref: SWFT-774910239 • IBAN: GB29NWBK60161331926819",
                becLines,
                becMeta,
                String.join("\n", becLines)
        );
        ingestEvidenceInternal(c.id, "EVD-101", "bec_swift_wire_mandate.png", "TRANSACTION_RECEIPT",
                becBytes, "arjun.verma", "2026-10-01T08:20:00Z");

        recalculateCaseIntelligenceUnlocked(c.id);
    }

    /**
     * Ingests a binary or textual evidence artifact, computes SHA-256 & BLAKE3,
     * runs metadata forensics, OCR bounding-box extraction, and AI entity correlation.
     */
    public EvidenceItem ingestEvidence(
            String caseId,
            String filename,
            String category,
            byte[] fileBytes,
            String clientProvidedSha256,
            String supplementalNotes,
            String uploadedBy
    ) {
        lock.writeLock().lock();
        try {
            broadcastProgress(caseId, "HASHING", "Computing streaming SHA-256 & BLAKE3 cryptographic digests...", 20);
            int nextNum = (int) state.evidenceItems.stream().filter(e -> e.caseId.equals(caseId)).count() + 1;
            String code = String.format("EVD-%03d", nextNum);
            EvidenceItem item = ingestEvidenceInternalWithNotes(
                    caseId, code, filename, category, fileBytes, clientProvidedSha256,
                    supplementalNotes, uploadedBy, Instant.now().toString()
            );
            broadcastProgress(caseId, "GRAPH_CORRELATION", "Recomputing JGraphT PageRank & timeline correlations...", 85);
            recalculateCaseIntelligenceUnlocked(caseId);
            appendLedgerUnlocked(caseId, uploadedBy, "FORENSIC_ANALYST", "EVIDENCE_INGESTED_AND_HASHED",
                    item.evidenceCode + " (" + filename + ")",
                    "SHA-256=" + item.sha256Hash + " | BLAKE3=" + item.blake3Hash,
                    "127.0.0.1");
            saveStateUnlocked();
            broadcastProgress(caseId, "COMPLETED", "Forensic extraction and graph correlation complete for " + filename, 100);
            return item;
        } finally {
            lock.writeLock().unlock();
        }
    }

    private EvidenceItem ingestEvidenceInternal(
            String caseId, String code, String filename, String category,
            byte[] fileBytes, String uploadedBy, String uploadedAt
    ) {
        return ingestEvidenceInternalWithNotes(caseId, code, filename, category, fileBytes, null, null, uploadedBy, uploadedAt);
    }

    private EvidenceItem ingestEvidenceInternalWithNotes(
            String caseId, String code, String filename, String category,
            byte[] fileBytes, String clientSha256, String supplementalNotes,
            String uploadedBy, String uploadedAt
    ) {
        try {
            String evId = "evd-" + UUID.randomUUID().toString().substring(0, 8);
            String safeFilename = filename != null ? filename.replaceAll("[^a-zA-Z0-9._\\-]", "_") : "artifact.bin";
            Path storedPath = vaultDir.resolve(evId + "_" + safeFilename);
            Path backupPath = vaultBackupDir.resolve(evId + "_" + safeFilename);

            Files.write(storedPath, fileBytes);
            Files.write(backupPath, fileBytes);

            DualHashResult hashes = CryptographicHashService.computeDualHash(storedPath);
            MetadataAnalysisResult metaResult = MetadataForensicsService.analyzeBytes(fileBytes, safeFilename);

            if (metaResult.maliciousExecutable()) {
                Files.deleteIfExists(storedPath);
                Files.deleteIfExists(backupPath);
                throw new IllegalArgumentException("Upload rejected: Disguised executable binary signature (ELF/PE) detected by magic-byte guard.");
            }

            OcrResult ocrResult = OcrExtractionService.extractOcrAndRegions(
                    fileBytes, metaResult.detectedMimeType(), safeFilename,
                    metaResult.embeddedOcrPayload(), supplementalNotes
            );

            EvidenceItem item = new EvidenceItem();
            item.id = evId;
            item.caseId = caseId;
            item.evidenceCode = code;
            item.originalFilename = safeFilename;
            item.evidenceCategory = category != null && !category.isBlank() ? category : "SCREENSHOT";
            item.detectedMimeType = metaResult.detectedMimeType();
            item.fileSizeBytes = hashes.byteCount();
            item.storagePath = storedPath.toString();
            item.sha256Hash = hashes.sha256();
            item.blake3Hash = hashes.blake3();
            item.clientProvidedSha256 = clientSha256 != null && !clientSha256.isBlank() ? clientSha256 : hashes.sha256();
            item.transitVerified = item.clientProvidedSha256.equalsIgnoreCase(hashes.sha256());
            item.integrityStatus = "VERIFIED_INTACT";
            item.exifMetadata.putAll(metaResult.exifMetadata());
            item.ocrRawText = ocrResult.rawText();
            item.ocrConfidence = ocrResult.averageConfidence();
            item.boundingBoxes.addAll(ocrResult.boundingBoxes());
            item.processingStage = "COMPLETED";
            item.timestampAnomaly = metaResult.timestampAnomaly();
            item.timestampAnomalyDetail = metaResult.timestampAnomalyDetail();
            item.uploadedBy = uploadedBy;
            item.uploadedAt = uploadedAt;
            item.lastVerifiedAt = uploadedAt;

            state.evidenceItems.add(item);

            // Run AI & Deterministic Entity/Relationship/Timeline extraction
            List<ExtractedEntity> existingCaseEntities = state.entities.stream()
                    .filter(e -> e.caseId.equals(caseId))
                    .toList();
            ExtractionBundle bundle = AiForensicExtractorService.analyzeEvidence(item, existingCaseEntities);

            for (ExtractedEntity ent : bundle.extractedEntities()) {
                boolean exists = state.entities.stream().anyMatch(e -> e.id.equals(ent.id));
                if (!exists) {
                    state.entities.add(ent);
                }
            }
            for (EntityRelationship rel : bundle.extractedRelationships()) {
                boolean duplicateEdge = state.relationships.stream().anyMatch(r ->
                        r.caseId.equals(caseId)
                                && ((r.sourceEntityId.equals(rel.sourceEntityId) && r.targetEntityId.equals(rel.targetEntityId))
                                || (r.sourceEntityId.equals(rel.targetEntityId) && r.targetEntityId.equals(rel.sourceEntityId)))
                                && r.relationshipType.equals(rel.relationshipType)
                );
                if (!duplicateEdge) {
                    state.relationships.add(rel);
                }
            }
            state.timelineEvents.addAll(bundle.extractedEvents());

            return item;
        } catch (IOException e) {
            throw new RuntimeException("Failed to ingest evidence item", e);
        }
    }

    /**
     * Recomputes JGraphT PageRank, Betweenness Centrality, Connected Clusters, and Case Risk Score.
     */
    public void recalculateCaseIntelligenceUnlocked(String caseId) {
        List<EvidenceItem> evs = state.evidenceItems.stream().filter(e -> e.caseId.equals(caseId)).toList();
        List<ExtractedEntity> ents = state.entities.stream().filter(e -> e.caseId.equals(caseId)).toList();
        List<EntityRelationship> rels = state.relationships.stream().filter(r -> r.caseId.equals(caseId)).toList();
        List<TimelineEvent> tl = state.timelineEvents.stream().filter(t -> t.caseId.equals(caseId)).toList();

        IncidentGraphService.enrichGraphMetrics(ents, rels);
        RiskEvaluation eval = RiskScoringService.evaluateCaseRisk(evs, ents, rels, tl);

        for (ForensicCase fc : state.cases) {
            if (fc.id.equals(caseId)) {
                fc.riskScore = eval.compositeRiskScore();
                fc.severity = eval.severityTier();
                fc.updatedAt = Instant.now().toString();
                break;
            }
        }
    }

    /**
     * Re-streams an evidence file from disk, recomputes SHA-256 & BLAKE3, and records an IntegrityVerification certificate.
     */
    public IntegrityVerification verifyEvidenceIntegrity(String evidenceId, String actorUsername) {
        lock.writeLock().lock();
        try {
            EvidenceItem ev = state.evidenceItems.stream()
                    .filter(e -> e.id.equals(evidenceId))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Evidence not found: " + evidenceId));

            Path path = Paths.get(ev.storagePath);
            DualHashResult computed = CryptographicHashService.computeDualHash(path);
            boolean match = ev.sha256Hash.equalsIgnoreCase(computed.sha256())
                    && ev.blake3Hash.equalsIgnoreCase(computed.blake3());

            String status = match ? "VERIFIED_INTACT" : "TAMPER_DETECTED";
            ev.integrityStatus = status;
            ev.lastVerifiedAt = Instant.now().toString();

            IntegrityVerification v = new IntegrityVerification();
            v.id = "ver-" + UUID.randomUUID().toString().substring(0, 8);
            v.caseId = ev.caseId;
            v.evidenceId = ev.id;
            v.evidenceCode = ev.evidenceCode;
            v.evidenceFilename = ev.originalFilename;
            v.expectedSha256 = ev.sha256Hash;
            v.computedSha256 = computed.sha256();
            v.expectedBlake3 = ev.blake3Hash;
            v.computedBlake3 = computed.blake3();
            v.status = status;
            v.verifiedBy = actorUsername;
            v.verifiedAt = ev.lastVerifiedAt;
            v.certificateSignature = CryptographicHashService.signForensicCertificate(
                    v.id + "|" + v.evidenceId + "|" + v.computedSha256 + "|" + v.computedBlake3 + "|" + v.status
            );

            state.verifications.add(0, v);
            recalculateCaseIntelligenceUnlocked(ev.caseId);

            appendLedgerUnlocked(ev.caseId, actorUsername, "AUDITOR",
                    match ? "INTEGRITY_VERIFIED_INTACT" : "CRITICAL_TAMPER_VIOLATION_DETECTED",
                    ev.evidenceCode + " (" + ev.originalFilename + ")",
                    "Expected SHA-256=" + ev.sha256Hash + " | Computed SHA-256=" + computed.sha256(),
                    "127.0.0.1");
            saveStateUnlocked();
            return v;
        } catch (IOException e) {
            throw new RuntimeException("Failed to verify evidence integrity", e);
        } finally {
            lock.writeLock().unlock();
        }
    }

    /**
     * Forensic Sandbox Feature: Simulates a 1-byte unauthorized modification on stored evidence
     * or restores the clean backup so investigators can demonstrate tamper detection live.
     */
    public IntegrityVerification simulateOrRestoreTamper(String evidenceId, boolean tamper, String actorUsername) {
        lock.writeLock().lock();
        try {
            EvidenceItem ev = state.evidenceItems.stream()
                    .filter(e -> e.id.equals(evidenceId))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Evidence not found: " + evidenceId));

            Path storedPath = Paths.get(ev.storagePath);
            Path backupPath = vaultBackupDir.resolve(storedPath.getFileName());

            if (tamper) {
                byte[] bytes = Files.readAllBytes(storedPath);
                byte[] modified = new byte[bytes.length + 1];
                System.arraycopy(bytes, 0, modified, 0, bytes.length);
                modified[bytes.length] = (byte) 0xFF; // Append 1 unauthorized byte
                Files.write(storedPath, modified);
                appendLedgerUnlocked(ev.caseId, actorUsername, "LEAD_INVESTIGATOR",
                        "SANDBOX_STORAGE_BYTE_ALTERATION",
                        ev.evidenceCode, "Appended 1 unauthorized byte (0xFF) to storage object to test tamper detection", "127.0.0.1");
            } else {
                if (Files.exists(backupPath)) {
                    Files.copy(backupPath, storedPath, StandardCopyOption.REPLACE_EXISTING);
                }
                appendLedgerUnlocked(ev.caseId, actorUsername, "LEAD_INVESTIGATOR",
                        "VAULT_IMMUTABLE_SNAPSHOT_RESTORED",
                        ev.evidenceCode, "Restored original WORM backup copy from immutable vault", "127.0.0.1");
            }
            return verifyEvidenceIntegrity(evidenceId, actorUsername);
        } catch (IOException e) {
            throw new RuntimeException("Tamper simulation failed", e);
        } finally {
            lock.writeLock().unlock();
        }
    }

    public void appendLedgerEntry(String caseId, String actorUsername, String actorRole,
                                  String actionType, String targetResource, String details, String clientIp) {
        lock.writeLock().lock();
        try {
            appendLedgerUnlocked(caseId, actorUsername, actorRole, actionType, targetResource, details, clientIp);
            saveStateUnlocked();
        } finally {
            lock.writeLock().unlock();
        }
    }

    private void appendLedgerUnlocked(String caseId, String actorUsername, String actorRole,
                                      String actionType, String targetResource, String details, String clientIp) {
        long seq = state.custodyLedger.size() + 1L;
        String prevHash = state.custodyLedger.isEmpty()
                ? "0000000000000000000000000000000000000000000000000000000000000000"
                : state.custodyLedger.get(0).entryHash;
        String now = Instant.now().toString();
        String entryHash = CryptographicHashService.computeLedgerEntryHash(
                seq, prevHash, actorUsername, actionType, targetResource, details, now
        );

        ChainOfCustodyEntry entry = new ChainOfCustodyEntry();
        entry.id = "log-" + UUID.randomUUID().toString().substring(0, 8);
        entry.sequenceNumber = seq;
        entry.caseId = caseId;
        entry.actorUsername = actorUsername;
        entry.actorRole = actorRole;
        entry.actionType = actionType;
        entry.targetResource = targetResource;
        entry.details = details;
        entry.clientIp = clientIp;
        entry.previousHash = prevHash;
        entry.entryHash = entryHash;
        entry.timestamp = now;

        state.custodyLedger.add(0, entry);
    }

    public Map<String, Object> verifyEntireAuditLedger() {
        lock.readLock().lock();
        try {
            List<ChainOfCustodyEntry> chronological = new ArrayList<>(state.custodyLedger);
            chronological.sort(Comparator.comparingLong(e -> e.sequenceNumber));

            String expectedPrev = "0000000000000000000000000000000000000000000000000000000000000000";
            boolean chainValid = true;
            Long brokenAtSequence = null;

            for (ChainOfCustodyEntry entry : chronological) {
                if (!entry.previousHash.equals(expectedPrev)) {
                    chainValid = false;
                    brokenAtSequence = entry.sequenceNumber;
                    break;
                }
                String recomputed = CryptographicHashService.computeLedgerEntryHash(
                        entry.sequenceNumber, entry.previousHash, entry.actorUsername,
                        entry.actionType, entry.targetResource, entry.details, entry.timestamp
                );
                if (!recomputed.equals(entry.entryHash)) {
                    chainValid = false;
                    brokenAtSequence = entry.sequenceNumber;
                    break;
                }
                expectedPrev = entry.entryHash;
            }

            Map<String, Object> res = new LinkedHashMap<>();
            res.put("chainIntact", chainValid);
            res.put("totalEntriesVerified", chronological.size());
            res.put("headMerkleHash", expectedPrev);
            res.put("brokenAtSequence", brokenAtSequence);
            res.put("verifiedAt", Instant.now().toString());
            return res;
        } finally {
            lock.readLock().unlock();
        }
    }

    // ========================================================================
    // Read & Mutation Query Methods
    // ========================================================================

    public User findUserByUsername(String username) {
        lock.readLock().lock();
        try {
            return state.users.stream()
                    .filter(u -> u.username.equalsIgnoreCase(username) || u.email.equalsIgnoreCase(username))
                    .findFirst()
                    .orElse(null);
        } finally {
            lock.readLock().unlock();
        }
    }

    public User findUserById(String userId) {
        lock.readLock().lock();
        try {
            return state.users.stream().filter(u -> u.id.equals(userId)).findFirst().orElse(null);
        } finally {
            lock.readLock().unlock();
        }
    }

    public List<User> listAllUsers() {
        lock.readLock().lock();
        try {
            return new ArrayList<>(state.users);
        } finally {
            lock.readLock().unlock();
        }
    }

    public User registerUser(String username, String email, String fullName, String password,
                             String role, String organization, String clientIp) {
        lock.writeLock().lock();
        try {
            String cleanUser = username.trim().toLowerCase(Locale.ROOT);
            String cleanEmail = email != null && !email.isBlank()
                    ? email.trim().toLowerCase(Locale.ROOT)
                    : cleanUser + "@cyberfusionx.gov.in";
            boolean exists = state.users.stream().anyMatch(u ->
                    u.username.equalsIgnoreCase(cleanUser) || u.email.equalsIgnoreCase(cleanEmail));
            if (exists) {
                throw new IllegalArgumentException("An investigator account with that username or email already exists.");
            }

            String validRole = switch (role != null ? role.toUpperCase(Locale.ROOT) : "FORENSIC_ANALYST") {
                case "LEAD_INVESTIGATOR", "FORENSIC_ANALYST", "AUDITOR" -> role.toUpperCase(Locale.ROOT);
                default -> "FORENSIC_ANALYST";
            };

            String salt = CryptographicHashService.generateSalt();
            String hash = CryptographicHashService.hashPassword(password, salt);
            String badge = String.format("CFX-INV-%03d", 100 + state.users.size() + 1);
            User created = new User(
                    "usr-" + UUID.randomUUID().toString().substring(0, 8),
                    cleanUser,
                    cleanEmail,
                    fullName != null && !fullName.isBlank() ? fullName.trim() : cleanUser,
                    validRole,
                    badge,
                    organization != null && !organization.isBlank()
                            ? organization.trim()
                            : "CyberFusion X Digital Forensics Taskforce",
                    hash,
                    salt,
                    false,
                    "3132333435363738393031323334353637383930",
                    Instant.now().toString()
            );

            state.users.add(created);
            appendLedgerUnlocked(null, created.username, created.role,
                    "INVESTIGATOR_REGISTERED", created.badgeNumber,
                    "Registered investigator account " + created.fullName + " [" + created.role + "]",
                    clientIp != null ? clientIp : "127.0.0.1");
            saveStateUnlocked();
            return created;
        } finally {
            lock.writeLock().unlock();
        }
    }

    public List<Map<String, Object>> listCasesWithStats() {
        lock.readLock().lock();
        try {
            List<Map<String, Object>> out = new ArrayList<>();
            for (ForensicCase c : state.cases) {
                out.add(buildCaseSummaryMapUnlocked(c));
            }
            return out;
        } finally {
            lock.readLock().unlock();
        }
    }

    public ForensicCase getCaseById(String caseId) {
        lock.readLock().lock();
        try {
            return state.cases.stream().filter(c -> c.id.equals(caseId)).findFirst().orElse(null);
        } finally {
            lock.readLock().unlock();
        }
    }

    public ForensicCase createCase(String title, String incidentType, String victimName,
                                   double estimatedLossUsd, String summary, User creator) {
        lock.writeLock().lock();
        try {
            ForensicCase c = new ForensicCase();
            c.id = "case-" + UUID.randomUUID().toString().substring(0, 8);
            c.caseNumber = String.format("CASE-2026-%04d", 840 + state.cases.size() + 1);
            c.title = title;
            c.incidentType = incidentType != null ? incidentType : "UPI_WIRE_FRAUD";
            c.status = "OPEN";
            c.severity = "MEDIUM";
            c.riskScore = 25;
            c.victimName = victimName != null ? victimName : "Corporate Investigation Subject";
            c.estimatedLossUsd = estimatedLossUsd;
            c.summary = summary != null && !summary.isBlank()
                    ? summary
                    : "Investigation initialized in CyberFusion X. Upload screenshots, receipts, or IOCs to reconstruct the incident.";
            c.leadInvestigatorId = creator != null ? creator.id : "usr-lead-01";
            c.leadInvestigatorName = creator != null ? creator.fullName : "Cmdr. Arjun Verma (Lead Forensics)";
            c.createdAt = Instant.now().toString();
            c.updatedAt = c.createdAt;

            state.cases.add(0, c);
            appendLedgerUnlocked(c.id, creator != null ? creator.username : "arjun.verma",
                    creator != null ? creator.role : "LEAD_INVESTIGATOR",
                    "CASE_CREATED", c.caseNumber, "Created investigation: " + c.title, "127.0.0.1");
            saveStateUnlocked();
            return c;
        } finally {
            lock.writeLock().unlock();
        }
    }

    public List<EvidenceItem> getEvidenceForCase(String caseId) {
        lock.readLock().lock();
        try {
            return state.evidenceItems.stream().filter(e -> e.caseId.equals(caseId)).toList();
        } finally {
            lock.readLock().unlock();
        }
    }

    public EvidenceItem getEvidenceById(String evidenceId) {
        lock.readLock().lock();
        try {
            return state.evidenceItems.stream().filter(e -> e.id.equals(evidenceId)).findFirst().orElse(null);
        } finally {
            lock.readLock().unlock();
        }
    }

    public List<ExtractedEntity> getEntitiesForCase(String caseId) {
        lock.readLock().lock();
        try {
            return state.entities.stream()
                    .filter(e -> e.caseId.equals(caseId))
                    .sorted(Comparator.comparingDouble((ExtractedEntity e) -> e.pagerankScore).reversed())
                    .toList();
        } finally {
            lock.readLock().unlock();
        }
    }

    public List<EntityRelationship> getRelationshipsForCase(String caseId) {
        lock.readLock().lock();
        try {
            return state.relationships.stream().filter(r -> r.caseId.equals(caseId)).toList();
        } finally {
            lock.readLock().unlock();
        }
    }

    public List<TimelineEvent> getTimelineForCase(String caseId) {
        lock.readLock().lock();
        try {
            return state.timelineEvents.stream()
                    .filter(t -> t.caseId.equals(caseId))
                    .sorted(Comparator.comparing(t -> t.eventTimestamp != null ? t.eventTimestamp : ""))
                    .toList();
        } finally {
            lock.readLock().unlock();
        }
    }

    public List<IntegrityVerification> getVerificationsForCase(String caseId) {
        lock.readLock().lock();
        try {
            return state.verifications.stream()
                    .filter(v -> caseId == null || caseId.isBlank() || v.caseId.equals(caseId))
                    .toList();
        } finally {
            lock.readLock().unlock();
        }
    }

    public List<ChainOfCustodyEntry> getAuditLedger(String caseId) {
        lock.readLock().lock();
        try {
            return state.custodyLedger.stream()
                    .filter(l -> caseId == null || caseId.isBlank() || caseId.equals(l.caseId))
                    .toList();
        } finally {
            lock.readLock().unlock();
        }
    }

    /**
     * Merges two duplicate or alias entities into a single primary entity and rewires graph edges.
     */
    public ExtractedEntity mergeEntities(String caseId, String primaryEntityId, String secondaryEntityId, String actorUsername) {
        lock.writeLock().lock();
        try {
            ExtractedEntity primary = state.entities.stream()
                    .filter(e -> e.id.equals(primaryEntityId) && e.caseId.equals(caseId))
                    .findFirst().orElseThrow(() -> new IllegalArgumentException("Primary entity not found"));
            ExtractedEntity secondary = state.entities.stream()
                    .filter(e -> e.id.equals(secondaryEntityId) && e.caseId.equals(caseId))
                    .findFirst().orElseThrow(() -> new IllegalArgumentException("Secondary entity not found"));

            for (String evId : secondary.evidenceIds) {
                if (!primary.evidenceIds.contains(evId)) primary.evidenceIds.add(evId);
            }
            primary.osintEnrichment.putAll(secondary.osintEnrichment);
            primary.osintEnrichment.put("MergedAlias", secondary.displayLabel);

            for (EntityRelationship rel : state.relationships) {
                if (rel.sourceEntityId.equals(secondaryEntityId)) rel.sourceEntityId = primaryEntityId;
                if (rel.targetEntityId.equals(secondaryEntityId)) rel.targetEntityId = primaryEntityId;
            }
            state.relationships.removeIf(r -> r.sourceEntityId.equals(r.targetEntityId));
            state.entities.removeIf(e -> e.id.equals(secondaryEntityId));

            recalculateCaseIntelligenceUnlocked(caseId);
            appendLedgerUnlocked(caseId, actorUsername, "LEAD_INVESTIGATOR", "ENTITIES_MERGED",
                    primary.displayLabel, "Merged alias '" + secondary.displayLabel + "' into '" + primary.displayLabel + "'", "127.0.0.1");
            saveStateUnlocked();
            return primary;
        } finally {
            lock.writeLock().unlock();
        }
    }

    /**
     * Adds a manual entity or custom relationship edge created by an analyst.
     */
    public EntityRelationship addCustomRelationship(String caseId, String sourceId, String targetId,
                                                    String relationshipType, String label, double weight, String actorUsername) {
        lock.writeLock().lock();
        try {
            EntityRelationship rel = new EntityRelationship();
            rel.id = "rel-" + UUID.randomUUID().toString().substring(0, 8);
            rel.caseId = caseId;
            rel.sourceEntityId = sourceId;
            rel.targetEntityId = targetId;
            rel.relationshipType = relationshipType != null ? relationshipType : "CORRELATED_WITH";
            rel.label = label != null && !label.isBlank() ? label : rel.relationshipType;
            rel.weight = weight > 0 ? weight : 2.5;
            rel.confidence = 0.98;
            rel.eventTimestamp = Instant.now().toString();
            state.relationships.add(rel);

            recalculateCaseIntelligenceUnlocked(caseId);
            appendLedgerUnlocked(caseId, actorUsername, "FORENSIC_ANALYST", "GRAPH_RELATIONSHIP_CREATED",
                    sourceId + " -> " + targetId, "Added relationship: " + rel.label, "127.0.0.1");
            saveStateUnlocked();
            return rel;
        } finally {
            lock.writeLock().unlock();
        }
    }

    public TimelineEvent addManualTimelineEvent(String caseId, String timestamp, String killChainPhase,
                                                String severity, String title, String description,
                                                String amountInvolved, String actorUsername) {
        lock.writeLock().lock();
        try {
            TimelineEvent ev = new TimelineEvent();
            ev.id = "evt-" + UUID.randomUUID().toString().substring(0, 8);
            ev.caseId = caseId;
            ev.evidenceCode = "ANALYST";
            ev.eventTimestamp = timestamp != null && !timestamp.isBlank() ? timestamp : Instant.now().toString();
            ev.timestampSource = "ANALYST_ANNOTATION";
            ev.killChainPhase = killChainPhase != null ? killChainPhase : "INITIAL_CONTACT";
            ev.severity = severity != null ? severity : "HIGH";
            ev.title = title;
            ev.description = description;
            ev.amountInvolved = amountInvolved;
            ev.confidence = 1.0;

            state.timelineEvents.add(ev);
            recalculateCaseIntelligenceUnlocked(caseId);
            appendLedgerUnlocked(caseId, actorUsername, "FORENSIC_ANALYST", "TIMELINE_EVENT_ADDED",
                    ev.title, "Added chronological event at " + ev.eventTimestamp, "127.0.0.1");
            saveStateUnlocked();
            return ev;
        } finally {
            lock.writeLock().unlock();
        }
    }

    /**
     * Global Search (Cmd+K) across cases, SHA-256/BLAKE3 hashes, entities, OCR text, and timeline events.
     */
    public Map<String, Object> globalSearch(String query) {
        lock.readLock().lock();
        try {
            String q = query != null ? query.trim().toLowerCase(Locale.ROOT) : "";
            Map<String, Object> results = new LinkedHashMap<>();
            if (q.isEmpty()) {
                results.put("cases", List.of());
                results.put("evidence", List.of());
                results.put("entities", List.of());
                results.put("timeline", List.of());
                return results;
            }

            results.put("cases", state.cases.stream()
                    .filter(c -> c.caseNumber.toLowerCase(Locale.ROOT).contains(q)
                            || c.title.toLowerCase(Locale.ROOT).contains(q)
                            || (c.victimName != null && c.victimName.toLowerCase(Locale.ROOT).contains(q)))
                    .limit(8).toList());

            results.put("evidence", state.evidenceItems.stream()
                    .filter(e -> e.originalFilename.toLowerCase(Locale.ROOT).contains(q)
                            || e.evidenceCode.toLowerCase(Locale.ROOT).contains(q)
                            || e.sha256Hash.toLowerCase(Locale.ROOT).contains(q)
                            || e.blake3Hash.toLowerCase(Locale.ROOT).contains(q)
                            || (e.ocrRawText != null && e.ocrRawText.toLowerCase(Locale.ROOT).contains(q)))
                    .limit(10).toList());

            results.put("entities", state.entities.stream()
                    .filter(en -> en.displayLabel.toLowerCase(Locale.ROOT).contains(q)
                            || en.normalizedValue.toLowerCase(Locale.ROOT).contains(q)
                            || en.entityType.toLowerCase(Locale.ROOT).contains(q))
                    .limit(12).toList());

            results.put("timeline", state.timelineEvents.stream()
                    .filter(t -> t.title.toLowerCase(Locale.ROOT).contains(q)
                            || t.description.toLowerCase(Locale.ROOT).contains(q))
                    .limit(8).toList());

            return results;
        } finally {
            lock.readLock().unlock();
        }
    }

    private Map<String, Object> buildCaseSummaryMapUnlocked(ForensicCase c) {
        List<EvidenceItem> evs = state.evidenceItems.stream().filter(e -> e.caseId.equals(c.id)).toList();
        List<ExtractedEntity> ents = state.entities.stream().filter(e -> e.caseId.equals(c.id)).toList();
        List<EntityRelationship> rels = state.relationships.stream().filter(r -> r.caseId.equals(c.id)).toList();
        List<TimelineEvent> tl = state.timelineEvents.stream().filter(t -> t.caseId.equals(c.id)).toList();
        RiskEvaluation riskEval = RiskScoringService.evaluateCaseRisk(evs, ents, rels, tl);

        long intactCount = evs.stream().filter(e -> "VERIFIED_INTACT".equals(e.integrityStatus)).count();
        long tamperedCount = evs.stream().filter(e -> "TAMPER_DETECTED".equals(e.integrityStatus)).count();
        long anomalyCount = evs.stream().filter(e -> e.timestampAnomaly).count();

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", c.id);
        map.put("caseNumber", c.caseNumber);
        map.put("title", c.title);
        map.put("incidentType", c.incidentType);
        map.put("status", c.status);
        map.put("severity", c.severity);
        map.put("riskScore", c.riskScore);
        map.put("summary", c.summary);
        map.put("victimName", c.victimName);
        map.put("estimatedLossUsd", c.estimatedLossUsd);
        map.put("leadInvestigatorId", c.leadInvestigatorId);
        map.put("leadInvestigatorName", c.leadInvestigatorName);
        map.put("createdAt", c.createdAt);
        map.put("updatedAt", c.updatedAt);
        map.put("evidenceCount", evs.size());
        map.put("entityCount", ents.size());
        map.put("relationshipCount", rels.size());
        map.put("timelineEventCount", tl.size());
        map.put("verifiedIntactCount", intactCount);
        map.put("tamperedCount", tamperedCount);
        map.put("metadataAnomalyCount", anomalyCount);
        map.put("riskIndicators", riskEval.indicators());
        return map;
    }

    public Map<String, Object> getFullCaseOverview(String caseId) {
        lock.readLock().lock();
        try {
            ForensicCase c = getCaseById(caseId);
            if (c == null) return null;
            return buildCaseSummaryMapUnlocked(c);
        } finally {
            lock.readLock().unlock();
        }
    }
}
