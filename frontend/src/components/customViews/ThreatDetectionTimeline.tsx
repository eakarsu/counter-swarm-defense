import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { apiFetch } from '../../api';

type Bucket = {
  bucket_start: string;
  group_1: number;
  group_2: number;
  other: number;
  total: number;
  drone_count: number;
  avg_threat_level: number;
};
type Data = { hours: number; bucket_minutes: number; generated_at: string; series: Bucket[] };

export default function ThreatDetectionTimeline() {
  const [data, setData] = useState<Data | null>(null);
  const [hours, setHours] = useState(24);
  const [bucket, setBucket] = useState(60);
  const [err, setErr] = useState('');

  async function load() {
    setErr('');
    try { setData(await apiFetch(`/custom-views/threat-detection-timeline?hours=${hours}&bucket_minutes=${bucket}`)); }
    catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [hours, bucket]);

  const series = data?.series || [];
  const max = Math.max(1, ...series.map(s => s.total));
  const peak = series.reduce((a, c) => c.total > (a?.total || 0) ? c : a, series[0]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5" data-testid="cv-threat-timeline">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-red-400" />
          <h3 className="font-semibold text-white">Threat Detection Timeline</h3>
        </div>
        <div className="flex gap-2 text-xs">
          <select value={hours} onChange={e => setHours(parseInt(e.target.value, 10))}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200">
            <option value={6}>Last 6h</option><option value={24}>Last 24h</option>
            <option value={72}>Last 72h</option><option value={168}>Last 7d</option>
          </select>
          <select value={bucket} onChange={e => setBucket(parseInt(e.target.value, 10))}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200">
            <option value={15}>15-min</option><option value={60}>1-hr</option><option value={180}>3-hr</option>
          </select>
        </div>
      </div>
      {err && <p className="text-red-400 text-xs mb-2">{err}</p>}
      <div className="text-xs text-gray-400 mb-2">
        Buckets: {series.length} - Peak: {peak ? `${peak.total} threats @ ${new Date(peak.bucket_start).toLocaleString()}` : 'n/a'}
      </div>
      <div className="flex items-end gap-[2px] h-40 bg-gray-950/50 border border-gray-800 rounded p-2">
        {series.map((s, i) => {
          const h1 = (s.group_1 / max) * 100;
          const h2 = (s.group_2 / max) * 100;
          const ho = (s.other / max) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col justify-end" title={`${new Date(s.bucket_start).toLocaleString()} - total ${s.total} (g1=${s.group_1} g2=${s.group_2} other=${s.other})`}>
              <div className="bg-orange-500" style={{ height: `${ho}%`, minHeight: s.other ? '2px' : 0 }} />
              <div className="bg-red-500" style={{ height: `${h2}%`, minHeight: s.group_2 ? '2px' : 0 }} />
              <div className="bg-yellow-400" style={{ height: `${h1}%`, minHeight: s.group_1 ? '2px' : 0 }} />
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 text-xs text-gray-400 mt-2">
        <span><span className="inline-block w-3 h-3 bg-yellow-400 mr-1" />Group 1</span>
        <span><span className="inline-block w-3 h-3 bg-red-500 mr-1" />Group 2</span>
        <span><span className="inline-block w-3 h-3 bg-orange-500 mr-1" />Other</span>
      </div>
    </div>
  );
}
