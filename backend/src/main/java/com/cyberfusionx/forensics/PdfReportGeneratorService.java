package com.cyberfusionx.forensics;

import com.cyberfusionx.crypto.CryptographicHashService;
import com.cyberfusionx.model.Models.ChainOfCustodyEntry;
import com.cyberfusionx.model.Models.EntityRelationship;
import com.cyberfusionx.model.Models.EvidenceItem;
import com.cyberfusionx.model.Models.ExtractedEntity;
import com.cyberfusionx.model.Models.ForensicCase;
import com.cyberfusionx.model.Models.RiskIndicator;
import com.cyberfusionx.model.Models.TimelineEvent;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Pure-Java Forensic Incident Report Generator:
 * 1. Native PDF 1.7 Binary Generator (multi-page court-ready forensic PDF)
 * 2. OASIS STIX 2.1 Cyber Threat Intelligence JSON Bundle Generator
 * 3. Comprehensive Markdown Incident Report Generator
 */
public final class PdfReportGeneratorService {

    public static byte[] generateForensicPdf(
            ForensicCase forensicCase,
            List<EvidenceItem> evidenceList,
            List<ExtractedEntity> entities,
            List<EntityRelationship> relationships,
            List<TimelineEvent> timeline,
            List<RiskIndicator> riskIndicators,
            List<ChainOfCustodyEntry> custodyLogs
    ) {
        List<String> lines = new ArrayList<>();
        String generatedAt = Instant.now().toString();
        String reportPayloadForSig = forensicCase.caseNumber + "|" + forensicCase.riskScore + "|" + evidenceList.size() + "|" + generatedAt;
        String reportSignature = CryptographicHashService.signForensicCertificate(reportPayloadForSig);

        lines.add("================================================================================");
        lines.add("CYBERFUSION X — DIGITAL FORENSICS & FRAUD RECONSTRUCTION REPORT");
        lines.add("================================================================================");
        lines.add("Case Number       : " + safe(forensicCase.caseNumber));
        lines.add("Investigation     : " + safe(forensicCase.title));
        lines.add("Incident Type     : " + safe(forensicCase.incidentType));
        lines.add("Status / Severity : " + safe(forensicCase.status) + " / " + safe(forensicCase.severity));
        lines.add("Composite Risk    : " + forensicCase.riskScore + " / 100");
        lines.add("Primary Victim    : " + safe(forensicCase.victimName));
        lines.add("Estimated Loss    : $" + String.format("%,.2f USD", forensicCase.estimatedLossUsd));
        lines.add("Lead Investigator : " + safe(forensicCase.leadInvestigatorName));
        lines.add("Report Generated  : " + generatedAt);
        lines.add("Digital Signature : " + reportSignature);
        lines.add("");
        lines.add("1. EXECUTIVE INCIDENT SUMMARY");
        lines.add("--------------------------------------------------------------------------------");
        wrapText(safe(forensicCase.summary), 78, lines);
        lines.add("");

        lines.add("2. CRYPTOGRAPHIC EVIDENCE MANIFEST (SHA-256 & BLAKE3)");
        lines.add("--------------------------------------------------------------------------------");
        for (EvidenceItem ev : evidenceList) {
            lines.add("* [" + safe(ev.evidenceCode) + "] " + safe(ev.originalFilename)
                    + " (" + safe(ev.detectedMimeType) + ", " + ev.fileSizeBytes + " bytes)");
            lines.add("  Integrity Status : " + safe(ev.integrityStatus)
                    + (ev.timestampAnomaly ? " [EXIF/TIMESTAMP ANOMALY FLAGGED]" : ""));
            lines.add("  SHA-256 Digest   : " + safe(ev.sha256Hash));
            lines.add("  BLAKE3 Digest    : " + safe(ev.blake3Hash));
            lines.add("");
        }

        lines.add("3. TRIGGERED FORENSIC RISK INDICATORS");
        lines.add("--------------------------------------------------------------------------------");
        for (RiskIndicator ri : riskIndicators) {
            lines.add("* [" + safe(ri.severity) + " | +" + ri.scoreImpact + " pts] " + safe(ri.title));
            lines.add("  MITRE / Taxonomy : " + safe(ri.mitreTechnique));
            wrapText("  Detail: " + safe(ri.description), 78, lines);
            lines.add("");
        }

        lines.add("4. CHRONOLOGICAL ATTACK TIMELINE RECONSTRUCTION");
        lines.add("--------------------------------------------------------------------------------");
        List<TimelineEvent> sortedTimeline = new ArrayList<>(timeline);
        sortedTimeline.sort(Comparator.comparing(e -> e.eventTimestamp != null ? e.eventTimestamp : ""));
        for (TimelineEvent te : sortedTimeline) {
            lines.add("* " + safe(te.eventTimestamp) + " | [" + safe(te.killChainPhase) + "] " + safe(te.title));
            if (te.amountInvolved != null && !te.amountInvolved.isBlank()) {
                lines.add("  Amount Involved  : " + safe(te.amountInvolved));
            }
            if (te.anomalyFlag) {
                lines.add("  FORENSIC ANOMALY : " + safe(te.anomalyReason));
            }
            wrapText("  " + safe(te.description), 78, lines);
            lines.add("");
        }

        lines.add("5. EXTRACTED ENTITIES & JGRAPHT CENTRALITY TOPOLOGY");
        lines.add("--------------------------------------------------------------------------------");
        List<ExtractedEntity> sortedEntities = new ArrayList<>(entities);
        sortedEntities.sort(Comparator.comparingDouble((ExtractedEntity e) -> e.pagerankScore).reversed());
        for (ExtractedEntity en : sortedEntities) {
            lines.add(String.format("* [%-14s] %-34s | Role: %-18s | PR: %.4f",
                    safe(en.entityType), truncate(safe(en.displayLabel), 34),
                    safe(en.roleInIncident), en.pagerankScore));
        }
        lines.add("");
        lines.add("Key Correlated Graph Edges (" + relationships.size() + " total):");
        for (int i = 0; i < Math.min(18, relationships.size()); i++) {
            EntityRelationship r = relationships.get(i);
            String srcLabel = findEntityLabel(entities, r.sourceEntityId);
            String dstLabel = findEntityLabel(entities, r.targetEntityId);
            lines.add("  " + srcLabel + " --[" + safe(r.label) + "]--> " + dstLabel);
        }
        lines.add("");

        lines.add("6. HASH-CHAINED CHAIN-OF-CUSTODY AUDIT LEDGER");
        lines.add("--------------------------------------------------------------------------------");
        for (int i = 0; i < Math.min(12, custodyLogs.size()); i++) {
            ChainOfCustodyEntry log = custodyLogs.get(i);
            lines.add(String.format("#%03d | %s | %s (%s) | %s",
                    log.sequenceNumber, safe(log.timestamp), safe(log.actorUsername),
                    safe(log.actorRole), safe(log.actionType)));
            lines.add("     Entry SHA-256 : " + safe(log.entryHash));
        }
        lines.add("================================================================================");
        lines.add("END OF SIGNED FORENSIC REPORT — VERIFIED BY CYBERFUSION X CRYPTO ENGINE");

        return buildMultiPagePdfBinary(lines, forensicCase.caseNumber, reportSignature);
    }

