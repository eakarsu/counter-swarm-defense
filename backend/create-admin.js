require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcrypt');
const pool = require('./db');

async function createAdmin() {
  if (process.env.BOOTSTRAP_ACKNOWLEDGEMENT !== 'create-initial-admin') {
    throw new Error('BOOTSTRAP_ACKNOWLEDGEMENT=create-initial-admin is required');
  }
  const email = (process.env.PROVISION_ADMIN_EMAIL || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.PROVISION_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || '';
  const name = process.env.ADMIN_NAME || process.env.BOOTSTRAP_ADMIN_NAME || 'Runtime Administrator';
  const tenantSlug = process.env.BOOTSTRAP_TENANT_SLUG || process.env.TENANT_ID || 'local';
  const tenantName = process.env.BOOTSTRAP_TENANT_NAME || 'Local Operations Tenant';
  if (!email || !email.includes('@')) throw new Error('ADMIN_EMAIL is required');
  if (password.length < 12) throw new Error('ADMIN_PASSWORD must contain at least 12 characters');

  const passwordHash = await bcrypt.hash(password, 12);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tenant = await client.query(
      `INSERT INTO tenants(slug,name) VALUES ($1,$2)
       ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
      [tenantSlug, tenantName],
    );
    await client.query(
      `INSERT INTO users(email,password_hash,name,role,tenant_id,active,token_version)
       VALUES ($1,$2,$3,'admin',$4,true,1)
       ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash,name=EXCLUDED.name,
         role='admin',tenant_id=EXCLUDED.tenant_id,active=true,token_version=users.token_version+1`,
      [email, passwordHash, name, tenant.rows[0].id],
    );
    await client.query('COMMIT');
    console.log(`Provisioned administrator ${email}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  createAdmin().then(() => pool.end()).catch((error) => {
    console.error(error.message);
    pool.end().finally(() => { process.exitCode = 1; });
  });
}

module.exports = { createAdmin };
