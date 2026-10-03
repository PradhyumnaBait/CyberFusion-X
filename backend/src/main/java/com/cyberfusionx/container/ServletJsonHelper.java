package com.cyberfusionx.container;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.BufferedReader;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Shared JSON serialization & request-reading utility for Jakarta Servlets.
 */
public final class ServletJsonHelper {

    public static final Gson GSON = new GsonBuilder().serializeNulls().create();

    private ServletJsonHelper() {}

    public static void writeJson(HttpServletResponse resp, int status, Object payload) throws IOException {
        resp.setStatus(status);
        resp.setContentType("application/json;charset=UTF-8");
        resp.getWriter().write(GSON.toJson(payload));
    }

    public static void writeError(HttpServletResponse resp, int status, String message) throws IOException {
        Map<String, Object> err = new LinkedHashMap<>();
        err.put("error", message);
        err.put("status", status);
        writeJson(resp, status, err);
    }

    public static Map<String, Object> readJsonMap(HttpServletRequest req) throws IOException {
        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = req.getReader()) {
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
        }
        String raw = sb.toString().trim();
        if (raw.isEmpty()) {
            return new LinkedHashMap<>();
        }
        Map<String, Object> parsed = GSON.fromJson(raw, new TypeToken<Map<String, Object>>() {}.getType());
        return parsed != null ? parsed : new LinkedHashMap<>();
    }

    public static String getString(Map<String, Object> body, String key, String defaultVal) {
        Object val = body.get(key);
        return val != null ? String.valueOf(val).trim() : defaultVal;
    }

    public static double getDouble(Map<String, Object> body, String key, double defaultVal) {
        Object val = body.get(key);
        if (val instanceof Number n) return n.doubleValue();
        if (val != null) {
            try { return Double.parseDouble(String.valueOf(val)); } catch (Exception ignored) {}
        }
        return defaultVal;
    }

    public static String getActorUsername(HttpServletRequest req) {
        Object u = req.getAttribute("actorUsername");
        return u != null ? String.valueOf(u) : "arjun.verma";
    }

    public static String getActorRole(HttpServletRequest req) {
        Object r = req.getAttribute("actorRole");
        return r != null ? String.valueOf(r) : "LEAD_INVESTIGATOR";
    }
}
