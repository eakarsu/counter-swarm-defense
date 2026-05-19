DROP TABLE IF EXISTS engagement_events CASCADE;
DROP TABLE IF EXISTS engagements CASCADE;
DROP TABLE IF EXISTS fusion_tracks CASCADE;
DROP TABLE IF EXISTS threat_signatures CASCADE;
DROP TABLE IF EXISTS effector_magazines CASCADE;
DROP TABLE IF EXISTS roe_rules CASCADE;
DROP TABLE IF EXISTS roe_authorizations CASCADE;
DROP TABLE IF EXISTS deployments CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS threats CASCADE;
DROP TABLE IF EXISTS countermeasures CASCADE;
DROP TABLE IF EXISTS sensors CASCADE;
DROP TABLE IF EXISTS defense_zones CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE threats (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50),
  drone_count INTEGER,
  threat_level DECIMAL,
  lat DECIMAL,
  lng DECIMAL,
  altitude_m DECIMAL,
  speed_kmh DECIMAL,
  status VARCHAR(30),
  detected_at TIMESTAMP DEFAULT NOW(),
  neutralized_at TIMESTAMP,
  zone_name VARCHAR(100),
  classification_group VARCHAR(20),
  platform_model VARCHAR(100)
);

CREATE TABLE countermeasures (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  type VARCHAR(50),
  status VARCHAR(30),
  range_m INTEGER,
  ammo_count INTEGER,
  success_rate DECIMAL,
  location VARCHAR(255),
  last_deployed_at TIMESTAMP,
  total_deployments INTEGER DEFAULT 0,
  unit_cost_usd DECIMAL,
  reload_time_s INTEGER
);

CREATE TABLE deployments (
  id SERIAL PRIMARY KEY,
  threat_id INT REFERENCES threats,
  countermeasure_id INT REFERENCES countermeasures,
  deployed_at TIMESTAMP DEFAULT NOW(),
  result VARCHAR(30),
  drones_neutralized INTEGER DEFAULT 0,
  response_time_s INTEGER,
  operator VARCHAR(255),
  notes TEXT
);

CREATE TABLE sensors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  type VARCHAR(50),
  location VARCHAR(255),
  status VARCHAR(30),
  range_km DECIMAL,
  last_detection_at TIMESTAMP,
  battery_pct INTEGER,
  detections_today INTEGER DEFAULT 0,
  firmware_version VARCHAR(20),
  frequency_band VARCHAR(40),
  azimuth_coverage_deg INTEGER DEFAULT 360
);

CREATE TABLE incidents (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255),
  severity VARCHAR(20),
  description TEXT,
  threat_id INT REFERENCES threats,
  response_time_s INTEGER,
  drones_involved INTEGER,
  casualties INTEGER DEFAULT 0,
  damage_assessment TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  occurred_at TIMESTAMP,
  resolved_at TIMESTAMP
);

CREATE TABLE defense_zones (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  zone_type VARCHAR(50),
  security_level VARCHAR(20),
  active_sensors INTEGER DEFAULT 0,
  active_countermeasures INTEGER DEFAULT 0,
  status VARCHAR(30),
  area_km2 DECIMAL,
  last_incident_at TIMESTAMP,
  threat_count_30d INTEGER DEFAULT 0
);

