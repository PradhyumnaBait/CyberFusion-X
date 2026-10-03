package com.cyberfusionx.container;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.FilterConfig;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletConfig;
import jakarta.servlet.ServletContext;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.WriteListener;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.Part;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.lang.reflect.Proxy;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;

/**
 * Embedded Jakarta Servlet 6.1 Container powered by Java 21 Virtual Threads.
 * Supports @WebServlet, @WebFilter, @MultipartConfig (RFC 7578 Part streaming),
 * FilterChain execution, and static SPA asset serving.
 */
public final class JakartaServletContainer {

    private static final Logger LOG = LoggerFactory.getLogger(JakartaServletContainer.class);

    private final String host;
    private final int port;
    private final List<RegisteredFilter> filters = new ArrayList<>();
    private final List<RegisteredServlet> servlets = new ArrayList<>();
    private final Map<String, Object> contextAttributes = new ConcurrentHashMap<>();
    private final ServletContext servletContext;
    private Path staticRootDir;
    private HttpServer httpServer;

    private record RegisteredFilter(String name, List<String> urlPatterns, Filter filter) {}
    private record RegisteredServlet(String name, List<String> urlPatterns, HttpServlet servlet) {}

    public JakartaServletContainer(String host, int port) {
        this.host = host;
        this.port = port;
        this.servletContext = createServletContextProxy();
    }

    public void setStaticRootDir(Path staticRootDir) {
        this.staticRootDir = staticRootDir;
    }

    public void registerFilter(Filter filter) throws ServletException {
        Class<?> clazz = filter.getClass();
        WebFilter wf = clazz.getAnnotation(WebFilter.class);
        String name = (wf != null && !wf.filterName().isEmpty()) ? wf.filterName() : clazz.getSimpleName();
        List<String> patterns = new ArrayList<>();
        if (wf != null) {
            Collections.addAll(patterns, wf.value());
            Collections.addAll(patterns, wf.urlPatterns());
        }
        if (patterns.isEmpty()) {
            patterns.add("/api/*");
        }
        FilterConfig config = createFilterConfigProxy(name);
        filter.init(config);
        filters.add(new RegisteredFilter(name, patterns, filter));
        LOG.info("Registered Jakarta @WebFilter [{}] -> {}", name, patterns);
    }

    public void registerServlet(HttpServlet servlet) throws ServletException {
        Class<?> clazz = servlet.getClass();
        WebServlet ws = clazz.getAnnotation(WebServlet.class);
        String name = (ws != null && !ws.name().isEmpty()) ? ws.name() : clazz.getSimpleName();
        List<String> patterns = new ArrayList<>();
        if (ws != null) {
            Collections.addAll(patterns, ws.value());
            Collections.addAll(patterns, ws.urlPatterns());
        }
        ServletConfig config = createServletConfigProxy(name);
        servlet.init(config);
        servlets.add(new RegisteredServlet(name, patterns, servlet));
        LOG.info("Registered Jakarta @WebServlet [{}] -> {}", name, patterns);
    }

    public void start() throws IOException {
        httpServer = HttpServer.create(new InetSocketAddress(host, port), 128);
        // Java 21 Project Loom Virtual Threads Executor
        httpServer.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
        httpServer.createContext("/", this::handleExchange);
        httpServer.start();
        LOG.info("CyberFusion X Jakarta Servlet 6.1 Container listening on http://{}:{} (Java 21 Virtual Threads)",
                host, port);
    }

    public void stop() {
        if (httpServer != null) {
            for (RegisteredServlet rs : servlets) {
                try { rs.servlet.destroy(); } catch (Exception ignored) {}
            }
            for (RegisteredFilter rf : filters) {
                try { rf.filter.destroy(); } catch (Exception ignored) {}
            }
            httpServer.stop(0);
        }
    }

