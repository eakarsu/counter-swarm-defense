import { useState, useEffect } from 'react';
import { Plus, Search, Zap, X } from 'lucide-react';
import { apiFetch } from '../api';
import { Deployment } from '../types';

const RESULT_COLORS: Record<string,string> = { success:'bg-green-500/20 text-green-300', partial:'bg-yellow-500/20 text-yellow-300', failed:'bg-red-500/20 text-red-300', pending:'bg-blue-500/20 text-blue-300' };

export default function DeploymentsPage() {
  const [items, setItems] = useState<Deployment[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Deployment|null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ threat_id:'', countermeasure_id:'', result:'pending', drones_neutralized:0, response_time_s:0, operator:'', notes:'' });

  async function load() {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    setItems(await apiFetch(`/deployments?${p}`));
  }

  useEffect(() => { load(); }, [search]);

  async function save() {
    await apiFetch('/deployments', { method: 'POST', body: JSON.stringify(form) });
    setShowForm(false); load();
  }

  async function remove(id: number) {
    await apiFetch(`/deployments/${id}`, { method: 'DELETE' });
    setSelected(null); load();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Deployments</h1>
        <button onClick={() => { setShowForm(true); }}
          className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
          <Plus size={16} />Log Deployment
        </button>
      </div>
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search deployments..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-white text-sm" />
      </div>
      <div className="grid gap-3">
        {items.map(item => (
          <div key={item.id} onClick={() => setSelected(item)}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-red-800 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={14} className="text-yellow-400" />
                  <span className={`text-xs px-2 py-0.5 rounded-full ${RESULT_COLORS[item.result]||'bg-gray-700 text-gray-300'}`}>{item.result}</span>
                </div>
                <h3 className="font-semibold text-white">{item.countermeasure_name || `CM #${item.countermeasure_id}`} → {item.zone_name || `Threat #${item.threat_id}`}</h3>
                <p className="text-xs text-gray-400 mt-1">{item.operator} • {item.drones_neutralized} drones neutralized • {item.response_time_s}s response</p>
              </div>
              <div className="text-xs text-gray-500 ml-4">{new Date(item.deployed_at).toLocaleDateString()}</div>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-y-0 right-0 w-[450px] bg-gray-900 border-l border-gray-800 p-6 overflow-y-auto z-50 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Deployment Detail</h2>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
          </div>
          <div className="space-y-4">
            <span className={`inline-block text-xs px-2 py-1 rounded-full ${RESULT_COLORS[selected.result]}`}>{selected.result}</span>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-gray-500">Countermeasure</p><p className="text-white">{selected.countermeasure_name || `#${selected.countermeasure_id}`}</p></div>
              <div><p className="text-xs text-gray-500">Zone</p><p className="text-white">{selected.zone_name || `Threat #${selected.threat_id}`}</p></div>
              <div><p className="text-xs text-gray-500">Threat Type</p><p className="text-white">{selected.threat_type || 'N/A'}</p></div>
              <div><p className="text-xs text-gray-500">Operator</p><p className="text-white">{selected.operator}</p></div>
              <div><p className="text-xs text-gray-500">Drones Neutralized</p><p className="text-green-400 font-bold">{selected.drones_neutralized}</p></div>
              <div><p className="text-xs text-gray-500">Response Time</p><p className="text-white">{selected.response_time_s}s</p></div>
              <div><p className="text-xs text-gray-500">Deployed At</p><p className="text-white">{new Date(selected.deployed_at).toLocaleString()}</p></div>
            </div>
            {selected.notes && <div><p className="text-xs text-gray-500 mb-1">Notes</p><p className="text-gray-200 text-sm">{selected.notes}</p></div>}
            <button onClick={() => remove(selected.id)} className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium">Delete</button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-bold text-white mb-4">Log Deployment</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={form.threat_id} onChange={e => setForm({...form,threat_id:e.target.value})} placeholder="Threat ID"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
                <input type="number" value={form.countermeasure_id} onChange={e => setForm({...form,countermeasure_id:e.target.value})} placeholder="Countermeasure ID"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              </div>
              <select value={form.result} onChange={e => setForm({...form,result:e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                {['pending','success','partial','failed'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={form.drones_neutralized} onChange={e => setForm({...form,drones_neutralized:parseInt(e.target.value)})} placeholder="Drones neutralized"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
                <input type="number" value={form.response_time_s} onChange={e => setForm({...form,response_time_s:parseInt(e.target.value)})} placeholder="Response time (s)"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              </div>
              <input value={form.operator} onChange={e => setForm({...form,operator:e.target.value})} placeholder="Operator name"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              <textarea value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} placeholder="Notes"
                rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm resize-none" />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={save} className="flex-1 bg-red-700 hover:bg-red-800 text-white py-2 rounded-lg text-sm font-medium">Log</button>
              <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
