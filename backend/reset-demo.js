const fs = require('node:fs/promises');
const path = require('node:path');
const pool = require('./db');
const { migrate } = require('./migrate');

function assertLocalDemoTarget() {
  if (process.env.ALLOW_DEMO_RESET !== 'true') throw new Error('ALLOW_DEMO_RESET=true is required');
  if (process.env.NODE_ENV === 'production') throw new Error('Demo reset is disabled in production');
  const target = new URL(process.env.DATABASE_URL);
  if (target.hostname && !['localhost', '127.0.0.1', '::1'].includes(target.hostname)) {
    throw new Error('Demo reset only accepts a local PostgreSQL host');
  }
  const database = target.pathname.replace(/^\//, '');
  if (!['defense_db', 'swarmshield_demo'].includes(database) && !database.startsWith('swarmshield_test_')) {
    throw new Error('Demo reset target must be defense_db, swarmshield_demo, or a disposable swarmshield_test_* database');
  }
  return database;
}

async function resetDemo() {
  const database = assertLocalDemoTarget();
  const [schema, seed] = await Promise.all([
    fs.readFile(path.join(__dirname, 'db/schema.sql'), 'utf8'),
    fs.readFile(path.join(__dirname, 'db/seed.sql'), 'utf8'),
  ]);
  await pool.query(schema);
  await pool.query(seed);
  await migrate();
  console.log(`Local demo database ${database} was reset and migrated.`);
}

if (require.main === module) {
  resetDemo().then(() => pool.end()).catch((error) => {
    console.error(error.message);
    pool.end().finally(() => { process.exitCode = 1; });
  });
}

module.exports = { assertLocalDemoTarget, resetDemo };
