'use client';
import { useState } from 'react';

export default function GatePage() {
  const [activeTab, setActiveTab] = useState<'token' | 'student-id'>('token');
  
  // Token verification states
  const [token, setToken] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenResult, setTokenResult] = useState<any>(null);
  const [tokenError, setTokenError] = useState('');
  const [tokenReleasing, setTokenReleasing] = useState(false);
  const [tokenReleased, setTokenReleased] = useState(false);

  // Student ID verification states
  const [studentId, setStudentId] = useState('');
  const [idLoading, setIdLoading] = useState(false);
  const [idResult, setIdResult] = useState<any>(null);
  const [idError, setIdError] = useState('');
  const [searchedId, setSearchedId] = useState('');
  const [idReleasing, setIdReleasing] = useState(false);
  const [idReleased, setIdReleased] = useState(false);

  const handleVerifyToken = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token.trim()) return;
    setTokenLoading(true); 
    setTokenError(''); 
    setTokenResult(null);
    setTokenReleased(false);
    try {
      const res = await fetch(`/api/clearance/verify/${token.trim().toUpperCase()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      setTokenResult(data);
    } catch (err: any) {
      setTokenError(err.message);
    } finally {
      setTokenLoading(false);
    }
  };

  const handleVerifyStudentId = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!studentId.trim()) return;
    setIdLoading(true);
    setIdError('');
    setIdResult(null);
    setSearchedId(studentId.trim());
    setIdReleased(false);
    try {
      const res = await fetch(`/api/clearance/verify-id?studentId=${studentId.trim()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Access Denied');
      setIdResult(data);
    } catch (err: any) {
      setIdError(err.message);
    } finally {
      setIdLoading(false);
    }
  };

  // Release exit pass via public gate endpoint (no auth required — gate kiosk)
  const handleRelease = async (requestId: string, source: 'token' | 'id') => {
    const setReleasing = source === 'token' ? setTokenReleasing : setIdReleasing;
    const setReleased = source === 'token' ? setTokenReleased : setIdReleased;

    setReleasing(true);
    try {
      const res = await fetch('/api/clearance/release', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: requestId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Release failed');
      setReleased(true);
    } catch (err: any) {
      alert(`Release failed: ${err.message}`);
    } finally {
      setReleasing(false);
    }
  };

  // Helper to render declared belongings from a result object
  const renderBelongings = (result: any) => {
    let items: any = null;
    try { items = result.items ? (typeof result.items === 'string' ? JSON.parse(result.items) : result.items) : null; } catch {}
    const clothes = result.clothesCount ?? items?.clothes ?? 0;
    const trousers = result.trousersCount ?? items?.trousers ?? 0;
    const sweaters = result.sweatersCount ?? items?.sweaters ?? items?.jackets ?? 0;
    const other = result.otherAssets ?? items?.otherItems;

    return (
      <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, padding: '14px 16px' }}>
        <p style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f59e0b', marginBottom: 10 }}>🎒 Declared Belongings — Verify Before Release</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <BelongingRow icon="👕" label="Clothes" count={clothes} />
          <BelongingRow icon="👖" label="Trousers" count={trousers} />
          <BelongingRow icon="🧥" label="Sweaters" count={sweaters} />
          {Array.isArray(other) && other.map((item: any, i: number) => (
            <BelongingRow key={i} icon="📦" label={item.name || item} count={item.count ?? 1} />
          ))}
          {typeof other === 'string' && other && (
            <div style={{ gridColumn: 'span 2', fontSize: '0.75rem', color: '#94a3b8', paddingTop: 4 }}>{other}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="page" style={{ background: '#090a0f', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#f8fafc' }}>
      <div className="navbar" style={{ background: '#0d0e16', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <div className="navbar-inner" style={{ justifyContent: 'center' }}>
          <div className="navbar-brand">
            <div className="navbar-logo" style={{ background: '#1e293b', boxShadow: '0 0 15px rgba(99, 102, 241, 0.3)' }}>🛡️</div>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--indigo)' }}>DBU Gate Security Command Center</span>
          </div>
        </div>
      </div>

      <div className="container flex-1 flex flex-col items-center justify-center py-10 px-4">
        <div className="card card-p" style={{ width: '100%', maxWidth: 580, background: '#0e111a', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', borderRadius: '16px' }}>
          
          {/* Tab Selector */}
          <div className="flex rounded-xl p-1 mb-8" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <button 
              className="flex-1 py-3 text-sm font-bold rounded-lg transition-all"
              style={{
                background: activeTab === 'token' ? 'rgba(79, 70, 229, 0.2)' : 'transparent',
                color: activeTab === 'token' ? '#fff' : '#94a3b8',
                border: activeTab === 'token' ? '1px solid rgba(79, 70, 229, 0.4)' : '1px solid transparent',
              }}
              onClick={() => {
                setActiveTab('token');
                setTokenError(''); setTokenResult(null); setTokenReleased(false);
                setIdError(''); setIdResult(null); setIdReleased(false);
              }}
            >
              🎟️ Token Scanner
            </button>
            <button 
              className="flex-1 py-3 text-sm font-bold rounded-lg transition-all"
              style={{
                background: activeTab === 'student-id' ? 'rgba(79, 70, 229, 0.2)' : 'transparent',
                color: activeTab === 'student-id' ? '#fff' : '#94a3b8',
                border: activeTab === 'student-id' ? '1px solid rgba(79, 70, 229, 0.4)' : '1px solid transparent',
              }}
              onClick={() => {
                setActiveTab('student-id');
                setTokenError(''); setTokenResult(null); setTokenReleased(false);
                setIdError(''); setIdResult(null); setIdReleased(false);
              }}
            >
              🔍 Student ID Lookup
            </button>
          </div>

          {/* Tab 1: Exit Code Scanner */}
          {activeTab === 'token' && (
            <div>
              <form onSubmit={handleVerifyToken} className="mb-6">
                <div className="form-group mb-4">
                  <label className="form-label text-center" style={{ color: '#94a3b8' }}>Enter Student Departure Exit Code (e.g. DEP-DBU-A491)</label>
                  <input 
                    autoFocus
                    className="form-input font-mono text-center" 
                    style={{ fontSize: '1.6rem', letterSpacing: '0.12em', padding: '16px', borderRadius: '12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}
                    placeholder="DEP-DBU-XXXX" 
                    value={token} 
                    onChange={(e) => setToken(e.target.value.toUpperCase())}
                    disabled={tokenLoading}
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-block btn-lg" style={{ borderRadius: '12px', padding: '14px', background: 'var(--indigo)' }} disabled={tokenLoading || !token.trim()}>
                  {tokenLoading ? 'Verifying...' : '🔍 Verify Exit Code'}
                </button>
              </form>

              {tokenError && (
                <div className="alert alert-error flex-col items-center justify-center p-6 text-center animate-in" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px' }}>
                  <span style={{ fontSize: '3rem', marginBottom: 8 }}>❌</span>
                  <h3 className="text-red font-bold text-lg">INVALID TOKEN</h3>
                  <p className="mt-2 text-sec text-sm">{tokenError}</p>
                </div>
              )}

              {tokenResult && tokenResult.valid && (
                <div className="card text-center animate-in overflow-hidden" style={{ border: tokenReleased ? '2px solid #3b82f6' : '2px solid var(--green)', background: tokenReleased ? '#0b0f1a' : '#0b1311', borderRadius: '14px' }}>
                  <div style={{ background: tokenReleased ? 'rgba(59,130,246,0.12)' : 'rgba(16, 185, 129, 0.12)', padding: '24px 16px', borderBottom: '1px solid rgba(16,185,129,0.2)' }}>
                    <span style={{ fontSize: '4.5rem', display: 'block', marginBottom: 8 }}>{tokenReleased ? '🚪' : '✅'}</span>
                    <h2 style={{ color: tokenReleased ? '#60a5fa' : '#10b981' }} className="font-black tracking-wider text-xl uppercase">
                      {tokenReleased ? 'EXIT PASS RELEASED' : 'DEPARTURE APPROVED'}
                    </h2>
                    <div className="font-mono text-2xl mt-3 font-black tracking-widest text-emerald-300 bg-black/50 py-2 px-5 rounded-xl inline-block border border-emerald-500/40">
                      {tokenResult.departureId ?? token}
                    </div>
                  </div>
                  
                  <div className="p-6 text-left text-sm text-slate-300 space-y-4">
                    {/* Student Badge */}
                    <StudentBadge student={tokenResult.student} />

                    {/* Belongings Audit */}
                    {renderBelongings(tokenResult)}

                    <div className="text-xs text-slate-400 bg-black/20 p-3 rounded-lg space-y-1">
                      <p>Approved By: <span className="font-bold text-slate-300">{tokenResult.approvedBy?.name}</span></p>
                      <p>Timestamp: <span className="font-mono text-slate-300">{new Date(tokenResult.approvedAt).toLocaleString()}</span></p>
                    </div>

                    {/* Release Button */}
                    {!tokenReleased ? (
                      <button
                        className="btn btn-block btn-lg"
                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 800, borderRadius: '12px', padding: '14px', fontSize: '1rem', boxShadow: '0 4px 20px rgba(16,185,129,0.3)', border: 'none' }}
                        disabled={tokenReleasing}
                        onClick={() => handleRelease(tokenResult.id, 'token')}
                      >
                        {tokenReleasing ? '⏳ Processing...' : '✅ Verify Items & Release Exit Pass'}
                      </button>
                    ) : (
                      <div className="flex items-center justify-center gap-3 py-3 rounded-xl" style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)' }}>
                        <span style={{ fontSize: '1.5rem' }}>🚪</span>
                        <span className="font-black text-sm tracking-wider" style={{ color: '#60a5fa' }}>STUDENT RELEASED — EXIT LOGGED</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Student ID Lookup */}
          {activeTab === 'student-id' && (
            <div>
              <form onSubmit={handleVerifyStudentId} className="mb-6">
                <div className="form-group mb-4">
                  <label className="form-label text-center" style={{ color: '#94a3b8' }}>Lookup by University Student ID</label>
                  <input 
                    autoFocus
                    className="form-input font-mono text-center text-slate-200" 
                    style={{ fontSize: '1.6rem', letterSpacing: '0.08em', padding: '16px', borderRadius: '12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}
                    placeholder="dbu1500962" 
                    value={studentId} 
                    onChange={(e) => setStudentId(e.target.value)}
                    disabled={idLoading}
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-block btn-lg" style={{ borderRadius: '12px', padding: '14px', background: 'var(--indigo)' }} disabled={idLoading || !studentId.trim()}>
                  {idLoading ? 'Searching records...' : 'Check Clearance Status'}
                </button>
              </form>

              {/* ACCESS DENIED ALERT BOX */}
              {idError && (
                <div className="card text-center animate-in overflow-hidden" style={{ border: '2px solid #ef4444', background: '#160b0c', borderRadius: '14px' }}>
                  <div style={{ background: 'rgba(239, 68, 68, 0.12)', padding: '32px 16px', borderBottom: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <span style={{ fontSize: '5rem', display: 'block', marginBottom: 12 }}>🚨</span>
                    <h2 className="text-red font-black tracking-widest text-2xl uppercase" style={{ color: '#ef4444' }}>ACCESS DENIED</h2>
                    <div className="font-mono text-sm mt-3 text-slate-400 bg-black/40 py-1.5 px-4 rounded-lg inline-block border border-white/5">
                      Lookup: {searchedId}
                    </div>
                  </div>
                  <div className="p-6 text-slate-300">
                    <p className="text-sm leading-relaxed">
                      No active, proctor-signed &apos;Approved&apos; clearance record exists for this calendar date. 
                    </p>
                    <div className="alert alert-error mt-4 text-xs text-left" style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                      <strong>System Message:</strong> {idError}
                    </div>
                  </div>
                </div>
              )}

              {/* ACCESS GRANTED GREEN CARD */}
              {idResult && idResult.valid && (
                <div className="card text-center animate-in overflow-hidden" style={{ border: idReleased ? '2px solid #3b82f6' : '2px solid #10b981', background: idReleased ? '#0b0f1a' : '#0b1612', borderRadius: '14px', boxShadow: '0 0 30px rgba(16, 185, 129, 0.15)' }}>
                  <div style={{ background: idReleased ? 'rgba(59,130,246,0.15)' : 'rgba(16, 185, 129, 0.15)', padding: '32px 16px', borderBottom: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <span style={{ fontSize: '5rem', display: 'block', marginBottom: 12 }}>{idReleased ? '🚪' : '❇️'}</span>
                    <h2 className="font-black tracking-widest text-2xl uppercase" style={{ color: idReleased ? '#60a5fa' : '#10b981', textShadow: '0 0 10px rgba(16, 185, 129, 0.3)' }}>
                      {idReleased ? 'EXIT PASS RELEASED' : 'ACCESS GRANTED'}
                    </h2>
                    <div className="font-mono text-sm mt-3 text-slate-300 bg-black/40 py-1.5 px-4 rounded-lg inline-block border border-white/5">
                      Student ID: {idResult.student.studentId}
                    </div>
                  </div>
                  
                  <div className="p-6 text-left text-sm text-slate-300 space-y-4">
                    {/* Student Badge */}
                    <StudentBadge student={idResult.student} />

                    {/* Exit Code Display */}
                    <div className="flex items-center justify-between bg-emerald-950/25 border border-emerald-500/30 rounded-xl p-4">
                      <div>
                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1">🚪 Student's Departure Exit Code</p>
                        <p className="text-[10px] text-slate-500">Cross-check this code with what the student presents</p>
                      </div>
                      <span className="font-mono font-black text-emerald-300 text-xl tracking-widest">
                        {idResult.departureId ?? idResult.verificationToken ?? '—'}
                      </span>
                    </div>

                    {/* Belongings Audit */}
                    {renderBelongings(idResult)}

                    <div className="text-xs text-slate-400 bg-black/20 p-4 rounded-lg space-y-2 border border-white/5">
                      <div className="flex justify-between">
                        <span>Audited By:</span>
                        <span className="font-bold text-slate-200">{idResult.approvedBy?.name || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Approved At:</span>
                        <span className="font-mono text-slate-200">{new Date(idResult.approvedAt).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    {/* Release Button */}
                    {!idReleased ? (
                      <button
                        className="btn btn-block btn-lg"
                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 800, borderRadius: '12px', padding: '14px', fontSize: '1rem', boxShadow: '0 4px 20px rgba(16,185,129,0.3)', border: 'none' }}
                        disabled={idReleasing}
                        onClick={() => handleRelease(idResult.id, 'id')}
                      >
                        {idReleasing ? '⏳ Processing...' : '✅ Verify Items & Release Exit Pass'}
                      </button>
                    ) : (
                      <div className="flex items-center justify-center gap-3 py-3 rounded-xl" style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)' }}>
                        <span style={{ fontSize: '1.5rem' }}>🚪</span>
                        <span className="font-black text-sm tracking-wider" style={{ color: '#60a5fa' }}>STUDENT RELEASED — EXIT LOGGED</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StudentBadge({ student }: { student: any }) {
  // Generate avatar initials from student name
  const initials = student?.name
    ? student.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 16px' }}>
      {/* Avatar Badge */}
      <div style={{
        width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #4f46e5, #2563eb)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.3rem', fontWeight: 900, color: '#fff',
        boxShadow: '0 4px 12px rgba(79,70,229,0.4)',
        border: '2px solid rgba(79,70,229,0.5)',
      }}>
        {initials}
      </div>
      <div>
        <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 2 }}>Resident Student</p>
        <p style={{ fontWeight: 900, fontSize: '1.1rem', color: '#f1f5f9', lineHeight: 1.2 }}>{student.name}</p>
        <p style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace', marginTop: 2 }}>
          {student.studentId} • Block {student.dormBlock?.number ?? 'N/A'} • Room {student.room?.roomNumber ?? 'N/A'}
        </p>
      </div>
    </div>
  );
}

function BelongingRow({ icon, label, count }: { icon: string; label: string; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.25)', borderRadius: 8, padding: '8px 12px' }}>
      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{icon} {label}</span>
      <span style={{ fontWeight: 900, fontSize: '1rem', color: count > 0 ? '#fbbf24' : '#475569', fontFamily: 'monospace' }}>{count}</span>
    </div>
  );
}
