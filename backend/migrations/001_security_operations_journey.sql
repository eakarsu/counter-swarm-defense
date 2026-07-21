CREATE TABLE IF NOT EXISTS tenants (
  id BIGSERIAL PRIMARY KEY,
  slug VARCHAR(80) UNIQUE NOT NULL,
  name VARCHAR(160) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO tenants(slug,name) VALUES ('default','Default Operations Tenant')
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id BIGINT REFERENCES tenants(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 1;
UPDATE users SET tenant_id=(SELECT id FROM tenants WHERE slug='default') WHERE tenant_id IS NULL;
ALTER TABLE users ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS users_tenant_idx ON users(tenant_id);

CREATE TABLE IF NOT EXISTS telemetry_sources (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id),
  source_uid VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(160) NOT NULL,
  source_type VARCHAR(40) NOT NULL CHECK (source_type IN ('rf','radar','eo_ir','acoustic','health','simulator')),
  status VARCHAR(24) NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','quarantined')),
  signing_secret_ciphertext TEXT NOT NULL,
  key_version VARCHAR(40) NOT NULL DEFAULT 'v1',
  retention_days INTEGER NOT NULL DEFAULT 30 CHECK (retention_days BETWEEN 1 AND 3650),
  allowed_clock_skew_seconds INTEGER NOT NULL DEFAULT 120 CHECK (allowed_clock_skew_seconds BETWEEN 1 AND 3600),
  last_sequence BIGINT NOT NULL DEFAULT 0,
  last_seen_at TIMESTAMPTZ,
  created_by BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS telemetry_sources_tenant_idx ON telemetry_sources(tenant_id,status);

CREATE TABLE IF NOT EXISTS telemetry_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id),
  source_id BIGINT NOT NULL REFERENCES telemetry_sources(id),
  external_event_id VARCHAR(128) NOT NULL,
  sequence BIGINT NOT NULL CHECK (sequence > 0),
  schema_version VARCHAR(16) NOT NULL,
  parser_version VARCHAR(32) NOT NULL,
  event_type VARCHAR(40) NOT NULL CHECK (event_type IN ('rf_detection','radar_track','eo_ir_detection','acoustic_detection','sensor_health')),
  sensor_uid VARCHAR(100) NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  normalized JSONB NOT NULL,
  raw_sha256 CHAR(64) NOT NULL,
  integrity_status VARCHAR(24) NOT NULL CHECK (integrity_status IN ('verified','clock_skew_warning')),
  retention_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id,source_id,external_event_id),
  UNIQUE(tenant_id,source_id,sequence)
);
CREATE INDEX IF NOT EXISTS telemetry_events_tenant_time_idx ON telemetry_events(tenant_id,observed_at DESC);
CREATE INDEX IF NOT EXISTS telemetry_events_retention_idx ON telemetry_events(retention_until);

CREATE TABLE IF NOT EXISTS detection_policies (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id),
  policy_uid VARCHAR(100) NOT NULL,
  name VARCHAR(160) NOT NULL,
  event_type VARCHAR(40) NOT NULL,
  severity VARCHAR(16) NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  conditions JSONB NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id,policy_uid,version)
);

CREATE TABLE IF NOT EXISTS suppressions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id),
  event_type VARCHAR(40),
  sensor_uid VARCHAR(100),
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired','revoked')),
  requested_by BIGINT NOT NULL REFERENCES users(id),
  reviewed_by BIGINT REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (reviewed_by IS NULL OR reviewed_by <> requested_by)
);
CREATE INDEX IF NOT EXISTS suppressions_match_idx ON suppressions(tenant_id,status,event_type,sensor_uid,expires_at);

