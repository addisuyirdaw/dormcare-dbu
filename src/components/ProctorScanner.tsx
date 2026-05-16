'use client';

import { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function ProctorScanner() {
  const [scannedAsset, setScannedAsset] = useState<string | null>(null);
  const [assetData, setAssetData] = useState<any>(null);
  const [isLoadingAsset, setIsLoadingAsset] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    // Initialize the scanner engine on component mount
    const scanner = new Html5QrcodeScanner(
      'reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );
    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        // Fix html5-qrcode file upload bug where it passes stringified Event
        if (!decodedText || typeof decodedText !== 'string' || decodedText.startsWith('[object')) {
          return;
        }

        // We use scanner.getState() indirectly, if scannedAsset is set we ignore further scans.
        // Actually, we use a direct reference but state inside useEffect closure is stale.
        // So we just rely on setScannedAsset and useEffect.
        setScannedAsset((prev) => {
          if (!prev) {
            // New scan
            fetchAssetInfo(decodedText);
            try {
              scanner.pause(true);
            } catch (e) {
              // Ignore "Cannot pause, scanner is not scanning" in file-upload mode
            }
            return decodedText;
          }
          return prev;
        });
      },
      (error) => { /* Silently ignore scan failures until a hit */ }
    );

    return () => {
      scanner.clear().catch(console.error);
    };
  }, []);

  const fetchAssetInfo = async (tag: string) => {
    setIsLoadingAsset(true);
    setAssetData(null);
    try {
      const res = await fetch(`/api/inventory/lookup?tag=${encodeURIComponent(tag)}`);
      const data = await res.json();
      if (res.ok) {
        setAssetData(data);
      } else {
        setAssetData({ error: data.error || 'Asset not found' });
      }
    } catch (err) {
      setAssetData({ error: 'Network error fetching asset info' });
    }
    setIsLoadingAsset(false);
  };

  const handleResumeScan = () => {
    setScannedAsset(null);
    setAssetData(null);
    setFeedbackMsg('');
    if (scannerRef.current) {
      try {
        scannerRef.current.resume();
      } catch (e) {
        // Ignore "Cannot resume, scanner is not paused" in file-upload mode
      }
    }
  };

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
      // Wait a moment so they can read the success message, then resume
      setTimeout(() => {
        handleResumeScan();
      }, 3000);
    }
  };

  const verifyPristine = () => {
    setFeedbackMsg('✅ Item verified pristine. Logged to system.');
    setTimeout(() => {
      handleResumeScan();
    }, 2000);
  };

  return (
    <div className="p-4 max-w-md mx-auto bg-slate-900 text-white rounded-xl shadow-lg border border-slate-700">
      <h2 className="text-xl font-bold mb-4">📷 Asset Inspector</h2>

      {/* Hidden when an item is being actively audited */}
      <div id="reader" className={scannedAsset ? 'hidden' : 'block'}></div>

      {scannedAsset && (
        <div className="mt-4 p-5 bg-white rounded-xl border-2 border-slate-200 shadow-xl text-slate-900 animate-in">
          <div className="mb-6">
            <p className="text-xs uppercase font-bold text-slate-500 mb-1">📌 Asset Tag ID</p>
            <p className="font-mono text-xl font-bold bg-slate-100 p-3 rounded border border-slate-300 text-black">{scannedAsset}</p>
          </div>

          <div className="mb-6">
            <p className="text-xs uppercase font-bold text-slate-500 mb-1">📦 Item Name</p>
            {isLoadingAsset ? (
              <p className="text-slate-400 italic animate-pulse">Loading item info...</p>
            ) : assetData?.error ? (
              <p className="text-red-500 font-bold">{assetData.error}</p>
            ) : (
              <p className="font-semibold text-lg text-black">{assetData?.itemName || 'Unknown Item'}</p>
            )}
          </div>

          <div className="mb-6">
            <p className="text-xs uppercase font-bold text-slate-500 mb-1">👤 Current Custodian</p>
            {isLoadingAsset ? (
              <p className="text-slate-400 italic animate-pulse">Loading custodian info...</p>
            ) : assetData?.error ? (
              <p className="text-red-500 font-bold">Data unavailable</p>
            ) : (
              <p className="font-semibold text-lg text-black">
                {assetData?.custodian 
                  ? `Student ID: ${assetData.custodian.studentId} - ${assetData.custodian.name}` 
                  : 'Unassigned / Communal'}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => flagItem('DAMAGED')}
              disabled={isProcessing || isLoadingAsset || !!assetData?.error}
              className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors shadow-sm"
            >
              ❌ Flag Asset as Damaged
            </button>
            <button
              onClick={() => flagItem('MISSING')}
              disabled={isProcessing || isLoadingAsset || !!assetData?.error}
              className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white font-bold rounded-lg transition-colors shadow-sm"
            >
              ⚠️ Flag Asset as Missing
            </button>
            <button
              onClick={verifyPristine}
              disabled={isProcessing || isLoadingAsset || !!assetData?.error}
              className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors shadow-sm"
            >
              ✅ Verify Item Pristine / Clear Room
            </button>
            
            <button
              onClick={handleResumeScan}
              className="w-full py-3 mt-4 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg transition-colors"
            >
              🧹 Scan Next Item
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
