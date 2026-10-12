const BASE = '/api';
const LIST_ROUTES = new Set([
  'threats', 'countermeasures', 'deployments', 'sensors', 'incidents', 'zones',
  'threat-signatures', 'fusion-tracks', 'engagements', 'effector-magazines',
  'high-capacity-interceptors', 'non-kinetic-effectors', 'autonomy-attack-vectors',
  'audit', 'roe/rules', 'roe/authorizations', 'telemetry/sources',
  'triage/cases', 'triage/suppressions', 'triage/evaluations',
]);
function getToken() { return localStorage.getItem('token') || ''; }
export async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}`, ...(options.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    if (res.status === 503) throw new Error(err.error || 'AI service unavailable');
    throw new Error(err.error || 'Request failed');
  }
  const payload = await res.json();
  const route = path.split('?')[0].replace(/^\/+|\/+$/g, '');
  if ((!options.method || options.method.toUpperCase() === 'GET') && LIST_ROUTES.has(route)) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.data)) return payload.data;
    throw new Error(`Unexpected list response from ${route}`);
  }
  return payload;
}

export async function apiDownload(path: string, filename: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Authorization': `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
