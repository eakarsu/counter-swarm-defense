import { useState, useEffect } from 'react';
import { Calculator, DollarSign } from 'lucide-react';
import { apiFetch } from '../api';

const VERDICT_COLOR: Record<string, string> = {
  defender_strong_advantage: 'bg-emerald-700',
  defender_advantage: 'bg-emerald-600',
  parity: 'bg-yellow-600',
  attacker_advantage: 'bg-orange-600',
  attacker_strong_advantage: 'bg-red-700',
  undefined: 'bg-gray-600',
};

export default function CostAdvantagePage() {
  const [snap, setSnap] = useState<any>(null);
  const [form, setForm] = useState({ attacker_unit_cost_usd: '500', attacker_count: '50', defender_unit_cost_usd: '25000', defender_pk: '0.7' });
  const [result, setResult] = useState<any>(null);

  async function loadSnap() {
    try { setSnap(await apiFetch('/cost-advantage/snapshot')); } catch (_) { setSnap(null); }
  }
  useEffect(() => { loadSnap(); }, []);

  async function analyze() {
    const body: any = {};
    for (const [k, v] of Object.entries(form)) if (v !== '') body[k] = Number(v);
    setResult(await apiFetch('/cost-advantage/analyze', { method: 'POST', body: JSON.stringify(body) }));
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Cost-Advantage Calculator</h1>
          <p className="text-sm text-gray-400 mt-1">Exchange-ratio analysis: defender cost-per-kill vs attacker cost-per-drone.</p>
          <p className="text-xs text-amber-400 mt-1">Advisory only — requires_human_authorization for engagement/procurement actions.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><Calculator size={18} />Scenario</h2>
          <div className="space-y-2 mb-4">
            {Object.entries(form).map(([k, v]) => (
              <label key={k} className="block text-xs text-gray-400">
                {k}
                <input value={v} onChange={e => setForm({ ...form, [k]: e.target.value })} className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              </label>
            ))}
          </div>
          <button onClick={analyze} className="bg-violet-700 hover:bg-violet-800 text-white px-4 py-2 rounded-lg w-full text-sm font-medium">Compute Exchange Ratio</button>

          {result && (
            <div className="mt-4 space-y-2">
              <div className="text-xs text-gray-400">{result.framing}</div>
              <div className={`text-white text-sm font-bold px-3 py-2 rounded-lg inline-block ${VERDICT_COLOR[result.computed.verdict] || 'bg-gray-600'}`}>
                {result.computed.verdict.replace(/_/g, ' ')}
              </div>
              <div className="text-sm text-gray-300">
                Expected shots: <span className="text-white font-bold">{result.computed.expected_shots_required}</span> •
                Attacker total: <span className="text-white font-bold">${result.computed.attacker_total_usd.toLocaleString()}</span> •
                Defender total: <span className="text-white font-bold">${result.computed.defender_total_usd.toLocaleString()}</span>
              </div>
              <div className="text-sm text-gray-300">Exchange ratio: <span className="text-white font-bold">{result.computed.exchange_ratio}</span> (defender $ / attacker $)</div>
              {(result.recommendations || []).map((r: string, i: number) => (
                <div key={i} className="text-xs text-amber-300 bg-amber-900/20 border border-amber-900 p-2 rounded-lg">{r}</div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><DollarSign size={18} />Portfolio Snapshot</h2>
          {snap && snap.portfolio?.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs text-gray-400">{snap.framing}</div>
              {snap.portfolio.map((p: any) => (
                <div key={p.countermeasure_id} className="bg-gray-800 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-semibold text-sm">{p.name}</span>
                    <span className="text-violet-300 text-sm">${p.expected_cost_per_kill_usd?.toLocaleString() || 'n/a'}/kill</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{p.type} • {p.munition_type || 'n/a'} • PK {p.pk}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">No countermeasure cost data available. Populate /api/countermeasures with unit_cost_usd and success_rate.</div>
          )}
        </div>
      </div>
    </div>
  );
}
