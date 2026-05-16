import Navbar from '@/components/Navbar';
import { auth } from '@/lib/auth';

export default async function AboutPage() {
  const session = await auth();
  const user = session?.user as any;

  return (
    <div className="page">
      <Navbar userName={user?.name} role={user?.role} />
      <div className="container animate-in section">
        <h1 className="mb-4 text-3xl font-bold">About DBU DormCare</h1>
        <div className="card card-p mb-6" style={{ background: 'var(--bg-raised)' }}>
          <h2 className="mb-3 text-xl font-bold text-blue-400">Our Mission</h2>
          <p className="text-sec mb-4 leading-relaxed">
            Debre Birhan University Dormitory Management System (DormCare) is a centralized, digital operations platform designed to streamline student housing experiences. Our goal is to eliminate paper-based processes, accelerate emergency maintenance resolutions, and ensure high accountability for university assets through digital gate clearances and real-time proctor shifts.
          </p>
          <h2 className="mb-3 text-xl font-bold text-blue-400 mt-6">Core Features</h2>
          <ul className="list-disc pl-6 text-sec space-y-2">
            <li><strong>Automated Gate Clearance:</strong> Students can digitally request gate passes, with the system automatically auditing their room assets.</li>
            <li><strong>Emergency Maintenance Hub:</strong> Instantly report water, electrical, or structural issues and track their resolution in real-time.</li>
            <li><strong>Geofenced Staff Shifts:</strong> Proctors are assigned specific dormitory blocks, and their attendance is verified through GPS tracking and facial recognition check-ins.</li>
            <li><strong>Asset Inventory Tracking:</strong> Comprehensive records of every bed, chair, and locker to ensure nothing is lost or damaged without accountability.</li>
            <li><strong>AI Assistant:</strong> An integrated, floating AI helper available 24/7 to answer student questions and assist staff with rapid navigation.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
