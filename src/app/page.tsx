import { auth } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default async function Home() {
  const session = await auth();
  const user = session?.user as any;
  const role = user?.role;

  // Let's create a dynamic dashboard link based on role
  let dashboardLink = '/login';
  if (role === 'STUDENT') dashboardLink = '/student';
  if (role === 'STAFF') dashboardLink = '/staff';
  if (role === 'ADMIN') dashboardLink = '/admin';

  return (
    <div className="page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar userName={user?.name} role={role} />
      
      <main className="container animate-in section flex-1 flex flex-col items-center justify-center text-center" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏛️</div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">DBU Dormitory Management System</h1>
        <p className="text-sec text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
          The all-in-one digital platform for Debre Birhan University. Streamline your housing experience with automated gate passes, real-time maintenance reporting, and secure staff shift verification.
        </p>
        
        <div className="flex gap-4 items-center justify-center mb-16">
          {session ? (
            <Link href={dashboardLink} className="btn btn-primary btn-lg">
              Go to My Dashboard →
            </Link>
          ) : (
            <Link href="/about" className="btn btn-primary btn-lg">
              Learn More
            </Link>
          )}
        </div>

        {/* Simple Features Grid */}
        <div className="grid-3 gap-6 max-w-5xl mx-auto text-left w-full">
          <div className="card card-p" style={{ background: 'var(--bg-raised)' }}>
            <div className="text-3xl mb-3">🚪</div>
            <h3 className="font-bold mb-2">Digital Gate Pass</h3>
            <p className="text-sm text-sec">Students can request exit tokens digitally. Security can verify passes in real-time to ensure safe and authorized departures.</p>
          </div>
          <div className="card card-p" style={{ background: 'var(--bg-raised)' }}>
            <div className="text-3xl mb-3">🛠️</div>
            <h3 className="font-bold mb-2">Fast Maintenance</h3>
            <p className="text-sm text-sec">Report room issues directly from your dashboard. Proctors are instantly notified to resolve water, electrical, or structural problems.</p>
          </div>
          <div className="card card-p" style={{ background: 'var(--bg-raised)' }}>
            <div className="text-3xl mb-3">📋</div>
            <h3 className="font-bold mb-2">Asset Accountability</h3>
            <p className="text-sm text-sec">Every piece of university property is tracked. The system ensures no student can leave if there are unresolved damages to their room.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
