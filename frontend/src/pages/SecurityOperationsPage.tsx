import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, ClipboardCheck, KeyRound, RefreshCw, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../api';

interface Source {
  id: number; source_uid: string; name: string; source_type: string; status: string;
  retention_days: number; last_sequence: number; last_seen_at: string | null;
}
interface TriageCase {
  id: number; status: string; severity: string; risk_score: number; title: string; summary: string;
  owner_user_id: number | null; owner_name: string | null; escalation_level: number; sla_due_at: string;
}
interface Suppression {
  id: number; status: string; event_type: string | null; sensor_uid: string | null; reason: string;
  requested_by_email: string; reviewed_by_email: string | null; expires_at: string;
}
interface Evaluation {
  id: number; name: string; status: string; total_samples: number; recall_value: string;
  false_positive_rate: string; dataset_digest: string;
}
interface CaseDetail extends TriageCase {
  evidence: Array<{ id: number; external_event_id: string; event_type: string; sensor_uid: string; observed_at: string; integrity_status: string; raw_sha256: string }>;
  events: Array<{ id: number; event_type: string; actor_email: string; created_at: string }>;
}

const field = 'bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm';
const button = 'bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 text-white px-3 py-2 rounded-lg text-sm font-medium';

export default function SecurityOperationsPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}') as { id?: number; role?: string };
  const elevated = user.role === 'admin' || user.role === 'supervisor';
  const [sources, setSources] = useState<Source[]>([]);
  const [cases, setCases] = useState<TriageCase[]>([]);
  const [suppressions, setSuppressions] = useState<Suppression[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [sourceForm, setSourceForm] = useState({ source_uid: '', name: '', source_type: 'rf', retention_days: 30, allowed_clock_skew_seconds: 120 });
  const [suppressionForm, setSuppressionForm] = useState({ event_type: 'rf_detection', sensor_uid: '', reason: '', expires_at: '' });
  const [evalName, setEvalName] = useState('');
  const [evalSamples, setEvalSamples] = useState('[\n  {"id":"positive-1","actual":true,"predicted":true,"adversarial":false},\n  {"id":"positive-adversarial","actual":true,"predicted":true,"adversarial":true},\n  {"id":"negative-1","actual":false,"predicted":false,"adversarial":false},\n  {"id":"negative-adversarial","actual":false,"predicted":false,"adversarial":true}\n]');

  async function load() {
    setError('');
    try {
      const [nextSources, nextCases, nextSuppressions, nextEvaluations] = await Promise.all([
        apiFetch('/telemetry/sources'), apiFetch('/triage/cases'), apiFetch('/triage/suppressions'), apiFetch('/triage/evaluations'),
      ]);
      setSources(nextSources); setCases(nextCases); setSuppressions(nextSuppressions); setEvaluations(nextEvaluations);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load operations data'); }
  }

  useEffect(() => { load(); }, []);

  async function createSource() {
    setError(''); setNotice('');
    try {
      const result = await apiFetch('/telemetry/sources', { method: 'POST', body: JSON.stringify(sourceForm) });
      setNotice(`Store this signing secret now; it will not be shown again: ${result.signingSecret}`);
      setSourceForm({ ...sourceForm, source_uid: '', name: '' });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Source creation failed'); }
  }

  async function caseAction(item: TriageCase, action: 'assign' | 'escalate' | 'resolve') {
    setError('');
    try {
      if (action === 'assign') {
        await apiFetch(`/triage/cases/${item.id}/assign`, { method: 'POST', body: JSON.stringify({ owner_user_id: Number(user.id) }) });
      } else if (action === 'escalate') {
        const reason = window.prompt('Escalation reason (at least 5 characters)');
        if (!reason) return;
        await apiFetch(`/triage/cases/${item.id}/escalate`, { method: 'POST', body: JSON.stringify({ reason }) });
      } else {
        const disposition = window.prompt('Disposition: confirmed, false_positive, benign, or duplicate', 'confirmed');
        const notes = window.prompt('Resolution evidence and notes');
        if (!disposition || !notes) return;
        await apiFetch(`/triage/cases/${item.id}/resolve`, { method: 'POST', body: JSON.stringify({ disposition, notes }) });
      }
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Case update failed'); }
  }

  async function openCase(id: number) {
    try { setDetail(await apiFetch(`/triage/cases/${id}`)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load case evidence'); }
  }

  async function requestSuppression() {
    setError('');
    try {
      await apiFetch('/triage/suppressions', {
        method: 'POST',
        body: JSON.stringify({ ...suppressionForm, sensor_uid: suppressionForm.sensor_uid || null, expires_at: new Date(suppressionForm.expires_at).toISOString() }),
      });
      setSuppressionForm({ ...suppressionForm, sensor_uid: '', reason: '', expires_at: '' });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Suppression request failed'); }
  }

  async function reviewSuppression(id: number, decision: 'approved' | 'rejected') {
    try {
      await apiFetch(`/triage/suppressions/${id}/review`, { method: 'POST', body: JSON.stringify({ decision }) });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Suppression review failed'); }
  }

  async function runEvaluation() {
    setError('');
    try {
      const samples: unknown = JSON.parse(evalSamples);
      await apiFetch('/triage/evaluations', { method: 'POST', body: JSON.stringify({ name: evalName, samples }) });
      setEvalName(''); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Evaluation failed'); }
  }

  async function approveEvaluation(id: number) {
    try { await apiFetch(`/triage/evaluations/${id}/approve`, { method: 'POST' }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Evaluation approval failed'); }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="text-cyan-400" />Security Operations</h1><p className="text-gray-400 text-sm mt-1">Authenticated evidence intake, deterministic detection, and analyst-controlled triage.</p></div>
        <button className={button} onClick={load}><RefreshCw size={15} className="inline mr-2" />Refresh</button>
      </div>
      {error && <div className="bg-red-950 border border-red-800 text-red-200 rounded-lg p-3 text-sm">{error}</div>}
      {notice && <div className="bg-amber-950 border border-amber-700 text-amber-100 rounded-lg p-3 text-sm break-all"><KeyRound size={15} className="inline mr-2" />{notice}</div>}

      <section className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="font-semibold text-white mb-3">Authenticated telemetry sources</h2>
        {elevated && <div className="grid grid-cols-6 gap-2 mb-4">
          <input className={`${field} col-span-2`} placeholder="Source UID" value={sourceForm.source_uid} onChange={event => setSourceForm({ ...sourceForm, source_uid: event.target.value })} />
          <input className={`${field} col-span-2`} placeholder="Display name" value={sourceForm.name} onChange={event => setSourceForm({ ...sourceForm, name: event.target.value })} />
          <select className={field} value={sourceForm.source_type} onChange={event => setSourceForm({ ...sourceForm, source_type: event.target.value })}>{['rf', 'radar', 'eo_ir', 'acoustic', 'health', 'simulator'].map(type => <option key={type}>{type}</option>)}</select>
          <button className={button} disabled={!sourceForm.source_uid || !sourceForm.name} onClick={createSource}>Provision</button>
        </div>}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {sources.map(item => <div key={item.id} className="bg-gray-950 border border-gray-800 rounded-lg p-3">
            <div className="flex justify-between"><strong>{item.name}</strong><span className={item.status === 'active' ? 'text-green-400 text-xs' : 'text-amber-400 text-xs'}>{item.status}</span></div>
            <p className="text-xs text-gray-400 mt-1">{item.source_uid} · {item.source_type} · seq {item.last_sequence}</p>
            <p className="text-xs text-gray-500 mt-1">Retention {item.retention_days}d · {item.last_seen_at ? `seen ${new Date(item.last_seen_at).toLocaleString()}` : 'never seen'}</p>
          </div>)}
        </div>
      </section>

      <section className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="font-semibold text-white mb-3"><ClipboardCheck size={17} className="inline mr-2 text-cyan-400" />Evidence-linked triage cases</h2>
        <div className="space-y-2">
          {cases.map(item => <div key={item.id} className="bg-gray-950 border border-gray-800 rounded-lg p-3 flex gap-3 items-center">
            <button className="flex-1 text-left" onClick={() => openCase(item.id)}>
              <div className="flex gap-2 items-center"><strong>#{item.id} {item.title}</strong><span className="text-xs text-amber-300">{item.severity} · risk {item.risk_score}</span></div>
              <p className="text-xs text-gray-400 mt-1">{item.status} · owner {item.owner_name || 'unassigned'} · escalation L{item.escalation_level} · SLA {new Date(item.sla_due_at).toLocaleString()}</p>
            </button>
            {item.status !== 'resolved' && !item.owner_user_id && <button className={button} onClick={() => caseAction(item, 'assign')}>Claim</button>}
            {item.status !== 'resolved' && item.owner_user_id && <button className={button} onClick={() => caseAction(item, 'escalate')}>Escalate</button>}
            {item.status !== 'resolved' && item.owner_user_id && <button className={button} onClick={() => caseAction(item, 'resolve')}>Resolve</button>}
          </div>)}
          {!cases.length && <p className="text-sm text-gray-500">No triage cases.</p>}
        </div>
        {detail && <div className="mt-4 bg-gray-950 border border-cyan-900 rounded-lg p-4">
          <div className="flex justify-between"><strong>Case #{detail.id} evidence</strong><button className="text-gray-400" onClick={() => setDetail(null)}>Close</button></div>
          {detail.evidence.map(item => <div key={item.id} className="mt-2 text-xs text-gray-300"><Activity size={13} className="inline mr-2 text-cyan-400" />{item.external_event_id} · {item.event_type} · {item.sensor_uid} · {item.integrity_status}<p className="ml-5 text-gray-600 break-all">SHA-256 {item.raw_sha256}</p></div>)}
        </div>}
      </section>

      <div className="grid xl:grid-cols-2 gap-6">
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="font-semibold mb-3">Suppression review</h2>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <select className={field} value={suppressionForm.event_type} onChange={event => setSuppressionForm({ ...suppressionForm, event_type: event.target.value })}>{['rf_detection', 'radar_track', 'eo_ir_detection', 'acoustic_detection', 'sensor_health'].map(type => <option key={type}>{type}</option>)}</select>
            <input className={field} placeholder="Sensor UID (optional)" value={suppressionForm.sensor_uid} onChange={event => setSuppressionForm({ ...suppressionForm, sensor_uid: event.target.value })} />
            <input className={field} type="datetime-local" value={suppressionForm.expires_at} onChange={event => setSuppressionForm({ ...suppressionForm, expires_at: event.target.value })} />
            <input className={field} placeholder="Reason and ticket" value={suppressionForm.reason} onChange={event => setSuppressionForm({ ...suppressionForm, reason: event.target.value })} />
          </div>
          <button className={button} disabled={!suppressionForm.reason || !suppressionForm.expires_at} onClick={requestSuppression}>Request suppression</button>
          <div className="mt-4 space-y-2">{suppressions.map(item => <div key={item.id} className="bg-gray-950 rounded-lg p-3 text-xs">
            <p><strong>#{item.id} {item.status}</strong> · {item.event_type || 'all events'} · {item.sensor_uid || 'all sensors'}</p><p className="text-gray-400 mt-1">{item.reason} · requested by {item.requested_by_email}</p>
            {elevated && item.status === 'pending' && <div className="flex gap-2 mt-2"><button className={button} onClick={() => reviewSuppression(item.id, 'approved')}>Approve</button><button className={button} onClick={() => reviewSuppression(item.id, 'rejected')}>Reject</button></div>}
          </div>)}</div>
        </section>

        <section className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="font-semibold mb-3">Policy evaluation gate</h2>
          <input className={`${field} w-full mb-2`} placeholder="Evaluation name" value={evalName} onChange={event => setEvalName(event.target.value)} />
          <textarea className={`${field} w-full font-mono`} rows={7} aria-label="Labeled evaluation samples JSON" value={evalSamples} onChange={event => setEvalSamples(event.target.value)} />
          <button className={`${button} mt-2`} disabled={!evalName} onClick={runEvaluation}>Measure dataset</button>
          <div className="mt-4 space-y-2">{evaluations.map(item => <div key={item.id} className="bg-gray-950 rounded-lg p-3 text-xs flex items-center gap-3">
            <CheckCircle2 size={16} className={item.status === 'approved' ? 'text-green-400' : 'text-amber-400'} /><div className="flex-1"><strong>{item.name}</strong><p className="text-gray-400">{item.status} · n={item.total_samples} · recall {Number(item.recall_value).toFixed(3)} · FPR {Number(item.false_positive_rate).toFixed(3)}</p></div>
            {elevated && item.status === 'completed' && <button className={button} onClick={() => approveEvaluation(item.id)}>Approve</button>}
          </div>)}</div>
        </section>
      </div>
    </div>
  );
}
