package com.cyberfusionx.forensics;

import com.cyberfusionx.model.Models.BoundingBox;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Real text extraction. Engine order per file type, all fail-soft and HONEST:
 *  - Seeded demo PNGs carry an embedded ground-truth text chunk -> engine FIXTURE_EMBEDDED_TEXT
 *    (only our own generated fixtures have this chunk; real user files never do).
 *  - Images -> Tesseract OCR binary via ProcessBuilder (eng+hin+mar), with grayscale/upscale
 *    preprocessing and REAL word bounding boxes parsed from Tesseract TSV output.
 *  - PDFs -> embedded text-stream extraction (PDF_TEXT).
 *  - Text/chat exports -> UTF-8 plain text.
 * If nothing readable is found we return needsReview=true with empty text.
 * We NEVER invent plausible-looking OCR text from a filename (the old behaviour, removed).
 */
public final class OcrExtractionService {

    private static final Logger LOG = LoggerFactory.getLogger(OcrExtractionService.class);

    public record OcrResult(String rawText, double averageConfidence, List<BoundingBox> boundingBoxes,
                            String engine, boolean needsReview) {}

    public static OcrResult extractOcrAndRegions(
            byte[] fileBytes,
            String mimeType,
            String filename,
            String embeddedOcrPayload,
            String supplementalNotes
    ) {
        int imgWidth = 720;
        int imgHeight = 920;

        if (mimeType != null && mimeType.startsWith("image/")) {
            BufferedImage img = readImage(fileBytes);
            if (img != null) { imgWidth = img.getWidth(); imgHeight = img.getHeight(); }

            // 1) Our own seeded fixtures: embedded ground-truth text (labelled, not passed off as OCR).
            if (embeddedOcrPayload != null && !embeddedOcrPayload.isBlank()) {
                List<BoundingBox> boxes = computeVisualBoundingBoxes(embeddedOcrPayload, imgWidth, imgHeight);
                return new OcrResult(embeddedOcrPayload.trim(), 1.0, boxes, "FIXTURE_EMBEDDED_TEXT", false);
            }

            // 2) Real OCR via the Tesseract binary (installed in the Docker image).
            OcrResult tess = runTesseract(fileBytes, img);
            if (tess != null && !tess.rawText().isBlank()) {
                String text = tess.rawText();
                if (supplementalNotes != null && !supplementalNotes.isBlank() && !text.contains(supplementalNotes)) {
                    text = text + "\n" + supplementalNotes;
                }
                return new OcrResult(text.trim(), tess.averageConfidence(), tess.boundingBoxes(), "TESSERACT", false);
            }

            // 3) Honest fallback: user-supplied notes only, flagged for manual reading.
            String notes = supplementalNotes != null ? supplementalNotes.trim() : "";
            List<BoundingBox> boxes = notes.isBlank() ? List.of() : computeVisualBoundingBoxes(notes, imgWidth, imgHeight);
            return new OcrResult(notes, 0.0, boxes, "NONE", true);
        }

        if ("application/pdf".equals(mimeType)) {
            String text = extractTextFromPdfBytes(fileBytes, supplementalNotes);
            boolean empty = text.isBlank();
            List<BoundingBox> boxes = computeVisualBoundingBoxes(text, imgWidth, imgHeight);
            return new OcrResult(text.trim(), empty ? 0.0 : 0.95, boxes, "PDF_TEXT", empty);
        }

        // Plain text / chat export / pasted content rendered as text.
        String rawText = new String(fileBytes, StandardCharsets.UTF_8);
        String text = (supplementalNotes != null && !supplementalNotes.isBlank() && !rawText.contains(supplementalNotes))
                ? rawText + "\n" + supplementalNotes : rawText;
        List<BoundingBox> boxes = computeVisualBoundingBoxes(text, imgWidth, imgHeight);
        return new OcrResult(text.trim(), text.isBlank() ? 0.0 : 0.98, boxes, "PLAIN_TEXT", text.isBlank());
    }

    // ---------------------------------------------------------------- Tesseract

