import { useState, useEffect } from 'react';
import { Search, Radio, Eye, Volume2, Crosshair, Activity, X } from 'lucide-react';
import { apiFetch } from '../api';

type Track = {
  id: number; track_uid: string; classification: string; lat: number; lng: number;
  altitude_m: number; heading_deg: number; speed_kmh: number; fusion_confidence: number;
  contributing_sensors: string; sensor_count: number;
  rf_detected: boolean; radar_detected: boolean; eo_ir_detected: boolean; acoustic_detected: boolean;
  track_state: string; first_detected_at: string; last_update_at: string;
  signature_platform?: string;
};

const STATE_COLORS: Record<string, string> = { tentative: 'bg-yellow-500/20 text-yellow-300', confirmed: 'bg-red-500/20 text-red-300', lost: 'bg-gray-500/20 text-gray-300' };

export default function FusionTracksPage() {
  const [items, setItems] = useState<Track[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [state, setState] = useState('');
  const [minConf, setMinConf] = useState('');
  const [selected, setSelected] = useState<Track | null>(null);
  const [correlateInput, setCorrelateInput] = useState({ sensor_id: '', modality: 'rf' });

  async function load() {
    const p = new URLSearchParams();
    if (state) p.set('state', state);
    if (minConf) p.set('min_confidence', minConf);
    setItems(await apiFetch(`/fusion-tracks?${p}`));
  }
  async function loadSummary() { setSummary(await apiFetch('/fusion-tracks/active/summary')); }
  useEffect(() => { load(); }, [state, minConf]);
  useEffect(() => { loadSummary(); }, []);

  async function correlate() {
    if (!selected) return;
    const upd = await apiFetch(`/fusion-tracks/${selected.id}/correlate`, { method: 'POST', body: JSON.stringify(correlateInput) });
    setSelected(upd.track); load(); loadSummary();
  }
  async function promote(t: Track) { await apiFetch(`/fusion-tracks/${t.id}/promote`, { method: 'POST' }); load(); loadSummary(); }
  async function lost(t: Track) { await apiFetch(`/fusion-tracks/${t.id}/lost`, { method: 'POST' }); load(); loadSummary(); }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Fusion Tracks</h1>
          <p className="text-sm text-gray-400 mt-1">Multi-sensor correlated track picture (RF / radar / EO-IR / acoustic).</p>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">Active Tracks</div>
            <div className="text-2xl font-bold text-white">{summary.total_active}</div>
          </div>
          <div className="bg-gray-900 border border-red-800 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">Confirmed</div>
            <div className="text-2xl font-bold text-red-400">{summary.by_state.confirmed || 0}</div>
          </div>
          <div className="bg-gray-900 border border-yellow-800 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">Tentative</div>
            <div className="text-2xl font-bold text-yellow-400">{summary.by_state.tentative || 0}</div>
          </div>
          <div className="bg-gray-900 border border-green-800 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">High-Confidence (&gt;85%)</div>
            <div className="text-2xl font-bold text-green-400">{summary.by_confidence.high}</div>
          </div>
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <select value={state} onChange={e => setState(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
          <option value="">All States</option><option value="tentative">Tentative</option><option value="confirmed">Confirmed</option><option value="lost">Lost</option>
        </select>
        <input placeholder="Min confidence (0-1)" value={minConf} onChange={e => setMinConf(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
      </div>

      <div className="grid gap-3">
        {items.map(t => (
          <div key={t.id} onClick={() => setSelected(t)} className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-red-800 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-gray-500">{t.track_uid}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATE_COLORS[t.track_state]}`}>{t.track_state}</span>
                  <span className="text-xs text-violet-300 font-bold">{(Number(t.fusion_confidence) * 100).toFixed(0)}%</span>
                </div>
                <h3 className="font-semibold text-white">{t.classification || t.signature_platform || 'Unclassified'}</h3>
                <p className="text-xs text-gray-400 mt-1">
                  {Number(t.lat).toFixed(4)},{Number(t.lng).toFixed(4)} • alt {t.altitude_m}m • hdg {t.heading_deg}° • {t.speed_kmh} km/h
                </p>
                <div className="flex gap-2 mt-2">
                  {t.rf_detected && <span className="text-xs flex items-center gap-1 text-blue-300"><Radio size={11} />RF</span>}
                  {t.radar_detected && <span className="text-xs flex items-center gap-1 text-cyan-300"><Activity size={11} />radar</span>}
                  {t.eo_ir_detected && <span className="text-xs flex items-center gap-1 text-orange-300"><Eye size={11} />EO/IR</span>}
                  {t.acoustic_detected && <span className="text-xs flex items-center gap-1 text-purple-300"><Volume2 size={11} />acoustic</span>}
                  <span className="text-xs text-gray-500">{t.sensor_count} sensors</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-6" onClick={() => setSelected(null)}>
          <div className="bg-gray-900 rounded-xl border border-red-800 max-w-2xl w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white font-mono">{selected.track_uid}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div><span className="text-gray-500">Classification:</span> <span className="text-white">{selected.classification}</span></div>
              <div><span className="text-gray-500">State:</span> <span className="text-white">{selected.track_state}</span></div>
              <div><span className="text-gray-500">Confidence:</span> <span className="text-violet-300 font-bold">{(Number(selected.fusion_confidence) * 100).toFixed(1)}%</span></div>
              <div><span className="text-gray-500">Sensors:</span> <span className="text-white">{selected.contributing_sensors}</span></div>
              <div><span className="text-gray-500">Lat/Lng:</span> <span className="text-white">{Number(selected.lat).toFixed(4)},{Number(selected.lng).toFixed(4)}</span></div>
              <div><span className="text-gray-500">Altitude:</span> <span className="text-white">{selected.altitude_m} m</span></div>
              <div><span className="text-gray-500">Heading:</span> <span className="text-white">{selected.heading_deg}°</span></div>
              <div><span className="text-gray-500">Speed:</span> <span className="text-white">{selected.speed_kmh} km/h</span></div>
            </div>
            <div className="bg-gray-800 p-3 rounded-lg mb-4">
              <p className="text-xs text-gray-400 mb-2">Correlate new sensor contact:</p>
              <div className="flex gap-2">
                <input placeholder="sensor_id" value={correlateInput.sensor_id} onChange={e => setCorrelateInput({ ...correlateInput, sensor_id: e.target.value })} className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs flex-1" />
                <select value={correlateInput.modality} onChange={e => setCorrelateInput({ ...correlateInput, modality: e.target.value })} className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs">
                  <option value="rf">RF</option><option value="radar">Radar</option><option value="eo_ir">EO/IR</option><option value="acoustic">Acoustic</option>
                </select>
                <button onClick={correlate} className="bg-violet-700 hover:bg-violet-800 text-white px-3 py-1 rounded text-xs">Correlate</button>
              </div>
            </div>
            <div className="flex gap-2">
              {selected.track_state === 'tentative' && <button onClick={() => { promote(selected); setSelected(null); }} className="bg-red-700 hover:bg-red-800 text-white px-3 py-2 rounded text-sm flex items-center gap-1"><Crosshair size={14} />Promote → Confirmed</button>}
              {selected.track_state !== 'lost' && <button onClick={() => { lost(selected); setSelected(null); }} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm">Mark Lost</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
