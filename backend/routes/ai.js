const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

async function callAI(userPrompt, systemPrompt = '') {
  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'http://localhost', 'X-Title': 'SwarmShield' },
    body: JSON.stringify({ model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5', messages: [...(systemPrompt ? [{role:'system',content:systemPrompt}] : []), {role:'user',content:userPrompt}] })
  });
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || 'AI unavailable';
}

router.post('/threat-analysis', verifyToken, async (req, res) => {
  try {
    const { threat } = req.body;
    const result = await callAI(
      `Analyze this drone threat: ${JSON.stringify(threat)}`,
      'You are a counter-drone defense AI analyst. Analyze the threat pattern, predict behavior trajectory, assess threat level, and recommend immediate response actions. Be specific and tactical.'
    );
    res.json({ result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/countermeasure-recommendation', verifyToken, async (req, res) => {
  try {
    const { threat_type, threat_level, available_countermeasures } = req.body;
    const result = await callAI(
      `Threat type: ${threat_type}, Level: ${threat_level}\nAvailable countermeasures: ${available_countermeasures}`,
      'You are a counter-drone defense systems expert. Recommend the optimal countermeasure deployment strategy, including primary and secondary options, deployment sequence, and expected success probability. Consider cost-effectiveness.'
    );
    res.json({ result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/incident-report', verifyToken, async (req, res) => {
  try {
    const { incident } = req.body;
    const result = await callAI(
      `Generate incident report for: ${JSON.stringify(incident)}`,
      'You are a defense incident documentation specialist. Generate a detailed, professional incident report including executive summary, timeline, threat assessment, response evaluation, casualties/damage, lessons learned, and recommendations.'
    );
    res.json({ result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/swarm-prediction', verifyToken, async (req, res) => {
  try {
    const { recent_threats } = req.body;
    const result = await callAI(
      `Recent threat data: ${JSON.stringify(recent_threats)}`,
      'You are a drone swarm pattern analysis AI. Based on historical threat data, predict next attack patterns including likely timing, attack vectors, swarm size, coordination tactics, and vulnerable zones. Provide actionable intelligence.'
    );
    res.json({ result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
