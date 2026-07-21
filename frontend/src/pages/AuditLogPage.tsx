import { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import { apiFetch } from '../api';

interface AuditEntry {
  id: number; actor_label: string; action: string; entity_type: string; entity_id: string | null;
  details: Record<string, unknown>; event_hash: string; previous_hash: string; created_at: string;
}
interface Verification { valid: boolean; checked: number; head?: string; failedId?: number }

export default function AuditLogPage() {
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setError('');
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const [entries, verified] = await Promise.all([apiFetch(`/audit?${params}`), apiFetch('/audit/verify')]);
      setItems(entries); setVerification(verified);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Audit history unavailable'); }
  }

  useEffect(() => { load(); }, [search]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-white">Tamper-evident audit history</h1><p className="text-sm text-gray-400 mt-1">Entries are append-only and cryptographically chained per tenant.</p></div>
        <button onClick={load} className="bg-yellow-700 hover:bg-yellow-600 rounded-lg px-3 py-2 text-sm"><RefreshCw size={15} className="inline mr-2" />Verify</button>
      </div>
      {verification && <div className={`mb-4 border rounded-lg p-3 text-sm ${verification.valid ? 'bg-green-950 border-green-800 text-green-200' : 'bg-red-950 border-red-800 text-red-200'}`}>
        {verification.valid ? <CheckCircle2 size={16} className="inline mr-2" /> : <ShieldAlert size={16} className="inline mr-2" />}
        {verification.valid ? `Chain valid: ${verification.checked} entries checked.` : `Chain invalid at entry ${verification.failedId}.`}
      </div>}
      {error && <div className="mb-4 bg-red-950 border border-red-800 text-red-200 rounded-lg p-3 text-sm">{error}</div>}
      <div className="relative mb-4"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search actor, action, entity, or details" className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-white text-sm" /></div>
      <div className="space-y-2">
        {items.map(item => <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
          <div className="flex gap-3 items-center"><span className="text-xs bg-yellow-500/20 text-yellow-300 rounded-full px-2 py-1">{item.action}</span><span className="text-xs text-gray-500">{new Date(item.created_at).toLocaleString()}</span><span className="text-xs text-gray-400">{item.actor_label}</span><span className="text-xs text-gray-400">{item.entity_type}{item.entity_id ? ` #${item.entity_id}` : ''}</span></div>
          <p className="text-sm text-gray-300 mt-2 break-all">{JSON.stringify(item.details)}</p><p className="text-[10px] text-gray-600 mt-2 font-mono break-all">hash {item.event_hash}</p>
        </div>)}
        {!items.length && <p className="text-sm text-gray-500">No audit entries.</p>}
      </div>
    </div>
  );
}
