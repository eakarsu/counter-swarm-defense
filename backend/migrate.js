const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const pool = require('./db');

const MIGRATION_LOCK = 771926410;

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK]);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      sha256 CHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    const directory = path.join(__dirname, 'migrations');
    const files = (await fs.readdir(directory)).filter((file) => file.endsWith('.sql')).sort();
    for (const name of files) {
      const sql = await fs.readFile(path.join(directory, name), 'utf8');
      const sha256 = crypto.createHash('sha256').update(sql).digest('hex');
      const applied = await client.query('SELECT sha256 FROM schema_migrations WHERE name=$1', [name]);
      if (applied.rows.length) {
        if (applied.rows[0].sha256 !== sha256) throw new Error(`Applied migration checksum changed: ${name}`);
        continue;
      }
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations(name,sha256) VALUES ($1,$2)', [name, sha256]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK]).catch(() => {});
    client.release();
  }
}

if (require.main === module) {
  migrate().then(() => pool.end()).catch((error) => {
    console.error(error);
    pool.end().finally(() => { process.exitCode = 1; });
  });
}

module.exports = { migrate };
