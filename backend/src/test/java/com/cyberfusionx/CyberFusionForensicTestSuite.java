package com.cyberfusionx;

import com.cyberfusionx.crypto.CryptographicHashService;
import com.cyberfusionx.crypto.CryptographicHashService.DualHashResult;
import com.cyberfusionx.db.ForensicDataStore;
import com.cyberfusionx.forensics.AiForensicExtractorService;
import com.cyberfusionx.forensics.IncidentGraphService;
import com.cyberfusionx.forensics.MetadataForensicsService;
import com.cyberfusionx.forensics.MetadataForensicsService.MetadataAnalysisResult;
import com.cyberfusionx.forensics.PdfReportGeneratorService;
import com.cyberfusionx.forensics.RiskScoringService;
import com.cyberfusionx.model.Models.*;
import org.junit.Assert;
import org.junit.Test;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * JUnit 4 Test Suite verifying Cryptography (SHA-256 & BLAKE3 official vectors),
 * Magic-Byte Security Guard, Jaro-Winkler Entity Resolution, JGraphT PageRank &
 * Dijkstra Shortest-Path, Tamper Simulation, and PDF 1.7 Binary Generation.
 */
public class CyberFusionForensicTestSuite {

    @Test
    public void testOfficialSha256AndBlake3CryptographicVectors() throws Exception {
        // Official NIST SHA-256 empty string vector
        String emptySha256 = CryptographicHashService.sha256Hex("");
        Assert.assertEquals("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", emptySha256);

        // Official BLAKE3 empty string vector (af1349b9f5f9a1a6a0404dea36dcc9499bcb25c9adc112b7cc9a93cae41f3262)
        String emptyBlake3 = CryptographicHashService.blake3Hex("");
        Assert.assertEquals("af1349b9f5f9a1a6a0404dea36dcc9499bcb25c9adc112b7cc9a93cae41f3262", emptyBlake3);

        // Multi-chunk streaming DualHashResult test (2048 bytes > 1024-byte BLAKE3 chunk boundary)
        byte[] payload = "CyberFusionX-Forensic-Evidence-Block-".repeat(60).getBytes(StandardCharsets.UTF_8);
        DualHashResult dual = CryptographicHashService.computeDualHash(new ByteArrayInputStream(payload));
        Assert.assertEquals(payload.length, dual.byteCount());
        Assert.assertEquals(CryptographicHashService.sha256Hex(payload), dual.sha256());
        Assert.assertEquals(CryptographicHashService.blake3Hex(payload), dual.blake3());
    }

    @Test
    public void testPasswordHashingJwtAndTotpAuthentication() {
        String salt = CryptographicHashService.generateSalt();
        String hash = CryptographicHashService.hashPassword("Forensics@2026", salt);
        Assert.assertTrue(CryptographicHashService.verifyPassword("Forensics@2026", salt, hash));
        Assert.assertFalse(CryptographicHashService.verifyPassword("WrongPassword", salt, hash));

        String jwt = CryptographicHashService.issueJwt(
                "usr-lead-01", "arjun.verma", "LEAD_INVESTIGATOR", "Cmdr. Arjun Verma", "CFX-IND-001"
        );
        Map<String, Object> claims = CryptographicHashService.verifyJwt(jwt);
        Assert.assertNotNull(claims);
        Assert.assertEquals("arjun.verma", claims.get("username"));
        Assert.assertEquals("LEAD_INVESTIGATOR", claims.get("role"));

        // Tampered JWT must fail signature verification
        String tamperedJwt = jwt.substring(0, jwt.length() - 4) + "AAAA";
        Assert.assertNull(CryptographicHashService.verifyJwt(tamperedJwt));

        // TOTP generation & verification
        String hexSecret = "3132333435363738393031323334353637383930";
        String otp = CryptographicHashService.generateTotpCode(hexSecret, Instant.now().getEpochSecond());
        Assert.assertEquals(6, otp.length());
        Assert.assertTrue(CryptographicHashService.verifyTotpCode(hexSecret, otp));
    }

