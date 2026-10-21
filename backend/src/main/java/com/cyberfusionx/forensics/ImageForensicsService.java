package com.cyberfusionx.forensics;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;

/**
 * Lightweight image forensics helpers (pure Java, no native deps).
 * Currently: perceptual average-hash (aHash) for near-duplicate screenshot detection.
 * aHash only says "these images look alike" — it never proves forgery.
 */
public final class ImageForensicsService {

    private ImageForensicsService() {}

    /** 64-bit aHash as 16 hex chars, or null if bytes are not a readable image. */
    public static String computeAHash(byte[] imageBytes) {
        try {
            BufferedImage src = ImageIO.read(new ByteArrayInputStream(imageBytes));
            if (src == null) return null;
            BufferedImage small = new BufferedImage(8, 8, BufferedImage.TYPE_BYTE_GRAY);
            Graphics2D g = small.createGraphics();
            g.drawImage(src, 0, 0, 8, 8, null);
            g.dispose();
            int[] px = new int[64];
            long sum = 0;
            for (int y = 0; y < 8; y++) {
                for (int x = 0; x < 8; x++) {
                    int v = small.getRaster().getSample(x, y, 0);
                    px[y * 8 + x] = v;
                    sum += v;
                }
            }
            double mean = sum / 64.0;
            long bits = 0L;
            for (int i = 0; i < 64; i++) {
                if (px[i] >= mean) bits |= (1L << i);
            }
            return String.format("%016x", bits);
        } catch (Exception e) {
            return null;
        }
    }

    /** Hamming distance between two aHashes; <=6 is treated as "looks like the same screenshot". */
    public static int hammingDistance(String a, String b) {
        if (a == null || b == null || a.length() != b.length()) return 64;
        try {
            long x = Long.parseUnsignedLong(a, 16) ^ Long.parseUnsignedLong(b, 16);
            return Long.bitCount(x);
        } catch (NumberFormatException e) {
            return 64;
        }
    }
}
