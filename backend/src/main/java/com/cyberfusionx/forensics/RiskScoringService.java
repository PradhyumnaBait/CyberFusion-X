package com.cyberfusionx.forensics;

import com.cyberfusionx.model.Models.EntityRelationship;
import com.cyberfusionx.model.Models.EvidenceItem;
import com.cyberfusionx.model.Models.ExtractedEntity;
import com.cyberfusionx.model.Models.ForensicCase;
import com.cyberfusionx.model.Models.RiskIndicator;
import com.cyberfusionx.model.Models.TimelineEvent;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Explainable scoring. Two separate scores, never conflated:
 *  - RISK: how serious / well-corroborated is this case? (measured indicators only)
 *  - URGENCY: how fast must an officer act? (golden-hour triage ordering)
 *
 * Every indicator fires only on a measured fact and carries its evidence reference,
 * so an officer (or an examiner) can always ask "why?" and get a concrete answer.
 */
public final class RiskScoringService {

    public record RiskEvaluation(int compositeRiskScore, String severityTier, List<RiskIndicator> indicators) {}
    public record UrgencyEvaluation(int urgencyScore, List<String> reasons) {}

    private static final String[] PRESSURE_WORDS = {
            "urgent", "immediately", "within 15", "last chance", "account will be frozen",
            "blocked", "suspended", "kyc expir", "otp", "do not tell", "police will arrest",
            "digital arrest", "customs", "parcel has been seized"
    };
    private static final String[] SHORTENERS = {"bit.ly", "tinyurl", "t.co/", "rb.gy", "cutt.ly", "shorturl"};
    private static final String[] SUSPICIOUS_TLDS = {".top", ".xyz", ".click", ".online", ".icu", ".zip"};

    /** Backward-compatible overload (no cross-case context). */
    public static RiskEvaluation evaluateCaseRisk(
            List<EvidenceItem> evidenceItems,
            List<ExtractedEntity> entities,
            List<EntityRelationship> relationships,
            List<TimelineEvent> timelineEvents
    ) {
        return evaluateCaseRisk(evidenceItems, entities, relationships, timelineEvents, Map.of());
    }

