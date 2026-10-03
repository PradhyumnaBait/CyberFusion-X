package com.cyberfusionx.filter;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.FilterConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;

import java.io.IOException;
import java.util.UUID;

/**
 * Jakarta @WebFilter applying forensic security headers and SLF4J MDC request tracing.
 */
@WebFilter(filterName = "SecurityHeadersFilter", urlPatterns = {"/api/*"})
public class SecurityHeadersFilter implements Filter {

    @Override
    public void init(FilterConfig filterConfig) {}

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        String traceId = "cfx-" + UUID.randomUUID().toString().substring(0, 8);
        MDC.put("traceId", traceId);
        try {
            if (response instanceof HttpServletResponse httpResp) {
                httpResp.setHeader("X-Content-Type-Options", "nosniff");
                httpResp.setHeader("X-Forensic-Trace-Id", traceId);
                httpResp.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
            }
            request.setAttribute("traceId", traceId);
            chain.doFilter(request, response);
        } finally {
            MDC.clear();
        }
    }

    @Override
    public void destroy() {}
}
