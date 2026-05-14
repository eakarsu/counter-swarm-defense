import { useState, useEffect } from 'react';
import { Plus, Search, Crosshair, X } from 'lucide-react';
import { apiFetch } from '../api';
import { Countermeasure } from '../types';

const STATUS_COLORS: Record<string,string> = { ready:'bg-green-500/20 text-green-300', active:'bg-blue-500/20 text-blue-300', reloading:'bg-yellow-500/20 text-yellow-300', maintenance:'bg-orange-500/20 text-orange-300', offline:'bg-red-500/20 text-red-300' };
const TYPES = ['laser','jammer','net_launcher','aerosol','interceptor_drone','cyber'];
const STATUSES = ['ready','active','reloading','maintenance','offline'];

export default function CountermeasuresPage() {
  const [items, setItems] = useState<Countermeasure[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Countermeasure|null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Countermeasure|null>(null);
  const [form, setForm] = useState({ name:'', type:'laser', status:'ready', range_m:2000, ammo_count:100, success_rate:0.9, location:'' });

  async function load() {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (status) p.set('status', status);
    setItems(await apiFetch(`/countermeasures?${p}`));
  }

  useEffect(() => { load(); }, [search, status]);

  async function save() {
    if (editing) await apiFetch(`/countermeasures/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
    else await apiFetch('/countermeasures', { method: 'POST', body: JSON.stringify(form) });
    setShowForm(false); setEditing(null); load();
  }

  async function remove(id: number) {
    await apiFetch(`/countermeasures/${id}`, { method: 'DELETE' });
    setSelected(null); load();
  }

  function openEdit(item: Countermeasure) {
    setEditing(item);
    setForm({ name:item.name, type:item.type, status:item.status, range_m:item.range_m, ammo_count:item.ammo_count, success_rate:Number(item.success_rate), location:item.location||'' });
    setShowForm(true);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Countermeasures</h1>
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
          <Plus size={16} />Add System
        </button>
      </div>
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search countermeasures..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-white text-sm" />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="grid gap-3">
        {items.map(item => (
          <div key={item.id} onClick={() => setSelected(item)}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-red-800 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Crosshair size={14} className="text-green-400" />
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[item.status]||'bg-gray-700 text-gray-300'}`}>{item.status}</span>
                  <span className="text-xs text-gray-500">{item.type.replace('_',' ')}</span>
                </div>
                <h3 className="font-semibold text-white">{item.name}</h3>
                <p className="text-xs text-gray-400 mt-1">{item.location} • Range: {item.range_m}m • Ammo: {item.ammo_count}</p>
              </div>
              <div className="ml-4 text-right">
                <div className="text-xs text-gray-500">Success Rate</div>
                <div className="text-lg font-bold text-green-400">{(Number(item.success_rate)*100).toFixed(0)}%</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-y-0 right-0 w-[450px] bg-gray-900 border-l border-gray-800 p-6 overflow-y-auto z-50 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">{selected.name}</h2>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
          </div>
          <div className="space-y-4">
            <div className="flex gap-2">
              <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[selected.status]}`}>{selected.status}</span>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-700 text-gray-300">{selected.type.replace('_',' ')}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-gray-500">Location</p><p className="text-white">{selected.location}</p></div>
              <div><p className="text-xs text-gray-500">Range</p><p className="text-white">{selected.range_m}m</p></div>
              <div><p className="text-xs text-gray-500">Ammo Count</p><p className="text-white">{selected.ammo_count}</p></div>
              <div><p className="text-xs text-gray-500">Success Rate</p><p className="text-green-400 font-bold">{(Number(selected.success_rate)*100).toFixed(0)}%</p></div>
              <div><p className="text-xs text-gray-500">Total Deployments</p><p className="text-white">{selected.total_deployments}</p></div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => openEdit(selected)} className="flex-1 bg-red-700 hover:bg-red-800 text-white py-2 rounded-lg text-sm font-medium">Edit</button>
              <button onClick={() => remove(selected.id)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-bold text-white mb-4">{editing ? 'Edit' : 'Add'} Countermeasure</h2>
            <div className="space-y-3">
              <input value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="System name"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.type} onChange={e => setForm({...form,type:e.target.value})}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={form.status} onChange={e => setForm({...form,status:e.target.value})}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input type="number" value={form.range_m} onChange={e => setForm({...form,range_m:parseInt(e.target.value)})} placeholder="Range (m)"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
                <input type="number" value={form.ammo_count} onChange={e => setForm({...form,ammo_count:parseInt(e.target.value)})} placeholder="Ammo count"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
                <input type="number" step="0.01" min="0" max="1" value={form.success_rate} onChange={e => setForm({...form,success_rate:parseFloat(e.target.value)})} placeholder="Success rate (0-1)"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              </div>
              <input value={form.location} onChange={e => setForm({...form,location:e.target.value})} placeholder="Location"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
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
