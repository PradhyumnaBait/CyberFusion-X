package com.cyberfusionx.filter;

import com.cyberfusionx.container.ServletJsonHelper;
import com.cyberfusionx.crypto.CryptographicHashService;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.FilterConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;

import java.io.IOException;
import java.util.Map;
import java.util.Set;

/**
 * JWT authentication + RBAC.
 *
 * SECURITY MODEL (fixed in the two-portal redesign):
 *  - Public citizen routes (/api/v1/public/*) and auth/health endpoints need no JWT —
 *    they are protected by unguessable per-complaint tokens instead (checked in the servlet).
 *  - Every other /api/v1/* route REQUIRES a valid JWT. Missing/invalid token => 401.
 *    (Previously a missing token silently became LEAD_INVESTIGATOR — removed.)
 *  - AUDITOR stays read-only except integrity verification.
 * Demo logins exist only via POST /api/v1/auth/demo-login and only when DEMO_MODE=true.
 */
@WebFilter(filterName = "AuthenticationAndRbacFilter", urlPatterns = {"/api/v1/*"})
public class AuthenticationAndRbacFilter implements Filter {

    private static final Set<String> PUBLIC_EXACT = Set.of(
            "/api/v1/health",
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/signup",
            "/api/v1/auth/demo-login",
            "/api/v1/auth/demo-users"
    );

    public static boolean isDemoMode() {
        return !"false".equalsIgnoreCase(System.getenv().getOrDefault("DEMO_MODE", "true"));
    }

    @Override
    public void init(FilterConfig filterConfig) {}

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse resp = (HttpServletResponse) response;
        String uri = req.getRequestURI();

        boolean isPublic = PUBLIC_EXACT.contains(uri) || uri.startsWith("/api/v1/public/");
        if (isPublic) {
            // Citizen routes authenticate with their complaint token inside the servlet.
            req.setAttribute("actorUsername", "citizen-portal");
            req.setAttribute("actorRole", "CITIZEN");
            chain.doFilter(request, response);
            return;
        }

        String token = extractToken(req);
        Map<String, Object> claims = CryptographicHashService.verifyJwt(token);
        if (claims == null) {
            ServletJsonHelper.writeError(resp, 401,
                    "Authentication required: provide a valid officer token (login via /api/v1/auth/login"
                            + (isDemoMode() ? " or the badged demo login" : "") + ").");
            return;
        }

        String userId = String.valueOf(claims.getOrDefault("sub", ""));
        String username = String.valueOf(claims.getOrDefault("username", ""));
        String role = String.valueOf(claims.getOrDefault("role", ""));
        String fullName = String.valueOf(claims.getOrDefault("fullName", ""));

        req.setAttribute("actorUserId", userId);
        req.setAttribute("actorUsername", username);
        req.setAttribute("actorRole", role);
        req.setAttribute("actorFullName", fullName);
        MDC.put("actor", username + ":" + role);

        String method = req.getMethod();
        if ("AUDITOR".equalsIgnoreCase(role)
                && ("POST".equalsIgnoreCase(method) || "PUT".equalsIgnoreCase(method) || "DELETE".equalsIgnoreCase(method))) {
            boolean allowedForAuditor = uri.startsWith("/api/v1/auth")
                    || uri.contains("/verify")
                    || uri.endsWith("/ledger/verify");
            if (!allowedForAuditor) {
                ServletJsonHelper.writeError(resp, 403,
                        "RBAC Access Denied: Role 'AUDITOR' has read-only chain-of-custody permissions and may only execute cryptographic verification.");
                return;
            }
        }

        chain.doFilter(request, response);
    }

    /**
     * Token transports, in order. The frontend sends the JWT through SEVERAL of
     * these at once because some hosting/preview proxies silently strip the
     * standard Authorization header (observed in the Arena e2b preview: login
     * succeeded and the query-token SSE stream worked, but every
     * Authorization-header fetch was rejected). A JWT is still required and
     * fully verified either way — this only changes how it travels.
     */
    private static String extractToken(HttpServletRequest req) {
        String authHeader = req.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ") && !authHeader.substring(7).isBlank()) {
            return authHeader.substring(7).trim();
        }
        String xOfficer = req.getHeader("X-Officer-Token");
        if (xOfficer != null && !xOfficer.isBlank()) {
            return xOfficer.trim();
        }
        Cookie[] cookies = req.getCookies();
        if (cookies != null) {
            for (Cookie c : cookies) {
                if ("cfx_token".equals(c.getName()) && c.getValue() != null && !c.getValue().isBlank()) {
                    return c.getValue();
                }
            }
        }
        // Last resort (also the only option for EventSource/<img>): ?access_token=
        String q = req.getParameter("access_token");
        if (q != null && !q.isBlank()) return q.trim();
        return null;
    }

    @Override
    public void destroy() {}
}
