const jwt = require('jsonwebtoken');
const pool = require('../db');

const JWT_ISSUER = 'swarmshield';
const JWT_AUDIENCE = 'swarmshield-console';

function bearerToken(header = '') {
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1] || null;
}

async function verifyToken(req, res, next) {
  const token = bearerToken(req.headers.authorization);
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const claims = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'], issuer: JWT_ISSUER, audience: JWT_AUDIENCE,
    });
    const result = await pool.query(
      `SELECT id,email,name,role,tenant_id,token_version FROM users
       WHERE id=$1 AND active=true`,
      [claims.sub],
    );
    const user = result.rows[0];
    if (!user || Number(user.token_version) !== Number(claims.ver)) {
      return res.status(401).json({ error: 'Authentication expired' });
    }
    req.user = user;
    return next();
  } catch (error) {
    if (error.code) return next(error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  const allowed = new Set(roles);
  return (req, res, next) => {
    if (!req.user || !allowed.has(req.user.role)) return res.status(403).json({ error: 'Insufficient role' });
    return next();
  };
}

module.exports = { JWT_AUDIENCE, JWT_ISSUER, requireRole, verifyToken };
