import { useEffect, useMemo, useState } from 'react';
import { socket } from '../lib/socket';
import { apiFetch, BACKEND_BASE } from '../lib/api';
import EmailChips from '../components/EmailChips';
import Topbar from '../components/Topbar';
import AuthOverlay from '../components/AuthOverlay';

type Monitor = {
  id: string;
  type: 'web_app' | 'api' | 'service';
  name: string;
  url: string;
  method: string;
  latestCheck: { status: 'up' | 'down'; httpStatus: number | null; responseTimeMs: number; createdAt: string } | null;
};

export default function Dashboard() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [q, setQ] = useState('');
  const [authed, setAuthed] = useState<boolean>(false);
  const BASE = BACKEND_BASE;

  async function load() {
    const res = await apiFetch(`/api/monitors`);
    const data = await res.json();
    setMonitors(data.monitors || []);
  }

  useEffect(() => {
    // check session
    apiFetch(`/api/auth/me`)
      .then(r => setAuthed(r.ok))
      .catch(() => setAuthed(false));
    load();
    const onUpdate = () => load();
    socket.on('check:update', onUpdate);
    return () => { socket.off('check:update', onUpdate); };
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return monitors;
    return monitors.filter(m => m.name.toLowerCase().includes(t) || m.url.toLowerCase().includes(t));
  }, [q, monitors]);

  return (
    <div className="container" style={{ ...(authed ? {} as any : { transform: 'translateX(40px)' }), transition: 'transform 200ms ease' }}>
      <Topbar query={q} onQueryChange={setQ} right={<AddServiceButton onAdded={() => load()} />} />

      <div className="grid grid-c2">
        <UsageCard monitors={monitors} />

        <div className="card">
          <div className="card-header">
            <div className="card-title">Projects</div>
            <button className="button">Deploy</button>
          </div>
          <div className="card-content">
            {filtered.length === 0 ? (
              <div className="text-muted" style={{ padding: 16 }}>
                <div className="card" style={{ padding: 24, textAlign: 'center' }}>
                  <div style={{ fontSize: 14, marginBottom: 8 }}>Deploy your first project</div>
                  <div className="card-subtle">Start with one of our templates or create something new.</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-c-auto">
                {filtered.map(m => (
                  <a key={m.id} href={`/app/${m.id}`} className="card" style={{ padding: 14, textDecoration: 'none', color: 'inherit' }}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <span className="text-muted" style={{ fontSize: 12, marginRight: 8 }}>{iconFor(m.type)} {labelFor(m.type)}</span>
                      <div className="card-title" style={{ fontSize: 14 }}>{m.name}</div>
                      <span className={m.latestCheck?.status === 'up' ? 'badge-up' : 'badge-down'}>
                        {m.latestCheck ? m.latestCheck.status.toUpperCase() : 'N/A'}
                      </span>
                    </div>
                    <div className="text-muted" style={{ fontSize: 12, marginTop: 6 }}>{m.method} {m.url}</div>
                    {m.latestCheck && (
                      <div className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>
                        {m.latestCheck.httpStatus ?? '—'} · {m.latestCheck.responseTimeMs}ms
                      </div>
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {!authed && <AuthOverlay onAuthed={() => setAuthed(true)} />}
    </div>
  );
}
function UsageCard({ monitors }: { monitors: any[] }) {
  const [summary, setSummary] = useState<{ uptimePct: number; avgMs: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!monitors.length) { setSummary(null); return; }
      // Use the first monitor as representative for now
      const id = monitors[0].id;
      const res = await fetch(`${BACKEND_BASE}/api/monitors/${id}/metrics`);
      const json = await res.json();
      if (!cancelled) setSummary({ uptimePct: json.uptimePct || 0, avgMs: json.avgResponseMs || 0 });
    }
    load();
    return () => { cancelled = true; };
  }, [monitors]);

  function Donut({ pct }: { pct: number }) {
    const r = 28, c = 2 * Math.PI * r;
    const off = c * (1 - Math.min(100, Math.max(0, pct)) / 100);
    return (
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} stroke="#eee" strokeWidth="8" fill="none" />
        <circle cx="36" cy="36" r={r} stroke="#16a34a" strokeWidth="8" fill="none" strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 36 36)" />
        <text x="36" y="40" textAnchor="middle" fontSize="12" fill="#111">{pct}%</text>
      </svg>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Usage</div>
      </div>
      <div className="card-content" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Donut pct={summary?.uptimePct ?? 0} />
        <div className="text-muted">
          <div>Uptime (30d)</div>
          <div style={{ fontSize: 20, color: '#111' }}>{summary?.uptimePct ?? 0}%</div>
          <div style={{ marginTop: 8 }}>Avg response</div>
          <div style={{ fontSize: 20, color: '#111' }}>{summary?.avgMs ?? 0} ms</div>
        </div>
      </div>
    </div>
  );
}

function AddServiceButton({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'web_app' | 'api' | 'service'>('web_app');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    await apiFetch(`/api/monitors`, {
      method: 'POST',
      body: JSON.stringify({ type, name, url, notifyEmails: emails })
    });
    setSaving(false);
    setOpen(false);
    setType('web_app');
    setName('');
    setUrl('');
    setEmails([]);
    onAdded();
  }

  return (
    <div>
      <button className="button" onClick={() => setOpen(true)}>Add New…</button>
      {open && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="card-title" style={{ marginBottom: 12 }}>Add Service</div>
            <div className="grid" style={{ gap: 10 }}>
              <div className="row">
                <label className="text-muted" style={{ width: 80 }}>Type</label>
                <select className="input" value={type} onChange={e => setType(e.target.value as any)}>
                  <option value="web_app">Web App</option>
                  <option value="api">API</option>
                  <option value="service">Service</option>
                </select>
              </div>
              <input className="input" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
              <input className="input" placeholder="URL (https://...)" value={url} onChange={e => setUrl(e.target.value)} />
              <div className="grid" style={{ gap: 6 }}>
                <label className="text-muted">Notification emails</label>
                <EmailChips value={emails} onChange={setEmails} placeholder="Add email and press Enter" />
              </div>
            </div>
            <div className="row mt-6" style={{ justifyContent: 'flex-end' }}>
              <button className="button" onClick={() => setOpen(false)}>Cancel</button>
              <button className="button" disabled={!name || !url || saving} onClick={submit}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function iconFor(t: 'web_app' | 'api' | 'service') {
  if (t === 'api') return '🧩';
  if (t === 'service') return '⚙️';
  return '🌐';
}
function labelFor(t: 'web_app' | 'api' | 'service') {
  if (t === 'api') return 'API';
  if (t === 'service') return 'Service';
  return 'Web App';
}



