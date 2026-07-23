'use client';
import Link from 'next/link';
import { useState } from 'react';
import { signOut } from 'next-auth/react';

interface NavbarProps {
  userName?: string;
  role?: string;
  dormBlock?: string;
  onDuty?: boolean;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  STUDENT: { label: 'Student', color: '#2563eb' },
  STAFF: { label: 'Staff · Teregna', color: '#d97706' },
  ADMIN: { label: 'Admin · Proctor', color: '#16a34a' },
};

export default function Navbar({ userName, role = 'STUDENT', dormBlock, onDuty }: NavbarProps) {
  const roleInfo = ROLE_LABELS[role] ?? ROLE_LABELS.STUDENT;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 50, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', width: '100%', height: '80px', padding: '0 24px', backgroundColor: '#ffffff', borderBottom: '1px solid #f1f5f9', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>

        {/* Brand (Left) */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: '#0f172a' }}>
          <div style={{ fontSize: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', background: 'linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)', borderRadius: '12px', color: '#fff', boxShadow: '0 4px 12px rgba(79,70,229,0.2)' }}>
            🏛️
          </div>
          <span style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }} className="hidden-mobile">
            Debre Birhan University
          </span>
        </Link>

        {/* Desktop Navigation & Auth */}
        <div className="hidden-mobile" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginLeft: 'auto', flexShrink: 0 }}>
          {/* Unauthenticated Links */}
          {!userName ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '6px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <Link href="/" className="nav-pill" style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 800, letterSpacing: '0.05em', color: '#475569', textTransform: 'uppercase', textDecoration: 'none', borderRadius: '8px', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>Home</Link>
                <Link href="/about" className="nav-pill" style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 800, letterSpacing: '0.05em', color: '#475569', textTransform: 'uppercase', textDecoration: 'none', borderRadius: '8px', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>About</Link>
                <Link href="/contact" className="nav-pill" style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 800, letterSpacing: '0.05em', color: '#475569', textTransform: 'uppercase', textDecoration: 'none', borderRadius: '8px', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>Contact</Link>
              </div>
              <a href="https://dbu-ss.vercel.app/" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 800, letterSpacing: '0.05em', color: '#4f46e5', textTransform: 'uppercase', textDecoration: 'none', backgroundColor: '#e0e7ff', padding: '10px 16px', borderRadius: '10px', whiteSpace: 'nowrap', transition: 'all 0.2s', border: '1px solid rgba(79, 70, 229, 0.2)' }} className="portal-btn">🎓 Student Services</a>
              <a href="https://www.dbu.edu.et" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 800, letterSpacing: '0.05em', color: '#4f46e5', textTransform: 'uppercase', textDecoration: 'none', backgroundColor: '#e0e7ff', padding: '10px 16px', borderRadius: '10px', whiteSpace: 'nowrap', transition: 'all 0.2s' }} className="portal-btn">🌐 DBU Portal</a>
            </>
          ) : (role === 'STAFF' || role === 'ADMIN') ? (
            /* Staff/Admin Dropdown */
            <details style={{ position: 'relative' }}>
              <summary style={{ cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#334155', textTransform: 'uppercase' }}>Tasks</summary>
              <ul style={{ position: 'absolute', top: '100%', left: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '8px', minWidth: '180px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <li><Link href="/staff" style={{ fontSize: '14px', color: '#334155', textDecoration: 'none' }}>Pending</Link></li>
                <li><Link href="/staff" style={{ fontSize: '14px', color: '#334155', textDecoration: 'none' }}>Progress</Link></li>
                <li><Link href="/staff" style={{ fontSize: '14px', color: '#334155', textDecoration: 'none' }}>Already Resolved</Link></li>
                <li><Link href="/staff" style={{ fontSize: '14px', color: '#334155', textDecoration: 'none' }}>Clearance</Link></li>
                <li style={{ marginTop: '4px', borderTop: '1px solid #e2e8f0', paddingTop: '4px' }}>
                  <Link href="/gate" style={{ fontSize: '14px', fontWeight: 700, color: '#4f46e5', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>🚪 Gate Control</Link>
                </li>
              </ul>
            </details>
          ) : null}

          {/* Auth Section */}
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: '16px', paddingLeft: '16px', borderLeft: '1px solid #e2e8f0' }}>
            {userName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {dormBlock && <span style={{ display: 'none' }} data-block={dormBlock} />}
                {role === 'STAFF' && onDuty !== undefined && (
                  <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: onDuty ? '#dcfce7' : '#fee2e2', color: onDuty ? '#166534' : '#991b1b', whiteSpace: 'nowrap' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: onDuty ? '#22c55e' : '#ef4444' }} />
                    {onDuty ? 'On Duty' : 'Off Duty'}
                  </span>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 700, backgroundColor: roleInfo.color + '20', color: roleInfo.color, whiteSpace: 'nowrap' }}>{roleInfo.label}</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</span>
                </div>
                <button style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 700, color: '#475569', backgroundColor: 'transparent', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.025em', whiteSpace: 'nowrap', flexShrink: 0 }} onClick={() => signOut({ callbackUrl: '/login' })}>
                  Sign Out
                </button>
              </div>
            ) : (
              <a href="/login" style={{ padding: '8px 24px', backgroundColor: '#2563eb', color: '#ffffff', fontSize: '14px', fontWeight: 700, borderRadius: '4px', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.025em', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                Login
              </a>
            )}
          </div>
        </div>

        {/* Mobile Hamburger Toggle (Hidden on Desktop) */}
        <button
          className="mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ background: 'transparent', border: 'none', color: '#334155', fontSize: '28px', cursor: 'pointer', padding: '8px' }}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="mobile-menu" style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#ffffff', borderTop: '1px solid #f1f5f9', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', position: 'absolute', width: '100%', left: 0 }}>
{!userName && (
  <>
    <a href="/" style={{ color: '#334155', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em', fontSize: '14px', textDecoration: 'none' }}>Home</a>
    <a href="/about" style={{ color: '#334155', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em', fontSize: '14px', textDecoration: 'none' }}>About</a>
    <a href="/contact" style={{ color: '#334155', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em', fontSize: '14px', textDecoration: 'none' }}>Contact Us</a>
    <a href="https://dbu-ss.vercel.app/" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4338ca', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.025em', fontSize: '14px', backgroundColor: '#eef2ff', padding: '8px 12px', borderRadius: '6px', textDecoration: 'none' }}>🎓 Student Services Portal</a>
    <a href="https://www.dbu.edu.et" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4338ca', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.025em', fontSize: '14px', backgroundColor: '#eef2ff', padding: '8px 12px', borderRadius: '6px', textDecoration: 'none' }}>🌐 Main DBU Portal</a>
  </>
)}
{userName && (role === 'STAFF' || role === 'ADMIN') && (
  <details style={{ marginTop: '8px' }}>
    <summary style={{ cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#334155', textTransform: 'uppercase' }}>Tasks</summary>
    <ul style={{ marginTop: '4px' }}>
      <li><Link href="/staff" style={{ fontSize: '14px', color: '#334155', textDecoration: 'none' }}>Pending</Link></li>
      <li><Link href="/staff" style={{ fontSize: '14px', color: '#334155', textDecoration: 'none' }}>Progress</Link></li>
      <li><Link href="/staff" style={{ fontSize: '14px', color: '#334155', textDecoration: 'none' }}>Already Resolved</Link></li>
      <li><Link href="/staff" style={{ fontSize: '14px', color: '#334155', textDecoration: 'none' }}>Clearance</Link></li>
      <li style={{ marginTop: '4px', borderTop: '1px solid #e2e8f0', paddingTop: '4px' }}>
        <Link href="/gate" style={{ fontSize: '14px', fontWeight: 700, color: '#4f46e5', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>🚪 Gate Control</Link>
      </li>
    </ul>
  </details>
)}


          <hr style={{ borderColor: '#f1f5f9', margin: '8px 0', borderStyle: 'solid', borderWidth: '1px 0 0 0' }} />

          {userName ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 700, backgroundColor: roleInfo.color + '20', color: roleInfo.color }}>{roleInfo.label}</span>
                <span style={{ fontWeight: 700, color: '#1e293b' }}>{userName}</span>
              </div>
              <button style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 700, textAlign: 'center', color: '#475569', backgroundColor: 'transparent', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', textTransform: 'uppercase', width: '100%' }} onClick={() => signOut({ callbackUrl: '/login' })}>
                Sign Out
              </button>
            </div>
          ) : (
            <a href="/login" style={{ padding: '12px 24px', backgroundColor: '#2563eb', color: '#ffffff', fontSize: '14px', fontWeight: 700, borderRadius: '4px', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.025em', textAlign: 'center', width: '100%', display: 'block' }}>
              Login
            </a>
          )}
        </div>
      )}

      {/* CSS for Responsiveness and Premium UI */}
      <style>{`
        .nav-pill:hover {
          background-color: #ffffff;
          color: #0f172a !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .portal-btn:hover {
          background-color: #c7d2fe !important;
        }
        @media (max-width: 868px) {
          .hidden-mobile { display: none !important; }
        }
        @media (min-width: 869px) {
          .mobile-toggle { display: none !important; }
          .mobile-menu { display: none !important; }
        }
      `}</style>
    </nav>
  );
}
