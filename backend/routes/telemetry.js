const express = require('express');
const { z } = require('zod');
const pool = require('../db');
const { requireRole, verifyToken } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');
const { appendAudit } = require('../services/audit');
const { createSource, ingestTelemetry } = require('../services/telemetry');

const router = express.Router();
const sourceSchema = z.object({
  source_uid: z.string().min(3).max(100).regex(/^[A-Za-z0-9_.:-]+$/),
  name: z.string().min(3).max(160),
  source_type: z.enum(['rf', 'radar', 'eo_ir', 'acoustic', 'health', 'simulator']),
  retention_days: z.number().int().min(1).max(3650).optional(),
  allowed_clock_skew_seconds: z.number().int().min(1).max(3600).optional(),
}).strict();
const statusSchema = z.object({ status: z.enum(['active', 'disabled', 'quarantined']) }).strict();

router.post('/ingest', rateLimit({
  windowMs: 60000, max: 120,
  key: (req) => `telemetry:${req.ip}:${String(req.headers['x-source-uid'] || '').slice(0, 100)}`,
}), async (req, res, next) => {
  const sourceUid = req.headers['x-source-uid'];
  const submittedSignature = req.headers['x-telemetry-signature'];
  if (typeof sourceUid !== 'string' || typeof submittedSignature !== 'string') {
    return res.status(401).json({ error: 'Telemetry source and signature headers are required' });
  }
  try {
    const result = await ingestTelemetry({ sourceUid, submittedSignature, payload: req.body });
    return res.status(result.duplicate ? 200 : 202).json({
      duplicate: result.duplicate,
      event: { id: result.event.id, external_event_id: result.event.external_event_id, integrity_status: result.event.integrity_status },
      detections: result.detections.map(({ id, severity, risk_score, status }) => ({ id, severity, risk_score, status })),
    });
  } catch (error) { return next(error); }
});

router.use(verifyToken);

router.get('/sources', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id,source_uid,name,source_type,status,key_version,retention_days,allowed_clock_skew_seconds,last_sequence,last_seen_at,created_at,updated_at
       FROM telemetry_sources WHERE tenant_id=$1 ORDER BY name`,
      [req.user.tenant_id],
    );
    return res.json(result.rows);
  } catch (error) { return next(error); }
});

router.post('/sources', requireRole('admin', 'supervisor'), async (req, res, next) => {
  const parsed = sourceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid telemetry source', details: parsed.error.flatten() });
  try {
    const result = await createSource({
      tenantId: req.user.tenant_id, userId: req.user.id,
      sourceUid: parsed.data.source_uid, name: parsed.data.name, sourceType: parsed.data.source_type,
      retentionDays: parsed.data.retention_days, clockSkewSeconds: parsed.data.allowed_clock_skew_seconds,
    });
    return res.status(201).json({ ...result, notice: 'The signing secret is shown once. Store it in the sensor secret manager.' });
  } catch (error) { return next(error); }
});

router.patch('/sources/:id/status', requireRole('admin', 'supervisor'), async (req, res, next) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid source status' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE telemetry_sources SET status=$1,updated_at=NOW()
       WHERE id=$2 AND tenant_id=$3 RETURNING id,source_uid,name,source_type,status,last_seen_at,updated_at`,
      [parsed.data.status, req.params.id, req.user.tenant_id],
    );
    if (!result.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Source not found' }); }
    await appendAudit(client, {
      tenantId: req.user.tenant_id, actorUserId: req.user.id, actorLabel: req.user.email,
      action: 'telemetry.source.status_changed', entityType: 'telemetry_source', entityId: req.params.id,
      details: { status: parsed.data.status },
    });
    await client.query('COMMIT');
    return res.json(result.rows[0]);
  } catch (error) { await client.query('ROLLBACK'); return next(error); } finally { client.release(); }
});

router.get('/events', async (req, res, next) => {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 500);
  try {
    const result = await pool.query(
      `SELECT e.id,e.external_event_id,e.sequence,e.schema_version,e.parser_version,e.event_type,e.sensor_uid,
              e.observed_at,e.received_at,e.normalized,e.raw_sha256,e.integrity_status,e.retention_until,s.source_uid
       FROM telemetry_events e JOIN telemetry_sources s ON s.id=e.source_id
       WHERE e.tenant_id=$1 ORDER BY e.observed_at DESC,e.id DESC LIMIT $2`,
      [req.user.tenant_id, limit],
    );
    return res.json(result.rows);
  } catch (error) { return next(error); }
});

router.post('/retention/purge', requireRole('admin'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const removed = await client.query(
      `DELETE FROM telemetry_events e WHERE e.tenant_id=$1 AND e.retention_until<NOW()
       AND NOT EXISTS (SELECT 1 FROM detection_evidence de WHERE de.telemetry_event_id=e.id) RETURNING id`,
      [req.user.tenant_id],
    );
    await appendAudit(client, {
      tenantId: req.user.tenant_id, actorUserId: req.user.id, actorLabel: req.user.email,
      action: 'telemetry.retention.purged', entityType: 'telemetry_event', details: { count: removed.rowCount },
    });
    await client.query('COMMIT');
    return res.json({ removed: removed.rowCount });
  } catch (error) { await client.query('ROLLBACK'); return next(error); } finally { client.release(); }
});

module.exports = router;
