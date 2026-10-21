package com.cyberfusionx.servlet;

import com.cyberfusionx.container.ServletJsonHelper;
import com.cyberfusionx.db.ForensicDataStore;
import com.cyberfusionx.forensics.PdfReportGeneratorService;
import com.cyberfusionx.forensics.RiskScoringService;
import com.cyberfusionx.model.Models.EvidenceItem;
import com.cyberfusionx.model.Models.ExtractedEntity;
import com.cyberfusionx.model.Models.ForensicCase;
import com.cyberfusionx.model.Models.FreezeRequest;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Officer API: Golden-Hour triage queue, per-case Action Card, freeze packets,
 * workflow updates, related (cross-case) complaints, analytics, BSA draft.
 * All routes require a valid officer JWT (enforced by AuthenticationAndRbacFilter).
 */
@WebServlet(name = "OfficerServlet", urlPatterns = {"/api/v1/officer/*"})
public class OfficerServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        ForensicDataStore store = ForensicDataStore.getInstance();
        String path = req.getPathInfo() != null ? req.getPathInfo() : "";

        if ("/triage".equals(path)) {
            List<Map<String, Object>> queue = new ArrayList<>();
            for (Map<String, Object> c : store.listCasesWithStats()) {
                if ("DRAFT".equals(String.valueOf(c.get("status")))) continue;
                Map<String, Object> row = new LinkedHashMap<>(c);
                String caseId = String.valueOf(c.get("id"));
                row.put("destination", primaryDestination(store, caseId));
                row.put("minutesSinceIncident", minutesSince(String.valueOf(c.get("incidentAt"))));
                queue.add(row);
            }
            queue.sort(Comparator.comparingInt((Map<String, Object> r) ->
                    r.get("urgencyScore") instanceof Number n ? n.intValue() : 0).reversed());
            ServletJsonHelper.writeJson(resp, 200, Map.of("queue", queue));
            return;
        }

        if ("/analytics".equals(path)) {
            ServletJsonHelper.writeJson(resp, 200, store.analyticsSummary());
            return;
        }

        String[] seg = split(path); // cases/{id}/...
        if (seg.length >= 2 && "cases".equals(seg[0])) {
            String caseId = seg[1];
            ForensicCase fc = store.getCaseById(caseId);
            if (fc == null) { ServletJsonHelper.writeError(resp, 404, "Case not found: " + caseId); return; }

            if (seg.length == 3 && "action-card".equals(seg[2])) {
                ServletJsonHelper.writeJson(resp, 200, buildActionCard(store, fc));
                return;
            }
            if (seg.length == 3 && "related".equals(seg[2])) {
                ServletJsonHelper.writeJson(resp, 200, Map.of("related", store.findRelatedCases(caseId)));
                return;
            }
            if (seg.length == 3 && "pipeline".equals(seg[2])) {
                // Full process flow: every stage state is derived from real records.
                ServletJsonHelper.writeJson(resp, 200, store.casePipeline(caseId));
                return;
            }
            if (seg.length == 3 && "activity".equals(seg[2])) {
                ServletJsonHelper.writeJson(resp, 200, Map.of("activity", store.caseActivity(caseId)));
                return;
            }
            if (seg.length == 3 && "certificate.pdf".equals(seg[2])) {
                byte[] pdf = PdfReportGeneratorService.generateBsa63DraftPdf(fc, store.getEvidenceForCase(caseId));
                writePdf(resp, pdf, fc.caseNumber + "_BSA63_DRAFT.pdf");
                store.appendLedgerEntry(caseId, ServletJsonHelper.getActorUsername(req),
                        ServletJsonHelper.getActorRole(req), "BSA63_DRAFT_GENERATED", fc.caseNumber,
                        "Generated BSA Section 63 certificate draft", req.getRemoteAddr());
                return;
            }
            if (seg.length == 4 && "packet.pdf".equals(seg[3])) {
                FreezeRequest fr = store.getFreezeRequestsForCase(caseId).stream()
                        .filter(f -> f.id.equals(seg[2])).findFirst().orElse(null);
                if (fr == null) { ServletJsonHelper.writeError(resp, 404, "Freeze request not found"); return; }
                byte[] pdf = PdfReportGeneratorService.generateFreezePacketPdf(fc, fr,
                        fc.leadInvestigatorName, store.computeCaseSeal(caseId));
                writePdf(resp, pdf, fc.caseNumber + "_FreezePacket_" + fr.id + ".pdf");
                return;
            }
        }
        ServletJsonHelper.writeError(resp, 404, "Unknown officer endpoint: " + path);
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        ForensicDataStore store = ForensicDataStore.getInstance();
        String path = req.getPathInfo() != null ? req.getPathInfo() : "";
        String[] seg = split(path);
        if (seg.length == 3 && "cases".equals(seg[0])) {
            String caseId = seg[1];
            String action = seg[2];
            ForensicCase fc = store.getCaseById(caseId);
            if (fc == null) { ServletJsonHelper.writeError(resp, 404, "Case not found: " + caseId); return; }
            Map<String, Object> body = ServletJsonHelper.readJsonMap(req);
            String actor = ServletJsonHelper.getActorUsername(req);

            if ("freeze".equals(action)) {
                String accountRef = ServletJsonHelper.getString(body, "accountRef", "");
                if (accountRef.isBlank()) {
                    ServletJsonHelper.writeError(resp, 400, "accountRef (beneficiary UPI/account) is required");
                    return;
                }
                long amount = ServletJsonHelper.getLong(body, "amountPaise", fc.amountLostPaise);
                FreezeRequest fr = store.createAndSendFreezeRequest(caseId, accountRef,
                        ServletJsonHelper.getString(body, "bankName", ""),
                        ServletJsonHelper.getString(body, "ifsc", ""),
                        ServletJsonHelper.getString(body, "utr", ""),
                        amount, actor);
                Map<String, Object> out = new LinkedHashMap<>();
                out.put("freezeRequest", fr);
                out.put("simulation", true);
                out.put("note", "Mock bank acknowledgement for demonstration. In production this packet goes via I4C/CFCFRMS to the bank nodal officer.");
                out.put("packetPdfUrl", "/api/v1/officer/cases/" + caseId + "/" + fr.id + "/packet.pdf");
                ServletJsonHelper.writeJson(resp, 201, out);
                return;
            }
            if ("workflow".equals(action)) {
                ForensicCase updated = store.updateCaseWorkflow(caseId,
                        ServletJsonHelper.getString(body, "status", ""),
                        ServletJsonHelper.getString(body, "assignedOfficerId", ""),
                        actor,
                        ServletJsonHelper.getString(body, "citizenNote", ""));
                ServletJsonHelper.writeJson(resp, 200, store.getFullCaseOverview(updated.id));
                return;
            }
        }
        ServletJsonHelper.writeError(resp, 404, "Unknown officer endpoint: " + path);
    }

    private Map<String, Object> buildActionCard(ForensicDataStore store, ForensicCase fc) {
        List<ExtractedEntity> entities = store.getEntitiesForCase(fc.id);
        List<EvidenceItem> evidence = store.getEvidenceForCase(fc.id);
        Map<String, Integer> cross = store.crossCaseCountsUnlocked(fc.id);
        int maxCross = cross.values().stream().mapToInt(Integer::intValue).max().orElse(0);
        RiskScoringService.UrgencyEvaluation urg = RiskScoringService.evaluateUrgency(fc, maxCross, evidence.size(), entities.size());

        List<Map<String, Object>> destinations = new ArrayList<>();
        List<String> utrs = new ArrayList<>();
        List<String> ifscs = new ArrayList<>();
        for (ExtractedEntity e : entities) {
            if ("UPI_ID".equals(e.entityType) || "BANK_ACCOUNT".equals(e.entityType)) {
                Map<String, Object> d = new LinkedHashMap<>();
                d.put("type", e.entityType);
                d.put("value", e.normalizedValue);
                d.put("label", e.displayLabel);
                d.put("bank", e.osintEnrichment.getOrDefault("PSPBank", ""));
                d.put("confidence", e.confidenceScore);
                d.put("evidenceIds", e.evidenceIds);
                d.put("seenInOtherComplaints",
                        cross.getOrDefault(e.entityType + "::" + e.normalizedValue.toLowerCase(), 0));
                destinations.add(d);
            } else if ("TRANSACTION_ID".equals(e.entityType)) {
                utrs.add(e.normalizedValue);
            } else if ("IFSC".equals(e.entityType)) {
                ifscs.add(e.normalizedValue);
            }
        }

        List<String> recommended = new ArrayList<>();
        if (fc.amountLostPaise > 0 && !destinations.isEmpty()) {
            recommended.add("Confirm the destination below against the receipt, then send the freeze/hold packet.");
        }
        if (maxCross > 0) recommended.add("Review related complaints — a shared destination suggests an organised ring; consider a joint investigation.");
        if (evidence.stream().anyMatch(e -> e.needsReview)) recommended.add("Read the files marked 'needs manual reading' — details may be missing from extraction.");
        if (fc.amountLostPaise > 0 && utrs.isEmpty()) recommended.add("Ask the citizen for the UPI Ref/UTR number — banks need it to place a hold.");
        if ("HARASSMENT_THREATS".equals(fc.incidentType)) recommended.add("Victim-safety case: contact the complainant, advise blocking after evidence is saved.");
        if (recommended.isEmpty()) recommended.add("Review evidence and move the case to Investigating.");

        List<String> legal = suggestedLegalSections(fc.incidentType);

        Map<String, Object> card = new LinkedHashMap<>();
        card.put("case", store.getFullCaseOverview(fc.id));
        card.put("destinations", destinations);
        card.put("utrs", utrs);
        card.put("ifscs", ifscs);
        card.put("urgencyScore", urg.urgencyScore());
        card.put("urgencyReasons", urg.reasons());
        card.put("minutesSinceIncident", minutesSince(fc.incidentAt));
        card.put("related", store.findRelatedCases(fc.id));
        card.put("freezeRequests", store.getFreezeRequestsForCase(fc.id));
        card.put("recommendedActions", recommended);
        card.put("suggestedLegalSections", legal);
        card.put("legalNote", "Suggestions only — the investigating officer must confirm applicable sections. Final legal framing is a human decision.");
        return card;
    }

    /** Officer-confirmable starting points only (IT Act / BNS commonly used for these fact patterns). */
    private List<String> suggestedLegalSections(String incidentType) {
        if (incidentType == null) return List.of();
        return switch (incidentType) {
            case "UPI_PAYMENT_FRAUD", "FAKE_JOB_INVESTMENT" -> List.of(
                    "BNS Sec. 318 — Cheating",
                    "BNS Sec. 319 — Cheating by personation",
                    "IT Act Sec. 66C — Identity theft",
                    "IT Act Sec. 66D — Cheating by personation using computer resource");
            case "PHISHING_LINK", "ACCOUNT_HACKED" -> List.of(
                    "IT Act Sec. 43 + 66 — Unauthorised access / computer-related offences",
                    "IT Act Sec. 66C — Identity theft",
                    "IT Act Sec. 66D — Cheating by personation using computer resource",
                    "BNS Sec. 318 — Cheating");
            case "HARASSMENT_THREATS" -> List.of(
                    "BNS Sec. 351 — Criminal intimidation",
                    "BNS Sec. 308 — Extortion (if money demanded)",
                    "IT Act Sec. 66D — Cheating by personation (if impersonating officials)");
            default -> List.of("BNS Sec. 318 — Cheating (confirm after fact review)");
        };
    }

    private String primaryDestination(ForensicDataStore store, String caseId) {
        return store.getEntitiesForCase(caseId).stream()
                .filter(e -> "UPI_ID".equals(e.entityType) || "BANK_ACCOUNT".equals(e.entityType))
                .map(e -> e.displayLabel).findFirst().orElse("");
    }

    private Long minutesSince(String iso) {
        if (iso == null || iso.isBlank() || "null".equals(iso)) return null;
        try { return Math.max(0, Duration.between(Instant.parse(iso), Instant.now()).toMinutes()); }
        catch (Exception e) { return null; }
    }

    private void writePdf(HttpServletResponse resp, byte[] pdf, String filename) throws IOException {
        resp.setStatus(200);
        resp.setContentType("application/pdf");
        resp.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");
        resp.getOutputStream().write(pdf);
    }

    private static String[] split(String path) {
        String clean = path.startsWith("/") ? path.substring(1) : path;
        return clean.isBlank() ? new String[0] : clean.split("/");
    }
}
