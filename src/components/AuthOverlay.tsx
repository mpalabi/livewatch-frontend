import { useEffect, useState } from 'react';

export default function AuthOverlay({ onAuthed }: { onAuthed: () => void }) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function requestCode() {
    setLoading(true); setError('');
    const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000'}/api/auth/request`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ email }) });
    setLoading(false);
    if (!res.ok) { setError('Failed to send code'); return; }
    setStep('code');
  }

  async function verifyCode() {
    setLoading(true); setError('');
    const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000'}/api/auth/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ email, code }) });
    setLoading(false);
    if (!res.ok) { setError('Invalid code'); return; }
    try {
      const data = await res.json();
      if (data?.token) {
        const { encryptAndStoreToken } = await import('../lib/secureStorage');
        await encryptAndStoreToken(data.token);
      }
    } catch {}
    onAuthed();
  }

  return (
    <div className="modal-backdrop" style={{ backdropFilter: 'blur(2px)' }}>
      <div className="modal">
        <div className="card-title" style={{ marginBottom: 12 }}>Sign in</div>
        {step === 'email' ? (
          <div className="grid" style={{ gap: 10 }}>
            <input className="input" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            {error && <div className="text-muted" style={{ color: '#a00' }}>{error}</div>}
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="button" onClick={requestCode} disabled={loading || !email}>{loading ? 'Sending…' : 'Send code'}</button>
            </div>
          </div>
        ) : (
          <div className="grid" style={{ gap: 10 }}>
            <input className="input" placeholder="Enter 6-digit code" value={code} onChange={e => setCode(e.target.value)} />
            {error && <div className="text-muted" style={{ color: '#a00' }}>{error}</div>}
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <button className="button" onClick={() => setStep('email')}>Back</button>
              <button className="button" onClick={verifyCode} disabled={loading || code.length < 6}>{loading ? 'Verifying…' : 'Verify'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


