const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

// Cross-entity search + filter. Returns up to 25 results per entity matching `q`.
router.get('/', verifyToken, async (req, res) => {
  try {
    const { q, status, type, entity } = req.query;
    if (!q || q.trim().length < 1) return res.json({ results: {} });
    const like = `%${q}%`;
    const out = {};

    async function run(name, sql, params) {
      if (entity && entity !== name) return;
      try { out[name] = (await pool.query(sql, params)).rows; }
      catch { out[name] = []; }
    }

    let p = 1;
    const threatParts = ['(zone_name ILIKE $1 OR type ILIKE $1 OR status ILIKE $1)'];
    const threatVals = [like];
    if (status) { p++; threatParts.push(`status = $${p}`); threatVals.push(status); }
    if (type) { p++; threatParts.push(`type = $${p}`); threatVals.push(type); }
    await run('threats', `SELECT id, type, status, zone_name, threat_level, drone_count, detected_at FROM threats WHERE ${threatParts.join(' AND ')} ORDER BY detected_at DESC LIMIT 25`, threatVals);

    await run('countermeasures', 'SELECT id, name, type, status, location FROM countermeasures WHERE name ILIKE $1 OR type ILIKE $1 OR location ILIKE $1 ORDER BY id LIMIT 25', [like]);
    await run('sensors', 'SELECT id, name, type, status, location FROM sensors WHERE name ILIKE $1 OR type ILIKE $1 OR location ILIKE $1 ORDER BY id LIMIT 25', [like]);
    await run('incidents', 'SELECT id, title, severity, resolved, occurred_at FROM incidents WHERE title ILIKE $1 OR description ILIKE $1 OR severity ILIKE $1 ORDER BY occurred_at DESC NULLS LAST LIMIT 25', [like]);
    await run('zones', 'SELECT id, name, zone_type, security_level, status FROM defense_zones WHERE name ILIKE $1 OR zone_type ILIKE $1 ORDER BY id LIMIT 25', [like]);

    res.json({ results: out });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
