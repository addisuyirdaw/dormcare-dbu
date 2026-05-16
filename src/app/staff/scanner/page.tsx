import ProctorScanner from '@/components/ProctorScanner';

export default function ScannerPage() {
  return (
    <div className="min-h-screen bg-slate-950 pt-20 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          Proctor Asset Inspector
        </h1>
        <p className="text-slate-400 text-center mb-8">
          Scan a university asset QR code to audit its condition. Flagging an item will automatically lock the assigned student's gate clearance.
        </p>
        
        {/* Mount the Scanner Component */}
        <ProctorScanner />
        
      </div>
    </div>
  );
}
