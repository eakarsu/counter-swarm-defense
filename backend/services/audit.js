const crypto = require('node:crypto');

const ZERO_HASH = '0'.repeat(64);

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function auditKey() {
  const key = process.env.AUDIT_CHAIN_KEY;
  if (!key || key.length < 32) throw new Error('AUDIT_CHAIN_KEY must be at least 32 characters');
  return key;
}

function eventHash(entry, key = auditKey()) {
  return crypto.createHmac('sha256', key).update(stable(entry)).digest('hex');
}

async function appendAudit(client, {
  tenantId, actorUserId = null, actorLabel, action, entityType, entityId = null, details = {},
}) {
  await client.query('SELECT pg_advisory_xact_lock($1,$2)', [9821, Number(tenantId)]);
  const previous = await client.query(
    'SELECT event_hash FROM audit_history WHERE tenant_id=$1 ORDER BY id DESC LIMIT 1',
    [tenantId],
  );
  const previousHash = previous.rows[0]?.event_hash || ZERO_HASH;
  const createdAt = new Date().toISOString();
  const payload = {
    tenantId: String(tenantId), actorUserId: actorUserId == null ? null : String(actorUserId),
    actorLabel, action, entityType, entityId: entityId == null ? null : String(entityId),
    details, previousHash, createdAt,
  };
  const hash = eventHash(payload);
  const result = await client.query(
    `INSERT INTO audit_history
      (tenant_id,actor_user_id,actor_label,action,entity_type,entity_id,details,previous_hash,event_hash,created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [tenantId, actorUserId, actorLabel, action, entityType, entityId == null ? null : String(entityId), details, previousHash, hash, createdAt],
  );
  return result.rows[0];
}

async function verifyAuditChain(client, tenantId) {
  const rows = (await client.query('SELECT * FROM audit_history WHERE tenant_id=$1 ORDER BY id ASC', [tenantId])).rows;
  let previousHash = ZERO_HASH;
  for (const row of rows) {
    const createdAt = new Date(row.created_at).toISOString();
    const expected = eventHash({
      tenantId: String(row.tenant_id),
      actorUserId: row.actor_user_id == null ? null : String(row.actor_user_id),
      actorLabel: row.actor_label, action: row.action, entityType: row.entity_type,
      entityId: row.entity_id == null ? null : String(row.entity_id), details: row.details,
      previousHash, createdAt,
    });
    if (row.previous_hash !== previousHash || row.event_hash !== expected) {
      return { valid: false, checked: rows.length, failedId: row.id };
    }
    previousHash = row.event_hash;
  }
  return { valid: true, checked: rows.length, head: previousHash };
}

module.exports = { appendAudit, eventHash, stable, verifyAuditChain, ZERO_HASH };
