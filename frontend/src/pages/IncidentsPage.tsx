import { useState, useEffect } from 'react';
import { Plus, Search, FileWarning, X, CheckCircle } from 'lucide-react';
import { apiFetch } from '../api';
import { Incident } from '../types';

const SEV_COLORS: Record<string,string> = { low:'bg-green-500/20 text-green-300', medium:'bg-yellow-500/20 text-yellow-300', high:'bg-orange-500/20 text-orange-300', critical:'bg-red-500/20 text-red-300' };

export default function IncidentsPage() {
  const [items, setItems] = useState<Incident[]>([]);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [selected, setSelected] = useState<Incident|null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Incident|null>(null);
  const [form, setForm] = useState({ title:'', severity:'medium', description:'', threat_id:'', response_time_s:0, drones_involved:0, casualties:0, damage_assessment:'', resolved:false, occurred_at:'' });

  async function load() {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (severity) p.set('severity', severity);
    setItems(await apiFetch(`/incidents?${p}`));
  }

  useEffect(() => { load(); }, [search, severity]);

  async function save() {
    if (editing) await apiFetch(`/incidents/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
    else await apiFetch('/incidents', { method: 'POST', body: JSON.stringify(form) });
    setShowForm(false); setEditing(null); load();
  }

  async function remove(id: number) {
    await apiFetch(`/incidents/${id}`, { method: 'DELETE' });
    setSelected(null); load();
  }

  function openEdit(item: Incident) {
    setEditing(item);
    setForm({ title:item.title, severity:item.severity, description:item.description||'', threat_id:String(item.threat_id||''), response_time_s:item.response_time_s||0, drones_involved:item.drones_involved||0, casualties:item.casualties||0, damage_assessment:item.damage_assessment||'', resolved:item.resolved||false, occurred_at:item.occurred_at||'' });
    setShowForm(true);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Incidents</h1>
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
          <Plus size={16} />Log Incident
        </button>
      </div>
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search incidents..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-white text-sm" />
        </div>
        <select value={severity} onChange={e => setSeverity(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
          <option value="">All Severities</option>
          {['low','medium','high','critical'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="grid gap-3">
        {items.map(item => (
          <div key={item.id} onClick={() => setSelected(item)}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-red-800 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <FileWarning size={14} className="text-orange-400" />
                  <span className={`text-xs px-2 py-0.5 rounded-full ${SEV_COLORS[item.severity]||'bg-gray-700 text-gray-300'}`}>{item.severity}</span>
                  {item.resolved && <CheckCircle size={14} className="text-green-400" />}
                </div>
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="text-xs text-gray-400 mt-1">{item.drones_involved} drones • {item.casualties} casualties • {new Date(item.occurred_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-y-0 right-0 w-[500px] bg-gray-900 border-l border-gray-800 p-6 overflow-y-auto z-50 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">{selected.title}</h2>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
          </div>
          <div className="space-y-4">
            <div className="flex gap-2">
              <span className={`text-xs px-2 py-1 rounded-full ${SEV_COLORS[selected.severity]}`}>{selected.severity}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${selected.resolved ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>{selected.resolved ? 'Resolved' : 'Active'}</span>
            </div>
            <div><p className="text-xs text-gray-500 mb-1">Description</p><p className="text-gray-200 text-sm">{selected.description}</p></div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-gray-500">Drones Involved</p><p className="text-white">{selected.drones_involved}</p></div>
              <div><p className="text-xs text-gray-500">Casualties</p><p className={selected.casualties > 0 ? 'text-red-400 font-bold' : 'text-white'}>{selected.casualties}</p></div>
              <div><p className="text-xs text-gray-500">Response Time</p><p className="text-white">{selected.response_time_s}s</p></div>
              <div><p className="text-xs text-gray-500">Occurred</p><p className="text-white">{new Date(selected.occurred_at).toLocaleString()}</p></div>
            </div>
            {selected.damage_assessment && <div><p className="text-xs text-gray-500 mb-1">Damage Assessment</p><p className="text-gray-200 text-sm">{selected.damage_assessment}</p></div>}
            <div className="flex gap-2 pt-2">
              <button onClick={() => openEdit(selected)} className="flex-1 bg-red-700 hover:bg-red-800 text-white py-2 rounded-lg text-sm font-medium">Edit</button>
              <button onClick={() => remove(selected.id)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-4">{editing ? 'Edit' : 'Log'} Incident</h2>
            <div className="space-y-3">
              <input value={form.title} onChange={e => setForm({...form,title:e.target.value})} placeholder="Incident title"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              <select value={form.severity} onChange={e => setForm({...form,severity:e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                {['low','medium','high','critical'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <textarea value={form.description} onChange={e => setForm({...form,description:e.target.value})} placeholder="Description"
                rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={form.drones_involved} onChange={e => setForm({...form,drones_involved:parseInt(e.target.value)})} placeholder="Drones involved"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
                <input type="number" value={form.casualties} onChange={e => setForm({...form,casualties:parseInt(e.target.value)})} placeholder="Casualties"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
                <input type="number" value={form.response_time_s} onChange={e => setForm({...form,response_time_s:parseInt(e.target.value)})} placeholder="Response time (s)"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              </div>
              <textarea value={form.damage_assessment} onChange={e => setForm({...form,damage_assessment:e.target.value})} placeholder="Damage assessment"
                rows={2} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm resize-none" />
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={form.resolved} onChange={e => setForm({...form,resolved:e.target.checked})} />
                Resolved
              </label>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={save} className="flex-1 bg-red-700 hover:bg-red-800 text-white py-2 rounded-lg text-sm font-medium">Save</button>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
