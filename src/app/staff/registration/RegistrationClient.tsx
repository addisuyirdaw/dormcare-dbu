'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const DEFAULT_ASSET_TYPES = ['CHAIR', 'LOCKER', 'TABLE', 'BED', 'KEY'];

export default function RegistrationClient() {
  const router = useRouter();
  
  // Registration Form State
  const [blockNum, setBlockNum] = useState<string>('');
  const [roomNum, setRoomNum] = useState<string>('');
  const [custodianStudentName, setCustodianStudentName] = useState<string>('');
  const [custodianStudentId, setCustodianStudentId] = useState<string>('');
  const [assets, setAssets] = useState<{ type: string, quantity: number }[]>(
    DEFAULT_ASSET_TYPES.map(t => ({ type: t, quantity: 0 }))
  );
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Ledger State
  const [ledgerRooms, setLedgerRooms] = useState<any[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [showLedger, setShowLedger] = useState(false);
  const [expandedBlocks, setExpandedBlocks] = useState<number[]>([]);
  const [expandedRooms, setExpandedRooms] = useState<string[]>([]);
  const [newStudentInputs, setNewStudentInputs] = useState<Record<string, string>>({});
  const [newStudentNames, setNewStudentNames] = useState<Record<string, string>>({});
  
  // Filter State
  const [filterBlock, setFilterBlock] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showWarningsOnly, setShowWarningsOnly] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState('');

  const fetchLedgerRooms = async () => {
    try {
      const res = await fetch('/api/rooms/inventory');
      const data = await res.json();
      if (Array.isArray(data)) setLedgerRooms(data);
    } catch (e) {
      console.error("Failed to load ledger");
    } finally {
      setLoadingLedger(false);
    }
  };

  useEffect(() => {
    fetchLedgerRooms();
  }, []);

  const handleBackfill = async () => {
    setBackfilling(true);
    setBackfillMsg('');
    try {
      const res = await fetch('/api/inventory/backfill', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        const created = data.results.filter((r: any) => r.status?.startsWith('CREATED'));
        const skipped = data.results.filter((r: any) => r.status?.startsWith('SKIPPED'));
        setBackfillMsg(`✅ Done! Generated assets for ${created.length} student(s). ${skipped.length} already had assets.`);
        fetchLedgerRooms();
      } else {
        setBackfillMsg(`❌ Error: ${data.error}`);
      }
    } catch {
      setBackfillMsg('❌ Network error during backfill.');
    }
    setBackfilling(false);
  };

  const updateAsset = (index: number, quantity: string) => {
    const newAssets = [...assets];
    newAssets[index].quantity = parseInt(quantity) || 0;
    setAssets(newAssets);
  };

  const addCustomAsset = () => {
    setAssets([...assets, { type: 'CUSTOM_ITEM', quantity: 1 }]);
  };

  const removeAsset = (index: number) => {
    setAssets(assets.filter((_, i) => i !== index));
  };

  const updateAssetType = (index: number, value: string) => {
    const newAssets = [...assets];
    newAssets[index].type = value;
    setAssets(newAssets);
  };

  const handleSave = async () => {
    if (!blockNum || !roomNum) {
      setErrorMsg("Please enter both a Block Number and a Room Number.");
      return;
    }
    
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const roomString = `${blockNum}-${roomNum}`;
      const validAssets = assets.filter(a => a.type.trim() !== '' && a.quantity > 0);
      
      const res = await fetch(`/api/rooms/${roomString}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          assets: validAssets, 
          custodianStudentId: custodianStudentId.trim(),
          custodianStudentName: custodianStudentName.trim()
        }),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save registry');
      }
      
      setSuccessMsg(`✅ Successfully registered Block ${blockNum}, Room ${roomNum}!`);
      // Reset room to allow fast consecutive entry
      setRoomNum('');
      setCustodianStudentName('');
      setCustodianStudentId('');
      setAssets(DEFAULT_ASSET_TYPES.map(t => ({ type: t, quantity: 0 })));
      
      // Refresh the ledger table immediately
      fetchLedgerRooms();
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddStudent = async (roomId: string, roomNumber: string) => {
    const studentId = newStudentInputs[roomId];
    const studentName = newStudentNames[roomId];
    if (!studentId || studentId.trim() === '') return;

    try {
      const res = await fetch(`/api/rooms/${roomNumber}/occupants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          studentId: studentId.trim(),
          studentName: studentName ? studentName.trim() : undefined
        }),
      });
      
      const result = await res.json();
      if (!res.ok) {
        const err = result;
        alert(`Error: ${err.error}`);
        return;
      }

      // Show confirmation of which assets were auto-generated
      if (result.assetsGenerated > 0) {
        const tagList = result.assets.map((a: any) => `• ${a.item}: ${a.tag}`).join('\n');
        alert(`✅ Student registered!\n\n🏷️ Auto-generated ${result.assetsGenerated} personal asset tags:\n${tagList}\n\nPrint these tags and attach them to the physical items in the room.`);
      } else if (result.assetsGenerated === 0) {
        alert(`⚠️ Student registered, but no new assets were generated (they may already exist or an error occurred). Check server logs.`);
      }

      // Clear input and refresh ledger
      setNewStudentInputs(prev => ({ ...prev, [roomId]: '' }));
      setNewStudentNames(prev => ({ ...prev, [roomId]: '' }));
      fetchLedgerRooms();
    } catch (err) {
      alert("Failed to add student due to a network error.");
    }
  };

  const editRoom = (room: any) => {
    setBlockNum(room.dormBlock.number.toString());
    const [_, rNum] = room.roomNumber.split('-');
    setRoomNum(rNum || room.roomNumber);
    
    // Auto-fill the Custodian Student ID if one exists
    setCustodianStudentId(room.keyCustodian?.studentId || '');
    
    const mappedAssets = room.assets.map((a: any) => ({ type: a.type, quantity: a.quantity }));
    // Ensure defaults exist if not in mapped
    DEFAULT_ASSET_TYPES.forEach(t => {
      if (!mappedAssets.find((ma: any) => ma.type === t)) {
        mappedAssets.push({ type: t, quantity: 0 });
      }
    });
    setAssets(mappedAssets);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter Ledger Data
  const filteredRooms = ledgerRooms.filter(room => {
    // Search Filter (Room Number, Block Number, Student Name, Student ID)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchRoom = room.roomNumber.toLowerCase().includes(q);
      const matchBlock = room.dormBlock?.number.toString() === q; // Exact match block for cleaner searching
      const matchCustodian = room.keyCustodian?.name.toLowerCase().includes(q) || room.keyCustodian?.studentId.toLowerCase().includes(q);
      const matchOccupant = room.occupants?.some((o: any) => o.name.toLowerCase().includes(q) || o.studentId.toLowerCase().includes(q));
      if (!matchRoom && !matchBlock && !matchCustodian && !matchOccupant) return false;
    }
    
    // Warnings Filter (Missing Key Custodian, or 0 Chairs/Beds meaning incomplete data)
    if (showWarningsOnly) {
      const hasCustodian = !!room.keyCustodian;
      const totalAssets = room.assets.reduce((sum: number, a: any) => sum + a.quantity, 0);
      if (hasCustodian && totalAssets > 0) return false; // Hide completely healthy rooms
    }
    
    return true;
  });

  return (
    <div className="container section animate-in" style={{ maxWidth: 1000 }}>
      {/* HEADER */}
      <div className="mb-6">
        <Link href="/staff" className="btn btn-ghost btn-sm mb-4 border border-white/10">← Back to Dashboard</Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1>🏢 Campus-Wide Dormitory Asset Registration</h1>
            <p className="text-sec mt-2">
              Dynamically register room baselines. If a block or room does not exist, it will be automatically created on the fly.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={handleBackfill}
              disabled={backfilling}
              className="btn btn-sm border border-amber-500/50 text-amber-400 hover:bg-amber-500/10 transition-colors"
            >
              {backfilling ? '⏳ Generating...' : '🔧 Generate Missing Assets'}
            </button>
            {backfillMsg && <p className="text-xs text-right max-w-[260px]" style={{ color: backfillMsg.startsWith('✅') ? 'var(--green)' : 'var(--red)' }}>{backfillMsg}</p>}
          </div>
        </div>
      </div>

      {/* REGISTRATION PANEL */}
      <div className="card card-p mb-8" style={{ border: '1px solid var(--primary)', boxShadow: '0 0 20px rgba(99, 102, 241, 0.1)' }}>
        {successMsg && <div className="alert alert-success mb-6">{successMsg}</div>}
        {errorMsg && <div className="alert alert-error mb-6">{errorMsg}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div>
            <label className="text-xs text-sec uppercase tracking-wider mb-2 block font-bold">Block Number</label>
            <input 
              type="number"
              min="0"
              className="form-input w-full bg-black/40 text-lg py-3 px-4 font-mono border border-white/10"
              placeholder="e.g. 7"
              value={blockNum}
              onChange={(e) => setBlockNum(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-sec uppercase tracking-wider mb-2 block font-bold">Dorm Room</label>
            <input 
              type="number"
              min="0"
              className="form-input w-full bg-black/40 text-lg py-3 px-4 font-mono border border-white/10"
              placeholder="e.g. 100"
              value={roomNum}
              onChange={(e) => setRoomNum(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-amber-500 uppercase tracking-wider mb-2 block font-bold">Assign Key Custodian</label>
            <div className="grid grid-cols-2 gap-4">
              <input 
                type="text"
                className="form-input w-full bg-black/40 text-lg py-3 px-4 font-mono border border-amber-500/30 text-amber-100"
                placeholder="Full Name (e.g. Alemu)"
                value={custodianStudentName}
                onChange={(e) => setCustodianStudentName(e.target.value)}
              />
              <input 
                type="text"
                className="form-input w-full bg-black/40 text-lg py-3 px-4 font-mono border border-amber-500/30 text-amber-100"
                placeholder="Student ID (e.g. DBU/1000/15)"
                value={custodianStudentId}
                onChange={(e) => setCustodianStudentId(e.target.value.toUpperCase())}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs text-sec uppercase tracking-wider mb-3 block font-bold border-b border-white/10 pb-2">Standard University Property</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {assets.map((asset, idx) => (
              <div key={idx} className="flex items-center justify-between bg-black/20 p-2 px-3 rounded border border-white/5">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-lg opacity-80">{asset.type === 'KEY' ? '🔑' : asset.type === 'BED' ? '🛏️' : asset.type === 'CHAIR' ? '🪑' : asset.type === 'LOCKER' ? '🚪' : asset.type === 'TABLE' ? '🪚' : '📦'}</span>
                  {DEFAULT_ASSET_TYPES.includes(asset.type) ? (
                    <span className="font-bold text-sm tracking-wider min-w-[80px]">{asset.type}</span>
                  ) : (
                    <input 
                      className="form-input text-sm py-1 px-2 h-auto flex-1 max-w-[150px]" 
                      value={asset.type} 
                      onChange={(e) => updateAssetType(idx, e.target.value.toUpperCase())}
                      placeholder="CUSTOM ITEM"
                    />
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <label className="text-xs text-muted uppercase">Qty:</label>
                  <input 
                    type="number" 
                    min="0"
                    className="form-input w-20 text-center font-mono text-md bg-black/50 border border-white/10"
                    value={asset.quantity}
                    onChange={(e) => updateAsset(idx, e.target.value)}
                  />
                  {!DEFAULT_ASSET_TYPES.includes(asset.type) && (
                    <button className="text-red-400 hover:text-red-300 font-bold px-2" onClick={() => removeAsset(idx)}>✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button 
            className="mt-4 text-xs text-center py-2 w-full text-green hover:bg-white/5 rounded border border-dashed border-green/30 transition-colors"
            onClick={addCustomAsset}
          >
            [+ Add Custom Asset Row]
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-white/10">
          <button 
            className="btn w-full py-4 text-black font-bold text-lg shadow-lg"
            style={{ background: 'var(--green)' }}
            onClick={handleSave}
            disabled={saving || !blockNum || !roomNum}
          >
            {saving ? 'Saving to Database...' : '💾 Save Room Asset Registry (Upsert)'}
          </button>
        </div>
      </div>

      {/* MASTER INVENTORY LEDGER */}
      <div className="card">
        <div className="card-header flex flex-col gap-4" style={{ paddingBottom: showLedger ? '1rem' : '0', borderBottom: showLedger ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl">📋 Master Inventory Ledger & Audit View</h2>
            <div className="flex items-center gap-3">
              <span className="badge badge-primary">{filteredRooms.length} Rooms</span>
              <button 
                className="btn btn-sm border border-white/10"
                onClick={() => setShowLedger(!showLedger)}
              >
                {showLedger ? 'Hide Ledger ⬆️' : 'View All Rooms ⬇️'}
              </button>
            </div>
          </div>
          
          {showLedger && (
            /* Real-time Search & Filter Bar */
            <div className="flex flex-wrap gap-4 items-center bg-black/20 p-3 rounded-lg border border-white/5 animate-in fade-in slide-in-from-top-2">
              <div className="flex-1 min-w-[200px]">
                <input 
                  type="text" 
                  className="form-input w-full text-sm" 
                  placeholder="🔍 Search Student, ID, or Room (e.g. '7-' for Block 7)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <button 
                className={`btn btn-sm ${showWarningsOnly ? 'btn-danger' : 'btn-ghost border border-white/10'}`}
                onClick={() => setShowWarningsOnly(!showWarningsOnly)}
              >
                ⚠️ Show Warnings
              </button>
            </div>
          )}
        </div>

        {showLedger && (
          <div className="p-4 animate-in fade-in">
            {loadingLedger ? (
              <div className="p-8 text-center text-sec animate-pulse">Loading university database...</div>
            ) : filteredRooms.length === 0 ? (
              <div className="p-8 text-center text-sec">No rooms found matching your filters.</div>
            ) : (
              <div className="flex flex-col gap-4">
                {Array.from(new Set(filteredRooms.map(r => r.dormBlock.number)))
                  .sort((a, b) => a - b)
                  .map(blockNum => {
                    const blockRooms = filteredRooms.filter(r => r.dormBlock.number === blockNum);
                    const isExpanded = expandedBlocks.includes(blockNum);
                    
                    return (
                      <div key={blockNum} className="border border-white/10 rounded-lg overflow-hidden bg-black/20">
                        <div 
                          className="p-4 bg-white/5 hover:bg-white/10 cursor-pointer flex justify-between items-center transition-colors"
                          onClick={() => {
                            if (isExpanded) {
                              setExpandedBlocks(expandedBlocks.filter(b => b !== blockNum));
                            } else {
                              setExpandedBlocks([...expandedBlocks, blockNum]);
                            }
                          }}
                        >
                          <h3 className="text-lg font-bold flex items-center gap-2">
                            🏢 Block {blockNum}
                          </h3>
                          <div className="flex items-center gap-4">
                            <span className="badge badge-primary bg-primary/20 text-primary border-none">{blockRooms.length} Registered Rooms</span>
                            <span className="text-sec opacity-50">{isExpanded ? '▼' : '▶'}</span>
                          </div>
                        </div>
                        
                        {isExpanded && (
                          <div className="flex flex-col gap-2 p-3 border-t border-white/10 bg-black/40">
                            {blockRooms.map((room) => {
                              const isRoomExpanded = expandedRooms.includes(room.id);
                              const hasCustodian = !!room.keyCustodian;
                              const totalAssets = room.assets.reduce((sum: number, a: any) => sum + a.quantity, 0);
                              const isWarning = !hasCustodian || totalAssets === 0;

                              return (
                                <div key={room.id} className="border border-white/5 rounded bg-black/20 overflow-hidden">
                                  {/* DORM HEADER (Click to expand) */}
                                  <div 
                                    className="p-3 hover:bg-white/5 cursor-pointer flex justify-between items-center transition-colors"
                                    onClick={() => {
                                      if (isRoomExpanded) {
                                        setExpandedRooms(expandedRooms.filter(id => id !== room.id));
                                      } else {
                                        setExpandedRooms([...expandedRooms, room.id]);
                                      }
                                    }}
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="text-lg font-mono font-bold">🚪 Dorm {room.roomNumber.split('-')[1] || room.roomNumber}</span>
                                      {isWarning && <span className="badge badge-amber text-[10px]">⚠️ Pending Data</span>}
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-sec">
                                      <span>{room.occupants?.length || 0} Students</span>
                                      <span className="opacity-50">{isRoomExpanded ? '▼' : '▶'}</span>
                                    </div>
                                  </div>

                                  {/* DORM DETAILS (Expanded) */}
                                  {isRoomExpanded && (
                                    <div className="p-4 border-t border-white/5 bg-black/60 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                                      
                                      <div>
                                        <h4 className="text-xs uppercase text-sec tracking-wider mb-3 border-b border-white/10 pb-1">Occupants & Key</h4>
                                        <div className="flex flex-col gap-2">
                                          {room.occupants && room.occupants.length > 0 ? (
                                            room.occupants.map((student: any) => {
                                              const isCustodian = room.keyCustodian && student.id === room.keyCustodian.id;
                                              return (
                                                <div key={student.id} className="bg-white/5 border border-white/10 p-2 rounded flex justify-between items-center">
                                                  <div>
                                                    <div className="font-bold text-sm flex items-center gap-1">
                                                      {student.name} {isCustodian && <span title="Original Key Holder">🔑</span>}
                                                    </div>
                                                    <div className="text-xs font-mono text-sec">{student.studentId}</div>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    {isCustodian && <span className="badge bg-primary/20 text-primary border-none text-[10px]">Key Custodian</span>}
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        router.push(`/staff/print-tags?studentId=${student.studentId}&roomNumber=${encodeURIComponent(room.roomNumber)}`);
                                                      }}
                                                      className="btn btn-xs bg-blue-600 hover:bg-blue-500 text-white border-none px-2 py-1 rounded shadow-sm"
                                                      title="Print tags for this student"
                                                    >
                                                      🖨️ Print
                                                    </button>
                                                  </div>
                                                </div>
                                              );
                                            })
                                          ) : (
                                            <div className="text-sm text-sec italic">No students registered yet.</div>
                                          )}
                                          
                                          {!room.keyCustodian && (
                                            <div className="bg-red-500/10 border border-red-500/20 p-2 rounded text-red-400 text-xs font-bold mt-1">
                                              No Key Custodian Assigned!
                                            </div>
                                          )}
                                          
                                          {/* QUICK ADD STUDENT */}
                                          <div className="mt-4 flex gap-2 flex-col sm:flex-row">
                                            <input 
                                              type="text" 
                                              placeholder="Full Name (e.g. Adisu)"
                                              className="form-input text-xs w-full bg-black/50 border border-white/10 px-2 py-1.5 h-auto"
                                              value={newStudentNames[room.id] || ''}
                                              onChange={(e) => setNewStudentNames({...newStudentNames, [room.id]: e.target.value})}
                                              onClick={(e) => e.stopPropagation()}
                                            />
                                            <input 
                                              type="text" 
                                              placeholder="ID (e.g. 1500962)"
                                              className="form-input text-xs w-full bg-black/50 border border-white/10 px-2 py-1.5 h-auto font-mono"
                                              value={newStudentInputs[room.id] || ''}
                                              onChange={(e) => setNewStudentInputs({...newStudentInputs, [room.id]: e.target.value.toUpperCase()})}
                                              onClick={(e) => e.stopPropagation()}
                                            />
                                            <button 
                                              className="btn btn-sm bg-white/5 hover:bg-primary hover:text-black transition-colors border border-white/10 text-xs px-4"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleAddStudent(room.id, room.roomNumber);
                                              }}
                                              disabled={!newStudentInputs[room.id] || !newStudentNames[room.id]}
                                            >
                                              Add
                                            </button>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Materials Info */}
                                      <div>
                                        <h4 className="text-xs uppercase text-sec tracking-wider mb-3 border-b border-white/10 pb-1">Dormitory Materials</h4>
                                        <div className="flex flex-wrap gap-2">
                                          {room.assets.map((asset: any) => (
                                            <div key={asset.id} className="bg-white/5 border border-white/10 rounded p-2 flex flex-col items-center min-w-[70px]">
                                              <span className="text-[10px] text-sec font-bold tracking-wider mb-1">{asset.type}</span>
                                              <span className="font-mono text-lg">{asset.quantity}</span>
                                            </div>
                                          ))}
                                        </div>
                                        
                                        <div className="mt-4 flex justify-end gap-2">
                                          <button 
                                            className="btn btn-sm btn-ghost border border-white/10 hover:bg-blue-600 hover:text-white transition-colors"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              router.push(`/staff/print-tags?roomNumber=${room.roomNumber}`);
                                            }}
                                          >
                                            🖨️ Print Room Tags
                                          </button>
                                          <button 
                                            className="btn btn-sm btn-ghost border border-white/10 hover:bg-primary hover:text-black transition-colors"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              editRoom(room);
                                            }}
                                          >
                                            ✏️ Edit Baseline
                                          </button>
                                        </div>
                                      </div>

                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            
                            {/* Quick Action for the Block */}
                            <div className="mt-2 flex justify-end">
                              <button 
                                className="btn btn-sm btn-ghost border border-white/10 text-xs text-sec hover:text-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setBlockNum(blockNum.toString());
                                  setRoomNum('');
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                              >
                                ➕ Register New Dorm in Block {blockNum}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
