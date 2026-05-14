const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, async (req, res) => {
  try {
    const { search, status, type } = req.query;
    let q = 'SELECT * FROM sensors WHERE 1=1';
    const p = [];
    if (search) { p.push(`%${search}%`); q += ` AND (name ILIKE $${p.length} OR location ILIKE $${p.length})`; }
    if (status) { p.push(status); q += ` AND status = $${p.length}`; }
    if (type) { p.push(type); q += ` AND type = $${p.length}`; }
    q += ' ORDER BY detections_today DESC';
    res.json((await pool.query(q, p)).rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', verifyToken, async (req, res) => {
  const r = await pool.query('SELECT * FROM sensors WHERE id=$1', [req.params.id]);
  if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(r.rows[0]);
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, type, location, status, range_km, battery_pct, firmware_version } = req.body;
    const r = await pool.query('INSERT INTO sensors (name,type,location,status,range_km,battery_pct,firmware_version) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *', [name,type,location,status,range_km,battery_pct,firmware_version]);
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { name, type, location, status, range_km, battery_pct, firmware_version } = req.body;
    const r = await pool.query('UPDATE sensors SET name=$1,type=$2,location=$3,status=$4,range_km=$5,battery_pct=$6,firmware_version=$7 WHERE id=$8 RETURNING *', [name,type,location,status,range_km,battery_pct,firmware_version,req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', verifyToken, async (req, res) => {
  await pool.query('DELETE FROM sensors WHERE id=$1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

module.exports = router;