CREATE TABLE IF NOT EXISTS detections (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id),
  policy_id BIGINT NOT NULL REFERENCES detection_policies(id),
  fingerprint CHAR(64) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'triage' CHECK (status IN ('triage','open','suppressed','false_positive','closed')),
  severity VARCHAR(16) NOT NULL,
  risk_score INTEGER NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  title VARCHAR(240) NOT NULL,
  summary TEXT NOT NULL,
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  suppression_id BIGINT REFERENCES suppressions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS detections_tenant_status_idx ON detections(tenant_id,status,last_seen_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS detections_active_fingerprint_idx
  ON detections(tenant_id,fingerprint) WHERE status IN ('triage','open');

CREATE TABLE IF NOT EXISTS detection_evidence (
  detection_id BIGINT NOT NULL REFERENCES detections(id) ON DELETE CASCADE,
  telemetry_event_id BIGINT NOT NULL REFERENCES telemetry_events(id),
  evidence_role VARCHAR(30) NOT NULL DEFAULT 'trigger',
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(detection_id,telemetry_event_id)
);

CREATE TABLE IF NOT EXISTS triage_cases (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id),
  detection_id BIGINT NOT NULL UNIQUE REFERENCES detections(id),
  status VARCHAR(24) NOT NULL DEFAULT 'unassigned' CHECK (status IN ('unassigned','investigating','escalated','resolved')),
  owner_user_id BIGINT REFERENCES users(id),
  escalation_level INTEGER NOT NULL DEFAULT 0 CHECK (escalation_level BETWEEN 0 AND 5),
  sla_due_at TIMESTAMPTZ NOT NULL,
  disposition VARCHAR(30) CHECK (disposition IN ('confirmed','false_positive','benign','duplicate')),
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS triage_cases_tenant_owner_idx ON triage_cases(tenant_id,status,owner_user_id);

CREATE TABLE IF NOT EXISTS case_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id),
  case_id BIGINT NOT NULL REFERENCES triage_cases(id),
  actor_user_id BIGINT NOT NULL REFERENCES users(id),
  event_type VARCHAR(40) NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evaluation_runs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id),
  name VARCHAR(160) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','completed','approved','rejected')),
  dataset_digest CHAR(64) NOT NULL,
  total_samples INTEGER NOT NULL DEFAULT 0,
  true_positives INTEGER NOT NULL DEFAULT 0,
  false_positives INTEGER NOT NULL DEFAULT 0,
  true_negatives INTEGER NOT NULL DEFAULT 0,
  false_negatives INTEGER NOT NULL DEFAULT 0,
  precision_value DECIMAL,
  recall_value DECIMAL,
  false_positive_rate DECIMAL,
  adversarial_cases JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by BIGINT NOT NULL REFERENCES users(id),
  approved_by BIGINT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (approved_by IS NULL OR approved_by <> created_by)
);

CREATE TABLE IF NOT EXISTS audit_history (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id),
  actor_user_id BIGINT REFERENCES users(id),
  actor_label VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id VARCHAR(100),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  previous_hash CHAR(64) NOT NULL,
  event_hash CHAR(64) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_history_tenant_time_idx ON audit_history(tenant_id,id);

CREATE OR REPLACE FUNCTION deny_audit_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_history is append-only';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS audit_history_no_update ON audit_history;
CREATE TRIGGER audit_history_no_update BEFORE UPDATE OR DELETE ON audit_history
FOR EACH ROW EXECUTE FUNCTION deny_audit_mutation();

CREATE OR REPLACE FUNCTION deny_case_event_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'case_events is append-only';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS case_events_no_update ON case_events;
CREATE TRIGGER case_events_no_update BEFORE UPDATE OR DELETE ON case_events
FOR EACH ROW EXECUTE FUNCTION deny_case_event_mutation();

INSERT INTO detection_policies(tenant_id,policy_uid,name,event_type,severity,conditions)
SELECT id,'rf-strong-signal','Strong RF signal','rf_detection','high','{"minimum_signal_dbm":-70,"minimum_confidence":0.7}'::jsonb FROM tenants
ON CONFLICT (tenant_id,policy_uid,version) DO NOTHING;
INSERT INTO detection_policies(tenant_id,policy_uid,name,event_type,severity,conditions)
SELECT id,'radar-zone-proximity','Radar track near protected zone','radar_track','critical','{"maximum_zone_distance_m":1500,"minimum_confidence":0.75}'::jsonb FROM tenants
ON CONFLICT (tenant_id,policy_uid,version) DO NOTHING;
INSERT INTO detection_policies(tenant_id,policy_uid,name,event_type,severity,conditions)
SELECT id,'sensor-health','Sensor health degradation','sensor_health','medium','{"maximum_battery_pct":20}'::jsonb FROM tenants
ON CONFLICT (tenant_id,policy_uid,version) DO NOTHING;