-- ============================================================
-- Threat Signatures: real RF/radar/EO/acoustic library
-- ============================================================
CREATE TABLE threat_signatures (
  id SERIAL PRIMARY KEY,
  platform_name VARCHAR(120) NOT NULL,
  manufacturer VARCHAR(120),
  country_of_origin VARCHAR(80),
  dod_group VARCHAR(20),                  -- Group 1..5 per DOD doctrine
  mtow_kg DECIMAL,                        -- max takeoff weight
  wingspan_m DECIMAL,
  cruise_speed_kmh DECIMAL,
  max_range_km DECIMAL,
  rf_protocol VARCHAR(80),                -- DJI OcuSync, Mavlink, custom datalink
  rf_band VARCHAR(40),                    -- 2.4GHz, 5.8GHz, 900MHz, etc.
  radar_cross_section_m2 DECIMAL,         -- RCS in square meters
  ir_signature VARCHAR(40),               -- low/medium/high
  acoustic_signature_db DECIMAL,          -- ~dB at 50m
  payload_capacity_kg DECIMAL,
  warhead_kg DECIMAL,                     -- if munition
  autonomy_level VARCHAR(40),             -- gps-waypoint, ai-onboard, swarm-mesh
  jam_resistance VARCHAR(20),             -- low/medium/high
  threat_priority INTEGER DEFAULT 5,      -- 1=highest, 10=lowest
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Fusion Tracks: multi-sensor correlated tracks
-- ============================================================
CREATE TABLE fusion_tracks (
  id SERIAL PRIMARY KEY,
  track_uid VARCHAR(40) UNIQUE NOT NULL,
  threat_id INT REFERENCES threats(id) ON DELETE SET NULL,
  signature_id INT REFERENCES threat_signatures(id) ON DELETE SET NULL,
  contributing_sensors TEXT,              -- comma-separated sensor ids
  sensor_count INTEGER DEFAULT 0,
  fusion_confidence DECIMAL,              -- 0..1
  classification VARCHAR(60),
  lat DECIMAL,
  lng DECIMAL,
  altitude_m DECIMAL,
  heading_deg DECIMAL,
  speed_kmh DECIMAL,
  rf_detected BOOLEAN DEFAULT FALSE,
  radar_detected BOOLEAN DEFAULT FALSE,
  eo_ir_detected BOOLEAN DEFAULT FALSE,
  acoustic_detected BOOLEAN DEFAULT FALSE,
  track_state VARCHAR(30) DEFAULT 'tentative', -- tentative, confirmed, lost
  first_detected_at TIMESTAMP DEFAULT NOW(),
  last_update_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Engagements: DITDEA kill-chain state machine
-- ============================================================
CREATE TABLE engagements (
  id SERIAL PRIMARY KEY,
  engagement_uid VARCHAR(40) UNIQUE NOT NULL,
  track_id INT REFERENCES fusion_tracks(id) ON DELETE SET NULL,
  threat_id INT REFERENCES threats(id) ON DELETE SET NULL,
  countermeasure_id INT REFERENCES countermeasures(id) ON DELETE SET NULL,
  current_phase VARCHAR(30) DEFAULT 'detect', -- detect, identify, track, decide, engage, assess
  cleared_to_engage BOOLEAN DEFAULT FALSE,
  authorizing_officer VARCHAR(120),
  roe_rule_id INT,
  pk_estimate DECIMAL,                    -- probability of kill
  expected_cost_usd DECIMAL,
  outcome VARCHAR(40),                    -- pending, neutralized, partial, missed, aborted
  drones_engaged INTEGER DEFAULT 0,
  drones_killed INTEGER DEFAULT 0,
  started_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP,
  notes TEXT
);

CREATE TABLE engagement_events (
  id SERIAL PRIMARY KEY,
  engagement_id INT REFERENCES engagements(id) ON DELETE CASCADE,
  phase VARCHAR(30) NOT NULL,
  actor VARCHAR(120),
  event_type VARCHAR(60),
  detail TEXT,
  occurred_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Effector Magazines: per-effector ammo, cost-per-kill economics
-- ============================================================
CREATE TABLE effector_magazines (
  id SERIAL PRIMARY KEY,
  countermeasure_id INT REFERENCES countermeasures(id) ON DELETE CASCADE,
  munition_type VARCHAR(80),              -- net, kinetic_round, hpm_pulse, jam_burst
  rounds_remaining INTEGER,
  rounds_capacity INTEGER,
  unit_cost_usd DECIMAL,
  resupply_lead_days INTEGER,
  last_resupply_at TIMESTAMP,
  total_fired INTEGER DEFAULT 0,
  total_hits INTEGER DEFAULT 0,
  notes TEXT
);

-- ============================================================
-- ROE Rules + per-engagement authorizations
-- ============================================================
CREATE TABLE roe_rules (
  id SERIAL PRIMARY KEY,
  rule_code VARCHAR(40) UNIQUE NOT NULL,
  zone_name VARCHAR(120),
  min_threat_level DECIMAL,
  authorized_effector_types TEXT,         -- comma-separated
  requires_visual_id BOOLEAN DEFAULT FALSE,
  requires_command_approval BOOLEAN DEFAULT FALSE,
  collateral_check_required BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  description TEXT
);

CREATE TABLE roe_authorizations (
  id SERIAL PRIMARY KEY,
  engagement_id INT REFERENCES engagements(id) ON DELETE CASCADE,
  rule_id INT REFERENCES roe_rules(id) ON DELETE SET NULL,
  requested_by VARCHAR(120),
  approved_by VARCHAR(120),
  decision VARCHAR(20),                   -- approved, denied, conditional
  decision_at TIMESTAMP,
  conditions TEXT,
  rationale TEXT
);
