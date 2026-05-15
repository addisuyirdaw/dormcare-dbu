'use client';
import { signOut } from 'next-auth/react';

interface NavbarProps {
  userName?: string;
  role?: string;
  dormBlock?: string;
  onDuty?: boolean;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  STUDENT: { label: 'Student',       color: 'badge-blue' },
  STAFF:   { label: 'Staff · Teregna', color: 'badge-amber' },
  ADMIN:   { label: 'Admin · Proctor', color: 'badge-green' },
};

export default function Navbar({ userName, role = 'STUDENT', dormBlock, onDuty }: NavbarProps) {
  const roleInfo = ROLE_LABELS[role] ?? ROLE_LABELS.STUDENT;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand">
          <div className="navbar-logo">🏛️</div>
          <span>DBU Dormitory</span>
        </div>

        <div className="navbar-right">
          {dormBlock && (
            <span className="text-sm text-sec" style={{ display: 'none' }} data-block={dormBlock} />
          )}
          {role === 'STAFF' && onDuty !== undefined && (
            <span className={`badge ${onDuty ? 'badge-green' : 'badge-red'}`}>
              <span
                className={`shift-indicator ${onDuty ? 'active' : 'inactive'}`}
                style={{ width: 8, height: 8 }}
              />
              {onDuty ? 'On Duty' : 'Off Duty'}
            </span>
          )}
          <span className={`badge ${roleInfo.color}`}>{roleInfo.label}</span>
          <span className="navbar-user" style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userName}
          </span>
          <button
            id="logout-btn"
            className="btn btn-ghost btn-sm"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}
