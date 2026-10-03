-- ============================================================================
-- CyberFusion X — Flyway Migration V2: Forensic Indexes & Search Optimization
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_evidence_case_id ON evidence_items(case_id);
CREATE INDEX IF NOT EXISTS idx_evidence_sha256 ON evidence_items(sha256_hash);
CREATE INDEX IF NOT EXISTS idx_evidence_blake3 ON evidence_items(blake3_hash);
CREATE INDEX IF NOT EXISTS idx_entities_case_id ON extracted_entities(case_id);
CREATE INDEX IF NOT EXISTS idx_entities_type_val ON extracted_entities(entity_type, normalized_value);
CREATE INDEX IF NOT EXISTS idx_relationships_case_id ON entity_relationships(case_id);
CREATE INDEX IF NOT EXISTS idx_timeline_case_time ON timeline_events(case_id, event_timestamp);
CREATE INDEX IF NOT EXISTS idx_ledger_seq ON chain_of_custody_ledger(sequence_number);
CREATE INDEX IF NOT EXISTS idx_ledger_case_id ON chain_of_custody_ledger(case_id);
