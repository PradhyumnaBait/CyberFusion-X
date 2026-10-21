-- ============================================================================
-- CyberFusion X — V3: Two-portal citizen complaints (optional Phase-2 JDBC)
-- The current runtime persists to the file-backed ForensicDataStore; this
-- migration documents the equivalent relational shape for a PostgreSQL move.
-- ============================================================================

ALTER TABLE forensic_cases
    ADD COLUMN IF NOT EXISTS origin VARCHAR(16) DEFAULT 'OFFICER',       -- CITIZEN | OFFICER
    ADD COLUMN IF NOT EXISTS amount_lost_paise BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS urgency_score INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS district VARCHAR(128),
    ADD COLUMN IF NOT EXISTS station_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS citizen_contact_masked VARCHAR(32),
    ADD COLUMN IF NOT EXISTS incident_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS reported_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS draft_token_hash VARCHAR(128),              -- SHA-256 only, never raw
    ADD COLUMN IF NOT EXISTS assigned_officer_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS language VARCHAR(8) DEFAULT 'en';

ALTER TABLE evidence_items
    ADD COLUMN IF NOT EXISTS ocr_engine VARCHAR(32),
    ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS phash VARCHAR(32);

CREATE TABLE IF NOT EXISTS police_stations (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    district VARCHAR(128) NOT NULL,
    type VARCHAR(32) NOT NULL
);

CREATE TABLE IF NOT EXISTS status_updates (
    id VARCHAR(64) PRIMARY KEY,
    case_id VARCHAR(64) NOT NULL REFERENCES forensic_cases(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS freeze_requests (
    id VARCHAR(64) PRIMARY KEY,
    case_id VARCHAR(64) NOT NULL REFERENCES forensic_cases(id) ON DELETE CASCADE,
    bank_name VARCHAR(255),
    account_ref VARCHAR(255) NOT NULL,
    ifsc VARCHAR(16),
    utr VARCHAR(64),
    amount_paise BIGINT NOT NULL,
    packet_hash VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL,               -- DRAFT | SENT | ACKNOWLEDGED | REJECTED
    ack_ref VARCHAR(128),
    idempotency_key VARCHAR(64) UNIQUE NOT NULL,
    requested_by VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE
);

-- The fraud-ring index: "which other complaints mention this destination?"
CREATE INDEX IF NOT EXISTS idx_entities_cross_case
    ON extracted_entities (entity_type, normalized_value);
CREATE INDEX IF NOT EXISTS idx_evidence_phash ON evidence_items (phash);
