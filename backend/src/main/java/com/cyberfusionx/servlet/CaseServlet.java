package com.cyberfusionx.servlet;

import com.cyberfusionx.container.ServletJsonHelper;
import com.cyberfusionx.db.ForensicDataStore;
import com.cyberfusionx.model.Models.ForensicCase;
import com.cyberfusionx.model.Models.User;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * Jakarta @WebServlet managing Forensic Investigations (CRUD, Overview, Re-Analysis).
 */
@WebServlet(name = "CaseServlet", urlPatterns = {"/api/v1/cases/*"})
public class CaseServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        ForensicDataStore store = ForensicDataStore.getInstance();
        String pathInfo = req.getPathInfo();

        if (pathInfo == null || "/".equals(pathInfo)) {
            List<Map<String, Object>> cases = store.listCasesWithStats();
            ServletJsonHelper.writeJson(resp, 200, Map.of("cases", cases));
            return;
        }

        String caseId = pathInfo.substring(1).split("/")[0];
        Map<String, Object> overview = store.getFullCaseOverview(caseId);
        if (overview == null) {
            ServletJsonHelper.writeError(resp, 404, "Forensic case not found: " + caseId);
            return;
        }
        ServletJsonHelper.writeJson(resp, 200, overview);
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        ForensicDataStore store = ForensicDataStore.getInstance();
        String pathInfo = req.getPathInfo();
        String actorUsername = ServletJsonHelper.getActorUsername(req);
        User creator = store.findUserByUsername(actorUsername);

        if (pathInfo != null && pathInfo.endsWith("/reset-demo")) {
            store.resetDemoState(actorUsername);
            ServletJsonHelper.writeJson(resp, 200, Map.of(
                    "status", "RESET_COMPLETE",
                    "cases", store.listCasesWithStats()
            ));
            return;
        }

        if (pathInfo != null && pathInfo.endsWith("/reanalyze")) {
            String caseId = pathInfo.substring(1).split("/")[0];
            store.recalculateCaseIntelligenceUnlocked(caseId);
            Map<String, Object> overview = store.getFullCaseOverview(caseId);
            ServletJsonHelper.writeJson(resp, 200, overview);
            return;
        }

        Map<String, Object> body = ServletJsonHelper.readJsonMap(req);
        String title = ServletJsonHelper.getString(body, "title", "");
        if (title.isEmpty()) {
            ServletJsonHelper.writeError(resp, 400, "Investigation title is required");
            return;
        }
        String incidentType = ServletJsonHelper.getString(body, "incidentType", "UPI_WIRE_FRAUD");
        String victimName = ServletJsonHelper.getString(body, "victimName", "Corporate Victim");
        double estimatedLoss = ServletJsonHelper.getDouble(body, "estimatedLossUsd", 0.0);
        String summary = ServletJsonHelper.getString(body, "summary", "");

        ForensicCase created = store.createCase(title, incidentType, victimName, estimatedLoss, summary, creator);
        ServletJsonHelper.writeJson(resp, 201, store.getFullCaseOverview(created.id));
    }
}
