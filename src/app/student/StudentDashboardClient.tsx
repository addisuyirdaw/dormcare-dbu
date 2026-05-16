'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const CATEGORY_CONFIG = {
  WATER:       { label: 'Water Leak',     icon: '💧', cls: 'emergency-water',       sub: 'Burst pipes, flooding, leaks' },
  ELECTRICAL:  { label: 'Electrical',     icon: '⚡', cls: 'emergency-electrical',  sub: 'Power failure, sparking outlets' },
  STRUCTURAL:  { label: 'Structural',     icon: '🏗️', cls: 'emergency-structural',  sub: 'Door locks, broken fixtures' },
};

const STATUS_BADGE: Record<string, string> = {
  OPEN:        'badge-red',
  IN_PROGRESS: 'badge-amber',
  RESOLVED:    'badge-green',
};

export default function StudentDashboardClient({ user, tickets, clearances, activeShift }: any) {
  const router = useRouter();
  const [view, setView] = useState<'home' | 'ticket' | 'clearance'>('home');
  const [ticketCategory, setTicketCategory] = useState<string | null>(null);
  const [ticketDesc, setTicketDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);
  const [clearanceSuccess, setClearanceSuccess] = useState<any>(null);
  const [error, setError] = useState('');
  const [myAssets, setMyAssets] = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);

  useEffect(() => {
    fetch('/api/inventory/my-assets')
      .then(r => r.json())
      .then(d => { if (d.items) setMyAssets(d.items); })
      .catch(() => {})
      .finally(() => setLoadingAssets(false));
  }, []);

  const CONDITION_BADGE: Record<string, { cls: string; label: string }> = {
    GOOD:    { cls: 'badge-green',  label: '✅ Good' },
    DAMAGED: { cls: 'badge-red',    label: '🔴 Damaged' },
    MISSING: { cls: 'badge-amber',  label: '⚠️ Missing' },
  };

  // ── Emergency Ticket Submit ──
  const handleTicketSubmit = async () => {
    if (!ticketCategory) return;
    setSubmitting(true); setError('');
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: ticketCategory, description: ticketDesc }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit ticket. Please try again.');
      }
      setTicketSuccess(true);
      setTimeout(() => { setTicketSuccess(false); setView('home'); router.refresh(); }, 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit ticket. Please try again.');
    }
    setSubmitting(false);
  };

  // ── Gate Clearance Submit ──
  const handleClearanceSubmit = async () => {
    setSubmitting(true); setError('');
    try {
      const res = await fetch('/api/clearance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        let msg = data.error || data.message || 'Failed to request clearance.';
        if (data.details && typeof data.details === 'string') msg += ` (${data.details})`;
        throw new Error(msg);
      }
      setClearanceSuccess(data);
    } catch (err: any) { 
      setError(err.message || 'Failed to request clearance.'); 
    }
    setSubmitting(false);
  };

  // ── HOME VIEW ──
  if (view === 'home') return (
    <div className="container section animate-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1>Welcome, {user?.name?.split(' ')[0]} 👋</h1>
          <div className="flex gap-2 items-center mt-2">
            <p className="text-sm text-sec">
              {user?.dormBlock ? `Block ${user.dormBlock.number}` : 'No block assigned'}
            </p>
            {user?.room && (
              <>
                <span className="text-muted">•</span>
                <p className="text-sm font-mono text-accent">Room {user.room.roomNumber}</p>
                {user.isKeyCustodian && (
                  <span className="badge badge-amber ml-2">🔑 Key Custodian</span>
                )}
              </>
            )}
          </div>
        </div>
        {activeShift ? (
          <div className="alert alert-success" style={{ padding: '10px 16px' }}>
            <span className="shift-indicator active" style={{ width: 10, height: 10 }} />
            <span><strong>{activeShift.staff?.name}</strong> is on duty now</span>
          </div>
        ) : (
          <div className="alert alert-warn" style={{ padding: '10px 16px' }}>
            ⚠️ No staff currently on duty for your block
          </div>
        )}
      </div>

      {/* Emergency Launcher */}
      <div className="card mb-6">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '1.1rem' }}>🚨</span>
            <h3>Emergency Ticket Launcher</h3>
          </div>
          <p className="text-sm text-sec mt-1">Select the type of emergency — routed instantly to on-duty staff</p>
        </div>
        <div className="card-p">
          <div className="grid-3">
            {Object.entries(CATEGORY_CONFIG).map(([cat, cfg]) => (
              <button
                key={cat}
                id={`emergency-${cat.toLowerCase()}`}
                className={`emergency-btn ${cfg.cls}`}
                onClick={() => { setTicketCategory(cat); setView('ticket'); setTicketDesc(''); setError(''); }}
              >
                <span className="icon">{cfg.icon}</span>
                <span className="label">{cfg.label}</span>
                <span className="sub">{cfg.sub}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Gate Clearance & Inventory Grid */}
      <div className="grid-3 gap-6 mb-6">
        
        {/* Official Room Inventory (NEW) */}
        <div className="card" style={{ gridColumn: 'span 1' }}>
          <div className="card-header">
            <h3>📋 Official Room Inventory</h3>
            <p className="text-xs text-sec mt-1">Registered by Proctor</p>
          </div>
          <div className="card-p">
            {user?.room?.assets?.length > 0 ? (
              <div className="flex flex-col gap-2 mb-4">
                {user.room.assets.map((asset: any) => (
                  <div key={asset.id} className="flex justify-between items-center text-sm bg-black/20 px-3 py-2 rounded">
                    <span className="font-bold">{asset.type}</span>
                    <span className="font-mono text-sec">Qty: {asset.quantity}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="alert alert-warn p-3 text-xs mb-4">
                No inventory registered yet.
              </div>
            )}
            <p className="text-[10px] text-muted leading-tight border-t border-white/10 pt-3">
              This inventory was verified and registered by your assigned Proctor. You and your roommates are held accountable for these items during final clearance.
            </p>
          </div>
        </div>

        {/* My Personal Assets (Granular) */}
        <div className="card" style={{ gridColumn: 'span 1' }}>
          <div className="card-header">
            <h3>🏷️ My Personal Assets</h3>
            <p className="text-xs text-sec mt-1">Items locked to your student ID</p>
          </div>
          <div className="card-p">
            {loadingAssets ? (
              <div className="text-sec text-sm animate-pulse">Loading your assigned items...</div>
            ) : myAssets.length === 0 ? (
              <div className="alert alert-warn p-3 text-xs">
                No personal assets assigned yet. Contact your Proctor.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {myAssets.map((item: any) => {
                  const badge = CONDITION_BADGE[item.condition] || { cls: 'badge-primary', label: item.condition };
                  return (
                    <div key={item.id} className="bg-black/30 border border-white/10 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-sm">{item.itemName}</span>
                        <span className={`badge ${badge.cls} text-[10px]`}>{badge.label}</span>
                      </div>
                      <div className="font-mono text-[11px] text-muted bg-black/40 px-2 py-1 rounded tracking-wider">
                        {item.assetTag}
                      </div>
                      <p className="text-[10px] text-muted mt-1">Look for this tag sticker on your physical item.</p>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-[10px] text-muted leading-tight border-t border-white/10 pt-3 mt-3">
              These items are physically tagged with the ID sticker shown above. You are personally accountable for them at checkout.
            </p>
          </div>
        </div>

        {/* Request Final Clearance */}
        <div className="card" style={{ gridColumn: 'span 1' }}>
          <div className="card-header">
            <h3>📦 Final Clearance</h3>
            <p className="text-sm text-sec mt-1">Request room audit for exit.</p>
          </div>
          <div className="card-p flex flex-col justify-between" style={{ height: 'calc(100% - 60px)' }}>
            <p className="text-sm text-sec mb-4">
              <strong>Note:</strong> Staff will verify the Official Room Inventory. If any asset is missing, clearance will be denied.
            </p>
            <button id="start-clearance-btn" className="btn btn-primary btn-block" onClick={() => { setView('clearance'); setClearanceSuccess(null); setError(''); }}>
              Request Room Audit
            </button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="card card-p" style={{ gridColumn: 'span 1' }}>
          <h3 className="mb-4">My Activity</h3>
          <div className="flex flex-col gap-4">
            <div className="stat-card" style={{ background: 'var(--bg-raised)' }}>
              <div className="stat-value text-red" style={{ fontSize: '1.5rem' }}>{tickets.filter((t: any) => t.status === 'OPEN').length}</div>
              <div className="stat-label">Open Tickets</div>
            </div>
            <div className="stat-card" style={{ background: 'var(--bg-raised)' }}>
              <div className="stat-value text-green" style={{ fontSize: '1.5rem' }}>{clearances.filter((c: any) => c.status === 'APPROVED').length}</div>
              <div className="stat-label">Approved Exits</div>
            </div>
          </div>
        </div>
      </div>

      {/* Clearances List */}
      {clearances.length > 0 && (
        <div className="card mb-6">
          <div className="card-header"><h3>🔑 My Clearances</h3></div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Type</th><th>Status</th><th>Token</th><th>Notes</th><th>Date</th></tr></thead>
              <tbody>
                {clearances.map((c: any) => (
                  <tr key={c.id}>
                    <td>Room Audit</td>
                    <td><span className={`badge ${c.status === 'APPROVED' ? 'badge-green' : c.status === 'PENDING' ? 'badge-amber' : 'badge-red'}`}>{c.status}</span></td>
                    <td className="font-mono text-green">{c.verificationToken || '—'}</td>
                    <td>{c.flaggedMissingAssets ? <span className="text-red">Missing: {c.flaggedMissingAssets}</span> : c.approvedBy?.name || '—'}</td>
                    <td className="text-xs text-muted">{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tickets List */}
      {tickets.length > 0 && (
        <div className="card">
          <div className="card-header"><h3>🎫 My Tickets</h3></div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Category</th><th>Description</th><th>Assigned To</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {tickets.map((t: any) => (
                  <tr key={t.id}>
                    <td>
                      <span className="flex items-center gap-2">
                        {CATEGORY_CONFIG[t.category as keyof typeof CATEGORY_CONFIG]?.icon} {t.category}
                      </span>
                    </td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description || '—'}</td>
                    <td>{t.assignedStaff?.name || <span className="text-muted">Unassigned</span>}</td>
                    <td><span className={`badge ${STATUS_BADGE[t.status]}`}>{t.status.replace('_', ' ')}</span></td>
                    <td className="text-xs text-muted">{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // ── TICKET FORM VIEW ──
  if (view === 'ticket') {
    const cfg = CATEGORY_CONFIG[ticketCategory as keyof typeof CATEGORY_CONFIG];
    return (
      <div className="container animate-in" style={{ maxWidth: 560, paddingTop: 40 }}>
        <button className="btn btn-ghost btn-sm mb-6" onClick={() => setView('home')}>← Back</button>
        {ticketSuccess ? (
          <div className="card card-p text-center animate-in">
            <div style={{ fontSize: '4rem', marginBottom: 16 }}>✅</div>
            <h2>Ticket Submitted!</h2>
            <p className="mt-2">Your emergency has been routed to the on-duty staff member.</p>
          </div>
        ) : (
          <div className="card card-p">
            <div className={`emergency-btn ${cfg.cls} mb-6`} style={{ minHeight: 80, flexDirection: 'row', justifyContent: 'flex-start', padding: '16px 20px' }}>
              <span style={{ fontSize: '2rem' }}>{cfg.icon}</span>
              <div>
                <div className="font-bold">{cfg.label}</div>
                <div className="text-sm" style={{ opacity: 0.75 }}>{cfg.sub}</div>
              </div>
            </div>
            <div className="form-group mb-4">
              <label className="form-label">Description (optional)</label>
              <textarea
                id="ticket-desc"
                className="form-input form-textarea"
                placeholder={`Describe the ${cfg.label.toLowerCase()} issue in more detail…`}
                value={ticketDesc}
                onChange={(e) => setTicketDesc(e.target.value)}
              />
            </div>
            {error && <div className="alert alert-error mb-4">{error}</div>}
            {!activeShift && (
              <div className="alert alert-warn mb-4">⚠️ No staff currently on duty — ticket will be queued.</div>
            )}
            <button id="submit-ticket-btn" className="btn btn-danger btn-block btn-lg" onClick={handleTicketSubmit} disabled={submitting}>
              {submitting ? <><span className="spinner" /> Sending…</> : '🚨 Submit Emergency Ticket'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── CLEARANCE FORM VIEW ──
  if (view === 'clearance') return (
    <div className="container animate-in" style={{ maxWidth: 500, paddingTop: 40 }}>
      <button className="btn btn-ghost btn-sm mb-6" onClick={() => setView('home')}>← Back</button>
      {clearanceSuccess ? (
        <div className="card card-p animate-in">
          <h2 className="mb-2">✅ Audit Requested</h2>
          <p className="text-sec mb-6">Staff have been notified to perform a baseline asset audit on Room {user?.room?.roomNumber}. Check back later for your digital exit token.</p>
          <div className="token-display" style={{ background: 'var(--bg-raised)', borderColor: 'var(--border)' }}>
            <p className="text-sm text-sec mb-2">Request ID</p>
            <div className="font-mono text-xl text-muted">{(clearanceSuccess.clearanceRecord?.id || clearanceSuccess.id || 'Pending').substring(0, 8).toUpperCase()}</div>
          </div>
          <button className="btn btn-ghost btn-block mt-6" onClick={() => setView('home')}>Back to Dashboard</button>
        </div>
      ) : (
        <div className="card card-p">
          <h2 className="mb-2">Confirm Audit Request</h2>
          <p className="text-sec text-sm mb-6">Staff will verify the university property assigned to Room {user?.room?.roomNumber} before granting you a gate exit token.</p>
          
          <div className="alert alert-info mb-6">
            Make sure all university-issued chairs, lockers, beds, tables, and room keys are present.
          </div>

          {error && <div className="alert alert-error mb-4">{error}</div>}
          <button id="submit-clearance-btn" className="btn btn-primary btn-block btn-lg" onClick={handleClearanceSubmit} disabled={submitting}>
            {submitting ? <><span className="spinner" /> Submitting…</> : '📤 Submit Request'}
          </button>
        </div>
      )}
    </div>
  );

  return null;
}
