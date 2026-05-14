const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

const ALLOWED = {
  threats: 'SELECT id,type,drone_count,threat_level,lat,lng,altitude_m,speed_kmh,status,detected_at,neutralized_at,zone_name FROM threats ORDER BY detected_at DESC',
  countermeasures: 'SELECT id,name,type,status,range_m,ammo_count,success_rate,location,last_deployed_at,total_deployments FROM countermeasures ORDER BY id',
  deployments: 'SELECT id,threat_id,countermeasure_id,deployed_at,result,drones_neutralized,response_time_s,operator,notes FROM deployments ORDER BY deployed_at DESC',
  sensors: 'SELECT id,name,type,location,status,range_km,last_detection_at,battery_pct,detections_today,firmware_version FROM sensors ORDER BY id',
  incidents: 'SELECT id,title,severity,description,threat_id,response_time_s,drones_involved,casualties,damage_assessment,resolved,occurred_at,resolved_at FROM incidents ORDER BY occurred_at DESC NULLS LAST',
  zones: 'SELECT id,name,zone_type,security_level,active_sensors,active_countermeasures,status,area_km2,last_incident_at,threat_count_30d FROM defense_zones ORDER BY id',
};

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'string' ? v : (v instanceof Date ? v.toISOString() : String(v));
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

router.get('/:entity', verifyToken, async (req, res) => {
  try {
    const sql = ALLOWED[req.params.entity];
    if (!sql) return res.status(400).json({ error: 'Unknown entity' });
    const r = await pool.query(sql);
    const rows = r.rows;
    const cols = rows.length ? Object.keys(rows[0]) : [];
    const lines = [cols.join(',')];
    for (const row of rows) lines.push(cols.map(c => csvEscape(row[c])).join(','));
    const csv = lines.join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.entity}.csv"`);
    res.send(csv);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/', verifyToken, (_req, res) => {
  res.json({ entities: Object.keys(ALLOWED) });
});

module.exports = router;
