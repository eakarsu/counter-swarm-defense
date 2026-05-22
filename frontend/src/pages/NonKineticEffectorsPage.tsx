import { useState, useEffect } from 'react';
import { Wind, X } from 'lucide-react';
import { apiFetch } from '../api';

type Nke = {
  id: number; name: string; vendor: string; mechanism: string; target_subsystem: string;
  effective_radius_m: number; deploy_altitude_m: number; persistence_s: number;
  wind_max_mps: number; cost_per_use_usd: number; reusable: boolean;
  collateral_risk: string; legal_class: string; notes: string;
};

export default function NonKineticEffectorsPage() {
  const [items, setItems] = useState<Nke[]>([]);
  const [search, setSearch] = useState('');
  const [mechanism, setMechanism] = useState('');
  const [selected, setSelected] = useState<Nke | null>(null);
  const [advOpen, setAdvOpen] = useState(false);
  const [adv, setAdv] = useState({ swarm_size: '50', altitude_m: '200', wind_mps: '4', max_collateral: 'low', target_subsystem: '' });
  const [advResult, setAdvResult] = useState<any>(null);

  async function load() {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (mechanism) p.set('mechanism', mechanism);
    setItems(await apiFetch(`/non-kinetic-effectors?${p}`));
  }
  useEffect(() => { load(); }, [search, mechanism]);

  async function runAdvise() {
    const body: any = {};
    for (const [k, v] of Object.entries(adv)) if (v !== '') body[k] = isNaN(Number(v)) ? v : Number(v);
    setAdvResult(await apiFetch('/non-kinetic-effectors/advise', { method: 'POST', body: JSON.stringify(body) }));
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Non-Kinetic Effectors</h1>
          <p className="text-sm text-gray-400 mt-1">Aerosols, entanglement streamers, foul-rotor agents, soft-kill DE.</p>
          <p className="text-xs text-amber-400 mt-1">Advisory only — requires_human_authorization. No autonomous dispense.</p>
        </div>
        <button onClick={() => setAdvOpen(true)} className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
          <Wind size={16} />Recommend Effector (advisory)
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, vendor, subsystem..." className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
        <select value={mechanism} onChange={e => setMechanism(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
          <option value="">Any Mechanism</option>
          <option value="aerosol">Aerosol</option>
          <option value="streamer">Streamer</option>
          <option value="foul_rotor">Foul-rotor</option>
          <option value="hpm">HPM</option>
          <option value="laser_dazzle">Laser Dazzle</option>
          <option value="net">Net</option>
        </select>
      </div>

      <div className="grid gap-3">
        {items.map(n => (
          <div key={n.id} onClick={() => setSelected(n)} className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-emerald-700">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-700 text-white">{n.mechanism}</span>
              {n.reusable && <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-700 text-white">reusable</span>}
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">{n.target_subsystem}</span>
              <span className="text-xs text-gray-500">{n.vendor}</span>
            </div>
            <h3 className="font-semibold text-white">{n.name}</h3>
            <p className="text-xs text-gray-400 mt-1">radius {n.effective_radius_m}m • alt {n.deploy_altitude_m}m • persistence {n.persistence_s}s • wind&le;{n.wind_max_mps}mps • ${Number(n.cost_per_use_usd || 0).toLocaleString()}/use</p>
            {n.legal_class && <p className="text-xs text-amber-400 mt-1">Legal: {n.legal_class}</p>}
          </div>
        ))}
        {!items.length && <div className="text-gray-500 text-sm">No effectors in catalog yet. POST to /api/non-kinetic-effectors to add.</div>}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-6" onClick={() => setSelected(null)}>
          <div className="bg-gray-900 rounded-xl border border-emerald-800 max-w-2xl w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">{selected.name}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Vendor:</span> <span className="text-white">{selected.vendor}</span></div>
              <div><span className="text-gray-500">Mechanism:</span> <span className="text-white">{selected.mechanism}</span></div>
              <div><span className="text-gray-500">Target subsystem:</span> <span className="text-white">{selected.target_subsystem}</span></div>
              <div><span className="text-gray-500">Effective radius:</span> <span className="text-white">{selected.effective_radius_m} m</span></div>
              <div><span className="text-gray-500">Deploy altitude:</span> <span className="text-white">{selected.deploy_altitude_m} m</span></div>
              <div><span className="text-gray-500">Persistence:</span> <span className="text-white">{selected.persistence_s} s</span></div>
              <div><span className="text-gray-500">Max wind:</span> <span className="text-white">{selected.wind_max_mps} mps</span></div>
              <div><span className="text-gray-500">Cost/use:</span> <span className="text-white">${Number(selected.cost_per_use_usd || 0).toLocaleString()}</span></div>
              <div><span className="text-gray-500">Reusable:</span> <span className="text-white">{selected.reusable ? 'yes' : 'no'}</span></div>
              <div><span className="text-gray-500">Collateral risk:</span> <span className="text-white">{selected.collateral_risk}</span></div>
              <div className="col-span-2"><span className="text-gray-500">Legal class:</span> <span className="text-white">{selected.legal_class}</span></div>
            </div>
            {selected.notes && <p className="mt-4 text-sm text-gray-300 bg-gray-800 p-3 rounded-lg">{selected.notes}</p>}
          </div>
        </div>
      )}

      {advOpen && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-6" onClick={() => { setAdvOpen(false); setAdvResult(null); }}>
          <div className="bg-gray-900 rounded-xl border border-emerald-800 max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Wind size={20} />Effector Recommendation</h2>
              <button onClick={() => { setAdvOpen(false); setAdvResult(null); }} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <p className="text-xs text-amber-400 mb-3">Advisory only — airspace deconfliction and legal review required.</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {Object.entries(adv).map(([k, v]) => (
                <input key={k} placeholder={k} value={v} onChange={e => setAdv({ ...adv, [k]: e.target.value })} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              ))}
            </div>
            <button onClick={runAdvise} className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg w-full">Run Advisor</button>
            {advResult && (
              <div className="mt-4 space-y-2">
                <div className="text-xs text-gray-400">{advResult.framing}</div>
                {(advResult.recommendations || []).map((r: any) => (
                  <div key={r.effector_id} className="bg-gray-800 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-semibold">{r.name}</span>
                      <span className="text-emerald-300 text-sm">{(r.suitability * 100).toFixed(0)}%</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{r.mechanism} • expected affected {r.expected_affected} • coverage {(r.coverage_pct * 100).toFixed(0)}% • ${Number(r.cost_per_use_usd || 0).toLocaleString()}/use</div>
                    {!r.eligible && <div className="text-xs text-red-400 mt-1">Gating: {Object.entries(r.gating).filter(([, ok]) => !ok).map(([k]) => k).join(', ')}</div>}
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
