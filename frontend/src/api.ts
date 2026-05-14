const BASE = '/api';
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
  return res.json();
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
