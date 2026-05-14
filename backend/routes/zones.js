const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, async (req, res) => {
  try {
    const { search, status } = req.query;
    let q = 'SELECT * FROM defense_zones WHERE 1=1';
    const p = [];
    if (search) { p.push(`%${search}%`); q += ` AND (name ILIKE $${p.length} OR zone_type ILIKE $${p.length})`; }
    if (status) { p.push(status); q += ` AND status = $${p.length}`; }
    q += ' ORDER BY threat_count_30d DESC';
    res.json((await pool.query(q, p)).rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', verifyToken, async (req, res) => {
  const r = await pool.query('SELECT * FROM defense_zones WHERE id=$1', [req.params.id]);
  if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(r.rows[0]);
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, zone_type, security_level, active_sensors, active_countermeasures, status, area_km2 } = req.body;
    const r = await pool.query('INSERT INTO defense_zones (name,zone_type,security_level,active_sensors,active_countermeasures,status,area_km2) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *', [name,zone_type,security_level,active_sensors,active_countermeasures,status,area_km2]);
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { name, zone_type, security_level, active_sensors, active_countermeasures, status, area_km2 } = req.body;
    const r = await pool.query('UPDATE defense_zones SET name=$1,zone_type=$2,security_level=$3,active_sensors=$4,active_countermeasures=$5,status=$6,area_km2=$7 WHERE id=$8 RETURNING *', [name,zone_type,security_level,active_sensors,active_countermeasures,status,area_km2,req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', verifyToken, async (req, res) => {
  await pool.query('DELETE FROM defense_zones WHERE id=$1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

module.exports = router;
