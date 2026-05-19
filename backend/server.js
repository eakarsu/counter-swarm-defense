require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
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

// Deep features (audit implementation 2026-05-14)
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

// Health endpoint (used by harness verification).
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'swarmshield', ts: new Date().toISOString() }));

// Custom Views — mounted BEFORE the 404/error handler.
app.use('/api/custom-views', require('./routes/customViews'));

// 404 for unmatched /api/* routes.
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found', path: req.path }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 3006;
app.listen(PORT, () => console.log(`SwarmShield backend running on port ${PORT}`));
