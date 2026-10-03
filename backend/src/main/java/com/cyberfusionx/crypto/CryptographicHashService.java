package com.cyberfusionx.crypto;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import javax.crypto.Mac;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Core Java Cryptographic Engine for CyberFusion X:
 * - Streaming SHA-256 via java.security.DigestInputStream
 * - Pure-Java BLAKE3 (256-bit) Cryptographic Hash implementation
 * - PBKDF2WithHmacSHA256 Password Hashing
 * - HMAC-SHA256 JWT Issuing & Verification
 * - RFC 6238 TOTP Multi-Factor Authentication
 * - Cryptographic Audit Ledger Hash-Chaining
 */
public final class CryptographicHashService {

    private static final String JWT_SECRET = System.getenv().getOrDefault(
            "JWT_SECRET", "cyberfusion-x-enterprise-forensics-jwt-hmac-secret-2026-key");
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final Gson GSON = new Gson();

    // BLAKE3 Specification Constants
    private static final int[] BLAKE3_IV = {
            0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A,
            0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19
    };
    private static final int[] MSG_PERMUTATION = {
            2, 6, 3, 10, 7, 0, 4, 13, 1, 11, 12, 5, 9, 14, 15, 8
    };
    private static final int CHUNK_START = 1;
    private static final int CHUNK_END = 2;
    private static final int PARENT = 4;
    private static final int ROOT = 8;
    private static final int BLOCK_LEN = 64;
    private static final int CHUNK_LEN = 1024;

    public record DualHashResult(String sha256, String blake3, long byteCount) {}

