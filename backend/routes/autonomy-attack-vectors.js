// Autonomy-Stack Attack Vectors — catalog of advisory defensive tactics that exploit
// or detect adversary drone autonomy weaknesses (GPS spoof detection, visual-nav
// disruption sensing, model-poisoning indicators, etc.). Apply pass 7 backlog item:
// addresses description.txt ("new attacks on the autonomy stack itself now that radio
// jamming is becoming obsolete"). Advisory-only — defensive framing.
//
// Endpoints:
//   GET    /api/autonomy-attack-vectors             list
//   GET    /api/autonomy-attack-vectors/:id         single
//   POST   /api/autonomy-attack-vectors             create
//   PUT    /api/autonomy-attack-vectors/:id         update
//   DELETE /api/autonomy-attack-vectors/:id         delete
//   POST   /api/autonomy-attack-vectors/assess      advisory: which vectors apply to a profile

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

let initialized = false;
async function ensureTable() {
  if (initialized) return;
  await pool.query(`CREATE TABLE IF NOT EXISTS autonomy_attack_vectors (
    id SERIAL PRIMARY KEY,
    vector_code VARCHAR(60) UNIQUE NOT NULL,
    name VARCHAR(160) NOT NULL,
    stack_layer VARCHAR(60),
    targets_autonomy_level VARCHAR(80),
    detection_cue TEXT,
    mitigation TEXT,
    operator_complexity VARCHAR(20),
    legal_class VARCHAR(60),
    effectiveness_vs_jam_resistant DECIMAL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`);
  initialized = true;
}

router.get('/', async (req, res) => {
  try {
    await ensureTable();
    const { search, stack_layer } = req.query;
    let q = 'SELECT * FROM autonomy_attack_vectors WHERE 1=1';
    const p = [];
    if (search) { p.push(`%${search}%`); q += ` AND (name ILIKE $${p.length} OR vector_code ILIKE $${p.length} OR stack_layer ILIKE $${p.length})`; }
    if (stack_layer) { p.push(stack_layer); q += ` AND stack_layer = $${p.length}`; }
    q += ' ORDER BY effectiveness_vs_jam_resistant DESC NULLS LAST, name ASC';
    res.json((await pool.query(q, p)).rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    await ensureTable();
    const r = await pool.query('SELECT * FROM autonomy_attack_vectors WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    await ensureTable();
    const b = req.body || {};
    const r = await pool.query(
      `INSERT INTO autonomy_attack_vectors (vector_code,name,stack_layer,targets_autonomy_level,detection_cue,mitigation,operator_complexity,legal_class,effectiveness_vs_jam_resistant,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [b.vector_code, b.name, b.stack_layer, b.targets_autonomy_level, b.detection_cue, b.mitigation, b.operator_complexity, b.legal_class, b.effectiveness_vs_jam_resistant, b.notes]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    await ensureTable();
    const b = req.body || {};
    const r = await pool.query(
      `UPDATE autonomy_attack_vectors SET vector_code=$1,name=$2,stack_layer=$3,targets_autonomy_level=$4,detection_cue=$5,mitigation=$6,operator_complexity=$7,legal_class=$8,effectiveness_vs_jam_resistant=$9,notes=$10 WHERE id=$11 RETURNING *`,
      [b.vector_code, b.name, b.stack_layer, b.targets_autonomy_level, b.detection_cue, b.mitigation, b.operator_complexity, b.legal_class, b.effectiveness_vs_jam_resistant, b.notes, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await ensureTable();
    await pool.query('DELETE FROM autonomy_attack_vectors WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/assess', async (req, res) => {
  try {
    await ensureTable();
    const { autonomy_level, jam_resistance, stack_layers } = req.body || {};
    const layers = Array.isArray(stack_layers) ? stack_layers.map(s => String(s).toLowerCase()) : [];
    const rows = (await pool.query('SELECT * FROM autonomy_attack_vectors')).rows;

    const scored = rows.map(r => {
      let score = 0;
      const reasons = [];
      if (autonomy_level && r.targets_autonomy_level && r.targets_autonomy_level.toLowerCase().includes(String(autonomy_level).toLowerCase())) {
        score += 0.4; reasons.push(`targets autonomy: ${r.targets_autonomy_level}`);
      }
      if (jam_resistance === 'high' && r.effectiveness_vs_jam_resistant != null) {
        score += Number(r.effectiveness_vs_jam_resistant) * 0.4;
        reasons.push(`effectiveness vs jam-resistant ${Number(r.effectiveness_vs_jam_resistant).toFixed(2)}`);
      }
      if (layers.length && r.stack_layer && layers.includes(r.stack_layer.toLowerCase())) {
        score += 0.2; reasons.push(`layer match: ${r.stack_layer}`);
      }
      return {
        vector_id: r.id,
        vector_code: r.vector_code,
        name: r.name,
        stack_layer: r.stack_layer,
        applicability: Number(Math.min(score, 1).toFixed(3)),
        detection_cue: r.detection_cue,
        mitigation: r.mitigation,
        reasons,
      };
    }).filter(v => v.applicability > 0).sort((a, b) => b.applicability - a.applicability);

    res.json({
      advisory: true,
      requires_human_authorization: true,
      framing: 'Defensive advisory only. Vectors marked here are awareness/detection cues — not offensive playbooks. Counter-autonomy actions require legal review and human authorization.',
      input: { autonomy_level: autonomy_level || null, jam_resistance: jam_resistance || null, stack_layers: layers },
      vectors: scored.slice(0, 10),
      total_catalog: rows.length,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
