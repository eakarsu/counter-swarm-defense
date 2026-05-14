import { useState } from 'react';
import { Search as SearchIcon, AlertTriangle, Crosshair, Radio, FileWarning, Map } from 'lucide-react';
import { apiFetch } from '../api';

interface Results {
  threats?: any[];
  countermeasures?: any[];
  sensors?: any[];
  incidents?: any[];
  zones?: any[];
}

const SECTIONS: { key: keyof Results; label: string; icon: any; color: string }[] = [
  { key: 'threats', label: 'Threats', icon: AlertTriangle, color: 'text-red-400' },
  { key: 'countermeasures', label: 'Countermeasures', icon: Crosshair, color: 'text-green-400' },
  { key: 'sensors', label: 'Sensors', icon: Radio, color: 'text-blue-400' },
  { key: 'incidents', label: 'Incidents', icon: FileWarning, color: 'text-yellow-400' },
  { key: 'zones', label: 'Defense Zones', icon: Map, color: 'text-violet-400' },
];

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [entity, setEntity] = useState('');
  const [results, setResults] = useState<Results>({});
  const [loading, setLoading] = useState(false);

  async function run() {
    if (!q.trim()) { setResults({}); return; }
    setLoading(true);
    try {
      const p = new URLSearchParams({ q });
      if (status) p.set('status', status);
      if (type) p.set('type', type);
      if (entity) p.set('entity', entity);
      const data = await apiFetch(`/search?${p}`);
      setResults(data.results || {});
    } catch { setResults({}); }
    finally { setLoading(false); }
  }

  function summarize(item: any): string {
    return Object.entries(item)
      .filter(([k]) => !['id'].includes(k))
      .slice(0, 4)
      .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
      .join(' • ');
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6"><SearchIcon size={28} className="text-cyan-400" /><h1 className="text-2xl font-bold text-white">Global Search & Filter</h1></div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && run()} placeholder="Search across all entities..." className="md:col-span-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
          <select value={entity} onChange={e => setEntity(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
            <option value="">All entities</option>
            {SECTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <button onClick={run} disabled={loading} className="bg-cyan-700 hover:bg-cyan-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">{loading ? 'Searching...' : 'Search'}</button>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <input value={status} onChange={e => setStatus(e.target.value)} placeholder="Filter: status (threats only)" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
          <input value={type} onChange={e => setType(e.target.value)} placeholder="Filter: type (threats only)" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
        </div>
      </div>

      {SECTIONS.map(({ key, label, icon: Icon, color }) => {
        const rows = results[key] || [];
        if (!rows.length) return null;
        return (
          <div key={key} className="mb-6">
            <div className="flex items-center gap-2 mb-2"><Icon size={18} className={color} /><h2 className="text-lg font-semibold text-white">{label}</h2><span className="text-xs text-gray-500">({rows.length})</span></div>
            <div className="grid gap-2">
              {rows.map((it: any) => (
                <div key={it.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-sm text-gray-300">
                  <span className="text-gray-500 mr-2">#{it.id}</span>{summarize(it)}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {Object.values(results).every(v => !v?.length) && q && !loading && <p className="text-gray-500 text-sm">No matches.</p>}
    </div>
  );
}
