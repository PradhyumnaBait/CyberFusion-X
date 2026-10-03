package com.cyberfusionx.servlet;

import com.cyberfusionx.container.ServletJsonHelper;
import com.cyberfusionx.db.ForensicDataStore;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.lang.management.ManagementFactory;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Jakarta @WebServlet providing JVM, Servlet Container, and Forensic Engine health metrics.
 */
@WebServlet(name = "HealthCheckServlet", urlPatterns = {"/api/v1/health"})
public class HealthCheckServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        ForensicDataStore store = ForensicDataStore.getInstance();
        Map<String, Object> ledgerStatus = store.verifyEntireAuditLedger();

        Map<String, Object> health = new LinkedHashMap<>();
        health.put("status", "UP");
        health.put("platform", "CyberFusion X — AI-Powered Digital Forensics & Fraud Reconstruction");
        health.put("javaVersion", System.getProperty("java.version"));
        health.put("jvmVendor", System.getProperty("java.vendor"));
        health.put("servletSpec", "Jakarta Servlet 6.1 (Virtual Threads Enabled)");
        health.put("cryptoAlgorithms", new String[]{"SHA-256 (DigestInputStream)", "BLAKE3-256", "PBKDF2-HMAC-SHA256", "HMAC-SHA256 JWT", "RFC-6238 TOTP"});
        health.put("graphEngine", "JGraphT-Compatible DirectedWeightedPseudograph (PageRank, Brandes Betweenness, Dijkstra Shortest Path)");
        health.put("uptimeMs", ManagementFactory.getRuntimeMXBean().getUptime());
        health.put("activeCases", store.listCasesWithStats().size());
        health.put("auditLedgerChainIntact", ledgerStatus.get("chainIntact"));
        health.put("headMerkleHash", ledgerStatus.get("headMerkleHash"));
        health.put("timestamp", Instant.now().toString());

        ServletJsonHelper.writeJson(resp, 200, health);
    }
}
