import { useState, useEffect } from 'react';
import { Plus, Search, Radio, X, Battery } from 'lucide-react';
import { apiFetch } from '../api';
import { Sensor } from '../types';

const STATUS_COLORS: Record<string,string> = { active:'bg-green-500/20 text-green-300', offline:'bg-red-500/20 text-red-300', maintenance:'bg-yellow-500/20 text-yellow-300' };
const TYPES = ['radar','optical','acoustic','rf_scanner','thermal'];

export default function SensorsPage() {
  const [items, setItems] = useState<Sensor[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Sensor|null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Sensor|null>(null);
  const [form, setForm] = useState({ name:'', type:'radar', location:'', status:'active', range_km:10, battery_pct:100, firmware_version:'v1.0' });

  async function load() {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (status) p.set('status', status);
    setItems(await apiFetch(`/sensors?${p}`));
  }

  useEffect(() => { load(); }, [search, status]);

  async function save() {
    if (editing) await apiFetch(`/sensors/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
    else await apiFetch('/sensors', { method: 'POST', body: JSON.stringify(form) });
    setShowForm(false); setEditing(null); load();
  }

  async function remove(id: number) {
    await apiFetch(`/sensors/${id}`, { method: 'DELETE' });
    setSelected(null); load();
  }

  function openEdit(item: Sensor) {
    setEditing(item);
    setForm({ name:item.name, type:item.type, location:item.location||'', status:item.status, range_km:Number(item.range_km), battery_pct:item.battery_pct, firmware_version:item.firmware_version||'' });
    setShowForm(true);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Sensors</h1>
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
          <Plus size={16} />Add Sensor
        </button>
      </div>
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sensors..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-white text-sm" />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
          <option value="">All Statuses</option>
          {['active','offline','maintenance'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="grid gap-3">
        {items.map(item => (
          <div key={item.id} onClick={() => setSelected(item)}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-red-800 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Radio size={14} className="text-blue-400" />
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[item.status]||'bg-gray-700 text-gray-300'}`}>{item.status}</span>
                  <span className="text-xs text-gray-500">{item.type.replace('_',' ')}</span>
                </div>
                <h3 className="font-semibold text-white">{item.name}</h3>
                <p className="text-xs text-gray-400 mt-1">{item.location} • Range: {item.range_km}km • {item.detections_today} detections today</p>
              </div>
              <div className="ml-4 flex items-center gap-1">
                <Battery size={14} className={item.battery_pct > 50 ? 'text-green-400' : item.battery_pct > 20 ? 'text-yellow-400' : 'text-red-400'} />
                <span className={`text-sm font-bold ${item.battery_pct > 50 ? 'text-green-400' : item.battery_pct > 20 ? 'text-yellow-400' : 'text-red-400'}`}>{item.battery_pct}%</span>
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
              <div><p className="text-xs text-gray-500">Range</p><p className="text-white">{selected.range_km}km</p></div>
              <div><p className="text-xs text-gray-500">Battery</p><p className={selected.battery_pct > 50 ? 'text-green-400 font-bold' : 'text-yellow-400 font-bold'}>{selected.battery_pct}%</p></div>
              <div><p className="text-xs text-gray-500">Firmware</p><p className="text-white">{selected.firmware_version}</p></div>
              <div><p className="text-xs text-gray-500">Detections Today</p><p className="text-white">{selected.detections_today}</p></div>
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
            <h2 className="text-lg font-bold text-white mb-4">{editing ? 'Edit' : 'Add'} Sensor</h2>
            <div className="space-y-3">
              <input value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="Sensor name"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.type} onChange={e => setForm({...form,type:e.target.value})}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={form.status} onChange={e => setForm({...form,status:e.target.value})}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                  {['active','offline','maintenance'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <input value={form.location} onChange={e => setForm({...form,location:e.target.value})} placeholder="Location"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" step="0.1" value={form.range_km} onChange={e => setForm({...form,range_km:parseFloat(e.target.value)})} placeholder="Range (km)"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
                <input type="number" min="0" max="100" value={form.battery_pct} onChange={e => setForm({...form,battery_pct:parseInt(e.target.value)})} placeholder="Battery %"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              </div>
              <input value={form.firmware_version} onChange={e => setForm({...form,firmware_version:e.target.value})} placeholder="Firmware version"
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
