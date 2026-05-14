const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

let initialized = false;
async function ensureTable() {
  if (initialized) return;
  await pool.query(`CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    actor_email VARCHAR(255),
    action VARCHAR(100),
    entity_type VARCHAR(50),
    entity_id VARCHAR(50),
    details TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`);
  initialized = true;
}

router.get('/', verifyToken, async (req, res) => {
  try {
    await ensureTable();
    const { search, action, entity_type, limit } = req.query;
    let q = 'SELECT * FROM audit_log WHERE 1=1';
    const p = [];
    if (search) { p.push(`%${search}%`); q += ` AND (actor_email ILIKE $${p.length} OR details ILIKE $${p.length} OR entity_type ILIKE $${p.length})`; }
    if (action) { p.push(action); q += ` AND action = $${p.length}`; }
    if (entity_type) { p.push(entity_type); q += ` AND entity_type = $${p.length}`; }
    q += ' ORDER BY created_at DESC';
    const lim = Math.min(parseInt(limit) || 200, 1000);
    p.push(lim);
    q += ` LIMIT $${p.length}`;
    res.json((await pool.query(q, p)).rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    await ensureTable();
    const { action, entity_type, entity_id, details } = req.body;
    const r = await pool.query(
      'INSERT INTO audit_log (actor_email, action, entity_type, entity_id, details) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.user?.email || 'unknown', action, entity_type, entity_id != null ? String(entity_id) : null, details]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await ensureTable();
    await pool.query('DELETE FROM audit_log WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
