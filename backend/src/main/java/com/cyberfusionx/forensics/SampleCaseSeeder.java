package com.cyberfusionx.forensics;

import javax.imageio.ImageIO;
import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Font;
import java.awt.GradientPaint;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.zip.CRC32;

/**
 * Generates high-contrast, daylight-readable synthetic forensic evidence images
 * (720x920 PNG with embedded tEXt EXIF/OCR chunks) whose text row coordinates
 * align 1:1 to the pixel with OcrExtractionService bounding boxes.
 */
public final class SampleCaseSeeder {

    public static final int IMG_WIDTH = 720;
    public static final int IMG_HEIGHT = 920;
    public static final int BOX_X = 44;
    public static final int BOX_WIDTH = IMG_WIDTH - (BOX_X * 2); // 632
    public static final int FIRST_BOX_Y = 144;
    public static final int BOX_HEIGHT = 42;
    public static final int LINE_STEP = 64;

    public static byte[] renderForensicEvidencePng(
            String cardType,
            String headerTitle,
            String subHeader,
            String[] bodyLines,
            Map<String, String> embeddedMeta,
            String fullOcrGroundTruth
    ) {
        int width = IMG_WIDTH;
        int height = IMG_HEIGHT;
        BufferedImage img = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

        // Daylight forensic laboratory background canvas
        GradientPaint bg = new GradientPaint(0, 0, new Color(241, 245, 249), 0, height, new Color(226, 232, 240));
        g.setPaint(bg);
        g.fillRect(0, 0, width, height);

        // Subtle millimeter forensic calibration grid
        g.setColor(new Color(203, 213, 225, 110));
        for (int x = 0; x < width; x += 36) g.drawLine(x, 0, x, height);
        for (int y = 0; y < height; y += 36) g.drawLine(0, y, width, y);

        // Category Accent Color
        Color accent = switch (cardType) {
            case "PHISHING_SMS" -> new Color(220, 38, 38);      // Crimson Alert
            case "BANK_RECEIPT" -> new Color(5, 150, 105);      // Emerald Receipt
            case "WHATSAPP_CHAT" -> new Color(37, 99, 235);     // Royal Blue Comms
            default -> new Color(217, 119, 6);                  // Amber Crypto Ledger
        };

        // Main White Evidence Document Card
        g.setColor(Color.WHITE);
        g.fillRoundRect(24, 24, width - 48, height - 48, 22, 22);
        g.setColor(new Color(148, 163, 184));
        g.setStroke(new BasicStroke(1.5f));
        g.drawRoundRect(24, 24, width - 48, height - 48, 22, 22);

        // Top Header Banner inside Card
        g.setColor(new Color(15, 23, 42));
        g.fillRoundRect(26, 26, width - 52, 86, 20, 20);

        // Accent Status Dot & Category Pill
        g.setColor(accent);
        g.fillOval(46, 52, 16, 16);

        g.setColor(Color.WHITE);
        g.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 19));
        g.drawString(headerTitle, 74, 62);

        g.setColor(new Color(148, 163, 184));
        g.setFont(new Font(Font.MONOSPACED, Font.BOLD, 12));
        g.drawString(subHeader, 74, 88);

        // Render structured evidence lines at exact pixel coordinates matching OcrExtractionService
        int currentY = FIRST_BOX_Y;

        for (int i = 0; i < bodyLines.length; i++) {
            String line = bodyLines[i].trim();
            if (line.isEmpty()) continue;

            boolean highlight = line.contains("http") || line.contains("UTR") || line.contains("+91")
                    || line.contains("+44") || line.contains("@ok") || line.contains("@ybl")
                    || line.contains("0x") || line.contains("TQn9") || line.contains("ACCT-")
                    || line.contains("185.220") || line.contains("91.219") || line.contains("SWFT")
                    || line.contains("IMPS-") || line.contains("GB29");

            // Row background box (exact y = currentY, height = BOX_HEIGHT)
            if (highlight) {
                g.setColor(new Color(248, 250, 252));
                g.fillRoundRect(BOX_X, currentY, BOX_WIDTH, BOX_HEIGHT, 10, 10);
                g.setColor(new Color(203, 213, 225));
                g.setStroke(new BasicStroke(1f));
                g.drawRoundRect(BOX_X, currentY, BOX_WIDTH, BOX_HEIGHT, 10, 10);

                // Left accent bar inside the row
                g.setColor(accent);
                g.fillRoundRect(BOX_X, currentY, 6, BOX_HEIGHT, 6, 6);
            } else {
                g.setColor(new Color(241, 245, 249));
                g.fillRoundRect(BOX_X, currentY, BOX_WIDTH, BOX_HEIGHT, 10, 10);
                g.setColor(new Color(226, 232, 240));
                g.setStroke(new BasicStroke(1f));
                g.drawRoundRect(BOX_X, currentY, BOX_WIDTH, BOX_HEIGHT, 10, 10);
            }

            // Line number index badge on left
            g.setColor(new Color(100, 116, 139));
            g.setFont(new Font(Font.MONOSPACED, Font.BOLD, 11));
            g.drawString(String.format("%02d", i + 1), BOX_X + 14, currentY + 25);

            // Vertical divider after line number
            g.setColor(new Color(226, 232, 240));
            g.drawLine(BOX_X + 36, currentY + 8, BOX_X + 36, currentY + BOX_HEIGHT - 8);

            // Crisp dark text positioned vertically centered inside the row, leaving right 115px clear for OCR tag
            g.setColor(highlight ? new Color(15, 23, 42) : new Color(51, 65, 85));
            g.setFont(new Font(Font.MONOSPACED, highlight ? Font.BOLD : Font.PLAIN, 12));
            String display = line.length() > 58 ? line.substring(0, 58) : line;
            g.drawString(display, BOX_X + 46, currentY + 26);

            currentY += LINE_STEP;
        }

        // Forensic Watermark Stamp Footer at bottom
        g.setColor(new Color(248, 250, 252));
        g.fillRoundRect(44, height - 96, width - 88, 54, 12, 12);
        g.setColor(new Color(203, 213, 225));
        g.drawRoundRect(44, height - 96, width - 88, 54, 12, 12);

        g.setColor(new Color(5, 150, 105));
        g.setFont(new Font(Font.MONOSPACED, Font.BOLD, 11));
        g.drawString("CYBERFUSION X WORM VAULT // SHA-256 & BLAKE3 SEALED ARTIFACT", 58, height - 73);
        g.setColor(new Color(71, 85, 105));
        g.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 11));
        g.drawString("Acquisition Source: " + embeddedMeta.getOrDefault("DeviceMake", "Mobile Forensic Capture"), 58, height - 54);

        g.dispose();

        try {
            ByteArrayOutputStream rawPngOut = new ByteArrayOutputStream();
            ImageIO.write(img, "png", rawPngOut);
            byte[] rawPng = rawPngOut.toByteArray();

            Map<String, String> allChunks = new LinkedHashMap<>(embeddedMeta);
            allChunks.put("ForensicOcrText", fullOcrGroundTruth);
            return injectPngTextChunks(rawPng, allChunks);
        } catch (Exception e) {
            throw new RuntimeException("Failed to render forensic PNG evidence", e);
        }
    }

    /**
     * Injects standard PNG tEXt chunks right before IEND so MetadataForensicsService
     * can extract authentic EXIF/metadata and OCR ground truth from the PNG binary.
     */
    private static byte[] injectPngTextChunks(byte[] pngBytes, Map<String, String> textChunks) {
        int iendOffset = -1;
        for (int i = pngBytes.length - 12; i >= 8; i--) {
            if (pngBytes[i + 4] == 'I' && pngBytes[i + 5] == 'E' && pngBytes[i + 6] == 'N' && pngBytes[i + 7] == 'D') {
                iendOffset = i;
                break;
            }
        }
        if (iendOffset == -1) return pngBytes;

        ByteArrayOutputStream out = new ByteArrayOutputStream(pngBytes.length + 2048);
        out.write(pngBytes, 0, iendOffset);

        for (Map.Entry<String, String> entry : textChunks.entrySet()) {
            byte[] keyBytes = entry.getKey().getBytes(StandardCharsets.UTF_8);
            byte[] valBytes = entry.getValue().getBytes(StandardCharsets.UTF_8);
            int dataLen = keyBytes.length + 1 + valBytes.length;

            byte[] typeAndData = new byte[4 + dataLen];
            typeAndData[0] = 't';
            typeAndData[1] = 'E';
            typeAndData[2] = 'X';
            typeAndData[3] = 't';
            System.arraycopy(keyBytes, 0, typeAndData, 4, keyBytes.length);
            typeAndData[4 + keyBytes.length] = 0;
            System.arraycopy(valBytes, 0, typeAndData, 4 + keyBytes.length + 1, valBytes.length);

            CRC32 crc = new CRC32();
            crc.update(typeAndData);
            int crcVal = (int) crc.getValue();

            ByteBuffer lenBuf = ByteBuffer.allocate(4).putInt(dataLen);
            ByteBuffer crcBuf = ByteBuffer.allocate(4).putInt(crcVal);

            out.writeBytes(lenBuf.array());
            out.writeBytes(typeAndData);
            out.writeBytes(crcBuf.array());
        }

        out.write(pngBytes, iendOffset, pngBytes.length - iendOffset);
        return out.toByteArray();
    }
}
