// Fusion Tracks — multi-sensor correlated track store with track-state machine
//
// Endpoints:
//   GET    /api/fusion-tracks                       list (filters: state, classification, min_confidence)
//   GET    /api/fusion-tracks/:id                   single
//   POST   /api/fusion-tracks                       create
//   PUT    /api/fusion-tracks/:id                   update (position/heading/state)
//   POST   /api/fusion-tracks/:id/correlate         add a sensor contact -> re-score confidence
//   POST   /api/fusion-tracks/:id/promote           tentative -> confirmed
//   POST   /api/fusion-tracks/:id/lost              mark lost
//   DELETE /api/fusion-tracks/:id                   delete
//   GET    /api/fusion-tracks/active/summary        live operating picture

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

function computeConfidence(sensorCount, modalities) {
  // Three modalities (RF, radar, EO-IR, acoustic) -> base confidence rises with count.
  const modalityWeight = modalities.reduce((acc, m) => acc + (m ? 0.18 : 0), 0); // max 0.72 with all 4
  const countWeight = Math.min(sensorCount * 0.10, 0.40);
  return Math.min(Number((modalityWeight + countWeight + 0.10).toFixed(3)), 1.0);
}

router.get('/active/summary', async (_req, res) => {
  try {
    const tracks = (await pool.query(
      `SELECT t.*, s.platform_name FROM fusion_tracks t LEFT JOIN threat_signatures s ON s.id=t.signature_id
       WHERE track_state IN ('tentative','confirmed') ORDER BY fusion_confidence DESC NULLS LAST`
    )).rows;
    const byState = { tentative: 0, confirmed: 0, lost: 0 };
    let high = 0, mid = 0, low = 0;
    for (const t of tracks) {
      byState[t.track_state] = (byState[t.track_state] || 0) + 1;
      const c = Number(t.fusion_confidence) || 0;
      if (c > 0.85) high++; else if (c > 0.60) mid++; else low++;
    }
    res.json({
      total_active: tracks.length,
      by_state: byState,
      by_confidence: { high, mid, low },
      tracks: tracks.slice(0, 30),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/', async (req, res) => {
  try {
    const { state, classification, min_confidence } = req.query;
    let q = `SELECT t.*, s.platform_name AS signature_platform FROM fusion_tracks t LEFT JOIN threat_signatures s ON s.id=t.signature_id WHERE 1=1`;
    const p = [];
    if (state) { p.push(state); q += ` AND track_state = $${p.length}`; }
    if (classification) { p.push(`%${classification}%`); q += ` AND classification ILIKE $${p.length}`; }
    if (min_confidence) { p.push(min_confidence); q += ` AND fusion_confidence >= $${p.length}`; }
    q += ' ORDER BY last_update_at DESC';
    res.json((await pool.query(q, p)).rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT t.*, s.platform_name AS signature_platform, s.manufacturer AS signature_manufacturer
       FROM fusion_tracks t LEFT JOIN threat_signatures s ON s.id=t.signature_id WHERE t.id=$1`,
      [req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    const uid = b.track_uid || `TRK-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const modalities = [!!b.rf_detected, !!b.radar_detected, !!b.eo_ir_detected, !!b.acoustic_detected];
    const sensorCount = b.sensor_count != null ? b.sensor_count : modalities.filter(Boolean).length;
    const conf = b.fusion_confidence != null ? b.fusion_confidence : computeConfidence(sensorCount, modalities);
    const r = await pool.query(
      `INSERT INTO fusion_tracks (track_uid,threat_id,signature_id,contributing_sensors,sensor_count,fusion_confidence,classification,lat,lng,altitude_m,heading_deg,speed_kmh,rf_detected,radar_detected,eo_ir_detected,acoustic_detected,track_state)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [uid, b.threat_id, b.signature_id, b.contributing_sensors, sensorCount, conf, b.classification, b.lat, b.lng, b.altitude_m, b.heading_deg, b.speed_kmh, !!b.rf_detected, !!b.radar_detected, !!b.eo_ir_detected, !!b.acoustic_detected, b.track_state || (conf >= 0.7 ? 'confirmed' : 'tentative')]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const b = req.body || {};
    const r = await pool.query(
      `UPDATE fusion_tracks SET lat=COALESCE($1,lat), lng=COALESCE($2,lng), altitude_m=COALESCE($3,altitude_m),
       heading_deg=COALESCE($4,heading_deg), speed_kmh=COALESCE($5,speed_kmh), classification=COALESCE($6,classification),
       track_state=COALESCE($7,track_state), last_update_at=NOW() WHERE id=$8 RETURNING *`,
      [b.lat, b.lng, b.altitude_m, b.heading_deg, b.speed_kmh, b.classification, b.track_state, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/correlate', async (req, res) => {
  try {
    const { sensor_id, modality } = req.body || {};
    const cur = (await pool.query('SELECT * FROM fusion_tracks WHERE id=$1', [req.params.id])).rows[0];
    if (!cur) return res.status(404).json({ error: 'Not found' });
    const existing = (cur.contributing_sensors || '').split(',').filter(Boolean);
    if (sensor_id && !existing.includes(String(sensor_id))) existing.push(String(sensor_id));
    const flagPatch = {
      rf_detected: modality === 'rf' || cur.rf_detected,
      radar_detected: modality === 'radar' || cur.radar_detected,
      eo_ir_detected: modality === 'eo_ir' || cur.eo_ir_detected,
      acoustic_detected: modality === 'acoustic' || cur.acoustic_detected,
    };
    const modalities = [flagPatch.rf_detected, flagPatch.radar_detected, flagPatch.eo_ir_detected, flagPatch.acoustic_detected];
    const newConf = computeConfidence(existing.length, modalities);
    const newState = newConf >= 0.7 && cur.track_state === 'tentative' ? 'confirmed' : cur.track_state;
    const r = await pool.query(
      `UPDATE fusion_tracks SET contributing_sensors=$1, sensor_count=$2, fusion_confidence=$3,
       rf_detected=$4, radar_detected=$5, eo_ir_detected=$6, acoustic_detected=$7,
       track_state=$8, last_update_at=NOW() WHERE id=$9 RETURNING *`,
      [existing.join(','), existing.length, newConf, flagPatch.rf_detected, flagPatch.radar_detected, flagPatch.eo_ir_detected, flagPatch.acoustic_detected, newState, req.params.id]
    );
    res.json({ track: r.rows[0], confidence_delta: Number((newConf - Number(cur.fusion_confidence || 0)).toFixed(3)) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/promote', async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE fusion_tracks SET track_state='confirmed', last_update_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/lost', async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE fusion_tracks SET track_state='lost', last_update_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM fusion_tracks WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
