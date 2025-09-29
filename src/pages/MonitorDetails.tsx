import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { socket } from '../lib/socket';

export default function MonitorDetails() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [uptime, setUptime] = useState<{ month: string; days: Array<{ date: string; uptime: number }> } | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await apiFetch(`/api/monitors/${id}`);
      const json = await res.json();
      setData(json);
      setLoading(false);
    }
    load();
  }, [id]);

  const m = data?.monitor;

  useEffect(() => {
    async function loadUptime() {
      const res = await apiFetch(`/api/monitors/${id}/uptime?month=${month}`);
      const json = await res.json();
      setUptime(json);
    }
    loadUptime();
  }, [id, month]);

  // Realtime: update recent checks and latest status via socket
  useEffect(() => {
    function onUpdate(e: any) {
      if (!e || !id || String(e.monitorId) !== String(id)) return;
      setData((prev: any) => {
        if (!prev || !prev.monitor) return prev;
        const latestCheck = {
          status: e.status,
          httpStatus: e.httpStatus ?? null,
          responseTimeMs: e.responseTimeMs ?? 0,
          error: e.error ?? null,
          createdAt: e.createdAt,
        };
        const checks = [{ ...latestCheck }, ...(prev.checks || [])].slice(0, 50);
        return { ...prev, monitor: { ...prev.monitor, latestCheck }, checks };
      });
    }
    socket.on('check:update', onUpdate);
    return () => { socket.off('check:update', onUpdate); };
  }, [id]);

  function prevMonth() {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 2, 1));
    setMonth(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  function nextMonth() {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(Date.UTC(y, m, 1));
    setMonth(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }

  const heatmap = useMemo(() => {
    if (!uptime?.days) return null;
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthStart = new Date(`${uptime.month}-01T00:00:00.000Z`);
    const offset = monthStart.getUTCDay(); // 0..6
    const blanks = Array.from({ length: offset }).map((_, i) => ({ blank: true, key: `blank-${i}` }));
    const cells = uptime.days.map((d) => ({ ...d, key: d.date }));
    const all = [...blanks, ...cells];

    function colorFor(uptimePct: number, total: number) {
      if (!total) return '#e5e7eb';
      // Map 0->red, 50->orange, 100->green using HSL hue 0..120
      const hue = Math.max(0, Math.min(120, Math.round((uptimePct / 100) * 120)));
      const sat = 70;
      const light = 45;
      return `hsl(${hue} ${sat}% ${light}%)`;
    }

    return (
      <div>
        <div className="row mb-6" style={{ justifyContent: 'space-between' }}>
          <button className="button" onClick={prevMonth}>←</button>
          <div className="card-title">{uptime.month}</div>
          <button className="button" onClick={nextMonth}>→</button>
        </div>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          {weekDays.map((wd) => (
            <div key={wd} style={{ width: '100%', textAlign: 'center', fontSize: 11, color: '#777' }}>{wd}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, width: '100%' }}>
          {all.map((c: any, idx: number) => {
            if (c.blank) return <div key={c.key} style={{ aspectRatio: '1 / 1', background: 'transparent' }} />;
            const val = Number(c.uptime) || 0; // 0-100
            const col = colorFor(val, c.total);
            return (
              <div
                key={c.key || idx}
                title={`${c.date}: ${val}% up`}
                style={{ width: '100%', aspectRatio: '1 / 1', background: col, borderRadius: 2 }}
              />
            );
          })}
        </div>
      </div>
    );
  }, [uptime]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [range, setRange] = useState<string>('7d');

  function setRangePreset(preset: string) {
    setRange(preset);
    const today = new Date();
    const yyyy = today.getUTCFullYear();
    const mm = String(today.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(today.getUTCDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    if (preset === 'today') {
      setFrom(todayStr);
      setTo(todayStr);
    } else if (preset === '7d' || preset === '30d' || preset === '90d') {
      const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
      const start = new Date(Date.UTC(yyyy, today.getUTCMonth(), today.getUTCDate() - (days - 1)));
      const sY = start.getUTCFullYear();
      const sM = String(start.getUTCMonth() + 1).padStart(2, '0');
      const sD = String(start.getUTCDate()).padStart(2, '0');
      setFrom(`${sY}-${sM}-${sD}`);
      setTo(todayStr);
    } else if (preset === 'month') {
      const first = new Date(Date.UTC(yyyy, today.getUTCMonth(), 1));
      const sY = first.getUTCFullYear();
      const sM = String(first.getUTCMonth() + 1).padStart(2, '0');
      const sD = String(first.getUTCDate()).padStart(2, '0');
      setFrom(`${sY}-${sM}-${sD}`);
      setTo(todayStr);
    }
    // Reload page 0 after range change
    setTimeout(() => loadPage(0), 0);
  }

  async function loadPage(p = 0) {
    const q = new URLSearchParams();
    q.set('page', String(p));
    q.set('limit', String(limit));
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    const res = await apiFetch(`/api/monitors/${id}/checks?` + q.toString());
    const json = await res.json();
    setData((prev: any) => ({ ...prev, checks: json.rows }));
    setPage(json.page);
    setTotal(json.total || 0);
    setLimit(json.limit || 20);
  }

  useEffect(() => { if (id) loadPage(0); }, [id, from, to]);

  function csvEscape(val: any) {
    const s = String(val ?? '');
    if (s.includes('"') || s.includes(',') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  async function exportCsv() {
    if (!id) return;
    const header = ['time', 'status', 'httpStatus', 'responseTimeMs', 'error'];
    const lines: string[] = [header.join(',')];
    let p = 0;
    const max = 5000; // safety cap
    const pageLimit = 500;
    let fetched = 0;
    while (fetched < max) {
      const q = new URLSearchParams();
      q.set('page', String(p));
      q.set('limit', String(pageLimit));
      if (from) q.set('from', from);
      if (to) q.set('to', to);
      const res = await apiFetch(`/api/monitors/${id}/checks?` + q.toString());
      const json = await res.json();
      const rows = json.rows || [];
      for (const r of rows) {
        lines.push([
          csvEscape(new Date(r.createdAt).toISOString()),
          csvEscape(r.status),
          csvEscape(r.httpStatus),
          csvEscape(r.responseTimeMs),
          csvEscape(r.error)
        ].join(','));
      }
      fetched += rows.length;
      if (fetched >= (json.total || fetched) || rows.length === 0) break;
      p += 1;
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `checks-${id}-${from || 'all'}_${to || 'all'}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="container">
      {loading && <div>Loading…</div>}
      {!loading && !m && <div>Not found</div>}
      {!loading && m && (
        <>
          <div className="row mb-6">
            <Link to="/" className="button">← Back</Link>
            <div className="card-title">{m.name}</div>
          </div>
          <div className="grid grid-c2">
            <div className="card">
              <div className="card-header"><div className="card-title">Overview</div></div>
              <div className="card-content">
                <div className="kv">
                  <div className="kv-label">Type</div>
                  <div className="kv-value mono">{m.type}</div>
                  <div className="kv-label">URL</div>
                  <div className="kv-value mono">{m.method} {m.url}</div>
                  <div className="kv-label">Expected</div>
                  <div className="kv-value mono">{m.expectedStatus}</div>
                  <div className="kv-label">Interval</div>
                  <div className="kv-value mono">{m.intervalSeconds}s</div>
                  <div className="kv-label">Timeout</div>
                  <div className="kv-value mono">{m.timeoutMs}ms</div>
                  <div className="kv-label">Status</div>
                  <div className="kv-value">
                    {m.latestCheck?.status === 'up' ? (
                      <span className="badge green">UP ({m.latestCheck?.httpStatus ?? '—'})</span>
                    ) : m.latestCheck?.status === 'down' ? (
                      <span className="badge red">DOWN ({m.latestCheck?.httpStatus ?? '—'})</span>
                    ) : (
                      <span className="badge gray">N/A</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-header">
                <div className="card-title">Recent Checks</div>
                <div className="row" style={{ gap: 8, marginBottom: 12 }}>
                  <select className="input" value={range} onChange={e => setRangePreset(e.target.value)}>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                    <option value="today">Today</option>
                    <option value="month">This month</option>
                  </select>
                  <button className="button" onClick={exportCsv}>Export CSV</button>
                </div>
              </div>
              <div className="card-content">
                {data.checks?.length ? (
                  <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                    <div className="grid" style={{ gridTemplateColumns: '1fr 80px 80px 1fr' }}>
                      <div className="text-muted">Time</div>
                      <div className="text-muted">Status</div>
                      <div className="text-muted">HTTP</div>
                      <div className="text-muted">Error</div>
                      {data.checks.map((c: any, idx: number) => (
                        <div key={c.id || idx} style={{ display: 'contents' }}>
                          <div>{new Date(c.createdAt).toLocaleString()}</div>
                          <div>{c.status}</div>
                          <div>{c.httpStatus ?? '—'}</div>
                          <div className="text-muted">{c.error ?? '—'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-muted">No checks yet.</div>
                )}
                <div className="row mt-6" style={{ justifyContent: 'space-between', gap: 8 }}>
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    Page {page + 1} of {Math.max(1, Math.ceil(total / Math.max(1, limit)))} · {total} total
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <button className="button" disabled={page <= 0} onClick={() => { const p = Math.max(0, page - 1); loadPage(p); }}>Prev</button>
                    <button className="button" disabled={(page + 1) >= Math.ceil(total / Math.max(1, limit))} onClick={() => { const p = page + 1; loadPage(p); }}>Next</button>
                  </div>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><div className="card-title">Liveness by Day</div></div>
              <div className="card-content">
                {heatmap || <div className="text-muted">No data</div>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


