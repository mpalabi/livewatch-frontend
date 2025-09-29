import { loadDecryptedToken, clearStoredToken } from './secureStorage';

const BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';

export async function apiFetch(path: string, init: RequestInit = {}) {
  const token = await loadDecryptedToken();
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', headers.get('Content-Type') || 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });
  if (res.status === 401) {
    try { await clearStoredToken(); } catch {}
    if (typeof window !== 'undefined' && !window.location.search.includes('login=1')) {
      window.location.href = '/?login=1';
    }
    const err: any = new Error('unauthorized');
    err.status = 401;
    throw err;
  }
  return res;
}


