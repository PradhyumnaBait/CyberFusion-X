package com.cyberfusionx.servlet;

import com.cyberfusionx.container.ServletJsonHelper;
import com.cyberfusionx.db.ForensicDataStore;
import com.cyberfusionx.model.Models.ChainOfCustodyEntry;
import com.cyberfusionx.model.Models.EvidenceItem;
import com.cyberfusionx.model.Models.IntegrityVerification;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Jakarta @WebServlet for SHA-256 & BLAKE3 Evidence Integrity Verification,
 * Tamper Simulation Sandbox, and Chain-of-Custody Merkle Hash-Chain Verification.
 */
@WebServlet(name = "EvidenceIntegrityServlet", urlPatterns = {"/api/v1/integrity/*"})
public class EvidenceIntegrityServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        ForensicDataStore store = ForensicDataStore.getInstance();
        String pathInfo = req.getPathInfo() != null ? req.getPathInfo() : "/ledger";
        String caseId = req.getParameter("caseId");

        if ("/verifications".equals(pathInfo)) {
            List<IntegrityVerification> verifications = store.getVerificationsForCase(caseId);
            ServletJsonHelper.writeJson(resp, 200, Map.of("verifications", verifications));
            return;
        }

        // Default: /ledger
        List<ChainOfCustodyEntry> entries = store.getAuditLedger(caseId);
        Map<String, Object> chainVerification = store.verifyEntireAuditLedger();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("ledger", entries);
        result.put("chainVerification", chainVerification);
        ServletJsonHelper.writeJson(resp, 200, result);
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        ForensicDataStore store = ForensicDataStore.getInstance();
        String pathInfo = req.getPathInfo() != null ? req.getPathInfo() : "/verify";
        String actorUsername = ServletJsonHelper.getActorUsername(req);
        Map<String, Object> body = ServletJsonHelper.readJsonMap(req);

        if ("/simulate-tamper".equals(pathInfo)) {
            String evidenceId = ServletJsonHelper.getString(body, "evidenceId", "");
            boolean tamper = Boolean.parseBoolean(ServletJsonHelper.getString(body, "tamper", "true"));
            if (evidenceId.isEmpty()) {
                ServletJsonHelper.writeError(resp, 400, "'evidenceId' is required");
                return;
            }
            IntegrityVerification ver = store.simulateOrRestoreTamper(evidenceId, tamper, actorUsername);
            EvidenceItem updatedItem = store.getEvidenceById(evidenceId);
            ServletJsonHelper.writeJson(resp, 200, Map.of(
                    "verification", ver,
                    "evidence", updatedItem
            ));
            return;
        }

        if ("/verify-case".equals(pathInfo)) {
            String caseId = ServletJsonHelper.getString(body, "caseId", "");
            List<EvidenceItem> items = store.getEvidenceForCase(caseId);
            List<IntegrityVerification> results = new ArrayList<>();
            for (EvidenceItem item : items) {
                results.add(store.verifyEvidenceIntegrity(item.id, actorUsername));
            }
            ServletJsonHelper.writeJson(resp, 200, Map.of(
                    "verifications", results,
                    "evidence", store.getEvidenceForCase(caseId)
            ));
            return;
        }

        // Single evidence verification: /verify
        String evidenceId = ServletJsonHelper.getString(body, "evidenceId", "");
        if (evidenceId.isEmpty()) {
            ServletJsonHelper.writeError(resp, 400, "'evidenceId' is required");
            return;
        }
        IntegrityVerification ver = store.verifyEvidenceIntegrity(evidenceId, actorUsername);
        EvidenceItem updatedItem = store.getEvidenceById(evidenceId);
        ServletJsonHelper.writeJson(resp, 200, Map.of(
                "verification", ver,
                "evidence", updatedItem
        ));
    }
}
