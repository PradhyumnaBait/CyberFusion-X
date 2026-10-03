package com.cyberfusionx.servlet;

import com.cyberfusionx.container.ServletJsonHelper;
import com.cyberfusionx.db.ForensicDataStore;
import com.cyberfusionx.forensics.SampleCaseSeeder;
import com.cyberfusionx.model.Models.EvidenceItem;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.MultipartConfig;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.Part;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Jakarta @WebServlet with @MultipartConfig for streaming binary evidence ingestion,
 * SHA-256 & BLAKE3 hashing, OCR extraction, and raw vault binary serving.
 */
@WebServlet(name = "EvidenceUploadServlet", urlPatterns = {"/api/v1/evidence/*"})
@MultipartConfig(
        fileSizeThreshold = 1024 * 1024 * 2,  // 2 MB
        maxFileSize = 1024L * 1024L * 50L,    // 50 MB
        maxRequestSize = 1024L * 1024L * 60L  // 60 MB
)
public class EvidenceUploadServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        ForensicDataStore store = ForensicDataStore.getInstance();
        String pathInfo = req.getPathInfo();

        if (pathInfo != null && pathInfo.endsWith("/raw")) {
            String[] segments = pathInfo.substring(1).split("/");
            String evidenceId = segments[0];
            if ("raw".equals(evidenceId) || evidenceId.isBlank()) {
                evidenceId = req.getParameter("id");
                if (evidenceId == null || evidenceId.isBlank()) {
                    evidenceId = req.getParameter("evidenceId");
                }
            }
            if (evidenceId == null || evidenceId.isBlank()) {
                ServletJsonHelper.writeError(resp, 400, "Evidence ID is required");
                return;
            }
            EvidenceItem item = store.getEvidenceById(evidenceId);
            if (item == null) {
                ServletJsonHelper.writeError(resp, 404, "Evidence item not found: " + evidenceId);
                return;
            }
            Path filePath = Paths.get(item.storagePath);
            if (!Files.exists(filePath)) {
                ServletJsonHelper.writeError(resp, 404, "Vault binary missing for: " + evidenceId);
                return;
            }
            byte[] bytes = Files.readAllBytes(filePath);
            String mime = item.detectedMimeType != null ? item.detectedMimeType : "application/octet-stream";
            boolean forceDownload = "true".equalsIgnoreCase(req.getParameter("download"));

            // If a non-image artifact (e.g. .txt, .log, .pdf, .json) is requested by an <img> preview tag,
            // dynamically render a 720x920 forensic document preview card so the UI preview & OCR boxes work seamlessly.
            if (!forceDownload && !mime.startsWith("image/")) {
                String ocrText = item.ocrRawText != null && !item.ocrRawText.isBlank()
                        ? item.ocrRawText
                        : new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
                String[] lines = ocrText.split("\\r?\\n");
                byte[] previewPng = SampleCaseSeeder.renderForensicEvidencePng(
                        "BANK_RECEIPT",
                        item.originalFilename,
                        item.evidenceCode + " • MIME: " + mime + " • SHA-256 Sealed",
                        lines,
                        item.exifMetadata,
                        ocrText
                );
                resp.setStatus(200);
                resp.setContentType("image/png");
                resp.setHeader("X-Evidence-SHA256", item.sha256Hash);
                resp.setHeader("X-Evidence-BLAKE3", item.blake3Hash);
                resp.getOutputStream().write(previewPng);
                return;
            }

            resp.setStatus(200);
            resp.setContentType(mime);
            resp.setHeader("X-Evidence-SHA256", item.sha256Hash);
            resp.setHeader("X-Evidence-BLAKE3", item.blake3Hash);
            resp.getOutputStream().write(bytes);
            return;
        }

        String caseId = req.getParameter("caseId");
        if (caseId == null || caseId.isBlank()) {
            ServletJsonHelper.writeError(resp, 400, "Query parameter 'caseId' is required");
            return;
        }
        List<EvidenceItem> list = store.getEvidenceForCase(caseId);
        ServletJsonHelper.writeJson(resp, 200, Map.of("evidence", list));
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        ForensicDataStore store = ForensicDataStore.getInstance();
        String pathInfo = req.getPathInfo() != null ? req.getPathInfo() : "/upload";
        String actorUsername = ServletJsonHelper.getActorUsername(req);

        if ("/quick-artifact".equals(pathInfo)) {
            Map<String, Object> body = ServletJsonHelper.readJsonMap(req);
            String caseId = ServletJsonHelper.getString(body, "caseId", "");
            String title = ServletJsonHelper.getString(body, "title", "Forensic Artifact Capture");
            String category = ServletJsonHelper.getString(body, "category", "SCREENSHOT");
            String rawContent = ServletJsonHelper.getString(body, "content", "");

            if (caseId.isEmpty() || rawContent.isEmpty()) {
                ServletJsonHelper.writeError(resp, 400, "Both 'caseId' and 'content' are required");
                return;
            }

            String[] lines = rawContent.split("\\r?\\n");
            Map<String, String> meta = new LinkedHashMap<>();
            meta.put("DeviceMake", "CyberFusion X Quick Artifact Capture Engine");
            meta.put("DateTimeOriginal", Instant.now().toString());
            meta.put("Software", "Jakarta Servlet Forensic Ingestor v6.1");

            String cardStyle = "SCREENSHOT".equals(category) ? "PHISHING_SMS"
                    : "TRANSACTION_RECEIPT".equals(category) ? "BANK_RECEIPT" : "WHATSAPP_CHAT";

            byte[] renderedPng = SampleCaseSeeder.renderForensicEvidencePng(
                    cardStyle,
                    title,
                    "Ingested by " + actorUsername + " • Category: " + category,
                    lines,
                    meta,
                    rawContent
            );

            String safeFile = title.toLowerCase().replaceAll("[^a-z0-9]+", "_") + ".png";
            try {
                EvidenceItem created = store.ingestEvidence(
                        caseId, safeFile, category, renderedPng, null, rawContent, actorUsername
                );
                ServletJsonHelper.writeJson(resp, 201, Map.of("evidence", created));
            } catch (IllegalArgumentException iae) {
                ServletJsonHelper.writeError(resp, 400, iae.getMessage());
            }
            return;
        }

        // Standard Multipart File Upload (/api/v1/evidence/upload)
        String contentType = req.getContentType();
        if (contentType != null && contentType.toLowerCase().startsWith("multipart/form-data")) {
            Part filePart = req.getPart("file");
            if (filePart == null) {
                ServletJsonHelper.writeError(resp, 400, "Multipart field 'file' is required");
                return;
            }
            String caseId = req.getParameter("caseId");
            String category = req.getParameter("category");
            String notes = req.getParameter("notes");
            String clientSha256 = req.getHeader("X-Client-SHA256");
            if (clientSha256 == null || clientSha256.isBlank()) {
                clientSha256 = req.getParameter("clientSha256");
            }

            byte[] fileBytes = filePart.getInputStream().readAllBytes();
            String filename = filePart.getSubmittedFileName() != null ? filePart.getSubmittedFileName() : "uploaded_evidence.bin";

            try {
                EvidenceItem created = store.ingestEvidence(
                        caseId, filename, category, fileBytes, clientSha256, notes, actorUsername
                );
                ServletJsonHelper.writeJson(resp, 201, Map.of("evidence", created));
            } catch (IllegalArgumentException iae) {
                ServletJsonHelper.writeError(resp, 400, iae.getMessage());
            }
            return;
        }

        ServletJsonHelper.writeError(resp, 400, "Unsupported evidence upload format");
    }
}
