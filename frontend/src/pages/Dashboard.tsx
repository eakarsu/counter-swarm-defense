import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Radio,
  Zap,
  AlertTriangle,
  Crosshair,
  Activity,
  Sparkles,
  Database,
  ScrollText,
  ShieldCheck,
} from 'lucide-react';
import { apiFetch } from '../api';

type AuditRow = {
  id: number;
  actor_email: string | null;
  action: string | null;
  entity_type: string | null;
  entity_id: string | null;
  details: string | null;
  created_at: string;
};

type Stats = {
  framing: string;
  kpis: {
    active_sensors: number;
    sensors_total: number;
    training_drills_logged: number;
    threat_training_records: number;
    countermeasure_inventory: number;
    deployments: number;
    incidents_logged: number;
    defense_zones: number;
  };
  recent_activity: AuditRow[];
  generated_at: string;
};

const KPI_DEFS: {
  key: keyof Stats['kpis'];
  label: string;
  hint: string;
  icon: any;
  accent: string;
}[] = [
  {
    key: 'active_sensors',
    label: 'Active Sensors',
    hint: 'Online sensor nodes (training network)',
    icon: Radio,
    accent: 'from-emerald-600 to-emerald-800 text-emerald-300',
  },
  {
    key: 'training_drills_logged',
    label: 'Training Drills Logged',
    hint: 'Drill deployments recorded for after-action review',
    icon: Activity,
    accent: 'from-amber-600 to-amber-800 text-amber-300',
  },
  {
    key: 'threat_training_records',
    label: 'Threat Training Records',
    hint: 'Simulated threat observations available for classifier drills',
    icon: AlertTriangle,
    accent: 'from-red-600 to-red-800 text-red-300',
  },
  {
    key: 'countermeasure_inventory',
    label: 'Countermeasure Inventory',
    hint: 'Defensive assets catalogued in the training inventory',
    icon: Crosshair,
    accent: 'from-orange-600 to-orange-800 text-orange-300',
  },
  {
    key: 'deployments',
    label: 'Deployments',
    hint: 'Drill deployment history (defensive response exercises)',
    icon: Zap,
    accent: 'from-violet-600 to-violet-800 text-violet-300',
  },
];

const QUICK_ACTIONS = [
  { to: '/ai', label: 'AI Center', icon: Sparkles, color: 'bg-violet-700 hover:bg-violet-800' },
  { to: '/sensors', label: 'Sensors', icon: Radio, color: 'bg-emerald-700 hover:bg-emerald-800' },
  { to: '/deployments', label: 'Drills', icon: Zap, color: 'bg-amber-700 hover:bg-amber-800' },
  { to: '/sample-data', label: 'Sample Data', icon: Database, color: 'bg-cyan-700 hover:bg-cyan-800' },
];

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const data = await apiFetch('/dashboard/stats');
      setStats(data);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <LayoutDashboard size={28} className="text-red-400" />
        <h1 className="text-2xl font-bold text-white">Defense Dashboard</h1>
        <span className="ml-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          Training Mode
        </span>
      </div>
      <p className="text-xs text-emerald-300/80 mb-6 flex items-center gap-2">
        <ShieldCheck size={14} />
        {stats?.framing ||
          'Defensive training & simulation environment — all metrics reflect drill and training records only.'}
      </p>

      {err && (
        <div className="bg-red-900/40 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-4 text-sm">
          {err}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {KPI_DEFS.map(({ key, label, hint, icon: Icon, accent }) => {
          const value = stats?.kpis?.[key];
          return (
            <div
              key={key}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-4 relative overflow-hidden"
            >
              <div className={`absolute -right-6 -top-6 w-20 h-20 rounded-full bg-gradient-to-br ${accent} opacity-20`} />
              <div className="flex items-center gap-2 mb-1">
                <Icon size={16} className="text-white/70" />
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">
                  {label}
                </p>
              </div>
              <p className="text-3xl font-bold text-white tabular-nums">
                {loading ? '—' : value ?? 0}
              </p>
              <p className="text-[11px] text-gray-500 mt-1 leading-snug">{hint}</p>
            </div>
          );
        })}
      </div>

      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          {QUICK_ACTIONS.map(({ to, label, icon: Icon, color }) => (
            <Link
              key={to}
              to={to}
              className={`${color} text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <ScrollText size={18} className="text-yellow-400" />
          <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 ml-2">
            Drill Audit Trail
          </span>
          <button
            onClick={load}
            disabled={loading}
            className="ml-auto text-xs px-3 py-1 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
        {stats && stats.recent_activity.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No activity recorded yet. Run a Training drill or seed Sample Data to populate the audit
            trail.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="py-2 pr-4">When</th>
                  <th className="py-2 pr-4">Operator</th>
                  <th className="py-2 pr-4">Action</th>
                  <th className="py-2 pr-4">Entity</th>
                  <th className="py-2 pr-4">Details</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                {(stats?.recent_activity || []).map((row) => (
                  <tr key={row.id} className="border-t border-gray-800">
                    <td className="py-2 pr-4 whitespace-nowrap text-gray-400">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4">{row.actor_email || '—'}</td>
                    <td className="py-2 pr-4">
                      <span className="px-2 py-0.5 rounded bg-gray-800 text-xs">
                        {row.action || '—'}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-gray-400">
                      {row.entity_type || '—'}
                      {row.entity_id ? ` #${row.entity_id}` : ''}
                    </td>
                    <td className="py-2 pr-4 text-gray-400 max-w-md truncate">
                      {row.details || ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[11px] text-gray-600 mt-6 italic">
        Preview / Training data shown above is for drill and educational use only — no real-world
        targeting or operational engagement.
      </p>
    </div>
  );
}
