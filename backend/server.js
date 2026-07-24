require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pool = require('./db');
const { rateLimit } = require('./middleware/rateLimit');

function validateConfig() {
  const errors = [];
  if (!process.env.DATABASE_URL) errors.push('DATABASE_URL is required');
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) errors.push('JWT_SECRET must be at least 32 characters');
  if (!process.env.AUDIT_CHAIN_KEY || process.env.AUDIT_CHAIN_KEY.length < 32) errors.push('AUDIT_CHAIN_KEY must be at least 32 characters');
  try {
    if (Buffer.from(process.env.TELEMETRY_SECRETS_KEY || '', 'base64').length !== 32) {
      errors.push('TELEMETRY_SECRETS_KEY must be a base64-encoded 32-byte key');
    }
  } catch { errors.push('TELEMETRY_SECRETS_KEY is invalid'); }
  if (errors.length) throw new Error(`Configuration error: ${errors.join('; ')}`);
}

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  const allowedOrigins = new Set(
    (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((value) => value.trim()).filter(Boolean),
  );
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(Object.assign(new Error('Origin is not allowed'), { status: 403 }));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  }));
  app.use(express.json({ limit: '256kb', strict: true }));
  app.use('/api', rateLimit({ windowMs: 60000, max: 300, key: (req) => `api:${req.ip}` }));

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/telemetry', require('./routes/telemetry'));
  app.use('/api/triage', require('./routes/triage'));
  app.use('/api/ai', require('./routes/ai'));
  app.use('/api/ai-extras', require('./routes/aiExtras'));
  app.use('/api/threats', require('./routes/threats'));
  app.use('/api/countermeasures', require('./routes/countermeasures'));
  app.use('/api/deployments', require('./routes/deployments'));
  app.use('/api/sensors', require('./routes/sensors'));
  app.use('/api/incidents', require('./routes/incidents'));
  app.use('/api/zones', require('./routes/zones'));
  app.use('/api/audit', require('./routes/audit'));
  app.use('/api/export', require('./routes/exportCsv'));
  app.use('/api/search', require('./routes/search'));
  app.use('/api/admin', require('./routes/sample_data'));
  app.use('/api/dashboard', require('./routes/dashboard'));
  app.use('/api/threat-signatures', require('./routes/threat-signatures'));
  app.use('/api/fusion-tracks', require('./routes/fusion-tracks'));
  app.use('/api/engagements', require('./routes/engagements'));
  app.use('/api/effector-magazines', require('./routes/effector-magazines'));
  app.use('/api/roe', require('./routes/roe'));
  app.use('/api/gap-ai-jamming-effectiveness', require('./routes/gap-ai-jamming-effectiveness'));
  app.use('/api/gap-ai-cost-per-kill', require('./routes/gap-ai-cost-per-kill'));
  app.use('/api/gap-ai-multi-sensor-fusion', require('./routes/gap-ai-multi-sensor-fusion'));
  app.use('/api/gap-ai-zone-coverage-gap', require('./routes/gap-ai-zone-coverage-gap'));
  app.use('/api/gap-ai-ew-policy', require('./routes/gap-ai-ew-policy'));
  app.use('/api/gap-nonai-telemetry-stream', require('./routes/gap-nonai-telemetry-stream'));
  app.use('/api/gap-nonai-nipr-sipr-authn', require('./routes/gap-nonai-nipr-sipr-authn'));
  app.use('/api/gap-nonai-atak-cot', require('./routes/gap-nonai-atak-cot'));
  app.use('/api/gap-nonai-live-map', require('./routes/gap-nonai-live-map'));
  app.use('/api/gap-nonai-effector-dispatch', require('./routes/gap-nonai-effector-dispatch'));
  app.use('/api/gap-nonai-raw-signal-storage', require('./routes/gap-nonai-raw-signal-storage'));
  app.use('/api/cf-hardrealtime-fusion', require('./routes/cf-hardrealtime-fusion'));
  app.use('/api/cf-allied-threat-library', require('./routes/cf-allied-threat-library'));
  app.use('/api/cf-interceptor-matcher', require('./routes/cf-interceptor-matcher'));
  app.use('/api/cf-ml-after-action', require('./routes/cf-ml-after-action'));
  app.use('/api/cf-synthetic-wargame', require('./routes/cf-synthetic-wargame'));
  app.use('/api/custom-views', require('./routes/customViews'));
  app.use('/api/high-capacity-interceptors', require('./routes/high-capacity-interceptors'));
  app.use('/api/non-kinetic-effectors', require('./routes/non-kinetic-effectors'));
  app.use('/api/autonomy-attack-vectors', require('./routes/autonomy-attack-vectors'));
  app.use('/api/cost-advantage', require('./routes/cost-advantage'));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'swarmshield' }));
  app.get('/api/health/readiness', async (_req, res, next) => {
    try { await pool.query('SELECT 1'); return res.json({ status: 'ready' }); } catch (error) { return next(error); }
  });
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found', path: req.path }));
  app.use((error, _req, res, _next) => {
    if (process.env.NODE_ENV !== 'test') console.error(error);
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large' });
    if (error instanceof SyntaxError && error.status === 400) return res.status(400).json({ error: 'Malformed JSON' });
    if (error.code === '23505') return res.status(409).json({ error: 'A record with this identifier already exists' });
    if (error.code === '23503' || error.code === '23514' || error.code === '22P02') return res.status(400).json({ error: 'Request violates a data constraint' });
    const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600 ? error.status : 500;
    const body = { error: status === 500 ? 'Internal server error' : error.message };
    if (error.details && status < 500) body.details = error.details;
    return res.status(status).json(body);
  });
  return app;
}

async function start() {
  validateConfig();
  const app = createApp();
  const port = Number(process.env.PORT || 3006);
  return app.listen(port, () => console.log(`SwarmShield backend running on port ${port}`));
}

if (require.main === module) {
  start().catch((error) => {
    console.error(error.message);
    pool.end().finally(() => { process.exitCode = 1; });
  });
}

module.exports = { createApp, start, validateConfig };
