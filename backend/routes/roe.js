// ROE (Rules of Engagement) — rule catalog + per-engagement authorization workflow
//
// Endpoints:
//   GET    /api/roe/rules                              list rules (filters: zone, active)
//   GET    /api/roe/rules/:id                          single rule
//   POST   /api/roe/rules                              create rule
//   PUT    /api/roe/rules/:id                          update rule
//   DELETE /api/roe/rules/:id                          delete
//   POST   /api/roe/rules/:id/activate                 set active=true
//   POST   /api/roe/rules/:id/deactivate               set active=false
//   POST   /api/roe/evaluate                           evaluate threat+effector+zone -> compliant?
//   GET    /api/roe/authorizations                     list authorizations
//   POST   /api/roe/authorizations                     create authorization request
//   POST   /api/roe/authorizations/:id/decide          approve / deny / conditional

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireRole, verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/rules', async (req, res) => {
  try {
    const { zone, active } = req.query;
    let q = 'SELECT * FROM roe_rules WHERE 1=1';
    const p = [];
    if (zone) { p.push(zone); q += ` AND zone_name = $${p.length}`; }
    if (active !== undefined) { p.push(active === 'true'); q += ` AND active = $${p.length}`; }
    q += ' ORDER BY rule_code ASC';
    res.json((await pool.query(q, p)).rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/rules/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM roe_rules WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/rules', requireRole('admin', 'commander'), async (req, res) => {
  try {
    const b = req.body || {};
    const r = await pool.query(
      `INSERT INTO roe_rules (rule_code,zone_name,min_threat_level,authorized_effector_types,requires_visual_id,requires_command_approval,collateral_check_required,active,description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,true),$9) RETURNING *`,
      [b.rule_code, b.zone_name, b.min_threat_level, b.authorized_effector_types, !!b.requires_visual_id, !!b.requires_command_approval, !!b.collateral_check_required, b.active, b.description]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/rules/:id', requireRole('admin', 'commander'), async (req, res) => {
  try {
    const b = req.body || {};
    const r = await pool.query(
      `UPDATE roe_rules SET rule_code=$1,zone_name=$2,min_threat_level=$3,authorized_effector_types=$4,
        requires_visual_id=$5,requires_command_approval=$6,collateral_check_required=$7,active=$8,description=$9
       WHERE id=$10 RETURNING *`,
      [b.rule_code, b.zone_name, b.min_threat_level, b.authorized_effector_types, !!b.requires_visual_id, !!b.requires_command_approval, !!b.collateral_check_required, !!b.active, b.description, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/rules/:id', requireRole('admin', 'commander'), async (req, res) => {
  try {
    await pool.query('DELETE FROM roe_rules WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/rules/:id/activate', requireRole('admin', 'commander'), async (req, res) => {
  try {
    const r = await pool.query('UPDATE roe_rules SET active=true WHERE id=$1 RETURNING *', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/rules/:id/deactivate', requireRole('admin', 'commander'), async (req, res) => {
  try {
    const r = await pool.query('UPDATE roe_rules SET active=false WHERE id=$1 RETURNING *', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Evaluate: given zone, threat_level, effector_type, return compliance verdict.
router.post('/evaluate', async (req, res) => {
  try {
    const { zone_name, threat_level, effector_type, has_visual_id, command_approved, collateral_cleared } = req.body || {};
    if (!zone_name || threat_level == null || !effector_type) {
      return res.status(400).json({ error: 'zone_name, threat_level, effector_type required' });
    }
    const rules = (await pool.query(
      'SELECT * FROM roe_rules WHERE zone_name=$1 AND active=true ORDER BY id ASC',
      [zone_name]
    )).rows;
    if (!rules.length) return res.json({ verdict: 'no_rule_for_zone', zone_name, fallback: 'deny' });
    const checks = rules.map(rule => {
      const violations = [];
      const conditions = [];
      const auths = (rule.authorized_effector_types || '').split(',').map(s => s.trim());
      if (!auths.includes(effector_type)) violations.push(`Effector "${effector_type}" not in authorized list: ${rule.authorized_effector_types}`);
      if (Number(threat_level) < Number(rule.min_threat_level)) violations.push(`Threat level ${threat_level} below minimum ${rule.min_threat_level}`);
      if (rule.requires_visual_id && !has_visual_id) conditions.push('Visual ID required');
      if (rule.requires_command_approval && !command_approved) conditions.push('Command approval required');
      if (rule.collateral_check_required && !collateral_cleared) conditions.push('Collateral check required');
      let verdict = 'approved';
      if (violations.length) verdict = 'denied';
      else if (conditions.length) verdict = 'conditional';
      return { rule_id: rule.id, rule_code: rule.rule_code, verdict, violations, conditions };
    });
    const finalVerdict = checks.some(c => c.verdict === 'denied') ? 'denied'
      : checks.some(c => c.verdict === 'conditional') ? 'conditional' : 'approved';
    res.json({ verdict: finalVerdict, zone_name, rule_evaluations: checks });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/authorizations', async (req, res) => {
  try {
    const { engagement_id, decision } = req.query;
    let q = `SELECT a.*, r.rule_code, r.zone_name FROM roe_authorizations a LEFT JOIN roe_rules r ON r.id = a.rule_id WHERE 1=1`;
    const p = [];
    if (engagement_id) { p.push(engagement_id); q += ` AND a.engagement_id = $${p.length}`; }
    if (decision) { p.push(decision); q += ` AND a.decision = $${p.length}`; }
    q += ' ORDER BY a.id DESC';
    res.json((await pool.query(q, p)).rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/authorizations', async (req, res) => {
  try {
    const b = req.body || {};
    const r = await pool.query(
      `INSERT INTO roe_authorizations (engagement_id,rule_id,requested_by,decision,rationale)
       VALUES ($1,$2,$3,COALESCE($4,'pending'),$5) RETURNING *`,
      [b.engagement_id, b.rule_id, req.user.email, 'pending', b.rationale]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/authorizations/:id/decide', requireRole('admin', 'commander'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const b = req.body || {};
    if (!['approved', 'denied', 'conditional'].includes(b.decision)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'decision must be approved|denied|conditional' });
    }
    const r = await client.query(
      `UPDATE roe_authorizations SET decision=$1, approved_by=$2, decision_at=NOW(), conditions=$3, rationale=COALESCE($4,rationale)
       WHERE id=$5 AND decision='pending' AND requested_by<>$2 RETURNING *`,
      [b.decision, req.user.email, b.conditions, b.rationale, req.params.id]
    );
    if (!r.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Authorization is missing, already decided, or requires a second person' });
    }
    // If approved, flip engagement.cleared_to_engage=true
    if (b.decision === 'approved' && r.rows[0].engagement_id) {
      await client.query(
        `UPDATE engagements SET cleared_to_engage=true, authorizing_officer=$1 WHERE id=$2`,
        [req.user.email, r.rows[0].engagement_id]
      );
    }
    await client.query('COMMIT');
    res.json(r.rows[0]);
  } catch (err) { await client.query('ROLLBACK'); next(err); }
  finally { client.release(); }
});

module.exports = router;