    public static String generateMarkdownReport(
            ForensicCase forensicCase,
            List<EvidenceItem> evidenceList,
            List<ExtractedEntity> entities,
            List<EntityRelationship> relationships,
            List<TimelineEvent> timeline,
            List<RiskIndicator> riskIndicators,
            List<ChainOfCustodyEntry> custodyLogs
    ) {
        String generatedAt = Instant.now().toString();
        String sig = CryptographicHashService.signForensicCertificate(
                forensicCase.caseNumber + "|" + forensicCase.riskScore + "|" + generatedAt);

        StringBuilder md = new StringBuilder();
        md.append("# 🧠 CyberFusion X — Forensic Incident Reconstruction Report\n\n");
        md.append("| Field | Value |\n| :--- | :--- |\n");
        md.append("| **Case Number** | `").append(safe(forensicCase.caseNumber)).append("` |\n");
        md.append("| **Title** | ").append(safe(forensicCase.title)).append(" |\n");
        md.append("| **Incident Classification** | `").append(safe(forensicCase.incidentType)).append("` |\n");
        md.append("| **Severity / Risk Score** | **").append(safe(forensicCase.severity)).append("** (`").append(forensicCase.riskScore).append(" / 100`) |\n");
        md.append("| **Primary Victim** | ").append(safe(forensicCase.victimName)).append(" |\n");
        md.append("| **Estimated Financial Exposure** | **$").append(String.format("%,.2f USD", forensicCase.estimatedLossUsd)).append("** |\n");
        md.append("| **Lead Investigator** | ").append(safe(forensicCase.leadInvestigatorName)).append(" |\n");
        md.append("| **Generated Timestamp (UTC)** | `").append(generatedAt).append("` |\n");
        md.append("| **HMAC-SHA256 Report Signature** | `").append(sig).append("` |\n\n");

        md.append("## 1. Executive Summary\n\n").append(safe(forensicCase.summary)).append("\n\n");

        md.append("## 2. Cryptographic Evidence Manifest\n\n");
        md.append("| Code | Filename | MIME | Size | Integrity Status | SHA-256 | BLAKE3 |\n");
        md.append("| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n");
        for (EvidenceItem ev : evidenceList) {
            md.append("| `").append(safe(ev.evidenceCode)).append("` | ")
              .append(safe(ev.originalFilename)).append(" | `")
              .append(safe(ev.detectedMimeType)).append("` | ")
              .append(ev.fileSizeBytes).append(" B | **")
              .append(safe(ev.integrityStatus)).append("** | `")
              .append(safe(ev.sha256Hash).substring(0, Math.min(16, safe(ev.sha256Hash).length()))).append("...` | `")
              .append(safe(ev.blake3Hash).substring(0, Math.min(16, safe(ev.blake3Hash).length()))).append("...` |\n");
        }
        md.append("\n");

        md.append("## 3. Triggered Risk Indicators\n\n");
        for (RiskIndicator ri : riskIndicators) {
            md.append("- **[").append(ri.severity).append(" | +").append(ri.scoreImpact).append(" pts] ")
              .append(ri.title).append("** (`").append(ri.mitreTechnique).append("`): ")
              .append(ri.description).append("\n");
        }
        md.append("\n");

        md.append("## 4. Chronological Attack Timeline\n\n");
        for (TimelineEvent te : timeline) {
            md.append("- **`").append(te.eventTimestamp).append("`** — **[").append(te.killChainPhase).append("]** ")
              .append(te.title).append(": ").append(te.description).append("\n");
        }
        md.append("\n");

        md.append("## 5. Extracted Entities & Graph Centrality\n\n");
        md.append("| Type | Entity | Role | Risk | PageRank | Betweenness |\n");
        md.append("| :--- | :--- | :--- | :--- | :--- | :--- |\n");
        for (ExtractedEntity en : entities) {
            md.append("| `").append(en.entityType).append("` | **").append(en.displayLabel).append("** | `")
              .append(en.roleInIncident).append("` | ").append(en.riskLevel).append(" | ")
              .append(String.format("%.4f", en.pagerankScore)).append(" | ")
              .append(String.format("%.4f", en.betweennessScore)).append(" |\n");
        }
        return md.toString();
    }

