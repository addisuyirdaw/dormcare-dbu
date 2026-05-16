'use client';
import { useEffect, useRef, useState } from 'react';

// Wrap html5-qrcode dynamically since it requires the window object
export default function Scanner({ onScanSuccess }: { onScanSuccess: (data: string) => void }) {
  const [error, setError] = useState('');
  const [method, setMethod] = useState<'QR' | 'MANUAL'>('QR');
  const [manualId, setManualId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    if (method !== 'QR') return;
    
    let html5QrcodeScanner: any;
    
    // Load script dynamically
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
    script.async = true;
    script.onload = () => {
      // @ts-ignore
      html5QrcodeScanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );
      
      html5QrcodeScanner.render(
        (decodedText: string) => {
          // Fix html5-qrcode file upload bug where it passes stringified Event
          if (!decodedText || typeof decodedText !== 'string' || decodedText.startsWith('[object')) {
            return;
          }
          html5QrcodeScanner.clear();
          processScan(decodedText, 'QR_SCAN');
        },
        (err: any) => { /* ignore constant scanning errors */ }
      );
      scannerRef.current = html5QrcodeScanner;
    };
    document.body.appendChild(script);

    return () => {
      if (scannerRef.current) scannerRef.current.clear().catch(console.error);
      document.body.removeChild(script);
    };
  }, [method]);

  const processScan = async (identifier: string, scanMethod: string) => {
    setSubmitting(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIdentifier: identifier, method: scanMethod }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to log attendance');
      
      setResult(data);
      onScanSuccess(identifier);
      
      // Auto-reset after 3 seconds for next scan
      setTimeout(() => {
        setResult(null);
        setManualId('');
        if (method === 'QR' && scannerRef.current) {
          // Force remount by toggling method state briefly
          setMethod('MANUAL');
          setTimeout(() => setMethod('QR'), 50);
        }
      }, 3000);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualId.trim()) processScan(manualId, 'MANUAL_LOOKUP');
  };

  return (
    <div>
      <div className="role-tabs mb-4">
        <button className={`role-tab ${method === 'QR' ? 'active' : ''}`} onClick={() => setMethod('QR')}>📷 QR Scan</button>
        <button className={`role-tab ${method === 'MANUAL' ? 'active' : ''}`} onClick={() => setMethod('MANUAL')}>⌨️ Manual Entry</button>
      </div>

      {result ? (
        <div className={`alert ${result.alreadyCheckedIn ? 'alert-warn' : 'alert-success'} flex-col items-center justify-center p-8 mb-4`} style={{ minHeight: 250 }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>{result.alreadyCheckedIn ? '⚠️' : '✅'}</div>
          <h3 className="text-center">{result.student.name}</h3>
          <p className="font-mono text-sm mt-1">{result.student.studentId}</p>
          <div className="mt-4 font-bold">
            {result.alreadyCheckedIn ? 'ALREADY SCANNED TODAY' : 'CHECK-IN SUCCESSFUL'}
          </div>
        </div>
      ) : (
        <>
          {method === 'QR' && (
            <div className="scanner-wrap mb-4">
              <div id="reader" style={{ width: '100%', height: '100%', minHeight: 300, background: '#000' }}></div>
              <style jsx global>{`
                #reader__scan_region { background: #000; min-height: 300px; display: flex; align-items: center; justify-content: center; }
                #reader__scan_region img { display: none !important; }
                #reader__scan_region video { object-fit: cover !important; width: 100% !important; height: 100% !important; }
                #reader__dashboard_section_csr span { color: white !important; }
                #reader button { background: var(--bg-raised); color: white; border: 1px solid var(--border); padding: 8px 16px; border-radius: 6px; cursor: pointer; margin-top: 10px; }
              `}</style>
            </div>
          )}

          {method === 'MANUAL' && (
            <form onSubmit={handleManualSubmit} className="mb-4">
              <div className="form-group mb-4">
                <label className="form-label">Student ID</label>
                <input 
                  autoFocus
                  className="form-input font-mono" 
                  placeholder="e.g. DBU/1000/15" 
                  value={manualId} 
                  onChange={(e) => setManualId(e.target.value.toUpperCase())}
                  disabled={submitting}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={submitting || !manualId.trim()}>
                {submitting ? 'Looking up...' : 'Log Attendance'}
              </button>
            </form>
          )}
        </>
      )}

      {error && <div className="alert alert-error">{error}</div>}
    </div>
  );
}
