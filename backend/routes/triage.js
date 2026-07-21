const crypto = require('node:crypto');
const express = require('express');
const { z } = require('zod');
const pool = require('../db');
const { requireRole, verifyToken } = require('../middleware/auth');
const { appendAudit, stable } = require('../services/audit');

const router = express.Router();
router.use(verifyToken);

const assignmentSchema = z.object({ owner_user_id: z.number().int().positive() }).strict();
const escalationSchema = z.object({ reason: z.string().min(5).max(1000) }).strict();
const resolutionSchema = z.object({
  disposition: z.enum(['confirmed', 'false_positive', 'benign', 'duplicate']),
  notes: z.string().min(5).max(4000),
}).strict();
const suppressionSchema = z.object({
  event_type: z.enum(['rf_detection', 'radar_track', 'eo_ir_detection', 'acoustic_detection', 'sensor_health']).nullable().optional(),
  sensor_uid: z.string().min(2).max(100).regex(/^[A-Za-z0-9_.:-]+$/).nullable().optional(),
  reason: z.string().min(10).max(2000),
  expires_at: z.string().datetime({ offset: true }),
}).strict();
const reviewSchema = z.object({ decision: z.enum(['approved', 'rejected']), notes: z.string().max(1000).optional() }).strict();
const evaluationSchema = z.object({
  name: z.string().min(3).max(160),
  samples: z.array(z.object({
    id: z.string().min(1).max(100), actual: z.boolean(), predicted: z.boolean(), adversarial: z.boolean().default(false),
  }).strict()).min(4).max(10000),
}).strict();

function isSupervisor(user) { return ['admin', 'supervisor'].includes(user.role); }

async function loadCase(client, tenantId, caseId, lock = false) {
  return (await client.query(
    `SELECT c.*,d.status AS detection_status,d.severity,d.risk_score,d.title,d.summary
     FROM triage_cases c JOIN detections d ON d.id=c.detection_id
     WHERE c.id=$1 AND c.tenant_id=$2${lock ? ' FOR UPDATE OF c' : ''}`,
    [caseId, tenantId],
  )).rows[0];
}

async function caseEvent(client, req, caseId, eventType, detail) {
  await client.query(
    'INSERT INTO case_events(tenant_id,case_id,actor_user_id,event_type,detail) VALUES ($1,$2,$3,$4,$5)',
    [req.user.tenant_id, caseId, req.user.id, eventType, detail],
  );
  await appendAudit(client, {
    tenantId: req.user.tenant_id, actorUserId: req.user.id, actorLabel: req.user.email,
    action: `triage.case.${eventType}`, entityType: 'triage_case', entityId: caseId, details: detail,
  });
}

router.get('/detections', async (req, res, next) => {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 500);
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : null;
    const result = await pool.query(
      `SELECT d.*,p.policy_uid,p.version AS policy_version,c.id AS case_id,c.status AS case_status,c.owner_user_id,c.escalation_level,c.sla_due_at
       FROM detections d JOIN detection_policies p ON p.id=d.policy_id
       LEFT JOIN triage_cases c ON c.detection_id=d.id
       WHERE d.tenant_id=$1 AND ($2::text IS NULL OR d.status=$2)
       ORDER BY d.last_seen_at DESC,d.id DESC LIMIT $3`,
      [req.user.tenant_id, status, limit],
    );
    return res.json(result.rows);
  } catch (error) { return next(error); }
});

