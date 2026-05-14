interface EventLog {
  time: string
  event: string
  level: 'info' | 'warn' | 'critical' | 'success'
}

const eventLog: EventLog[] = [
  { time: '14:37:22', event: 'THR-004 (Large Swarm, Sector Charlie) — NEUTRALIZED via RF Jammer + Net array', level: 'success' },
  { time: '14:35:01', event: 'Laser Interceptor: target lock acquired on D-01, engagement authorized', level: 'warn' },
  { time: '14:32:15', event: 'New contact: D-04 entering Sector Delta at 150m altitude', level: 'critical' },
  { time: '14:29:44', event: 'RF Jammer activated — jamming 2.4GHz + 5.8GHz bands in Sector Alpha', level: 'info' },
  { time: '14:27:10', event: 'THR-005 neutralized — cyber attack vector successful', level: 'success' },
  { time: '14:22:03', event: 'THREAT LEVEL elevated: ELEVATED → HIGH', level: 'critical' },
  { time: '14:18:55', event: 'U-01 approaching from East perimeter — classification pending', level: 'warn' },
  { time: '14:15:00', event: 'System status check: all subsystems nominal', level: 'info' },
]

const levelStyles: Record<EventLog['level'], string> = {
  info: 'text-gray-400',
  warn: 'text-yellow-400',
  critical: 'text-red-400',
  success: 'text-green-400',
}

const levelPrefix: Record<EventLog['level'], string> = {
  info: '[INFO]   ',
  warn: '[WARN]   ',
  critical: '[ALERT]  ',
  success: '[OK]     ',
}

function StatCard({ label, value, unit, color }: { label: string; value: string | number; unit?: string; color: string }) {
  return (
    <div className="bg-black border border-gray-900 rounded-xl p-5 flex flex-col gap-2">
      <div className="text-xs text-gray-600 uppercase tracking-widest">{label}</div>
      <div className={`text-3xl font-bold ${color}`}>
        {value}
        {unit && <span className="text-lg ml-1 text-gray-600">{unit}</span>}
      </div>
    </div>
  )
}

export default function DefenseStatus() {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-200 tracking-wider">DEFENSE STATUS</h2>
        <p className="text-xs text-gray-500 mt-1">Real-time system operational overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        <StatCard label="Interceptors Deployed" value={3} color="text-orange-400" />
        <StatCard label="Threats Neutralized" value={7} color="text-green-500" />
        <StatCard label="Active Jamming Zones" value={2} color="text-blue-400" />
        <StatCard label="System Integrity" value={94} unit="%" color="text-green-400" />
        <StatCard label="Response Time" value="1.2" unit="s avg" color="text-yellow-400" />
      </div>

      {/* System subsystems grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {[
          { name: 'Sensor Array', status: 'NOMINAL', health: 98, color: 'bg-green-500' },
          { name: 'Fire Control', status: 'NOMINAL', health: 100, color: 'bg-green-500' },
          { name: 'Power Grid A', status: 'NOMINAL', health: 94, color: 'bg-green-500' },
          { name: 'Power Grid B', status: 'DEGRADED', health: 67, color: 'bg-yellow-500' },
          { name: 'Comms Link', status: 'NOMINAL', health: 100, color: 'bg-green-500' },
          { name: 'Backup Systems', status: 'STANDBY', health: 100, color: 'bg-blue-500' },
        ].map(sys => (
          <div key={sys.name} className="bg-black border border-gray-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 font-medium">{sys.name}</span>
              <span className={`text-xs font-bold ${
                sys.status === 'NOMINAL' ? 'text-green-500' :
                sys.status === 'DEGRADED' ? 'text-yellow-400' : 'text-blue-400'
              }`}>{sys.status}</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${sys.color}`} style={{ width: `${sys.health}%` }} />
            </div>
            <div className="text-xs text-gray-600 mt-1 text-right">{sys.health}%</div>
          </div>
        ))}
      </div>

      {/* Recent event log */}
      <div>
        <div className="text-xs text-gray-600 uppercase tracking-widest mb-3">RECENT EVENT LOG</div>
        <div className="bg-black border border-gray-900 rounded-xl p-4 font-mono text-xs space-y-1.5 max-h-64 overflow-auto">
          {eventLog.map((event, i) => (
            <div key={i} className="flex gap-3">
              <span className="text-gray-700 shrink-0">{event.time}</span>
              <span className={`shrink-0 ${levelStyles[event.level]}`}>{levelPrefix[event.level]}</span>
              <span className="text-gray-400">{event.event}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
