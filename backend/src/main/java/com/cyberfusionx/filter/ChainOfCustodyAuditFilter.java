package com.cyberfusionx.filter;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.FilterConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;

/**
 * Jakarta @WebFilter that logs every forensic API invocation with execution latency and status.
 */
@WebFilter(filterName = "ChainOfCustodyAuditFilter", urlPatterns = {"/api/v1/*"})
public class ChainOfCustodyAuditFilter implements Filter {

    private static final Logger LOG = LoggerFactory.getLogger(ChainOfCustodyAuditFilter.class);

    @Override
    public void init(FilterConfig filterConfig) {}

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        long startNs = System.nanoTime();
        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse resp = (HttpServletResponse) response;
        try {
            chain.doFilter(request, response);
        } finally {
            long elapsedMs = (System.nanoTime() - startNs) / 1_000_000L;
            LOG.info("ForensicAPI {} {} -> HTTP {} ({} ms)",
                    req.getMethod(), req.getRequestURI(), resp.getStatus(), elapsedMs);
        }
    }

    @Override
    public void destroy() {}
}