router.get('/cases', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT c.*,d.severity,d.risk_score,d.title,d.summary,d.occurrence_count,d.last_seen_at,u.name AS owner_name,u.email AS owner_email
       FROM triage_cases c JOIN detections d ON d.id=c.detection_id LEFT JOIN users u ON u.id=c.owner_user_id
       WHERE c.tenant_id=$1 ORDER BY (c.status<>'resolved') DESC,c.sla_due_at ASC,c.id DESC LIMIT 500`,
      [req.user.tenant_id],
    );
    return res.json(result.rows);
  } catch (error) { return next(error); }
});

router.get('/cases/:id', async (req, res, next) => {
  try {
    const item = await loadCase(pool, req.user.tenant_id, req.params.id);
    if (!item) return res.status(404).json({ error: 'Case not found' });
    const [evidence, events] = await Promise.all([
      pool.query(
        `SELECT e.id,e.external_event_id,e.event_type,e.sensor_uid,e.observed_at,e.received_at,e.normalized,e.integrity_status,e.raw_sha256,de.evidence_role
         FROM detection_evidence de JOIN telemetry_events e ON e.id=de.telemetry_event_id
         WHERE de.detection_id=$1 AND e.tenant_id=$2 ORDER BY e.observed_at`,
        [item.detection_id, req.user.tenant_id],
      ),
      pool.query(
        `SELECT ce.*,u.email AS actor_email FROM case_events ce JOIN users u ON u.id=ce.actor_user_id
         WHERE ce.case_id=$1 AND ce.tenant_id=$2 ORDER BY ce.id`,
        [item.id, req.user.tenant_id],
      ),
    ]);
    return res.json({ ...item, evidence: evidence.rows, events: events.rows });
  } catch (error) { return next(error); }
});

router.post('/cases/:id/assign', requireRole('admin', 'supervisor', 'analyst'), async (req, res, next) => {
  const parsed = assignmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'A valid owner_user_id is required' });
  if (!isSupervisor(req.user) && parsed.data.owner_user_id !== Number(req.user.id)) return res.status(403).json({ error: 'Analysts may only claim cases for themselves' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const item = await loadCase(client, req.user.tenant_id, req.params.id, true);
    if (!item) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Case not found' }); }
    if (item.status === 'resolved') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Resolved cases cannot be reassigned' }); }
    const owner = (await client.query(
      `SELECT id,email FROM users WHERE id=$1 AND tenant_id=$2 AND active=true AND role IN ('analyst','supervisor','admin')`,
      [parsed.data.owner_user_id, req.user.tenant_id],
    )).rows[0];
    if (!owner) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Owner is not an active analyst in this tenant' }); }
    const updated = (await client.query(
      `UPDATE triage_cases SET owner_user_id=$1,status=CASE WHEN status='unassigned' THEN 'investigating' ELSE status END,updated_at=NOW()
       WHERE id=$2 RETURNING *`,
      [owner.id, item.id],
    )).rows[0];
    await client.query("UPDATE detections SET status='open' WHERE id=$1 AND status='triage'", [item.detection_id]);
    await caseEvent(client, req, item.id, 'assigned', { ownerUserId: owner.id, ownerEmail: owner.email });
    await client.query('COMMIT');
    return res.json(updated);
  } catch (error) { await client.query('ROLLBACK'); return next(error); } finally { client.release(); }
});

router.post('/cases/:id/escalate', requireRole('admin', 'supervisor', 'analyst'), async (req, res, next) => {
  const parsed = escalationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'An escalation reason is required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const item = await loadCase(client, req.user.tenant_id, req.params.id, true);
    if (!item) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Case not found' }); }
    if (!isSupervisor(req.user) && Number(item.owner_user_id) !== Number(req.user.id)) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Only the case owner or a supervisor may escalate' }); }
    if (item.status === 'resolved' || item.escalation_level >= 5) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Case cannot be escalated further' }); }
    const updated = (await client.query(
      "UPDATE triage_cases SET status='escalated',escalation_level=escalation_level+1,updated_at=NOW() WHERE id=$1 RETURNING *",
      [item.id],
    )).rows[0];
    await caseEvent(client, req, item.id, 'escalated', { level: updated.escalation_level, reason: parsed.data.reason });
    await client.query('COMMIT');
    return res.json(updated);
  } catch (error) { await client.query('ROLLBACK'); return next(error); } finally { client.release(); }
});

router.post('/cases/:id/resolve', requireRole('admin', 'supervisor', 'analyst'), async (req, res, next) => {
  const parsed = resolutionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'A valid disposition and notes are required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const item = await loadCase(client, req.user.tenant_id, req.params.id, true);
    if (!item) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Case not found' }); }
    if (!isSupervisor(req.user) && Number(item.owner_user_id) !== Number(req.user.id)) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Only the case owner or a supervisor may resolve' }); }
    if (item.status === 'resolved') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Case is already resolved' }); }
    const updated = (await client.query(
      `UPDATE triage_cases SET status='resolved',disposition=$1,resolution_notes=$2,resolved_at=NOW(),updated_at=NOW()
       WHERE id=$3 RETURNING *`,
      [parsed.data.disposition, parsed.data.notes, item.id],
    )).rows[0];
    await client.query(
      `UPDATE detections SET status=$1 WHERE id=$2`,
      [parsed.data.disposition === 'false_positive' ? 'false_positive' : 'closed', item.detection_id],
    );
    await caseEvent(client, req, item.id, 'resolved', parsed.data);
    await client.query('COMMIT');
    return res.json(updated);
  } catch (error) { await client.query('ROLLBACK'); return next(error); } finally { client.release(); }
});

router.get('/suppressions', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT s.*,requester.email AS requested_by_email,reviewer.email AS reviewed_by_email
       FROM suppressions s JOIN users requester ON requester.id=s.requested_by LEFT JOIN users reviewer ON reviewer.id=s.reviewed_by
       WHERE s.tenant_id=$1 ORDER BY s.id DESC LIMIT 500`,
      [req.user.tenant_id],
    );
    return res.json(result.rows);
  } catch (error) { return next(error); }
});

