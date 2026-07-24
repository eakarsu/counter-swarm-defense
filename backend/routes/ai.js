const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const pool = require('../db');

async function callAI(userPrompt, systemPrompt = '') {
  const baseUrl = process.env.OPENROUTER_BASE_URL;
  if (baseUrl !== 'https://openrouter.ai/api/v1') {
    throw Object.assign(new Error('OpenRouter is not configured'), { status: 503 });
  }
  if (!process.env.OPENROUTER_API_KEY || !process.env.OPENROUTER_MODEL) {
    throw Object.assign(new Error('OpenRouter is not configured'), { status: 503 });
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.OPENROUTER_TIMEOUT_MS || 120000));
  let resp;
  try {
    resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'http://localhost', 'X-Title': 'SwarmShield' },
      body: JSON.stringify({ model: process.env.OPENROUTER_MODEL, messages: [...(systemPrompt ? [{role:'system',content:systemPrompt}] : []), {role:'user',content:userPrompt}] }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  const data = await resp.json().catch(() => null);
  if (!resp.ok) throw Object.assign(new Error('OpenRouter request failed'), { status: 502 });
  const result = data?.choices?.[0]?.message?.content;
  if (typeof result !== 'string' || !result.trim() || typeof data?.id !== 'string' || !data.id.trim()) {
    throw Object.assign(new Error('OpenRouter returned an incomplete response'), { status: 502 });
  }
  return {
    result: result.trim(),
    model: data.model || process.env.OPENROUTER_MODEL,
    provider: 'openrouter',
    providerReceipt: data.id,
    usage: data.usage || null,
  };
}

router.post('/threat-analysis', verifyToken, async (req, res) => {
  try {
    const { threat } = req.body;
    const { result } = await callAI(
      `Analyze this drone threat: ${JSON.stringify(threat)}`,
      'You are a counter-drone defense AI analyst. Analyze the threat pattern, predict behavior trajectory, assess threat level, and recommend immediate response actions. Be specific and tactical.'
    );
    res.json({ result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/countermeasure-recommendation', verifyToken, async (req, res) => {
  try {
    const { threat_type, threat_level, available_countermeasures } = req.body;
    const { result } = await callAI(
      `Threat type: ${threat_type}, Level: ${threat_level}\nAvailable countermeasures: ${available_countermeasures}`,
      'You are a counter-drone defense systems expert. Recommend the optimal countermeasure deployment strategy, including primary and secondary options, deployment sequence, and expected success probability. Consider cost-effectiveness.'
    );
    res.json({ result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/incident-report', verifyToken, async (req, res) => {
  try {
    const { incident } = req.body;
    const { result } = await callAI(
      `Generate incident report for: ${JSON.stringify(incident)}`,
      'You are a defense incident documentation specialist. Generate a detailed, professional incident report including executive summary, timeline, threat assessment, response evaluation, casualties/damage, lessons learned, and recommendations.'
    );
    res.json({ result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/swarm-prediction', verifyToken, async (req, res) => {
  try {
    const { recent_threats } = req.body;
    const { result } = await callAI(
      `Recent threat data: ${JSON.stringify(recent_threats)}`,
      'You are a drone swarm pattern analysis AI. Based on historical threat data, predict next attack patterns including likely timing, attack vectors, swarm size, coordination tactics, and vulnerable zones. Provide actionable intelligence.'
    );
    res.json({ result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/operational-risk-review', verifyToken, async (req, res, next) => {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  if (prompt.length < 20 || prompt.length > 4000) {
    return res.status(400).json({ error: 'prompt must contain between 20 and 4000 characters' });
  }
  try {
    const response = await callAI(prompt,
      'You are a defensive counter-swarm operations adviser. Provide bounded analysis only: cite uncertainty, preserve human approval, never authorize engagement or autonomous effector actions, and distinguish deterministic controls from advisory judgment.');
    await pool.query(
      `INSERT INTO runtime_ai_results
       (tenant_id,user_id,prompt,model,provider,provider_receipt,result,usage)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [req.user.tenant_id, req.user.id, prompt, response.model, response.provider,
        response.providerReceipt, response.result, response.usage],
    );
    return res.json(response);
  } catch (error) { return next(error); }
});

module.exports = router;
module.exports.callAI = callAI;
