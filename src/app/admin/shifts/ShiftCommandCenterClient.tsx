'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamically import the map component to prevent SSR errors with Leaflet
const StaffLocationMap = dynamic(() => import('@/components/StaffLocationMap'), { ssr: false });

export default function ShiftCommandCenterClient({ staffMembers, blocks, initialShifts }: any) {
  const router = useRouter();
  const [shifts, setShifts] = useState<any[]>(initialShifts || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showMap, setShowMap] = useState(true);

  // Form State
  const [staffId, setStaffId] = useState('');
  const [shiftName, setShiftName] = useState('Standard Shift');
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>([]);
  
  // Default to today 8 AM - 4 PM
  const now = new Date();
  const today8AM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0).toISOString().slice(0, 16);
  const today4PM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 0).toISOString().slice(0, 16);
  
  const [startTime, setStartTime] = useState(today8AM);
  const [endTime, setEndTime] = useState(today4PM);

  // Auto-refresh shifts every 30 seconds for live tracking
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const updated = await fetch('/api/admin/shifts').then(r => r.json());
        if (Array.isArray(updated)) setShifts(updated);
      } catch (e) {}
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleBlock = (blockId: string) => {
    setSelectedBlocks(prev => 
      prev.includes(blockId) ? prev.filter(id => id !== blockId) : [...prev, blockId]
    );
  };

  const handleAssignShift = async () => {
    if (!staffId || selectedBlocks.length === 0 || !startTime || !endTime) {
      setError('Please fill out all fields and select at least one block.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId,
          shiftName,
          blockIds: selectedBlocks,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString()
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to assign shift');
      }

      setSuccess('✅ Shift successfully assigned!');
      setStaffId('');
      setSelectedBlocks([]);
      
      const updatedList = await fetch('/api/admin/shifts').then(r => r.json());
      if (Array.isArray(updatedList)) setShifts(updatedList);
      router.refresh();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  // Live Status Badge Renderer
  const renderStatusBadge = (shift: any) => {
    const nowTime = new Date().getTime();
    const startTimeTime = new Date(shift.startTime).getTime();
    
    let displayStatus = shift.status;
    if (displayStatus === 'SCHEDULED' && nowTime > startTimeTime + (15 * 60000)) {
      displayStatus = 'ABSENT';
    }

    switch (displayStatus) {
      case 'PRESENT': return <span className="badge badge-green">✔️ Verified Present</span>;
      case 'OUT_OF_BOUNDS': return <span className="badge badge-amber">⚠️ Out of Bounds</span>;
      case 'ABSENT': return <span className="badge badge-red">❌ Absent / No Check-In</span>;
      default: return <span className="badge" style={{ background: '#555', color: '#fff' }}>🗓️ Scheduled</span>;
    }
  };

  // Separate checked-in shifts (those with GPS coordinates) for the map
  const checkedInShifts = shifts.filter(s => s.latitude != null && s.longitude != null);
  const presentCount = shifts.filter(s => s.status === 'PRESENT').length;
  const outOfBoundsCount = shifts.filter(s => s.status === 'OUT_OF_BOUNDS').length;
  const absentCount = shifts.filter(s => {
    const nowTime = new Date().getTime();
    const startT = new Date(s.startTime).getTime();
    return s.status === 'SCHEDULED' && nowTime > startT + (15 * 60000);
  }).length;

  return (
    <div className="container section animate-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <span style={{ fontSize: '2rem' }}>📡</span>
        <div>
          <h1>Staff Control & Geofence Center</h1>
          <p className="text-sec mt-1">Assign multi-block shifts and monitor live staff GPS presence across campus.</p>
        </div>
      </div>

      {/* Live Stats Bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card card-p text-center" style={{ borderColor: 'rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.05)' }}>
          <div className="text-3xl font-mono font-black text-green">{presentCount}</div>
          <div className="text-xs text-sec uppercase tracking-wider mt-1">✔ Verified Present</div>
        </div>
        <div className="card card-p text-center" style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}>
          <div className="text-3xl font-mono font-black" style={{ color: '#f59e0b' }}>{outOfBoundsCount}</div>
          <div className="text-xs text-sec uppercase tracking-wider mt-1">⚠ Out of Bounds</div>
        </div>
        <div className="card card-p text-center" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
          <div className="text-3xl font-mono font-black text-red-400">{absentCount}</div>
          <div className="text-xs text-sec uppercase tracking-wider mt-1">✖ Absent / No Check-In</div>
        </div>
      </div>

      {/* LIVE MAP SECTION */}
      <div className="card mb-6">
        <div className="card-header flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h3>🗺️ Live Campus GPS Tracking Map</h3>
            {checkedInShifts.length > 0 && (
              <span className="badge badge-green text-xs animate-pulse">
                🟢 {checkedInShifts.length} Staff Located
              </span>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-sec">Auto-refreshes every 30s</span>
            <button
              className="btn btn-sm btn-ghost border border-white/10 text-xs"
              onClick={() => setShowMap(!showMap)}
            >
              {showMap ? '🗺️ Hide Map' : '🗺️ Show Map'}
            </button>
          </div>
        </div>

        {showMap && (
          <div className="p-4 animate-in fade-in">
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mb-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: '#22c55e' }}></div>
                <span className="text-sec">Present (In Office)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: '#f59e0b' }}></div>
                <span className="text-sec">Out of Bounds</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: '#6366f1' }}></div>
                <span className="text-sec">DBU Campus Center</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 border border-dashed border-indigo-500"></div>
                <span className="text-sec">Campus Geofence (~500m)</span>
              </div>
            </div>

            {checkedInShifts.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center text-center gap-3"
                style={{
                  height: '420px',
                  background: 'rgba(99,102,241,0.03)',
                  border: '1px solid rgba(99,102,241,0.15)',
                  borderRadius: '12px',
                }}
              >
                <span style={{ fontSize: '3rem' }}>🗺️</span>
                <div>
                  <p className="font-bold text-lg">Awaiting Staff Check-Ins</p>
                  <p className="text-sec text-sm mt-1">
                    When a staff member starts their shift via browser GPS, their exact location<br />
                    will appear as a live pin on this campus map.
                  </p>
                </div>
                <div className="badge badge-primary mt-2">DBU Campus Center: 9.6759°N, 39.5338°E</div>
              </div>
            ) : (
              <StaffLocationMap shifts={checkedInShifts} />
            )}
          </div>
        )}
      </div>

      <div className="grid-3 gap-6 mb-8">
        {/* SHIFT ASSIGNMENT INTERFACE */}
        <div className="card card-p" style={{ gridColumn: 'span 1' }}>
          <h3 className="mb-4 text-accent border-b border-white/10 pb-2">📝 Assign New Shift</h3>
          
          <div className="flex flex-col gap-4">
            <div>
              <label className="form-label text-xs uppercase tracking-wider text-sec">Select Staff Member</label>
              <select className="form-input w-full bg-black/40" value={staffId} onChange={e => setStaffId(e.target.value)}>
                <option value="">-- Choose Staff --</option>
                {staffMembers.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.phone || 'No phone'})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label text-xs uppercase tracking-wider text-sec">Shift Name</label>
              <input 
                type="text" 
                className="form-input w-full bg-black/40" 
                placeholder="e.g. Night Shift"
                value={shiftName}
                onChange={e => setShiftName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label text-xs uppercase tracking-wider text-sec">Start Time</label>
                <input 
                  type="datetime-local" 
                  className="form-input w-full bg-black/40 text-xs" 
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label text-xs uppercase tracking-wider text-sec">End Time</label>
                <input 
                  type="datetime-local" 
                  className="form-input w-full bg-black/40 text-xs" 
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="form-label text-xs uppercase tracking-wider text-sec mb-2 block">Assigned Blocks</label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border border-white/10 rounded bg-black/20">
                {blocks.map((b: any) => (
                  <button
                    key={b.id}
                    className={`badge border transition-colors cursor-pointer ${selectedBlocks.includes(b.id) ? 'bg-primary text-black border-primary' : 'bg-transparent text-sec border-white/10 hover:border-white/30'}`}
                    onClick={() => handleToggleBlock(b.id)}
                  >
                    Block {b.number}
                  </button>
                ))}
              </div>
            </div>

            {error && <div className="alert alert-error text-xs">{error}</div>}
            {success && <div className="alert alert-success text-xs">{success}</div>}

            <button 
              className="btn btn-primary btn-block mt-2" 
              onClick={handleAssignShift}
              disabled={loading}
            >
              {loading ? 'Assigning...' : '📅 Assign Shift'}
            </button>
          </div>
        </div>

        {/* LIVE STAFF TRACKING LEDGER */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header flex justify-between items-center">
            <h3>🔴 Live Tracking & Audit Ledger</h3>
            <button className="btn btn-sm btn-ghost border border-white/10 text-xs" onClick={async () => {
              const updated = await fetch('/api/admin/shifts').then(r => r.json());
              if (Array.isArray(updated)) setShifts(updated);
              router.refresh();
            }}>
              🔄 Refresh
            </button>
          </div>
          <div className="table-wrap" style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <table className="table w-full">
              <thead className="sticky top-0 bg-[#161618] z-10 shadow-md border-b border-white/10">
                <tr className="text-xs uppercase tracking-wider text-sec">
                  <th className="p-4 text-left font-bold">Staff Member</th>
                  <th className="p-4 text-left font-bold">Shift Details</th>
                  <th className="p-4 text-left font-bold">Live Status</th>
                  <th className="p-4 text-left font-bold">GPS Location</th>
                </tr>
              </thead>
              <tbody>
                {shifts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-sec">No shifts scheduled yet.</td>
                  </tr>
                ) : shifts.map(shift => (
                  <tr key={shift.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-sm">{shift.staff?.name}</div>
                      <div className="text-xs font-mono text-muted">{shift.staff?.phone || 'No Phone'}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-xs text-accent mb-1">{shift.shiftName}</div>
                      <div className="text-[10px] text-sec bg-black/40 p-1 rounded inline-block mb-1 border border-white/5">
                        {new Date(shift.startTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} - {new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-[10px] text-muted max-w-[150px] truncate" title={shift.blocks?.map((b:any) => `Blk ${b.number}`).join(', ')}>
                        Blocks: {shift.blocks?.map((b:any) => b.number).join(', ') || 'None'}
                      </div>
                    </td>
                    <td className="p-4">
                      {renderStatusBadge(shift)}
                    </td>
                    <td className="p-4 text-xs">
                      {shift.checkedInAt ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-sec">In: {new Date(shift.checkedInAt).toLocaleTimeString()}</span>
                          {shift.status === 'OUT_OF_BOUNDS' ? (
                            <span className="text-red-400 font-bold bg-red-500/10 px-1 rounded inline-block w-fit border border-red-500/20">
                              Δ {Math.round(shift.distanceDelta)}m from Campus
                            </span>
                          ) : (
                            <span className="text-green font-mono">Δ {Math.round(shift.distanceDelta)}m (Valid)</span>
                          )}
                          {shift.latitude && shift.longitude && (
                            <div className="flex flex-col gap-1 mt-1">
                              <span className="text-[10px] text-muted font-mono">
                                {shift.latitude.toFixed(4)}°N, {shift.longitude.toFixed(4)}°E
                              </span>
                              <a 
                                href={`https://www.google.com/maps?q=${shift.latitude},${shift.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent hover:underline flex items-center gap-1 text-[10px]"
                              >
                                🌐 Open in Google Maps
                              </a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted italic">Awaiting check-in...</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
