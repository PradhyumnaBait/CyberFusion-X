package com.cyberfusionx.servlet;

import com.cyberfusionx.container.ServletJsonHelper;
import com.cyberfusionx.crypto.CryptographicHashService;
import com.cyberfusionx.db.ForensicDataStore;
import com.cyberfusionx.forensics.GuidanceService;
import com.cyberfusionx.forensics.PdfReportGeneratorService;
import com.cyberfusionx.model.Models.EvidenceItem;
import com.cyberfusionx.model.Models.ExtractedEntity;
import com.cyberfusionx.model.Models.ForensicCase;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.MultipartConfig;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.Part;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Citizen (public) complaint API. No officer JWT: each complaint draft gets an
 * unguessable token (only its SHA-256 is stored). The complaint number alone
 * NEVER exposes a case — tracking requires number + token.
 */
@WebServlet(name = "CitizenServlet", urlPatterns = {"/api/v1/public/*"})
@MultipartConfig(fileSizeThreshold = 1024 * 1024, maxFileSize = 1024L * 1024L * 25L, maxRequestSize = 1024L * 1024L * 30L)
public class CitizenServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;

    private static final List<String> MH_DISTRICTS = List.of(
            "Ahmednagar (Ahilyanagar)", "Akola", "Amravati", "Beed", "Bhandara", "Buldhana",
            "Chandrapur", "Chhatrapati Sambhajinagar", "Dharashiv", "Dhule", "Gadchiroli", "Gondia",
            "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai", "Mumbai Suburban", "Nagpur",
            "Nanded", "Nandurbar", "Nashik", "Palghar", "Parbhani", "Pune", "Raigad", "Ratnagiri",
            "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal");

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        ForensicDataStore store = ForensicDataStore.getInstance();
        String path = req.getPathInfo() != null ? req.getPathInfo() : "";

        if ("/guidance".equals(path)) {
            ServletJsonHelper.writeJson(resp, 200, GuidanceService.guidanceFor(req.getParameter("scamType")));
            return;
        }
        if ("/districts".equals(path)) {
            ServletJsonHelper.writeJson(resp, 200, Map.of("districts", MH_DISTRICTS));
            return;
        }
        if ("/stations".equals(path)) {
            ServletJsonHelper.writeJson(resp, 200, Map.of("stations", store.getStations()));
            return;
        }

        String[] seg = split(path);
        if (seg.length >= 2 && "complaints".equals(seg[0])) {
            String caseId = seg[1];
            if (!authorized(store, caseId, tokenFrom(req, null))) { forbidden(resp); return; }
            ForensicCase fc = store.getCaseById(caseId);
            if (fc == null) { ServletJsonHelper.writeError(resp, 404, "Complaint not found"); return; }

            if (seg.length == 3 && "receipt.pdf".equals(seg[2])) {
                @SuppressWarnings("unchecked")
                Map<String, Object> g = (Map<String, Object>) GuidanceService.guidanceFor(fc.incidentType);
                @SuppressWarnings("unchecked")
                List<String> steps = (List<String>) g.get("nextSteps");
                @SuppressWarnings("unchecked")
                List<String> tips = (List<String>) g.get("safetyTips");
                byte[] pdf = PdfReportGeneratorService.generateCitizenReceiptPdf(fc,
                        store.getEvidenceForCase(caseId), store.getEntitiesForCase(caseId),
                        store.computeCaseSeal(caseId), steps, tips);
                resp.setStatus(200);
                resp.setContentType("application/pdf");
                resp.setHeader("Content-Disposition", "attachment; filename=\"" + fc.caseNumber + "_Receipt.pdf\"");
                resp.getOutputStream().write(pdf);
                return;
            }
            if (seg.length == 3 && "status".equals(seg[2])) {
                ServletJsonHelper.writeJson(resp, 200, citizenCaseView(store, fc));
                return;
            }
            if (seg.length == 3 && "extraction".equals(seg[2])) {
                ServletJsonHelper.writeJson(resp, 200, extractionView(store, fc));
                return;
            }
            ServletJsonHelper.writeJson(resp, 200, citizenCaseView(store, fc));
            return;
        }
        ServletJsonHelper.writeError(resp, 404, "Unknown public endpoint: " + path);
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException, ServletException {
        ForensicDataStore store = ForensicDataStore.getInstance();
        String path = req.getPathInfo() != null ? req.getPathInfo() : "";
        String ct = req.getContentType() != null ? req.getContentType().toLowerCase() : "";

        if ("/complaints/draft".equals(path)) {
            Map<String, Object> body = ServletJsonHelper.readJsonMap(req);
            Map<String, Object> created = store.createCitizenDraft(
                    ServletJsonHelper.getString(body, "incidentType", "OTHER"),
                    ServletJsonHelper.getString(body, "district", ""),
                    ServletJsonHelper.getString(body, "language", "en"));
            ForensicCase c = (ForensicCase) created.get("case");
            ServletJsonHelper.writeJson(resp, 201, Map.of(
                    "caseId", c.id, "token", created.get("token"), "status", c.status));
            return;
        }

        if ("/track".equals(path)) {
            Map<String, Object> body = ServletJsonHelper.readJsonMap(req);
            String complaintNo = ServletJsonHelper.getString(body, "complaintNo", "");
            String token = ServletJsonHelper.getString(body, "token", "");
            ForensicCase fc = store.findCaseByComplaintNo(complaintNo);
            if (fc == null || !store.verifyCitizenToken(fc.id, token)) {
                ServletJsonHelper.writeError(resp, 404,
                        "We could not find a complaint with that number + tracking code. Check both and try again.");
                return;
            }
            Map<String, Object> view = citizenCaseView(store, fc);
            view.put("caseId", fc.id);
            ServletJsonHelper.writeJson(resp, 200, view);
            return;
        }

        if ("/verify".equals(path)) {
            handleVerify(req, resp, store, ct);
            return;
        }

        String[] seg = split(path);
        if (seg.length >= 3 && "complaints".equals(seg[0])) {
            String caseId = seg[1];
            String action = seg[2];

            if ("evidence".equals(action) && ct.startsWith("multipart/form-data")) {
                String token = tokenFrom(req, null);
                if (!authorized(store, caseId, token)) { forbidden(resp); return; }
                Part filePart = req.getPart("file");
                if (filePart == null) { ServletJsonHelper.writeError(resp, 400, "File is required"); return; }
                byte[] bytes = filePart.getInputStream().readAllBytes();
                String filename = filePart.getSubmittedFileName() != null ? filePart.getSubmittedFileName() : "evidence_file";
                String notes = req.getParameter("notes");
                try {
                    EvidenceItem created = store.ingestEvidence(caseId, filename, "CITIZEN_UPLOAD",
                            bytes, null, notes, "citizen-portal");
                    Map<String, Object> out = new LinkedHashMap<>();
                    out.put("evidence", created);
                    out.put("duplicateWarnings", duplicateWarnings(store, caseId, created));
                    out.put("extraction", extractionView(store, store.getCaseById(caseId)));
                    ServletJsonHelper.writeJson(resp, 201, out);
                } catch (IllegalArgumentException iae) {
                    ServletJsonHelper.writeError(resp, 400, iae.getMessage());
                }
                return;
            }

            Map<String, Object> body = ServletJsonHelper.readJsonMap(req);
            String token = tokenFrom(req, ServletJsonHelper.getString(body, "token", ""));
            if (!authorized(store, caseId, token)) { forbidden(resp); return; }
            ForensicCase fc = store.getCaseById(caseId);
            if (fc == null) { ServletJsonHelper.writeError(resp, 404, "Complaint not found"); return; }

            if ("paste".equals(action)) {
                String content = ServletJsonHelper.getString(body, "content", "");
                if (content.isBlank()) { ServletJsonHelper.writeError(resp, 400, "Paste some text first."); return; }
                String title = ServletJsonHelper.getString(body, "title", "Pasted message");
                EvidenceItem created = store.ingestEvidence(caseId,
                        title.toLowerCase().replaceAll("[^a-z0-9]+", "_") + ".txt", "PASTED_TEXT",
                        content.getBytes(StandardCharsets.UTF_8), null, null, "citizen-portal");
                Map<String, Object> out = new LinkedHashMap<>();
                out.put("evidence", created);
                out.put("duplicateWarnings", duplicateWarnings(store, caseId, created));
                out.put("extraction", extractionView(store, store.getCaseById(caseId)));
                ServletJsonHelper.writeJson(resp, 201, out);
                return;
            }
            if ("confirm".equals(action)) {
                long paise = Math.round(ServletJsonHelper.getDouble(body, "amountRupees", fc.amountLostPaise / 100.0) * 100.0);
                String contact = ServletJsonHelper.getString(body, "contact", "");
                ForensicCase updated = store.updateCitizenDetails(caseId,
                        ServletJsonHelper.getString(body, "victimName", ""),
                        maskContact(contact),
                        ServletJsonHelper.getString(body, "district", ""),
                        ServletJsonHelper.getString(body, "summary", fc.summary),
                        paise,
                        ServletJsonHelper.getString(body, "incidentAt", ""));
                ServletJsonHelper.writeJson(resp, 200, citizenCaseView(store, updated));
                return;
            }
            if ("submit".equals(action)) {
                ForensicCase submitted = store.submitCitizenComplaint(caseId);
                Map<String, Object> view = citizenCaseView(store, submitted);
                view.put("caseSeal", store.computeCaseSeal(caseId));
                view.put("guidance", GuidanceService.guidanceFor(submitted.incidentType));
                ServletJsonHelper.writeJson(resp, 200, view);
                return;
            }
        }
        ServletJsonHelper.writeError(resp, 404, "Unknown public endpoint: " + path);
    }

    private void handleVerify(HttpServletRequest req, HttpServletResponse resp, ForensicDataStore store, String ct)
            throws IOException, ServletException {
        String sha;
        if (ct.startsWith("multipart/form-data")) {
            Part filePart = req.getPart("file");
            if (filePart == null) { ServletJsonHelper.writeError(resp, 400, "Choose a file to verify."); return; }
            sha = CryptographicHashService.sha256Hex(filePart.getInputStream().readAllBytes());
        } else {
            Map<String, Object> body = ServletJsonHelper.readJsonMap(req);
            sha = ServletJsonHelper.getString(body, "sha256", "").toLowerCase();
            if (sha.isBlank()) { ServletJsonHelper.writeError(resp, 400, "Provide a file or an SHA-256 fingerprint."); return; }
        }
        EvidenceItem match = store.findEvidenceBySha256(sha);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("sha256", sha);
        if (match != null) {
            ForensicCase fc = store.getCaseById(match.caseId);
            out.put("verdict", "INTACT");
            out.put("message", "This exact file was received by CyberFusion X and is unchanged since " + match.uploadedAt + ".");
            out.put("complaintNo", fc != null ? fc.caseNumber : "");
            out.put("evidenceCode", match.evidenceCode);
            out.put("originalFilename", match.originalFilename);
            out.put("receivedAt", match.uploadedAt);
        } else {
            out.put("verdict", "NOT_FOUND");
            out.put("message", "No sealed file with this fingerprint exists. Either the file was changed after submission, or it was never submitted here.");
        }
        ServletJsonHelper.writeJson(resp, 200, out);
    }

    private List<String> duplicateWarnings(ForensicDataStore store, String caseId, EvidenceItem created) {
        List<String> warnings = new ArrayList<>();
        if (created.phash != null) {
            boolean similarInSameCase = store.findSimilarImages(created.phash, created.id).stream()
                    .anyMatch(e -> e.caseId.equals(caseId));
            if (similarInSameCase) warnings.add("This screenshot looks like one you already added — check it is not a duplicate.");
        }
        // Same transaction reference twice IN THIS complaint (citizen-safe: only their own files compared).
        List<ExtractedEntity> ents = store.getEntitiesForCase(caseId);
        for (ExtractedEntity e : ents) {
            if ("TRANSACTION_ID".equals(e.entityType) && e.evidenceIds.size() > 1) {
                warnings.add("Transaction reference " + e.displayLabel + " appears in " + e.evidenceIds.size()
                        + " of your files — we count it once, not as separate losses.");
            }
        }
        return warnings;
    }

    private Map<String, Object> citizenCaseView(ForensicDataStore store, ForensicCase fc) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", fc.id);
        out.put("complaintNo", fc.caseNumber);
        out.put("incidentType", fc.incidentType);
        out.put("status", fc.status);
        out.put("victimName", fc.victimName);
        out.put("amountLostPaise", fc.amountLostPaise);
        out.put("district", fc.district);
        out.put("incidentAt", fc.incidentAt);
        out.put("reportedAt", fc.reportedAt);
        out.put("summary", fc.summary);
        out.put("evidence", store.getEvidenceForCase(fc.id));
        out.put("entities", store.getEntitiesForCase(fc.id));
        out.put("statusUpdates", store.getStatusUpdates(fc.id));
        out.put("caseSeal", store.computeCaseSeal(fc.id));
        return out;
    }

    private Map<String, Object> extractionView(ForensicDataStore store, ForensicCase fc) {
        Map<String, Object> out = new LinkedHashMap<>();
        List<EvidenceItem> ev = store.getEvidenceForCase(fc.id);
        out.put("evidence", ev);
        out.put("entities", store.getEntitiesForCase(fc.id));
        out.put("needsReviewCount", ev.stream().filter(e -> e.needsReview).count());
        return out;
    }

    private boolean authorized(ForensicDataStore store, String caseId, String token) {
        return store.verifyCitizenToken(caseId, token);
    }

    private String tokenFrom(HttpServletRequest req, String bodyToken) {
        String h = req.getHeader("X-Complaint-Token");
        if (h != null && !h.isBlank()) return h.trim();
        String q = req.getParameter("token");
        if (q != null && !q.isBlank()) return q.trim();
        return bodyToken != null ? bodyToken.trim() : "";
    }

    private void forbidden(HttpServletResponse resp) throws IOException {
        ServletJsonHelper.writeError(resp, 403, "Invalid or missing tracking code for this complaint.");
    }

    private static String[] split(String path) {
        String clean = path.startsWith("/") ? path.substring(1) : path;
        return clean.isBlank() ? new String[0] : clean.split("/");
    }

    /** +91 98204 11210 -> +91 98XXX XX210 */
    static String maskContact(String raw) {
        if (raw == null) return "";
        String digits = raw.replaceAll("\\D", "");
        if (digits.length() >= 10) {
            String last5Hint = digits.substring(digits.length() - 10);
            return "+91 " + last5Hint.substring(0, 2) + "XXX XX" + last5Hint.substring(7);
        }
        return raw.isBlank() ? "" : "Provided";
    }
}
