package com.cyberfusionx.forensics;

import com.cyberfusionx.model.Models.EntityRelationship;
import com.cyberfusionx.model.Models.ExtractedEntity;
import com.cyberfusionx.model.Models.ShortestPathResult;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;
import java.util.Queue;
import java.util.Set;

/**
 * Pure-Java Directed Weighted Pseudograph & Forensic Graph Intelligence Engine.
 * Computes:
 * 1. PageRank Centrality (identifying hub mule accounts & command nodes)
 * 2. Brandes Betweenness Centrality (identifying laundering bridge intermediaries)
 * 3. Connected Components / Fraud Cluster Isolation
 * 4. Dijkstra Shortest Path between any two entities in the investigation
 */
public final class IncidentGraphService {

    public static void enrichGraphMetrics(
            List<ExtractedEntity> entities,
            List<EntityRelationship> relationships
    ) {
        if (entities == null || entities.isEmpty()) {
            return;
        }
        computePageRank(entities, relationships, 0.85, 40);
        computeBetweennessCentrality(entities, relationships);
        assignConnectedClusters(entities, relationships);
    }

    /**
     * Iterative PageRank computation (damping factor alpha = 0.85).
     */
    public static void computePageRank(
            List<ExtractedEntity> entities,
            List<EntityRelationship> relationships,
            double damping,
            int iterations
    ) {
        int n = entities.size();
        if (n == 0) return;

        Map<String, Integer> idToIdx = new HashMap<>();
        for (int i = 0; i < n; i++) {
            idToIdx.put(entities.get(i).id, i);
        }

        List<List<Integer>> outgoing = new ArrayList<>(n);
        for (int i = 0; i < n; i++) {
            outgoing.add(new ArrayList<>());
        }

        if (relationships != null) {
            for (EntityRelationship rel : relationships) {
                Integer u = idToIdx.get(rel.sourceEntityId);
                Integer v = idToIdx.get(rel.targetEntityId);
                if (u != null && v != null && !u.equals(v)) {
                    outgoing.get(u).add(v);
                    outgoing.get(v).add(u); // Treat correlation & flow bidirectionally for influence ranking
                }
            }
        }

        double[] rank = new double[n];
        double init = 1.0 / n;
        for (int i = 0; i < n; i++) {
            rank[i] = init;
        }

        for (int iter = 0; iter < iterations; iter++) {
            double[] next = new double[n];
            double danglingSum = 0.0;
            for (int i = 0; i < n; i++) {
                if (outgoing.get(i).isEmpty()) {
                    danglingSum += rank[i];
                }
            }
            double base = ((1.0 - damping) / n) + (damping * danglingSum / n);
            for (int i = 0; i < n; i++) {
                next[i] = base;
            }
            for (int u = 0; u < n; u++) {
                List<Integer> nbrs = outgoing.get(u);
                if (!nbrs.isEmpty()) {
                    double share = (damping * rank[u]) / nbrs.size();
                    for (int v : nbrs) {
                        next[v] += share;
                    }
                }
            }
            rank = next;
        }

        for (int i = 0; i < n; i++) {
            entities.get(i).pagerankScore = Math.round(rank[i] * 10000.0) / 10000.0;
        }
    }

    /**
     * Brandes' Algorithm for Unweighted/Weighted Betweenness Centrality.
     */
    public static void computeBetweennessCentrality(
            List<ExtractedEntity> entities,
            List<EntityRelationship> relationships
    ) {
        int n = entities.size();
        if (n == 0) return;

        Map<String, Integer> idToIdx = new HashMap<>();
        for (int i = 0; i < n; i++) {
            idToIdx.put(entities.get(i).id, i);
        }

        List<List<Integer>> adj = new ArrayList<>(n);
        for (int i = 0; i < n; i++) {
            adj.add(new ArrayList<>());
        }
        if (relationships != null) {
            for (EntityRelationship rel : relationships) {
                Integer u = idToIdx.get(rel.sourceEntityId);
                Integer v = idToIdx.get(rel.targetEntityId);
                if (u != null && v != null && !u.equals(v)) {
                    adj.get(u).add(v);
                    adj.get(v).add(u);
                }
            }
        }

        double[] cb = new double[n];

        for (int s = 0; s < n; s++) {
            Deque<Integer> stack = new ArrayDeque<>();
            List<List<Integer>> pred = new ArrayList<>(n);
            for (int i = 0; i < n; i++) pred.add(new ArrayList<>());
            double[] sigma = new double[n];
            sigma[s] = 1.0;
            int[] dist = new int[n];
            for (int i = 0; i < n; i++) dist[i] = -1;
            dist[s] = 0;

            Queue<Integer> q = new ArrayDeque<>();
            q.add(s);
            while (!q.isEmpty()) {
                int v = q.poll();
                stack.push(v);
                for (int w : adj.get(v)) {
                    if (dist[w] < 0) {
                        q.add(w);
                        dist[w] = dist[v] + 1;
                    }
                    if (dist[w] == dist[v] + 1) {
                        sigma[w] += sigma[v];
                        pred.get(w).add(v);
                    }
                }
            }

            double[] delta = new double[n];
            while (!stack.isEmpty()) {
                int w = stack.pop();
                for (int v : pred.get(w)) {
                    if (sigma[w] > 0) {
                        delta[v] += (sigma[v] / sigma[w]) * (1.0 + delta[w]);
                    }
                }
                if (w != s) {
                    cb[w] += delta[w];
                }
            }
        }

        double norm = n > 2 ? (double) ((n - 1) * (n - 2)) : 1.0;
        for (int i = 0; i < n; i++) {
            entities.get(i).betweennessScore = Math.round((cb[i] / norm) * 10000.0) / 10000.0;
        }
    }

