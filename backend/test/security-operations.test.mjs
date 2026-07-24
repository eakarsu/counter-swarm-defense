import { createRequire } from 'node:module';
import { beforeAll, afterAll, describe, expect, test } from 'vitest';

const require = createRequire(import.meta.url);
const bcrypt = require('bcrypt');
const request = require('supertest');
const pool = require('../db');
const { createApp, validateConfig } = require('../server');
const { evaluatePolicy, signatureFor, telemetrySchema } = require('../services/telemetry');

const app = createApp();
const password = 'correct-horse-battery';
const identities = {};
let adminToken;
let analystToken;
let supervisorToken;
let outsiderToken;
let source;
let signingSecret;
let caseId;
let initialCaseCount;

async function login(email) {
  const response = await request(app).post('/api/auth/login').send({ email, password });
  expect(response.status).toBe(200);
  return response.body.token;
}

function telemetry(overrides = {}) {
  return {
    schema_version: '1.0', event_id: 'evt-rf-0001', sequence: 1,
    observed_at: new Date().toISOString(), event_type: 'rf_detection', sensor_uid: 'rf-north-1',
    data: { signal_dbm: -55, confidence: 0.94, frequency_mhz: 2450 }, ...overrides,
  };
}

async function ingest(payload, secret = signingSecret) {
  return request(app).post('/api/telemetry/ingest')
    .set('x-source-uid', source.source_uid)
    .set('x-telemetry-signature', `sha256=${signatureFor(payload, secret)}`)
    .send(payload);
}

beforeAll(async () => {
  validateConfig();
  const hash = await bcrypt.hash(password, 10);
  const defaultTenant = (await pool.query("SELECT id FROM tenants WHERE slug='default'")).rows[0].id;
  const otherTenant = (await pool.query("INSERT INTO tenants(slug,name) VALUES ('other','Other Tenant') RETURNING id")).rows[0].id;
  await pool.query(
    `INSERT INTO detection_policies(tenant_id,policy_uid,name,event_type,severity,conditions)
     VALUES ($1,'rf-strong-signal','Strong RF signal','rf_detection','high',$2)`,
    [otherTenant, { minimum_signal_dbm: -70, minimum_confidence: 0.7 }],
  );
  for (const [key, email, role, tenantId] of [
    ['admin', 'admin@test.local', 'admin', defaultTenant],
    ['analyst', 'analyst@test.local', 'analyst', defaultTenant],
    ['supervisor', 'supervisor@test.local', 'supervisor', defaultTenant],
    ['outsider', 'outsider@test.local', 'analyst', otherTenant],
  ]) {
    identities[key] = (await pool.query(
      `INSERT INTO users(email,password_hash,name,role,tenant_id) VALUES ($1,$2,$3,$4,$5) RETURNING id,email,tenant_id`,
      [email, hash, key, role, tenantId],
    )).rows[0];
  }
  adminToken = await login(identities.admin.email);
  analystToken = await login(identities.analyst.email);
  supervisorToken = await login(identities.supervisor.email);
  outsiderToken = await login(identities.outsider.email);
});

afterAll(async () => { await pool.end(); });