router.post('/suppressions', requireRole('admin', 'supervisor', 'analyst'), async (req, res, next) => {
  const parsed = suppressionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid suppression request', details: parsed.error.flatten() });
  const expires = new Date(parsed.data.expires_at);
  if (expires <= new Date() || expires.getTime() > Date.now() + 30 * 86400000) return res.status(400).json({ error: 'Suppression expiry must be within the next 30 days' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO suppressions(tenant_id,event_type,sensor_uid,reason,requested_by,expires_at)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.tenant_id, parsed.data.event_type || null, parsed.data.sensor_uid || null, parsed.data.reason, req.user.id, expires],
    );
    await appendAudit(client, {
      tenantId: req.user.tenant_id, actorUserId: req.user.id, actorLabel: req.user.email,
      action: 'suppression.requested', entityType: 'suppression', entityId: result.rows[0].id,
      details: { eventType: parsed.data.event_type || null, sensorUid: parsed.data.sensor_uid || null, expiresAt: expires.toISOString() },
    });
    await client.query('COMMIT');
    return res.status(201).json(result.rows[0]);
  } catch (error) { await client.query('ROLLBACK'); return next(error); } finally { client.release(); }
});

router.post('/suppressions/:id/review', requireRole('admin', 'supervisor'), async (req, res, next) => {
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'A valid decision is required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = (await client.query(
      'SELECT * FROM suppressions WHERE id=$1 AND tenant_id=$2 FOR UPDATE',
      [req.params.id, req.user.tenant_id],
    )).rows[0];
    if (!current) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Suppression not found' }); }
    if (current.status !== 'pending') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Suppression was already reviewed' }); }
    if (Number(current.requested_by) === Number(req.user.id)) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'A second person must review the suppression' }); }
    if (new Date(current.expires_at) <= new Date()) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Expired suppressions cannot be approved' }); }
    const result = await client.query(
      'UPDATE suppressions SET status=$1,reviewed_by=$2,reviewed_at=NOW() WHERE id=$3 RETURNING *',
      [parsed.data.decision, req.user.id, current.id],
    );
    await appendAudit(client, {
      tenantId: req.user.tenant_id, actorUserId: req.user.id, actorLabel: req.user.email,
      action: `suppression.${parsed.data.decision}`, entityType: 'suppression', entityId: current.id,
      details: { notes: parsed.data.notes || null },
    });
    await client.query('COMMIT');
    return res.json(result.rows[0]);
  } catch (error) { await client.query('ROLLBACK'); return next(error); } finally { client.release(); }
});

router.get('/evaluations', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM evaluation_runs WHERE tenant_id=$1 ORDER BY id DESC LIMIT 200', [req.user.tenant_id]);
    return res.json(result.rows);
  } catch (error) { return next(error); }
});

