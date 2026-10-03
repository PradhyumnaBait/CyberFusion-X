package com.cyberfusionx.servlet;

import com.cyberfusionx.container.ServletJsonHelper;
import com.cyberfusionx.crypto.CryptographicHashService;
import com.cyberfusionx.db.ForensicDataStore;
import com.cyberfusionx.forensics.PdfReportGeneratorService;
import com.cyberfusionx.forensics.RiskScoringService;
import com.cyberfusionx.forensics.RiskScoringService.RiskEvaluation;
import com.cyberfusionx.model.Models.*;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Jakarta @WebServlet generating structured Forensic Incident Reports:
 * - JSON Structured Report (/api/v1/reports?caseId=...)
 * - Binary PDF 1.7 Report (/api/v1/reports/pdf?caseId=...)
 * - OASIS STIX 2.1 Cyber Threat Intelligence Bundle (/api/v1/reports/stix?caseId=...)
 * - Markdown Report (/api/v1/reports/markdown?caseId=...)
 */
@WebServlet(name = "ReportServlet", urlPatterns = {"/api/v1/reports/*"})
public class ReportServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        ForensicDataStore store = ForensicDataStore.getInstance();
        String pathInfo = req.getPathInfo() != null ? req.getPathInfo() : "";
        String caseId = req.getParameter("caseId");
        String actorUsername = ServletJsonHelper.getActorUsername(req);
        String actorRole = ServletJsonHelper.getActorRole(req);

        if (caseId == null || caseId.isBlank()) {
            ServletJsonHelper.writeError(resp, 400, "Query parameter 'caseId' is required");
            return;
        }

        ForensicCase fc = store.getCaseById(caseId);
        if (fc == null) {
            ServletJsonHelper.writeError(resp, 404, "Forensic case not found: " + caseId);
            return;
        }

        List<EvidenceItem> evidence = store.getEvidenceForCase(caseId);
        List<ExtractedEntity> entities = store.getEntitiesForCase(caseId);
        List<EntityRelationship> relationships = store.getRelationshipsForCase(caseId);
        List<TimelineEvent> timeline = store.getTimelineForCase(caseId);
        List<ChainOfCustodyEntry> ledger = store.getAuditLedger(caseId);
        RiskEvaluation riskEval = RiskScoringService.evaluateCaseRisk(evidence, entities, relationships, timeline);

        if ("/pdf".equals(pathInfo)) {
            byte[] pdfBytes = PdfReportGeneratorService.generateForensicPdf(
                    fc, evidence, entities, relationships, timeline, riskEval.indicators(), ledger
            );
            String pdfSha256 = CryptographicHashService.sha256Hex(pdfBytes);
            store.appendLedgerEntry(caseId, actorUsername, actorRole, "FORENSIC_PDF_REPORT_EXPORTED",
                    fc.caseNumber + "_Forensic_Report.pdf",
                    "Generated signed PDF 1.7 report (SHA-256=" + pdfSha256 + ")", req.getRemoteAddr());

            resp.setStatus(200);
            resp.setContentType("application/pdf");
            resp.setHeader("Content-Disposition",
                    "attachment; filename=\"" + fc.caseNumber + "_CyberFusionX_Forensic_Report.pdf\"");
            resp.setHeader("X-Report-SHA256", pdfSha256);
            resp.getOutputStream().write(pdfBytes);
            return;
        }

        if ("/stix".equals(pathInfo)) {
            Map<String, Object> stix = PdfReportGeneratorService.generateStixBundle(fc, evidence, entities, relationships);
            store.appendLedgerEntry(caseId, actorUsername, actorRole, "STIX_2_1_BUNDLE_EXPORTED",
                    fc.caseNumber + "_STIX21.json", "Exported OASIS STIX 2.1 CTI bundle", req.getRemoteAddr());
            resp.setHeader("Content-Disposition",
                    "attachment; filename=\"" + fc.caseNumber + "_STIX_2_1_Bundle.json\"");
            ServletJsonHelper.writeJson(resp, 200, stix);
            return;
        }

        if ("/markdown".equals(pathInfo)) {
            String md = PdfReportGeneratorService.generateMarkdownReport(
                    fc, evidence, entities, relationships, timeline, riskEval.indicators(), ledger
            );
            byte[] mdBytes = md.getBytes(StandardCharsets.UTF_8);
            resp.setStatus(200);
            resp.setContentType("text/markdown;charset=UTF-8");
            resp.setHeader("Content-Disposition",
                    "attachment; filename=\"" + fc.caseNumber + "_Forensic_Report.md\"");
            resp.getOutputStream().write(mdBytes);
            return;
        }

        // Default: Structured JSON Report Preview
        String generatedAt = Instant.now().toString();
        String signature = CryptographicHashService.signForensicCertificate(
                fc.caseNumber + "|" + fc.riskScore + "|" + evidence.size() + "|" + generatedAt
        );
        String markdownPreview = PdfReportGeneratorService.generateMarkdownReport(
                fc, evidence, entities, relationships, timeline, riskEval.indicators(), ledger
        );

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("case", fc);
        report.put("generatedAt", generatedAt);
        report.put("digitalSignature", signature);
        report.put("riskScore", riskEval.compositeRiskScore());
        report.put("severityTier", riskEval.severityTier());
        report.put("riskIndicators", riskEval.indicators());
        report.put("evidenceManifest", evidence);
        report.put("entities", entities);
        report.put("relationships", relationships);
        report.put("timeline", timeline);
        report.put("custodyLedger", ledger);
        report.put("markdownPreview", markdownPreview);

        ServletJsonHelper.writeJson(resp, 200, report);
    }
}
