'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Scanner from '@/components/Scanner';

const CATEGORY_ICONS: Record<string, string> = {
  WATER: '💧', ELECTRICAL: '⚡', STRUCTURAL: '🏗️',
};

const DEFAULT_ASSET_TYPES = ['CHAIR', 'LOCKER', 'TABLE', 'BED', 'KEY'];

export default function StaffDashboardClient({ user, activeShift, tickets, pendingClearances, resolvedToday }: any) {
  const router = useRouter();
  const [view, setView] = useState<'home' | 'scan'>('home');
  const [checkingIn, setCheckingIn] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [updatingTicket, setUpdatingTicket] = useState<string | null>(null);
  
  // Clearance Audit Modal State
  const [auditModal, setAuditModal] = useState<any | null>(null);
  const [roomAssets, setRoomAssets] = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [flaggedAsset, setFlaggedAsset] = useState<string>('');
  
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

  // ── Room Baseline Audit (Clearance) ──
  const openAuditModal = async (clearance: any) => {
    setAuditModal(clearance);
    setLoadingAssets(true);
    setFlaggedAsset('');
    try {
      const res = await fetch(`/api/rooms/${clearance.student.room.roomNumber}`);
      if (res.ok) {
        const data = await res.json();
        setRoomAssets(data.assets);
      }
    } catch (e) {
      console.error("Failed to load room assets");
    } finally {
      setLoadingAssets(false);
    }
  };

  const submitAudit = async (action: 'APPROVED' | 'REJECTED') => {
    if (action === 'REJECTED' && !flaggedAsset) {
      alert("Please specify which asset is missing to reject the clearance.");
      return;
    }
    await fetch('/api/clearance', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        id: auditModal.id, 
        action, 
        rejectionReason: action === 'REJECTED' ? 'Missing room assets detected during baseline audit.' : undefined,
        missingAssetsStr: action === 'REJECTED' ? flaggedAsset : undefined 
      }),
    });
    setAuditModal(null);
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

        {/* Asset Registration Portal */}
        <div className="card card-p flex-col justify-center items-center text-center" style={{ gridColumn: 'span 2', background: 'var(--bg-raised)' }}>
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
      </div>

      <div className="grid-2 gap-6">
        {/* Emergency Tickets Queue */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3>🚨 Emergency Queue <span className="text-xs font-normal text-muted ml-2">({user.managedBlocks?.length} Blocks)</span></h3>
            <span className="badge badge-red">{tickets.length}</span>
          </div>
          <div className="card-p">
            {!activeShift && tickets.length > 0 && (
              <div className="alert alert-warn mb-4">You must start your shift to resolve tickets.</div>
            )}
            {tickets.length === 0 ? (
              <p className="text-sec text-sm text-center py-8">No active emergencies across your managed blocks.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {tickets.map((t: any) => (
                  <div key={t.id} className="card" style={{ padding: '12px 16px', background: 'var(--bg-raised)' }}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: '1.2rem' }}>{CATEGORY_ICONS[t.category]}</span>
                        <span className="font-bold text-sm">{t.category}</span>
                        <span className={`badge ${t.status === 'OPEN' ? 'badge-red' : 'badge-amber'}`} style={{ fontSize: '0.6rem' }}>{t.status.replace('_', ' ')}</span>
                      </div>
                      <span className="text-xs font-bold text-accent">Block {t.dormBlock.name}</span>
                    </div>
                    <p className="text-sm text-sec mb-3">{t.description || 'No description provided'}</p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                      <span className="text-xs font-mono text-muted">Room {t.student.room?.roomNumber} • {t.student.name.split(' ')[0]}</span>
                      <div className="flex gap-2">
                        {t.status === 'OPEN' && (
                          <button 
                            className="btn btn-sm btn-ghost" style={{ color: 'var(--amber)' }}
                            onClick={() => updateTicketStatus(t.id, 'IN_PROGRESS')} disabled={!activeShift || updatingTicket === t.id}
                          >Mark In Progress</button>
                        )}
                        <button 
                          className="btn btn-sm btn-ghost" style={{ color: 'var(--green)' }}
                          onClick={() => updateTicketStatus(t.id, 'RESOLVED')} disabled={!activeShift || updatingTicket === t.id}
                        >Resolve</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pending Gate Clearances */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3>📦 Final Clearances</h3>
            <span className="badge badge-amber">{pendingClearances.length}</span>
          </div>
          <div className="card-p">
            {!activeShift && pendingClearances.length > 0 && (
              <div className="alert alert-warn mb-4">You must start your shift to perform room audits.</div>
            )}
            {pendingClearances.length === 0 ? (
              <p className="text-sec text-sm text-center py-8">No pending clearances.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {pendingClearances.map((c: any) => (
                  <div key={c.id} className="card" style={{ padding: '16px', background: 'var(--bg-raised)' }}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-bold text-sm">{c.student.name}</div>
                        <div className="text-xs font-mono text-muted mt-1">Room {c.student.room?.roomNumber}</div>
                      </div>
                      <span className="text-xs text-muted">{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <button 
                      className="btn btn-sm btn-primary btn-block mt-2" 
                      onClick={() => openAuditModal(c)}
                      disabled={!activeShift}
                    >
                      Perform Baseline Audit
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Audit Modal (for clearances) */}
      {auditModal && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
          <div className="card card-p w-full max-w-md animate-in" style={{ border: '1px solid var(--border)' }}>
            <h2 className="mb-1">Room Baseline Audit</h2>
            <p className="text-sec text-sm mb-6">Room {auditModal.student.room?.roomNumber} • {auditModal.student.name}</p>
            
            {loadingAssets ? (
              <p className="text-center py-8 text-sec"><span className="spinner"></span> Loading Room Data...</p>
            ) : (
              <>
                <div className="mb-6 p-4 rounded" style={{ background: 'var(--bg-raised)' }}>
                  <p className="text-xs text-sec font-bold uppercase tracking-wider mb-3">Registered Baseline Inventory</p>
                  {roomAssets.length === 0 ? (
                    <div className="alert alert-warn p-3 text-xs">
                      No baseline assets registered for this room! Ensure room is manually inspected carefully.
                    </div>
                  ) : (
                    roomAssets.map(asset => (
                      <div key={asset.id} className="flex justify-between items-center mb-2 text-sm border-b pb-2 last:border-0 last:pb-0" style={{ borderColor: 'var(--border)' }}>
                        <span className="font-bold">{asset.type}</span>
                        <span className="font-mono text-sec">Qty: {asset.quantity}</span>
                      </div>
                    ))
                  )}
                </div>

                <div className="mb-6">
                  <label className="form-label text-red">Flag Missing Asset (If any)</label>
                  <input 
                    className="form-input w-full" 
                    placeholder="e.g. 1 Chair missing" 
                    value={flaggedAsset}
                    onChange={e => setFlaggedAsset(e.target.value)}
                  />
                  <p className="text-xs text-muted mt-1">If filled, clearance will be REJECTED.</p>
                </div>

                <div className="flex gap-3">
                  <button className="btn btn-ghost flex-1" onClick={() => setAuditModal(null)}>Cancel</button>
                  {flaggedAsset ? (
                    <button className="btn btn-danger flex-1" onClick={() => submitAudit('REJECTED')}>Reject & Flag</button>
                  ) : (
                    <button className="btn btn-primary flex-1" onClick={() => submitAudit('APPROVED')} style={{ background: 'var(--green)', color: '#000' }}>Approve Audit</button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
