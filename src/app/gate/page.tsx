'use client';
import { useState } from 'react';

export default function GatePage() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token.trim()) return;
    
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(`/api/clearance/verify/${token.trim().toUpperCase()}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ background: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="navbar" style={{ background: '#000' }}>
        <div className="navbar-inner" style={{ justifyContent: 'center' }}>
          <div className="navbar-brand">
            <div className="navbar-logo" style={{ background: 'var(--bg-raised)' }}>🛡️</div>
            <span style={{ fontSize: '1.2rem' }}>Gate Security Terminal</span>
          </div>
        </div>
      </div>

      <div className="container flex-1 flex flex-col items-center justify-center py-8">
        <div className="card card-p" style={{ width: '100%', maxWidth: 500, background: 'var(--bg-surface)' }}>
          <form onSubmit={handleVerify} className="mb-6">
            <div className="form-group mb-4">
              <label className="form-label text-center">Scan or Enter Clearance Token</label>
              <input 
                autoFocus
                className="form-input font-mono text-center" 
                style={{ fontSize: '1.5rem', letterSpacing: '0.1em', padding: '16px' }}
                placeholder="TOKEN" 
                value={token} 
                onChange={(e) => setToken(e.target.value.toUpperCase())}
                disabled={loading}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading || !token.trim()}>
              {loading ? 'Verifying...' : 'Verify Token'}
            </button>
          </form>

          {error && (
            <div className="alert alert-error flex-col items-center justify-center p-6 text-center animate-in">
              <span style={{ fontSize: '3rem', marginBottom: 8 }}>❌</span>
              <h3 className="text-red">INVALID TOKEN</h3>
              <p className="mt-2 text-sec">{error}</p>
            </div>
          )}

          {result && result.valid && (
            <div className="card text-center animate-in overflow-hidden" style={{ border: '2px solid var(--green)' }}>
              <div style={{ background: 'var(--green-dim)', padding: '24px 16px', borderBottom: '1px solid rgba(62,207,142,0.3)' }}>
                <span style={{ fontSize: '4rem', display: 'block', marginBottom: 8 }}>✅</span>
                <h2 className="text-green">DEPARTURE APPROVED</h2>
                <div className="font-mono text-xl mt-2 tracking-widest">{token}</div>
              </div>
              
              <div className="p-6 text-left">
                <div className="mb-6 pb-6 border-b" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-sm text-sec mb-1">Student</p>
                  <p className="font-bold text-lg">{result.student.name}</p>
                  <p className="font-mono text-muted">{result.student.studentId} • Block {result.student.dormBlock?.number}</p>
                </div>

                <div className="mb-6">
                  <div className="alert alert-success">
                    <p className="text-sm"><strong>Room Assets Verified</strong></p>
                    <p className="text-xs mt-1">Staff has audited the baseline assets for Room {result.student.room?.roomNumber} and confirmed no university property is missing.</p>
                  </div>
                </div>

                <div className="text-xs text-muted">
                  <p>Audited By: {result.approvedBy?.name}</p>
                  <p>Time: {new Date(result.approvedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