    @Test
    public void testMagicByteDetectionAndDisguisedExecutableRejection() {
        // Spoofed ELF executable pretending to be a PNG image
        byte[] fakePngElf = new byte[]{0x7F, 'E', 'L', 'F', 0x02, 0x01, 0x01, 0x00};
        MetadataAnalysisResult elfResult = MetadataForensicsService.analyzeBytes(fakePngElf, "screenshot.png");
        Assert.assertTrue(elfResult.maliciousExecutable());
        Assert.assertEquals("application/x-executable", elfResult.detectedMimeType());

        // Valid PNG magic header
        byte[] pngHeader = new byte[]{(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0};
        Assert.assertEquals("image/png", MetadataForensicsService.detectMagicByteMime(pngHeader, "capture.png"));
    }

    @Test
    public void testEntityNormalizationAndJaroWinklerSimilarity() {
        Assert.assertEquals("+919820411892", AiForensicExtractorService.normalizePhoneE164("9820411892"));
        Assert.assertEquals("https://secure-hdfc-kyc-update.top/auth-login",
                AiForensicExtractorService.normalizeUrl("HTTPS://SECURE-HDFC-KYC-UPDATE.TOP/auth-login"));

        double sim = AiForensicExtractorService.computeJaroWinklerSimilarity("vikram singh", "vikram singh");
        Assert.assertEquals(1.0, sim, 0.001);

        double nearSim = AiForensicExtractorService.computeJaroWinklerSimilarity("vikram singh", "vikram singh l1");
        Assert.assertTrue(nearSim > 0.90);
    }

    @Test
    public void testJGraphTPageRankBetweennessAndDijkstraShortestPath() {
        ForensicDataStore store = ForensicDataStore.getInstance();
        List<ExtractedEntity> entities = store.getEntitiesForCase("case-phantom-upi-01");
        List<EntityRelationship> relationships = store.getRelationshipsForCase("case-phantom-upi-01");

        Assert.assertFalse("Sample case entities must not be empty", entities.isEmpty());
        Assert.assertFalse("Sample case relationships must not be empty", relationships.isEmpty());

        double totalPageRank = entities.stream().mapToDouble(e -> e.pagerankScore).sum();
        Assert.assertTrue("PageRank scores must be positive and normalized", totalPageRank > 0.85 && totalPageRank < 1.15);

        // Find path between first and last entity in the case
        String sourceId = entities.get(0).id;
        String targetId = entities.get(entities.size() - 1).id;
        ShortestPathResult path = IncidentGraphService.findShortestPath(entities, relationships, sourceId, targetId);
        Assert.assertNotNull(path);
        Assert.assertTrue("Connected fraud network should have a valid path", path.pathFound);
    }

    @Test
    public void testForensicTamperSimulationAndImmutableRecovery() {
        ForensicDataStore store = ForensicDataStore.getInstance();
        List<EvidenceItem> evidence = store.getEvidenceForCase("case-phantom-upi-01");
        Assert.assertFalse(evidence.isEmpty());
        String evidenceId = evidence.get(0).id;

        // 1. Initial verification should be VERIFIED_INTACT
        IntegrityVerification v1 = store.verifyEvidenceIntegrity(evidenceId, "rohan.kulkarni");
        Assert.assertEquals("VERIFIED_INTACT", v1.status);
        Assert.assertEquals(v1.expectedSha256, v1.computedSha256);

        // 2. Simulate 1-byte storage tamper -> must trigger TAMPER_DETECTED
        IntegrityVerification vTampered = store.simulateOrRestoreTamper(evidenceId, true, "arjun.verma");
        Assert.assertEquals("TAMPER_DETECTED", vTampered.status);
        Assert.assertNotEquals(vTampered.expectedSha256, vTampered.computedSha256);
        Assert.assertNotEquals(vTampered.expectedBlake3, vTampered.computedBlake3);

        // 3. Restore original WORM backup -> must return to VERIFIED_INTACT
        IntegrityVerification vRestored = store.simulateOrRestoreTamper(evidenceId, false, "arjun.verma");
        Assert.assertEquals("VERIFIED_INTACT", vRestored.status);
        Assert.assertEquals(vRestored.expectedSha256, vRestored.computedSha256);
    }

    @Test
    public void testAuditLedgerHashChainAndPdfReportGeneration() {
        ForensicDataStore store = ForensicDataStore.getInstance();
        Map<String, Object> ledgerCheck = store.verifyEntireAuditLedger();
        Assert.assertEquals(Boolean.TRUE, ledgerCheck.get("chainIntact"));

        String caseId = "case-phantom-upi-01";
        ForensicCase fc = store.getCaseById(caseId);
        List<EvidenceItem> evs = store.getEvidenceForCase(caseId);
        List<ExtractedEntity> ents = store.getEntitiesForCase(caseId);
        List<EntityRelationship> rels = store.getRelationshipsForCase(caseId);
        List<TimelineEvent> tl = store.getTimelineForCase(caseId);
        List<ChainOfCustodyEntry> logs = store.getAuditLedger(caseId);
        var risk = RiskScoringService.evaluateCaseRisk(evs, ents, rels, tl);

        byte[] pdfBytes = PdfReportGeneratorService.generateForensicPdf(
                fc, evs, ents, rels, tl, risk.indicators(), logs
        );
        String header = new String(pdfBytes, 0, 8, StandardCharsets.US_ASCII);
        String trailer = new String(pdfBytes, pdfBytes.length - 16, 16, StandardCharsets.US_ASCII);
        Assert.assertTrue("PDF must start with %PDF-1.7", header.startsWith("%PDF-1.7"));
        Assert.assertTrue("PDF must end with %%EOF", trailer.contains("%%EOF"));
    }

    @Test
    public void testInvestigatorRegistrationAndCredentialVerification() {
        ForensicDataStore store = ForensicDataStore.getInstance();
        String uniqueUser = "inv.test." + System.currentTimeMillis();
        User created = store.registerUser(
                uniqueUser,
                uniqueUser + "@cyberfusionx.gov.in",
                "Insp. Test Investigator",
                "TestPass#2026",
                "FORENSIC_ANALYST",
                "CyberFusion X Lab",
                "127.0.0.1"
        );
        Assert.assertNotNull("Registered user must not be null", created);
        Assert.assertEquals("FORENSIC_ANALYST", created.role);
        Assert.assertTrue(
                "PBKDF2 password must verify",
                CryptographicHashService.verifyPassword("TestPass#2026", created.passwordSalt, created.passwordHash)
        );
        Assert.assertFalse(
                "Wrong password must not verify",
                CryptographicHashService.verifyPassword("WrongPass", created.passwordSalt, created.passwordHash)
        );
    }
}
