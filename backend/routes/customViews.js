// Custom Views — Counter-Swarm Defense (defensive security research)
//
// 4 endpoints:
//   GET  /api/custom-views/threat-detection-timeline      (VIZ)  time-bucketed threat detections
//   GET  /api/custom-views/sensor-coverage-heatmap        (VIZ)  zone x sensor-type coverage matrix
//   GET  /api/custom-views/engagement-report.pdf          (NON)  PDF after-action engagement report
//   GET/POST/PUT/DELETE /api/custom-views/roe-editor[/:id] (NON) ROE rule CRUD editor
//
// All endpoints require a valid bearer token.

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// ---------------------------------------------------------------------------
// VIZ 1: Threat Detection Timeline
//   Buckets threats by hour (default last 24h) and groups by classification.
// ---------------------------------------------------------------------------
router.get('/threat-detection-timeline', async (req, res) => {
  try {
    const hours = Math.max(1, Math.min(168, parseInt(req.query.hours || '24', 10)));
    const bucketMins = Math.max(15, Math.min(360, parseInt(req.query.bucket_minutes || '60', 10)));
    const q = `
      WITH bounds AS (
        SELECT NOW() - ($1 || ' hours')::interval AS lo, NOW() AS hi
      ),
      buckets AS (
        SELECT generate_series(
          date_trunc('hour', (SELECT lo FROM bounds)),
          (SELECT hi FROM bounds),
          ($2 || ' minutes')::interval
        ) AS bucket_start
      )
      SELECT
        b.bucket_start,
        COALESCE(SUM(CASE WHEN t.classification_group = 'group_1' THEN 1 ELSE 0 END), 0)::int AS group_1,
        COALESCE(SUM(CASE WHEN t.classification_group = 'group_2' THEN 1 ELSE 0 END), 0)::int AS group_2,
        COALESCE(SUM(CASE WHEN t.classification_group IS NULL OR t.classification_group NOT IN ('group_1','group_2') THEN 1 ELSE 0 END), 0)::int AS other,
        COALESCE(COUNT(t.id), 0)::int AS total,
        COALESCE(SUM(t.drone_count), 0)::int AS drone_count,
        COALESCE(AVG(t.threat_level), 0)::float AS avg_threat_level
      FROM buckets b
      LEFT JOIN threats t
        ON t.detected_at >= b.bucket_start
       AND t.detected_at <  b.bucket_start + ($2 || ' minutes')::interval
      GROUP BY b.bucket_start
      ORDER BY b.bucket_start ASC;
    `;
    const r = await pool.query(q, [String(hours), String(bucketMins)]);
    res.json({
      hours, bucket_minutes: bucketMins,
      generated_at: new Date().toISOString(),
      series: r.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// VIZ 2: Sensor Coverage Heatmap
//   Cross-tab of defense_zones x sensor type — counts, online sensors,
//   total range km, and average battery, so the UI can render a heatmap.
// ---------------------------------------------------------------------------
router.get('/sensor-coverage-heatmap', async (req, res) => {
  try {
    const zonesQ = `SELECT name, zone_type, security_level, area_km2 FROM defense_zones ORDER BY name`;
    const sensorsQ = `
      SELECT location AS zone_name,
             type AS sensor_type,
             COUNT(*)::int AS sensor_count,
             SUM(CASE WHEN status='online' THEN 1 ELSE 0 END)::int AS online_count,
             COALESCE(SUM(range_km), 0)::float AS total_range_km,
             COALESCE(AVG(battery_pct), 0)::float AS avg_battery_pct,
             COALESCE(SUM(detections_today), 0)::int AS detections_today
      FROM sensors
      GROUP BY location, type
    `;
    const [zonesR, sensorsR] = await Promise.all([pool.query(zonesQ), pool.query(sensorsQ)]);
    const zones = zonesR.rows.map(z => z.name);
    const types = Array.from(new Set(sensorsR.rows.map(r => r.sensor_type))).sort();
    // Build matrix [zone][type] -> cell, with totals.
    const grid = {};
    for (const z of zones) {
      grid[z] = {};
      for (const t of types) {
        grid[z][t] = { sensor_count: 0, online_count: 0, total_range_km: 0, avg_battery_pct: 0, detections_today: 0 };
      }
    }
    for (const row of sensorsR.rows) {
      if (!grid[row.zone_name]) {
        grid[row.zone_name] = {};
        for (const t of types) grid[row.zone_name][t] = { sensor_count: 0, online_count: 0, total_range_km: 0, avg_battery_pct: 0, detections_today: 0 };
        zones.push(row.zone_name);
      }
      grid[row.zone_name][row.sensor_type] = {
        sensor_count: Number(row.sensor_count) || 0,
        online_count: Number(row.online_count) || 0,
        total_range_km: Number(row.total_range_km) || 0,
        avg_battery_pct: Number(row.avg_battery_pct) || 0,
        detections_today: Number(row.detections_today) || 0,
      };
    }
    // Per-zone totals for ranking
    const zoneTotals = zones.map(z => {
      const cells = Object.values(grid[z] || {});
      const sensor_count = cells.reduce((a, c) => a + (c.sensor_count || 0), 0);
      const online_count = cells.reduce((a, c) => a + (c.online_count || 0), 0);
      const total_range_km = cells.reduce((a, c) => a + (c.total_range_km || 0), 0);
      const zoneMeta = zonesR.rows.find(r => r.name === z) || {};
      return {
        zone: z, sensor_count, online_count, total_range_km,
        zone_type: zoneMeta.zone_type, security_level: zoneMeta.security_level,
        area_km2: zoneMeta.area_km2 ? Number(zoneMeta.area_km2) : null,
        coverage_density: zoneMeta.area_km2 && Number(zoneMeta.area_km2) > 0
          ? Number((sensor_count / Number(zoneMeta.area_km2)).toFixed(3)) : null,
      };
    }).sort((a, b) => b.sensor_count - a.sensor_count);

    res.json({
      generated_at: new Date().toISOString(),
      zones, sensor_types: types, grid, zone_totals: zoneTotals,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// NON-VIZ 1: Engagement Report PDF
//   Builds a minimal but valid PDF (single-page text) summarizing engagements.
//   No external pdf dependency — keeps the surface small and predictable.
// ---------------------------------------------------------------------------
function escapePdfText(s) {
  return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildPdfBuffer(lines) {
  // Minimal single-page PDF. Helvetica, 11pt, leading 14.
  const header = '%PDF-1.4\n';
  const objs = [];
  const push = (s) => { objs.push(s); };

  push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  push('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n');

  let content = 'BT\n/F1 11 Tf\n14 TL\n40 760 Td\n';
  for (let i = 0; i < lines.length; i++) {
    const line = escapePdfText(lines[i]).slice(0, 250);
    if (i === 0) content += `(${line}) Tj\n`;
    else content += `T*\n(${line}) Tj\n`;
  }
  content += 'ET\n';
  const stream = `4 0 obj\n<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}endstream\nendobj\n`;
  push(stream);
  push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

  // Assemble body and xref offsets.
  let body = '';
  const offsets = [0];
  let cursor = header.length;
  for (const o of objs) {
    offsets.push(cursor);
    body += o;
    cursor += Buffer.byteLength(o, 'utf8');
  }
  const xrefStart = header.length + Buffer.byteLength(body, 'utf8');
  let xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objs.length; i++) {
    xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  const trailer = `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(header + body + xref + trailer, 'utf8');
}

router.get('/engagement-report.pdf', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit || '15', 10)));
    const rowsR = await pool.query(`
      SELECT e.engagement_uid, e.current_phase, e.outcome, e.drones_engaged, e.drones_killed,
             e.pk_estimate, e.expected_cost_usd, e.authorizing_officer, e.started_at, e.closed_at,
             c.name AS effector_name, c.type AS effector_type,
             t.platform_model, t.classification_group, t.zone_name, t.threat_level
      FROM engagements e
      LEFT JOIN countermeasures c ON c.id = e.countermeasure_id
      LEFT JOIN threats t ON t.id = e.threat_id
      ORDER BY e.started_at DESC
      LIMIT $1
    `, [limit]);
    const summaryR = await pool.query(`
      SELECT COUNT(*)::int AS total,
             SUM(CASE WHEN outcome='neutralized' THEN 1 ELSE 0 END)::int AS neutralized,
             SUM(CASE WHEN outcome='pending' THEN 1 ELSE 0 END)::int AS pending,
             SUM(drones_engaged)::int AS drones_engaged,
             SUM(drones_killed)::int AS drones_killed,
             COALESCE(AVG(pk_estimate),0)::float AS avg_pk,
             COALESCE(SUM(expected_cost_usd),0)::float AS total_cost_usd
      FROM engagements
    `);
    const s = summaryR.rows[0] || {};
    const lines = [
      'SwarmShield - Counter-Swarm Defense',
      'Engagement After-Action Report (defensive research)',
      `Generated: ${new Date().toISOString()}`,
      `Operator: ${req.user?.email || 'n/a'}`,
      '',
      'Summary',
      `  Total engagements: ${s.total}    Neutralized: ${s.neutralized}    Pending: ${s.pending}`,
      `  Drones engaged: ${s.drones_engaged}    Drones killed: ${s.drones_killed}`,
      `  Avg Pk: ${Number(s.avg_pk).toFixed(2)}    Expected total cost (M USD): ${Number(s.total_cost_usd).toFixed(2)}`,
      '',
      `Recent engagements (top ${rowsR.rows.length}):`
    ];
    for (const e of rowsR.rows) {
      lines.push(
        `${e.engagement_uid}  phase=${e.current_phase}  outcome=${e.outcome}  Pk=${e.pk_estimate}`
      );
      lines.push(
        `  zone=${e.zone_name || '-'}  platform=${e.platform_model || '-'}  effector=${e.effector_name || '-'}`
      );
      lines.push(
        `  engaged=${e.drones_engaged}/killed=${e.drones_killed}  officer=${e.authorizing_officer || '-'}`
      );
    }
    lines.push('');
    lines.push('END OF REPORT - For defensive security research use only.');
    const buf = buildPdfBuffer(lines);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="engagement-report-${Date.now()}.pdf"`);
    res.send(buf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// NON-VIZ 2: ROE editor (CRUD over roe_rules) — independent namespace from /api/roe.
// ---------------------------------------------------------------------------
router.get('/roe-editor', async (req, res) => {
  try {
    const { zone, active } = req.query;
    let q = 'SELECT * FROM roe_rules WHERE 1=1';
    const p = [];
    if (zone) { p.push(zone); q += ` AND zone_name = $${p.length}`; }
    if (active !== undefined) { p.push(active === 'true'); q += ` AND active = $${p.length}`; }
    q += ' ORDER BY rule_code ASC';
    res.json((await pool.query(q, p)).rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/roe-editor/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM roe_rules WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/roe-editor', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.rule_code || !b.zone_name) return res.status(400).json({ error: 'rule_code and zone_name required' });
    const r = await pool.query(
      `INSERT INTO roe_rules (rule_code,zone_name,min_threat_level,authorized_effector_types,requires_visual_id,requires_command_approval,collateral_check_required,active,description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,true),$9) RETURNING *`,
      [b.rule_code, b.zone_name, b.min_threat_level ?? 5, b.authorized_effector_types || 'jammer',
       !!b.requires_visual_id, !!b.requires_command_approval, !!b.collateral_check_required,
       b.active, b.description || '']
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/roe-editor/:id', async (req, res) => {
  try {
    const b = req.body || {};
    const cur = (await pool.query('SELECT * FROM roe_rules WHERE id=$1', [req.params.id])).rows[0];
    if (!cur) return res.status(404).json({ error: 'Not found' });
    const merged = { ...cur, ...b };
    const r = await pool.query(
      `UPDATE roe_rules SET rule_code=$1,zone_name=$2,min_threat_level=$3,authorized_effector_types=$4,
        requires_visual_id=$5,requires_command_approval=$6,collateral_check_required=$7,active=$8,description=$9
       WHERE id=$10 RETURNING *`,
      [merged.rule_code, merged.zone_name, merged.min_threat_level, merged.authorized_effector_types,
       !!merged.requires_visual_id, !!merged.requires_command_approval, !!merged.collateral_check_required,
       !!merged.active, merged.description, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/roe-editor/:id', async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM roe_rules WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, id: r.rows[0].id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