    private static OcrResult runTesseract(byte[] fileBytes, BufferedImage original) {
        Path tmp = null;
        try {
            byte[] toOcr = preprocessForOcr(original, fileBytes);
            tmp = Files.createTempFile("cfx-ocr-", ".png");
            Files.write(tmp, toOcr);

            // TSV gives real word boxes + confidences; falls back to plain text if TSV parsing finds nothing.
            String tsv = execTesseract(tmp, "tsv");
            if (tsv != null) {
                TsvParse parsed = parseTsv(tsv);
                if (!parsed.text.isBlank()) {
                    return new OcrResult(parsed.text, parsed.avgConf, parsed.boxes, "TESSERACT", false);
                }
            }
            String plain = execTesseract(tmp, null);
            if (plain != null && !plain.isBlank()) {
                List<BoundingBox> boxes = computeVisualBoundingBoxes(plain,
                        original != null ? original.getWidth() : 720,
                        original != null ? original.getHeight() : 920);
                return new OcrResult(plain.trim(), 0.85, boxes, "TESSERACT", false);
            }
            return null;
        } catch (Exception e) {
            LOG.debug("Tesseract unavailable/failed ({}). Falling back to manual review.", e.getMessage());
            return null;
        } finally {
            if (tmp != null) { try { Files.deleteIfExists(tmp); } catch (Exception ignored) {} }
        }
    }

    private static String execTesseract(Path imagePng, String config) throws Exception {
        List<String> cmd = new ArrayList<>(List.of("tesseract", imagePng.toString(), "stdout",
                "-l", "eng+hin+mar", "--psm", "6"));
        if (config != null) cmd.add(config);
        Process p = new ProcessBuilder(cmd).redirectErrorStream(false).start();
        String out = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        if (!p.waitFor(45, TimeUnit.SECONDS)) { p.destroyForcibly(); return null; }
        return p.exitValue() == 0 ? out : null;
    }

    /** Grayscale + 2x upscale for small screenshots — the two cheapest accuracy wins. */
    private static byte[] preprocessForOcr(BufferedImage img, byte[] fallback) {
        if (img == null) return fallback;
        try {
            int scale = img.getWidth() < 1200 ? 2 : 1;
            BufferedImage gray = new BufferedImage(img.getWidth() * scale, img.getHeight() * scale,
                    BufferedImage.TYPE_BYTE_GRAY);
            Graphics2D g = gray.createGraphics();
            g.drawImage(img, 0, 0, gray.getWidth(), gray.getHeight(), null);
            g.dispose();
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(gray, "png", baos);
            return baos.toByteArray();
        } catch (Exception e) {
            return fallback;
        }
    }

    private static class TsvParse { String text = ""; double avgConf = 0; List<BoundingBox> boxes = new ArrayList<>(); }

