const express = require('express');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

// The former generated route sent tasking inputs to a general-purpose LLM. It
// is deliberately retired: an advisory model response is not an authorization
// and this application has no authenticated effector integration.
router.all('/', (_req, res) => res.status(410).json({
  error: 'Effector dispatch is not available',
  advisory_only: true,
  requires_human_authorization: true,
  next_step: 'Use the governed ROE authorization workflow; no command is transmitted by this service.',
}));

router.get('/history', (_req, res) => res.json({ history: [], retired: true }));

module.exports = router;
