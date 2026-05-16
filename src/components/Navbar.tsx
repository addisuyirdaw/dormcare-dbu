'use client';
import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';

interface NavbarProps {
  userName?: string;
  role?: string;
  dormBlock?: string;
  onDuty?: boolean;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  STUDENT: { label: 'Student', color: '#2563eb' },
  STAFF:   { label: 'Staff',   color: '#d97706' },
  ADMIN:   { label: 'Admin',   color: '#16a34a' },
};

export default function Navbar({ userName, role = 'STUDENT', dormBlock, onDuty }: NavbarProps) {
  const roleInfo = ROLE_LABELS[role] ?? ROLE_LABELS.STUDENT;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 50, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', height: '80px', padding: '0 24px', backgroundColor: '#ffffff', borderBottom: '1px solid #f1f5f9', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
        
        {/* Brand (Left) */}
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '16px', textDecoration: 'none', color: '#0f172a' }}>
          <div style={{ width: '44px', height: '44px', background: 'linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0, boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' }}>
            <span style={{ transform: 'translateY(-2px)' }}>🏛️</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }} className="hidden-mobile">
            Debre Birhan University
          </span>
        </a>

        {/* Desktop Links (Pushed far right) */}
        <div className="hidden-mobile" style={{ display: 'flex', alignItems: 'center', gap: '32px', marginLeft: 'auto' }}>
          {!userName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
              <a href="/" style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.025em', color: '#334155', textTransform: 'uppercase', textDecoration: 'none' }}>Home</a>
              <a href="/about" style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.025em', color: '#334155', textTransform: 'uppercase', textDecoration: 'none' }}>About</a>
              <a href="/contact" style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.025em', color: '#334155', textTransform: 'uppercase', textDecoration: 'none' }}>Contact</a>
              <a href="https://www.dbu.edu.et" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, letterSpacing: '0.025em', color: '#4f46e5', textTransform: 'uppercase', textDecoration: 'none', backgroundColor: '#e0e7ff', padding: '6px 12px', borderRadius: '6px', border: '1px solid #c7d2fe' }}>
                🌐 Main DBU Portal
              </a>
            </div>
          )}

          {/* Auth Section */}
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: '16px', paddingLeft: '32px', borderLeft: '1px solid #e2e8f0' }}>
            {userName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {dormBlock && <span style={{ display: 'none' }} data-block={dormBlock} />}
                {role === 'STAFF' && onDuty !== undefined && (
                  <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: onDuty ? '#dcfce7' : '#fee2e2', color: onDuty ? '#166534' : '#991b1b' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: onDuty ? '#22c55e' : '#ef4444' }} />
                    {onDuty ? 'On Duty' : 'Off Duty'}
                  </span>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 700, backgroundColor: roleInfo.color + '20', color: roleInfo.color }}>{roleInfo.label}</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</span>
                </div>
                <button style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 700, color: '#475569', backgroundColor: 'transparent', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.025em' }} onClick={() => signOut({ callbackUrl: '/login' })}>
                  Sign Out
                </button>
              </div>
            ) : pathname !== '/login' ? (
              <a href="/login" style={{ padding: '8px 24px', backgroundColor: '#2563eb', color: '#ffffff', fontSize: '14px', fontWeight: 700, borderRadius: '4px', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.025em', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                Login
              </a>
            ) : null}
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
              <a href="https://www.dbu.edu.et" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4338ca', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.025em', fontSize: '14px', backgroundColor: '#eef2ff', padding: '8px 12px', borderRadius: '6px', textDecoration: 'none' }}>
                🌐 Main DBU Portal
              </a>
              <hr style={{ borderColor: '#f1f5f9', margin: '8px 0', borderStyle: 'solid', borderWidth: '1px 0 0 0' }} />
            </>
          )}
          
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
          ) : pathname !== '/login' ? (
            <a href="/login" style={{ padding: '12px 24px', backgroundColor: '#2563eb', color: '#ffffff', fontSize: '14px', fontWeight: 700, borderRadius: '4px', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.025em', textAlign: 'center', width: '100%', display: 'block' }}>
              Login
            </a>
          ) : null}
        </div>
      )}

      {/* CSS for Responsiveness */}
      <style>{`
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
