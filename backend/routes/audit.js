const express = require('express');
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const { verifyAuditChain } = require('../services/audit');

const router = express.Router();
router.use(verifyToken);

router.get('/', async (req, res, next) => {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 200, 1), 1000);
  try {
    const search = typeof req.query.search === 'string' ? `%${req.query.search.slice(0, 100)}%` : null;
    const action = typeof req.query.action === 'string' ? req.query.action.slice(0, 100) : null;
    const entityType = typeof req.query.entity_type === 'string' ? req.query.entity_type.slice(0, 60) : null;
    const result = await pool.query(
      `SELECT id,actor_label,action,entity_type,entity_id,details,previous_hash,event_hash,created_at
       FROM audit_history WHERE tenant_id=$1
         AND ($2::text IS NULL OR actor_label ILIKE $2 OR action ILIKE $2 OR entity_type ILIKE $2 OR details::text ILIKE $2)
         AND ($3::text IS NULL OR action=$3)
         AND ($4::text IS NULL OR entity_type=$4)
       ORDER BY id DESC LIMIT $5`,
      [req.user.tenant_id, search, action, entityType, limit],
    );
    return res.json(result.rows);
  } catch (error) { return next(error); }
});

router.get('/verify', async (req, res, next) => {
  try { return res.json(await verifyAuditChain(pool, req.user.tenant_id)); }
  catch (error) { return next(error); }
});

module.exports = router;
