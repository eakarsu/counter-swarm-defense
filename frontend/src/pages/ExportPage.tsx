import { useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { apiDownload, apiFetch } from '../api';

const ENTITIES = [
  { key: 'threats', label: 'Threats' },
  { key: 'countermeasures', label: 'Countermeasures' },
  { key: 'deployments', label: 'Deployments' },
  { key: 'sensors', label: 'Sensors' },
  { key: 'incidents', label: 'Incidents' },
  { key: 'zones', label: 'Defense Zones' },
];

export default function ExportPage() {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  async function download(entity: string) {
    setBusy(entity); setMsg('');
    try {
      await apiDownload(`/export/${entity}`, `${entity}.csv`);
      setMsg(`Downloaded ${entity}.csv`);
      try {
        await apiFetch('/audit', { method: 'POST', body: JSON.stringify({ action: 'export_csv', entity_type: entity, details: `Exported ${entity} as CSV` }) });
      } catch { /* audit best-effort */ }
    } catch (e: any) {
      setMsg('Export failed: ' + (e?.message || 'unknown'));
    } finally { setBusy(null); }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6"><FileSpreadsheet size={28} className="text-emerald-400" /><h1 className="text-2xl font-bold text-white">CSV Export</h1></div>
      <p className="text-gray-400 text-sm mb-6">Download a CSV snapshot of any entity. Each export is recorded in the audit log.</p>
      <div className="grid gap-3">
        {ENTITIES.map(e => (
          <div key={e.key} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">{e.label}</h3>
              <p className="text-xs text-gray-400 mt-1">/api/export/{e.key}</p>
            </div>
            <button onClick={() => download(e.key)} disabled={busy === e.key} className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
              <Download size={16} />{busy === e.key ? 'Downloading...' : 'Download CSV'}
            </button>
          </div>
        ))}
      </div>
      {msg && <p className="mt-4 text-sm text-emerald-300">{msg}</p>}
    </div>
  );
}
