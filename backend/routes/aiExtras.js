const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

const DEFENSIVE_FRAMING = 'IMPORTANT CONTEXT: This is a DEFENSIVE / EDUCATIONAL / TRAINING simulation tool for counter-swarm defense operators. Provide ONLY defensive, protective, and educational guidance. Do NOT provide offensive operational guidance, weapon construction, attack instructions, or anything that could harm people. Focus on detection, protection, training, awareness, and lawful defensive response.';

async function callAI(userPrompt, systemPrompt = '') {
  if (!process.env.OPENROUTER_API_KEY) {
    const err = new Error('AI service not configured');
    err.status = 503;
    throw err;
  }
  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'http://localhost', 'X-Title': 'SwarmShield' },
    body: JSON.stringify({ model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5', messages: [{ role: 'system', content: `${DEFENSIVE_FRAMING}\n\n${systemPrompt}` }, { role: 'user', content: userPrompt }] })
  });
  if (!resp.ok) {
    const err = new Error(`AI upstream error ${resp.status}`);
    err.status = 503;
    throw err;
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || 'AI unavailable';
}

function handleErr(res, err) {
  const status = err.status || 500;
  res.status(status).json({ error: err.message });
}

// 1. Threat-trajectory predictor (defensive)
router.post('/trajectory-prediction', verifyToken, async (req, res) => {
  try {
    const { lat, lng, altitude_m, speed_kmh, heading_deg, threat_type, time_horizon_min } = req.body;
    const result = await callAI(
      `Threat track:\n- Position (lat,lng): ${lat}, ${lng}\n- Altitude: ${altitude_m} m\n- Speed: ${speed_kmh} km/h\n- Heading: ${heading_deg ?? 'unknown'} deg\n- Threat type: ${threat_type}\n- Forecast horizon: ${time_horizon_min || 5} minutes\n\nProject the most likely future positions of this incoming threat over the requested horizon, list zones that would be under risk, and recommend protective sensor coverage and defensive interception geometry. Educational/defensive simulation only.`,
      'You are a defensive trajectory analyst for a counter-swarm protection simulation. Output (1) projected waypoints with timestamps, (2) at-risk friendly zones, (3) recommended defensive sensor focus, (4) suggested defensive intercept geometry. Defensive framing only.'
    );
    res.json({ result });
  } catch (err) { handleErr(res, err); }
});

// 2. Swarm-formation classifier (defensive/educational)
router.post('/formation-classifier', verifyToken, async (req, res) => {
  try {
    const { drone_count, spread_m, altitude_band, speed_kmh, behavior_notes } = req.body;
    const result = await callAI(
      `Observed swarm:\n- Drone count: ${drone_count}\n- Spread: ${spread_m} m\n- Altitude band: ${altitude_band}\n- Speed: ${speed_kmh} km/h\n- Behavior: ${behavior_notes}\n\nClassify the formation pattern (e.g., column, V-wedge, distributed mesh, decoy + main), explain its tactical signature for defensive recognition training, and list defensive countermeasure categories that historically work against this pattern.`,
      'You are a swarm-formation classifier for defender training. Output: formation_label, confidence (low/medium/high), defensive recognition cues, recommended defensive countermeasure categories. Educational/defensive only.'
    );
    res.json({ result });
  } catch (err) { handleErr(res, err); }
});

// 3. Sensor-anomaly detector
router.post('/sensor-anomaly', verifyToken, async (req, res) => {
  try {
    const { sensors } = req.body;
    const result = await callAI(
      `Sensor telemetry snapshot:\n${JSON.stringify(sensors, null, 2)}\n\nIdentify sensors whose reported values are anomalous (battery drop, detection-rate spike, firmware drift, range degradation, offline pattern). Rank by severity and recommend defensive maintenance or recalibration steps.`,
      'You are a sensor-health anomaly detector for a defensive monitoring console. Output a ranked list of anomalies, each with sensor id/name, anomaly type, severity (low/med/high), and recommended defensive remediation. Educational/defensive only.'
    );
    res.json({ result });
  } catch (err) { handleErr(res, err); }
});

// 4. Response-priority scorer
router.post('/priority-scorer', verifyToken, async (req, res) => {
  try {
    const { threats } = req.body;
    const result = await callAI(
      `Active threats requiring defensive prioritization:\n${JSON.stringify(threats, null, 2)}\n\nProduce a defensive response priority queue. Score each threat 0-100 considering proximity to protected zones, drone count, threat level, speed, and altitude. Return ranked list with rationale and recommended defensive resource type.`,
      'You are a defensive response-priority scorer. Output a numbered queue. For each: threat_id, score (0-100), key drivers, recommended defensive resource type. Educational/defensive only.'
    );
    res.json({ result });
  } catch (err) { handleErr(res, err); }
});

// 5. Drill-scenario generator (training)
router.post('/drill-scenario', verifyToken, async (req, res) => {
  try {
    const { difficulty, focus_area, team_size, duration_min } = req.body;
    const result = await callAI(
      `Generate a defender training drill:\n- Difficulty: ${difficulty}\n- Focus area: ${focus_area}\n- Team size: ${team_size}\n- Duration: ${duration_min} minutes\n\nProduce a tabletop training scenario for counter-swarm defense operators with phased injects, learning objectives, success criteria, and after-action discussion prompts. Strictly defensive/training framing.`,
      'You are a defensive training scenario designer. Output: scenario title, learning objectives, phased injects (T+0, T+X), success criteria, debrief questions. Training/defensive only.'
    );
    res.json({ result });
  } catch (err) { handleErr(res, err); }
});

module.exports = router;