    public static Map<String, Object> generateStixBundle(
            ForensicCase forensicCase,
            List<EvidenceItem> evidenceList,
            List<ExtractedEntity> entities,
            List<EntityRelationship> relationships
    ) {
        Map<String, Object> bundle = new LinkedHashMap<>();
        bundle.put("type", "bundle");
        bundle.put("id", "bundle--" + UUID.randomUUID());
        bundle.put("spec_version", "2.1");

        List<Map<String, Object>> objects = new ArrayList<>();

        Map<String, Object> reportObj = new LinkedHashMap<>();
        reportObj.put("type", "report");
        reportObj.put("spec_version", "2.1");
        reportObj.put("id", "report--" + forensicCase.id);
        reportObj.put("created", Instant.now().toString());
        reportObj.put("name", forensicCase.caseNumber + ": " + forensicCase.title);
        reportObj.put("description", forensicCase.summary);
        reportObj.put("confidence", 95);
        objects.add(reportObj);

        for (ExtractedEntity en : entities) {
            Map<String, Object> obj = new LinkedHashMap<>();
            obj.put("type", "THREAT_ACTOR".equals(en.roleInIncident) ? "threat-actor" : "indicator");
            obj.put("spec_version", "2.1");
            obj.put("id", ("THREAT_ACTOR".equals(en.roleInIncident) ? "threat-actor--" : "indicator--") + en.id);
            obj.put("name", en.displayLabel);
            obj.put("entity_type", en.entityType);
            obj.put("normalized_value", en.normalizedValue);
            obj.put("pagerank_centrality", en.pagerankScore);
            obj.put("risk_level", en.riskLevel);
            objects.add(obj);
        }

        for (EntityRelationship rel : relationships) {
            Map<String, Object> relObj = new LinkedHashMap<>();
            relObj.put("type", "relationship");
            relObj.put("spec_version", "2.1");
            relObj.put("id", "relationship--" + rel.id);
            relObj.put("relationship_type", rel.relationshipType.toLowerCase().replace('_', '-'));
            relObj.put("source_ref", "indicator--" + rel.sourceEntityId);
            relObj.put("target_ref", "indicator--" + rel.targetEntityId);
            relObj.put("confidence", (int) (rel.confidence * 100));
            objects.add(relObj);
        }

        for (EvidenceItem ev : evidenceList) {
            Map<String, Object> artifact = new LinkedHashMap<>();
            artifact.put("type", "artifact");
            artifact.put("spec_version", "2.1");
            artifact.put("id", "artifact--" + ev.id);
            artifact.put("mime_type", ev.detectedMimeType);
            artifact.put("hashes", Map.of("SHA-256", ev.sha256Hash, "BLAKE3", ev.blake3Hash));
            artifact.put("integrity_status", ev.integrityStatus);
            objects.add(artifact);
        }

        bundle.put("objects", objects);
        return bundle;
    }

