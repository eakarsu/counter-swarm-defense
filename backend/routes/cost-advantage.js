// Cost-Advantage Calculator — deterministic exchange-ratio analyzer comparing
// defender cost-per-kill against attacker cost-per-drone. Apply pass 7 backlog item:
// addresses description.txt ("restore the cost advantage to defenders"). Pure compute
// over existing tables (countermeasures, effector_magazines, threat_signatures) and
// optional ad-hoc inputs. Advisory only.
//
// Endpoints:
//   POST  /api/cost-advantage/analyze       compute exchange ratio
//   GET   /api/cost-advantage/snapshot      portfolio snapshot from existing tables

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

async function safeRows(q, p) {
  try { return (await pool.query(q, p)).rows; } catch (_) { return []; }
}

router.post('/analyze', async (req, res) => {
  try {
    const b = req.body || {};
    const attacker_unit_cost = Number(b.attacker_unit_cost_usd) || 500;
    const attacker_count = Math.max(1, parseInt(b.attacker_count) || 1);
    const defender_unit_cost = Number(b.defender_unit_cost_usd) || 0;
    const defender_pk = Math.max(0.01, Math.min(1, Number(b.defender_pk) || 0.5));

    const expected_shots = Math.ceil(attacker_count / defender_pk);
    const defender_total = expected_shots * defender_unit_cost;
    const attacker_total = attacker_count * attacker_unit_cost;
    const exchange_ratio = attacker_total > 0 ? defender_total / attacker_total : null;
    const verdict = exchange_ratio == null ? 'undefined'
      : exchange_ratio <= 0.5 ? 'defender_strong_advantage'
      : exchange_ratio <= 1.0 ? 'defender_advantage'
      : exchange_ratio <= 3.0 ? 'parity'
      : exchange_ratio <= 10.0 ? 'attacker_advantage'
      : 'attacker_strong_advantage';

    const recommendations = [];
    if (exchange_ratio != null && exchange_ratio > 1.0) {
      recommendations.push('Defender exchange ratio > 1: consider non-kinetic effectors or high-capacity interceptors to reduce per-target cost.');
    }
    if (defender_pk < 0.7) {
      recommendations.push('Defender PK below 0.7 amplifies cost ratio — invest in fusion-track confirmation to reduce wasted shots.');
    }
    if (attacker_count >= 20 && defender_unit_cost > 50000) {
      recommendations.push('Mass-target scenario with expensive interceptors — evaluate magazine depth and salvo-capable platforms.');
    }

    res.json({
      advisory: true,
      requires_human_authorization: true,
      framing: 'Advisory cost analysis. Procurement and engagement decisions require human review.',
      input: { attacker_unit_cost_usd: attacker_unit_cost, attacker_count, defender_unit_cost_usd: defender_unit_cost, defender_pk },
      computed: {
        expected_shots_required: expected_shots,
        attacker_total_usd: attacker_total,
        defender_total_usd: defender_total,
        exchange_ratio: exchange_ratio == null ? null : Number(exchange_ratio.toFixed(3)),
        verdict,
      },
      recommendations,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/snapshot', async (_req, res) => {
  try {
    const cms = await safeRows('SELECT id, name, type, unit_cost_usd, success_rate FROM countermeasures WHERE unit_cost_usd IS NOT NULL', []);
    const mags = await safeRows('SELECT countermeasure_id, munition_type, unit_cost_usd, rounds_remaining FROM effector_magazines WHERE unit_cost_usd IS NOT NULL', []);
    const portfolio = cms.map(c => {
      const mag = mags.find(m => m.countermeasure_id === c.id);
      const eff_cost = mag ? Number(mag.unit_cost_usd) : Number(c.unit_cost_usd);
      const pk = Number(c.success_rate) || 0.5;
      const expected_cost_per_kill = pk > 0 ? Math.round(eff_cost / pk) : null;
      return {
        countermeasure_id: c.id,
        name: c.name,
        type: c.type,
        munition_type: mag ? mag.munition_type : null,
        unit_cost_usd: eff_cost,
        pk,
        expected_cost_per_kill_usd: expected_cost_per_kill,
        rounds_remaining: mag ? mag.rounds_remaining : null,
      };
    }).sort((a, b) => (a.expected_cost_per_kill_usd || 1e12) - (b.expected_cost_per_kill_usd || 1e12));

    const cheapest = portfolio[0] || null;
    const most_expensive = portfolio.length ? portfolio[portfolio.length - 1] : null;

    res.json({
      advisory: true,
      requires_human_authorization: true,
      framing: 'Portfolio snapshot for planning. Not an authorization to engage.',
      portfolio,
      summary: {
        platform_count: portfolio.length,
        cheapest_per_kill: cheapest,
        most_expensive_per_kill: most_expensive,
      },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
