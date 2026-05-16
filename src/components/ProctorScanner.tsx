'use client';

import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function ProctorScanner() {
  const [scannedAsset, setScannedAsset] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  useEffect(() => {
    // Initialize the scanner engine on component mount
    const scanner = new Html5QrcodeScanner(
      'reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(
      (decodedText) => {
        // Upon success, pause scanner and load audit interface
        setScannedAsset(decodedText);
        scanner.pause(true);
      },
      (error) => { /* Silently ignore scan failures until a hit */ }
    );

    return () => {
      scanner.clear().catch(console.error);
    };
  }, []);

  const flagItem = async (condition: 'DAMAGED' | 'MISSING') => {
    if (!scannedAsset) return;
    setIsProcessing(true);
    setFeedbackMsg('');

    try {
      const res = await fetch('/api/inventory/report-damage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetTag: scannedAsset, condition }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setFeedbackMsg(`✅ Success: ${scannedAsset} flagged as ${condition}. Custodian's gate pass is now locked.`);
      } else {
        setFeedbackMsg(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      setFeedbackMsg('❌ Network error submitting report.');
    } finally {
      setIsProcessing(false);
      setScannedAsset(null); // Reset for next scan
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto bg-slate-900 text-white rounded-xl shadow-lg border border-slate-700">
      <h2 className="text-xl font-bold mb-4">📷 Asset Inspector</h2>

      {/* Hidden when an item is being actively audited */}
      <div id="reader" className={scannedAsset ? 'hidden' : 'block'}></div>

      {scannedAsset && (
        <div className="mt-4 p-4 bg-slate-800 rounded-lg border border-slate-600">
          <p className="text-sm text-slate-400 mb-1">Asset Detected:</p>
          <p className="font-mono text-lg font-bold text-indigo-400 mb-6">{scannedAsset}</p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => flagItem('DAMAGED')}
              disabled={isProcessing}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors"
            >
              ❌ Flag Damaged
            </button>
            <button
              onClick={() => flagItem('MISSING')}
              disabled={isProcessing}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
            >
              ⚠️ Flag Missing
            </button>
            <button
              onClick={() => setScannedAsset(null)}
              className="w-full py-2 mt-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
            >
              Cancel Scan
            </button>
          </div>
        </div>
      )}

      {feedbackMsg && (
        <div className="mt-4 p-3 bg-slate-800 rounded text-sm text-center font-medium border border-slate-600">
          {feedbackMsg}
        </div>
      )}
    </div>
  );
}
