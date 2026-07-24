const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');

const databaseName = `swarmshield_test_${process.pid}_${crypto.randomBytes(3).toString('hex')}`;
const adminUrl = new URL(process.env.TEST_DATABASE_ADMIN_URL || 'postgresql:///postgres');
const databaseUrl = new URL(adminUrl.toString());
databaseUrl.pathname = `/${databaseName}`;

async function main() {
  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    const database = new Client({ connectionString: databaseUrl.toString() });
    await database.connect();
    try {
      const schema = await fs.readFile(path.join(__dirname, '../db/schema.sql'), 'utf8');
      await database.query(schema);
    } finally { await database.end(); }

    process.env.DATABASE_URL = databaseUrl.toString();
    const pool = require('../db');
    const { migrate } = require('../migrate');
    await migrate();
    await migrate();
    await pool.end();

    const result = spawnSync(process.execPath, [
      path.join(__dirname, '../node_modules/vitest/vitest.mjs'),
      'run',
      '--testTimeout=60000',
      '--hookTimeout=90000',
    ], {
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DATABASE_URL: databaseUrl.toString(),
        JWT_SECRET: 'test-jwt-secret-that-is-at-least-thirty-two-characters',
        AUDIT_CHAIN_KEY: 'test-audit-chain-key-that-is-at-least-thirty-two-characters',
        TELEMETRY_SECRETS_KEY: Buffer.alloc(32, 7).toString('base64'),
      },
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    process.stdout.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    if (result.status !== 0) process.exitCode = result.status || 1;
  } finally {
    await admin.query(
      'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()',
      [databaseName],
    ).catch(() => {});
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
    await admin.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
