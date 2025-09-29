import { useEffect, useMemo, useState } from 'react';
import { socket } from './lib/socket';

type Monitor = {
  id: string;
  type: 'web_app' | 'api' | 'service';
  name: string;
  url: string;
  method: string;
  latestCheck: { status: 'up' | 'down'; httpStatus: number | null; responseTimeMs: number; createdAt: string } | null;
};

function App() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [q, setQ] = useState('');

  async function load() {
    const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000'}/api/monitors`);
    const data = await res.json();
    setMonitors(data.monitors || []);
  }

  useEffect(() => {
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
    <div className="container">
      <div className="topbar">
        <div className="search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <input placeholder="Search Projects..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <button className="button">Add New…</button>
        <AddServiceButton onAdded={() => load()} />
      </div>

      <div className="grid grid-c2">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Usage</div>
          </div>
          <div className="card-content text-muted">
            <div>Edge Requests — 0 / 1M</div>
            <div>Fast Data Transfer — 0 / 100 GB</div>
            <div>Fast Origin Transfer — 0 / 10 GB</div>
          </div>
        </div>

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
                  <div key={m.id} className="card" style={{ padding: 14 }}>
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
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

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

function AddServiceButton({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'web_app' | 'api' | 'service'>('web_app');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000'}/api/monitors`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, name, url })
    });
    setSaving(false);
    setOpen(false);
    setType('web_app');
    setName('');
    setUrl('');
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
