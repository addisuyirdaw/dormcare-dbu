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
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="card card-p" style={{ background: 'var(--bg-raised)' }}>
            <h2 className="mb-3 text-2xl font-bold text-blue-400">Our Mission</h2>
            <p className="text-sec leading-relaxed">
              Debre Birhan University Dormitory Management System (DormCare) is a centralized, digital operations platform designed to streamline student housing experiences. Our goal is to eliminate paper-based processes, accelerate emergency maintenance resolutions, and ensure high accountability for university assets through digital gate clearances and real-time proctor shifts.
            </p>
            <p className="text-sec leading-relaxed mt-4">
              Built with modern technologies, this platform serves as a secure bridge between students, proctors, and university administration, ensuring a safe and organized campus environment.
            </p>
          </div>

          <div className="card card-p" style={{ background: 'var(--bg-raised)' }}>
            <h2 className="mb-4 text-2xl font-bold text-blue-400">Core Features</h2>
            <ul className="flex flex-col gap-4 text-sm text-sec">
              <li className="flex gap-3">
                <span className="text-xl">🚪</span>
                <div>
                  <strong className="text-white block mb-1">Automated Gate Clearance</strong>
                  Students can digitally request gate passes, with the system automatically auditing their room assets.
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-xl">🛠️</span>
                <div>
                  <strong className="text-white block mb-1">Emergency Maintenance Hub</strong>
                  Instantly report water, electrical, or structural issues and track their resolution in real-time.
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-xl">📍</span>
                <div>
                  <strong className="text-white block mb-1">Geofenced Staff Shifts</strong>
                  Proctor attendance is verified through GPS tracking and facial recognition check-ins.
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
