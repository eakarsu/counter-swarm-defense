import { useState, useEffect } from 'react';
import { ChevronRight, X, ShieldCheck, AlertCircle, Activity } from 'lucide-react';
import { apiFetch } from '../api';

type Engagement = {
  id: number; engagement_uid: string; track_uid: string; countermeasure_name: string;
  current_phase: string; cleared_to_engage: boolean; authorizing_officer: string;
  pk_estimate: number; expected_cost_usd: number; outcome: string;
  drones_engaged: number; drones_killed: number; started_at: string; closed_at: string;
};

const PHASES = ['detect', 'identify', 'track', 'decide', 'engage', 'assess'];
const PHASE_COLOR: Record<string, string> = { detect: 'bg-blue-600', identify: 'bg-cyan-600', track: 'bg-teal-600', decide: 'bg-yellow-600', engage: 'bg-orange-600', assess: 'bg-green-600' };
const OUTCOME_COLOR: Record<string, string> = { pending: 'bg-yellow-500/20 text-yellow-300', neutralized: 'bg-green-500/20 text-green-300', partial: 'bg-orange-500/20 text-orange-300', missed: 'bg-red-500/20 text-red-300', aborted: 'bg-gray-500/20 text-gray-300' };

export default function EngagementsPage() {
  const [items, setItems] = useState<Engagement[]>([]);
  const [phase, setPhase] = useState('');
  const [outcome, setOutcome] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);

  async function load() {
    const p = new URLSearchParams();
    if (phase) p.set('phase', phase);
    if (outcome) p.set('outcome', outcome);
    setItems(await apiFetch(`/engagements?${p}`));
  }
  async function loadMetrics() { setMetrics(await apiFetch('/engagements/metrics/kill-chain')); }
  useEffect(() => { load(); }, [phase, outcome]);
  useEffect(() => { loadMetrics(); }, []);

  async function openDetail(e: Engagement) { setSelected(await apiFetch(`/engagements/${e.id}`)); }
  async function advance() { if (!selected) return; await apiFetch(`/engagements/${selected.id}/advance`, { method: 'POST', body: JSON.stringify({}) }); setSelected(await apiFetch(`/engagements/${selected.id}`)); load(); loadMetrics(); }
  async function clearEng() { if (!selected) return; await apiFetch(`/engagements/${selected.id}/clear`, { method: 'POST', body: JSON.stringify({ rationale: 'Cleared via dashboard' }) }); setSelected(await apiFetch(`/engagements/${selected.id}`)); load(); }
  async function closeEng() { if (!selected) return; await apiFetch(`/engagements/${selected.id}/close`, { method: 'POST', body: JSON.stringify({ outcome: 'neutralized', drones_killed: selected.drones_engaged }) }); setSelected(await apiFetch(`/engagements/${selected.id}`)); load(); loadMetrics(); }
  async function abortEng() { if (!selected) return; await apiFetch(`/engagements/${selected.id}/abort`, { method: 'POST', body: JSON.stringify({ reason: 'Aborted via dashboard' }) }); setSelected(await apiFetch(`/engagements/${selected.id}`)); load(); }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Engagements (DITDEA)</h1>
          <p className="text-sm text-gray-400 mt-1">Detect → Identify → Track → Decide → Engage → Assess kill chain.</p>
        </div>
      </div>

      {metrics && (
        <div className="grid grid-cols-5 gap-2 mb-6">
          {Object.entries(metrics.phase_transitions).map(([k, v]: any) => (
            <div key={k} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
              <div className="text-xs text-gray-500">{k}</div>
              <div className="text-lg font-bold text-white">{v.samples ? `${v.p50_s}s` : '—'}</div>
              {v.samples > 0 && <div className="text-xs text-gray-400">p95 {v.p95_s}s • n={v.samples}</div>}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <select value={phase} onChange={e => setPhase(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
          <option value="">All Phases</option>{PHASES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={outcome} onChange={e => setOutcome(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
          <option value="">All Outcomes</option><option value="pending">Pending</option><option value="neutralized">Neutralized</option><option value="partial">Partial</option><option value="aborted">Aborted</option>
        </select>
      </div>

      <div className="grid gap-3">
        {items.map(e => (
          <div key={e.id} onClick={() => openDetail(e)} className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-red-800 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs text-gray-500">{e.engagement_uid}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${OUTCOME_COLOR[e.outcome] || 'bg-gray-700'}`}>{e.outcome}</span>
            </div>
            <div className="flex items-center gap-1 mb-2">
              {PHASES.map(p => (
                <span key={p} className={`text-xs px-2 py-0.5 rounded ${p === e.current_phase ? PHASE_COLOR[p] + ' text-white' : 'bg-gray-800 text-gray-500'}`}>{p}</span>
              ))}
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span>track: <span className="text-white font-mono">{e.track_uid}</span></span>
              <span>effector: <span className="text-white">{e.countermeasure_name}</span></span>
              <span>Pk: <span className="text-white">{e.pk_estimate ? (Number(e.pk_estimate) * 100).toFixed(0) + '%' : '—'}</span></span>
              <span>drones: <span className="text-white">{e.drones_killed}/{e.drones_engaged}</span></span>
              {e.cleared_to_engage ? <span className="flex items-center gap-1 text-green-400"><ShieldCheck size={11} />cleared ({e.authorizing_officer})</span> : <span className="flex items-center gap-1 text-yellow-400"><AlertCircle size={11} />not cleared</span>}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-6" onClick={() => setSelected(null)}>
          <div className="bg-gray-900 rounded-xl border border-red-800 max-w-3xl w-full p-6 max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white font-mono">{selected.engagement_uid}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="flex items-center gap-1 mb-4">
              {PHASES.map((p, i) => (
                <span key={p} className="flex items-center">
                  <span className={`text-xs px-3 py-1 rounded ${p === selected.current_phase ? PHASE_COLOR[p] + ' text-white' : 'bg-gray-800 text-gray-500'}`}>{p}</span>
                  {i < PHASES.length - 1 && <ChevronRight size={14} className="text-gray-600" />}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
              <div><span className="text-gray-500">Outcome:</span> <span className="text-white">{selected.outcome}</span></div>
              <div><span className="text-gray-500">Pk:</span> <span className="text-white">{selected.pk_estimate ? (Number(selected.pk_estimate) * 100).toFixed(0) + '%' : '—'}</span></div>
              <div><span className="text-gray-500">Cost:</span> <span className="text-white">${Number(selected.expected_cost_usd).toFixed(2)}</span></div>
              <div><span className="text-gray-500">Killed:</span> <span className="text-white">{selected.drones_killed}/{selected.drones_engaged}</span></div>
              <div className="col-span-2"><span className="text-gray-500">Authorizing officer:</span> <span className="text-white">{selected.authorizing_officer || '—'}</span></div>
              {selected.notes && <div className="col-span-2 text-gray-300 bg-gray-800 p-2 rounded">{selected.notes}</div>}
            </div>
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1"><Activity size={14} />Event Log</h3>
            <div className="bg-black/50 rounded-lg p-3 max-h-64 overflow-auto space-y-1 mb-4">
              {(selected.events || []).map((ev: any) => (
                <div key={ev.id} className="text-xs font-mono">
                  <span className="text-gray-500">{new Date(ev.occurred_at).toLocaleTimeString()}</span>{' '}
                  <span className={PHASE_COLOR[ev.phase] ? `text-white px-1 ${PHASE_COLOR[ev.phase]}` : 'text-gray-400'}>{ev.phase}</span>{' '}
                  <span className="text-violet-300">{ev.event_type}</span>{' '}
                  <span className="text-gray-300">{ev.actor}:</span>{' '}
                  <span className="text-gray-200">{ev.detail}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={advance} className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-2 rounded text-sm">Advance Phase</button>
              {!selected.cleared_to_engage && <button onClick={clearEng} className="bg-green-700 hover:bg-green-800 text-white px-3 py-2 rounded text-sm">Clear to Engage</button>}
              <button onClick={closeEng} className="bg-red-700 hover:bg-red-800 text-white px-3 py-2 rounded text-sm">Close (Neutralized)</button>
              <button onClick={abortEng} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm">Abort</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
