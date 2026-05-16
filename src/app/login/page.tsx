'use client';

import { useState } from 'react';
import { getSession, signIn } from 'next-auth/react';

type AuthMode = 'login' | 'signup';

function redirectForRole(role: string | undefined) {
  if (role === 'STAFF') {
    window.location.href = '/staff';
    return;
  }
  if (role === 'ADMIN') {
    window.location.href = '/admin';
    return;
  }
  window.location.href = '/student';
}

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError('');
    setSuccess('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const res = await signIn('credentials', {
      identifier: identifier.trim(),
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError(
        'Unable to sign in. Verify your university ID and password, or register below if this is your first visit.',
      );
      return;
    }

    const session = await getSession();
    const role = (session?.user as { role?: string })?.role;
    redirectForRole(role);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: identifier.trim(), password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || 'Registration could not be completed.');
      return;
    }

    setSuccess('Account created. Signing you in…');

    const signInRes = await signIn('credentials', {
      identifier: identifier.trim(),
      password,
      redirect: false,
    });

    if (signInRes?.error) {
      setSuccess('');
      setError('Account created. Please sign in with the same ID and password.');
      setMode('login');
      return;
    }

    redirectForRole(data.role);
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo">🏛️</div>

        <div className="text-center mb-6">
          <p className="text-xs text-muted" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Debre Birhan University
          </p>
          <h1 style={{ fontSize: '1.75rem', marginTop: 8, marginBottom: 4 }}>
            {mode === 'login' ? 'Login' : 'Sign Up'}
          </h1>
          <p className="text-sm text-sec">Dormitory Operations Portal</p>
        </div>

        <form onSubmit={mode === 'login' ? handleLogin : handleSignUp} className="flex flex-col gap-4">
          <div className="form-group">
            <label className="form-label" htmlFor="identifier">
              University ID
            </label>
            <input
              id="identifier"
              type="text"
              className="form-input"
              autoComplete="username"
              placeholder={mode === 'login' ? 'e.g. dbu1500962, teregna1500901' : 'e.g. dbu1500963, teregna1500999'}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder={mode === 'login' ? 'Password' : 'Choose your password (min. 6 characters)'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === 'signup' ? 6 : 1}
            />
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {success && <div className="alert alert-success">{success}</div>}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading || !identifier.trim() || !password}
            style={{ marginTop: 4 }}
          >
            {loading ? <span className="spinner" /> : null}
            {loading ? ' Please wait…' : mode === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-sec mt-6">
          {mode === 'login' ? (
            <>
              No account?{' '}
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="btn btn-ghost"
                style={{ padding: 0, fontSize: 'inherit', color: 'var(--accent-light)' }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="btn btn-ghost"
                style={{ padding: 0, fontSize: 'inherit', color: 'var(--accent-light)' }}
              >
                Login
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
