import { useState, useEffect } from 'react';
import { Plus, Search, Map, X } from 'lucide-react';
import { apiFetch } from '../api';
import { DefenseZone } from '../types';

const SEC_COLORS: Record<string,string> = { maximum:'bg-red-500/20 text-red-300', critical:'bg-orange-500/20 text-orange-300', high:'bg-yellow-500/20 text-yellow-300', medium:'bg-blue-500/20 text-blue-300' };
const STATUS_COLORS: Record<string,string> = { active:'bg-green-500/20 text-green-300', monitoring:'bg-blue-500/20 text-blue-300', offline:'bg-red-500/20 text-red-300' };

export default function ZonesPage() {
  const [items, setItems] = useState<DefenseZone[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<DefenseZone|null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DefenseZone|null>(null);
  const [form, setForm] = useState({ name:'', zone_type:'perimeter', security_level:'high', active_sensors:0, active_countermeasures:0, status:'active', area_km2:0 });

  async function load() {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    setItems(await apiFetch(`/zones?${p}`));
  }

  useEffect(() => { load(); }, [search]);

  async function save() {
    if (editing) await apiFetch(`/zones/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
    else await apiFetch('/zones', { method: 'POST', body: JSON.stringify(form) });
    setShowForm(false); setEditing(null); load();
  }

  async function remove(id: number) {
    await apiFetch(`/zones/${id}`, { method: 'DELETE' });
    setSelected(null); load();
  }

  function openEdit(item: DefenseZone) {
    setEditing(item);
    setForm({ name:item.name, zone_type:item.zone_type, security_level:item.security_level, active_sensors:item.active_sensors, active_countermeasures:item.active_countermeasures, status:item.status, area_km2:Number(item.area_km2) });
    setShowForm(true);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Defense Zones</h1>
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
          <Plus size={16} />Add Zone
        </button>
      </div>
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search zones..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-white text-sm" />
      </div>
      <div className="grid gap-3">
        {items.map(item => (
          <div key={item.id} onClick={() => setSelected(item)}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-red-800 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Map size={14} className="text-cyan-400" />
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[item.status]||'bg-gray-700 text-gray-300'}`}>{item.status}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${SEC_COLORS[item.security_level]||'bg-gray-700 text-gray-300'}`}>{item.security_level}</span>
                  <span className="text-xs text-gray-500">{item.zone_type}</span>
                </div>
                <h3 className="font-semibold text-white">{item.name}</h3>
                <p className="text-xs text-gray-400 mt-1">{item.area_km2}km² • {item.active_sensors} sensors • {item.active_countermeasures} countermeasures</p>
              </div>
              <div className="ml-4 text-right">
                <div className="text-xs text-gray-500">Threats/30d</div>
                <div className={`text-lg font-bold ${item.threat_count_30d > 20 ? 'text-red-400' : item.threat_count_30d > 10 ? 'text-orange-400' : 'text-green-400'}`}>{item.threat_count_30d}</div>
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
            <div className="flex gap-2 flex-wrap">
              <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[selected.status]}`}>{selected.status}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${SEC_COLORS[selected.security_level]}`}>{selected.security_level}</span>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-700 text-gray-300">{selected.zone_type}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-gray-500">Area</p><p className="text-white">{selected.area_km2}km²</p></div>
              <div><p className="text-xs text-gray-500">Threats (30d)</p><p className="text-red-400 font-bold">{selected.threat_count_30d}</p></div>
              <div><p className="text-xs text-gray-500">Active Sensors</p><p className="text-white">{selected.active_sensors}</p></div>
              <div><p className="text-xs text-gray-500">Countermeasures</p><p className="text-white">{selected.active_countermeasures}</p></div>
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
            <h2 className="text-lg font-bold text-white mb-4">{editing ? 'Edit' : 'Add'} Zone</h2>
            <div className="space-y-3">
              <input value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="Zone name"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input value={form.zone_type} onChange={e => setForm({...form,zone_type:e.target.value})} placeholder="Zone type"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
                <select value={form.security_level} onChange={e => setForm({...form,security_level:e.target.value})}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                  {['medium','high','critical','maximum'].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <select value={form.status} onChange={e => setForm({...form,status:e.target.value})}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                  {['active','monitoring','offline'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input type="number" step="0.1" value={form.area_km2} onChange={e => setForm({...form,area_km2:parseFloat(e.target.value)})} placeholder="Area (km²)"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
                <input type="number" value={form.active_sensors} onChange={e => setForm({...form,active_sensors:parseInt(e.target.value)})} placeholder="Active sensors"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
                <input type="number" value={form.active_countermeasures} onChange={e => setForm({...form,active_countermeasures:parseInt(e.target.value)})} placeholder="Countermeasures"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              </div>
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
