const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, async (req, res) => {
  try {
    const { search, status, type } = req.query;
    let q = 'SELECT * FROM threats WHERE 1=1';
    const p = [];
    if (search) { p.push(`%${search}%`); q += ` AND (zone_name ILIKE $${p.length} OR type ILIKE $${p.length})`; }
    if (status) { p.push(status); q += ` AND status = $${p.length}`; }
    if (type) { p.push(type); q += ` AND type = $${p.length}`; }
    q += ' ORDER BY detected_at DESC';
    res.json((await pool.query(q, p)).rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', verifyToken, async (req, res) => {
  const r = await pool.query('SELECT * FROM threats WHERE id=$1', [req.params.id]);
  if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(r.rows[0]);
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { type, drone_count, threat_level, lat, lng, altitude_m, speed_kmh, status, zone_name } = req.body;
    const r = await pool.query('INSERT INTO threats (type,drone_count,threat_level,lat,lng,altitude_m,speed_kmh,status,zone_name) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *', [type,drone_count,threat_level,lat,lng,altitude_m,speed_kmh,status,zone_name]);
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { type, drone_count, threat_level, lat, lng, altitude_m, speed_kmh, status, zone_name } = req.body;
    const r = await pool.query('UPDATE threats SET type=$1,drone_count=$2,threat_level=$3,lat=$4,lng=$5,altitude_m=$6,speed_kmh=$7,status=$8,zone_name=$9 WHERE id=$10 RETURNING *', [type,drone_count,threat_level,lat,lng,altitude_m,speed_kmh,status,zone_name,req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', verifyToken, async (req, res) => {
  await pool.query('DELETE FROM threats WHERE id=$1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

module.exports = router;
