import { useState } from 'react';
import { Sparkles, AlertTriangle, Crosshair, FileWarning, TrendingUp, Compass, Layers, Activity, ListOrdered, GraduationCap } from 'lucide-react';
import { apiFetch } from '../api';
import AIResponse from './AIResponse';

type TabKey = 'threat' | 'cm' | 'incident' | 'swarm' | 'trajectory' | 'formation' | 'sensor' | 'priority' | 'drill';

type Loader = { run: () => Promise<void>; loading: boolean; result: string };

function useLoader(call: () => Promise<{ result: string }>): Loader {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  async function run() {
    setLoading(true); setResult('');
    try { const d = await call(); setResult(d.result); }
    catch (e: any) { setResult(e?.message === 'AI service unavailable' ? 'AI service unavailable (503). Set OPENROUTER_API_KEY.' : 'Failed: ' + (e?.message || 'unknown')); }
    finally { setLoading(false); }
  }
  return { run, loading, result };
}

export default function AICenter() {
  const [tab, setTab] = useState<TabKey>('threat');

  // ---- Threat Analysis ----
  const [threatInput, setThreatInput] = useState('');
  const [threatResult, setThreatResult] = useState('');
  const [threatLoading, setThreatLoading] = useState(false);

  // ---- Countermeasure Recommendation ----
  const [cmThreatType, setCmThreatType] = useState('large_swarm');
  const [cmLevel, setCmLevel] = useState('9.0');
  const [cmAvailable, setCmAvailable] = useState('laser, jammer, interceptor_drone');
  const [cmResult, setCmResult] = useState('');
  const [cmLoading, setCmLoading] = useState(false);

  // ---- Incident Report ----
  const [incidentInput, setIncidentInput] = useState('');
  const [incidentResult, setIncidentResult] = useState('');
  const [incidentLoading, setIncidentLoading] = useState(false);

  // ---- Swarm Pattern Prediction ----
  const [swarmData, setSwarmData] = useState('');
  const [swarmResult, setSwarmResult] = useState('');
  const [swarmLoading, setSwarmLoading] = useState(false);

  // ---- Trajectory ----
  const [trj, setTrj] = useState({ lat: 34.05, lng: -118.24, altitude_m: 120, speed_kmh: 80, heading_deg: 90, threat_type: 'small_swarm', time_horizon_min: 5 });
  const trjL = useLoader(() => apiFetch('/ai-extras/trajectory-prediction', { method: 'POST', body: JSON.stringify(trj) }));

  // ---- Formation ----
  const [fmt, setFmt] = useState({ drone_count: 12, spread_m: 200, altitude_band: '80-150m', speed_kmh: 70, behavior_notes: 'tight V-wedge advancing on perimeter' });
  const fmtL = useLoader(() => apiFetch('/ai-extras/formation-classifier', { method: 'POST', body: JSON.stringify(fmt) }));

  // ---- Sensor anomaly ----
  const [snTxt, setSnTxt] = useState('[{"id":1,"name":"Radar-North-1","battery_pct":18,"detections_today":2,"status":"active"},{"id":2,"name":"Optical-East-3","battery_pct":92,"detections_today":47,"status":"active"}]');
  const snL = useLoader(() => apiFetch('/ai-extras/sensor-anomaly', { method: 'POST', body: JSON.stringify({ sensors: JSON.parse(snTxt) }) }));

  // ---- Priority scorer ----
  const [prTxt, setPrTxt] = useState('[{"id":101,"type":"large_swarm","drone_count":45,"threat_level":9.2,"speed_kmh":85,"zone_name":"Northern Approach"},{"id":102,"type":"single","drone_count":1,"threat_level":3.1,"speed_kmh":40,"zone_name":"Eastern Flank"}]');
  const prL = useLoader(() => apiFetch('/ai-extras/priority-scorer', { method: 'POST', body: JSON.stringify({ threats: JSON.parse(prTxt) }) }));

  // ---- Drill scenario ----
  const [drl, setDrl] = useState({ difficulty: 'medium', focus_area: 'sensor handoff & coordination', team_size: 6, duration_min: 45 });
  const drlL = useLoader(() => apiFetch('/ai-extras/drill-scenario', { method: 'POST', body: JSON.stringify(drl) }));

  // ---- Sample prefills (defensive / training framing only) ----
  const threatSamples = [
    { label: 'Drill: perimeter swarm', value: '[DRILL/SIMULATION] Training-zone exercise: 18 small quadcopters detected at training-range north fence, altitude 90m, speed 65km/h, V-wedge advancing toward simulated asset. Synthetic IFF beacons confirm friendly drill drones.' },
    { label: 'Training: lone scout', value: '[TRAINING] Simulated lone scout drone at 140m altitude, 45km/h, loitering pattern over training zone Bravo. Telemetry from drill-only test fleet.' },
    { label: 'Simulation: coordinated probe', value: '[SIMULATION] Drill scenario: 30 mixed multirotors, altitude band 60-180m, two prongs along training-range east approach, speed ~80km/h. All assets are exercise drones.' },
  ];
  const cmSamples = [
    { label: 'Drill: large swarm', threat_type: 'large_swarm', threat_level: '8.5', available: 'laser, jammer, interceptor_drone, net_launcher' },
    { label: 'Training: small swarm', threat_type: 'small_swarm', threat_level: '5.0', available: 'jammer, interceptor_drone' },
    { label: 'Simulation: single', threat_type: 'single', threat_level: '3.2', available: 'jammer, net_launcher' },
  ];
  const incidentSamples = [
    { label: 'Drill after-action', value: '[DRILL] Training exercise on 2026-05-04 14:00-14:35 at Range B. 18 simulated swarm targets engaged. 16 neutralized by training jammer; 2 by interceptor drill drones. Zero casualties (training only). Minor damage to mock asset M-3 by design.' },
    { label: 'Training: sensor outage', value: '[TRAINING] During drill, Radar-North-1 lost telemetry for 3 min while simulated swarm closed 400m. Backup optical reacquired. No real assets affected; injects logged for after-action review.' },
    { label: 'Simulation: comms degrade', value: '[SIMULATION] Exercise injected GPS-jamming on training-range. Drill team coordinated handoff to inertial backup. Recovery time 90s. Used to validate backup procedures only.' },
  ];
  const swarmSamples = [
    { label: 'Drill log: 7 days', value: '[DRILL DATA] Training-range incidents (synthetic): 04-30 09:12 small_swarm N-fence 8 drones; 05-02 11:40 single E-flank 1 drone; 05-04 14:00 large_swarm N-fence 18 drones; 05-05 06:20 small_swarm N-fence 6 drones. All exercise targets only.' },
    { label: 'Training trend', value: '[TRAINING] Last 30 days at simulation range: 12 single-drone drills, 6 small-swarm, 2 large-swarm. Most occurred 0500-0900 local during scheduled exercises.' },
    { label: 'Simulation pattern', value: '[SIMULATION] Drill log: probe formations at range Bravo every Tue/Thu 0600. Used for staffing-pattern study, not real-world tasking.' },
  ];
  const trjSamples = [
    { label: 'Drill: training-range', value: { lat: 34.05, lng: -118.24, altitude_m: 120, speed_kmh: 80, heading_deg: 90, threat_type: 'small_swarm', time_horizon_min: 5 } },
    { label: 'Training: low-alt scout', value: { lat: 36.12, lng: -115.18, altitude_m: 60, speed_kmh: 45, heading_deg: 270, threat_type: 'single', time_horizon_min: 3 } },
    { label: 'Simulation: large swarm', value: { lat: 33.94, lng: -118.40, altitude_m: 150, speed_kmh: 95, heading_deg: 45, threat_type: 'large_swarm', time_horizon_min: 8 } },
  ];
  const fmtSamples = [
    { label: 'Drill: V-wedge', value: { drone_count: 12, spread_m: 200, altitude_band: '80-150m', speed_kmh: 70, behavior_notes: '[DRILL] Training drones in tight V-wedge advancing on simulated perimeter at exercise range.' } },
    { label: 'Training: line abreast', value: { drone_count: 8, spread_m: 350, altitude_band: '60-100m', speed_kmh: 55, behavior_notes: '[TRAINING] Exercise drones in line-abreast formation along range fence; sensor-handoff drill.' } },
    { label: 'Simulation: cluster probe', value: { drone_count: 24, spread_m: 120, altitude_band: '100-200m', speed_kmh: 80, behavior_notes: '[SIMULATION] Cluster formation probing simulated approach lane during scheduled exercise.' } },
  ];
  const snSamples = [
    { label: 'Drill: low battery', value: '[{"id":1,"name":"Radar-North-1","battery_pct":18,"detections_today":2,"status":"active","tag":"DRILL"},{"id":2,"name":"Optical-East-3","battery_pct":92,"detections_today":47,"status":"active","tag":"DRILL"}]' },
    { label: 'Training: silent sensor', value: '[{"id":3,"name":"Radar-South-2","battery_pct":74,"detections_today":0,"status":"active","tag":"TRAINING"},{"id":4,"name":"Acoustic-West-1","battery_pct":81,"detections_today":12,"status":"active","tag":"TRAINING"}]' },
    { label: 'Simulation: spike', value: '[{"id":5,"name":"Optical-North-2","battery_pct":66,"detections_today":210,"status":"active","tag":"SIMULATION"},{"id":6,"name":"Radar-East-1","battery_pct":55,"detections_today":18,"status":"active","tag":"SIMULATION"}]' },
  ];
  const prSamples = [
    { label: 'Drill: mixed queue', value: '[{"id":101,"type":"large_swarm","drone_count":45,"threat_level":9.2,"speed_kmh":85,"zone_name":"Training Zone N","tag":"DRILL"},{"id":102,"type":"single","drone_count":1,"threat_level":3.1,"speed_kmh":40,"zone_name":"Training Zone E","tag":"DRILL"}]' },
    { label: 'Training: dual swarm', value: '[{"id":201,"type":"small_swarm","drone_count":8,"threat_level":5.5,"speed_kmh":60,"zone_name":"Range Bravo","tag":"TRAINING"},{"id":202,"type":"small_swarm","drone_count":10,"threat_level":6.2,"speed_kmh":70,"zone_name":"Range Charlie","tag":"TRAINING"}]' },
    { label: 'Simulation: triage', value: '[{"id":301,"type":"coordinated_attack","drone_count":30,"threat_level":8.8,"speed_kmh":90,"zone_name":"Sim Sector 1","tag":"SIMULATION"},{"id":302,"type":"single","drone_count":1,"threat_level":2.4,"speed_kmh":35,"zone_name":"Sim Sector 2","tag":"SIMULATION"},{"id":303,"type":"small_swarm","drone_count":6,"threat_level":5.0,"speed_kmh":55,"zone_name":"Sim Sector 3","tag":"SIMULATION"}]' },
  ];
  const drlSamples = [
    { label: 'Drill: easy handoff', value: { difficulty: 'easy', focus_area: 'sensor handoff & coordination', team_size: 4, duration_min: 30 } },
    { label: 'Training: hard swarm', value: { difficulty: 'hard', focus_area: 'large-swarm engagement under jamming', team_size: 8, duration_min: 60 } },
    { label: 'Simulation: expert ops', value: { difficulty: 'expert', focus_area: 'multi-zone coordinated defense readiness', team_size: 12, duration_min: 90 } },
  ];

  async function runThreat() {
    setThreatLoading(true); setThreatResult('');
    try { const d = await apiFetch('/ai/threat-analysis', { method: 'POST', body: JSON.stringify({ threat: threatInput }) }); setThreatResult(d.result); }
    catch { setThreatResult('Failed'); } finally { setThreatLoading(false); }
  }
  async function runCM() {
    setCmLoading(true); setCmResult('');
    try { const d = await apiFetch('/ai/countermeasure-recommendation', { method: 'POST', body: JSON.stringify({ threat_type: cmThreatType, threat_level: cmLevel, available_countermeasures: cmAvailable }) }); setCmResult(d.result); }
    catch { setCmResult('Failed'); } finally { setCmLoading(false); }
  }
  async function runIncident() {
    setIncidentLoading(true); setIncidentResult('');
    try { const d = await apiFetch('/ai/incident-report', { method: 'POST', body: JSON.stringify({ incident: incidentInput }) }); setIncidentResult(d.result); }
    catch { setIncidentResult('Failed'); } finally { setIncidentLoading(false); }
  }
  async function runSwarm() {
    setSwarmLoading(true); setSwarmResult('');
    try { const d = await apiFetch('/ai/swarm-prediction', { method: 'POST', body: JSON.stringify({ recent_threats: swarmData }) }); setSwarmResult(d.result); }
    catch { setSwarmResult('Failed'); } finally { setSwarmLoading(false); }
  }

  const tabs: { key: TabKey; label: string; Icon: any }[] = [
    { key: 'threat', label: 'Threat Analysis', Icon: AlertTriangle },
    { key: 'cm', label: 'Countermeasures', Icon: Crosshair },
    { key: 'incident', label: 'Incident Report', Icon: FileWarning },
    { key: 'swarm', label: 'Swarm Prediction', Icon: TrendingUp },
    { key: 'trajectory', label: 'Trajectory', Icon: Compass },
    { key: 'formation', label: 'Formation', Icon: Layers },
    { key: 'sensor', label: 'Sensor Anomaly', Icon: Activity },
    { key: 'priority', label: 'Priority Scorer', Icon: ListOrdered },
    { key: 'drill', label: 'Drill Generator', Icon: GraduationCap },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2"><Sparkles size={28} className="text-violet-400" /><h1 className="text-2xl font-bold text-white">AI Defense Center</h1></div>
      <p className="text-xs text-violet-300/80 -mt-2">All features are framed for defensive, educational, and training simulation use only.</p>

      <div className="flex flex-wrap gap-2 border-b border-gray-800 pb-3">
        {tabs.map(({ key, label, Icon }) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === key ? 'bg-violet-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'
            }`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {tab === 'threat' && (
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <div className="flex items-center gap-2 mb-4"><AlertTriangle size={20} className="text-red-400" /><h2 className="text-lg font-semibold text-white">Threat Analysis</h2></div>
          <div className="flex flex-wrap gap-2 mb-2">
            {threatSamples.map(s => (
              <button key={s.label} type="button" onClick={() => setThreatInput(s.value)} className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 px-2 py-1 rounded">{s.label}</button>
            ))}
          </div>
          <textarea value={threatInput} onChange={e => setThreatInput(e.target.value)} placeholder="Describe threat: type, drone count, location, altitude, speed, behavior..."
            rows={4} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm resize-none mb-3" />
          <button onClick={runThreat} disabled={threatLoading || !threatInput.trim()}
            className="bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <Sparkles size={16} />{threatLoading ? 'Analyzing...' : 'Analyze Threat'}
          </button>
          <div className="mt-4"><AIResponse title="Threat Analysis" content={threatResult} loading={threatLoading} /></div>
        </div>
      )}

      {tab === 'cm' && (
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <div className="flex items-center gap-2 mb-4"><Crosshair size={20} className="text-green-400" /><h2 className="text-lg font-semibold text-white">Countermeasure Recommendation</h2></div>
          <div className="flex flex-wrap gap-2 mb-2">
            {cmSamples.map(s => (
              <button key={s.label} type="button" onClick={() => { setCmThreatType(s.threat_type); setCmLevel(s.threat_level); setCmAvailable(s.available); }} className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 px-2 py-1 rounded">{s.label}</button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 mb-3">
            <select value={cmThreatType} onChange={e => setCmThreatType(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
              {['single','small_swarm','large_swarm','coordinated_attack'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input value={cmLevel} onChange={e => setCmLevel(e.target.value)} placeholder="Threat level (0-10)"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            <input value={cmAvailable} onChange={e => setCmAvailable(e.target.value)} placeholder="Available countermeasures"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <button onClick={runCM} disabled={cmLoading}
            className="bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <Sparkles size={16} />{cmLoading ? 'Computing...' : 'Get Recommendation'}
          </button>
          <div className="mt-4"><AIResponse title="Countermeasure Strategy" content={cmResult} loading={cmLoading} /></div>
        </div>
      )}

      {tab === 'incident' && (
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <div className="flex items-center gap-2 mb-4"><FileWarning size={20} className="text-yellow-400" /><h2 className="text-lg font-semibold text-white">Incident Report Generator</h2></div>
          <div className="flex flex-wrap gap-2 mb-2">
            {incidentSamples.map(s => (
              <button key={s.label} type="button" onClick={() => setIncidentInput(s.value)} className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 px-2 py-1 rounded">{s.label}</button>
            ))}
          </div>
          <textarea value={incidentInput} onChange={e => setIncidentInput(e.target.value)} placeholder="Describe the incident details, timeline, casualties, damage..."
            rows={4} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm resize-none mb-3" />
          <button onClick={runIncident} disabled={incidentLoading || !incidentInput.trim()}
            className="bg-yellow-700 hover:bg-yellow-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <Sparkles size={16} />{incidentLoading ? 'Generating...' : 'Generate Report'}
          </button>
          <div className="mt-4"><AIResponse title="Incident Report" content={incidentResult} loading={incidentLoading} /></div>
        </div>
      )}

      {tab === 'swarm' && (
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <div className="flex items-center gap-2 mb-4"><TrendingUp size={20} className="text-blue-400" /><h2 className="text-lg font-semibold text-white">Swarm Pattern Prediction</h2></div>
          <div className="flex flex-wrap gap-2 mb-2">
            {swarmSamples.map(s => (
              <button key={s.label} type="button" onClick={() => setSwarmData(s.value)} className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 px-2 py-1 rounded">{s.label}</button>
            ))}
          </div>
          <textarea value={swarmData} onChange={e => setSwarmData(e.target.value)} placeholder="Paste recent threat data, times, locations, types, drone counts..."
            rows={4} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm resize-none mb-3" />
          <button onClick={runSwarm} disabled={swarmLoading || !swarmData.trim()}
            className="bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <Sparkles size={16} />{swarmLoading ? 'Predicting...' : 'Predict Next Attack'}
          </button>
          <div className="mt-4"><AIResponse title="Swarm Prediction" content={swarmResult} loading={swarmLoading} /></div>
        </div>
      )}

      {tab === 'trajectory' && (
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <div className="flex items-center gap-2 mb-4"><Compass size={20} className="text-cyan-400" /><h2 className="text-lg font-semibold text-white">Threat Trajectory Predictor</h2></div>
          <div className="flex flex-wrap gap-2 mb-2">
            {trjSamples.map(s => (
              <button key={s.label} type="button" onClick={() => setTrj(s.value)} className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 px-2 py-1 rounded">{s.label}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input type="number" step="0.0001" value={trj.lat} onChange={e => setTrj({ ...trj, lat: parseFloat(e.target.value) })} placeholder="Latitude" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            <input type="number" step="0.0001" value={trj.lng} onChange={e => setTrj({ ...trj, lng: parseFloat(e.target.value) })} placeholder="Longitude" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            <input type="number" value={trj.altitude_m} onChange={e => setTrj({ ...trj, altitude_m: parseFloat(e.target.value) })} placeholder="Altitude (m)" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            <input type="number" value={trj.speed_kmh} onChange={e => setTrj({ ...trj, speed_kmh: parseFloat(e.target.value) })} placeholder="Speed (km/h)" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            <input type="number" value={trj.heading_deg} onChange={e => setTrj({ ...trj, heading_deg: parseFloat(e.target.value) })} placeholder="Heading (deg)" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            <input type="number" value={trj.time_horizon_min} onChange={e => setTrj({ ...trj, time_horizon_min: parseInt(e.target.value) })} placeholder="Horizon (min)" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            <select value={trj.threat_type} onChange={e => setTrj({ ...trj, threat_type: e.target.value })} className="col-span-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
              {['single', 'small_swarm', 'large_swarm', 'coordinated_attack'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button onClick={trjL.run} disabled={trjL.loading} className="bg-cyan-700 hover:bg-cyan-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><Sparkles size={16} />{trjL.loading ? 'Projecting...' : 'Project Trajectory'}</button>
          <div className="mt-4"><AIResponse title="Trajectory Forecast" content={trjL.result} loading={trjL.loading} /></div>
        </div>
      )}

      {tab === 'formation' && (
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <div className="flex items-center gap-2 mb-4"><Layers size={20} className="text-emerald-400" /><h2 className="text-lg font-semibold text-white">Swarm Formation Classifier</h2></div>
          <div className="flex flex-wrap gap-2 mb-2">
            {fmtSamples.map(s => (
              <button key={s.label} type="button" onClick={() => setFmt(s.value)} className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 px-2 py-1 rounded">{s.label}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input type="number" value={fmt.drone_count} onChange={e => setFmt({ ...fmt, drone_count: parseInt(e.target.value) })} placeholder="Drone count" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            <input type="number" value={fmt.spread_m} onChange={e => setFmt({ ...fmt, spread_m: parseInt(e.target.value) })} placeholder="Spread (m)" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            <input value={fmt.altitude_band} onChange={e => setFmt({ ...fmt, altitude_band: e.target.value })} placeholder="Altitude band" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            <input type="number" value={fmt.speed_kmh} onChange={e => setFmt({ ...fmt, speed_kmh: parseInt(e.target.value) })} placeholder="Speed (km/h)" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <textarea value={fmt.behavior_notes} onChange={e => setFmt({ ...fmt, behavior_notes: e.target.value })} placeholder="Behavior notes" rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm resize-none mb-3" />
          <button onClick={fmtL.run} disabled={fmtL.loading} className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><Sparkles size={16} />{fmtL.loading ? 'Classifying...' : 'Classify Formation'}</button>
          <div className="mt-4"><AIResponse title="Formation Classification" content={fmtL.result} loading={fmtL.loading} /></div>
        </div>
      )}

      {tab === 'sensor' && (
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <div className="flex items-center gap-2 mb-4"><Activity size={20} className="text-amber-400" /><h2 className="text-lg font-semibold text-white">Sensor Anomaly Detector</h2></div>
          <div className="flex flex-wrap gap-2 mb-2">
            {snSamples.map(s => (
              <button key={s.label} type="button" onClick={() => setSnTxt(s.value)} className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 px-2 py-1 rounded">{s.label}</button>
            ))}
          </div>
          <textarea value={snTxt} onChange={e => setSnTxt(e.target.value)} placeholder="Sensor telemetry JSON array" rows={5} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs font-mono resize-none mb-3" />
          <button onClick={snL.run} disabled={snL.loading} className="bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><Sparkles size={16} />{snL.loading ? 'Scanning...' : 'Detect Anomalies'}</button>
          <div className="mt-4"><AIResponse title="Sensor Anomalies" content={snL.result} loading={snL.loading} /></div>
        </div>
      )}

      {tab === 'priority' && (
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <div className="flex items-center gap-2 mb-4"><ListOrdered size={20} className="text-rose-400" /><h2 className="text-lg font-semibold text-white">Response-Priority Scorer</h2></div>
          <div className="flex flex-wrap gap-2 mb-2">
            {prSamples.map(s => (
              <button key={s.label} type="button" onClick={() => setPrTxt(s.value)} className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 px-2 py-1 rounded">{s.label}</button>
            ))}
          </div>
          <textarea value={prTxt} onChange={e => setPrTxt(e.target.value)} placeholder="Threats JSON array" rows={5} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs font-mono resize-none mb-3" />
          <button onClick={prL.run} disabled={prL.loading} className="bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><Sparkles size={16} />{prL.loading ? 'Scoring...' : 'Score Priority'}</button>
          <div className="mt-4"><AIResponse title="Defensive Priority Queue" content={prL.result} loading={prL.loading} /></div>
        </div>
      )}

      {tab === 'drill' && (
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <div className="flex items-center gap-2 mb-4"><GraduationCap size={20} className="text-indigo-400" /><h2 className="text-lg font-semibold text-white">Drill Scenario Generator (Training)</h2></div>
          <div className="flex flex-wrap gap-2 mb-2">
            {drlSamples.map(s => (
              <button key={s.label} type="button" onClick={() => setDrl(s.value)} className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 px-2 py-1 rounded">{s.label}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <select value={drl.difficulty} onChange={e => setDrl({ ...drl, difficulty: e.target.value })} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
              {['easy', 'medium', 'hard', 'expert'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <input type="number" value={drl.team_size} onChange={e => setDrl({ ...drl, team_size: parseInt(e.target.value) })} placeholder="Team size" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            <input type="number" value={drl.duration_min} onChange={e => setDrl({ ...drl, duration_min: parseInt(e.target.value) })} placeholder="Duration (min)" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            <input value={drl.focus_area} onChange={e => setDrl({ ...drl, focus_area: e.target.value })} placeholder="Focus area" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <button onClick={drlL.run} disabled={drlL.loading} className="bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><Sparkles size={16} />{drlL.loading ? 'Designing...' : 'Generate Drill'}</button>
          <div className="mt-4"><AIResponse title="Training Drill" content={drlL.result} loading={drlL.loading} /></div>
        </div>
      )}
    </div>
  );
}
