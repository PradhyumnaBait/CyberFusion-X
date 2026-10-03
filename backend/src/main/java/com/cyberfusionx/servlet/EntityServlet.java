package com.cyberfusionx.servlet;

import com.cyberfusionx.container.ServletJsonHelper;
import com.cyberfusionx.db.ForensicDataStore;
import com.cyberfusionx.model.Models.EntityRelationship;
import com.cyberfusionx.model.Models.ExtractedEntity;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * Jakarta @WebServlet for Entity & IOC Listing, Jaro-Winkler Alias Merging,
 * and Custom Relationship Creation.
 */
@WebServlet(name = "EntityServlet", urlPatterns = {"/api/v1/entities/*"})
public class EntityServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String caseId = req.getParameter("caseId");
        if (caseId == null || caseId.isBlank()) {
            ServletJsonHelper.writeError(resp, 400, "Query parameter 'caseId' is required");
            return;
        }
        ForensicDataStore store = ForensicDataStore.getInstance();
        List<ExtractedEntity> entities = store.getEntitiesForCase(caseId);
        List<EntityRelationship> relationships = store.getRelationshipsForCase(caseId);
        ServletJsonHelper.writeJson(resp, 200, Map.of(
                "entities", entities,
                "relationships", relationships
        ));
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        ForensicDataStore store = ForensicDataStore.getInstance();
        String pathInfo = req.getPathInfo() != null ? req.getPathInfo() : "";
        String actorUsername = ServletJsonHelper.getActorUsername(req);
        Map<String, Object> body = ServletJsonHelper.readJsonMap(req);

        if ("/merge".equals(pathInfo)) {
            String caseId = ServletJsonHelper.getString(body, "caseId", "");
            String primaryId = ServletJsonHelper.getString(body, "primaryEntityId", "");
            String secondaryId = ServletJsonHelper.getString(
                    body,
                    "secondaryEntityId",
                    ServletJsonHelper.getString(body, "duplicateEntityId", "")
            );
            if (caseId.isEmpty() || primaryId.isEmpty() || secondaryId.isEmpty() || primaryId.equals(secondaryId)) {
                ServletJsonHelper.writeError(resp, 400, "Valid distinct 'primaryEntityId' and 'secondaryEntityId' are required");
                return;
            }
            ExtractedEntity merged = store.mergeEntities(caseId, primaryId, secondaryId, actorUsername);
            ServletJsonHelper.writeJson(resp, 200, Map.of(
                    "mergedEntity", merged,
                    "entities", store.getEntitiesForCase(caseId),
                    "relationships", store.getRelationshipsForCase(caseId)
            ));
            return;
        }

        if ("/relationship".equals(pathInfo)) {
            String caseId = ServletJsonHelper.getString(body, "caseId", "");
            String sourceId = ServletJsonHelper.getString(body, "sourceEntityId", "");
            String targetId = ServletJsonHelper.getString(body, "targetEntityId", "");
            String relType = ServletJsonHelper.getString(body, "relationshipType", "CORRELATED_WITH");
            String label = ServletJsonHelper.getString(body, "label", "Analyst Linked");
            double weight = ServletJsonHelper.getDouble(body, "weight", 2.5);

            if (caseId.isEmpty() || sourceId.isEmpty() || targetId.isEmpty()) {
                ServletJsonHelper.writeError(resp, 400, "'caseId', 'sourceEntityId', and 'targetEntityId' are required");
                return;
            }
            EntityRelationship created = store.addCustomRelationship(
                    caseId, sourceId, targetId, relType, label, weight, actorUsername
            );
            ServletJsonHelper.writeJson(resp, 201, Map.of(
                    "relationship", created,
                    "entities", store.getEntitiesForCase(caseId),
                    "relationships", store.getRelationshipsForCase(caseId)
            ));
            return;
        }

        ServletJsonHelper.writeError(resp, 404, "Unsupported entity operation: " + pathInfo);
    }
}