    private void handleExchange(HttpExchange exchange) {
        try {
            URI uri = exchange.getRequestURI();
            String rawPath = uri.getPath() != null ? uri.getPath() : "/";

            // Handle CORS Preflight immediately
            Headers respHeaders = exchange.getResponseHeaders();
            String origin = exchange.getRequestHeaders().getFirst("Origin");
            respHeaders.set("Access-Control-Allow-Origin", origin != null ? origin : "*");
            respHeaders.set("Access-Control-Allow-Credentials", "true");
            respHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
            respHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-Client-SHA256");

            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                exchange.close();
                return;
            }

            ServletMatch match = matchServlet(rawPath);
            if (match == null) {
                if (serveStaticAssetIfPresent(exchange, rawPath)) {
                    return;
                }
                byte[] notFound = "{\"error\":\"Endpoint not found\"}".getBytes(StandardCharsets.UTF_8);
                respHeaders.set("Content-Type", "application/json;charset=UTF-8");
                exchange.sendResponseHeaders(404, notFound.length);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(notFound);
                }
                return;
            }

            byte[] requestBody = exchange.getRequestBody().readAllBytes();
            HttpServletRequest req = createHttpServletRequestProxy(exchange, match.servletPath, match.pathInfo, requestBody);
            ResponseState respState = new ResponseState(exchange);
            HttpServletResponse resp = createHttpServletResponseProxy(respState);

            List<Filter> matchingFilters = new ArrayList<>();
            for (RegisteredFilter rf : filters) {
                if (matchesAnyPattern(rawPath, rf.urlPatterns)) {
                    matchingFilters.add(rf.filter);
                }
            }

            FilterChain chain = new FilterChain() {
                private int index = 0;

                @Override
                public void doFilter(ServletRequest request, ServletResponse response)
                        throws IOException, ServletException {
                    if (index < matchingFilters.size()) {
                        Filter nextFilter = matchingFilters.get(index++);
                        nextFilter.doFilter(request, response, this);
                    } else {
                        match.servlet.service(request, response);
                    }
                }
            };

