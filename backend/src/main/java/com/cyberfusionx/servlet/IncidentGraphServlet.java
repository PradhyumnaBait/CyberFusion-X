package com.cyberfusionx.servlet;

import com.cyberfusionx.container.ServletJsonHelper;
import com.cyberfusionx.db.ForensicDataStore;
import com.cyberfusionx.forensics.IncidentGraphService;
import com.cyberfusionx.model.Models.EntityRelationship;
import com.cyberfusionx.model.Models.ExtractedEntity;
import com.cyberfusionx.model.Models.ShortestPathResult;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Jakarta @WebServlet serving JGraphT Incident Graph Topology, PageRank & Betweenness Centrality,
 * and Dijkstra Shortest-Path Tracing between entities.
 */
@WebServlet(name = "IncidentGraphServlet", urlPatterns = {"/api/v1/graph/*"})
public class IncidentGraphServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        ForensicDataStore store = ForensicDataStore.getInstance();
        String pathInfo = req.getPathInfo() != null ? req.getPathInfo() : "";
        String caseId = req.getParameter("caseId");

        if (caseId == null || caseId.isBlank()) {
            ServletJsonHelper.writeError(resp, 400, "Query parameter 'caseId' is required");
            return;
        }

        List<ExtractedEntity> nodes = store.getEntitiesForCase(caseId);
        List<EntityRelationship> edges = store.getRelationshipsForCase(caseId);

        if ("/shortest-path".equals(pathInfo)) {
            String sourceId = req.getParameter("sourceId");
            String targetId = req.getParameter("targetId");
            ShortestPathResult pathResult = IncidentGraphService.findShortestPath(nodes, edges, sourceId, targetId);
            ServletJsonHelper.writeJson(resp, 200, pathResult);
            return;
        }

        ExtractedEntity topPageRankNode = nodes.isEmpty() ? null : nodes.get(0);
        int clusterCount = nodes.stream().mapToInt(n -> n.clusterId).max().orElse(0);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("caseId", caseId);
        response.put("nodes", nodes);
        response.put("edges", edges);
        response.put("clusterCount", clusterCount);
        response.put("primaryHubEntity", topPageRankNode);
        ServletJsonHelper.writeJson(resp, 200, response);
    }
}
