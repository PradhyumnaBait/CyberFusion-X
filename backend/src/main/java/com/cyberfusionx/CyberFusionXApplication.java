package com.cyberfusionx;

import com.cyberfusionx.container.JakartaServletContainer;
import com.cyberfusionx.db.ForensicDataStore;
import com.cyberfusionx.filter.AuthenticationAndRbacFilter;
import com.cyberfusionx.filter.ChainOfCustodyAuditFilter;
import com.cyberfusionx.filter.SecurityHeadersFilter;
import com.cyberfusionx.servlet.AuthServlet;
import com.cyberfusionx.servlet.CaseServlet;
import com.cyberfusionx.servlet.EntityServlet;
import com.cyberfusionx.servlet.EvidenceIntegrityServlet;
import com.cyberfusionx.servlet.EvidenceUploadServlet;
import com.cyberfusionx.servlet.ForensicProgressSseServlet;
import com.cyberfusionx.servlet.HealthCheckServlet;
import com.cyberfusionx.servlet.IncidentGraphServlet;
import com.cyberfusionx.servlet.ReportServlet;
import com.cyberfusionx.servlet.SearchServlet;
import com.cyberfusionx.servlet.TimelineServlet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.file.Paths;
import java.util.concurrent.CountDownLatch;

/**
 * Main Bootstrapper for CyberFusion X — AI-Powered Digital Forensics & Fraud Reconstruction Platform.
 * Runs on Java 21 LTS with Virtual Threads and Jakarta Servlet 6.1.
 */
public final class CyberFusionXApplication {

    private static final Logger LOG = LoggerFactory.getLogger(CyberFusionXApplication.class);

    public static void main(String[] args) throws Exception {
        String host = System.getenv().getOrDefault("HOST", "0.0.0.0");
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));

        LOG.info("Starting CyberFusion X Forensic Platform on {}:{} (Java {})",
                host, port, System.getProperty("java.version"));

        // Initialize Forensic Data Store & Seed Sample Cases
        ForensicDataStore.getInstance();

        JakartaServletContainer container = new JakartaServletContainer(host, port);
        container.setStaticRootDir(Paths.get("frontend/public-spa").toAbsolutePath());

        // Register Jakarta @WebFilter pipeline
        container.registerFilter(new SecurityHeadersFilter());
        container.registerFilter(new AuthenticationAndRbacFilter());
        container.registerFilter(new ChainOfCustodyAuditFilter());

        // Register Jakarta @WebServlet endpoints
        container.registerServlet(new HealthCheckServlet());
        container.registerServlet(new AuthServlet());
        container.registerServlet(new CaseServlet());
        container.registerServlet(new EvidenceUploadServlet());
        container.registerServlet(new EvidenceIntegrityServlet());
        container.registerServlet(new EntityServlet());
        container.registerServlet(new TimelineServlet());
        container.registerServlet(new IncidentGraphServlet());
        container.registerServlet(new ReportServlet());
        container.registerServlet(new SearchServlet());
        container.registerServlet(new ForensicProgressSseServlet());

        container.start();

        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            LOG.info("Shutting down CyberFusion X Jakarta Servlet Container...");
            container.stop();
        }));

        new CountDownLatch(1).await();
    }
}
