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
  zone_name VARCHAR(100)
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
  total_deployments INTEGER DEFAULT 0
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
  firmware_version VARCHAR(20)
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