router.post('/evaluations', requireRole('admin', 'supervisor', 'analyst'), async (req, res, next) => {
  const parsed = evaluationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid evaluation dataset', details: parsed.error.flatten() });
  const canonicalSamples = [...parsed.data.samples].sort((a, b) => a.id.localeCompare(b.id));
  const ids = new Set(canonicalSamples.map((sample) => sample.id));
  if (ids.size !== canonicalSamples.length) return res.status(400).json({ error: 'Evaluation sample IDs must be unique' });
  const counts = canonicalSamples.reduce((acc, sample) => {
    if (sample.actual && sample.predicted) acc.tp += 1;
    else if (!sample.actual && sample.predicted) acc.fp += 1;
    else if (!sample.actual && !sample.predicted) acc.tn += 1;
    else acc.fn += 1;
    return acc;
  }, { tp: 0, fp: 0, tn: 0, fn: 0 });
  const precision = counts.tp + counts.fp ? counts.tp / (counts.tp + counts.fp) : 0;
  const recall = counts.tp + counts.fn ? counts.tp / (counts.tp + counts.fn) : 0;
  const falsePositiveRate = counts.fp + counts.tn ? counts.fp / (counts.fp + counts.tn) : 0;
  const adversarial = canonicalSamples.filter((sample) => sample.adversarial).map(({ id, actual, predicted }) => ({ id, actual, predicted }));
  const digest = crypto.createHash('sha256').update(stable(canonicalSamples)).digest('hex');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO evaluation_runs
        (tenant_id,name,status,dataset_digest,total_samples,true_positives,false_positives,true_negatives,false_negatives,precision_value,recall_value,false_positive_rate,adversarial_cases,created_by)
       VALUES ($1,$2,'completed',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [req.user.tenant_id, parsed.data.name, digest, canonicalSamples.length, counts.tp, counts.fp, counts.tn, counts.fn,
        precision, recall, falsePositiveRate, JSON.stringify(adversarial), req.user.id],
    );
    await appendAudit(client, {
      tenantId: req.user.tenant_id, actorUserId: req.user.id, actorLabel: req.user.email,
      action: 'evaluation.completed', entityType: 'evaluation_run', entityId: result.rows[0].id,
      details: { datasetDigest: digest, totalSamples: canonicalSamples.length, falsePositiveRate, recall, adversarialCases: adversarial.length },
    });
    await client.query('COMMIT');
    return res.status(201).json(result.rows[0]);
  } catch (error) { await client.query('ROLLBACK'); return next(error); } finally { client.release(); }
});

router.post('/evaluations/:id/approve', requireRole('admin', 'supervisor'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = (await client.query(
      'SELECT * FROM evaluation_runs WHERE id=$1 AND tenant_id=$2 FOR UPDATE',
      [req.params.id, req.user.tenant_id],
    )).rows[0];
    if (!current) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Evaluation not found' }); }
    if (current.status !== 'completed') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Only completed evaluations may be approved' }); }
    if (Number(current.created_by) === Number(req.user.id)) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'A second person must approve the evaluation' }); }
    const blockers = [];
    if (Number(current.recall_value) < 0.9) blockers.push('recall below 0.90');
    if (Number(current.false_positive_rate) > 0.1) blockers.push('false-positive rate above 0.10');
    if (!Array.isArray(current.adversarial_cases) || current.adversarial_cases.length === 0) blockers.push('no adversarial cases');
    else if (current.adversarial_cases.some((sample) => sample.actual !== sample.predicted)) blockers.push('adversarial cases include failures');
    if (blockers.length) { await client.query('ROLLBACK'); return res.status(422).json({ error: 'Evaluation does not meet approval gates', blockers }); }
    const result = await client.query(
      "UPDATE evaluation_runs SET status='approved',approved_by=$1,approved_at=NOW() WHERE id=$2 RETURNING *",
      [req.user.id, current.id],
    );
    await appendAudit(client, {
      tenantId: req.user.tenant_id, actorUserId: req.user.id, actorLabel: req.user.email,
      action: 'evaluation.approved', entityType: 'evaluation_run', entityId: current.id,
      details: { datasetDigest: current.dataset_digest },
    });
    await client.query('COMMIT');
    return res.json(result.rows[0]);
  } catch (error) { await client.query('ROLLBACK'); return next(error); } finally { client.release(); }
});

module.exports = router;
