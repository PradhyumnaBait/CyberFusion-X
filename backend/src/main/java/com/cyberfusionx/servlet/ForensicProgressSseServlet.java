package com.cyberfusionx.servlet;

import com.cyberfusionx.container.ServletJsonHelper;
import com.cyberfusionx.db.ForensicDataStore;
import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

/**
 * Jakarta @WebServlet (asyncSupported = true) streaming real-time Server-Sent Events (SSE)
 * for OCR, AI entity extraction, and cryptographic verification progress.
 */
@WebServlet(name = "ForensicProgressSseServlet", urlPatterns = {"/api/v1/stream/*"}, asyncSupported = true)
public class ForensicProgressSseServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setStatus(200);
        resp.setContentType("text/event-stream;charset=UTF-8");
        resp.setHeader("Cache-Control", "no-cache");
        resp.setHeader("Connection", "keep-alive");

        ServletOutputStream out = resp.getOutputStream();
        String connectedMsg = "event: connected\ndata: "
                + ServletJsonHelper.GSON.toJson(Map.of("status", "SSE_STREAM_ACTIVE", "timestamp", Instant.now().toString()))
                + "\n\n";
        out.write(connectedMsg.getBytes(StandardCharsets.UTF_8));
        out.flush();

        BlockingQueue<Map<String, Object>> queue = new LinkedBlockingQueue<>();
        Consumer<Map<String, Object>> listener = queue::offer;
        ForensicDataStore store = ForensicDataStore.getInstance();
        store.registerSseListener(listener);

        try {
            // Stream events on this virtual thread for up to 5 minutes before client auto-reconnect
            long deadline = System.currentTimeMillis() + 300_000L;
            while (System.currentTimeMillis() < deadline) {
                Map<String, Object> evt = queue.poll(15, TimeUnit.SECONDS);
                if (evt != null) {
                    String payload = "event: progress\ndata: " + ServletJsonHelper.GSON.toJson(evt) + "\n\n";
                    out.write(payload.getBytes(StandardCharsets.UTF_8));
                    out.flush();
                } else {
                    String heartbeat = ": heartbeat " + System.currentTimeMillis() + "\n\n";
                    out.write(heartbeat.getBytes(StandardCharsets.UTF_8));
                    out.flush();
                }
            }
        } catch (Exception ignored) {
            // Client disconnected
        } finally {
            store.unregisterSseListener(listener);
        }
    }
}
