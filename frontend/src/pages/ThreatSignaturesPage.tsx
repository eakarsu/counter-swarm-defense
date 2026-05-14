import { useState, useEffect } from 'react';
import { Search, X, Radio, Shield, Crosshair } from 'lucide-react';
import { apiFetch } from '../api';

type Sig = {
  id: number; platform_name: string; manufacturer: string; country_of_origin: string;
  dod_group: string; mtow_kg: number; cruise_speed_kmh: number; max_range_km: number;
  rf_protocol: string; rf_band: string; radar_cross_section_m2: number; ir_signature: string;
  acoustic_signature_db: number; warhead_kg: number; autonomy_level: string;
  jam_resistance: string; threat_priority: number; notes: string;
};

const PRIORITY_COLORS: Record<number, string> = { 1: 'bg-red-600 text-white', 2: 'bg-orange-600 text-white', 3: 'bg-yellow-600 text-white', 4: 'bg-blue-600 text-white', 5: 'bg-gray-600 text-white', 6: 'bg-gray-700 text-gray-300' };
const JAM_COLORS: Record<string, string> = { high: 'bg-red-500/20 text-red-300', medium: 'bg-orange-500/20 text-orange-300', low: 'bg-green-500/20 text-green-300' };

export default function ThreatSignaturesPage() {
  const [items, setItems] = useState<Sig[]>([]);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('');
  const [jam, setJam] = useState('');
  const [selected, setSelected] = useState<Sig | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [classifyOpen, setClassifyOpen] = useState(false);
  const [obs, setObs] = useState({ rf_protocol: '', rf_band: '', radar_cross_section_m2: '', speed_kmh: '', acoustic_db: '', mtow_kg: '', autonomy_level: '' });
  const [classifyResult, setClassifyResult] = useState<any>(null);

  async function load() {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (group) p.set('dod_group', group);
    if (jam) p.set('jam_resistance', jam);
    setItems(await apiFetch(`/threat-signatures?${p}`));
  }
  async function loadStats() { setStats(await apiFetch('/threat-signatures/stats')); }
  useEffect(() => { load(); }, [search, group, jam]);
  useEffect(() => { loadStats(); }, []);

  async function runClassify() {
    const body: any = {};
    for (const [k, v] of Object.entries(obs)) if (v !== '') body[k] = isNaN(Number(v)) ? v : Number(v);
    setClassifyResult(await apiFetch('/threat-signatures/classify', { method: 'POST', body: JSON.stringify(body) }));
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Threat Signatures</h1>
          <p className="text-sm text-gray-400 mt-1">Real C-UAS adversary catalog — DOD Group classification, RF/RCS/IR/acoustic profiles.</p>
        </div>
        <button onClick={() => setClassifyOpen(true)} className="bg-violet-700 hover:bg-violet-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
          <Crosshair size={16} />Classify Observation
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">Catalog Size</div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </div>
          {stats.by_group.map((g: any) => (
            <div key={g.dod_group} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">{g.dod_group}</div>
              <div className="text-2xl font-bold text-white">{g.count}</div>
              <div className="text-xs text-gray-400">avg priority {g.avg_priority}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search platform, manufacturer, protocol..." className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-white text-sm" />
        </div>
        <select value={group} onChange={e => setGroup(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
          <option value="">All Groups</option><option value="group_1">Group 1 (&lt;20 lb)</option><option value="group_2">Group 2 (21-55 lb)</option><option value="group_3">Group 3 (&lt;1320 lb)</option>
        </select>
        <select value={jam} onChange={e => setJam(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
          <option value="">Any Jam-Resist</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
      </div>

      <div className="grid gap-3">
        {items.map(s => (
          <div key={s.id} onClick={() => setSelected(s)} className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-violet-700 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[s.threat_priority] || 'bg-gray-700'}`}>P{s.threat_priority}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">{s.dod_group}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${JAM_COLORS[s.jam_resistance] || 'bg-gray-700'}`}>jam-{s.jam_resistance}</span>
                  <span className="text-xs text-gray-500">{s.country_of_origin}</span>
                </div>
                <h3 className="font-semibold text-white">{s.platform_name}</h3>
                <p className="text-xs text-gray-400 mt-1">
                  {s.manufacturer} • MTOW {s.mtow_kg}kg • cruise {s.cruise_speed_kmh}km/h • range {s.max_range_km}km • RCS {s.radar_cross_section_m2}m²
                </p>
                <p className="text-xs text-gray-500 mt-1">RF: {s.rf_protocol} ({s.rf_band})</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-6" onClick={() => setSelected(null)}>
          <div className="bg-gray-900 rounded-xl border border-violet-800 max-w-2xl w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">{selected.platform_name}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Manufacturer:</span> <span className="text-white">{selected.manufacturer}</span></div>
              <div><span className="text-gray-500">Country:</span> <span className="text-white">{selected.country_of_origin}</span></div>
              <div><span className="text-gray-500">DOD Group:</span> <span className="text-white">{selected.dod_group}</span></div>
              <div><span className="text-gray-500">MTOW:</span> <span className="text-white">{selected.mtow_kg} kg</span></div>
              <div><span className="text-gray-500">Speed:</span> <span className="text-white">{selected.cruise_speed_kmh} km/h</span></div>
              <div><span className="text-gray-500">Range:</span> <span className="text-white">{selected.max_range_km} km</span></div>
              <div><span className="text-gray-500">RF Protocol:</span> <span className="text-white">{selected.rf_protocol}</span></div>
              <div><span className="text-gray-500">RF Band:</span> <span className="text-white">{selected.rf_band}</span></div>
              <div><span className="text-gray-500">RCS:</span> <span className="text-white">{selected.radar_cross_section_m2} m²</span></div>
              <div><span className="text-gray-500">IR Signature:</span> <span className="text-white">{selected.ir_signature}</span></div>
              <div><span className="text-gray-500">Acoustic:</span> <span className="text-white">{selected.acoustic_signature_db} dB</span></div>
              <div><span className="text-gray-500">Warhead:</span> <span className="text-white">{selected.warhead_kg} kg</span></div>
              <div><span className="text-gray-500">Autonomy:</span> <span className="text-white">{selected.autonomy_level}</span></div>
              <div><span className="text-gray-500">Jam Resistance:</span> <span className="text-white">{selected.jam_resistance}</span></div>
            </div>
            {selected.notes && <p className="mt-4 text-sm text-gray-300 bg-gray-800 p-3 rounded-lg">{selected.notes}</p>}
          </div>
        </div>
      )}

      {classifyOpen && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-6" onClick={() => { setClassifyOpen(false); setClassifyResult(null); }}>
          <div className="bg-gray-900 rounded-xl border border-violet-800 max-w-2xl w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Radio size={20} />Classify Observation</h2>
              <button onClick={() => { setClassifyOpen(false); setClassifyResult(null); }} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {Object.entries(obs).map(([k, v]) => (
                <input key={k} placeholder={k} value={v} onChange={e => setObs({ ...obs, [k]: e.target.value })} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              ))}
            </div>
            <button onClick={runClassify} className="bg-violet-700 hover:bg-violet-800 text-white px-4 py-2 rounded-lg w-full">Run Classifier</button>
            {classifyResult && (
              <div className="mt-4 space-y-2">
                <div className="text-sm text-gray-300">Verdict: <span className="text-white font-bold">{classifyResult.classification?.verdict}</span></div>
                {(classifyResult.top_matches || []).map((m: any) => (
                  <div key={m.signature_id} className="bg-gray-800 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-semibold">{m.platform_name}</span>
                      <span className="text-violet-300 text-sm">{(m.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{m.reasons.join(' • ')}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
