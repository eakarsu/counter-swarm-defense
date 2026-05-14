interface Threat {
  id: string
  type: 'single' | 'small_swarm' | 'large_swarm' | 'coordinated_attack'
  droneCount: number
  threatLevel: number
  zone: string
  recommendedAction: string
  status: 'active' | 'neutralized'
}

const threats: Threat[] = [
  {
    id: 'THR-001',
    type: 'coordinated_attack',
    droneCount: 4,
    threatLevel: 87,
    zone: 'SECTOR-ALPHA',
    recommendedAction: 'Deploy Laser Interceptor + activate RF Jammer',
    status: 'active',
  },
  {
    id: 'THR-002',
    type: 'small_swarm',
    droneCount: 2,
    threatLevel: 62,
    zone: 'SECTOR-BRAVO',
    recommendedAction: 'Engage Net Launcher array',
    status: 'active',
  },
  {
    id: 'THR-003',
    type: 'single',
    droneCount: 1,
    threatLevel: 34,
    zone: 'SECTOR-DELTA',
    recommendedAction: 'Monitor — Aerosol Dispersal if escalates',
    status: 'active',
  },
  {
    id: 'THR-004',
    type: 'large_swarm',
    droneCount: 6,
    threatLevel: 95,
    zone: 'SECTOR-CHARLIE',
    recommendedAction: 'FULL DEFENSIVE POSTURE — all countermeasures',
    status: 'neutralized',
  },
  {
    id: 'THR-005',
    type: 'single',
    droneCount: 1,
    threatLevel: 15,
    zone: 'PERIMETER-EAST',
    recommendedAction: 'Engage Cyber Attack module',
    status: 'neutralized',
  },
]

const typeLabels: Record<Threat['type'], string> = {
  single: 'Single Drone',
  small_swarm: 'Small Swarm',
  large_swarm: 'Large Swarm',
  coordinated_attack: 'Coordinated Attack',
}

const typeColors: Record<Threat['type'], string> = {
  single: 'text-yellow-400 bg-yellow-900/30 border-yellow-800/50',
  small_swarm: 'text-orange-400 bg-orange-900/30 border-orange-800/50',
  large_swarm: 'text-red-400 bg-red-900/30 border-red-800/50',
  coordinated_attack: 'text-red-300 bg-red-950/60 border-red-700/60',
}

function ThreatBar({ level, neutralized }: { level: number; neutralized: boolean }) {
  const color = neutralized ? 'bg-gray-600' :
    level >= 80 ? 'bg-red-500' :
    level >= 60 ? 'bg-orange-500' :
    level >= 40 ? 'bg-yellow-500' : 'bg-green-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${level}%` }}
        />
      </div>
      <span className={`text-xs font-bold w-8 text-right ${neutralized ? 'text-gray-600' : level >= 80 ? 'text-red-400' : level >= 60 ? 'text-orange-400' : 'text-yellow-400'}`}>
        {level}%
      </span>
    </div>
  )
}

export default function ThreatAssessment() {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-200 tracking-wider">THREAT ASSESSMENT</h2>
        <p className="text-xs text-gray-500 mt-1">
          {threats.filter(t => t.status === 'active').length} active threats ·{' '}
          {threats.filter(t => t.status === 'neutralized').length} neutralized
        </p>
      </div>

      <div className="bg-black border border-gray-900 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-600 text-xs uppercase tracking-widest">
              <th className="text-left px-4 py-3">Threat ID</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-center px-4 py-3">Drones</th>
              <th className="text-left px-4 py-3 w-40">Threat Level</th>
              <th className="text-left px-4 py-3">Zone</th>
              <th className="text-left px-4 py-3">Recommended Action</th>
              <th className="text-center px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {threats.map((threat, i) => (
              <tr
                key={threat.id}
                className={`${i < threats.length - 1 ? 'border-b border-gray-900/60' : ''} ${threat.status === 'neutralized' ? 'opacity-50' : ''}`}
              >
                <td className="px-4 py-3">
                  <span className="font-bold text-gray-300 font-mono">{threat.id}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded border font-medium ${typeColors[threat.type]}`}>
                    {typeLabels[threat.type]}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="font-bold text-orange-400">{threat.droneCount}</span>
                </td>
                <td className="px-4 py-3 w-40">
                  <ThreatBar level={threat.threatLevel} neutralized={threat.status === 'neutralized'} />
                </td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{threat.zone}</td>
                <td className="px-4 py-3 text-gray-400 text-xs max-w-xs">{threat.recommendedAction}</td>
                <td className="px-4 py-3 text-center">
                  {threat.status === 'active' ? (
                    <span className="text-xs px-2 py-1 rounded bg-red-900/40 text-red-400 border border-red-800/50 animate-pulse">
                      ACTIVE
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded bg-green-900/40 text-green-600 border border-green-900/50">
                      NEUTRALIZED
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
