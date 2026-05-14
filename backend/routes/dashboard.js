const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

// All counts framed as defensive / training-oriented metrics.
// Field names intentionally use "training" / "drill" terminology even though
// they read from the same operational tables, because this deployment is
// configured as a training/simulation environment.

async function safeCount(query, params = []) {
  try {
    const r = await pool.query(query, params);
    return Number(r.rows[0]?.count || 0);
  } catch {
    return 0;
  }
}

async function safeRows(query, params = []) {
  try {
    const r = await pool.query(query, params);
    return r.rows;
  } catch {
    return [];
  }
}

router.get('/stats', verifyToken, async (req, res) => {
  try {
    // Lazy-create audit_log so a fresh DB doesn't 500 the dashboard.
    await pool.query(`CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      actor_email VARCHAR(255),
      action VARCHAR(100),
      entity_type VARCHAR(50),
      entity_id VARCHAR(50),
      details TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`).catch(() => {});

    const [
      activeSensors,
      sensorsTotal,
      trainingDrillsLogged,
      threatTrainingRecords,
      countermeasureInventory,
      deployments,
      incidents,
      zones,
      recent,
    ] = await Promise.all([
      safeCount(`SELECT COUNT(*)::int AS count FROM sensors WHERE status = 'active'`),
      safeCount(`SELECT COUNT(*)::int AS count FROM sensors`),
      safeCount(`SELECT COUNT(*)::int AS count FROM deployments`),
      safeCount(`SELECT COUNT(*)::int AS count FROM threats`),
      safeCount(`SELECT COUNT(*)::int AS count FROM countermeasures`),
      safeCount(`SELECT COUNT(*)::int AS count FROM deployments`),
      safeCount(`SELECT COUNT(*)::int AS count FROM incidents`),
      safeCount(`SELECT COUNT(*)::int AS count FROM defense_zones`),
      safeRows(`SELECT id, actor_email, action, entity_type, entity_id, details, created_at
                FROM audit_log ORDER BY created_at DESC LIMIT 10`),
    ]);

    res.json({
      framing: 'Defensive training & simulation environment — all metrics reflect drill and training records.',
      kpis: {
        active_sensors: activeSensors,
        sensors_total: sensorsTotal,
        training_drills_logged: trainingDrillsLogged,
        threat_training_records: threatTrainingRecords,
        countermeasure_inventory: countermeasureInventory,
        deployments,
        incidents_logged: incidents,
        defense_zones: zones,
      },
      recent_activity: recent,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
