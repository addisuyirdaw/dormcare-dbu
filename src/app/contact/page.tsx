import Navbar from '@/components/Navbar';
import { auth } from '@/lib/auth';

export default async function ContactPage() {
  const session = await auth();
  const user = session?.user as any;

  return (
    <div className="page">
      <Navbar userName={user?.name} role={user?.role} />
      <div className="container animate-in section" style={{ maxWidth: 600, paddingTop: '40px' }}>
        <h1 className="mb-4 text-3xl font-bold">Contact Support</h1>
        <div className="card card-p mb-6" style={{ background: 'var(--bg-raised)' }}>
          <p className="text-sec mb-6 text-sm">Need help with your dormitory assignment, gate clearance, or experiencing technical issues? Reach out to the Debre Birhan University IT & Facilities team.</p>
          
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Emergency Maintenance</span>
              <span className="text-sm">Call: +251-11-681-2065 (Available 24/7)</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-green-400">Proctoring & Shift Issues</span>
              <span className="text-sm">Email: admin@dbu.edu.et</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">IT Support</span>
              <span className="text-sm">Email: helpdesk@dbu.edu.et</span>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-white/10">
            <h3 className="mb-3">Send a Message</h3>
            <div className="flex flex-col gap-3">
              <input type="text" className="form-input" placeholder="Your Name" />
              <input type="email" className="form-input" placeholder="Your DBU Email" />
              <textarea className="form-input" placeholder="How can we help?" rows={4}></textarea>
              <button className="btn btn-primary mt-2">Send Message</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
