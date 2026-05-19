import { useEffect, useState } from 'react';
import { Gavel, Plus, Save, Trash2, X } from 'lucide-react';
import { apiFetch } from '../../api';

type Rule = {
  id: number;
  rule_code: string;
  zone_name: string;
  min_threat_level: number;
  authorized_effector_types: string;
  requires_visual_id: boolean;
  requires_command_approval: boolean;
  collateral_check_required: boolean;
  active: boolean;
  description: string;
};

const EMPTY: Partial<Rule> = {
  rule_code: 'ROE-NEW-01', zone_name: 'Perimeter Alpha', min_threat_level: 5,
  authorized_effector_types: 'jammer,net_launcher', requires_visual_id: false,
  requires_command_approval: false, collateral_check_required: false, active: true,
  description: 'New rule via Custom Views editor.'
};

export default function RoeEditor() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [draft, setDraft] = useState<Partial<Rule>>(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function load() {
    setErr('');
    try { setRules(await apiFetch('/custom-views/roe-editor')); }
    catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  function startEdit(r: Rule) { setEditingId(r.id); setDraft({ ...r }); }
  function reset() { setEditingId(null); setDraft(EMPTY); }

  async function save() {
    setBusy(true); setErr('');
    try {
      if (editingId) await apiFetch(`/custom-views/roe-editor/${editingId}`, { method: 'PUT', body: JSON.stringify(draft) });
      else await apiFetch('/custom-views/roe-editor', { method: 'POST', body: JSON.stringify(draft) });
      reset(); await load();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function remove(id: number) {
    if (!confirm(`Delete ROE rule #${id}?`)) return;
    setBusy(true); setErr('');
    try { await apiFetch(`/custom-views/roe-editor/${id}`, { method: 'DELETE' }); await load(); }
    catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  function setField<K extends keyof Rule>(k: K, v: any) { setDraft(d => ({ ...d, [k]: v })); }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5" data-testid="cv-roe-editor">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Gavel size={18} className="text-violet-400" />
          <h3 className="font-semibold text-white">Rules of Engagement Editor</h3>
        </div>
        <button onClick={reset} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
          <Plus size={12} /> New rule
        </button>
      </div>
      {err && <p className="text-red-400 text-xs mb-2">{err}</p>}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-gray-950/50 border border-gray-800 rounded p-3 max-h-96 overflow-auto">
          <p className="text-xs text-gray-500 mb-2">{rules.length} rules</p>
          <div className="space-y-2">
            {rules.map(r => (
              <div key={r.id} className={`p-2 rounded border ${editingId === r.id ? 'border-violet-700 bg-violet-900/10' : 'border-gray-800 bg-gray-900'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-violet-300">{r.rule_code}</span>
                      <span className="text-[10px] text-gray-500">{r.zone_name}</span>
                      {r.active ? <span className="text-[10px] px-1.5 rounded bg-green-500/20 text-green-300">active</span> : <span className="text-[10px] px-1.5 rounded bg-gray-700 text-gray-300">off</span>}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{r.description}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(r)} className="text-xs bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-white">Edit</button>
                    <button onClick={() => remove(r.id)} className="text-xs bg-red-700/40 hover:bg-red-700 px-2 py-1 rounded text-white" title="Delete"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-950/50 border border-gray-800 rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-white">{editingId ? `Editing #${editingId}` : 'New rule'}</p>
            {editingId && <button onClick={reset} className="text-gray-400 hover:text-white"><X size={14} /></button>}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <input placeholder="rule_code" value={draft.rule_code || ''} onChange={e => setField('rule_code', e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white" />
            <input placeholder="zone_name" value={draft.zone_name || ''} onChange={e => setField('zone_name', e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white" />
            <input type="number" step="0.1" placeholder="min_threat_level" value={draft.min_threat_level ?? 0} onChange={e => setField('min_threat_level', parseFloat(e.target.value || '0'))} className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white" />
            <input placeholder="authorized_effector_types (csv)" value={draft.authorized_effector_types || ''} onChange={e => setField('authorized_effector_types', e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white" />
          </div>
          <textarea placeholder="description" value={draft.description || ''} onChange={e => setField('description', e.target.value)} className="w-full mt-2 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm h-20" />
          <div className="flex flex-wrap gap-3 text-xs text-gray-300 mt-2">
            <label className="flex items-center gap-1"><input type="checkbox" checked={!!draft.requires_visual_id} onChange={e => setField('requires_visual_id', e.target.checked)} /> Visual ID</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={!!draft.requires_command_approval} onChange={e => setField('requires_command_approval', e.target.checked)} /> Command approval</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={!!draft.collateral_check_required} onChange={e => setField('collateral_check_required', e.target.checked)} /> Collateral check</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={!!draft.active} onChange={e => setField('active', e.target.checked)} /> Active</label>
          </div>
          <button onClick={save} disabled={busy} className="mt-3 bg-violet-700 hover:bg-violet-800 disabled:opacity-50 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1">
            <Save size={14} /> {busy ? 'Saving…' : (editingId ? 'Save changes' : 'Create rule')}
          </button>
        </div>
      </div>
    </div>
  );
}
