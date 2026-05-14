export interface Threat {
  id: number;
  type: string;
  drone_count: number;
  threat_level: number;
  lat: number;
  lng: number;
  altitude_m: number;
  speed_kmh: number;
  status: string;
  detected_at: string;
  neutralized_at: string | null;
  zone_name: string;
}

export interface Countermeasure {
  id: number;
  name: string;
  type: string;
  status: string;
  range_m: number;
  ammo_count: number;
  success_rate: number;
  location: string;
  last_deployed_at: string | null;
  total_deployments: number;
}

export interface Deployment {
  id: number;
  threat_id: number;
  countermeasure_id: number;
  deployed_at: string;
  result: string;
  drones_neutralized: number;
  response_time_s: number;
  operator: string;
  notes: string;
  threat_type?: string;
  zone_name?: string;
  countermeasure_name?: string;
}

export interface Sensor {
  id: number;
  name: string;
  type: string;
  location: string;
  status: string;
  range_km: number;
  last_detection_at: string | null;
  battery_pct: number;
  detections_today: number;
  firmware_version: string;
}

export interface Incident {
  id: number;
  title: string;
  severity: string;
  description: string;
  threat_id: number | null;
  response_time_s: number;
  drones_involved: number;
  casualties: number;
  damage_assessment: string;
  resolved: boolean;
  occurred_at: string;
  resolved_at: string | null;
}

export interface DefenseZone {
  id: number;
  name: string;
  zone_type: string;
  security_level: string;
  active_sensors: number;
  active_countermeasures: number;
  status: string;
  area_km2: number;
  last_incident_at: string | null;
  threat_count_30d: number;
}
