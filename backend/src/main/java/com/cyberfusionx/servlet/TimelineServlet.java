package com.cyberfusionx.servlet;

import com.cyberfusionx.container.ServletJsonHelper;
import com.cyberfusionx.db.ForensicDataStore;
import com.cyberfusionx.model.Models.TimelineEvent;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * Jakarta @WebServlet for Chronological Attack Timeline Reconstruction & Kill-Chain Filtering.
 */
@WebServlet(name = "TimelineServlet", urlPatterns = {"/api/v1/timeline/*"})
public class TimelineServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String caseId = req.getParameter("caseId");
        String phaseFilter = req.getParameter("phase");
        if (caseId == null || caseId.isBlank()) {
            ServletJsonHelper.writeError(resp, 400, "Query parameter 'caseId' is required");
            return;
        }
        ForensicDataStore store = ForensicDataStore.getInstance();
        List<TimelineEvent> events = store.getTimelineForCase(caseId);
        if (phaseFilter != null && !phaseFilter.isBlank() && !"ALL".equalsIgnoreCase(phaseFilter)) {
            events = events.stream()
                    .filter(e -> phaseFilter.equalsIgnoreCase(e.killChainPhase))
                    .toList();
        }
        long anomalyCount = events.stream().filter(e -> e.anomalyFlag).count();
        ServletJsonHelper.writeJson(resp, 200, Map.of(
                "timeline", events,
                "anomalyCount", anomalyCount
        ));
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        ForensicDataStore store = ForensicDataStore.getInstance();
        String actorUsername = ServletJsonHelper.getActorUsername(req);
        Map<String, Object> body = ServletJsonHelper.readJsonMap(req);

        String caseId = ServletJsonHelper.getString(body, "caseId", "");
        String timestamp = ServletJsonHelper.getString(body, "eventTimestamp", "");
        String phase = ServletJsonHelper.getString(body, "killChainPhase", "INITIAL_CONTACT");
        String severity = ServletJsonHelper.getString(body, "severity", "HIGH");
        String title = ServletJsonHelper.getString(body, "title", "");
        String description = ServletJsonHelper.getString(body, "description", "");
        String amount = ServletJsonHelper.getString(body, "amountInvolved", null);

        if (caseId.isEmpty() || title.isEmpty()) {
            ServletJsonHelper.writeError(resp, 400, "'caseId' and 'title' are required");
            return;
        }

        TimelineEvent created = store.addManualTimelineEvent(
                caseId, timestamp, phase, severity, title, description, amount, actorUsername
        );
        ServletJsonHelper.writeJson(resp, 201, Map.of(
                "event", created,
                "timeline", store.getTimelineForCase(caseId)
        ));
    }
}