    /**
     * @param crossCaseCounts map of "TYPE::normalizedValue" -> number of OTHER cases the entity appears in
     */
    public static RiskEvaluation evaluateCaseRisk(
            List<EvidenceItem> evidenceItems,
            List<ExtractedEntity> entities,
            List<EntityRelationship> relationships,
            List<TimelineEvent> timelineEvents,
            Map<String, Integer> crossCaseCounts
    ) {
        List<RiskIndicator> indicators = new ArrayList<>();
        int rawScore = 10;

        // 1. Cryptographic tampering — measured by re-hashing stored files.
        long tamperedCount = evidenceItems.stream()
                .filter(e -> "TAMPER_DETECTED".equals(e.integrityStatus)).count();
        if (tamperedCount > 0) {
            rawScore += 30;
            indicators.add(new RiskIndicator("risk-tamper", "CRYPTO_HASH_MISMATCH", "CRYPTOGRAPHIC_INTEGRITY",
                    "CRITICAL", 30,
                    "Evidence file changed after sealing (" + tamperedCount + " file(s))",
                    "Recomputed SHA-256 does not match the hash recorded when the file was received.",
                    "Evidence integrity verifier", "T1565.001"));
        }

        // 2. Metadata anomaly — only when the metadata parser actually flagged one.
        List<EvidenceItem> anomalyEvidence = evidenceItems.stream().filter(e -> e.timestampAnomaly).toList();
        if (!anomalyEvidence.isEmpty()) {
            rawScore += 15;
            EvidenceItem first = anomalyEvidence.get(0);
            indicators.add(new RiskIndicator("risk-meta", "EXIF_TIMESTAMP_DISCREPANCY", "METADATA_FORENSICS",
                    "HIGH", 15,
                    "File metadata looks edited (" + anomalyEvidence.size() + " file(s))",
                    first.timestampAnomalyDetail != null ? first.timestampAnomalyDetail
                            : "Metadata indicates editing software or a timestamp mismatch.",
                    first.evidenceCode + " (" + first.originalFilename + ")", "T1070.006"));
        }

        // 3. Suspicious link — heuristic facts only (shortener / cheap TLD / brand words in host).
        //    We never claim a blacklist verdict we did not fetch.
        List<ExtractedEntity> urls = entities.stream().filter(e -> "URL".equals(e.entityType)).toList();
        ExtractedEntity suspiciousUrl = null;
        String urlReason = null;
        for (ExtractedEntity u : urls) {
            String v = u.normalizedValue.toLowerCase(Locale.ROOT);
            for (String s : SHORTENERS) if (v.contains(s)) { suspiciousUrl = u; urlReason = "uses a link shortener (" + s + ") which hides the real destination"; break; }
            if (suspiciousUrl != null) break;
            for (String tld : SUSPICIOUS_TLDS) if (v.contains(tld + "/") || v.endsWith(tld)) { suspiciousUrl = u; urlReason = "uses a low-cost domain ending (" + tld + ") frequently abused for phishing"; break; }
            if (suspiciousUrl != null) break;
            if ((v.contains("kyc") || v.contains("hdfc") || v.contains("sbi") || v.contains("verify"))
                    && !v.contains("hdfcbank.com") && !v.contains("sbi.co.in") && !v.contains("onlinesbi.sbi")) {
                suspiciousUrl = u; urlReason = "contains bank/KYC words but is not an official bank domain";
            }
            if (suspiciousUrl != null) break;
        }
        if (suspiciousUrl != null) {
            rawScore += 18;
            indicators.add(new RiskIndicator("risk-url", "SUSPICIOUS_URL_HEURISTIC", "PHISHING_INFRASTRUCTURE",
                    "HIGH", 18,
                    "Suspicious link in evidence",
                    "Link " + suspiciousUrl.displayLabel + " " + urlReason + ". (Heuristic only — no external blacklist was consulted in demo mode.)",
                    suspiciousUrl.displayLabel, "T1566.002"));
        }

        // 4. Destination reused across complaints — the fraud-ring signal, straight from the entity index.
        int maxCross = 0;
        ExtractedEntity mostReused = null;
        for (ExtractedEntity e : entities) {
            int c = crossCaseCounts.getOrDefault(e.entityType + "::" + e.normalizedValue.toLowerCase(Locale.ROOT), 0);
            if (c > maxCross && (e.entityType.equals("UPI_ID") || e.entityType.equals("BANK_ACCOUNT")
                    || e.entityType.equals("PHONE") || e.entityType.equals("URL"))) {
                maxCross = c; mostReused = e;
            }
        }
        if (maxCross >= 1 && mostReused != null) {
            rawScore += 20;
            indicators.add(new RiskIndicator("risk-reuse", "REPEAT_DESTINATION", "CROSS_CASE_CORRELATION",
                    "CRITICAL", 20,
                    "Same " + mostReused.entityType.replace('_', ' ') + " appears in " + maxCross + " other complaint(s)",
                    mostReused.displayLabel + " was reported by other victims too — possible organised fraud ring / repeat mule account.",
                    "Cross-case entity index", "T1657"));
        }

        // 5. Speed of the attack — actually measured from first lure to first payment event.
        Long velocityMinutes = measureLureToPaymentMinutes(timelineEvents);
        if (velocityMinutes != null) {
            rawScore += 12;
            indicators.add(new RiskIndicator("risk-velocity", "FAST_LURE_TO_PAYMENT", "FINANCIAL_VELOCITY",
                    "HIGH", 12,
                    "Payment happened " + velocityMinutes + " minute(s) after first contact",
                    "Measured from the reconstructed timeline. Fast lure-to-payment is typical of scripted social-engineering calls.",
                    "Timeline reconstruction", "T1598"));
        }

        // 6. Pressure / coercion language — lexicon match on actual extracted text.
        String pressureHit = null;
        for (EvidenceItem ev : evidenceItems) {
            if (ev.ocrRawText == null) continue;
            String lower = ev.ocrRawText.toLowerCase(Locale.ROOT);
            for (String w : PRESSURE_WORDS) {
                if (lower.contains(w)) { pressureHit = w; break; }
            }
            if (pressureHit != null) break;
        }
        if (pressureHit != null) {
            rawScore += 8;
            indicators.add(new RiskIndicator("risk-pressure", "PRESSURE_LANGUAGE", "SOCIAL_ENGINEERING",
                    "MEDIUM", 8,
                    "Scam-script pressure language detected",
                    "Evidence text contains coercive phrasing (\"" + pressureHit + "\") matching known scam scripts.",
                    "Extracted evidence text", "T1598.003"));
        }

        // 7. Unreadable evidence — a completeness warning, scored mildly and stated plainly.
        long unreadable = evidenceItems.stream().filter(e -> e.needsReview).count();
        if (unreadable > 0) {
            indicators.add(new RiskIndicator("risk-unread", "EVIDENCE_NEEDS_MANUAL_READING", "EVIDENCE_QUALITY",
                    "LOW", 0,
                    unreadable + " file(s) could not be read automatically",
                    "These files are sealed and preserved, but an officer should read them manually — details may be missing from this analysis.",
                    "OCR pipeline", "-"));
        }

        int finalScore = Math.min(99, Math.max(5, rawScore));
        String severity = finalScore >= 75 ? "CRITICAL" : finalScore >= 55 ? "HIGH" : finalScore >= 35 ? "MEDIUM" : "LOW";
        return new RiskEvaluation(finalScore, severity, indicators);
    }

