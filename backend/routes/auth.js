const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const pool = require('../db');
const { appendAudit } = require('../services/audit');
const { JWT_AUDIENCE, JWT_ISSUER, verifyToken } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');

const router = express.Router();
const DUMMY_PASSWORD_HASH = '$2b$10$e4dPQpe3XIDluCZCv3b3iu/H/3f816tgim6l5ly5k7pChHG235Dey';
const loginSchema = z.object({
  email: z.string().email().max(255).transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8).max(200),
  tenant: z.string().min(1).max(80).optional(),
  tenantSlug: z.string().min(1).max(80).optional(),
}).strict();

router.post('/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10, key: (req) => `login:${req.ip}` }), async (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'A valid email and password are required' });
  try {
    const result = await pool.query(
      'SELECT id,email,name,role,password_hash,tenant_id,token_version FROM users WHERE email=$1 AND active=true',
      [parsed.data.email],
    );
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(parsed.data.password, user?.password_hash || DUMMY_PASSWORD_HASH);
    if (!user || !validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ ver: user.token_version }, process.env.JWT_SECRET, {
      algorithm: 'HS256', subject: String(user.id), issuer: JWT_ISSUER, audience: JWT_AUDIENCE, expiresIn: '1h',
    });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await appendAudit(client, {
        tenantId: user.tenant_id, actorUserId: user.id, actorLabel: user.email,
        action: 'auth.login', entityType: 'user', entityId: user.id, details: { outcome: 'success' },
      });
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
    return res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, tenant_id: user.tenant_id },
    });
  } catch (error) { return next(error); }
});

router.get('/me', verifyToken, (req, res) => res.json(req.user));

module.exports = router;
