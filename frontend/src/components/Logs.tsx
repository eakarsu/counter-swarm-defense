interface LogEntry {
  id: number
  timestamp: string
  type: 'engagement' | 'detection' | 'system' | 'alert'
  message: string
  operator: string
}

const logs: LogEntry[] = [
  { id: 1, timestamp: '2026-05-05 14:37:22', type: 'engagement', message: 'THR-004 NEUTRALIZED — Large swarm in Sector Charlie eliminated via combined RF/Net countermeasures', operator: 'AUTO' },
  { id: 2, timestamp: '2026-05-05 14:35:01', type: 'engagement', message: 'Laser Interceptor locked on D-01 — engagement authorized by Operator DELTA', operator: 'OP-DELTA' },
  { id: 3, timestamp: '2026-05-05 14:32:15', type: 'detection', message: 'New hostile contact D-04 detected entering Sector Delta at bearing 318°, altitude 150m', operator: 'RADAR-AI' },
  { id: 4, timestamp: '2026-05-05 14:29:44', type: 'engagement', message: 'RF Jammer activated across 2.4GHz and 5.8GHz spectrum in Sector Alpha', operator: 'OP-ALPHA' },
  { id: 5, timestamp: '2026-05-05 14:27:10', type: 'engagement', message: 'THR-005 NEUTRALIZED — Cyber attack vector exploited firmware CVE-2025-18847', operator: 'CYBER-OPS' },
  { id: 6, timestamp: '2026-05-05 14:22:03', type: 'alert', message: 'THREAT LEVEL ESCALATION: ELEVATED → HIGH — 3 or more concurrent active threats', operator: 'SYSTEM' },
  { id: 7, timestamp: '2026-05-05 14:18:55', type: 'detection', message: 'Unclassified contact U-01 approaching from East perimeter — classification in progress', operator: 'RADAR-AI' },
  { id: 8, timestamp: '2026-05-05 14:15:00', type: 'system', message: 'Scheduled diagnostic: All subsystems operational. Power Grid B at 67% — flagged for inspection', operator: 'SYSTEM' },
  { id: 9, timestamp: '2026-05-05 14:10:33', type: 'engagement', message: 'Net Launcher battery deployed in Sector Bravo — 2/6 nets expended', operator: 'OP-BRAVO' },
  { id: 10, timestamp: '2026-05-05 14:05:17', type: 'alert', message: 'Radar sweep anomaly: signal ghost detected in Sector Echo — likely chaff deployment by hostile', operator: 'RADAR-AI' },
  { id: 11, timestamp: '2026-05-05 13:58:04', type: 'system', message: 'Operator OP-DELTA assumed command — previous operator OP-CHARLIE shift complete', operator: 'SYSTEM' },
  { id: 12, timestamp: '2026-05-05 13:45:00', type: 'system', message: 'Session start: Counter-Swarm Defense System v4.2.1 initialized — full defensive posture active', operator: 'SYSTEM' },
]

const typeStyles: Record<LogEntry['type'], { badge: string; dot: string }> = {
  engagement: { badge: 'bg-orange-900/30 text-orange-400 border-orange-800/50', dot: 'bg-orange-500' },
  detection: { badge: 'bg-yellow-900/30 text-yellow-400 border-yellow-800/50', dot: 'bg-yellow-500' },
  system: { badge: 'bg-gray-800 text-gray-500 border-gray-700', dot: 'bg-gray-600' },
  alert: { badge: 'bg-red-900/30 text-red-400 border-red-800/50', dot: 'bg-red-500' },
}

export default function Logs() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-200 tracking-wider">OPERATIONS LOG</h2>
          <p className="text-xs text-gray-500 mt-1">{logs.length} entries · Current session</p>
        </div>
        <div className="flex gap-2">
          {(['all', 'engagement', 'detection', 'alert', 'system'] as const).map(filter => (
            <button
              key={filter}
              className="text-xs px-3 py-1.5 rounded-md bg-gray-900 border border-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-700 capitalize transition-colors"
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {logs.map(log => (
          <div
            key={log.id}
            className="bg-black border border-gray-900 rounded-lg px-4 py-3 flex gap-4 items-start"
          >
            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${typeStyles[log.type].dot}`} />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xs text-gray-600 font-mono">{log.timestamp}</span>
                <span className={`text-xs px-2 py-0.5 rounded border uppercase font-bold tracking-wide ${typeStyles[log.type].badge}`}>
                  {log.type}
                </span>
                <span className="text-xs text-gray-700 ml-auto">OPR: {log.operator}</span>
              </div>
              <p className="text-sm text-gray-400">{log.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
