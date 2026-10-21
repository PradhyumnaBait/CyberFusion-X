package com.cyberfusionx.servlet;

import com.cyberfusionx.container.ServletJsonHelper;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * SIMULATED bank endpoint for demonstration only. There is no public bank
 * freeze API in India — in production, freeze requests flow through I4C's
 * CFCFRMS and bank nodal officers. This servlet exists so the full
 * request -> acknowledgement lifecycle can be demonstrated honestly.
 */
@WebServlet(name = "MockBankServlet", urlPatterns = {"/mock/bank/freeze"})
public class MockBankServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Map<String, Object> body = ServletJsonHelper.readJsonMap(req);
        String accountRef = ServletJsonHelper.getString(body, "accountRef", "");
        if (accountRef.isBlank()) {
            ServletJsonHelper.writeJson(resp, 400, Map.of(
                    "status", "REJECTED", "simulation", true,
                    "reason", "accountRef is required"));
            return;
        }
        ServletJsonHelper.writeJson(resp, 200, Map.of(
                "status", "ACKNOWLEDGED",
                "simulation", true,
                "ackRef", "MOCKBANK-ACK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
                "accountRef", accountRef,
                "receivedAt", Instant.now().toString(),
                "note", "Simulated acknowledgement only — no real account has been frozen."
        ));
    }
}
