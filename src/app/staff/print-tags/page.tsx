'use client';

import React, { useState, useEffect, Suspense } from 'react';
import QRCode from 'react-qr-code';
import { useSearchParams } from 'next/navigation';

function PrintTagsContent() {
  const searchParams = useSearchParams();
  // Accept 'roomNumber' or 'room' alias from URL
  const initialRoom = searchParams.get('roomNumber') || searchParams.get('room') || '';
  // Accept 'studentId' from URL
  const initialStudent = searchParams.get('studentId') || '';

  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterRoom, setFilterRoom] = useState(initialRoom);
  const [filterStudent, setFilterStudent] = useState(initialStudent);
  const [error, setError] = useState('');

  // Build fetch params using current filter state
  const fetchAssets = async (roomOverride?: string, studentOverride?: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      const room = roomOverride !== undefined ? roomOverride : filterRoom;
      const student = studentOverride !== undefined ? studentOverride : filterStudent;
      if (room) params.append('roomNumber', room);
      if (student) params.append('studentId', student);
      
      const res = await fetch(`/api/inventory/print?${params.toString()}`);
      const data = await res.json();
      
      if (res.ok) {
        setAssets(data.assets || []);
      } else {
        setError(data.error || 'Failed to fetch assets');
      }
    } catch (err) {
      setError('Network error fetching assets');
    } finally {
      setLoading(false);
    }
  };

  // On initial load: fetch using URL params directly (not state, which may lag)
  useEffect(() => {
    fetchAssets(initialRoom, initialStudent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ backgroundColor: '#ffffff', color: '#000000', minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Admin/Proctor Filter Panel */}
        <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="print:hidden">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', margin: 0, color: '#000000' }}>Printable Asset Tags</h1>
              <p style={{ color: '#4b5563', marginTop: '0.5rem', marginBottom: 0 }}>Filter by room or student ID to generate specific checkout matrices.</p>
            </div>
            <button 
              onClick={() => window.print()}
              disabled={assets.length === 0}
              style={{ backgroundColor: '#2563eb', color: '#ffffff', fontWeight: 'bold', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: 'none', cursor: assets.length === 0 ? 'not-allowed' : 'pointer', opacity: assets.length === 0 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
            >
              <span>🖨️</span> Print {assets.length} Tags
            </button>
          </div>

          <div style={{ display: 'flex', gap: '1rem', backgroundColor: '#f3f4f6', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>Room Number</label>
              <input 
                type="text" 
                placeholder="e.g. 1-101" 
                value={filterRoom}
                onChange={(e) => setFilterRoom(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #d1d5db' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>Student ID</label>
              <input 
                type="text" 
                placeholder="e.g. DBU-9412" 
                value={filterStudent}
                onChange={(e) => setFilterStudent(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #d1d5db' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button 
                onClick={fetchAssets}
                style={{ backgroundColor: '#111827', color: '#ffffff', fontWeight: 'bold', padding: '0.5rem 1.5rem', borderRadius: '0.25rem', border: 'none', cursor: 'pointer', height: '38px' }}
              >
                Apply Filters
              </button>
            </div>
          </div>
          
          {error && <div style={{ color: '#dc2626', fontWeight: 500 }}>{error}</div>}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280', fontSize: '1.25rem' }} className="print:hidden">
            Loading assets...
          </div>
        ) : assets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280', backgroundColor: '#f9fafb', borderRadius: '0.5rem', border: '1px dashed #d1d5db' }} className="print:hidden">
            No assets found matching these filters. Try assigning a student to a room to auto-generate their assets!
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {assets.map((asset) => (
              <div 
                key={asset.id} 
                style={{ backgroundColor: '#ffffff', color: '#000000', border: '2px solid #000000', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '0.5rem', breakInside: 'avoid' }}
              >
                <h2 style={{ fontSize: '1.125rem', fontWeight: 900, marginBottom: '1.5rem', letterSpacing: '0.025em', textAlign: 'center', textTransform: 'uppercase', borderBottom: '2px solid #000000', paddingBottom: '0.5rem', width: '100%', margin: 0, color: '#000000' }}>
                  Debre Birhan University
                </h2>
                
                <div style={{ backgroundColor: '#ffffff', padding: '0.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                  <QRCode value={asset.assetTag} size={180} level="H" fgColor="#000000" bgColor="#ffffff" />
                </div>
                
                <div style={{ textAlign: 'center', width: '100%' }}>
                  <p style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '1.25rem', marginBottom: '0.5rem', backgroundColor: '#f3f4f6', padding: '0.25rem 0', margin: '0 0 0.5rem 0', color: '#000000' }}>
                    {asset.assetTag}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: 600, color: '#000000', padding: '0 0.5rem', marginTop: '1rem', borderBottom: '1px dotted #ccc', paddingBottom: '0.25rem' }}>
                    <span>ITEM:</span>
                    <span>{asset.itemName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: 600, color: '#000000', padding: '0 0.5rem', marginTop: '0.5rem', borderBottom: '1px dotted #ccc', paddingBottom: '0.25rem' }}>
                    <span>ROOM:</span>
                    <span>{asset.roomNumber}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: 600, color: '#000000', padding: '0 0.5rem', marginTop: '0.5rem' }}>
                    <span>CUSTODIAN:</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'block', fontFamily: 'monospace', fontSize: '0.75rem', color: '#4b5563' }}>
                        {asset.custodian ? asset.custodian.studentId : '—'}
                      </span>
                      <span>{asset.custodian ? asset.custodian.name : 'Unassigned'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <style jsx global>{`
          @media print {
            body {
              background-color: #ffffff !important;
              color: #000000 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .print\\:hidden {
              display: none !important;
            }
            /* Force grids to display as flex for consistent printing layout */
            div[style*="grid-template-columns"] {
              display: flex !important;
              flex-wrap: wrap !important;
              gap: 1rem !important;
            }
            div[style*="break-inside: avoid"] {
              width: calc(33.333% - 1rem) !important;
              margin-bottom: 1rem !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

export default function PrintTagsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading Print Dashboard...</div>}>
      <PrintTagsContent />
    </Suspense>
  );
}