            chain.doFilter(req, resp);
            respState.commitAndClose();
        } catch (Exception e) {
            LOG.error("Unhandled Servlet exception processing {}", exchange.getRequestURI(), e);
            try {
                byte[] err = ("{\"error\":\"" + escapeJson(e.getMessage()) + "\"}").getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "application/json;charset=UTF-8");
                exchange.sendResponseHeaders(500, err.length);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(err);
                }
            } catch (Exception ignored) {}
        }
    }

    private boolean serveStaticAssetIfPresent(HttpExchange exchange, String requestPath) throws IOException {
        if (staticRootDir == null || !Files.isDirectory(staticRootDir)) {
            return false;
        }
        String cleanPath = requestPath.equals("/") ? "/index.html" : requestPath;
        Path target = staticRootDir.resolve(cleanPath.substring(1)).normalize();
        if (!target.startsWith(staticRootDir)) {
            return false;
        }
        if (!Files.exists(target) || Files.isDirectory(target)) {
            if (!requestPath.startsWith("/api/")) {
                target = staticRootDir.resolve("index.html");
            }
        }
        if (Files.exists(target) && Files.isRegularFile(target)) {
            byte[] bytes = Files.readAllBytes(target);
            String mime = guessStaticMime(target.getFileName().toString());
            exchange.getResponseHeaders().set("Content-Type", mime);
            exchange.getResponseHeaders().set("Content-Length", String.valueOf(bytes.length));
            if ("HEAD".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(200, -1);
                exchange.close();
            } else {
                exchange.sendResponseHeaders(200, bytes.length);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(bytes);
                }
            }
            return true;
        }
        return false;
    }

    private static String guessStaticMime(String name) {
        String lower = name.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".html")) return "text/html;charset=UTF-8";
        if (lower.endsWith(".js")) return "application/javascript;charset=UTF-8";
        if (lower.endsWith(".css")) return "text/css;charset=UTF-8";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".json")) return "application/json;charset=UTF-8";
        return "application/octet-stream";
    }

    private record ServletMatch(HttpServlet servlet, String servletPath, String pathInfo) {}

    private ServletMatch matchServlet(String path) {
        for (RegisteredServlet rs : servlets) {
            for (String pattern : rs.urlPatterns) {
                if (pattern.endsWith("/*")) {
                    String prefix = pattern.substring(0, pattern.length() - 2);
                    if (path.equals(prefix)) {
                        return new ServletMatch(rs.servlet, prefix, null);
                    }
                    if (path.startsWith(prefix + "/")) {
                        return new ServletMatch(rs.servlet, prefix, path.substring(prefix.length()));
                    }
                } else if (pattern.equals(path)) {
                    return new ServletMatch(rs.servlet, pattern, null);
                }
            }
        }
        return null;
    }

    private static boolean matchesAnyPattern(String path, List<String> patterns) {
        for (String pattern : patterns) {
            if (pattern.equals("/*")) return true;
            if (pattern.endsWith("/*")) {
                String prefix = pattern.substring(0, pattern.length() - 2);
                if (path.equals(prefix) || path.startsWith(prefix + "/")) return true;
            } else if (pattern.equals(path)) {
                return true;
            }
        }
        return false;
    }

    // ========================================================================
    // Jakarta HttpServletRequest Dynamic Proxy Implementation
    // ========================================================================
    private HttpServletRequest createHttpServletRequestProxy(
            HttpExchange exchange, String servletPath, String pathInfo, byte[] bodyBytes
    ) {
        Map<String, Object> attributes = new ConcurrentHashMap<>();
        Map<String, List<String>> queryAndFormParams = new LinkedHashMap<>();
        URI uri = exchange.getRequestURI();
        parseQueryParams(uri.getRawQuery(), queryAndFormParams);

        String contentType = exchange.getRequestHeaders().getFirst("Content-Type");
        List<Part> multipartParts = new ArrayList<>();
        if (contentType != null && contentType.toLowerCase(Locale.ROOT).startsWith("multipart/form-data")) {
            multipartParts.addAll(parseMultipartFormData(bodyBytes, contentType, queryAndFormParams));
        } else if (contentType != null && contentType.toLowerCase(Locale.ROOT).startsWith("application/x-www-form-urlencoded")) {
            parseQueryParams(new String(bodyBytes, StandardCharsets.UTF_8), queryAndFormParams);
        }

        return (HttpServletRequest) Proxy.newProxyInstance(
                HttpServletRequest.class.getClassLoader(),
                new Class<?>[]{HttpServletRequest.class},
                (proxy, method, args) -> {
                    String m = method.getName();
                    return switch (m) {
                        case "getMethod" -> exchange.getRequestMethod().toUpperCase(Locale.ROOT);
                        case "getRequestURI" -> uri.getPath();
                        case "getRequestURL" -> new StringBuffer("http://").append(host).append(":").append(port).append(uri.getPath());
                        case "getContextPath" -> "";
                        case "getServletPath" -> servletPath;
                        case "getPathInfo" -> pathInfo;
                        case "getQueryString" -> uri.getRawQuery();
                        case "getContentType" -> contentType;
                        case "getContentLength" -> bodyBytes.length;
                        case "getContentLengthLong" -> (long) bodyBytes.length;
                        case "getCharacterEncoding" -> "UTF-8";
                        case "getProtocol" -> exchange.getProtocol();
                        case "getScheme" -> "http";
                        case "getServerName" -> host;
                        case "getServerPort" -> port;
                        case "getRemoteAddr" -> {
                            String xff = exchange.getRequestHeaders().getFirst("X-Forwarded-For");
                            if (xff != null && !xff.isBlank()) yield xff.split(",")[0].trim();
                            yield exchange.getRemoteAddress() != null
                                    ? exchange.getRemoteAddress().getAddress().getHostAddress() : "127.0.0.1";
                        }
                        case "getHeader" -> {
                            String hName = (String) args[0];
                            yield exchange.getRequestHeaders().getFirst(hName);
                        }
                        case "getHeaders" -> {
                            String hName = (String) args[0];
                            List<String> vals = exchange.getRequestHeaders().get(hName);
                            yield Collections.enumeration(vals != null ? vals : List.of());
                        }
                        case "getHeaderNames" -> Collections.enumeration(exchange.getRequestHeaders().keySet());
                        case "getParameter" -> {
                            String pName = (String) args[0];
                            List<String> vals = queryAndFormParams.get(pName);
                            yield (vals != null && !vals.isEmpty()) ? vals.get(0) : null;
                        }
                        case "getParameterValues" -> {
                            String pName = (String) args[0];
                            List<String> vals = queryAndFormParams.get(pName);
                            yield vals != null ? vals.toArray(new String[0]) : null;
                        }
                        case "getParameterMap" -> {
                            Map<String, String[]> map = new LinkedHashMap<>();
                            for (Map.Entry<String, List<String>> e : queryAndFormParams.entrySet()) {
                                map.put(e.getKey(), e.getValue().toArray(new String[0]));
                            }
                            yield map;
                        }
                        case "getParameterNames" -> Collections.enumeration(queryAndFormParams.keySet());
                        case "getAttribute" -> attributes.get((String) args[0]);
                        case "setAttribute" -> {
                            if (args[1] == null) attributes.remove((String) args[0]);
                            else attributes.put((String) args[0], args[1]);
                            yield null;
                        }
                        case "removeAttribute" -> {
                            attributes.remove((String) args[0]);
                            yield null;
                        }
                        case "getAttributeNames" -> Collections.enumeration(attributes.keySet());
                        case "getInputStream" -> createServletInputStream(bodyBytes);
                        case "getReader" -> new BufferedReader(new InputStreamReader(new ByteArrayInputStream(bodyBytes), StandardCharsets.UTF_8));
                        case "getParts" -> multipartParts;
                        case "getPart" -> {
                            String name = (String) args[0];
                            yield multipartParts.stream().filter(p -> name.equals(p.getName())).findFirst().orElse(null);
                        }
                        case "getCookies" -> parseCookies(exchange.getRequestHeaders().getFirst("Cookie"));
                        case "getServletContext" -> servletContext;
                        case "getLocale" -> Locale.US;
                        case "getLocales" -> Collections.enumeration(List.of(Locale.US));
                        case "isSecure" -> false;
                        default -> defaultValueForType(method.getReturnType());
                    };
                }
        );
    }

    // ========================================================================
    // Jakarta HttpServletResponse Dynamic Proxy Implementation
    // ========================================================================
    private static final class ResponseState {
        final HttpExchange exchange;
        int status = 200;
        String contentType = "application/json;charset=UTF-8";
        final ByteArrayOutputStream buffer = new ByteArrayOutputStream(4096);
        PrintWriter writer;
        boolean committed = false;
        boolean streamingMode = false;

        ResponseState(HttpExchange exchange) {
            this.exchange = exchange;
        }

        PrintWriter getWriter() {
            if (writer == null) {
                writer = new PrintWriter(new OutputStreamWriter(buffer, StandardCharsets.UTF_8), true);
            }
            return writer;
        }

        ServletOutputStream getOutputStream() {
            return new ServletOutputStream() {
                @Override
                public boolean isReady() { return true; }
                @Override
                public void setWriteListener(WriteListener writeListener) {}
                @Override
                public void write(int b) throws IOException {
                    if (streamingMode) {
                        exchange.getResponseBody().write(b);
                    } else {
                        buffer.write(b);
                    }
                }
                @Override
                public void write(byte[] b, int off, int len) throws IOException {
                    if (streamingMode) {
                        exchange.getResponseBody().write(b, off, len);
                    } else {
                        buffer.write(b, off, len);
                    }
                }
                @Override
                public void flush() throws IOException {
                    if (!committed && contentType != null && contentType.startsWith("text/event-stream")) {
                        committed = true;
                        streamingMode = true;
                        exchange.getResponseHeaders().set("Content-Type", contentType);
                        exchange.getResponseHeaders().set("Cache-Control", "no-cache");
                        exchange.getResponseHeaders().set("Connection", "keep-alive");
                        exchange.sendResponseHeaders(status, 0); // chunked streaming
                        if (buffer.size() > 0) {
                            exchange.getResponseBody().write(buffer.toByteArray());
                            buffer.reset();
                        }
                    }
                    if (streamingMode) {
                        exchange.getResponseBody().flush();
                    }
                }
            };
        }

        void commitAndClose() throws IOException {
            if (writer != null) {
                writer.flush();
            }
            if (streamingMode) {
                exchange.getResponseBody().close();
                return;
            }
            if (!committed) {
                committed = true;
                if (contentType != null) {
                    exchange.getResponseHeaders().set("Content-Type", contentType);
                }
                byte[] bytes = buffer.toByteArray();
                if (status == 204 || (bytes.length == 0 && status == 304) || "HEAD".equalsIgnoreCase(exchange.getRequestMethod())) {
                    exchange.getResponseHeaders().set("Content-Length", String.valueOf(bytes.length));
                    exchange.sendResponseHeaders(status, -1);
                    exchange.close();
                } else {
                    exchange.sendResponseHeaders(status, bytes.length);
                    try (OutputStream os = exchange.getResponseBody()) {
                        os.write(bytes);
                    }
                }
            }
        }
    }

    private HttpServletResponse createHttpServletResponseProxy(ResponseState state) {
        return (HttpServletResponse) Proxy.newProxyInstance(
                HttpServletResponse.class.getClassLoader(),
                new Class<?>[]{HttpServletResponse.class},
                (proxy, method, args) -> {
                    String m = method.getName();
                    return switch (m) {
                        case "setStatus" -> { state.status = (Integer) args[0]; yield null; }
                        case "getStatus" -> state.status;
                        case "setContentType" -> { state.contentType = (String) args[0]; yield null; }
                        case "getContentType" -> state.contentType;
                        case "setCharacterEncoding" -> null;
                        case "getCharacterEncoding" -> "UTF-8";
                        case "setHeader" -> {
                            String k = (String) args[0];
                            String v = (String) args[1];
                            if ("Content-Type".equalsIgnoreCase(k)) state.contentType = v;
                            state.exchange.getResponseHeaders().set(k, v);
                            yield null;
                        }
                        case "addHeader" -> {
                            state.exchange.getResponseHeaders().add((String) args[0], (String) args[1]);
                            yield null;
                        }
                        case "getHeader" -> state.exchange.getResponseHeaders().getFirst((String) args[0]);
                        case "getWriter" -> state.getWriter();
                        case "getOutputStream" -> state.getOutputStream();
                        case "flushBuffer" -> {
                            if (state.writer != null) state.writer.flush();
                            state.getOutputStream().flush();
                            yield null;
                        }
                        case "isCommitted" -> state.committed;
                        case "sendError" -> {
                            state.status = (Integer) args[0];
                            String msg = args.length > 1 ? (String) args[1] : "Error";
                            state.buffer.reset();
                            state.getWriter().write("{\"error\":\"" + escapeJson(msg) + "\"}");
                            yield null;
                        }
                        default -> defaultValueForType(method.getReturnType());
                    };
                }
        );
    }

    // ========================================================================
    // RFC 7578 Multipart/Form-Data Binary Parser for @MultipartConfig
    // ========================================================================
    private static List<Part> parseMultipartFormData(
            byte[] body, String contentTypeHeader, Map<String, List<String>> formParams
    ) {
        List<Part> parts = new ArrayList<>();
        String boundary = null;
        for (String segment : contentTypeHeader.split(";")) {
            String trimmed = segment.trim();
            if (trimmed.toLowerCase(Locale.ROOT).startsWith("boundary=")) {
                boundary = trimmed.substring("boundary=".length()).replace("\"", "");
                break;
            }
        }
        if (boundary == null || body.length == 0) {
            return parts;
        }

        byte[] delimiter = ("--" + boundary).getBytes(StandardCharsets.ISO_8859_1);
        List<Integer> positions = findSubarrayPositions(body, delimiter);

        for (int i = 0; i < positions.size() - 1; i++) {
            int partStart = positions.get(i) + delimiter.length;
            int partEnd = positions.get(i + 1);
            if (partStart + 2 <= body.length && body[partStart] == '-' && body[partStart + 1] == '-') {
                break; // "--boundary--" closing marker
            }
            if (partStart + 2 <= body.length && body[partStart] == '\r' && body[partStart + 1] == '\n') {
                partStart += 2;
            }
            // Strip trailing \r\n before next boundary
            if (partEnd - 2 >= partStart && body[partEnd - 2] == '\r' && body[partEnd - 1] == '\n') {
                partEnd -= 2;
            }
            if (partEnd <= partStart) continue;

            int headerEnd = findHeaderSeparator(body, partStart, partEnd);
            if (headerEnd == -1) continue;

            String headersBlock = new String(body, partStart, headerEnd - partStart, StandardCharsets.UTF_8);
            int contentStart = headerEnd + 4;
            byte[] partData = new byte[Math.max(0, partEnd - contentStart)];
            if (partData.length > 0) {
                System.arraycopy(body, contentStart, partData, 0, partData.length);
            }

            Map<String, String> partHeaders = new LinkedHashMap<>();
            for (String hLine : headersBlock.split("\\r\\n")) {
                int colon = hLine.indexOf(':');
                if (colon > 0) {
                    partHeaders.put(hLine.substring(0, colon).trim().toLowerCase(Locale.ROOT),
                            hLine.substring(colon + 1).trim());
                }
            }

            String disposition = partHeaders.getOrDefault("content-disposition", "");
            String fieldName = extractQuotedAttribute(disposition, "name");
            String fileName = extractQuotedAttribute(disposition, "filename");
            String partContentType = partHeaders.getOrDefault("content-type", "text/plain");

            if (fieldName != null) {
                if (fileName == null) {
                    formParams.computeIfAbsent(fieldName, k -> new ArrayList<>())
                            .add(new String(partData, StandardCharsets.UTF_8));
                }
                parts.add(createPartProxy(fieldName, fileName, partContentType, partData, partHeaders));
            }
        }
        return parts;
    }

    private static Part createPartProxy(
            String name, String submittedFileName, String contentType, byte[] data, Map<String, String> headers
    ) {
        return new Part() {
            @Override public InputStream getInputStream() { return new ByteArrayInputStream(data); }
            @Override public String getContentType() { return contentType; }
            @Override public String getName() { return name; }
            @Override public String getSubmittedFileName() { return submittedFileName; }
            @Override public long getSize() { return data.length; }
            @Override public void write(String fileName) throws IOException {
                Files.write(Path.of(fileName), data);
            }
            @Override public void delete() {}
            @Override public String getHeader(String headerName) {
                return headers.get(headerName.toLowerCase(Locale.ROOT));
            }
            @Override public Collection<String> getHeaders(String headerName) {
                String v = getHeader(headerName);
                return v != null ? List.of(v) : List.of();
            }
            @Override public Collection<String> getHeaderNames() { return headers.keySet(); }
        };
    }

    private static List<Integer> findSubarrayPositions(byte[] data, byte[] pattern) {
        List<Integer> list = new ArrayList<>();
        for (int i = 0; i <= data.length - pattern.length; i++) {
            boolean match = true;
            for (int j = 0; j < pattern.length; j++) {
                if (data[i + j] != pattern[j]) {
                    match = false;
                    break;
                }
            }
            if (match) list.add(i);
        }
        return list;
    }

    private static int findHeaderSeparator(byte[] data, int start, int end) {
        for (int i = start; i <= end - 4; i++) {
            if (data[i] == '\r' && data[i + 1] == '\n' && data[i + 2] == '\r' && data[i + 3] == '\n') {
                return i;
            }
        }
        return -1;
    }

    private static String extractQuotedAttribute(String header, String attr) {
        String key = attr + "=\"";
        int idx = header.indexOf(key);
        if (idx == -1) return null;
        int start = idx + key.length();
        int end = header.indexOf('"', start);
        return end != -1 ? header.substring(start, end) : null;
    }

    private static void parseQueryParams(String query, Map<String, List<String>> target) {
        if (query == null || query.isBlank()) return;
        for (String pair : query.split("&")) {
            if (pair.isEmpty()) continue;
            int eq = pair.indexOf('=');
            String k = eq >= 0 ? URLDecoder.decode(pair.substring(0, eq), StandardCharsets.UTF_8)
                    : URLDecoder.decode(pair, StandardCharsets.UTF_8);
            String v = eq >= 0 ? URLDecoder.decode(pair.substring(eq + 1), StandardCharsets.UTF_8) : "";
            target.computeIfAbsent(k, ignored -> new ArrayList<>()).add(v);
        }
    }

    private static Cookie[] parseCookies(String cookieHeader) {
        if (cookieHeader == null || cookieHeader.isBlank()) return new Cookie[0];
        List<Cookie> list = new ArrayList<>();
        for (String part : cookieHeader.split(";")) {
            String trimmed = part.trim();
            int eq = trimmed.indexOf('=');
            if (eq > 0) {
                list.add(new Cookie(trimmed.substring(0, eq).trim(), trimmed.substring(eq + 1).trim()));
            }
        }
        return list.toArray(new Cookie[0]);
    }

    private static ServletInputStream createServletInputStream(byte[] bytes) {
        ByteArrayInputStream bais = new ByteArrayInputStream(bytes);
        return new ServletInputStream() {
            @Override public boolean isFinished() { return bais.available() == 0; }
            @Override public boolean isReady() { return true; }
            @Override public void setReadListener(ReadListener readListener) {}
            @Override public int read() { return bais.read(); }
            @Override public int read(byte[] b, int off, int len) { return bais.read(b, off, len); }
        };
    }

    private ServletContext createServletContextProxy() {
        return (ServletContext) Proxy.newProxyInstance(
                ServletContext.class.getClassLoader(),
                new Class<?>[]{ServletContext.class},
                (proxy, method, args) -> switch (method.getName()) {
                    case "getContextPath" -> "";
                    case "getServerInfo" -> "CyberFusion-X-Jakarta-Servlet-Container/6.1 (Java 21 LTS)";
                    case "getAttribute" -> contextAttributes.get((String) args[0]);
                    case "setAttribute" -> {
                        contextAttributes.put((String) args[0], args[1]);
                        yield null;
                    }
                    case "getAttributeNames" -> Collections.enumeration(contextAttributes.keySet());
                    default -> defaultValueForType(method.getReturnType());
                }
        );
    }

    private ServletConfig createServletConfigProxy(String name) {
        return (ServletConfig) Proxy.newProxyInstance(
                ServletConfig.class.getClassLoader(),
                new Class<?>[]{ServletConfig.class},
                (proxy, method, args) -> switch (method.getName()) {
                    case "getServletName" -> name;
                    case "getServletContext" -> servletContext;
                    case "getInitParameterNames" -> Collections.emptyEnumeration();
                    default -> null;
                }
        );
    }

    private FilterConfig createFilterConfigProxy(String name) {
        return (FilterConfig) Proxy.newProxyInstance(
                FilterConfig.class.getClassLoader(),
                new Class<?>[]{FilterConfig.class},
                (proxy, method, args) -> switch (method.getName()) {
                    case "getFilterName" -> name;
                    case "getServletContext" -> servletContext;
                    case "getInitParameterNames" -> Collections.emptyEnumeration();
                    default -> null;
                }
        );
    }

    private static Object defaultValueForType(Class<?> type) {
        if (!type.isPrimitive()) return null;
        if (type == boolean.class) return false;
        if (type == int.class) return 0;
        if (type == long.class) return 0L;
        if (type == double.class) return 0.0;
        return null;
    }

    private static String escapeJson(String msg) {
        if (msg == null) return "Internal server error";
        return msg.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
