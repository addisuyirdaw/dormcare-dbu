'use client';
import { useState } from 'react';

export default function GatePage() {
  const [activeTab, setActiveTab] = useState<'token' | 'student-id'>('token');
  
  // Token verification states
  const [token, setToken] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenResult, setTokenResult] = useState<any>(null);
  const [tokenError, setTokenError] = useState('');

  // Student ID verification states
  const [studentId, setStudentId] = useState('');
  const [idLoading, setIdLoading] = useState(false);
  const [idResult, setIdResult] = useState<any>(null);
  const [idError, setIdError] = useState('');
  const [searchedId, setSearchedId] = useState('');

  const handleVerifyToken = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token.trim()) return;
    
    setTokenLoading(true); 
    setTokenError(''); 
    setTokenResult(null);
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
        <div className="card card-p" style={{ width: '100%', maxWidth: 550, background: '#0e111a', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', borderRadius: '16px' }}>
          
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
                setTokenError('');
                setTokenResult(null);
                setIdError('');
                setIdResult(null);
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
                setTokenError('');
                setTokenResult(null);
                setIdError('');
                setIdResult(null);
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
                <div className="card text-center animate-in overflow-hidden" style={{ border: '2px solid var(--green)', background: '#0b1311', borderRadius: '14px' }}>
                  <div style={{ background: 'rgba(16, 185, 129, 0.12)', padding: '24px 16px', borderBottom: '1px solid rgba(16,185,129,0.2)' }}>
                    <span style={{ fontSize: '4.5rem', display: 'block', marginBottom: 8 }}>✅</span>
                    <h2 className="text-green font-black tracking-wider text-xl uppercase">DEPARTURE APPROVED</h2>
                    {/* Show the exact exit code the student presented */}
                    <div className="font-mono text-2xl mt-3 font-black tracking-widest text-emerald-300 bg-black/50 py-2 px-5 rounded-xl inline-block border border-emerald-500/40">
                      {tokenResult.departureId ?? token}
                    </div>
                  </div>
                  
                  <div className="p-6 text-left text-sm text-slate-300 space-y-4">
                    <div className="pb-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                      <p className="text-xs text-sec uppercase font-bold tracking-wider mb-1">Resident Student</p>
                      <p className="font-black text-lg text-slate-100">{tokenResult.student.name}</p>
                      <p className="font-mono text-muted">{tokenResult.student.studentId} • Block {tokenResult.student.dormBlock?.number}</p>
                    </div>

                    <div>
                      <div className="alert alert-success" style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16,185,129,0.1)' }}>
                        <p className="text-sm font-bold text-slate-200">Room Assets Verified</p>
                        <p className="text-xs mt-1 text-slate-300">Staff audited Room {tokenResult.student.room?.roomNumber} and confirmed no missing property.</p>
                      </div>
                    </div>

                    <div className="text-xs text-slate-400 bg-black/20 p-3 rounded-lg space-y-1">
                      <p>Approved By: <span className="font-bold text-slate-300">{tokenResult.approvedBy?.name}</span></p>
                      <p>Timestamp: <span className="font-mono text-slate-300">{new Date(tokenResult.approvedAt).toLocaleString()}</span></p>
                    </div>
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
                      No active, proctor-signed **'Approved'** clearance record exists for this calendar date. 
                    </p>
                    <div className="alert alert-error mt-4 text-xs text-left" style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                      <strong>System Message:</strong> {idError}
                    </div>
                  </div>
                </div>
              )}

              {/* ACCESS GRANTED GREEN CARD */}
              {idResult && idResult.valid && (
                <div className="card text-center animate-in overflow-hidden" style={{ border: '2px solid #10b981', background: '#0b1612', borderRadius: '14px', boxShadow: '0 0 30px rgba(16, 185, 129, 0.15)' }}>
                  <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '32px 16px', borderBottom: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <span style={{ fontSize: '5rem', display: 'block', marginBottom: 12 }}>❇️</span>
                    <h2 className="text-green font-black tracking-widest text-2xl uppercase" style={{ color: '#10b981', textShadow: '0 0 10px rgba(16, 185, 129, 0.3)' }}>ACCESS GRANTED</h2>
                    <div className="font-mono text-sm mt-3 text-slate-300 bg-black/40 py-1.5 px-4 rounded-lg inline-block border border-white/5">
                      Student ID: {idResult.student.studentId}
                    </div>
                  </div>
                  
                  <div className="p-6 text-left text-sm text-slate-300 space-y-4">
                    <div className="pb-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Resident Student</p>
                      <p className="font-black text-lg text-slate-100">{idResult.student.name}</p>
                      <p className="font-mono text-muted">Block {idResult.student.dormBlock?.number || 'N/A'} • Room {idResult.student.room?.roomNumber || 'N/A'}</p>
                    </div>

                    {/* Exit Code — must match the code student shows at gate */}
                    <div className="flex items-center justify-between bg-emerald-950/25 border border-emerald-500/30 rounded-xl p-4">
                      <div>
                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1">🚪 Student's Departure Exit Code</p>
                        <p className="text-[10px] text-slate-500">Cross-check this code with what the student presents</p>
                      </div>
                      <span className="font-mono font-black text-emerald-300 text-xl tracking-widest">
                        {idResult.departureId ?? idResult.verificationToken ?? '—'}
                      </span>
                    </div>
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
