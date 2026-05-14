import { useEffect, useState } from 'react';
import { ScrollText, Search, Plus, X } from 'lucide-react';
import { apiFetch } from '../api';

interface AuditEntry {
  id: number;
  actor_email: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: string;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  export_csv: 'bg-emerald-500/20 text-emerald-300',
  login: 'bg-blue-500/20 text-blue-300',
  create: 'bg-violet-500/20 text-violet-300',
  update: 'bg-yellow-500/20 text-yellow-300',
  delete: 'bg-red-500/20 text-red-300',
};

export default function AuditLogPage() {
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ action: 'note', entity_type: 'manual', entity_id: '', details: '' });

  async function load() {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (action) p.set('action', action);
    try { setItems(await apiFetch(`/audit?${p}`)); }
    catch { setItems([]); }
  }

  useEffect(() => { load(); }, [search, action]);

  async function save() {
    await apiFetch('/audit', { method: 'POST', body: JSON.stringify(form) });
    setShowForm(false);
    setForm({ action: 'note', entity_type: 'manual', entity_id: '', details: '' });
    load();
  }

  async function remove(id: number) {
    await apiFetch(`/audit/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3"><ScrollText size={28} className="text-yellow-400" /><h1 className="text-2xl font-bold text-white">Audit Log</h1></div>
        <button onClick={() => setShowForm(true)} className="bg-yellow-700 hover:bg-yellow-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"><Plus size={16} />Add Entry</button>
      </div>
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search audit log..." className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-white text-sm" />
        </div>
        <select value={action} onChange={e => setAction(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
          <option value="">All Actions</option>
          {['export_csv', 'login', 'create', 'update', 'delete', 'note'].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <div className="grid gap-2">
        {items.length === 0 && <p className="text-gray-500 text-sm">No audit entries.</p>}
        {items.map(it => (
          <div key={it.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center gap-4">
            <span className={`text-xs px-2 py-0.5 rounded-full ${ACTION_COLORS[it.action] || 'bg-gray-700 text-gray-300'}`}>{it.action}</span>
            <span className="text-xs text-gray-500 w-44 truncate">{new Date(it.created_at).toLocaleString()}</span>
            <span className="text-xs text-gray-400 w-44 truncate">{it.actor_email}</span>
            <span className="text-xs text-gray-400">{it.entity_type}{it.entity_id ? ` #${it.entity_id}` : ''}</span>
            <span className="flex-1 text-sm text-white truncate">{it.details}</span>
            <button onClick={() => remove(it.id)} className="text-gray-500 hover:text-red-400"><X size={16} /></button>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-bold text-white mb-4">Add Audit Entry</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input value={form.action} onChange={e => setForm({ ...form, action: e.target.value })} placeholder="Action" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
                <input value={form.entity_type} onChange={e => setForm({ ...form, entity_type: e.target.value })} placeholder="Entity type" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              </div>
              <input value={form.entity_id} onChange={e => setForm({ ...form, entity_id: e.target.value })} placeholder="Entity id (optional)" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              <textarea value={form.details} onChange={e => setForm({ ...form, details: e.target.value })} placeholder="Details" rows={4} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm resize-none" />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={save} className="flex-1 bg-yellow-700 hover:bg-yellow-800 text-white py-2 rounded-lg text-sm font-medium">Save</button>
              <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
