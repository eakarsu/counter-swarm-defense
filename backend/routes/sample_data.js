// Sample Data seeding routes — DEFENSIVE / EDUCATIONAL / TRAINING SIMULATION ONLY.
// Inserts 5–10 domain-realistic rows per main entity for demo / training drills.
// All content (sensor logs, drill scenarios, asset inventory, threat-classification
// training records) is framed as defensive, protective, and educational.
// Skips users / audit_log on purpose.
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireRole, verifyToken } = require('../middleware/auth');

const DEFENSIVE_CONTEXT = 'defensive/training simulation only — educational data for counter-swarm defender drills';

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rint(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function rfloat(min, max, dp = 2) { return Number((Math.random() * (max - min) + min).toFixed(dp)); }
function countInRange() { return rint(5, 10); }

const ZONES = [
  'Northern Approach', 'Eastern Flank', 'Southern Perimeter', 'Western Watch',
  'Training Range Alpha', 'Training Range Bravo', 'Drill Sector Charlie',
  'Coastal Watch', 'Inner Perimeter', 'Outer Perimeter'
];

const SENSOR_TYPES = ['radar', 'optical', 'rf_scanner', 'acoustic', 'lidar', 'ir_thermal'];
const COUNTERMEASURE_TYPES = ['rf_jammer', 'gps_spoofer_defensive', 'net_capture', 'directed_signal', 'decoy_beacon'];
const THREAT_TYPES = ['single', 'small_swarm', 'large_swarm', 'coordinated_attack'];
const STATUSES_THREAT = ['active', 'neutralized', 'escaped', 'false_alarm'];
const STATUSES_SENSOR = ['active', 'standby', 'maintenance', 'offline'];
const STATUSES_CM = ['ready', 'deployed', 'reloading', 'maintenance'];
const STATUSES_ZONE = ['secure', 'monitoring', 'elevated', 'drill_active'];
const SECURITY_LEVELS = ['low', 'medium', 'high', 'critical'];
const ZONE_TYPES = ['training', 'perimeter', 'critical_asset', 'civil_protection', 'exercise_range'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const DEPLOY_RESULTS = ['neutralized', 'partial', 'no_effect', 'training_success', 'training_review'];
const OPERATORS = ['T. Reyes', 'A. Petrov', 'M. Okafor', 'J. Lindgren', 'S. Chen', 'R. Diallo', 'K. Müller'];

const SENSOR_NAMES = [
  'Radar-North-1', 'Radar-North-2', 'Optical-East-3', 'RF-South-1', 'Acoustic-West-2',
  'Lidar-Center-1', 'IR-Thermal-North-2', 'Optical-Coastal-1', 'RF-Inner-3', 'Radar-Drill-Alpha'
];

const COUNTERMEASURE_NAMES = [
  'Defensive RF Curtain A', 'Net-Capture Unit B', 'Decoy Beacon Cluster C',
  'Defensive Jammer North-1', 'Training Spoof-Defender D', 'Net-Launcher East-2',
  'Decoy Array South-1', 'Defensive Signal Director W-1', 'Trainer-Net Alpha', 'Sim-Jammer Bravo'
];

async function seedThreats() {
  // Defensive training records: catalogued threat *observations* used in classifier drills.
  const rows = [];
  for (let i = 0; i < countInRange(); i++) {
    const r = await pool.query(
      `INSERT INTO threats (type, drone_count, threat_level, lat, lng, altitude_m, speed_kmh, status, zone_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [pick(THREAT_TYPES), rint(1, 50), rfloat(1, 10, 1),
       rfloat(33.0, 35.0, 4), rfloat(-119.0, -117.0, 4),
       rint(20, 400), rint(20, 140),
       pick(STATUSES_THREAT), pick(ZONES) + ' (training)']
    );
    rows.push(r.rows[0].id);
  }
  return rows.length;
}

async function seedCountermeasures() {
  // Asset inventory for defensive countermeasure trainers.
  let n = 0;
  const used = new Set();
  const target = countInRange();
  while (n < target) {
    const name = pick(COUNTERMEASURE_NAMES) + ' #' + rint(100, 999);
    if (used.has(name)) continue;
    used.add(name);
    await pool.query(
      `INSERT INTO countermeasures (name, type, status, range_m, ammo_count, success_rate, location, total_deployments)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [name, pick(COUNTERMEASURE_TYPES), pick(STATUSES_CM),
       rint(200, 5000), rint(0, 50), rfloat(0.6, 0.99, 2),
       pick(ZONES), rint(0, 40)]
    );
    n++;
  }
  return n;
}

async function seedDeployments() {
  // Training-drill deployment logs — links to existing threats/countermeasures if any.
  const t = await pool.query('SELECT id FROM threats ORDER BY id DESC LIMIT 20');
  const c = await pool.query('SELECT id FROM countermeasures ORDER BY id DESC LIMIT 20');
  if (!t.rows.length || !c.rows.length) {
    // Self-bootstrap minimal parents so the seed stays idempotent for demos.
    await seedThreats();
    await seedCountermeasures();
    return seedDeployments();
  }
  let n = 0;
  const target = countInRange();
  for (let i = 0; i < target; i++) {
    await pool.query(
      `INSERT INTO deployments (threat_id, countermeasure_id, result, drones_neutralized, response_time_s, operator, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [pick(t.rows).id, pick(c.rows).id, pick(DEPLOY_RESULTS),
       rint(0, 30), rint(3, 120), pick(OPERATORS),
       'Defensive training drill log — ' + DEFENSIVE_CONTEXT]
    );
    n++;
  }
  return n;
}

async function seedSensors() {
  // Sensor telemetry / health log records for defender training.
  let n = 0;
  const target = countInRange();
  for (let i = 0; i < target; i++) {
    await pool.query(
      `INSERT INTO sensors (name, type, location, status, range_km, battery_pct, detections_today, firmware_version, last_detection_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, NOW() - ($9 || ' minutes')::interval)`,
      [pick(SENSOR_NAMES) + '-' + rint(10, 99), pick(SENSOR_TYPES),
       pick(ZONES), pick(STATUSES_SENSOR),
       rfloat(0.5, 25.0, 1), rint(10, 100), rint(0, 80),
       'v' + rint(1, 4) + '.' + rint(0, 9) + '.' + rint(0, 9),
       String(rint(1, 720))]
    );
    n++;
  }
  return n;
}

async function seedIncidents() {
  const t = await pool.query('SELECT id FROM threats ORDER BY id DESC LIMIT 20');
  let n = 0;
  const target = countInRange();
  const TITLES = [
    'Training drill — perimeter probe',
    'Sensor handoff exercise',
    'Coordinated defender response drill',
    'Tabletop swarm-recognition session',
    'Live-environment drill — decoy array',
    'Defender debrief — false-alarm review',
    'Sim incident — RF curtain rehearsal',
    'Training drill — net-capture rehearsal',
    'Drill — sector C escalation review',
    'Joint-team defensive coordination drill'
  ];
  for (let i = 0; i < target; i++) {
    const tid = t.rows.length ? pick(t.rows).id : null;
    const resolved = Math.random() > 0.3;
    await pool.query(
      `INSERT INTO incidents (title, severity, description, threat_id, response_time_s, drones_involved, casualties, damage_assessment, resolved, occurred_at, resolved_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW() - ($10 || ' hours')::interval, $11)`,
      [pick(TITLES), pick(SEVERITIES),
       'Defensive training simulation entry. ' + DEFENSIVE_CONTEXT + '. After-action notes pending operator debrief.',
       tid, rint(5, 240), rint(1, 30), 0,
       'No real-world damage — simulated drill only.',
       resolved, String(rint(1, 200)),
       resolved ? new Date() : null]
    );
    n++;
  }
  return n;
}

async function seedZones() {
  let n = 0;
  const target = countInRange();
  const used = new Set();
  while (n < target) {
    const name = pick(ZONES) + ' Sector-' + rint(1, 99);
    if (used.has(name)) continue;
    used.add(name);
    await pool.query(
      `INSERT INTO defense_zones (name, zone_type, security_level, active_sensors, active_countermeasures, status, area_km2, threat_count_30d, last_incident_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, NOW() - ($9 || ' days')::interval)`,
      [name, pick(ZONE_TYPES), pick(SECURITY_LEVELS),
       rint(2, 20), rint(1, 8), pick(STATUSES_ZONE),
       rfloat(0.5, 50.0, 1), rint(0, 60),
       String(rint(0, 30))]
    );
    n++;
  }
  return n;
}

const SEEDERS = {
  threats: seedThreats,
  countermeasures: seedCountermeasures,
  deployments: seedDeployments,
  sensors: seedSensors,
  incidents: seedIncidents,
  zones: seedZones,
};

router.get('/sample-data/entities', verifyToken, requireRole('admin'), (req, res) => {
  res.json({
    entities: Object.keys(SEEDERS),
    framing: DEFENSIVE_CONTEXT,
  });
});

router.post('/sample-data/:entity', verifyToken, requireRole('admin'), async (req, res) => {
  const entity = req.params.entity;
  const seeder = SEEDERS[entity];
  if (!seeder) {
    return res.status(400).json({ error: 'Unknown entity', entity, allowed: Object.keys(SEEDERS) });
  }
  try {
    const inserted = await seeder();
    res.json({ inserted, entity });
  } catch (err) {
    res.status(500).json({ error: err.message, entity });
  }
});

module.exports = router;
