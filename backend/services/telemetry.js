const crypto = require('node:crypto');
const { z } = require('zod');
const pool = require('../db');
const { appendAudit, stable } = require('./audit');

const telemetrySchema = z.object({
  schema_version: z.literal('1.0'),
  event_id: z.string().min(8).max(128).regex(/^[A-Za-z0-9_.:-]+$/),
  sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  observed_at: z.string().datetime({ offset: true }),
  event_type: z.enum(['rf_detection', 'radar_track', 'eo_ir_detection', 'acoustic_detection', 'sensor_health']),
  sensor_uid: z.string().min(2).max(100).regex(/^[A-Za-z0-9_.:-]+$/),
  data: z.record(z.union([z.string().max(500), z.number().finite(), z.boolean(), z.null()])),
}).strict();

function encryptionKey(keyMaterial = process.env.TELEMETRY_SECRETS_KEY) {
  if (!keyMaterial) throw new Error('TELEMETRY_SECRETS_KEY is required');
  const key = Buffer.from(keyMaterial, 'base64');
  if (key.length !== 32) throw new Error('TELEMETRY_SECRETS_KEY must be a base64-encoded 32-byte key');
  return key;
}

function aad(identity) {
  return Buffer.from(`swarmshield|${identity.tenantId}|${identity.sourceUid}`);
}

function encryptSecret(secret, identity, keyMaterial) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(keyMaterial), iv);
  cipher.setAAD(aad(identity));
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return Buffer.from(JSON.stringify({
    v: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: ciphertext.toString('base64'),
  })).toString('base64');
}

function decryptSecret(envelope, identity, keyMaterial) {
  try {
    const parsed = JSON.parse(Buffer.from(envelope, 'base64').toString('utf8'));
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(keyMaterial), Buffer.from(parsed.iv, 'base64'));
    decipher.setAAD(aad(identity));
    decipher.setAuthTag(Buffer.from(parsed.tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(parsed.data, 'base64')), decipher.final()]).toString('utf8');
  } catch (error) {
    throw Object.assign(new Error('Telemetry credential envelope could not be authenticated'), { status: 503, cause: error });
  }
}

function signatureFor(payload, secret) {
  return crypto.createHmac('sha256', secret).update(stable(payload)).digest('hex');
}

