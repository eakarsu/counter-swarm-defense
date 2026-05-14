import { useState } from 'react'

type CMStatus = 'ready' | 'active' | 'standby' | 'deployed' | 'reloading'

interface Countermeasure {
  id: string
  name: string
  description: string
  icon: string
  status: CMStatus
  range: string
  ammo: string
  effectiveness: number
}

const initialCMs: Countermeasure[] = [
  {
    id: 'laser',
    name: 'Laser Interceptor',
    description: 'High-energy directed laser for precision single-target engagement',
    icon: '⚡',
    status: 'ready',
    range: '2.5 km',
    ammo: 'Unlimited (cooldown 8s)',
    effectiveness: 92,
  },
  {
    id: 'rf',
    name: 'RF Jammer',
    description: 'Broadband radio frequency disruption — disables drone control links',
    icon: '📻',
    status: 'active',
    range: '5.0 km radius',
    ammo: 'Continuous',
    effectiveness: 78,
  },
  {
    id: 'aerosol',
    name: 'Aerosol Dispersal',
    description: 'Sensor-blinding aerosol cloud for large-area coverage',
    icon: '💨',
    status: 'standby',
    range: '1.2 km radius',
    ammo: '4 canisters remaining',
    effectiveness: 65,
  },
  {
    id: 'net',
    name: 'Net Launcher',
    description: 'Kinetic net deployment system for physical drone capture',
    icon: '🕸️',
    status: 'deployed',
    range: '200 m',
    ammo: '2 of 6 nets used',
    effectiveness: 88,
  },
  {
    id: 'cyber',
    name: 'Cyber Attack Module',
    description: 'Exploits known drone firmware vulnerabilities for takeover',
    icon: '💻',
    status: 'ready',
    range: '800 m (line-of-sight)',
    ammo: '3 attack vectors loaded',
    effectiveness: 71,
  },
]

const statusStyles: Record<CMStatus, { badge: string; border: string; glow: string }> = {
  ready: {
    badge: 'bg-green-900/40 text-green-400 border-green-700/50',
    border: 'border-green-900/40',
    glow: 'hover:border-green-700/60',
  },
  active: {
    badge: 'bg-blue-900/40 text-blue-400 border-blue-700/50 animate-pulse',
    border: 'border-blue-800/50',
    glow: 'hover:border-blue-600/60',
  },
  standby: {
    badge: 'bg-yellow-900/40 text-yellow-400 border-yellow-700/50',
    border: 'border-yellow-900/30',
    glow: 'hover:border-yellow-700/50',
  },
  deployed: {
    badge: 'bg-orange-900/40 text-orange-400 border-orange-700/50',
    border: 'border-orange-900/40',
    glow: 'hover:border-orange-700/60',
  },
  reloading: {
    badge: 'bg-gray-800 text-gray-500 border-gray-700',
    border: 'border-gray-800',
    glow: '',
  },
}

export default function Countermeasures() {
  const [cms, setCMs] = useState<Countermeasure[]>(initialCMs)
  const [deploying, setDeploying] = useState<string | null>(null)

  const deploy = (id: string) => {
    setDeploying(id)
    setTimeout(() => {
      setCMs(prev => prev.map(cm =>
        cm.id === id
          ? { ...cm, status: cm.status === 'active' || cm.status === 'deployed' ? 'standby' : 'active' }
          : cm
      ))
      setDeploying(null)
    }, 1200)
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-200 tracking-wider">COUNTERMEASURES</h2>
        <p className="text-xs text-gray-500 mt-1">
          {cms.filter(c => c.status === 'active' || c.status === 'deployed').length} systems engaged ·{' '}
          {cms.filter(c => c.status === 'ready').length} ready to deploy
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {cms.map(cm => {
          const styles = statusStyles[cm.status]
          return (
            <div
              key={cm.id}
              className={`bg-black border rounded-xl p-5 transition-all ${styles.border} ${styles.glow}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{cm.icon}</div>
                  <div>
                    <h3 className="font-bold text-gray-200 text-sm">{cm.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded border font-bold uppercase tracking-wide ${styles.badge}`}>
                      {cm.status}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500 mb-4 leading-relaxed">{cm.description}</p>

              <div className="space-y-2 mb-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Range</span>
                  <span className="text-gray-300">{cm.range}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ammo/Charges</span>
                  <span className="text-gray-300">{cm.ammo}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Effectiveness</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${cm.effectiveness}%` }}
                      />
                    </div>
                    <span className="text-green-400">{cm.effectiveness}%</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => deploy(cm.id)}
                disabled={cm.status === 'reloading' || deploying === cm.id}
                className={`w-full py-2 rounded-lg text-sm font-bold tracking-wide transition-all ${
                  deploying === cm.id
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : cm.status === 'active' || cm.status === 'deployed'
                    ? 'bg-red-900/40 hover:bg-red-900/60 border border-red-700/50 text-red-400'
                    : cm.status === 'reloading'
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-green-900/40 hover:bg-green-900/60 border border-green-700/50 text-green-400'
                }`}
              >
                {deploying === cm.id ? '— DEPLOYING —' :
                  cm.status === 'active' || cm.status === 'deployed' ? 'DEACTIVATE' :
                  cm.status === 'reloading' ? 'RELOADING...' : 'DEPLOY'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
