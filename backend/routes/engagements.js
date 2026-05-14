// Engagements — DITDEA kill-chain state machine
//   Phases: detect -> identify -> track -> decide -> engage -> assess
//
// Endpoints:
//   GET    /api/engagements                       list (filters: phase, outcome, cleared)
//   GET    /api/engagements/:id                   single + event log
//   POST   /api/engagements                       open new engagement (starts at 'detect')
//   POST   /api/engagements/:id/advance           advance to next phase (logs event)
//   POST   /api/engagements/:id/event             append arbitrary event
//   POST   /api/engagements/:id/clear             flip cleared_to_engage=true (records officer)
//   POST   /api/engagements/:id/close             record outcome and close
//   POST   /api/engagements/:id/abort             abort engagement
//   DELETE /api/engagements/:id
//   GET    /api/engagements/metrics/kill-chain    cycle-time analytics per phase

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

const PHASE_ORDER = ['detect', 'identify', 'track', 'decide', 'engage', 'assess'];

function nextPhase(cur) {
  const idx = PHASE_ORDER.indexOf(cur);
  return idx >= 0 && idx < PHASE_ORDER.length - 1 ? PHASE_ORDER[idx + 1] : cur;
}

router.get('/metrics/kill-chain', async (_req, res) => {
  try {
    const rows = (await pool.query(
      `SELECT engagement_id, phase, MIN(occurred_at) AS first_at FROM engagement_events GROUP BY engagement_id, phase`
    )).rows;
    const byEng = {};
    for (const r of rows) {
      byEng[r.engagement_id] = byEng[r.engagement_id] || {};
      byEng[r.engagement_id][r.phase] = new Date(r.first_at).getTime();
    }
    const transitions = { 'detect->identify': [], 'identify->track': [], 'track->decide': [], 'decide->engage': [], 'engage->assess': [] };
    for (const eid of Object.keys(byEng)) {
      const p = byEng[eid];
      for (let i = 0; i < PHASE_ORDER.length - 1; i++) {
        const a = PHASE_ORDER[i]; const b = PHASE_ORDER[i + 1];
        if (p[a] && p[b]) transitions[`${a}->${b}`].push((p[b] - p[a]) / 1000);
      }
    }
    const result = {};
    for (const k of Object.keys(transitions)) {
      const arr = transitions[k];
      if (!arr.length) { result[k] = { samples: 0 }; continue; }
      arr.sort((a, b) => a - b);
      const mean = arr.reduce((s, x) => s + x, 0) / arr.length;
      const p50 = arr[Math.floor(arr.length * 0.5)];
      const p95 = arr[Math.floor(arr.length * 0.95)] ?? arr[arr.length - 1];
      result[k] = { samples: arr.length, mean_s: Number(mean.toFixed(2)), p50_s: Number(p50.toFixed(2)), p95_s: Number(p95.toFixed(2)) };
    }
    res.json({ phase_transitions: result, total_engagements: Object.keys(byEng).length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/', async (req, res) => {
  try {
    const { phase, outcome, cleared } = req.query;
    let q = `SELECT e.*, t.track_uid, c.name AS countermeasure_name FROM engagements e
             LEFT JOIN fusion_tracks t ON t.id = e.track_id
             LEFT JOIN countermeasures c ON c.id = e.countermeasure_id WHERE 1=1`;
    const p = [];
    if (phase) { p.push(phase); q += ` AND current_phase = $${p.length}`; }
    if (outcome) { p.push(outcome); q += ` AND outcome = $${p.length}`; }
    if (cleared !== undefined) { p.push(cleared === 'true'); q += ` AND cleared_to_engage = $${p.length}`; }
    q += ' ORDER BY started_at DESC';
    res.json((await pool.query(q, p)).rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const eng = (await pool.query(
      `SELECT e.*, t.track_uid, c.name AS countermeasure_name FROM engagements e
       LEFT JOIN fusion_tracks t ON t.id = e.track_id
       LEFT JOIN countermeasures c ON c.id = e.countermeasure_id WHERE e.id=$1`,
      [req.params.id]
    )).rows[0];
    if (!eng) return res.status(404).json({ error: 'Not found' });
    const events = (await pool.query(
      'SELECT * FROM engagement_events WHERE engagement_id=$1 ORDER BY occurred_at ASC, id ASC',
      [req.params.id]
    )).rows;
    res.json({ ...eng, events });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    const uid = b.engagement_uid || `ENG-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const r = await pool.query(
      `INSERT INTO engagements (engagement_uid,track_id,threat_id,countermeasure_id,current_phase,roe_rule_id,pk_estimate,expected_cost_usd,drones_engaged,notes)
       VALUES ($1,$2,$3,$4,'detect',$5,$6,$7,$8,$9) RETURNING *`,
      [uid, b.track_id, b.threat_id, b.countermeasure_id, b.roe_rule_id, b.pk_estimate, b.expected_cost_usd, b.drones_engaged || 0, b.notes]
    );
    const eng = r.rows[0];
    await pool.query(
      `INSERT INTO engagement_events (engagement_id, phase, actor, event_type, detail) VALUES ($1,'detect',$2,'engagement-opened',$3)`,
      [eng.id, req.user?.email || 'system', b.notes || 'New engagement opened']
    );
    res.status(201).json(eng);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/advance', async (req, res) => {
  try {
    const cur = (await pool.query('SELECT * FROM engagements WHERE id=$1', [req.params.id])).rows[0];
    if (!cur) return res.status(404).json({ error: 'Not found' });
    const np = nextPhase(cur.current_phase);
    if (np === cur.current_phase) return res.status(400).json({ error: 'Already at terminal phase' });
    if (np === 'engage' && !cur.cleared_to_engage) {
      return res.status(403).json({ error: 'Cannot advance to engage: engagement not cleared (call /clear first)' });
    }
    const r = await pool.query(
      'UPDATE engagements SET current_phase=$1 WHERE id=$2 RETURNING *',
      [np, req.params.id]
    );
    await pool.query(
      `INSERT INTO engagement_events (engagement_id, phase, actor, event_type, detail) VALUES ($1,$2,$3,'phase-advanced',$4)`,
      [req.params.id, np, req.user?.email || 'system', req.body?.detail || `Advanced from ${cur.current_phase} to ${np}`]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/event', async (req, res) => {
  try {
    const b = req.body || {};
    const r = await pool.query(
      `INSERT INTO engagement_events (engagement_id, phase, actor, event_type, detail) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.id, b.phase, b.actor || req.user?.email, b.event_type, b.detail]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/clear', async (req, res) => {
  try {
    const officer = req.body?.officer || req.user?.email || 'unknown';
    const r = await pool.query(
      'UPDATE engagements SET cleared_to_engage=true, authorizing_officer=$1 WHERE id=$2 RETURNING *',
      [officer, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    await pool.query(
      `INSERT INTO engagement_events (engagement_id, phase, actor, event_type, detail) VALUES ($1,$2,$3,'cleared-to-engage',$4)`,
      [req.params.id, r.rows[0].current_phase, officer, req.body?.rationale || 'Engagement authorized']
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/close', async (req, res) => {
  try {
    const b = req.body || {};
    const r = await pool.query(
      `UPDATE engagements SET current_phase='assess', outcome=$1, drones_killed=$2, closed_at=NOW() WHERE id=$3 RETURNING *`,
      [b.outcome || 'neutralized', b.drones_killed || 0, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    await pool.query(
      `INSERT INTO engagement_events (engagement_id, phase, actor, event_type, detail) VALUES ($1,'assess',$2,'engagement-closed',$3)`,
      [req.params.id, req.user?.email || 'system', `Outcome=${b.outcome}; killed=${b.drones_killed || 0}`]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/abort', async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE engagements SET outcome='aborted', closed_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    await pool.query(
      `INSERT INTO engagement_events (engagement_id, phase, actor, event_type, detail) VALUES ($1,$2,$3,'aborted',$4)`,
      [req.params.id, r.rows[0].current_phase, req.user?.email, req.body?.reason || 'Aborted']
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM engagements WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
