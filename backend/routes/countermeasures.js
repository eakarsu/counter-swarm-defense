const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, async (req, res) => {
  try {
    const { search, status, type } = req.query;
    let q = 'SELECT * FROM countermeasures WHERE 1=1';
    const p = [];
    if (search) { p.push(`%${search}%`); q += ` AND (name ILIKE $${p.length} OR location ILIKE $${p.length})`; }
    if (status) { p.push(status); q += ` AND status = $${p.length}`; }
    if (type) { p.push(type); q += ` AND type = $${p.length}`; }
    q += ' ORDER BY success_rate DESC';
    res.json((await pool.query(q, p)).rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', verifyToken, async (req, res) => {
  const r = await pool.query('SELECT * FROM countermeasures WHERE id=$1', [req.params.id]);
  if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(r.rows[0]);
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, type, status, range_m, ammo_count, success_rate, location } = req.body;
    const r = await pool.query('INSERT INTO countermeasures (name,type,status,range_m,ammo_count,success_rate,location) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *', [name,type,status,range_m,ammo_count,success_rate,location]);
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { name, type, status, range_m, ammo_count, success_rate, location } = req.body;
    const r = await pool.query('UPDATE countermeasures SET name=$1,type=$2,status=$3,range_m=$4,ammo_count=$5,success_rate=$6,location=$7 WHERE id=$8 RETURNING *', [name,type,status,range_m,ammo_count,success_rate,location,req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', verifyToken, async (req, res) => {
  await pool.query('DELETE FROM countermeasures WHERE id=$1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

module.exports = router;
