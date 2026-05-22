// Non-Kinetic Effectors Catalog — aerosols, entanglement streamers, foul-rotor agents,
// directed-energy soft-kill, etc. Apply pass 7 backlog item: addresses description.txt
// ("non-kinetic defenses that don't exist yet: aerosols that foul rotors, streamers that
// entangle swarms"). Advisory-only — no autonomous dispense.
//
// Endpoints:
//   GET    /api/non-kinetic-effectors            list (filter: mechanism, search)
//   GET    /api/non-kinetic-effectors/:id        single
//   POST   /api/non-kinetic-effectors            create
//   PUT    /api/non-kinetic-effectors/:id        update
//   DELETE /api/non-kinetic-effectors/:id        delete
//   POST   /api/non-kinetic-effectors/advise     pick effector(s) for a swarm + wind profile

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

let initialized = false;
async function ensureTable() {
  if (initialized) return;
  await pool.query(`CREATE TABLE IF NOT EXISTS non_kinetic_effectors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    vendor VARCHAR(160),
    mechanism VARCHAR(60),
    target_subsystem VARCHAR(80),
    effective_radius_m INTEGER,
    deploy_altitude_m INTEGER,
    persistence_s INTEGER,
    wind_max_mps DECIMAL,
    cost_per_use_usd DECIMAL,
    reusable BOOLEAN DEFAULT FALSE,
    collateral_risk VARCHAR(20),
    legal_class VARCHAR(60),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`);
  initialized = true;
}

router.get('/', async (req, res) => {
  try {
    await ensureTable();
    const { search, mechanism } = req.query;
    let q = 'SELECT * FROM non_kinetic_effectors WHERE 1=1';
    const p = [];
    if (search) { p.push(`%${search}%`); q += ` AND (name ILIKE $${p.length} OR vendor ILIKE $${p.length} OR target_subsystem ILIKE $${p.length})`; }
    if (mechanism) { p.push(mechanism); q += ` AND mechanism = $${p.length}`; }
    q += ' ORDER BY effective_radius_m DESC NULLS LAST, name ASC';
    res.json((await pool.query(q, p)).rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    await ensureTable();
    const r = await pool.query('SELECT * FROM non_kinetic_effectors WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    await ensureTable();
    const b = req.body || {};
    const r = await pool.query(
      `INSERT INTO non_kinetic_effectors (name,vendor,mechanism,target_subsystem,effective_radius_m,deploy_altitude_m,persistence_s,wind_max_mps,cost_per_use_usd,reusable,collateral_risk,legal_class,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [b.name, b.vendor, b.mechanism, b.target_subsystem, b.effective_radius_m, b.deploy_altitude_m, b.persistence_s, b.wind_max_mps, b.cost_per_use_usd, !!b.reusable, b.collateral_risk, b.legal_class, b.notes]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    await ensureTable();
    const b = req.body || {};
    const r = await pool.query(
      `UPDATE non_kinetic_effectors SET name=$1,vendor=$2,mechanism=$3,target_subsystem=$4,effective_radius_m=$5,deploy_altitude_m=$6,persistence_s=$7,wind_max_mps=$8,cost_per_use_usd=$9,reusable=$10,collateral_risk=$11,legal_class=$12,notes=$13 WHERE id=$14 RETURNING *`,
      [b.name, b.vendor, b.mechanism, b.target_subsystem, b.effective_radius_m, b.deploy_altitude_m, b.persistence_s, b.wind_max_mps, b.cost_per_use_usd, !!b.reusable, b.collateral_risk, b.legal_class, b.notes, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await ensureTable();
    await pool.query('DELETE FROM non_kinetic_effectors WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/advise', async (req, res) => {
  try {
    await ensureTable();
    const { swarm_size, altitude_m, wind_mps, max_collateral, target_subsystem } = req.body || {};
    const targets = Math.max(1, parseInt(swarm_size) || 1);
    const alt = Number(altitude_m) || 0;
    const wind = Number(wind_mps) || 0;
    const rows = (await pool.query('SELECT * FROM non_kinetic_effectors')).rows;
    const collateralRank = { none: 0, low: 1, medium: 2, high: 3 };
    const maxCol = collateralRank[max_collateral] != null ? collateralRank[max_collateral] : 3;

    const scored = rows.map(r => {
      const altOk = !alt || (r.deploy_altitude_m && Number(r.deploy_altitude_m) >= alt);
      const windOk = !wind || !r.wind_max_mps || Number(r.wind_max_mps) >= wind;
      const colOk = (collateralRank[r.collateral_risk] != null ? collateralRank[r.collateral_risk] : 3) <= maxCol;
      const subsystemOk = !target_subsystem || (r.target_subsystem && r.target_subsystem.toLowerCase().includes(String(target_subsystem).toLowerCase()));
      const radius = Number(r.effective_radius_m) || 0;
      // Rough swarm coverage estimate: dense swarm of N drones in a 50m cube
      const coverage_pct = Math.min(1, (radius * radius) / (60 * 60));
      const expected_affected = Math.round(targets * coverage_pct);
      const eligible = altOk && windOk && colOk && subsystemOk;
      let suitability = 0;
      if (eligible) {
        suitability += coverage_pct * 0.5;
        suitability += (Number(r.persistence_s) || 0) >= 30 ? 0.2 : 0.1;
        suitability += r.reusable ? 0.15 : 0.05;
        suitability += (Number(r.cost_per_use_usd) || 0) < 25000 ? 0.15 : 0.05;
      }
      return {
        effector_id: r.id,
        name: r.name,
        mechanism: r.mechanism,
        eligible,
        expected_affected,
        coverage_pct: Number(coverage_pct.toFixed(3)),
        cost_per_use_usd: r.cost_per_use_usd,
        suitability: Number(suitability.toFixed(3)),
        gating: { altOk, windOk, colOk, subsystemOk },
      };
    }).sort((a, b) => b.suitability - a.suitability);

    res.json({
      advisory: true,
      requires_human_authorization: true,
      framing: 'Decision-support only. Non-kinetic dispense must be human-authorized; ensure airspace deconfliction and legal review.',
      input: { swarm_size: targets, altitude_m: alt, wind_mps: wind, max_collateral: max_collateral || 'high', target_subsystem: target_subsystem || null },
      recommendations: scored.slice(0, 5),
      total_catalog: rows.length,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
