// High-Capacity Interceptors (HCI) — catalog of single-platform multi-drone effectors.
// Apply pass 7 backlog item: addresses description.txt mission ("a single platform that
// neutralizes fifty drones, not one"). Advisory-only — no autonomous fire control.
//
// Endpoints:
//   GET    /api/high-capacity-interceptors            list (filter: kinetic, search)
//   GET    /api/high-capacity-interceptors/:id        single platform
//   POST   /api/high-capacity-interceptors            create
//   PUT    /api/high-capacity-interceptors/:id        update
//   DELETE /api/high-capacity-interceptors/:id        delete
//   POST   /api/high-capacity-interceptors/advise     advisory engagement plan for swarm
//
// Lethal-decision items are advisory only with requires_human_authorization: true.

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

let initialized = false;
async function ensureTable() {
  if (initialized) return;
  await pool.query(`CREATE TABLE IF NOT EXISTS high_capacity_interceptors (
    id SERIAL PRIMARY KEY,
    platform_name VARCHAR(160) NOT NULL,
    vendor VARCHAR(160),
    interceptor_class VARCHAR(60),
    is_kinetic BOOLEAN DEFAULT TRUE,
    drones_per_salvo INTEGER DEFAULT 1,
    salvo_reload_s INTEGER DEFAULT 60,
    effective_range_m INTEGER,
    effective_altitude_m INTEGER,
    pk_per_target DECIMAL,
    cost_per_salvo_usd DECIMAL,
    magazine_capacity INTEGER,
    collateral_risk VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`);
  initialized = true;
}

router.get('/', async (req, res) => {
  try {
    await ensureTable();
    const { search, kinetic } = req.query;
    let q = 'SELECT * FROM high_capacity_interceptors WHERE 1=1';
    const p = [];
    if (search) { p.push(`%${search}%`); q += ` AND (platform_name ILIKE $${p.length} OR vendor ILIKE $${p.length} OR interceptor_class ILIKE $${p.length})`; }
    if (kinetic === 'true') q += ' AND is_kinetic = TRUE';
    if (kinetic === 'false') q += ' AND is_kinetic = FALSE';
    q += ' ORDER BY drones_per_salvo DESC, platform_name ASC';
    res.json((await pool.query(q, p)).rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    await ensureTable();
    const r = await pool.query('SELECT * FROM high_capacity_interceptors WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    await ensureTable();
    const b = req.body || {};
    const r = await pool.query(
      `INSERT INTO high_capacity_interceptors (platform_name,vendor,interceptor_class,is_kinetic,drones_per_salvo,salvo_reload_s,effective_range_m,effective_altitude_m,pk_per_target,cost_per_salvo_usd,magazine_capacity,collateral_risk,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [b.platform_name, b.vendor, b.interceptor_class, b.is_kinetic !== false, b.drones_per_salvo || 1, b.salvo_reload_s || 60, b.effective_range_m, b.effective_altitude_m, b.pk_per_target, b.cost_per_salvo_usd, b.magazine_capacity, b.collateral_risk, b.notes]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    await ensureTable();
    const b = req.body || {};
    const r = await pool.query(
      `UPDATE high_capacity_interceptors SET platform_name=$1,vendor=$2,interceptor_class=$3,is_kinetic=$4,drones_per_salvo=$5,salvo_reload_s=$6,effective_range_m=$7,effective_altitude_m=$8,pk_per_target=$9,cost_per_salvo_usd=$10,magazine_capacity=$11,collateral_risk=$12,notes=$13 WHERE id=$14 RETURNING *`,
      [b.platform_name, b.vendor, b.interceptor_class, b.is_kinetic !== false, b.drones_per_salvo, b.salvo_reload_s, b.effective_range_m, b.effective_altitude_m, b.pk_per_target, b.cost_per_salvo_usd, b.magazine_capacity, b.collateral_risk, b.notes, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await ensureTable();
    await pool.query('DELETE FROM high_capacity_interceptors WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Advisory: given an incoming swarm description, recommend HCI platforms and a salvo plan.
// Output is decision-support only; flagged requires_human_authorization.
router.post('/advise', async (req, res) => {
  try {
    await ensureTable();
    const { swarm_size, range_m, altitude_m, max_collateral } = req.body || {};
    const targets = Math.max(1, parseInt(swarm_size) || 1);
    const rng = Number(range_m) || 0;
    const alt = Number(altitude_m) || 0;
    const rows = (await pool.query('SELECT * FROM high_capacity_interceptors')).rows;

    const collateralRank = { none: 0, low: 1, medium: 2, high: 3 };
    const maxCol = collateralRank[max_collateral] != null ? collateralRank[max_collateral] : 3;

    const scored = rows.map(r => {
      const rangeOk = !rng || (r.effective_range_m && Number(r.effective_range_m) >= rng);
      const altOk = !alt || (r.effective_altitude_m && Number(r.effective_altitude_m) >= alt);
      const colOk = (collateralRank[r.collateral_risk] != null ? collateralRank[r.collateral_risk] : 3) <= maxCol;
      const dps = Math.max(1, Number(r.drones_per_salvo) || 1);
      const pk = Number(r.pk_per_target) || 0.5;
      const salvos_needed = Math.ceil(targets / dps);
      const expected_kills = Math.min(targets, Math.round(salvos_needed * dps * pk));
      const total_cost = (Number(r.cost_per_salvo_usd) || 0) * salvos_needed;
      const cost_per_expected_kill = expected_kills > 0 ? total_cost / expected_kills : null;
      const time_to_complete_s = salvos_needed > 0 ? (salvos_needed - 1) * (Number(r.salvo_reload_s) || 60) : 0;
      const eligible = rangeOk && altOk && colOk;
      let suitability = 0;
      if (eligible) {
        suitability += Math.min(1, dps / targets) * 0.4;
        suitability += pk * 0.3;
        suitability += (cost_per_expected_kill && cost_per_expected_kill < 50000) ? 0.2 : 0.05;
        suitability += (Number(r.magazine_capacity) || 0) >= salvos_needed ? 0.1 : 0;
      }
      return {
        interceptor_id: r.id,
        platform_name: r.platform_name,
        eligible,
        salvos_needed,
        expected_kills,
        total_cost_usd: total_cost,
        cost_per_expected_kill_usd: cost_per_expected_kill,
        time_to_complete_s,
        suitability: Number(suitability.toFixed(3)),
        gating: { rangeOk, altOk, colOk },
      };
    }).sort((a, b) => b.suitability - a.suitability);

    res.json({
      advisory: true,
      requires_human_authorization: true,
      framing: 'Decision-support only. No autonomous fire control. Human operator must authorize any engagement.',
      input: { swarm_size: targets, range_m: rng, altitude_m: alt, max_collateral: max_collateral || 'high' },
      recommendations: scored.slice(0, 5),
      total_catalog: rows.length,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
