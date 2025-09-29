import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { clearStoredToken } from '../lib/secureStorage';
import { BACKEND_BASE } from '../lib/api';

export default function Layout({ children }: { children: ReactNode }) {
  const loc = useLocation();
  async function logout() {
    try {
      await fetch(`${BACKEND_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch {}
    clearStoredToken();
    // Trigger login overlay by navigating to root and reloading
    window.location.href = '/?login=1';
  }
  return (
    <div>
      <header style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: '1px solid #eee', background: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: '#111' }} />
          <strong>LiveWatch</strong>
          <nav style={{ display: 'flex', gap: 12, marginLeft: 16 }}>
            <Link to="/" style={{ color: loc.pathname === '/' ? '#111' : '#666', textDecoration: 'none' }}>Dashboard</Link>
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="button" onClick={logout}>Logout</button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}


