package com.cyberfusionx.servlet;

import com.cyberfusionx.container.ServletJsonHelper;
import com.cyberfusionx.db.ForensicDataStore;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.Map;

/**
 * Jakarta @WebServlet for Global Cmd+K Forensic Search across Cases, Hashes, Entities, OCR Text & Timeline.
 */
@WebServlet(name = "SearchServlet", urlPatterns = {"/api/v1/search"})
public class SearchServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String q = req.getParameter("q");
        Map<String, Object> results = ForensicDataStore.getInstance().globalSearch(q);
        ServletJsonHelper.writeJson(resp, 200, results);
    }
}
