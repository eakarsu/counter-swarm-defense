// Effector Magazines — per-effector ammo + cost-per-kill economics
//
// Endpoints:
//   GET    /api/effector-magazines                    list w/ countermeasure name
//   GET    /api/effector-magazines/:id                single
//   POST   /api/effector-magazines                    create
//   PUT    /api/effector-magazines/:id                update
//   DELETE /api/effector-magazines/:id                delete
//   POST   /api/effector-magazines/:id/fire           record fire event (rounds, hits)
//   POST   /api/effector-magazines/:id/resupply       resupply mag to capacity (or N)
//   GET    /api/effector-magazines/economics/summary  cost-per-kill across catalog
//   GET    /api/effector-magazines/economics/by-type  group by munition_type

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/economics/summary', async (_req, res) => {
  try {
    const rows = (await pool.query(
      `SELECT em.*, c.name AS countermeasure_name, c.type AS countermeasure_type
       FROM effector_magazines em LEFT JOIN countermeasures c ON c.id = em.countermeasure_id`
    )).rows;
    const enriched = rows.map(r => {
      const fired = Number(r.total_fired) || 0;
      const hits = Number(r.total_hits) || 0;
      const cost = Number(r.unit_cost_usd) || 0;
      const cpk = hits > 0 ? (fired * cost) / hits : null;
      return {
        magazine_id: r.id,
        countermeasure: r.countermeasure_name,
        countermeasure_type: r.countermeasure_type,
        munition_type: r.munition_type,
        unit_cost_usd: cost,
        total_fired: fired,
        total_hits: hits,
        hit_rate: fired > 0 ? Number((hits / fired).toFixed(3)) : null,
        cost_per_kill_usd: cpk != null ? Number(cpk.toFixed(2)) : null,
        rounds_remaining: r.rounds_remaining,
        rounds_capacity: r.rounds_capacity,
        magazine_fill_pct: r.rounds_capacity ? Number(((r.rounds_remaining / r.rounds_capacity) * 100).toFixed(1)) : null,
      };
    });
    const sorted = [...enriched].filter(e => e.cost_per_kill_usd != null).sort((a, b) => a.cost_per_kill_usd - b.cost_per_kill_usd);
    res.json({
      magazines: enriched,
      cheapest_per_kill: sorted.slice(0, 5),
      most_expensive: sorted.slice(-5).reverse(),
      total_inventory_value_usd: Number(enriched.reduce((s, e) => s + e.unit_cost_usd * e.rounds_remaining, 0).toFixed(2)),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/economics/by-type', async (_req, res) => {
  try {
    const rows = (await pool.query(
      `SELECT munition_type,
              SUM(total_fired) AS fired,
              SUM(total_hits) AS hits,
              SUM(rounds_remaining) AS remaining,
              AVG(unit_cost_usd) AS avg_cost
       FROM effector_magazines GROUP BY munition_type ORDER BY munition_type`
    )).rows;
    const out = rows.map(r => {
      const fired = Number(r.fired) || 0; const hits = Number(r.hits) || 0;
      const cpk = hits > 0 ? (fired * Number(r.avg_cost)) / hits : null;
      return {
        munition_type: r.munition_type,
        rounds_fired: fired,
        rounds_hit: hits,
        rounds_remaining: Number(r.remaining) || 0,
        avg_unit_cost_usd: Number(Number(r.avg_cost).toFixed(2)),
        hit_rate: fired ? Number((hits / fired).toFixed(3)) : null,
        cost_per_kill_usd: cpk != null ? Number(cpk.toFixed(2)) : null,
      };
    });
    res.json(out);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT em.*, c.name AS countermeasure_name, c.type AS countermeasure_type
       FROM effector_magazines em LEFT JOIN countermeasures c ON c.id = em.countermeasure_id
       ORDER BY em.id ASC`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT em.*, c.name AS countermeasure_name FROM effector_magazines em
       LEFT JOIN countermeasures c ON c.id = em.countermeasure_id WHERE em.id=$1`,
      [req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    const r = await pool.query(
      `INSERT INTO effector_magazines (countermeasure_id,munition_type,rounds_remaining,rounds_capacity,unit_cost_usd,resupply_lead_days,total_fired,total_hits,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [b.countermeasure_id, b.munition_type, b.rounds_remaining, b.rounds_capacity, b.unit_cost_usd, b.resupply_lead_days, b.total_fired || 0, b.total_hits || 0, b.notes]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const b = req.body || {};
    const r = await pool.query(
      `UPDATE effector_magazines SET munition_type=COALESCE($1,munition_type),
        rounds_remaining=COALESCE($2,rounds_remaining), rounds_capacity=COALESCE($3,rounds_capacity),
        unit_cost_usd=COALESCE($4,unit_cost_usd), resupply_lead_days=COALESCE($5,resupply_lead_days),
        notes=COALESCE($6,notes) WHERE id=$7 RETURNING *`,
      [b.munition_type, b.rounds_remaining, b.rounds_capacity, b.unit_cost_usd, b.resupply_lead_days, b.notes, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/fire', async (req, res) => {
  try {
    const rounds = parseInt(req.body?.rounds || 1, 10);
    const hits = parseInt(req.body?.hits || 0, 10);
    if (rounds < 1) return res.status(400).json({ error: 'rounds must be >= 1' });
    if (hits > rounds) return res.status(400).json({ error: 'hits cannot exceed rounds' });
    const cur = (await pool.query('SELECT * FROM effector_magazines WHERE id=$1', [req.params.id])).rows[0];
    if (!cur) return res.status(404).json({ error: 'Not found' });
    if (cur.rounds_remaining != null && rounds > cur.rounds_remaining) {
      return res.status(409).json({ error: `Only ${cur.rounds_remaining} rounds remaining` });
    }
    const r = await pool.query(
      `UPDATE effector_magazines SET rounds_remaining = rounds_remaining - $1,
        total_fired = total_fired + $1, total_hits = total_hits + $2 WHERE id=$3 RETURNING *`,
      [rounds, hits, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/resupply', async (req, res) => {
  try {
    const cur = (await pool.query('SELECT * FROM effector_magazines WHERE id=$1', [req.params.id])).rows[0];
    if (!cur) return res.status(404).json({ error: 'Not found' });
    const amount = req.body?.amount != null ? parseInt(req.body.amount, 10) : (cur.rounds_capacity - cur.rounds_remaining);
    const next = Math.min((cur.rounds_remaining || 0) + amount, cur.rounds_capacity || (cur.rounds_remaining + amount));
    const r = await pool.query(
      `UPDATE effector_magazines SET rounds_remaining=$1, last_resupply_at=NOW() WHERE id=$2 RETURNING *`,
      [next, req.params.id]
    );
    res.json({ magazine: r.rows[0], delivered: amount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM effector_magazines WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