    /**
     * Builds a valid multi-page PDF 1.7 binary file from formatted report lines.
     */
    private static byte[] buildMultiPagePdfBinary(List<String> allLines, String caseNumber, String signature) {
        int linesPerPage = 50;
        List<List<String>> pages = new ArrayList<>();
        for (int i = 0; i < allLines.size(); i += linesPerPage) {
            pages.add(allLines.subList(i, Math.min(allLines.size(), i + linesPerPage)));
        }
        if (pages.isEmpty()) {
            pages.add(List.of("CyberFusion X Forensic Report"));
        }

        // Object layout:
        // 1: Catalog
        // 2: Pages
        // 3: Font (Courier)
        // 4: Font (Helvetica-Bold)
        // For each page p (0..P-1):
        //   pageObjId = 5 + p*2
        //   contentObjId = 6 + p*2
        int numPages = pages.size();
        int totalObjects = 4 + (numPages * 2);
        List<Integer> offsets = new ArrayList<>(totalObjects + 1);
        for (int i = 0; i <= totalObjects; i++) offsets.add(0);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        writeAscii(out, "%PDF-1.7\n%\u00E2\u00E3\u00CF\u00D3\n");

        // Obj 1: Catalog
        offsets.set(1, out.size());
        writeAscii(out, "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

        // Obj 2: Pages
        StringBuilder kids = new StringBuilder("[");
        for (int p = 0; p < numPages; p++) {
            if (p > 0) kids.append(" ");
            kids.append(5 + p * 2).append(" 0 R");
        }
        kids.append("]");
        offsets.set(2, out.size());
        writeAscii(out, "2 0 obj\n<< /Type /Pages /Kids " + kids + " /Count " + numPages + " >>\nendobj\n");

        // Obj 3: Courier font
        offsets.set(3, out.size());
        writeAscii(out, "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n");

        // Obj 4: Helvetica-Bold font
        offsets.set(4, out.size());
        writeAscii(out, "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n");

        for (int p = 0; p < numPages; p++) {
            int pageObjId = 5 + p * 2;
            int contentObjId = 6 + p * 2;

            StringBuilder stream = new StringBuilder();
            // Dark Navy Header Banner
            stream.append("0.05 0.08 0.16 rg 36 742 540 32 re f\n");
            stream.append("0.06 0.72 0.51 rg 36 740 540 2 re f\n");
            stream.append("BT /F2 10 Tf 1 1 1 rg 46 754 Td (CYBERFUSION X FORENSIC INTELLIGENCE  |  CASE: ")
                  .append(escapePdf(caseNumber))
                  .append("  |  PAGE ").append(p + 1).append(" OF ").append(numPages).append(") Tj ET\n");

            stream.append("BT /F1 8.2 Tf 0.1 0.12 0.18 rg 40 722 Td 13 TL\n");
            for (String line : pages.get(p)) {
                stream.append("(").append(escapePdf(line)).append(") '\n");
            }
            stream.append("ET\n");

            // Footer signature bar
            stream.append("0.4 0.45 0.55 rg BT /F1 7 Tf 40 26 Td (SHA-256 SIGNED CHAIN OF CUSTODY: ")
                  .append(escapePdf(signature.substring(0, Math.min(48, signature.length()))))
                  .append("...) Tj ET\n");

            byte[] streamBytes = stream.toString().getBytes(StandardCharsets.US_ASCII);

            offsets.set(pageObjId, out.size());
            writeAscii(out, pageObjId + " 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
                    + "/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents " + contentObjId + " 0 R >>\nendobj\n");

            offsets.set(contentObjId, out.size());
            writeAscii(out, contentObjId + " 0 obj\n<< /Length " + streamBytes.length + " >>\nstream\n");
            out.writeBytes(streamBytes);
            writeAscii(out, "\nendstream\nendobj\n");
        }

        int xrefOffset = out.size();
        writeAscii(out, "xref\n0 " + (totalObjects + 1) + "\n");
        writeAscii(out, "0000000000 65535 f \n");
        for (int i = 1; i <= totalObjects; i++) {
            writeAscii(out, String.format("%010d 00000 n \n", offsets.get(i)));
        }
        writeAscii(out, "trailer\n<< /Size " + (totalObjects + 1) + " /Root 1 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF\n");
        return out.toByteArray();
    }

    private static void writeAscii(ByteArrayOutputStream out, String s) {
        out.writeBytes(s.getBytes(StandardCharsets.ISO_8859_1));
    }

    private static String escapePdf(String text) {
        if (text == null) return "";
        StringBuilder sb = new StringBuilder(text.length());
        for (char c : text.toCharArray()) {
            if (c == '(' || c == ')' || c == '\\') {
                sb.append('\\').append(c);
            } else if (c >= 32 && c <= 126) {
                sb.append(c);
            } else {
                sb.append(' ');
            }
        }
        return sb.toString();
    }

    private static void wrapText(String text, int width, List<String> out) {
        if (text == null || text.isBlank()) return;
        String[] words = text.split("\\s+");
        StringBuilder current = new StringBuilder();
        for (String w : words) {
            if (current.length() + w.length() + 1 > width) {
                out.add(current.toString());
                current.setLength(0);
            }
            if (current.length() > 0) current.append(' ');
            current.append(w);
        }
        if (current.length() > 0) {
            out.add(current.toString());
        }
    }

    private static String findEntityLabel(List<ExtractedEntity> entities, String id) {
        for (ExtractedEntity e : entities) {
            if (e.id.equals(id)) return e.displayLabel;
        }
        return id;
    }

    private static String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max - 3) + "...";
    }

    private static String safe(String s) {
        return s != null ? s : "N/A";
    }
}