    private static Long measureLureToPaymentMinutes(List<TimelineEvent> timelineEvents) {
        Instant firstLure = null, firstPayment = null;
        for (TimelineEvent e : timelineEvents) {
            Instant t;
            try { t = Instant.parse(e.eventTimestamp); } catch (Exception ex) { continue; }
            if ("FINANCIAL_EXECUTION".equals(e.killChainPhase) || "CASHOUT_LAUNDERING".equals(e.killChainPhase)) {
                if (firstPayment == null || t.isBefore(firstPayment)) firstPayment = t;
            } else {
                if (firstLure == null || t.isBefore(firstLure)) firstLure = t;
            }
        }
        if (firstLure == null || firstPayment == null || !firstPayment.isAfter(firstLure)) return null;
        long mins = Duration.between(firstLure, firstPayment).toMinutes();
        return mins <= 240 ? mins : null;
    }

    /**
     * Urgency for the officer triage queue (0-100). Weights mirror scoring.properties
     * in the design plan; kept here as named constants so they are easy to defend/tune.
     */
    public static UrgencyEvaluation evaluateUrgency(ForensicCase fc, int maxCrossCaseHits, int evidenceCount, int entityCount) {
        List<String> reasons = new ArrayList<>();
        double score = 0;

        // Recency decay: fresh transaction = money may still be holdable (golden hour).
        if (fc.incidentAt != null) {
            try {
                long mins = Math.max(0, Duration.between(Instant.parse(fc.incidentAt), Instant.now()).toMinutes());
                double recency = mins <= 60 ? 1.0 : mins <= 360 ? 0.75 : mins <= 1440 ? 0.45 : mins <= 4320 ? 0.2 : 0.05;
                score += 40 * recency;
                if (mins <= 360) reasons.add("Transaction is " + Math.max(1, mins) + " min old — funds may still be holdable");
            } catch (Exception ignored) {}
        }
        // Amount band (paise -> rupees).
        long rupees = fc.amountLostPaise / 100;
        double amountBand = rupees >= 500_000 ? 1.0 : rupees >= 100_000 ? 0.8 : rupees >= 25_000 ? 0.6 : rupees >= 5_000 ? 0.4 : rupees > 0 ? 0.2 : 0.0;
        score += 25 * amountBand;
        if (rupees >= 25_000) reasons.add("Amount at risk: Rs. " + String.format("%,d", rupees));
        // Repeat destination.
        double repeat = maxCrossCaseHits >= 3 ? 1.0 : maxCrossCaseHits == 2 ? 0.7 : maxCrossCaseHits == 1 ? 0.4 : 0.0;
        score += 20 * repeat;
        if (maxCrossCaseHits >= 1) reasons.add("Destination also reported in " + maxCrossCaseHits + " other complaint(s)");
        // Victim vulnerability by scam type.
        String type = fc.incidentType != null ? fc.incidentType : "";
        double vuln = (type.contains("HARASSMENT") || type.contains("THREAT")) ? 1.0
                : type.contains("ACCOUNT_HACKED") ? 0.6 : 0.3;
        score += 10 * vuln;
        if (vuln >= 1.0) reasons.add("Harassment/threat case — victim safety takes priority");
        // Evidence completeness (can the officer act immediately?).
        double completeness = (evidenceCount >= 1 && entityCount >= 2) ? 1.0 : evidenceCount >= 1 ? 0.5 : 0.0;
        score += 5 * completeness;
        if (completeness == 0) reasons.add("Evidence incomplete — may need citizen follow-up");

        return new UrgencyEvaluation((int) Math.round(Math.min(100, score)), reasons);
    }
}
