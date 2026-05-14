// Threat Signatures Library — real C-UAS threat catalog with classifier.
//
// Endpoints:
//   GET    /api/threat-signatures               list (filters: group, jam_resistance, search)
//   GET    /api/threat-signatures/:id           single signature
//   POST   /api/threat-signatures               create
//   PUT    /api/threat-signatures/:id           update
//   DELETE /api/threat-signatures/:id           delete
//   POST   /api/threat-signatures/classify      classify observation -> ranked signature matches
//   GET    /api/threat-signatures/stats         aggregate stats by group/manufacturer

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const { search, dod_group, jam_resistance } = req.query;
    let q = 'SELECT * FROM threat_signatures WHERE 1=1';
    const p = [];
    if (search) { p.push(`%${search}%`); q += ` AND (platform_name ILIKE $${p.length} OR manufacturer ILIKE $${p.length} OR rf_protocol ILIKE $${p.length})`; }
    if (dod_group) { p.push(dod_group); q += ` AND dod_group = $${p.length}`; }
    if (jam_resistance) { p.push(jam_resistance); q += ` AND jam_resistance = $${p.length}`; }
    q += ' ORDER BY threat_priority ASC, platform_name ASC';
    res.json((await pool.query(q, p)).rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats', async (_req, res) => {
  try {
    const byGroup = await pool.query(
      `SELECT dod_group, COUNT(*) AS count, ROUND(AVG(threat_priority)::numeric, 2) AS avg_priority
       FROM threat_signatures GROUP BY dod_group ORDER BY dod_group`
    );
    const byJam = await pool.query(
      `SELECT jam_resistance, COUNT(*) AS count FROM threat_signatures GROUP BY jam_resistance`
    );
    const byCountry = await pool.query(
      `SELECT country_of_origin, COUNT(*) AS count FROM threat_signatures GROUP BY country_of_origin ORDER BY count DESC`
    );
    const totals = await pool.query(`SELECT COUNT(*) AS total FROM threat_signatures`);
    res.json({ total: parseInt(totals.rows[0].total, 10), by_group: byGroup.rows, by_jam_resistance: byJam.rows, by_country: byCountry.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM threat_signatures WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    const r = await pool.query(
      `INSERT INTO threat_signatures (platform_name,manufacturer,country_of_origin,dod_group,mtow_kg,wingspan_m,cruise_speed_kmh,max_range_km,rf_protocol,rf_band,radar_cross_section_m2,ir_signature,acoustic_signature_db,payload_capacity_kg,warhead_kg,autonomy_level,jam_resistance,threat_priority,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
      [b.platform_name, b.manufacturer, b.country_of_origin, b.dod_group, b.mtow_kg, b.wingspan_m, b.cruise_speed_kmh, b.max_range_km, b.rf_protocol, b.rf_band, b.radar_cross_section_m2, b.ir_signature, b.acoustic_signature_db, b.payload_capacity_kg, b.warhead_kg, b.autonomy_level, b.jam_resistance, b.threat_priority || 5, b.notes]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const b = req.body || {};
    const r = await pool.query(
      `UPDATE threat_signatures SET platform_name=$1,manufacturer=$2,country_of_origin=$3,dod_group=$4,mtow_kg=$5,wingspan_m=$6,cruise_speed_kmh=$7,max_range_km=$8,rf_protocol=$9,rf_band=$10,radar_cross_section_m2=$11,ir_signature=$12,acoustic_signature_db=$13,payload_capacity_kg=$14,warhead_kg=$15,autonomy_level=$16,jam_resistance=$17,threat_priority=$18,notes=$19 WHERE id=$20 RETURNING *`,
      [b.platform_name, b.manufacturer, b.country_of_origin, b.dod_group, b.mtow_kg, b.wingspan_m, b.cruise_speed_kmh, b.max_range_km, b.rf_protocol, b.rf_band, b.radar_cross_section_m2, b.ir_signature, b.acoustic_signature_db, b.payload_capacity_kg, b.warhead_kg, b.autonomy_level, b.jam_resistance, b.threat_priority, b.notes, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM threat_signatures WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Classify an observation against the library — multi-feature scoring.
router.post('/classify', async (req, res) => {
  try {
    const obs = req.body || {};
    const rows = (await pool.query('SELECT * FROM threat_signatures')).rows;

    function scoreSig(sig) {
      let score = 0;
      const reasons = [];
      // RF protocol/band match (heaviest signal)
      if (obs.rf_protocol && sig.rf_protocol && sig.rf_protocol.toLowerCase().includes(obs.rf_protocol.toLowerCase())) {
        score += 0.35; reasons.push(`RF protocol match: ${sig.rf_protocol}`);
      }
      if (obs.rf_band && sig.rf_band && sig.rf_band.toLowerCase().includes(obs.rf_band.toLowerCase())) {
        score += 0.15; reasons.push(`RF band match: ${sig.rf_band}`);
      }
      // RCS proximity
      if (obs.radar_cross_section_m2 != null && sig.radar_cross_section_m2 != null) {
        const obsR = Number(obs.radar_cross_section_m2);
        const sigR = Number(sig.radar_cross_section_m2);
        const ratio = Math.min(obsR, sigR) / Math.max(obsR, sigR);
        if (ratio > 0.5) { score += 0.15 * ratio; reasons.push(`RCS within ${Math.round(ratio*100)}% of ${sigR} m²`); }
      }
      // Speed window
      if (obs.speed_kmh != null && sig.cruise_speed_kmh != null) {
        const delta = Math.abs(Number(obs.speed_kmh) - Number(sig.cruise_speed_kmh));
        if (delta < 25) { score += 0.10; reasons.push(`Speed within ${delta.toFixed(0)} km/h of ${sig.cruise_speed_kmh}`); }
      }
      // Acoustic dB
      if (obs.acoustic_db != null && sig.acoustic_signature_db != null) {
        const delta = Math.abs(Number(obs.acoustic_db) - Number(sig.acoustic_signature_db));
        if (delta < 8) { score += 0.10; reasons.push(`Acoustic within ${delta.toFixed(1)} dB`); }
      }
      // MTOW window
      if (obs.mtow_kg != null && sig.mtow_kg != null) {
        const obsW = Number(obs.mtow_kg); const sigW = Number(sig.mtow_kg);
        const ratio = Math.min(obsW, sigW) / Math.max(obsW, sigW);
        if (ratio > 0.5) { score += 0.10 * ratio; reasons.push(`MTOW within ${Math.round(ratio*100)}% of ${sigW} kg`); }
      }
      // Autonomy + group hints
      if (obs.autonomy_level && sig.autonomy_level === obs.autonomy_level) { score += 0.05; reasons.push(`Autonomy match: ${sig.autonomy_level}`); }
      return { score: Math.min(score, 1.0), reasons };
    }

    const ranked = rows.map(sig => {
      const { score, reasons } = scoreSig(sig);
      return {
        signature_id: sig.id,
        platform_name: sig.platform_name,
        manufacturer: sig.manufacturer,
        country: sig.country_of_origin,
        dod_group: sig.dod_group,
        jam_resistance: sig.jam_resistance,
        threat_priority: sig.threat_priority,
        confidence: Number(score.toFixed(3)),
        reasons,
      };
    }).filter(r => r.confidence > 0).sort((a, b) => b.confidence - a.confidence).slice(0, 5);

    res.json({
      observation: obs,
      top_matches: ranked,
      classification: ranked[0] ? {
        platform: ranked[0].platform_name,
        confidence: ranked[0].confidence,
        verdict: ranked[0].confidence > 0.55 ? 'high_confidence' : ranked[0].confidence > 0.30 ? 'medium_confidence' : 'low_confidence',
      } : { verdict: 'no_match' },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
