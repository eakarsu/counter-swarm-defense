import { useState, useEffect } from 'react';
import { Plus, Search, AlertTriangle, X } from 'lucide-react';
import { apiFetch } from '../api';
import { Threat } from '../types';

const STATUS_COLORS: Record<string,string> = { active:'bg-red-500/20 text-red-300', neutralized:'bg-green-500/20 text-green-300', escaped:'bg-orange-500/20 text-orange-300', false_alarm:'bg-gray-500/20 text-gray-300' };
const TYPES = ['single','small_swarm','large_swarm','coordinated_attack'];
const STATUSES = ['active','neutralized','escaped','false_alarm'];

export default function ThreatsPage() {
  const [items, setItems] = useState<Threat[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Threat|null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Threat|null>(null);
  const [form, setForm] = useState({ type:'single', drone_count:1, threat_level:5.0, lat:0, lng:0, altitude_m:100, speed_kmh:60, status:'active', zone_name:'' });

  async function load() {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (status) p.set('status', status);
    setItems(await apiFetch(`/threats?${p}`));
  }

  useEffect(() => { load(); }, [search, status]);

  async function save() {
    if (editing) await apiFetch(`/threats/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
    else await apiFetch('/threats', { method: 'POST', body: JSON.stringify(form) });
    setShowForm(false); setEditing(null); load();
  }

  async function remove(id: number) {
    await apiFetch(`/threats/${id}`, { method: 'DELETE' });
    setSelected(null); load();
  }

  function openEdit(item: Threat) {
    setEditing(item);
    setForm({ type:item.type, drone_count:item.drone_count, threat_level:Number(item.threat_level), lat:Number(item.lat), lng:Number(item.lng), altitude_m:Number(item.altitude_m), speed_kmh:Number(item.speed_kmh), status:item.status, zone_name:item.zone_name||'' });
    setShowForm(true);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Threats</h1>
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
          <Plus size={16} />New Threat
        </button>
      </div>
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search threats..."
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
                  <AlertTriangle size={14} className="text-red-400" />
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[item.status]||'bg-gray-700 text-gray-300'}`}>{item.status}</span>
                  <span className="text-xs text-gray-500">{item.type.replace('_',' ')}</span>
                </div>
                <h3 className="font-semibold text-white">{item.zone_name} — {item.drone_count} drone{item.drone_count!==1?'s':''}</h3>
                <p className="text-xs text-gray-400 mt-1">Alt: {item.altitude_m}m • Speed: {item.speed_kmh}km/h • {new Date(item.detected_at).toLocaleString()}</p>
              </div>
              <div className="ml-4 text-right">
                <div className="text-xs text-gray-500">Threat Level</div>
                <div className={`text-lg font-bold ${Number(item.threat_level)>=8?'text-red-400':Number(item.threat_level)>=5?'text-orange-400':'text-yellow-400'}`}>{Number(item.threat_level).toFixed(1)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-y-0 right-0 w-[450px] bg-gray-900 border-l border-gray-800 p-6 overflow-y-auto z-50 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Threat Detail</h2>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
          </div>
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[selected.status]}`}>{selected.status}</span>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-700 text-gray-300">{selected.type.replace('_',' ')}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-gray-500">Zone</p><p className="text-white">{selected.zone_name}</p></div>
              <div><p className="text-xs text-gray-500">Drone Count</p><p className="text-white">{selected.drone_count}</p></div>
              <div><p className="text-xs text-gray-500">Threat Level</p><p className="text-red-400 font-bold text-lg">{Number(selected.threat_level).toFixed(1)}</p></div>
              <div><p className="text-xs text-gray-500">Altitude</p><p className="text-white">{selected.altitude_m}m</p></div>
              <div><p className="text-xs text-gray-500">Speed</p><p className="text-white">{selected.speed_kmh} km/h</p></div>
              <div><p className="text-xs text-gray-500">Coordinates</p><p className="text-white">{Number(selected.lat).toFixed(4)}, {Number(selected.lng).toFixed(4)}</p></div>
              <div><p className="text-xs text-gray-500">Detected</p><p className="text-white">{new Date(selected.detected_at).toLocaleString()}</p></div>
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
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-4">{editing ? 'Edit' : 'New'} Threat</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <select value={form.type} onChange={e => setForm({...form,type:e.target.value})}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={form.status} onChange={e => setForm({...form,status:e.target.value})}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <input value={form.zone_name} onChange={e => setForm({...form,zone_name:e.target.value})} placeholder="Zone name"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={form.drone_count} onChange={e => setForm({...form,drone_count:parseInt(e.target.value)})} placeholder="Drone count"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
                <input type="number" step="0.1" min="0" max="10" value={form.threat_level} onChange={e => setForm({...form,threat_level:parseFloat(e.target.value)})} placeholder="Threat level (0-10)"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
                <input type="number" step="0.1" value={form.altitude_m} onChange={e => setForm({...form,altitude_m:parseFloat(e.target.value)})} placeholder="Altitude (m)"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
                <input type="number" step="0.1" value={form.speed_kmh} onChange={e => setForm({...form,speed_kmh:parseFloat(e.target.value)})} placeholder="Speed (km/h)"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
                <input type="number" step="0.0001" value={form.lat} onChange={e => setForm({...form,lat:parseFloat(e.target.value)})} placeholder="Latitude"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
                <input type="number" step="0.0001" value={form.lng} onChange={e => setForm({...form,lng:parseFloat(e.target.value)})} placeholder="Longitude"
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
