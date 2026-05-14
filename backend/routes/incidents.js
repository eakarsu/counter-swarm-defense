const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, async (req, res) => {
  try {
    const { search, severity } = req.query;
    let q = 'SELECT * FROM incidents WHERE 1=1';
    const p = [];
    if (search) { p.push(`%${search}%`); q += ` AND (title ILIKE $${p.length} OR description ILIKE $${p.length})`; }
    if (severity) { p.push(severity); q += ` AND severity = $${p.length}`; }
    q += ' ORDER BY occurred_at DESC';
    res.json((await pool.query(q, p)).rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', verifyToken, async (req, res) => {
  const r = await pool.query('SELECT * FROM incidents WHERE id=$1', [req.params.id]);
  if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(r.rows[0]);
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, severity, description, threat_id, response_time_s, drones_involved, casualties, damage_assessment, resolved, occurred_at } = req.body;
    const r = await pool.query('INSERT INTO incidents (title,severity,description,threat_id,response_time_s,drones_involved,casualties,damage_assessment,resolved,occurred_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *', [title,severity,description,threat_id,response_time_s,drones_involved,casualties,damage_assessment,resolved,occurred_at]);
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { title, severity, description, threat_id, response_time_s, drones_involved, casualties, damage_assessment, resolved, occurred_at } = req.body;
    const r = await pool.query('UPDATE incidents SET title=$1,severity=$2,description=$3,threat_id=$4,response_time_s=$5,drones_involved=$6,casualties=$7,damage_assessment=$8,resolved=$9,occurred_at=$10 WHERE id=$11 RETURNING *', [title,severity,description,threat_id,response_time_s,drones_involved,casualties,damage_assessment,resolved,occurred_at,req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', verifyToken, async (req, res) => {
  await pool.query('DELETE FROM incidents WHERE id=$1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

module.exports = router;
