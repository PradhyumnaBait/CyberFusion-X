-- ============================================================================
-- CyberFusion X — Flyway Migration V1: Core Digital Forensics & Graph Schema
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(64) NOT NULL, -- LEAD_INVESTIGATOR, FORENSIC_ANALYST, AUDITOR
    badge_number VARCHAR(64) NOT NULL,
    organization VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    password_salt VARCHAR(255) NOT NULL,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS forensic_cases (
    id VARCHAR(64) PRIMARY KEY,
    case_number VARCHAR(64) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    incident_type VARCHAR(64) NOT NULL, -- UPI_WIRE_FRAUD, BEC_WIRE_INTERCEPT, PHISHING_CAMPAIGN, ACCOUNT_TAKEOVER, CRYPTO_DRAIN
    status VARCHAR(32) NOT NULL,        -- OPEN, ANALYZING, VERIFIED, CLOSED
    severity VARCHAR(32) NOT NULL,      -- CRITICAL, HIGH, MEDIUM, LOW
    risk_score INTEGER NOT NULL DEFAULT 0,
    summary TEXT,
    victim_name VARCHAR(255),
    estimated_loss_usd DECIMAL(18, 2) DEFAULT 0.00,
    lead_investigator_id VARCHAR(64) NOT NULL,
    lead_investigator_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS evidence_items (
    id VARCHAR(64) PRIMARY KEY,
    case_id VARCHAR(64) NOT NULL REFERENCES forensic_cases(id) ON DELETE CASCADE,
    evidence_code VARCHAR(64) NOT NULL,
    original_filename VARCHAR(512) NOT NULL,
    evidence_category VARCHAR(64) NOT NULL, -- SCREENSHOT, TRANSACTION_RECEIPT, CHAT_LOG, URL_IOC, PHONE_IOC, EMAIL_HEADER, DOCUMENT
    detected_mime_type VARCHAR(128) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    storage_path VARCHAR(1024) NOT NULL,
    sha256_hash VARCHAR(128) NOT NULL,
    blake3_hash VARCHAR(128) NOT NULL,
    integrity_status VARCHAR(32) NOT NULL, -- VERIFIED_INTACT, TAMPER_DETECTED, UNVERIFIED
    exif_metadata_json TEXT,
    ocr_raw_text TEXT,
    ocr_confidence DOUBLE PRECISION DEFAULT 0.0,
    processing_stage VARCHAR(64) NOT NULL, -- COMPLETED, OCR_EXTRACTING, AI_CORRELATING, FAILED
    timestamp_anomaly BOOLEAN DEFAULT FALSE,
    timestamp_anomaly_detail TEXT,
    uploaded_by VARCHAR(128) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_verified_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS integrity_verifications (
    id VARCHAR(64) PRIMARY KEY,
    case_id VARCHAR(64) NOT NULL REFERENCES forensic_cases(id) ON DELETE CASCADE,
    evidence_id VARCHAR(64) NOT NULL REFERENCES evidence_items(id) ON DELETE CASCADE,
    evidence_filename VARCHAR(512) NOT NULL,
    expected_sha256 VARCHAR(128) NOT NULL,
    computed_sha256 VARCHAR(128) NOT NULL,
    expected_blake3 VARCHAR(128) NOT NULL,
    computed_blake3 VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL, -- VERIFIED_INTACT, TAMPER_DETECTED
    verified_by VARCHAR(128) NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE NOT NULL,
    certificate_signature VARCHAR(256) NOT NULL
);

CREATE TABLE IF NOT EXISTS extracted_entities (
    id VARCHAR(64) PRIMARY KEY,
    case_id VARCHAR(64) NOT NULL REFERENCES forensic_cases(id) ON DELETE CASCADE,
    entity_type VARCHAR(64) NOT NULL, -- PERSON, PHONE, EMAIL, BANK_ACCOUNT, UPI_ID, CRYPTO_WALLET, TRANSACTION_ID, URL, IP_ADDRESS, MESSAGE, DEVICE
    normalized_value VARCHAR(512) NOT NULL,
    display_label VARCHAR(512) NOT NULL,
    role_in_incident VARCHAR(128),    -- VICTIM, THREAT_ACTOR, MULE_ACCOUNT, PHISHING_INFRASTRUCTURE, PAYMENT_RAIL, EVIDENCE_ARTIFACT
    confidence_score DOUBLE PRECISION NOT NULL DEFAULT 0.90,
    risk_level VARCHAR(32) NOT NULL,  -- CRITICAL, HIGH, MEDIUM, LOW, INFO
    pagerank_score DOUBLE PRECISION DEFAULT 0.0,
    betweenness_score DOUBLE PRECISION DEFAULT 0.0,
    cluster_id INTEGER DEFAULT 0,
    osint_enrichment_json TEXT,
    evidence_ids_json TEXT,
    bounding_boxes_json TEXT,
    first_seen_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS entity_relationships (
    id VARCHAR(64) PRIMARY KEY,
    case_id VARCHAR(64) NOT NULL REFERENCES forensic_cases(id) ON DELETE CASCADE,
    source_entity_id VARCHAR(64) NOT NULL REFERENCES extracted_entities(id) ON DELETE CASCADE,
    target_entity_id VARCHAR(64) NOT NULL REFERENCES extracted_entities(id) ON DELETE CASCADE,
    relationship_type VARCHAR(64) NOT NULL, -- SENT_MESSAGE_TO, TRANSFERRED_FUNDS_TO, CLICKED_URL, OWNS_ACCOUNT, IMPERSONATED, HOSTED_ON_IP, EXTRACTED_FROM, CORRELATED_WITH
    label VARCHAR(255) NOT NULL,
    weight DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0.90,
    evidence_id VARCHAR(64),
    event_timestamp VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS timeline_events (
    id VARCHAR(64) PRIMARY KEY,
    case_id VARCHAR(64) NOT NULL REFERENCES forensic_cases(id) ON DELETE CASCADE,
    evidence_id VARCHAR(64),
    event_timestamp VARCHAR(64) NOT NULL,
    timestamp_source VARCHAR(64) NOT NULL, -- OCR_CONTENT, EXIF_METADATA, TRANSACTION_RECEIPT, ANALYST_ANNOTATION
    kill_chain_phase VARCHAR(64) NOT NULL, -- RECON_LURE, INITIAL_CONTACT, DECEPTION_PHISHING, CREDENTIAL_HARVEST, FINANCIAL_EXECUTION, CASHOUT_LAUNDERING
    severity VARCHAR(32) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    actor_entity VARCHAR(255),
    target_entity VARCHAR(255),
    amount_involved VARCHAR(128),
    anomaly_flag BOOLEAN DEFAULT FALSE,
    anomaly_reason TEXT,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0.92
);

CREATE TABLE IF NOT EXISTS chain_of_custody_ledger (
    id VARCHAR(64) PRIMARY KEY,
    sequence_number BIGINT NOT NULL,
    case_id VARCHAR(64),
    actor_username VARCHAR(128) NOT NULL,
    actor_role VARCHAR(64) NOT NULL,
    action_type VARCHAR(128) NOT NULL,
    target_resource VARCHAR(255) NOT NULL,
    details TEXT NOT NULL,
    client_ip VARCHAR(64) NOT NULL,
    previous_hash VARCHAR(128) NOT NULL,
    entry_hash VARCHAR(128) NOT NULL,
    timestamp VARCHAR(64) NOT NULL
);