function signatureMatches(payload, secret, submitted = '') {
  const expected = Buffer.from(signatureFor(payload, secret), 'hex');
  let received;
  try { received = Buffer.from(submitted.replace(/^sha256=/, ''), 'hex'); } catch { return false; }
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

function number(data, key) {
  const value = Number(data[key]);
  return Number.isFinite(value) ? value : null;
}

function evaluatePolicy(policy, event) {
  if (!policy.active || policy.event_type !== event.event_type) return null;
  const conditions = policy.conditions || {};
  const data = event.data;
  let matched = false;
  let score = 0;
  let summary = '';
  if (event.event_type === 'rf_detection') {
    const signal = number(data, 'signal_dbm');
    const confidence = number(data, 'confidence');
    matched = signal != null && confidence != null
      && signal >= Number(conditions.minimum_signal_dbm) && confidence >= Number(conditions.minimum_confidence);
    score = Math.round(Math.min(100, Math.max(0, (signal + 100) * 1.5 + confidence * 40)));
    summary = `RF signal ${signal} dBm at confidence ${confidence}`;
  } else if (event.event_type === 'radar_track') {
    const distance = number(data, 'zone_distance_m');
    const confidence = number(data, 'confidence');
    matched = distance != null && confidence != null
      && distance <= Number(conditions.maximum_zone_distance_m) && confidence >= Number(conditions.minimum_confidence);
    score = Math.round(Math.min(100, Math.max(0, 100 - distance / 30 + confidence * 20)));
    summary = `Radar track ${distance} m from protected zone at confidence ${confidence}`;
  } else if (event.event_type === 'sensor_health') {
    const battery = number(data, 'battery_pct');
    matched = data.status === 'offline' || (battery != null && battery <= Number(conditions.maximum_battery_pct));
    score = data.status === 'offline' ? 90 : Math.round(Math.max(0, 70 - (battery || 0)));
    summary = `Sensor health status=${data.status || 'unknown'}, battery=${battery}`;
  }
  if (!matched) return null;
  return { riskScore: score, title: policy.name, summary };
}

async function createSource({ tenantId, userId, sourceUid, name, sourceType, retentionDays = 30, clockSkewSeconds = 120 }) {
  const secret = crypto.randomBytes(32).toString('hex');
  const encrypted = encryptSecret(secret, { tenantId, sourceUid });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO telemetry_sources
        (tenant_id,source_uid,name,source_type,signing_secret_ciphertext,key_version,retention_days,allowed_clock_skew_seconds,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id,tenant_id,source_uid,name,source_type,status,key_version,retention_days,allowed_clock_skew_seconds,created_at`,
      [tenantId, sourceUid, name, sourceType, encrypted, process.env.TELEMETRY_SECRETS_KEY_VERSION || 'v1', retentionDays, clockSkewSeconds, userId],
    );
    await appendAudit(client, {
      tenantId, actorUserId: userId, actorLabel: `user:${userId}`, action: 'telemetry.source.created',
      entityType: 'telemetry_source', entityId: result.rows[0].id, details: { sourceUid, sourceType, retentionDays },
    });
    await client.query('COMMIT');
    return { source: result.rows[0], signingSecret: secret };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

async function matchingSuppression(client, tenantId, event) {
  const result = await client.query(
    `SELECT * FROM suppressions WHERE tenant_id=$1 AND status='approved' AND expires_at>NOW()
       AND (event_type IS NULL OR event_type=$2) AND (sensor_uid IS NULL OR sensor_uid=$3)
     ORDER BY id DESC LIMIT 1`,
    [tenantId, event.event_type, event.sensor_uid],
  );
  return result.rows[0] || null;
}

async function persistDetection(client, source, eventRow, event, policy, outcome) {
  const suppression = await matchingSuppression(client, source.tenant_id, event);
  const bucket = Math.floor(new Date(event.observed_at).getTime() / 300000);
  const fingerprint = crypto.createHash('sha256').update(`${policy.id}|${event.sensor_uid}|${bucket}`).digest('hex');
  let detection;
  if (!suppression) {
    detection = (await client.query(
      `SELECT * FROM detections WHERE tenant_id=$1 AND fingerprint=$2 AND status IN ('triage','open') FOR UPDATE`,
      [source.tenant_id, fingerprint],
    )).rows[0];
  }
  if (detection) {
    detection = (await client.query(
      `UPDATE detections SET occurrence_count=occurrence_count+1,last_seen_at=$1,risk_score=GREATEST(risk_score,$2)
       WHERE id=$3 RETURNING *`,
      [event.observed_at, outcome.riskScore, detection.id],
    )).rows[0];
  } else {
    detection = (await client.query(
      `INSERT INTO detections
        (tenant_id,policy_id,fingerprint,status,severity,risk_score,title,summary,first_seen_at,last_seen_at,suppression_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,$10) RETURNING *`,
      [source.tenant_id, policy.id, fingerprint, suppression ? 'suppressed' : 'triage', policy.severity,
        outcome.riskScore, outcome.title, outcome.summary, event.observed_at, suppression?.id || null],
    )).rows[0];
    if (!suppression) {
      const slaMinutes = policy.severity === 'critical' ? 5 : policy.severity === 'high' ? 15 : 60;
      await client.query(
        `INSERT INTO triage_cases(tenant_id,detection_id,sla_due_at)
         VALUES ($1,$2,NOW()+($3::text || ' minutes')::interval)`,
        [source.tenant_id, detection.id, slaMinutes],
      );
    }
  }
  await client.query(
    `INSERT INTO detection_evidence(detection_id,telemetry_event_id) VALUES ($1,$2)
     ON CONFLICT DO NOTHING`,
    [detection.id, eventRow.id],
  );
  return detection;
}

async function ingestTelemetry({ sourceUid, submittedSignature, payload, now = new Date() }) {
  const parsed = telemetrySchema.safeParse(payload);
  if (!parsed.success) throw Object.assign(new Error('Telemetry schema validation failed'), { status: 400, details: parsed.error.flatten() });
  const event = parsed.data;
  const source = (await pool.query('SELECT * FROM telemetry_sources WHERE source_uid=$1', [sourceUid])).rows[0];
  if (!source || source.status !== 'active') throw Object.assign(new Error('Telemetry source unavailable'), { status: 401 });
  const secret = decryptSecret(source.signing_secret_ciphertext, { tenantId: source.tenant_id, sourceUid });
  if (!signatureMatches(event, secret, submittedSignature)) throw Object.assign(new Error('Telemetry signature invalid'), { status: 401 });

  const observed = new Date(event.observed_at);
  const ageMs = now.getTime() - observed.getTime();
  const maxAgeMs = Number(process.env.TELEMETRY_MAX_EVENT_AGE_MS || 300000);
  if (ageMs < -source.allowed_clock_skew_seconds * 1000) throw Object.assign(new Error('Telemetry timestamp is future-dated'), { status: 422 });
  if (ageMs > maxAgeMs) throw Object.assign(new Error('Telemetry timestamp is stale'), { status: 422 });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const locked = (await client.query('SELECT * FROM telemetry_sources WHERE id=$1 FOR UPDATE', [source.id])).rows[0];
    const duplicate = (await client.query(
      'SELECT * FROM telemetry_events WHERE tenant_id=$1 AND source_id=$2 AND external_event_id=$3',
      [source.tenant_id, source.id, event.event_id],
    )).rows[0];
    if (duplicate) {
      await client.query('COMMIT');
      return { event: duplicate, detections: [], duplicate: true };
    }
    if (event.sequence <= Number(locked.last_sequence)) throw Object.assign(new Error('Telemetry sequence is out of order'), { status: 409 });
    const rawSha = crypto.createHash('sha256').update(stable(event)).digest('hex');
    const retentionUntil = new Date(now.getTime() + locked.retention_days * 86400000);
    const eventRow = (await client.query(
      `INSERT INTO telemetry_events
        (tenant_id,source_id,external_event_id,sequence,schema_version,parser_version,event_type,sensor_uid,observed_at,received_at,normalized,raw_sha256,integrity_status,retention_until)
       VALUES ($1,$2,$3,$4,$5,'strict-json-1',$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [source.tenant_id, source.id, event.event_id, event.sequence, event.schema_version, event.event_type,
        event.sensor_uid, event.observed_at, now, event.data, rawSha,
        Math.abs(ageMs) > locked.allowed_clock_skew_seconds * 1000 ? 'clock_skew_warning' : 'verified', retentionUntil],
    )).rows[0];
    await client.query('UPDATE telemetry_sources SET last_sequence=$1,last_seen_at=$2,updated_at=NOW() WHERE id=$3', [event.sequence, now, source.id]);
    const policies = (await client.query(
      'SELECT * FROM detection_policies WHERE tenant_id=$1 AND event_type=$2 AND active=true ORDER BY id',
      [source.tenant_id, event.event_type],
    )).rows;
    const detections = [];
    for (const policy of policies) {
      const outcome = evaluatePolicy(policy, event);
      if (outcome) detections.push(await persistDetection(client, source, eventRow, event, policy, outcome));
    }
    await appendAudit(client, {
      tenantId: source.tenant_id, actorLabel: `source:${source.source_uid}`,
      action: 'telemetry.event.ingested', entityType: 'telemetry_event', entityId: eventRow.id,
      details: { externalEventId: event.event_id, sequence: event.sequence, detectionIds: detections.map((item) => item.id) },
    });
    await client.query('COMMIT');
    return { event: eventRow, detections, duplicate: false };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

module.exports = {
  createSource, decryptSecret, encryptSecret, evaluatePolicy, ingestTelemetry,
  signatureFor, signatureMatches, telemetrySchema,
};
