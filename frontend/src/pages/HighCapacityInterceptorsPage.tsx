import { useState, useEffect } from 'react';
import { Crosshair, Shield, X } from 'lucide-react';
import { apiFetch } from '../api';

type Hci = {
  id: number; platform_name: string; vendor: string; interceptor_class: string;
  is_kinetic: boolean; drones_per_salvo: number; salvo_reload_s: number;
  effective_range_m: number; effective_altitude_m: number; pk_per_target: number;
  cost_per_salvo_usd: number; magazine_capacity: number; collateral_risk: string; notes: string;
};

export default function HighCapacityInterceptorsPage() {
  const [items, setItems] = useState<Hci[]>([]);
  const [search, setSearch] = useState('');
  const [kinetic, setKinetic] = useState('');
  const [selected, setSelected] = useState<Hci | null>(null);
  const [advOpen, setAdvOpen] = useState(false);
  const [adv, setAdv] = useState({ swarm_size: '50', range_m: '1500', altitude_m: '300', max_collateral: 'medium' });
  const [advResult, setAdvResult] = useState<any>(null);

  async function load() {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (kinetic) p.set('kinetic', kinetic);
    setItems(await apiFetch(`/high-capacity-interceptors?${p}`));
  }
  useEffect(() => { load(); }, [search, kinetic]);

  async function runAdvise() {
    const body: any = {};
    for (const [k, v] of Object.entries(adv)) if (v !== '') body[k] = isNaN(Number(v)) ? v : Number(v);
    setAdvResult(await apiFetch('/high-capacity-interceptors/advise', { method: 'POST', body: JSON.stringify(body) }));
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">High-Capacity Interceptors</h1>
          <p className="text-sm text-gray-400 mt-1">Single-platform multi-drone effectors (advisory catalog).</p>
          <p className="text-xs text-amber-400 mt-1">Advisory only — requires_human_authorization. No autonomous fire control.</p>
        </div>
        <button onClick={() => setAdvOpen(true)} className="bg-violet-700 hover:bg-violet-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
          <Crosshair size={16} />Plan Engagement (advisory)
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search platform, vendor, class..." className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
        <select value={kinetic} onChange={e => setKinetic(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
          <option value="">Any Kind</option><option value="true">Kinetic</option><option value="false">Non-Kinetic</option>
        </select>
      </div>

      <div className="grid gap-3">
        {items.map(h => (
          <div key={h.id} onClick={() => setSelected(h)} className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-violet-700">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-700 text-white">{h.drones_per_salvo}/salvo</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">{h.interceptor_class}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${h.is_kinetic ? 'bg-red-700' : 'bg-emerald-700'} text-white`}>{h.is_kinetic ? 'kinetic' : 'non-kinetic'}</span>
              <span className="text-xs text-gray-500">{h.vendor}</span>
            </div>
            <h3 className="font-semibold text-white">{h.platform_name}</h3>
            <p className="text-xs text-gray-400 mt-1">range {h.effective_range_m}m • alt {h.effective_altitude_m}m • PK {h.pk_per_target} • ${Number(h.cost_per_salvo_usd || 0).toLocaleString()}/salvo • reload {h.salvo_reload_s}s</p>
          </div>
        ))}
        {!items.length && <div className="text-gray-500 text-sm">No platforms in catalog yet. POST to /api/high-capacity-interceptors to add.</div>}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-6" onClick={() => setSelected(null)}>
          <div className="bg-gray-900 rounded-xl border border-violet-800 max-w-2xl w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">{selected.platform_name}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Vendor:</span> <span className="text-white">{selected.vendor}</span></div>
              <div><span className="text-gray-500">Class:</span> <span className="text-white">{selected.interceptor_class}</span></div>
              <div><span className="text-gray-500">Drones/salvo:</span> <span className="text-white">{selected.drones_per_salvo}</span></div>
              <div><span className="text-gray-500">Reload:</span> <span className="text-white">{selected.salvo_reload_s}s</span></div>
              <div><span className="text-gray-500">Range:</span> <span className="text-white">{selected.effective_range_m} m</span></div>
              <div><span className="text-gray-500">Altitude:</span> <span className="text-white">{selected.effective_altitude_m} m</span></div>
              <div><span className="text-gray-500">PK:</span> <span className="text-white">{selected.pk_per_target}</span></div>
              <div><span className="text-gray-500">Cost/salvo:</span> <span className="text-white">${Number(selected.cost_per_salvo_usd || 0).toLocaleString()}</span></div>
              <div><span className="text-gray-500">Magazine:</span> <span className="text-white">{selected.magazine_capacity}</span></div>
              <div><span className="text-gray-500">Collateral risk:</span> <span className="text-white">{selected.collateral_risk}</span></div>
            </div>
            {selected.notes && <p className="mt-4 text-sm text-gray-300 bg-gray-800 p-3 rounded-lg">{selected.notes}</p>}
          </div>
        </div>
      )}

      {advOpen && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-6" onClick={() => { setAdvOpen(false); setAdvResult(null); }}>
          <div className="bg-gray-900 rounded-xl border border-violet-800 max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Shield size={20} />Advisory Engagement Plan</h2>
              <button onClick={() => { setAdvOpen(false); setAdvResult(null); }} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <p className="text-xs text-amber-400 mb-3">Decision support only — human operator must authorize any engagement.</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {Object.entries(adv).map(([k, v]) => (
                <input key={k} placeholder={k} value={v} onChange={e => setAdv({ ...adv, [k]: e.target.value })} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              ))}
            </div>
            <button onClick={runAdvise} className="bg-violet-700 hover:bg-violet-800 text-white px-4 py-2 rounded-lg w-full">Run Advisor</button>
            {advResult && (
              <div className="mt-4 space-y-2">
                <div className="text-xs text-gray-400">{advResult.framing}</div>
                {(advResult.recommendations || []).map((r: any) => (
                  <div key={r.interceptor_id} className="bg-gray-800 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-semibold">{r.platform_name}</span>
                      <span className="text-violet-300 text-sm">suitability {(r.suitability * 100).toFixed(0)}%</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">salvos {r.salvos_needed} • expected kills {r.expected_kills} • total ${Number(r.total_cost_usd || 0).toLocaleString()} • {r.time_to_complete_s}s</div>
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
