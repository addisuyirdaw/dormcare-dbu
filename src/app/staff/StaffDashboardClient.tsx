'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Scanner from '@/components/Scanner';

const CATEGORY_ICONS: Record<string, string> = {
  WATER: '💧', ELECTRICAL: '⚡', STRUCTURAL: '🏗️',
};

const DEFAULT_ASSET_TYPES = ['CHAIR', 'LOCKER', 'TABLE', 'BED', 'KEY'];

export default function StaffDashboardClient({ user, activeShift, tickets, pendingClearances, resolvedToday, blocks = [] }: any) {
  const router = useRouter();
  const [view, setView] = useState<'home' | 'scan'>('home');
  const [checkingIn, setCheckingIn] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [updatingTicket, setUpdatingTicket] = useState<string | null>(null);
  
  // UI Toggles
  const [showTicketHistory, setShowTicketHistory] = useState(false);
  const [showClearanceHistory, setShowClearanceHistory] = useState(false);

  // Dynamic Collapsible Accordion States
  const [expandedBlockIds, setExpandedBlockIds] = useState<string[]>([]);
  const [expandedClearanceIds, setExpandedClearanceIds] = useState<string[]>([]);
  const [expandedTicketIds, setExpandedTicketIds] = useState<string[]>([]);

  const toggleBlockExpanded = (id: string) => {
    setExpandedBlockIds(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);
  };
  const toggleClearanceExpanded = (id: string) => {
    setExpandedClearanceIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };
  const toggleTicketExpanded = (id: string) => {
    setExpandedTicketIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  // Clearance Action Processing State
  const [processingClearanceId, setProcessingClearanceId] = useState<string | null>(null);

  const handleClearanceAction = async (id: string, action: 'APPROVED' | 'REJECTED' | 'RELEASED', rejectionReason?: string) => {
    setProcessingClearanceId(id);
    try {
      const res = await fetch('/api/clearance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id, 
          action, 
          rejectionReason: action === 'REJECTED' ? (rejectionReason || 'Rejected by proctor') : undefined
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Error: ${data.error || data.message || 'Failed to update clearance.'}`);
        return;
      }
      router.refresh();
    } catch (e: any) {
      alert(`Network error: ${e.message}`);
    } finally {
      setProcessingClearanceId(null);
    }
  };

  const onRejectClearance = async (id: string) => {
    const reason = prompt("Please enter the reason for rejection:");
    if (reason === null) return; // Cancelled
    if (!reason.trim()) {
      alert("A rejection reason is required.");
      return;
    }
    await handleClearanceAction(id, 'REJECTED', reason);
  };
  
  // Split Data
  const activeTickets = tickets.filter((t: any) => t.status === 'OPEN' || t.status === 'IN_PROGRESS');
  const resolvedTickets = tickets.filter((t: any) => t.status === 'RESOLVED' || t.status === 'REJECTED').slice(0, 5);
  
  const activeClearances = pendingClearances.filter((c: any) => c.status === 'PENDING' || c.status === 'PENDING_STAFF_SIGNATURE');
  const resolvedClearances = pendingClearances.filter((c: any) => c.status === 'APPROVED' || c.status === 'RELEASED' || c.status === 'REJECTED');

  // Notification Logic
  const [prevClearanceCount, setPrevClearanceCount] = useState(activeClearances.length);
  
  const playAlert = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
  };

  useEffect(() => {
    if (activeClearances.length > prevClearanceCount) {
      playAlert(); // Play sound if a new clearance request arrives
    }
    setPrevClearanceCount(activeClearances.length);
  }, [activeClearances.length, prevClearanceCount]);
  

  
  // Master Asset Registration State
  const [blockNum, setBlockNum] = useState<number>(1);
  const [roomNum, setRoomNum] = useState<number>(101);
  const [selectedRoomData, setSelectedRoomData] = useState<any | null>(null);
  const [loadingRoomData, setLoadingRoomData] = useState(false);
  const [roomError, setRoomError] = useState('');
  
  const [selectedCustodianId, setSelectedCustodianId] = useState<string>('');
  const [draftAssets, setDraftAssets] = useState<{ type: string, quantity: number }[]>([]);
  const [savingAssets, setSavingAssets] = useState(false);

  // ── Geofenced Check-in with Selfie Verification ──
  const handleCheckIn = async () => {
    setCheckingIn(true); setGeoError('');
    let selfieImage = '';

    // Step 1: Capture selfie from device camera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      // Give camera 800ms to warm up, then grab a frame
      await new Promise(r => setTimeout(r, 800));
      const canvas = document.createElement('canvas');
      canvas.width  = 320;
      canvas.height = 240;
      canvas.getContext('2d')!.drawImage(video, 0, 0, 320, 240);
      selfieImage = canvas.toDataURL('image/jpeg', 0.7);

      stream.getTracks().forEach(t => t.stop()); // release camera
    } catch {
      setGeoError('⚠️ Camera access is required for secure check-in. Please allow camera access and try again.');
      setCheckingIn(false);
      return;
    }

    // Step 2: Get GPS coordinates
    try {
      if (!navigator.geolocation) throw new Error('Geolocation not supported by browser.');
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
      });

      // Step 3: Send selfie + GPS to server together
      const res = await fetch('/api/shifts/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude:    pos.coords.latitude,
          longitude:   pos.coords.longitude,
          selfieImage,                        // base64 frame from camera
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Check-in failed');

      if (data.shift?.status === 'OUT_OF_BOUNDS') {
        setGeoError(`⚠️ Out of Bounds: You are ${data.distance}m from your assigned office (Max 50m). This has been logged with your selfie to the Admin Command Center.`);
      }

      router.refresh();
    } catch (err: any) { setGeoError(err.message || 'Location access denied or timed out. Please allow location access in your browser settings.'); }
    finally { setCheckingIn(false); }
  };


  const handleCheckOut = async () => {
    if (!confirm('Are you sure you want to end your shift?')) return;
    await fetch('/api/shifts/active', { method: 'DELETE' });
    router.refresh();
  };

  // ── Ticket Status Update ──
  const updateTicketStatus = async (id: string, status: string) => {
    setUpdatingTicket(id);
    await fetch('/api/tickets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    setUpdatingTicket(null);
    router.refresh();
  };



  // ── Master Asset Registration Logic ──
  const loadRoomData = async (bNum: number, rNum: number) => {
    setLoadingRoomData(true);
    setSelectedRoomData(null);
    setRoomError('');
    try {
      const roomString = `${bNum}-${rNum}`;
      const res = await fetch(`/api/rooms/${roomString}`);
      const data = await res.json();
      
      if (!res.ok) {
        // Room does not exist yet - Initialize Dynamic Creation
        setSelectedRoomData({ roomNumber: roomString, isNew: true, occupants: [] });
        setSelectedCustodianId('');
        setDraftAssets(DEFAULT_ASSET_TYPES.map(t => ({ type: t, quantity: 0 })));
      } else {
        // Room exists - Load Data
        setSelectedRoomData(data);
        setSelectedCustodianId(data.keyCustodian?.id || '');
        
        const initialAssets = data.assets?.length > 0 
          ? data.assets.map((a: any) => ({ type: a.type, quantity: a.quantity }))
          : DEFAULT_ASSET_TYPES.map(t => ({ type: t, quantity: 0 }));
        
        setDraftAssets(initialAssets);
      }
    } catch (err: any) {
      setRoomError('Network error connecting to database.');
    } finally {
      setLoadingRoomData(false);
    }
  };

  const changeBlock = (delta: number) => {
    const newB = Math.max(1, blockNum + delta);
    setBlockNum(newB);
    loadRoomData(newB, roomNum);
  };

  const changeRoom = (delta: number) => {
    const newR = Math.max(1, roomNum + delta);
    setRoomNum(newR);
    loadRoomData(blockNum, newR);
  };

  const updateAssetCount = (index: number, change: number) => {
    const newDrafts = [...draftAssets];
    const newCount = newDrafts[index].quantity + change;
    if (newCount >= 0) {
      newDrafts[index].quantity = newCount;
      setDraftAssets(newDrafts);
    }
  };

  const updateAssetType = (index: number, value: string) => {
    const newDrafts = [...draftAssets];
    newDrafts[index].type = value;
    setDraftAssets(newDrafts);
  };

  const addCustomAsset = () => {
    setDraftAssets([...draftAssets, { type: 'CUSTOM_ITEM', quantity: 1 }]);
  };

  const removeAsset = (index: number) => {
    setDraftAssets(draftAssets.filter((_, i) => i !== index));
  };

  const saveRoomRegistry = async () => {
    if (!selectedRoomData) return;
    setSavingAssets(true);
    try {
      const validAssets = draftAssets.filter(a => a.type.trim() !== '' && a.quantity > 0);
      const res = await fetch(`/api/rooms/${selectedRoomData.roomNumber}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets: validAssets, keyCustodianId: selectedCustodianId }),
      });
      
      if (!res.ok) throw new Error('Failed to save');
      const updated = await res.json();
      setSelectedRoomData(updated);
      
      // Auto-advance to the next room!
      changeRoom(1);
    } catch (err) {
      alert("Error saving room registry.");
      setSavingAssets(false);
    }
  };

  if (view === 'scan') return (
    <div className="container animate-in" style={{ maxWidth: 600, paddingTop: 40 }}>
      <button className="btn btn-ghost btn-sm mb-6" onClick={() => setView('home')}>← Back to Dashboard</button>
      <div className="card card-p">
        <h2 className="mb-2">Attendance Scanner</h2>
        <p className="text-sec text-sm mb-6">Scan student IDs or enter code manually for Blocks {user.managedBlocks?.map((b:any)=>b.number).join(', ')}</p>
        <Scanner onScanSuccess={() => {}} />
      </div>
    </div>
  );

  return (
    <div className="container section animate-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>Teregna Command Panel</h1>
          <div className="flex gap-2 items-center mt-1">
            <span className="badge badge-amber">Multi-Block Shift</span>
            <p className="text-sec text-sm">Managing Blocks: {user.managedBlocks?.map((b:any)=>b.name).join(', ')}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button id="scan-attendance-btn" className="btn btn-ghost" onClick={() => setView('scan')} disabled={!activeShift}>
            📷 Scan Attendance
          </button>
        </div>
      </div>

      <div className="grid-3 gap-6 mb-8">
        {/* Shift Control Panel */}
        <div className="card card-p flex-col justify-between" style={{ gridColumn: 'span 1' }}>
          <div>
            <h3 className="mb-4">Shift Status</h3>
            <div className={`shift-banner ${activeShift ? 'on-duty' : 'off-duty'} mb-6`}>
              <div className="flex items-center gap-3 mb-2">
                <span className={`shift-indicator ${activeShift ? 'active' : 'inactive'}`} />
                <span className="font-bold" style={{ fontSize: '1.2rem', color: activeShift ? 'var(--green)' : 'var(--red)' }}>
                  {activeShift ? 'ON DUTY' : 'OFF DUTY'}
                </span>
              </div>
              <p className="text-xs" style={{ opacity: 0.8 }}>
                {activeShift ? `Coverage active for ${user.managedBlocks?.length} blocks` : 'You are currently inactive'}
              </p>
            </div>
            {geoError && <div className="alert alert-error mb-4" style={{ fontSize: '0.8rem' }}>{geoError}</div>}
          </div>
          
          {activeShift ? (
            <button id="checkout-btn" className="btn btn-danger btn-block" onClick={handleCheckOut}>End Shift</button>
          ) : (
            <button id="checkin-btn" className="btn btn-primary btn-block btn-lg" onClick={handleCheckIn} disabled={checkingIn}>
              {checkingIn ? <><span className="spinner" /> Verifying Location…</> : '📍 Start Multi-Block Shift'}
            </button>
          )}
        </div>

        {/* Quick Launch Cards */}
        <div className="grid-2 gap-6" style={{ gridColumn: 'span 2' }}>

          {/* Asset Registration Portal */}
          <div className="card card-p flex-col justify-center items-center text-center" style={{ background: 'var(--bg-raised)' }}>
            <span style={{ fontSize: '3rem', marginBottom: '10px' }}>🏢</span>
            <h3 className="mb-2">Campus-Wide Dormitory Asset Registration</h3>
            <p className="text-sec text-sm mb-6 max-w-md">
              Access the dedicated portal to dynamically register baselines, map blocks, and assign property inventory from scratch.
            </p>
            <button 
              className="btn btn-primary btn-lg" 
              onClick={() => router.push('/staff/registration')}
            >
              Launch Registration Portal →
            </button>
          </div>

          {/* Asset Inspector / QR Scanner */}
          <div className="card card-p flex-col justify-center items-center text-center" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(16,185,129,0.08) 100%)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <span style={{ fontSize: '3rem', marginBottom: '10px' }}>📷</span>
            <h3 className="mb-2">Asset Inspector & Audit Scanner</h3>
            <p className="text-sec text-sm mb-6 max-w-md">
              Scan asset QR tags to verify, flag damaged or missing items, and lock student gate clearance in real time.
            </p>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button 
                className="btn btn-lg w-full" 
                style={{ background: 'var(--green)', color: '#000', fontWeight: 'bold' }}
                onClick={() => router.push('/staff/scanner')}
              >
                🔍 Launch Asset Scanner →
              </button>
              <button
                className="btn btn-ghost btn-sm border border-white/10 w-full"
                onClick={() => router.push('/staff/print-tags')}
              >
                🖨️ Print Asset Tags
              </button>
            </div>
          </div>

        </div>
      </div>


      {/* ── AI Block Satisfaction Leaderboard ── */}
      {blocks.some((b: any) => b.health) && (
        <section className="mb-8 mt-8">
          <div className="mb-4">
            <h2 className="text-lg font-bold">🤖 AI Block Satisfaction Intelligence</h2>
            <p className="text-sec text-sm mt-1">Campus-wide student–staff interaction analysis · sorted most critical first</p>
          </div>

          {/* Tier Summary */}
          {(() => {
            const critical = blocks.filter((b: any) => b.health?.tier === 'CRITICAL');
            const medium   = blocks.filter((b: any) => b.health?.tier === 'MEDIUM');
            const good     = blocks.filter((b: any) => b.health?.tier === 'GOOD');
            return (
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <div className="rounded-xl border border-red-500/40 bg-red-950/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🔴</span>
                    <span className="font-bold text-red-300 text-sm uppercase tracking-wider">Critical ({critical.length})</span>
                  </div>
                  {critical.length === 0 ? <p className="text-xs text-red-400/70">None ✓</p>
                    : critical.map((b: any) => (
                      <div key={b.id} className="flex justify-between text-sm py-1 border-b border-red-900/40 last:border-0">
                        <span className="font-bold text-white">Block {b.number} · {b.name}</span>
                        <span className="font-mono text-red-300 text-xs">{b.health.score}/100</span>
                      </div>
                    ))}
                </div>
                <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🟡</span>
                    <span className="font-bold text-amber-300 text-sm uppercase tracking-wider">Medium ({medium.length})</span>
                  </div>
                  {medium.length === 0 ? <p className="text-xs text-amber-400/70">None ✓</p>
                    : medium.map((b: any) => (
                      <div key={b.id} className="flex justify-between text-sm py-1 border-b border-amber-900/40 last:border-0">
                        <span className="font-bold text-white">Block {b.number} · {b.name}</span>
                        <span className="font-mono text-amber-300 text-xs">{b.health.score}/100</span>
                      </div>
                    ))}
                </div>
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🟢</span>
                    <span className="font-bold text-emerald-300 text-sm uppercase tracking-wider">Good ({good.length})</span>
                  </div>
                  {good.length === 0 ? <p className="text-xs text-emerald-400/70">None yet</p>
                    : good.map((b: any) => (
                      <div key={b.id} className="flex justify-between text-sm py-1 border-b border-emerald-900/40 last:border-0">
                        <span className="font-bold text-white">Block {b.number} · {b.name}</span>
                        <span className="font-mono text-emerald-300 text-xs">{b.health.score}/100</span>
                      </div>
                    ))}
                </div>
              </div>
            );
          })()}

          {/* Detailed block rows */}
          <div className="flex flex-col gap-3">
            {[...blocks]
              .filter((b: any) => b.health)
              .sort((a: any, b: any) => a.health.score - b.health.score)
              .map((b: any) => {
                const h = b.health;
                const borderClass = h.tier === 'CRITICAL' ? 'border-red-500/30' : h.tier === 'MEDIUM' ? 'border-amber-500/30' : 'border-emerald-500/30';
                const bgClass = h.tier === 'CRITICAL' ? 'bg-red-950/10' : h.tier === 'MEDIUM' ? 'bg-amber-950/10' : 'bg-emerald-950/10';
                const isExpanded = expandedBlockIds.includes(b.id);
                return (
                  <div key={b.id} className={`rounded-xl border ${borderClass} ${bgClass} overflow-hidden transition-all duration-200`}>
                    {/* Collapsible Header Row */}
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-white/5 transition-all"
                      onClick={() => toggleBlockExpanded(b.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{h.tier === 'CRITICAL' ? '🔴' : h.tier === 'MEDIUM' ? '🟡' : '🟢'}</span>
                        <span className="font-bold text-sm text-slate-200">Block {b.number} · {b.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{
                          background: h.tier === 'CRITICAL' ? 'rgba(239,68,68,0.2)' : h.tier === 'MEDIUM' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)',
                          color: h.tier === 'CRITICAL' ? '#f87171' : h.tier === 'MEDIUM' ? '#fbbf24' : '#34d399'
                        }}>
                          {h.tier}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-xs text-slate-300">
                          Satisfaction: <span className="font-black font-mono text-sm" style={{ color: h.tier === 'CRITICAL' ? '#ef4444' : h.tier === 'MEDIUM' ? '#f59e0b' : '#10b981' }}>{h.score}/100</span>
                        </span>
                        <span className="text-sec font-mono text-xs">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      </div>
                    </div>

                    {/* Collapsible Details Content */}
                    {isExpanded && (
                      <div className="border-t border-white/5 p-4 bg-black/20 text-xs text-sec space-y-4 animate-in">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Satisfaction score bar</p>
                            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden mb-1">
                              <div className="h-full rounded-full" style={{ width: `${h.score}%`, background: h.tier === 'CRITICAL' ? '#ef4444' : h.tier === 'MEDIUM' ? '#f59e0b' : '#10b981' }} />
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">AI Verdict</p>
                            <p className="text-slate-300">{h.aiVerdict}</p>
                          </div>
                        </div>
                        <div className="rounded-lg bg-black/30 border border-white/10 p-3">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">📋 Suggested Action</p>
                          <p className="text-slate-200">{h.controlSuggestion}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </section>
      )}


      <div className="grid-2 gap-6">
        {/* Emergency Tickets Queue */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3>🚨 Emergency Queue <span className="text-xs font-normal text-muted ml-2">({user.managedBlocks?.length} Blocks)</span></h3>
            <span className="badge badge-red">{activeTickets.length}</span>
          </div>
          <div className="card-p">
            {activeTickets.length === 0 ? (
              <p className="text-sec text-sm text-center py-8">No active emergencies across your managed blocks.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {activeTickets.map((t: any) => {
                  const isExpanded = expandedTicketIds.includes(t.id);
                  return (
                    <div 
                      key={t.id} 
                      className="rounded-xl border overflow-hidden transition-all duration-200" 
                      style={{ borderColor: 'var(--border)', background: 'var(--bg-raised)' }}
                    >
                      {/* Sleek Header Baseline */}
                      <div 
                        className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-white/5 transition-all"
                        onClick={() => toggleTicketExpanded(t.id)}
                      >
                        <div className="flex items-center gap-2.5">
                          <span style={{ fontSize: '1.1rem' }}>{CATEGORY_ICONS[t.category]}</span>
                          <span className="font-bold text-sm text-slate-200">{t.category}</span>
                          <span className={`badge ${t.status === 'OPEN' ? 'badge-red' : 'badge-amber'}`} style={{ fontSize: '0.55rem' }}>
                            {t.status.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-muted">• Block {t.dormBlock.name}</span>
                        </div>
                        <span className="text-sec font-mono text-xs">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      </div>

                      {/* Isolated Dropdown Content */}
                      {isExpanded && (
                        <div className="border-t border-white/5 p-4 bg-black/20 text-xs text-sec space-y-4 animate-in">
                          <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Student & Room Details</p>
                            <div className="p-3 rounded bg-white/5 border border-white/5 space-y-1 mb-3 text-slate-300">
                              <p>Student Name: <span className="font-bold text-slate-100">{t.student.name}</span></p>
                              <p>Student ID: <span className="font-mono text-slate-100">{t.student.studentId}</span></p>
                              <p>Dormitory Room: <span className="font-mono text-slate-100">Room {t.student.room?.roomNumber}</span></p>
                            </div>
                            
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Issue Description</p>
                            <p className="text-sm text-slate-200 leading-relaxed bg-white/5 p-3 rounded-lg border border-white/5">
                              {t.description || 'No description provided'}
                            </p>
                          </div>
                          
                          <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                            <span className="font-mono text-[10px] text-muted">Submitted: {new Date(t.createdAt).toLocaleTimeString()}</span>
                            <div className="flex gap-2">
                              {t.status === 'OPEN' && (
                                <button 
                                  className="btn btn-sm btn-ghost" style={{ color: 'var(--amber)', border: '1px solid rgba(245, 158, 11, 0.2)' }}
                                  onClick={() => updateTicketStatus(t.id, 'IN_PROGRESS')} disabled={updatingTicket === t.id}
                                >Mark In Progress</button>
                              )}
                              <button 
                                className="btn btn-sm btn-success" style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid var(--green)', color: 'var(--green)' }}
                                onClick={() => { if(confirm('Approve and resolve this emergency ticket?')) updateTicketStatus(t.id, 'RESOLVED'); }} 
                                disabled={updatingTicket === t.id}
                              >
                                Approve & Resolve
                              </button>
                              <button 
                                className="btn btn-sm btn-danger" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--red)', color: 'var(--red)' }}
                                onClick={() => { if(confirm('Reject and cancel this emergency ticket?')) updateTicketStatus(t.id, 'REJECTED'); }} 
                                disabled={updatingTicket === t.id}
                              >
                                Reject & Dismiss
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Resolved Tickets History */}
            {resolvedTickets.length > 0 && (
              <div className="mt-8 border-t border-white/10 pt-4">
                <button 
                  className="flex justify-between items-center w-full text-left hover:text-white transition-colors"
                  onClick={() => setShowTicketHistory(!showTicketHistory)}
                >
                  <span className="text-xs text-sec uppercase tracking-wider font-bold">Recently Resolved ({resolvedTickets.length})</span>
                  <span className="text-sec text-xs">{showTicketHistory ? '▼' : '▶'}</span>
                </button>
                
                {showTicketHistory && (
                  <div className="flex flex-col gap-2 mt-4">
                    {resolvedTickets.map((t: any) => (
                      <div key={t.id} className="flex justify-between items-center text-sm p-3 rounded" style={{ background: 'var(--bg-raised)', opacity: 0.7 }}>
                        <div className="flex items-center gap-2">
                          {t.status === 'RESOLVED' ? (
                            <span className="text-green-500 font-bold">✓</span>
                          ) : (
                            <span className="text-red-500 font-bold">✗</span>
                          )}
                          <span className="font-bold">{t.category}</span>
                          <span className="text-xs text-sec">• Room {t.student.room?.roomNumber}</span>
                          <span className="text-[10px] text-muted font-bold uppercase">({t.status})</span>
                        </div>
                        <span className="text-xs text-muted">{new Date(t.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Streamlined Universal Clearance Queue */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="flex items-center gap-2">
              📦 Final Clearances
              {activeClearances.length > 0 && (
                <span className="flex h-3 w-3 relative ml-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
              )}
            </h3>
            <span className="badge badge-amber">{activeClearances.length}</span>
          </div>
          <div className="card-p">
            {activeClearances.length === 0 ? (
              <p className="text-sec text-sm text-center py-8">No pending clearances.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {activeClearances.map((c: any) => {
                  const isExpanded = expandedClearanceIds.includes(c.id);
                  return (
                    <div 
                      key={c.id} 
                      className="rounded-xl border overflow-hidden transition-all duration-200" 
                      style={{ borderColor: 'var(--border)', background: 'var(--bg-raised)' }}
                    >
                      {/* Streamlined Accordion Header Row */}
                      <div 
                        className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-white/5 transition-all"
                        onClick={() => toggleClearanceExpanded(c.id)}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-sm text-slate-200">{c.student.name}</span>
                          <span className="text-xs text-blue-400 font-mono bg-blue-900/20 px-2 py-0.5 rounded border border-blue-500/20">
                            {c.student.studentId}
                          </span>
                          <span className="text-xs text-muted font-mono">
                            {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <span className="text-sec font-mono text-xs ml-2 flex-shrink-0">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      </div>

                      {/* Streamlined Dropdown Content */}
                      {isExpanded && (() => {
                        let items: any = null;
                        try { items = c.personalItems ? JSON.parse(c.personalItems) : null; } catch {}
                        const isProcessing = processingClearanceId === c.id;
                        
                        const clothesVal = c.clothesCount !== null && c.clothesCount !== undefined ? c.clothesCount : (items?.clothes ?? 0);
                        const trousersVal = c.trousersCount !== null && c.trousersCount !== undefined ? c.trousersCount : (items?.trousers ?? 0);
                        const sweatersVal = c.sweatersCount !== null && c.sweatersCount !== undefined ? c.sweatersCount : (items?.sweaters ?? items?.jackets ?? 0);

                        return (
                          <div className="border-t border-white/5 p-4 bg-black/20 text-xs text-sec space-y-4 animate-in">
                            <div className="p-3 rounded border border-amber-500/25 bg-amber-950/20">
                              <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">🎒 Declared Belongings</p>
                              <div className="flex flex-col gap-1 text-xs text-slate-300">
                                <div className="flex justify-between"><span>Clothes:</span><span className="font-bold text-slate-100">{clothesVal}</span></div>
                                <div className="flex justify-between"><span>Trousers:</span><span className="font-bold text-slate-100">{trousersVal}</span></div>
                                <div className="flex justify-between"><span>Sweaters:</span><span className="font-bold text-slate-100">{sweatersVal}</span></div>
                                {items?.otherItems?.map((item: any, i: number) => (
                                  <div key={i} className="flex justify-between"><span>{item.name}:</span><span className="font-bold text-blue-300">{item.count}</span></div>
                                ))}
                              </div>
                            </div>

                            {/* Direct Approval Actions (Always clickable immediately) */}
                            <div className="flex gap-2 pt-1">
                              <button
                                className="flex-1 btn btn-sm"
                                style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid var(--green)', color: 'var(--green)', fontWeight: 700 }}
                                disabled={isProcessing}
                                onClick={() => { if (confirm(`Approve clearance for ${c.student.name}?`)) handleClearanceAction(c.id, 'APPROVED'); }}
                              >
                                {isProcessing ? '…' : '✓ Approve Clearance'}
                              </button>
                              <button
                                className="flex-1 btn btn-sm"
                                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--red)', color: 'var(--red)', fontWeight: 700 }}
                                disabled={isProcessing}
                                onClick={() => onRejectClearance(c.id)}
                              >
                                {isProcessing ? '…' : '✗ Reject Request'}
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Collapsible Past Clearance History Accordion Panel */}
            {resolvedClearances.length > 0 && (
              <div className="mt-8 border-t border-white/10 pt-4">
                <button 
                  className="flex justify-between items-center w-full text-left hover:text-white transition-colors"
                  onClick={() => setShowClearanceHistory(!showClearanceHistory)}
                >
                  <span className="text-xs text-sec uppercase tracking-wider font-bold">📋 Past Clearance History ({resolvedClearances.length})</span>
                  <span className="text-sec text-xs">{showClearanceHistory ? '▼' : '▶'}</span>
                </button>
                
                {showClearanceHistory && (
                  <div className="flex flex-col gap-2 mt-4">
                    {resolvedClearances.map((c: any) => (
                      <div key={c.id} className="flex flex-col gap-2 p-3 rounded" style={{ background: 'var(--bg-raised)', opacity: 0.85 }}>
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-200">{c.student.name}</span>
                            <span className="text-xs text-slate-400">
                              Room {c.student.room?.roomNumber || 'N/A'} • {new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <span className={`badge ${
                            c.status === 'APPROVED' ? 'badge-green' :
                            c.status === 'RELEASED' ? 'badge-blue' :
                            c.status === 'REJECTED' ? 'badge-red' : 'badge-muted'
                          }`} style={{ fontSize: '0.65rem' }}>
                            {c.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {c.status === 'APPROVED' && c.departureId && (
                          <div className="flex items-center justify-between bg-emerald-950/20 border border-emerald-500/20 rounded p-2 mt-1">
                            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">🚪 Exit Code Generated</span>
                            <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-500/30">
                              {c.departureId}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
