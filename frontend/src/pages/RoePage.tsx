import { useState, useEffect } from 'react';
import { Gavel, ShieldCheck, X, Check, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../api';

type Rule = {
  id: number; rule_code: string; zone_name: string; min_threat_level: number;
  authorized_effector_types: string; requires_visual_id: boolean;
  requires_command_approval: boolean; collateral_check_required: boolean;
  active: boolean; description: string;
};
type Auth = {
  id: number; engagement_id: number; rule_id: number; rule_code: string;
  requested_by: string; approved_by: string; decision: string; decision_at: string;
  conditions: string; rationale: string;
};

const DECISION_COLOR: Record<string, string> = { approved: 'bg-green-500/20 text-green-300', denied: 'bg-red-500/20 text-red-300', conditional: 'bg-yellow-500/20 text-yellow-300', pending: 'bg-gray-500/20 text-gray-300' };

export default function RoePage() {
  const [tab, setTab] = useState<'rules' | 'auths' | 'eval'>('rules');
  const [rules, setRules] = useState<Rule[]>([]);
  const [auths, setAuths] = useState<Auth[]>([]);
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [evalForm, setEvalForm] = useState({ zone_name: 'Perimeter Alpha', threat_level: 7, effector_type: 'jammer', has_visual_id: false, command_approved: false, collateral_cleared: false });
  const [evalResult, setEvalResult] = useState<any>(null);

  async function loadRules() { setRules(await apiFetch('/roe/rules')); }
  async function loadAuths() { setAuths(await apiFetch('/roe/authorizations')); }
  useEffect(() => { loadRules(); loadAuths(); }, []);

  async function toggleActive(r: Rule) {
    await apiFetch(`/roe/rules/${r.id}/${r.active ? 'deactivate' : 'activate'}`, { method: 'POST' });
    loadRules();
  }
  async function evaluate() {
    setEvalResult(await apiFetch('/roe/evaluate', { method: 'POST', body: JSON.stringify(evalForm) }));
  }
  async function decide(a: Auth, decision: string) {
    await apiFetch(`/roe/authorizations/${a.id}/decide`, { method: 'POST', body: JSON.stringify({ decision, rationale: `${decision} via dashboard` }) });
    loadAuths();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Gavel size={24} />Rules of Engagement</h1>
          <p className="text-sm text-gray-400 mt-1">Zone-scoped ROE catalog + per-engagement authorization workflow.</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('rules')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'rules' ? 'bg-red-700 text-white' : 'bg-gray-800 text-gray-400'}`}>Rules ({rules.length})</button>
        <button onClick={() => setTab('auths')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'auths' ? 'bg-red-700 text-white' : 'bg-gray-800 text-gray-400'}`}>Authorizations ({auths.length})</button>
        <button onClick={() => setTab('eval')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'eval' ? 'bg-red-700 text-white' : 'bg-gray-800 text-gray-400'}`}>Evaluate Compliance</button>
      </div>

      {tab === 'rules' && (
        <div className="grid gap-3">
          {rules.map(r => (
            <div key={r.id} onClick={() => setSelectedRule(r)} className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-red-800">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-red-300 font-bold">{r.rule_code}</span>
                    <span className="text-xs text-gray-400">{r.zone_name}</span>
                    {r.active ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-300">active</span> : <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700">inactive</span>}
                  </div>
                  <p className="text-sm text-white">{r.description}</p>
                  <p className="text-xs text-gray-400 mt-1">min_threat={r.min_threat_level} • effectors: {r.authorized_effector_types}</p>
                  <div className="flex gap-2 mt-1">
                    {r.requires_visual_id && <span className="text-xs text-yellow-300">visual ID required</span>}
                    {r.requires_command_approval && <span className="text-xs text-orange-300">command approval required</span>}
                    {r.collateral_check_required && <span className="text-xs text-cyan-300">collateral check required</span>}
                  </div>
                </div>
                <button onClick={ev => { ev.stopPropagation(); toggleActive(r); }} className="ml-4 text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded text-white">{r.active ? 'Deactivate' : 'Activate'}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'auths' && (
        <div className="grid gap-3">
          {auths.map(a => (
            <div key={a.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500">ENG #{a.engagement_id}</span>
                    <span className="font-mono text-xs text-red-300">{a.rule_code}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${DECISION_COLOR[a.decision] || 'bg-gray-700'}`}>{a.decision}</span>
                  </div>
                  <p className="text-sm text-white">{a.rationale}</p>
                  <p className="text-xs text-gray-400 mt-1">requested by {a.requested_by}{a.approved_by ? ` • approved by ${a.approved_by}` : ''}</p>
                  {a.conditions && <p className="text-xs text-yellow-300 mt-1">conditions: {a.conditions}</p>}
                </div>
                {a.decision === 'pending' || a.decision === 'conditional' ? (
                  <div className="ml-4 flex gap-1">
                    <button onClick={() => decide(a, 'approved')} className="bg-green-700 hover:bg-green-800 text-white px-2 py-1 rounded text-xs flex items-center gap-1"><Check size={11} />Approve</button>
                    <button onClick={() => decide(a, 'denied')} className="bg-red-700 hover:bg-red-800 text-white px-2 py-1 rounded text-xs">Deny</button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'eval' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-2xl">
          <h2 className="text-lg font-bold text-white mb-4">Evaluate Engagement Compliance</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <input placeholder="Zone name" value={evalForm.zone_name} onChange={e => setEvalForm({ ...evalForm, zone_name: e.target.value })} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            <input type="number" placeholder="Threat level" value={evalForm.threat_level} onChange={e => setEvalForm({ ...evalForm, threat_level: parseFloat(e.target.value || '0') })} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            <select value={evalForm.effector_type} onChange={e => setEvalForm({ ...evalForm, effector_type: e.target.value })} className="col-span-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
              <option value="jammer">jammer</option><option value="net_launcher">net_launcher</option><option value="interceptor_drone">interceptor_drone</option>
              <option value="kinetic_smart_sight">kinetic_smart_sight</option><option value="kinetic_30mm">kinetic_30mm</option><option value="kinetic_35mm_ahead">kinetic_35mm_ahead</option>
              <option value="high_power_microwave">high_power_microwave</option><option value="directed_energy_laser">directed_energy_laser</option>
            </select>
          </div>
          <div className="flex gap-3 mb-4 text-sm">
            <label className="flex items-center gap-2 text-gray-300"><input type="checkbox" checked={evalForm.has_visual_id} onChange={e => setEvalForm({ ...evalForm, has_visual_id: e.target.checked })} />Visual ID</label>
            <label className="flex items-center gap-2 text-gray-300"><input type="checkbox" checked={evalForm.command_approved} onChange={e => setEvalForm({ ...evalForm, command_approved: e.target.checked })} />Command approved</label>
            <label className="flex items-center gap-2 text-gray-300"><input type="checkbox" checked={evalForm.collateral_cleared} onChange={e => setEvalForm({ ...evalForm, collateral_cleared: e.target.checked })} />Collateral cleared</label>
          </div>
          <button onClick={evaluate} className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-lg">Evaluate</button>
          {evalResult && (
            <div className="mt-4 space-y-2">
              <div className={`text-lg font-bold flex items-center gap-2 ${evalResult.verdict === 'approved' ? 'text-green-400' : evalResult.verdict === 'denied' ? 'text-red-400' : 'text-yellow-400'}`}>
                {evalResult.verdict === 'approved' ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
                {evalResult.verdict?.toUpperCase()}
              </div>
              {(evalResult.rule_evaluations || []).map((c: any) => (
                <div key={c.rule_id} className="bg-gray-800 p-3 rounded-lg">
                  <div className="font-mono text-xs text-red-300">{c.rule_code} → {c.verdict}</div>
                  {c.violations.map((v: string, i: number) => <div key={i} className="text-xs text-red-300">✗ {v}</div>)}
                  {c.conditions.map((v: string, i: number) => <div key={i} className="text-xs text-yellow-300">⚠ {v}</div>)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedRule && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-6" onClick={() => setSelectedRule(null)}>
          <div className="bg-gray-900 rounded-xl border border-red-800 max-w-xl w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white font-mono">{selectedRule.rule_code}</h2>
              <button onClick={() => setSelectedRule(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <p className="text-sm text-gray-300 mb-3">{selectedRule.description}</p>
            <div className="grid gap-1 text-sm">
              <div><span className="text-gray-500">Zone:</span> <span className="text-white">{selectedRule.zone_name}</span></div>
              <div><span className="text-gray-500">Min threat level:</span> <span className="text-white">{selectedRule.min_threat_level}</span></div>
              <div><span className="text-gray-500">Authorized effectors:</span> <span className="text-white">{selectedRule.authorized_effector_types}</span></div>
              <div><span className="text-gray-500">Visual ID:</span> <span className="text-white">{selectedRule.requires_visual_id ? 'required' : 'not required'}</span></div>
              <div><span className="text-gray-500">Command approval:</span> <span className="text-white">{selectedRule.requires_command_approval ? 'required' : 'not required'}</span></div>
              <div><span className="text-gray-500">Collateral check:</span> <span className="text-white">{selectedRule.collateral_check_required ? 'required' : 'not required'}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
