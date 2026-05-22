import { useState, useEffect } from 'react';
import { Brain, X } from 'lucide-react';
import { apiFetch } from '../api';

type Vec = {
  id: number; vector_code: string; name: string; stack_layer: string;
  targets_autonomy_level: string; detection_cue: string; mitigation: string;
  operator_complexity: string; legal_class: string;
  effectiveness_vs_jam_resistant: number; notes: string;
};

export default function AutonomyAttackVectorsPage() {
  const [items, setItems] = useState<Vec[]>([]);
  const [search, setSearch] = useState('');
  const [layer, setLayer] = useState('');
  const [selected, setSelected] = useState<Vec | null>(null);
  const [advOpen, setAdvOpen] = useState(false);
  const [adv, setAdv] = useState({ autonomy_level: 'ai-onboard', jam_resistance: 'high', stack_layers: 'navigation,perception' });
  const [advResult, setAdvResult] = useState<any>(null);

  async function load() {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (layer) p.set('stack_layer', layer);
    setItems(await apiFetch(`/autonomy-attack-vectors?${p}`));
  }
  useEffect(() => { load(); }, [search, layer]);

  async function runAdvise() {
    const body: any = {
      autonomy_level: adv.autonomy_level || undefined,
      jam_resistance: adv.jam_resistance || undefined,
      stack_layers: adv.stack_layers ? adv.stack_layers.split(',').map(s => s.trim()).filter(Boolean) : [],
    };
    setAdvResult(await apiFetch('/autonomy-attack-vectors/assess', { method: 'POST', body: JSON.stringify(body) }));
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Autonomy-Stack Attack Vectors</h1>
          <p className="text-sm text-gray-400 mt-1">Defensive awareness catalog: detection cues + mitigations for adversary autonomy weaknesses.</p>
          <p className="text-xs text-amber-400 mt-1">Advisory only — requires_human_authorization. Defensive framing; not an offensive playbook.</p>
        </div>
        <button onClick={() => setAdvOpen(true)} className="bg-cyan-700 hover:bg-cyan-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
          <Brain size={16} />Assess Profile (advisory)
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vector, code, layer..." className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
        <select value={layer} onChange={e => setLayer(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
          <option value="">Any Layer</option>
          <option value="navigation">Navigation</option>
          <option value="perception">Perception</option>
          <option value="comms">Comms</option>
          <option value="planning">Planning</option>
          <option value="control">Control</option>
        </select>
      </div>

      <div className="grid gap-3">
        {items.map(v => (
          <div key={v.id} onClick={() => setSelected(v)} className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-cyan-700">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-700 text-white">{v.vector_code}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">{v.stack_layer}</span>
              {v.effectiveness_vs_jam_resistant != null && <span className="text-xs px-2 py-0.5 rounded-full bg-violet-700 text-white">jam-resist eff {Number(v.effectiveness_vs_jam_resistant).toFixed(2)}</span>}
            </div>
            <h3 className="font-semibold text-white">{v.name}</h3>
            <p className="text-xs text-gray-400 mt-1">Targets: {v.targets_autonomy_level} • Operator complexity: {v.operator_complexity}</p>
            {v.detection_cue && <p className="text-xs text-gray-500 mt-1">Cue: {v.detection_cue}</p>}
          </div>
        ))}
        {!items.length && <div className="text-gray-500 text-sm">No vectors in catalog yet. POST to /api/autonomy-attack-vectors to add.</div>}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-6" onClick={() => setSelected(null)}>
          <div className="bg-gray-900 rounded-xl border border-cyan-800 max-w-2xl w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">{selected.name}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Code:</span> <span className="text-white">{selected.vector_code}</span></div>
              <div><span className="text-gray-500">Layer:</span> <span className="text-white">{selected.stack_layer}</span></div>
              <div className="col-span-2"><span className="text-gray-500">Targets autonomy:</span> <span className="text-white">{selected.targets_autonomy_level}</span></div>
              <div className="col-span-2"><span className="text-gray-500">Detection cue:</span> <span className="text-white">{selected.detection_cue}</span></div>
              <div className="col-span-2"><span className="text-gray-500">Mitigation:</span> <span className="text-white">{selected.mitigation}</span></div>
              <div><span className="text-gray-500">Operator complexity:</span> <span className="text-white">{selected.operator_complexity}</span></div>
              <div><span className="text-gray-500">Legal class:</span> <span className="text-white">{selected.legal_class}</span></div>
            </div>
            {selected.notes && <p className="mt-4 text-sm text-gray-300 bg-gray-800 p-3 rounded-lg">{selected.notes}</p>}
          </div>
        </div>
      )}

      {advOpen && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-6" onClick={() => { setAdvOpen(false); setAdvResult(null); }}>
          <div className="bg-gray-900 rounded-xl border border-cyan-800 max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Brain size={20} />Assess Adversary Profile</h2>
              <button onClick={() => { setAdvOpen(false); setAdvResult(null); }} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <p className="text-xs text-amber-400 mb-3">Defensive advisory only — counter-autonomy actions require legal review and human authorization.</p>
            <div className="space-y-2 mb-4">
              <input placeholder="autonomy_level (e.g. ai-onboard)" value={adv.autonomy_level} onChange={e => setAdv({ ...adv, autonomy_level: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              <input placeholder="jam_resistance (low/medium/high)" value={adv.jam_resistance} onChange={e => setAdv({ ...adv, jam_resistance: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              <input placeholder="stack_layers (comma list)" value={adv.stack_layers} onChange={e => setAdv({ ...adv, stack_layers: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <button onClick={runAdvise} className="bg-cyan-700 hover:bg-cyan-800 text-white px-4 py-2 rounded-lg w-full">Run Advisor</button>
            {advResult && (
              <div className="mt-4 space-y-2">
                <div className="text-xs text-gray-400">{advResult.framing}</div>
                {(advResult.vectors || []).map((v: any) => (
                  <div key={v.vector_id} className="bg-gray-800 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-semibold">{v.name}</span>
                      <span className="text-cyan-300 text-sm">{(v.applicability * 100).toFixed(0)}%</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{v.reasons.join(' • ')}</div>
                    {v.mitigation && <div className="text-xs text-emerald-300 mt-1">Mitigation: {v.mitigation}</div>}
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
