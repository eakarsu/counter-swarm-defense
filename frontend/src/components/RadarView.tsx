interface Drone {
  id: string
  label: string
  x: number // percentage from center (-50 to +50)
  y: number
  type: 'hostile' | 'friendly' | 'unknown'
  altitude: number
  speed: number
}

const drones: Drone[] = [
  { id: 'D-01', label: 'D-01', x: 18, y: -22, type: 'hostile', altitude: 120, speed: 45 },
  { id: 'D-02', label: 'D-02', x: -30, y: 15, type: 'hostile', altitude: 85, speed: 60 },
  { id: 'D-03', label: 'D-03', x: 35, y: 28, type: 'hostile', altitude: 200, speed: 30 },
  { id: 'D-04', label: 'D-04', x: -12, y: -35, type: 'hostile', altitude: 150, speed: 55 },
  { id: 'F-01', label: 'F-01', x: 5, y: 8, type: 'friendly', altitude: 300, speed: 120 },
  { id: 'F-02', label: 'F-02', x: -8, y: 12, type: 'friendly', altitude: 280, speed: 115 },
  { id: 'U-01', label: 'U-01', x: 40, y: -10, type: 'unknown', altitude: 95, speed: 40 },
  { id: 'U-02', label: 'U-02', x: -42, y: -30, type: 'unknown', altitude: 110, speed: 35 },
]

const droneColors: Record<Drone['type'], string> = {
  hostile: '#ef4444',
  friendly: '#22c55e',
  unknown: '#eab308',
}

const droneLabelColors: Record<Drone['type'], string> = {
  hostile: 'text-red-400',
  friendly: 'text-green-400',
  unknown: 'text-yellow-400',
}

export default function RadarView() {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-200 tracking-wider">TACTICAL RADAR DISPLAY</h2>
        <p className="text-xs text-gray-500 mt-1">Range: 50km · Refresh: 1.2s · Mode: ACTIVE</p>
      </div>

      <div className="flex gap-6">
        {/* Radar display */}
        <div className="flex-shrink-0">
          <div
            className="relative bg-black border border-green-900/50 rounded-full overflow-hidden"
            style={{ width: 420, height: 420 }}
          >
            {/* Concentric circles */}
            {[85, 65, 45, 25].map((size, i) => (
              <div
                key={i}
                className="absolute rounded-full border border-green-900/40"
                style={{
                  width: `${size}%`,
                  height: `${size}%`,
                  top: `${(100 - size) / 2}%`,
                  left: `${(100 - size) / 2}%`,
                }}
              />
            ))}

            {/* Crosshair lines */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-px bg-green-900/30" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-full w-px bg-green-900/30" />
            </div>
            {/* Diagonal lines */}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(45deg, transparent calc(50% - 0.5px), rgba(34,197,94,0.12) calc(50% - 0.5px), rgba(34,197,94,0.12) calc(50% + 0.5px), transparent calc(50% + 0.5px))',
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(-45deg, transparent calc(50% - 0.5px), rgba(34,197,94,0.12) calc(50% - 0.5px), rgba(34,197,94,0.12) calc(50% + 0.5px), transparent calc(50% + 0.5px))',
              }}
            />

            {/* Threat zone overlay (inner 30%) */}
            <div
              className="absolute rounded-full bg-red-900/15 border border-red-700/30"
              style={{ width: '45%', height: '45%', top: '27.5%', left: '27.5%' }}
            />

            {/* Sweep line */}
            <div
              className="absolute radar-sweep"
              style={{
                width: '50%',
                height: '2px',
                bottom: '50%',
                left: '50%',
                transformOrigin: 'left center',
                background: 'linear-gradient(to right, transparent, rgba(34,197,94,0.9))',
              }}
            />
            {/* Sweep trail */}
            <div
              className="absolute radar-sweep"
              style={{
                width: '50%',
                height: '60px',
                bottom: '50%',
                left: '50%',
                transformOrigin: 'left center',
                animationDelay: '-0.5s',
                background: 'conic-gradient(from 0deg, rgba(34,197,94,0.15), transparent 40deg)',
              }}
            />

            {/* Drones */}
            {drones.map(drone => {
              const cx = 50 + drone.x
              const cy = 50 + drone.y
              return (
                <div
                  key={drone.id}
                  className="absolute"
                  style={{ left: `${cx}%`, top: `${cy}%`, transform: 'translate(-50%, -50%)' }}
                >
                  {drone.type === 'hostile' && (
                    <div className="pulse-dot">
                      <div
                        className="w-3 h-3 rounded-sm rotate-45"
                        style={{ backgroundColor: droneColors[drone.type] }}
                      />
                    </div>
                  )}
                  {drone.type === 'friendly' && (
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: droneColors[drone.type] }}
                    />
                  )}
                  {drone.type === 'unknown' && (
                    <div
                      className="w-3 h-3"
                      style={{
                        width: 0,
                        height: 0,
                        borderLeft: '6px solid transparent',
                        borderRight: '6px solid transparent',
                        borderBottom: `10px solid ${droneColors[drone.type]}`,
                      }}
                    />
                  )}
                  <div
                    className={`absolute top-4 left-1/2 -translate-x-1/2 text-xs font-bold whitespace-nowrap ${droneLabelColors[drone.type]}`}
                    style={{ fontSize: '9px' }}
                  >
                    {drone.label}
                  </div>
                </div>
              )
            })}

            {/* Center origin marker */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-green-500 rounded-full" />

            {/* Range labels */}
            <div className="absolute text-green-800 font-bold" style={{ fontSize: '9px', top: '13%', left: '52%' }}>50km</div>
            <div className="absolute text-green-800 font-bold" style={{ fontSize: '9px', top: '23%', left: '52%' }}>37km</div>
            <div className="absolute text-green-800 font-bold" style={{ fontSize: '9px', top: '33%', left: '52%' }}>25km</div>
            <div className="absolute text-green-800 font-bold" style={{ fontSize: '9px', top: '43%', left: '52%' }}>12km</div>
          </div>

          {/* Legend */}
          <div className="flex gap-6 mt-3 px-2 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm rotate-45 bg-red-500 inline-block" /> Hostile</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Friendly</span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block" style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '8px solid #eab308' }} />
              Unknown
            </span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-900 border border-red-700 inline-block" /> Threat Zone</span>
          </div>
        </div>

        {/* Drone table */}
        <div className="flex-1">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">TRACKED CONTACTS</div>
          <div className="bg-black border border-gray-900 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-900 text-gray-600 uppercase tracking-wide">
                  <th className="text-left px-3 py-2">ID</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-right px-3 py-2">Alt (m)</th>
                  <th className="text-right px-3 py-2">Speed (kph)</th>
                  <th className="text-right px-3 py-2">Bearing</th>
                </tr>
              </thead>
              <tbody>
                {drones.map((drone, i) => (
                  <tr key={drone.id} className={i < drones.length - 1 ? 'border-b border-gray-900/50' : ''}>
                    <td className={`px-3 py-2 font-bold ${droneLabelColors[drone.type]}`}>{drone.id}</td>
                    <td className={`px-3 py-2 uppercase ${droneLabelColors[drone.type]}`}>{drone.type}</td>
                    <td className="px-3 py-2 text-right text-gray-400">{drone.altitude}</td>
                    <td className="px-3 py-2 text-right text-gray-400">{drone.speed}</td>
                    <td className="px-3 py-2 text-right text-gray-500">
                      {Math.round(Math.atan2(drone.x, -drone.y) * 180 / Math.PI + 360) % 360}°
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