    /**
     * Connected Components clustering to group linked fraud cells.
     */
    public static void assignConnectedClusters(
            List<ExtractedEntity> entities,
            List<EntityRelationship> relationships
    ) {
        int n = entities.size();
        Map<String, Integer> idToIdx = new HashMap<>();
        for (int i = 0; i < n; i++) {
            idToIdx.put(entities.get(i).id, i);
        }

        List<List<Integer>> adj = new ArrayList<>(n);
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        if (relationships != null) {
            for (EntityRelationship rel : relationships) {
                Integer u = idToIdx.get(rel.sourceEntityId);
                Integer v = idToIdx.get(rel.targetEntityId);
                if (u != null && v != null) {
                    adj.get(u).add(v);
                    adj.get(v).add(u);
                }
            }
        }

        boolean[] visited = new boolean[n];
        int clusterId = 1;
        for (int i = 0; i < n; i++) {
            if (!visited[i]) {
                Queue<Integer> q = new ArrayDeque<>();
                q.add(i);
                visited[i] = true;
                while (!q.isEmpty()) {
                    int curr = q.poll();
                    entities.get(curr).clusterId = clusterId;
                    for (int nb : adj.get(curr)) {
                        if (!visited[nb]) {
                            visited[nb] = true;
                            q.add(nb);
                        }
                    }
                }
                clusterId++;
            }
        }
    }

    /**
     * Dijkstra Shortest-Path Finder between any two entities in the investigation graph.
     */
    public static ShortestPathResult findShortestPath(
            List<ExtractedEntity> entities,
            List<EntityRelationship> relationships,
            String sourceId,
            String targetId
    ) {
        ShortestPathResult result = new ShortestPathResult();
        result.sourceEntityId = sourceId;
        result.targetEntityId = targetId;

        if (sourceId == null || targetId == null || entities == null || relationships == null) {
            result.pathFound = false;
            return result;
        }

        Map<String, ExtractedEntity> entityMap = new LinkedHashMap<>();
        for (ExtractedEntity e : entities) {
            entityMap.put(e.id, e);
        }
        if (!entityMap.containsKey(sourceId) || !entityMap.containsKey(targetId)) {
            result.pathFound = false;
            return result;
        }

        if (sourceId.equals(targetId)) {
            result.pathFound = true;
            result.nodeIds.add(sourceId);
            result.hopCount = 0;
            result.totalWeight = 0.0;
            return result;
        }

        record AdjEdge(String neighborId, EntityRelationship edge, double cost) {}
        Map<String, List<AdjEdge>> adj = new HashMap<>();
        for (ExtractedEntity e : entities) {
            adj.put(e.id, new ArrayList<>());
        }
        for (EntityRelationship r : relationships) {
            double cost = Math.max(0.1, 4.0 - Math.min(3.5, r.weight));
            if (adj.containsKey(r.sourceEntityId) && adj.containsKey(r.targetEntityId)) {
                adj.get(r.sourceEntityId).add(new AdjEdge(r.targetEntityId, r, cost));
                adj.get(r.targetEntityId).add(new AdjEdge(r.sourceEntityId, r, cost));
            }
        }

        Map<String, Double> dist = new HashMap<>();
        Map<String, String> prevNode = new HashMap<>();
        Map<String, EntityRelationship> prevEdge = new HashMap<>();
        for (String id : entityMap.keySet()) {
            dist.put(id, Double.POSITIVE_INFINITY);
        }
        dist.put(sourceId, 0.0);

        record QueueNode(String id, double d) {}
        PriorityQueue<QueueNode> pq = new PriorityQueue<>(Comparator.comparingDouble(QueueNode::d));
        pq.add(new QueueNode(sourceId, 0.0));
        Set<String> settled = new HashSet<>();

        while (!pq.isEmpty()) {
            QueueNode curr = pq.poll();
            if (!settled.add(curr.id)) continue;
            if (curr.id.equals(targetId)) break;

            for (AdjEdge edge : adj.getOrDefault(curr.id, List.of())) {
                double newDist = dist.get(curr.id) + edge.cost;
                if (newDist < dist.getOrDefault(edge.neighborId, Double.POSITIVE_INFINITY)) {
                    dist.put(edge.neighborId, newDist);
                    prevNode.put(edge.neighborId, curr.id);
                    prevEdge.put(edge.neighborId, edge.edge);
                    pq.add(new QueueNode(edge.neighborId, newDist));
                }
            }
        }

        if (!prevNode.containsKey(targetId)) {
            result.pathFound = false;
            return result;
        }

        List<String> pathNodes = new ArrayList<>();
        List<String> pathEdges = new ArrayList<>();
        List<String> steps = new ArrayList<>();

        String stepNode = targetId;
        double totalWeight = 0.0;
        while (stepNode != null) {
            pathNodes.add(stepNode);
            EntityRelationship edge = prevEdge.get(stepNode);
            String pNode = prevNode.get(stepNode);
            if (edge != null && pNode != null) {
                pathEdges.add(edge.id);
                totalWeight += edge.weight;
                ExtractedEntity fromEnt = entityMap.get(pNode);
                ExtractedEntity toEnt = entityMap.get(stepNode);
                steps.add(fromEnt.displayLabel + " [" + fromEnt.entityType + "] ──(" + edge.label + ")──> "
                        + toEnt.displayLabel + " [" + toEnt.entityType + "]");
            }
            stepNode = pNode;
        }

        Collections.reverse(pathNodes);
        Collections.reverse(pathEdges);
        Collections.reverse(steps);

        result.pathFound = true;
        result.nodeIds = pathNodes;
        result.edgeIds = pathEdges;
        result.narrativeSteps = steps;
        result.hopCount = pathEdges.size();
        result.totalWeight = Math.round(totalWeight * 100.0) / 100.0;
        return result;
    }
}
