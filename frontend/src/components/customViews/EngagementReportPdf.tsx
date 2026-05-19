import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { apiDownload } from '../../api';

export default function EngagementReportPdf() {
  const [limit, setLimit] = useState(15);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function download() {
    setBusy(true); setErr(''); setMsg('');
    try {
      await apiDownload(`/custom-views/engagement-report.pdf?limit=${limit}`, `engagement-report-${Date.now()}.pdf`);
      setMsg(`Generated PDF (limit=${limit}) - check your downloads.`);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5" data-testid="cv-engagement-pdf">
      <div className="flex items-center gap-2 mb-3">
        <FileDown size={18} className="text-emerald-400" />
        <h3 className="font-semibold text-white">Engagement After-Action Report (PDF)</h3>
      </div>
      <p className="text-xs text-gray-400 mb-3">
        Server-rendered PDF summarising the most recent engagements, drones engaged/killed, Pk and expected cost.
        For defensive security research use only.
      </p>
      <div className="flex items-center gap-2 mb-3">
        <label className="text-xs text-gray-400">Engagements:</label>
        <input type="number" min={1} max={50} value={limit}
          onChange={e => setLimit(Math.max(1, Math.min(50, parseInt(e.target.value || '1', 10))))}
          className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white" />
        <button onClick={download} disabled={busy}
          className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1">
          <FileDown size={14} /> {busy ? 'Generating…' : 'Download PDF'}
        </button>
      </div>
      {msg && <p className="text-emerald-300 text-xs">{msg}</p>}
      {err && <p className="text-red-400 text-xs">{err}</p>}
    </div>
  );
}