    /**
     * Computes SHA-256 of raw byte array.
     */
    public static String sha256Hex(byte[] data) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(data);
            return bytesToHex(digest);
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 computation failed", e);
        }
    }

    public static String sha256Hex(String text) {
        return sha256Hex(text.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Computes Dual Hashes (SHA-256 via DigestInputStream + BLAKE3) on a file stream.
     */
    public static DualHashResult computeDualHash(Path filePath) throws IOException {
        try (InputStream in = Files.newInputStream(filePath)) {
            return computeDualHash(in);
        }
    }

    public static DualHashResult computeDualHash(InputStream rawStream) throws IOException {
        try {
            MessageDigest sha256Digest = MessageDigest.getInstance("SHA-256");
            Blake3Hasher blake3Hasher = new Blake3Hasher();
            long totalBytes = 0;
            try (DigestInputStream dis = new DigestInputStream(rawStream, sha256Digest)) {
                byte[] buffer = new byte[8192];
                int read;
                while ((read = dis.read(buffer)) != -1) {
                    blake3Hasher.update(buffer, 0, read);
                    totalBytes += read;
                }
            }
            String sha256Hex = bytesToHex(sha256Digest.digest());
            String blake3Hex = bytesToHex(blake3Hasher.digest());
            return new DualHashResult(sha256Hex, blake3Hex, totalBytes);
        } catch (IOException ioe) {
            throw ioe;
        } catch (Exception e) {
            throw new IOException("Dual cryptographic hashing failed", e);
        }
    }

    public static String blake3Hex(byte[] data) {
        Blake3Hasher hasher = new Blake3Hasher();
        hasher.update(data, 0, data.length);
        return bytesToHex(hasher.digest());
    }

    public static String blake3Hex(String text) {
        return blake3Hex(text.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Generates a cryptographic salt and PBKDF2-HMAC-SHA256 password hash.
     */
    public static String generateSalt() {
        byte[] salt = new byte[16];
        SECURE_RANDOM.nextBytes(salt);
        return bytesToHex(salt);
    }

    public static String hashPassword(String password, String saltHex) {
        try {
            PBEKeySpec spec = new PBEKeySpec(
                    password.toCharArray(),
                    hexToBytes(saltHex),
                    65536,
                    256
            );
            SecretKeyFactory skf = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
            byte[] hash = skf.generateSecret(spec).getEncoded();
            return bytesToHex(hash);
        } catch (Exception e) {
            throw new RuntimeException("Password hashing failed", e);
        }
    }

    public static boolean verifyPassword(String rawPassword, String saltHex, String expectedHashHex) {
        String computed = hashPassword(rawPassword, saltHex);
        return MessageDigest.isEqual(
                computed.getBytes(StandardCharsets.UTF_8),
                expectedHashHex.getBytes(StandardCharsets.UTF_8)
        );
    }

    /**
     * Generates an HMAC-SHA256 signed JWT token for authenticated investigators.
     */
    public static String issueJwt(String userId, String username, String role, String fullName, String badgeNumber) {
        Map<String, Object> header = Map.of("alg", "HS256", "typ", "JWT");
        long now = Instant.now().getEpochSecond();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("sub", userId);
        payload.put("username", username);
        payload.put("role", role);
        payload.put("fullName", fullName);
        payload.put("badgeNumber", badgeNumber);
        payload.put("iat", now);
        payload.put("exp", now + 86400 * 7); // 7 days

        Base64.Encoder encoder = Base64.getUrlEncoder().withoutPadding();
        String headerB64 = encoder.encodeToString(GSON.toJson(header).getBytes(StandardCharsets.UTF_8));
        String payloadB64 = encoder.encodeToString(GSON.toJson(payload).getBytes(StandardCharsets.UTF_8));
        String signingInput = headerB64 + "." + payloadB64;
        String signatureB64 = encoder.encodeToString(hmacSha256(signingInput, JWT_SECRET));
        return signingInput + "." + signatureB64;
    }

    public static Map<String, Object> verifyJwt(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            return null;
        }
        try {
            Base64.Encoder encoder = Base64.getUrlEncoder().withoutPadding();
            String signingInput = parts[0] + "." + parts[1];
            String expectedSig = encoder.encodeToString(hmacSha256(signingInput, JWT_SECRET));
            if (!MessageDigest.isEqual(
                    expectedSig.getBytes(StandardCharsets.UTF_8),
                    parts[2].getBytes(StandardCharsets.UTF_8))) {
                return null;
            }
            String payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            Map<String, Object> claims = GSON.fromJson(payloadJson, new TypeToken<Map<String, Object>>() {}.getType());
            Number exp = (Number) claims.get("exp");
            if (exp != null && exp.longValue() < Instant.now().getEpochSecond()) {
                return null;
            }
            return claims;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Computes HMAC-SHA256 signature certificate for forensic verification records & reports.
     */
    public static String signForensicCertificate(String payload) {
        return bytesToHex(hmacSha256(payload, JWT_SECRET));
    }

    /**
     * Computes SHA-256 hash chain entry for Chain-of-Custody Ledger.
     */
    public static String computeLedgerEntryHash(long seq, String prevHash, String actor, String action,
                                                String target, String details, String timestamp) {
        String canonical = seq + "|" + prevHash + "|" + actor + "|" + action + "|" + target + "|" + details + "|" + timestamp;
        return sha256Hex(canonical);
    }

    /**
     * Generates a 6-digit RFC 6238 TOTP code for a given hex secret and 30-second window.
     */
    public static String generateTotpCode(String hexSecret, long timeStepSeconds) {
        try {
            byte[] key = hexToBytes(hexSecret);
            long counter = timeStepSeconds / 30L;
            byte[] counterBytes = ByteBuffer.allocate(8).putLong(counter).array();
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(key, "HmacSHA1"));
            byte[] hash = mac.doFinal(counterBytes);
            int offset = hash[hash.length - 1] & 0x0F;
            int binary = ((hash[offset] & 0x7F) << 24)
                    | ((hash[offset + 1] & 0xFF) << 16)
                    | ((hash[offset + 2] & 0xFF) << 8)
                    | (hash[offset + 3] & 0xFF);
            int otp = binary % 1_000_000;
            return String.format("%06d", otp);
        } catch (Exception e) {
            return "000000";
        }
    }

    public static boolean verifyTotpCode(String hexSecret, String code) {
        if (code == null || code.length() != 6) return false;
        long now = Instant.now().getEpochSecond();
        for (int window = -1; window <= 1; window++) {
            if (generateTotpCode(hexSecret, now + (window * 30L)).equals(code)) {
                return true;
            }
        }
        return false;
    }

    private static byte[] hmacSha256(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new RuntimeException("HMAC-SHA256 failure", e);
        }
    }

    public static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b & 0xFF));
        }
        return sb.toString();
    }

    public static byte[] hexToBytes(String hex) {
        int len = hex.length();
        byte[] out = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            out[i / 2] = (byte) ((Character.digit(hex.charAt(i), 16) << 4)
                    + Character.digit(hex.charAt(i + 1), 16));
        }
        return out;
    }

    // ========================================================================
    // Pure-Java BLAKE3 (256-bit) Specification Implementation
    // ========================================================================
    public static final class Blake3Hasher {
        private ChunkState chunkState;
        private final int[] keyWords;
        private final int[][] cvStack = new int[54][8];
        private int cvStackLen = 0;
        private final int flags;

        public Blake3Hasher() {
            this.keyWords = Arrays.copyOf(BLAKE3_IV, 8);
            this.flags = 0;
            this.chunkState = new ChunkState(this.keyWords, 0, this.flags);
        }

        public void update(byte[] input, int offset, int length) {
            int currOffset = offset;
            int remaining = length;
            while (remaining > 0) {
                if (chunkState.len() == CHUNK_LEN) {
                    int[] chunkCv = chunkState.output().chainingValue();
                    long totalChunks = chunkState.chunkCounter + 1;
                    addChunkChainingValue(chunkCv, totalChunks);
                    chunkState = new ChunkState(keyWords, totalChunks, flags);
                }
                int want = CHUNK_LEN - chunkState.len();
                int take = Math.min(want, remaining);
                chunkState.update(input, currOffset, take);
                currOffset += take;
                remaining -= take;
            }
        }

        public byte[] digest() {
            Output output = chunkState.output();
            int parentNodesRemaining = cvStackLen;
            while (parentNodesRemaining > 0) {
                parentNodesRemaining--;
                output = parentOutput(cvStack[parentNodesRemaining], output.chainingValue(), keyWords, flags);
            }
            return output.rootOutputBytes(32);
        }

        private void addChunkChainingValue(int[] newCv, long totalChunks) {
            while ((totalChunks & 1L) == 0L) {
                newCv = parentCv(cvStack[--cvStackLen], newCv, keyWords, flags);
                totalChunks >>= 1;
            }
            cvStack[cvStackLen++] = newCv;
        }
    }

    private static final class ChunkState {
        int[] chainingValue;
        long chunkCounter;
        byte[] block = new byte[BLOCK_LEN];
        int blockLen = 0;
        int blocksCompressed = 0;
        int flags;

        ChunkState(int[] keyWords, long chunkCounter, int flags) {
            this.chainingValue = Arrays.copyOf(keyWords, 8);
            this.chunkCounter = chunkCounter;
            this.flags = flags;
        }

        int len() {
            return BLOCK_LEN * blocksCompressed + blockLen;
        }

        int startFlag() {
            return blocksCompressed == 0 ? CHUNK_START : 0;
        }

        void update(byte[] input, int offset, int length) {
            int currOffset = offset;
            int remaining = length;
            while (remaining > 0) {
                if (blockLen == BLOCK_LEN) {
                    int[] blockWords = wordsFromLittleEndianBytes(block);
                    chainingValue = first8Words(compress(
                            chainingValue, blockWords, chunkCounter, BLOCK_LEN, flags | startFlag()));
                    blocksCompressed++;
                    Arrays.fill(block, (byte) 0);
                    blockLen = 0;
                }
                int want = BLOCK_LEN - blockLen;
                int take = Math.min(want, remaining);
                System.arraycopy(input, currOffset, block, blockLen, take);
                blockLen += take;
                currOffset += take;
                remaining -= take;
            }
        }

        Output output() {
            int[] blockWords = wordsFromLittleEndianBytes(block);
            return new Output(chainingValue, blockWords, chunkCounter, blockLen, flags | startFlag() | CHUNK_END);
        }
    }

    private record Output(int[] inputChainingValue, int[] blockWords, long counter, int blockLen, int flags) {
        int[] chainingValue() {
            return first8Words(compress(inputChainingValue, blockWords, counter, blockLen, flags));
        }

        byte[] rootOutputBytes(int outLen) {
            byte[] out = new byte[outLen];
            int[] words = compress(inputChainingValue, blockWords, 0, blockLen, flags | ROOT);
            ByteBuffer buf = ByteBuffer.allocate(64).order(ByteOrder.LITTLE_ENDIAN);
            for (int w : words) {
                buf.putInt(w);
            }
            System.arraycopy(buf.array(), 0, out, 0, outLen);
            return out;
        }
    }

    private static Output parentOutput(int[] leftChildCv, int[] rightChildCv, int[] keyWords, int flags) {
        int[] blockWords = new int[16];
        System.arraycopy(leftChildCv, 0, blockWords, 0, 8);
        System.arraycopy(rightChildCv, 0, blockWords, 8, 8);
        return new Output(keyWords, blockWords, 0, BLOCK_LEN, flags | PARENT);
    }

    private static int[] parentCv(int[] leftChildCv, int[] rightChildCv, int[] keyWords, int flags) {
        return parentOutput(leftChildCv, rightChildCv, keyWords, flags).chainingValue();
    }

    private static int[] compress(int[] chainingValue, int[] blockWords, long counter, int blockLen, int flags) {
        int[] state = {
                chainingValue[0], chainingValue[1], chainingValue[2], chainingValue[3],
                chainingValue[4], chainingValue[5], chainingValue[6], chainingValue[7],
                BLAKE3_IV[0], BLAKE3_IV[1], BLAKE3_IV[2], BLAKE3_IV[3],
                (int) counter, (int) (counter >>> 32), blockLen, flags
        };
        int[] block = Arrays.copyOf(blockWords, 16);
        for (int round = 0; round < 7; round++) {
            roundFunction(state, block);
            if (round < 6) {
                int[] permuted = new int[16];
                for (int i = 0; i < 16; i++) {
                    permuted[i] = block[MSG_PERMUTATION[i]];
                }
                block = permuted;
            }
        }
        for (int i = 0; i < 8; i++) {
            state[i] ^= state[i + 8];
            state[i + 8] ^= chainingValue[i];
        }
        return state;
    }

    private static void roundFunction(int[] state, int[] m) {
        g(state, 0, 4, 8, 12, m[0], m[1]);
        g(state, 1, 5, 9, 13, m[2], m[3]);
        g(state, 2, 6, 10, 14, m[4], m[5]);
        g(state, 3, 7, 11, 15, m[6], m[7]);
        g(state, 0, 5, 10, 15, m[8], m[9]);
        g(state, 1, 6, 11, 12, m[10], m[11]);
        g(state, 2, 7, 8, 13, m[12], m[13]);
        g(state, 3, 4, 9, 14, m[14], m[15]);
    }

    private static void g(int[] state, int a, int b, int c, int d, int mx, int my) {
        state[a] = state[a] + state[b] + mx;
        state[d] = Integer.rotateRight(state[d] ^ state[a], 16);
        state[c] = state[c] + state[d];
        state[b] = Integer.rotateRight(state[b] ^ state[c], 12);
        state[a] = state[a] + state[b] + my;
        state[d] = Integer.rotateRight(state[d] ^ state[a], 8);
        state[c] = state[c] + state[d];
        state[b] = Integer.rotateRight(state[b] ^ state[c], 7);
    }

    private static int[] first8Words(int[] compressionOutput) {
        return Arrays.copyOf(compressionOutput, 8);
    }

    private static int[] wordsFromLittleEndianBytes(byte[] bytes) {
        int[] words = new int[16];
        ByteBuffer buf = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN);
        for (int i = 0; i < 16; i++) {
            words[i] = buf.getInt();
        }
        return words;
    }
}
