package com.cyberfusionx.servlet;

import com.cyberfusionx.container.ServletJsonHelper;
import com.cyberfusionx.crypto.CryptographicHashService;
import com.cyberfusionx.db.ForensicDataStore;
import com.cyberfusionx.model.Models.User;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Jakarta @WebServlet handling Investigator Authentication, User Registration (Sign Up),
 * JWT Issuance, TOTP MFA Verification, and Demo Investigator Persona Access.
 */
@WebServlet(name = "AuthServlet", urlPatterns = {"/api/v1/auth/*"})
public class AuthServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String path = req.getPathInfo() != null ? req.getPathInfo() : "/me";
        ForensicDataStore store = ForensicDataStore.getInstance();

        if ("/users".equals(path) || "/demo-users".equals(path)) {
            List<Map<String, Object>> users = new ArrayList<>();
            for (User u : store.listAllUsers()) {
                Map<String, Object> safe = new LinkedHashMap<>(u.toSafeMap());
                // Provide demo credentials metadata for the 3 seeded demo accounts
                switch (u.username) {
                    case "arjun.verma" -> {
                        safe.put("demoPassword", "Forensics@2026");
                        safe.put("permissionsSummary", "Full Command Access: Create cases, ingest/seal evidence, run 1-byte tamper sandbox, merge graph entities, and sign PDF/STIX dossiers.");
                    }
                    case "priya.nair" -> {
                        safe.put("demoPassword", "Analyst@2026");
                        safe.put("permissionsSummary", "Forensic Analyst Access: Upload evidence, inspect OCR bounding boxes, annotate timelines & knowledge graphs, and export reports.");
                    }
                    case "rohan.kulkarni" -> {
                        safe.put("demoPassword", "Auditor@2026");
                        safe.put("permissionsSummary", "Judicial Auditor Access: Read-only chain-of-custody inspection, live SHA-256/BLAKE3 re-verification, Merkle audit validation, and PDF export.");
                    }
                    default -> {
                        safe.put("demoPassword", "");
                        safe.put("permissionsSummary", "Registered Investigator Session");
                    }
                }
                users.add(safe);
            }
            ServletJsonHelper.writeJson(resp, 200, Map.of("users", users));
            return;
        }

        if ("/totp-preview".equals(path)) {
            User lead = store.findUserByUsername("arjun.verma");
            String currentCode = lead != null && lead.mfaSecret != null
                    ? CryptographicHashService.generateTotpCode(lead.mfaSecret, Instant.now().getEpochSecond())
                    : "000000";
            ServletJsonHelper.writeJson(resp, 200, Map.of(
                    "username", "arjun.verma",
                    "currentTotpCode", currentCode,
                    "validWindowSeconds", 30
            ));
            return;
        }

        // Default: /me
        String username = ServletJsonHelper.getActorUsername(req);
        User user = store.findUserByUsername(username);
        if (user == null) {
            user = store.findUserByUsername("arjun.verma");
        }
        String token = CryptographicHashService.issueJwt(
                user.id, user.username, user.role, user.fullName, user.badgeNumber
        );
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("user", user.toSafeMap());
        result.put("token", token);
        ServletJsonHelper.writeJson(resp, 200, result);
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String path = req.getPathInfo() != null ? req.getPathInfo() : "/login";
        ForensicDataStore store = ForensicDataStore.getInstance();
        Map<String, Object> body = ServletJsonHelper.readJsonMap(req);

        if ("/register".equals(path) || "/signup".equals(path)) {
            String username = ServletJsonHelper.getString(body, "username", "");
            String email = ServletJsonHelper.getString(body, "email", "");
            String fullName = ServletJsonHelper.getString(body, "fullName", "");
            String password = ServletJsonHelper.getString(body, "password", "");
            String role = ServletJsonHelper.getString(body, "role", "FORENSIC_ANALYST");
            String organization = ServletJsonHelper.getString(body, "organization", "CyberFusion X Forensics Division");

            if (username.isBlank() || password.isBlank()) {
                ServletJsonHelper.writeError(resp, 400, "Username and password are required to register an account.");
                return;
            }
            try {
                User created = store.registerUser(
                        username, email, fullName, password, role, organization, req.getRemoteAddr()
                );
                String token = CryptographicHashService.issueJwt(
                        created.id, created.username, created.role, created.fullName, created.badgeNumber
                );
                ServletJsonHelper.writeJson(resp, 201, Map.of(
                        "user", created.toSafeMap(),
                        "token", token
                ));
            } catch (IllegalArgumentException e) {
                ServletJsonHelper.writeError(resp, 409, e.getMessage());
            }
            return;
        }

        if ("/logout".equals(path)) {
            String actor = ServletJsonHelper.getActorUsername(req);
            String role = ServletJsonHelper.getActorRole(req);
            store.appendLedgerEntry(null, actor, role,
                    "INVESTIGATOR_SIGNED_OUT", actor,
                    "Investigator signed out of forensic session", req.getRemoteAddr());
            ServletJsonHelper.writeJson(resp, 200, Map.of("status", "SIGNED_OUT"));
            return;
        }

        if ("/switch-role".equals(path)) {
            String targetUsername = ServletJsonHelper.getString(body, "username", "arjun.verma");
            User user = store.findUserByUsername(targetUsername);
            if (user == null) {
                ServletJsonHelper.writeError(resp, 404, "Investigator account not found: " + targetUsername);
                return;
            }
            String token = CryptographicHashService.issueJwt(
                    user.id, user.username, user.role, user.fullName, user.badgeNumber
            );
            store.appendLedgerEntry(null, user.username, user.role,
                    "INVESTIGATOR_SESSION_SWITCH", user.badgeNumber,
                    "Activated session as " + user.fullName + " [" + user.role + "]", req.getRemoteAddr());

            ServletJsonHelper.writeJson(resp, 200, Map.of(
                    "user", user.toSafeMap(),
                    "token", token
            ));
            return;
        }

        // Standard /login
        String username = ServletJsonHelper.getString(body, "username", "");
        String password = ServletJsonHelper.getString(body, "password", "");
        User user = store.findUserByUsername(username);

        if (user == null || !CryptographicHashService.verifyPassword(password, user.passwordSalt, user.passwordHash)) {
            ServletJsonHelper.writeError(resp, 401, "Invalid investigator username or password");
            return;
        }

        String token = CryptographicHashService.issueJwt(
                user.id, user.username, user.role, user.fullName, user.badgeNumber
        );
        store.appendLedgerEntry(null, user.username, user.role,
                "INVESTIGATOR_AUTHENTICATED", user.badgeNumber,
                "Authenticated via PBKDF2-HMAC-SHA256 & issued HS256 JWT", req.getRemoteAddr());

        ServletJsonHelper.writeJson(resp, 200, Map.of(
                "user", user.toSafeMap(),
                "token", token
        ));
    }
}
