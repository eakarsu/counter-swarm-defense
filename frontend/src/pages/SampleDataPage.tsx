import { useState } from 'react';
import { Database, AlertTriangle, Crosshair, Zap, Radio, FileWarning, Map, Sparkles, CheckCircle2, XCircle } from 'lucide-react';
import { apiFetch } from '../api';

type EntityKey = 'threats' | 'countermeasures' | 'deployments' | 'sensors' | 'incidents' | 'zones';

const ENTITIES: { key: EntityKey; label: string; icon: any; color: string; blurb: string }[] = [
  { key: 'threats', label: 'Threats', icon: AlertTriangle, color: 'bg-red-700 hover:bg-red-800',
    blurb: 'Training-record threat observations for classifier drills.' },
  { key: 'countermeasures', label: 'Countermeasures', icon: Crosshair, color: 'bg-orange-700 hover:bg-orange-800',
    blurb: 'Defensive asset inventory entries.' },
  { key: 'deployments', label: 'Deployments', icon: Zap, color: 'bg-amber-700 hover:bg-amber-800',
    blurb: 'Defensive training-drill deployment logs.' },
  { key: 'sensors', label: 'Sensors', icon: Radio, color: 'bg-emerald-700 hover:bg-emerald-800',
    blurb: 'Sensor telemetry / health log records.' },
  { key: 'incidents', label: 'Incidents', icon: FileWarning, color: 'bg-rose-700 hover:bg-rose-800',
    blurb: 'Tabletop / drill incident debrief entries.' },
  { key: 'zones', label: 'Defense Zones', icon: Map, color: 'bg-cyan-700 hover:bg-cyan-800',
    blurb: 'Defensive-perimeter and training-range zone records.' },
];

type Toast = { id: number; kind: 'ok' | 'err'; msg: string };

export default function SampleDataPage() {
  const [busy, setBusy] = useState<EntityKey | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);

  function pushToast(kind: 'ok' | 'err', msg: string) {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, kind, msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }

  async function seed(entity: EntityKey) {
    setBusy(entity);
    try {
      const data = await apiFetch(`/admin/sample-data/${entity}`, { method: 'POST', body: '{}' });
      const inserted = Number(data?.inserted || 0);
      setCounts(c => ({ ...c, [entity]: (c[entity] || 0) + inserted }));
      pushToast('ok', `Inserted ${inserted} ${entity} (defensive/training rows).`);
    } catch (e: any) {
      pushToast('err', `Failed to seed ${entity}: ${e?.message || 'unknown error'}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Database size={28} className="text-emerald-400" />
        <h1 className="text-2xl font-bold text-white">Sample Data</h1>
      </div>
      <p className="text-xs text-emerald-300/80 mb-6">
        Defensive / educational / training-simulation rows only. Each button inserts 5–10 realistic
        records into the corresponding table to bootstrap operator drills, recognition training,
        and AI-tool demos.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        {ENTITIES.map(({ key, label, icon: Icon, color, blurb }) => (
          <div key={key} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={20} className="text-white/80" />
              <h2 className="text-lg font-semibold text-white">{label}</h2>
              {counts[key] !== undefined && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                  +{counts[key]} total
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mb-4">{blurb}</p>
            <button
              onClick={() => seed(key)}
              disabled={busy === key}
              className={`${color} disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2`}
            >
              <Sparkles size={16} />
              {busy === key ? 'Seeding...' : `Seed ${label}`}
            </button>
          </div>
        ))}
      </div>

      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-sm ${
              t.kind === 'ok' ? 'bg-emerald-700 text-white' : 'bg-red-800 text-white'
            }`}
          >
            {t.kind === 'ok' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
