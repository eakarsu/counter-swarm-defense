import { useState, useEffect } from 'react';
import { DollarSign, Package, Target, TrendingDown, X } from 'lucide-react';
import { apiFetch } from '../api';

type Mag = {
  id: number; countermeasure_id: number; countermeasure_name: string; countermeasure_type: string;
  munition_type: string; rounds_remaining: number; rounds_capacity: number;
  unit_cost_usd: number; resupply_lead_days: number; total_fired: number; total_hits: number;
};

export default function EffectorMagazinesPage() {
  const [items, setItems] = useState<Mag[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [byType, setByType] = useState<any[]>([]);
  const [selected, setSelected] = useState<Mag | null>(null);
  const [fireForm, setFireForm] = useState({ rounds: 1, hits: 1 });

  async function load() { setItems(await apiFetch('/effector-magazines')); }
  async function loadEcon() {
    setSummary(await apiFetch('/effector-magazines/economics/summary'));
    setByType(await apiFetch('/effector-magazines/economics/by-type'));
  }
  useEffect(() => { load(); loadEcon(); }, []);

  async function fire() {
    if (!selected) return;
    await apiFetch(`/effector-magazines/${selected.id}/fire`, { method: 'POST', body: JSON.stringify(fireForm) });
    setSelected(null); load(); loadEcon();
  }
  async function resupply(m: Mag) {
    await apiFetch(`/effector-magazines/${m.id}/resupply`, { method: 'POST', body: JSON.stringify({}) });
    load(); loadEcon();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Effector Magazines</h1>
          <p className="text-sm text-gray-400 mt-1">Per-effector ammo state, cost-per-kill economics, resupply tracking.</p>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><DollarSign size={11} />Total Inventory Value</div>
            <div className="text-2xl font-bold text-white">${summary.total_inventory_value_usd.toLocaleString()}</div>
          </div>
          <div className="bg-gray-900 border border-green-800 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><TrendingDown size={11} />Cheapest Per Kill</div>
            <div className="text-sm font-bold text-green-400">{summary.cheapest_per_kill?.[0]?.countermeasure}</div>
            <div className="text-xs text-gray-400">${summary.cheapest_per_kill?.[0]?.cost_per_kill_usd?.toLocaleString()}/kill</div>
          </div>
          <div className="bg-gray-900 border border-red-800 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Target size={11} />Most Expensive Per Kill</div>
            <div className="text-sm font-bold text-red-400">{summary.most_expensive?.[0]?.countermeasure}</div>
            <div className="text-xs text-gray-400">${summary.most_expensive?.[0]?.cost_per_kill_usd?.toLocaleString()}/kill</div>
          </div>
        </div>
      )}

      <h2 className="text-sm font-bold text-white mb-2">By Munition Type</h2>
      <div className="grid grid-cols-2 gap-2 mb-6">
        {byType.map(t => (
          <div key={t.munition_type} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <div className="font-semibold text-white text-sm">{t.munition_type}</div>
            <div className="text-xs text-gray-400 mt-1">
              fired {t.rounds_fired} • hit {t.rounds_hit} • hit-rate {t.hit_rate ? (t.hit_rate * 100).toFixed(0) + '%' : '—'} • CPK ${t.cost_per_kill_usd?.toLocaleString() || '—'}
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-bold text-white mb-2">Magazines</h2>
      <div className="grid gap-3">
        {items.map(m => {
          const fill = m.rounds_capacity ? (m.rounds_remaining / m.rounds_capacity) * 100 : 100;
          const cpk = m.total_hits > 0 ? (m.total_fired * Number(m.unit_cost_usd)) / m.total_hits : null;
          return (
            <div key={m.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{m.countermeasure_name}</h3>
                  <p className="text-xs text-gray-400 mt-1">{m.munition_type} • ${Number(m.unit_cost_usd).toLocaleString()}/round • lead {m.resupply_lead_days}d</p>
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    <span className="text-gray-400">rounds: <span className="text-white font-bold">{m.rounds_remaining}/{m.rounds_capacity}</span></span>
                    <div className="flex-1 max-w-xs bg-gray-800 rounded-full h-2">
                      <div className={`h-2 rounded-full ${fill > 50 ? 'bg-green-500' : fill > 20 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, fill)}%` }}></div>
                    </div>
                    <span className="text-gray-400">fired {m.total_fired} • hits {m.total_hits}</span>
                    {cpk != null && <span className="text-violet-300 font-bold">CPK ${cpk.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>}
                  </div>
                </div>
                <div className="ml-4 flex gap-2">
                  <button onClick={() => { setSelected(m); setFireForm({ rounds: 1, hits: 1 }); }} className="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded text-xs">Fire</button>
                  <button onClick={() => resupply(m)} className="bg-green-700 hover:bg-green-800 text-white px-3 py-1 rounded text-xs flex items-center gap-1"><Package size={11} />Resupply</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-6" onClick={() => setSelected(null)}>
          <div className="bg-gray-900 rounded-xl border border-red-800 max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Fire — {selected.countermeasure_name}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs text-gray-400">Rounds expended</span>
                <input type="number" min="1" max={selected.rounds_remaining} value={fireForm.rounds} onChange={e => setFireForm({ ...fireForm, rounds: parseInt(e.target.value || '0', 10) })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" />
              </label>
              <label className="block">
                <span className="text-xs text-gray-400">Hits scored</span>
                <input type="number" min="0" max={fireForm.rounds} value={fireForm.hits} onChange={e => setFireForm({ ...fireForm, hits: parseInt(e.target.value || '0', 10) })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" />
              </label>
              <button onClick={fire} className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-lg w-full">Record Fire Event</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
