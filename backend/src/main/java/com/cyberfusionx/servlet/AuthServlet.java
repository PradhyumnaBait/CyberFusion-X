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

        if ("/users".equals(path)) {
            // Officer-only (filter already required a JWT). Never includes credentials.
            List<Map<String, Object>> users = new ArrayList<>();
            for (User u : store.listAllUsers()) users.add(new LinkedHashMap<>(u.toSafeMap()));
            ServletJsonHelper.writeJson(resp, 200, Map.of("users", users));
            return;
        }

        if ("/demo-users".equals(path)) {
            // Public ONLY in demo mode and WITHOUT passwords: names/roles for the badged 1-click demo login.
            if (!com.cyberfusionx.filter.AuthenticationAndRbacFilter.isDemoMode()) {
                ServletJsonHelper.writeError(resp, 403, "Demo mode is disabled.");
                return;
            }
            List<Map<String, Object>> users = new ArrayList<>();
            for (User u : store.listAllUsers()) {
                Map<String, Object> safe = new LinkedHashMap<>(u.toSafeMap());
                safe.put("permissionsSummary", switch (u.role) {
                    case "LEAD_INVESTIGATOR" -> "Full access: triage, freeze packets, reports.";
                    case "FORENSIC_ANALYST" -> "Evidence, timeline and graph analysis.";
                    default -> "Read-only audit + integrity verification.";
                });
                users.add(safe);
            }
            ServletJsonHelper.writeJson(resp, 200, Map.of("users", users, "demoMode", true));
            return;
        }

        // (Removed: the old public /totp-preview leaked a live MFA code to anyone.)

        // Default: /me
        String username = ServletJsonHelper.getActorUsername(req);
        User user = store.findUserByUsername(username);
        if (user == null) {
            ServletJsonHelper.writeError(resp, 401, "Session user not found. Please login again.");
            return;
        }
        String token = CryptographicHashService.issueJwt(
                user.id, user.username, user.role, user.fullName, user.badgeNumber
        );
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("user", user.toSafeMap());
        result.put("token", token);
        setSessionCookie(resp, token);
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
                setSessionCookie(resp, token);
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
            resp.setHeader("Set-Cookie", "cfx_token=; Path=/; Max-Age=0; SameSite=None; Secure; Partitioned");
            ServletJsonHelper.writeJson(resp, 200, Map.of("status", "SIGNED_OUT"));
            return;
        }

        if ("/demo-login".equals(path) || "/switch-role".equals(path)) {
            // Badged demo access for college demonstrations ONLY. Disabled when DEMO_MODE=false.
            if (!com.cyberfusionx.filter.AuthenticationAndRbacFilter.isDemoMode()) {
                ServletJsonHelper.writeError(resp, 403, "Demo login is disabled. Use /login with your credentials.");
                return;
            }
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

            setSessionCookie(resp, token);
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

        setSessionCookie(resp, token);
        ServletJsonHelper.writeJson(resp, 200, Map.of(
                "user", user.toSafeMap(),
                "token", token
        ));
    }

    /**
     * Also store the JWT in a cookie. Some preview/hosting proxies strip the
     * Authorization header; cookies survive. SameSite=None + Partitioned lets
     * it work inside the cross-site preview iframe; the token is still a
     * signed JWT verified on every request.
     */
    private static void setSessionCookie(HttpServletResponse resp, String token) {
        resp.setHeader("Set-Cookie",
                "cfx_token=" + token + "; Path=/; Max-Age=604800; SameSite=None; Secure; Partitioned");
    }
}