describe.sequential('deterministic telemetry controls', () => {
  test('strict parser rejects unknown fields and deterministic policy explains a match', () => {
    expect(telemetrySchema.safeParse({ ...telemetry(), unexpected: true }).success).toBe(false);
    const outcome = evaluatePolicy({
      active: true, event_type: 'rf_detection', name: 'RF threshold',
      conditions: { minimum_signal_dbm: -70, minimum_confidence: 0.7 },
    }, telemetry());
    expect(outcome).toMatchObject({ title: 'RF threshold' });
    expect(outcome.riskScore).toBeGreaterThanOrEqual(70);
    expect(outcome.summary).toContain('-55 dBm');
  });

  test('only privileged users can provision a source and its secret is returned once', async () => {
    const denied = await request(app).post('/api/telemetry/sources').set('Authorization', `Bearer ${analystToken}`).send({
      source_uid: 'src-rf-north', name: 'North RF Array', source_type: 'rf',
    });
    expect(denied.status).toBe(403);
    const created = await request(app).post('/api/telemetry/sources').set('Authorization', `Bearer ${adminToken}`).send({
      source_uid: 'src-rf-north', name: 'North RF Array', source_type: 'rf', retention_days: 45,
      allowed_clock_skew_seconds: 120,
    });
    expect(created.status).toBe(201);
    ({ source, signingSecret } = created.body);
    expect(signingSecret).toHaveLength(64);
    const listed = await request(app).get('/api/telemetry/sources').set('Authorization', `Bearer ${adminToken}`);
    expect(listed.status).toBe(200);
    expect(listed.body[0]).not.toHaveProperty('signing_secret_ciphertext');
    expect(listed.body[0].retention_days).toBe(45);
  });

  test('rejects bad signatures, future timestamps, and stale timestamps', async () => {
    const payload = telemetry();
    const invalid = await ingest(payload, 'not-the-secret');
    expect(invalid.status).toBe(401);
    const future = telemetry({ event_id: 'evt-rf-future', observed_at: new Date(Date.now() + 360000).toISOString() });
    expect((await ingest(future)).status).toBe(422);
    const stale = telemetry({ event_id: 'evt-rf-stale', observed_at: new Date(Date.now() - 360000).toISOString() });
    expect((await ingest(stale)).status).toBe(422);
  });

  test('authenticates, normalizes, deduplicates, orders, and detects telemetry', async () => {
    const payload = telemetry();
    const accepted = await ingest(payload);
    expect(accepted.status).toBe(202);
    expect(accepted.body).toMatchObject({ duplicate: false });
    expect(accepted.body.detections).toHaveLength(1);
    const duplicate = await ingest(payload);
    expect(duplicate.status).toBe(200);
    expect(duplicate.body.duplicate).toBe(true);
    const outOfOrder = telemetry({ event_id: 'evt-rf-out-of-order', sequence: 1 });
    expect((await ingest(outOfOrder)).status).toBe(409);
    const events = await request(app).get('/api/telemetry/events').set('Authorization', `Bearer ${adminToken}`);
    expect(events.body).toHaveLength(1);
    expect(events.body[0]).toMatchObject({ parser_version: 'strict-json-1', integrity_status: 'verified' });
    expect(events.body[0].raw_sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  test('purges expired non-evidence telemetry while preserving linked evidence', async () => {
    const lowSignal = telemetry({
      event_id: 'evt-rf-low-signal', sequence: 2,
      data: { signal_dbm: -95, confidence: 0.2, frequency_mhz: 2450 },
    });
    const accepted = await ingest(lowSignal);
    expect(accepted.status).toBe(202);
    expect(accepted.body.detections).toEqual([]);
    await pool.query("UPDATE telemetry_events SET retention_until=NOW()-INTERVAL '1 day' WHERE external_event_id=$1", [lowSignal.event_id]);
    await pool.query("UPDATE telemetry_events SET retention_until=NOW()-INTERVAL '1 day' WHERE external_event_id='evt-rf-0001'");
    const purged = await request(app).post('/api/telemetry/retention/purge').set('Authorization', `Bearer ${adminToken}`);
    expect(purged.status).toBe(200);
    expect(purged.body.removed).toBe(1);
    const remaining = await pool.query("SELECT external_event_id FROM telemetry_events WHERE external_event_id IN ('evt-rf-low-signal','evt-rf-0001') ORDER BY external_event_id");
    expect(remaining.rows).toEqual([{ external_event_id: 'evt-rf-0001' }]);
  });
});

describe.sequential('evidence-backed triage and tenant isolation', () => {
  test('creates an evidence-backed case visible only in its tenant', async () => {
    const cases = await request(app).get('/api/triage/cases').set('Authorization', `Bearer ${analystToken}`);
    expect(cases.status).toBe(200);
    expect(cases.body).toHaveLength(1);
    caseId = cases.body[0].id;
    initialCaseCount = cases.body.length;
    const detail = await request(app).get(`/api/triage/cases/${caseId}`).set('Authorization', `Bearer ${analystToken}`);
    expect(detail.body.evidence).toHaveLength(1);
    expect(detail.body.evidence[0].external_event_id).toBe('evt-rf-0001');
    const outside = await request(app).get('/api/triage/cases').set('Authorization', `Bearer ${outsiderToken}`);
    expect(outside.status).toBe(200);
    expect(outside.body).toEqual([]);
    expect((await request(app).get(`/api/triage/cases/${caseId}`).set('Authorization', `Bearer ${outsiderToken}`)).status).toBe(404);
  });

  test('enforces owner assignment, escalation, and resolution boundaries', async () => {
    const assignOther = await request(app).post(`/api/triage/cases/${caseId}/assign`)
      .set('Authorization', `Bearer ${analystToken}`).send({ owner_user_id: identities.supervisor.id });
    expect(assignOther.status).toBe(403);
    const assigned = await request(app).post(`/api/triage/cases/${caseId}/assign`)
      .set('Authorization', `Bearer ${analystToken}`).send({ owner_user_id: identities.analyst.id });
    expect(assigned.status).toBe(200);
    expect(assigned.body.status).toBe('investigating');
    const escalated = await request(app).post(`/api/triage/cases/${caseId}/escalate`)
      .set('Authorization', `Bearer ${analystToken}`).send({ reason: 'Correlated high-confidence RF evidence' });
    expect(escalated.status).toBe(200);
    expect(escalated.body).toMatchObject({ status: 'escalated', escalation_level: 1 });
    const resolved = await request(app).post(`/api/triage/cases/${caseId}/resolve`)
      .set('Authorization', `Bearer ${analystToken}`).send({ disposition: 'confirmed', notes: 'Evidence independently reviewed and confirmed.' });
    expect(resolved.status).toBe(200);
    expect(resolved.body.status).toBe('resolved');
  });

  test('requires second-person suppression review and records suppressed detections without cases', async () => {
    const requested = await request(app).post('/api/triage/suppressions').set('Authorization', `Bearer ${analystToken}`).send({
      event_type: 'rf_detection', sensor_uid: 'rf-north-1', reason: 'Approved maintenance calibration window',
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    });
    expect(requested.status).toBe(201);
    expect((await request(app).post(`/api/triage/suppressions/${requested.body.id}/review`)
      .set('Authorization', `Bearer ${analystToken}`).send({ decision: 'approved' })).status).toBe(403);
    const approved = await request(app).post(`/api/triage/suppressions/${requested.body.id}/review`)
      .set('Authorization', `Bearer ${supervisorToken}`).send({ decision: 'approved', notes: 'Maintenance ticket verified' });
    expect(approved.status).toBe(200);
    const suppressedPayload = telemetry({ event_id: 'evt-rf-0003', sequence: 3 });
    const suppressed = await ingest(suppressedPayload);
    expect(suppressed.status).toBe(202);
    expect(suppressed.body.detections[0].status).toBe('suppressed');
    const cases = await request(app).get('/api/triage/cases').set('Authorization', `Bearer ${analystToken}`);
    expect(cases.body).toHaveLength(initialCaseCount);
  });
});

describe.sequential('evaluation, revocation, and tamper evidence', () => {
  test('retires direct and model-generated effector dispatch paths', async () => {
    const engagement = await request(app).post('/api/engagements').set('Authorization', `Bearer ${analystToken}`).send({ notes: 'defensive test' });
    expect(engagement.status).toBe(201);
    const direct = await request(app).post(`/api/engagements/${engagement.body.id}/clear`).set('Authorization', `Bearer ${adminToken}`);
    expect(direct.status).toBe(410);
    const generated = await request(app).post('/api/gap-nonai-effector-dispatch').set('Authorization', `Bearer ${adminToken}`).send({ target: 'example' });
    expect(generated.status).toBe(410);
    expect(generated.body.requires_human_authorization).toBe(true);
    const rule = await request(app).post('/api/roe/rules').set('Authorization', `Bearer ${adminToken}`).send({
      rule_code: 'TEST-TWO-PERSON', zone_name: 'Test Zone', min_threat_level: 5,
      authorized_effector_types: 'jammer', requires_command_approval: true,
      collateral_check_required: true, active: true, description: 'Integration-test authorization rule',
    });
    expect(rule.status).toBe(201);
    const authorization = await request(app).post('/api/roe/authorizations').set('Authorization', `Bearer ${analystToken}`).send({
      engagement_id: engagement.body.id, rule_id: rule.body.id, decision: 'approved', rationale: 'Request review',
    });
    expect(authorization.status).toBe(201);
    expect(authorization.body.decision).toBe('pending');
    expect((await request(app).post(`/api/roe/authorizations/${authorization.body.id}/decide`)
      .set('Authorization', `Bearer ${analystToken}`).send({ decision: 'approved' })).status).toBe(403);
    const decision = await request(app).post(`/api/roe/authorizations/${authorization.body.id}/decide`)
      .set('Authorization', `Bearer ${adminToken}`).send({ decision: 'approved', rationale: 'Independent command review' });
    expect(decision.status).toBe(200);
    const cleared = await request(app).get(`/api/engagements/${engagement.body.id}`).set('Authorization', `Bearer ${analystToken}`);
    expect(cleared.body.cleared_to_engage).toBe(true);
  });

  test('measures false positives and gates approval on adversarial evidence and a second person', async () => {
    const created = await request(app).post('/api/triage/evaluations').set('Authorization', `Bearer ${analystToken}`).send({
      name: 'RF policy regression 1',
      samples: [
        { id: 'tp-1', actual: true, predicted: true, adversarial: false },
        { id: 'tp-adv', actual: true, predicted: true, adversarial: true },
        { id: 'tn-1', actual: false, predicted: false, adversarial: false },
        { id: 'tn-adv', actual: false, predicted: false, adversarial: true },
      ],
    });
    expect(created.status).toBe(201);
    expect(Number(created.body.false_positive_rate)).toBe(0);
    expect(Number(created.body.recall_value)).toBe(1);
    expect((await request(app).post(`/api/triage/evaluations/${created.body.id}/approve`)
      .set('Authorization', `Bearer ${analystToken}`)).status).toBe(403);
    const approved = await request(app).post(`/api/triage/evaluations/${created.body.id}/approve`)
      .set('Authorization', `Bearer ${supervisorToken}`);
    expect(approved.status).toBe(200);
    expect(approved.body.status).toBe('approved');
  });

  test('refreshes authorization from the database and supports token revocation', async () => {
    await pool.query('UPDATE users SET token_version=token_version+1 WHERE id=$1', [identities.outsider.id]);
    const revoked = await request(app).get('/api/triage/cases').set('Authorization', `Bearer ${outsiderToken}`);
    expect(revoked.status).toBe(401);
  });

  test('verifies the audit chain and database triggers reject mutation', async () => {
    const verified = await request(app).get('/api/audit/verify').set('Authorization', `Bearer ${adminToken}`);
    expect(verified.status).toBe(200);
    expect(verified.body.valid).toBe(true);
    expect(verified.body.checked).toBeGreaterThan(5);
    const row = (await pool.query('SELECT id FROM audit_history WHERE tenant_id=$1 LIMIT 1', [identities.admin.tenant_id])).rows[0];
    await expect(pool.query("UPDATE audit_history SET action='tampered' WHERE id=$1", [row.id])).rejects.toThrow(/append-only/);
    const caseEvent = (await pool.query('SELECT id FROM case_events LIMIT 1')).rows[0];
    await expect(pool.query('DELETE FROM case_events WHERE id=$1', [caseEvent.id])).rejects.toThrow(/append-only/);
  });

  test('migration ledger records checksum-verified migrations', async () => {
    const result = await pool.query('SELECT name,sha256 FROM schema_migrations ORDER BY name');
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].name).toBe('001_security_operations_journey.sql');
    expect(result.rows[1].name).toBe('002_runtime_openrouter_results.sql');
    for (const migration of result.rows) expect(migration.sha256).toMatch(/^[a-f0-9]{64}$/);
  });
});
