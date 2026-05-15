'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const ROLE_CREDENTIALS: Record<string, { email: string; label: string; icon: string }> = {
  STUDENT: { email: 'student1@dbu.edu.et', label: 'Student', icon: '🎓' },
  STAFF:   { email: 'staff1@dbu.edu.et',   label: 'Staff (Teregna)', icon: '🛡️' },
  ADMIN:   { email: 'admin@dbu.edu.et',    label: 'Admin (Proctor)', icon: '👁️' },
};

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'STUDENT' | 'STAFF' | 'ADMIN'>('STUDENT');
  const [email, setEmail] = useState('student1@dbu.edu.et');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRoleChange = (r: 'STUDENT' | 'STAFF' | 'ADMIN') => {
    setRole(r);
    setEmail(ROLE_CREDENTIALS[r].email);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError('Invalid credentials. Please try again.');
    } else {
      router.push(role === 'STUDENT' ? '/student' : role === 'STAFF' ? '/staff' : '/admin');
      router.refresh();
    }
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo">🏛️</div>
        <div className="text-center mb-6">
          <h1 style={{ fontSize: '1.4rem', marginBottom: 4 }}>DBU Dormitory System</h1>
          <p className="text-sm text-sec">Debre Birhan University</p>
        </div>

        {/* Role Tabs */}
        <div className="role-tabs">
          {(['STUDENT', 'STAFF', 'ADMIN'] as const).map((r) => (
            <button
              key={r}
              className={`role-tab ${role === r ? 'active' : ''}`}
              onClick={() => handleRoleChange(r)}
              type="button"
            >
              {ROLE_CREDENTIALS[r].icon} {ROLE_CREDENTIALS[r].label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <button
            id="login-btn"
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
            style={{ marginTop: 4 }}
          >
            {loading ? <span className="spinner" /> : null}
            {loading ? 'Signing in…' : `Sign in as ${ROLE_CREDENTIALS[role].label}`}
          </button>
        </form>

        <div className="divider mt-6" />
        <div className="text-center">
          <p className="text-xs text-muted">
            Demo password: <span className="font-mono text-sec">password123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
