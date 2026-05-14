const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, async (req, res) => {
  try {
    const { search } = req.query;
    let q = 'SELECT d.*, t.type as threat_type, t.zone_name, c.name as countermeasure_name FROM deployments d LEFT JOIN threats t ON d.threat_id=t.id LEFT JOIN countermeasures c ON d.countermeasure_id=c.id WHERE 1=1';
    const p = [];
    if (search) { p.push(`%${search}%`); q += ` AND (d.operator ILIKE $${p.length} OR t.zone_name ILIKE $${p.length})`; }
    q += ' ORDER BY d.deployed_at DESC';
    res.json((await pool.query(q, p)).rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', verifyToken, async (req, res) => {
  const r = await pool.query('SELECT * FROM deployments WHERE id=$1', [req.params.id]);
  if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(r.rows[0]);
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { threat_id, countermeasure_id, result, drones_neutralized, response_time_s, operator, notes } = req.body;
    const r = await pool.query('INSERT INTO deployments (threat_id,countermeasure_id,result,drones_neutralized,response_time_s,operator,notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *', [threat_id,countermeasure_id,result,drones_neutralized,response_time_s,operator,notes]);
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { threat_id, countermeasure_id, result, drones_neutralized, response_time_s, operator, notes } = req.body;
    const r = await pool.query('UPDATE deployments SET threat_id=$1,countermeasure_id=$2,result=$3,drones_neutralized=$4,response_time_s=$5,operator=$6,notes=$7 WHERE id=$8 RETURNING *', [threat_id,countermeasure_id,result,drones_neutralized,response_time_s,operator,notes,req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', verifyToken, async (req, res) => {
  await pool.query('DELETE FROM deployments WHERE id=$1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

module.exports = router;