    private static TsvParse parseTsv(String tsv) {
        TsvParse out = new TsvParse();
        // Group words by (page, block, par, line) -> one bounding box per visual line.
        Map<String, List<String[]>> lines = new LinkedHashMap<>();
        String[] rows = tsv.split("\\R");
        for (int i = 1; i < rows.length; i++) {
            String[] c = rows[i].split("\t", -1);
            if (c.length < 12 || !"5".equals(c[0])) continue; // level 5 = word
            lines.computeIfAbsent(c[2] + "-" + c[3] + "-" + c[4] + "-" + c[5], k -> new ArrayList<>()).add(c);
        }
        StringBuilder text = new StringBuilder();
        double confSum = 0; int confN = 0;
        for (List<String[]> words : lines.values()) {
            int minX = Integer.MAX_VALUE, minY = Integer.MAX_VALUE, maxX = 0, maxY = 0;
            StringBuilder line = new StringBuilder();
            double lineConf = 0; int n = 0;
            for (String[] w : words) {
                try {
                    int x = Integer.parseInt(w[6]), y = Integer.parseInt(w[7]);
                    int ww = Integer.parseInt(w[8]), hh = Integer.parseInt(w[9]);
                    double conf = Double.parseDouble(w[10]);
                    if (conf < 20 || w[11].isBlank()) continue;
                    minX = Math.min(minX, x); minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x + ww); maxY = Math.max(maxY, y + hh);
                    if (line.length() > 0) line.append(' ');
                    line.append(w[11]);
                    lineConf += conf; n++;
                } catch (Exception ignored) {}
            }
            if (n == 0) continue;
            String lineText = line.toString();
            text.append(lineText).append('\n');
            double avg = lineConf / n / 100.0;
            confSum += avg; confN++;
            out.boxes.add(new BoundingBox("bbox-" + UUID.randomUUID().toString().substring(0, 8),
                    minX, minY, Math.max(1, maxX - minX), Math.max(1, maxY - minY),
                    lineText.length() > 95 ? lineText.substring(0, 95) + "..." : lineText,
                    classifyLineEntityType(lineText), Math.round(avg * 1000.0) / 1000.0));
        }
        out.text = text.toString().trim();
        out.avgConf = confN == 0 ? 0 : Math.round(confSum / confN * 1000.0) / 1000.0;
        return out;
    }

    // ---------------------------------------------------------------- PDF / misc

    private static String extractTextFromPdfBytes(byte[] bytes, String notes) {
        String raw = new String(bytes, StandardCharsets.ISO_8859_1);
        StringBuilder sb = new StringBuilder();
        Matcher m = Pattern.compile("\\(([^()\\\\]{3,200})\\)\\s*Tj").matcher(raw);
        while (m.find()) {
            String token = m.group(1).trim();
            if (!token.isEmpty()) sb.append(token).append("\n");
        }
        if (sb.length() < 20) {
            String utf = new String(bytes, StandardCharsets.UTF_8);
            for (String line : utf.split("\\r?\\n")) {
                if (line.matches(".*[A-Za-z0-9]{4,}.*") && !line.startsWith("%") && !line.contains("endobj")) {
                    sb.append(line).append("\n");
                }
            }
        }
        if (notes != null && !notes.isBlank()) sb.append("\n").append(notes);
        return sb.toString().trim();
    }

    private static BufferedImage readImage(byte[] bytes) {
        try { return ImageIO.read(new ByteArrayInputStream(bytes)); } catch (Exception e) { return null; }
    }

    /**
     * Layout-estimate boxes for text whose true pixel positions are unknown
     * (fixtures / PDFs / plain text). For real Tesseract output we emit true boxes instead.
     */
    public static List<BoundingBox> computeVisualBoundingBoxes(String text, int imgWidth, int imgHeight) {
        List<BoundingBox> boxes = new ArrayList<>();
        if (text == null || text.isBlank()) return boxes;
        int boxX = SampleCaseSeeder.BOX_X;
        int boxWidth = Math.max(40, Math.min(imgWidth - (boxX * 2), SampleCaseSeeder.BOX_WIDTH));
        int currentY = SampleCaseSeeder.FIRST_BOX_Y;
        for (String rawLine : text.split("\\r?\\n")) {
            String line = rawLine.trim();
            if (line.isEmpty()) continue;
            String detectedType = classifyLineEntityType(line);
            boxes.add(new BoundingBox("bbox-" + UUID.randomUUID().toString().substring(0, 8),
                    boxX, Math.min(Math.max(0, imgHeight - 110), currentY), boxWidth, SampleCaseSeeder.BOX_HEIGHT,
                    line.length() > 95 ? line.substring(0, 95) + "..." : line,
                    detectedType, detectedType.equals("TEXT_LINE") ? 0.9 : 0.97));
            currentY += SampleCaseSeeder.LINE_STEP;
        }
        return boxes;
    }

    private static String classifyLineEntityType(String line) {
        String lower = line.toLowerCase();
        if (lower.contains("http://") || lower.contains("https://")) return "URL";
        if (lower.contains("@ok") || lower.contains("@ybl") || lower.contains("@paytm")
                || lower.contains("@icici") || lower.contains("upi")) return "UPI_ID";
        if (lower.contains("@") && lower.contains(".")) return "EMAIL";
        if (line.matches(".*\\+?[1-9][0-9\\-() ]{8,15}.*")
                && (lower.contains("+") || lower.contains("phone") || lower.contains("sender") || lower.contains("call"))) return "PHONE";
        if (lower.contains("utr") || lower.contains("txn") || lower.contains("ref")) return "TRANSACTION_ID";
        if (lower.contains("acct-") || lower.contains("account") || lower.contains("iban") || lower.contains("ifsc")) return "BANK_ACCOUNT";
        if (lower.matches(".*\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b.*")) return "IP_ADDRESS";
        if (lower.contains("0x") || lower.contains("bc1") || lower.contains("wallet")) return "CRYPTO_WALLET";
        if (lower.startsWith("victim:") || lower.startsWith("actor:") || lower.startsWith("beneficiary:") || lower.startsWith("from:")) return "PERSON";
        if (lower.contains("urgent") || lower.contains("frozen") || lower.contains("kyc") || lower.contains("otp")) return "MESSAGE";
        return "TEXT_LINE";
    }
}
