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
        
        <div className="flex gap-4 items-center justify-center">
          {session ? (
            <Link href={dashboardLink} className="btn btn-primary btn-lg">
              Go to My Dashboard →
            </Link>
          ) : (
            <Link href="/login" className="btn btn-primary btn-lg">
              Secure Login
            </Link>
          )}
          <Link href="/about" className="btn btn-ghost btn-lg border border-white/20">
            Learn More
          </Link>
        </div>
      </main>
    </div>
  );
}
