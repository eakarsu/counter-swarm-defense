import { useEffect, useMemo, useState } from 'react';
import { Radio } from 'lucide-react';
import { apiFetch } from '../../api';

type Cell = { sensor_count: number; online_count: number; total_range_km: number; avg_battery_pct: number; detections_today: number };
type ZoneTotal = { zone: string; sensor_count: number; online_count: number; total_range_km: number; zone_type?: string; security_level?: string; area_km2?: number | null; coverage_density?: number | null };
type Data = { generated_at: string; zones: string[]; sensor_types: string[]; grid: Record<string, Record<string, Cell>>; zone_totals: ZoneTotal[] };

function bgFor(intensity: number) {
  // intensity 0..1 -> red opacity
  const a = Math.max(0.05, Math.min(0.9, intensity));
  return { backgroundColor: `rgba(220, 38, 38, ${a.toFixed(2)})` };
}

export default function SensorCoverageHeatmap() {
  const [data, setData] = useState<Data | null>(null);
  const [metric, setMetric] = useState<'sensor_count' | 'total_range_km' | 'detections_today'>('sensor_count');
  const [err, setErr] = useState('');

  async function load() {
    setErr('');
    try { setData(await apiFetch('/custom-views/sensor-coverage-heatmap')); }
    catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  const max = useMemo(() => {
    if (!data) return 1;
    let m = 1;
    for (const z of data.zones) for (const t of data.sensor_types) {
      const v = (data.grid[z]?.[t]?.[metric] as number) || 0;
      if (v > m) m = v;
    }
    return m;
  }, [data, metric]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5" data-testid="cv-sensor-heatmap">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Radio size={18} className="text-cyan-400" />
          <h3 className="font-semibold text-white">Sensor Coverage Heatmap</h3>
        </div>
        <select value={metric} onChange={e => setMetric(e.target.value as any)}
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200">
          <option value="sensor_count">Sensors</option>
          <option value="total_range_km">Range km</option>
          <option value="detections_today">Detections (today)</option>
        </select>
      </div>
      {err && <p className="text-red-400 text-xs mb-2">{err}</p>}
      {!data ? <p className="text-gray-500 text-sm">Loading…</p> : (
        <div className="overflow-x-auto">
          <table className="text-xs min-w-full">
            <thead>
              <tr>
                <th className="text-left text-gray-400 font-medium p-1.5 sticky left-0 bg-gray-900">Zone</th>
                {data.sensor_types.map(t => <th key={t} className="text-gray-400 font-medium p-1.5 text-center">{t}</th>)}
                <th className="text-gray-400 font-medium p-1.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.zone_totals.map(zt => (
                <tr key={zt.zone}>
                  <td className="p-1.5 text-gray-200 sticky left-0 bg-gray-900 whitespace-nowrap">
                    {zt.zone}
                    <span className="ml-2 text-[10px] text-gray-500">{zt.security_level || ''}</span>
                  </td>
                  {data.sensor_types.map(t => {
                    const c = (data.grid[zt.zone] || {})[t] || { sensor_count: 0, online_count: 0, total_range_km: 0, avg_battery_pct: 0, detections_today: 0 };
                    const v = (c as any)[metric] || 0;
                    const intensity = v / max;
                    return (
                      <td key={t} className="p-1 text-center" title={`${zt.zone} - ${t}: sensors=${c.sensor_count} online=${c.online_count} range=${c.total_range_km} det=${c.detections_today}`}>
                        <div className="rounded text-white font-medium px-2 py-1" style={bgFor(intensity)}>
                          {Number(v).toFixed(metric === 'total_range_km' ? 1 : 0)}
                        </div>
                      </td>
                    );
                  })}
                  <td className="p-1.5 text-right text-gray-200 font-mono">{zt.sensor_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
