'use client';

import { useState, useEffect, useRef } from 'react';
import { getSession, signIn } from 'next-auth/react';
import Navbar from '@/components/Navbar';

type AuthMode = 'login' | 'signup';

function redirectForRole(role: string | undefined) {
  if (role === 'STAFF') { window.location.href = '/staff'; return; }
  if (role === 'ADMIN') { window.location.href = '/admin'; return; }
  window.location.href = '/student';
}

/* ─── Carousel data ─── */
const slides = [
  {
    icon: '⚡',
    tag: 'POWER CRISIS',
    title: 'Instant Outage Resolution',
    description:
      'No more waiting in the dark. Report electricity failures instantly — our system dispatches maintenance and tracks progress in real-time so every student stays informed.',
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.15)',
    stats: [
      { label: 'Avg. Response', value: '< 8 min' },
      { label: 'Reports Resolved', value: '98%' },
    ],
  },
  {
    icon: '💧',
    tag: 'WATER EMERGENCY',
    title: 'Rapid Leak & Plumbing Fix',
    description:
      'Burst pipe? Blocked drain? One tap raises the alarm. Our automated routing connects the right technician before damage spreads — protecting your room and your peace of mind.',
    color: '#38bdf8',
    glow: 'rgba(56,189,248,0.15)',
    stats: [
      { label: 'Tickets Auto-Routed', value: '100%' },
      { label: 'Avg. Fix Time', value: '22 min' },
    ],
  },
  {
    icon: '🏛️',
    tag: 'UNIFIED ECOSYSTEM',
    title: 'Seamless Dorm Operations',
    description:
      'Students, proctors, maintenance staff, and admins — all on one platform. Gate control, asset tracking, and shift management run effortlessly in a single command centre.',
    color: '#818cf8',
    glow: 'rgba(129,140,248,0.15)',
    stats: [
      { label: 'Active Users', value: '2,400+' },
      { label: 'Uptime', value: '99.9%' },
    ],
  },
];

/* ─── Floating orbs (decorative) ─── */
const orbs = [
  { size: 340, top: '-80px', left: '-80px', color: 'rgba(59,130,246,0.07)', delay: '0s' },
  { size: 220, bottom: '40px', right: '-60px', color: 'rgba(129,140,248,0.09)', delay: '1.4s' },
  { size: 160, top: '45%', left: '55%', color: 'rgba(56,189,248,0.06)', delay: '0.7s' },
];

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);
  const [animKey, setAnimKey] = useState(0); // forces re-mount → re-animation
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Auto-play */
  const startTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setActiveSlide((p) => {
        const next = (p + 1) % slides.length;
        setAnimKey((k) => k + 1);
        return next;
      });
    }, 4000);
  };

  useEffect(() => {
    startTimer();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToSlide = (idx: number) => {
    setActiveSlide(idx);
    setAnimKey((k) => k + 1);
    startTimer(); // reset timer on manual click
  };

  const switchMode = (next: AuthMode) => { setMode(next); setError(''); setSuccess(''); };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    const res = await signIn('credentials', { identifier: identifier.trim(), password, redirect: false });
    setLoading(false);
    if (res?.error) { setError('Invalid university ID or password. Try again or sign up below.'); return; }
    const session = await getSession();
    redirectForRole((session?.user as { role?: string })?.role);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: identifier.trim(), password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || 'Registration failed.'); return; }
    setSuccess('Account created. Signing you in…');
    const signInRes = await signIn('credentials', { identifier: identifier.trim(), password, redirect: false });
    if (signInRes?.error) { setSuccess(''); setError('Account created. Please sign in.'); setMode('login'); return; }
    redirectForRole(data.role);
  };

  const slide = slides[activeSlide];

  return (
    <>
      <style>{`
        /* ── Reset & base ── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── Page shell ── */
        .lp-root {
          min-height: 100dvh;
          width: 100%;
          display: grid;
          grid-template-columns: 1fr;
          background: #020817;
          font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
          overflow-x: hidden;
        }
        @media (min-width: 1024px) {
          .lp-root { grid-template-columns: 5fr 7fr; }
        }

        /* ── LEFT PANEL ── */
        .lp-left {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2.5rem 1.5rem;
          min-height: 100dvh;
          position: relative;
        }
        @media (min-width: 1024px) {
          .lp-left { min-height: unset; padding: 3rem 2rem; }
        }

        /* Subtle left-panel glow */
        .lp-left::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 70% 60% at 50% 0%, rgba(99,102,241,0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        /* ── Card ── */
        .lp-card {
          width: 100%;
          max-width: 420px;
          background: rgba(15,23,42,0.85);
          border: 1px solid rgba(99,102,241,0.18);
          border-radius: 20px;
          padding: 2.5rem 2rem;
          backdrop-filter: blur(20px);
          box-shadow: 0 0 0 1px rgba(99,102,241,0.08), 0 24px 64px rgba(0,0,0,0.5);
          position: relative;
          z-index: 1;
        }

        /* ── Logo badge ── */
        .lp-logo {
          width: 60px; height: 60px;
          background: linear-gradient(135deg, #4f46e5 0%, #2563eb 100%);
          border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.6rem;
          margin: 0 auto 1.5rem;
          box-shadow: 0 0 24px rgba(99,102,241,0.35);
        }

        /* ── Card headings ── */
        .lp-tagline {
          text-align: center;
          font-size: 0.65rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 0.4rem;
        }
        .lp-title {
          text-align: center;
          font-size: 1.75rem;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 0.3rem;
          letter-spacing: -0.02em;
        }
        .lp-subtitle {
          text-align: center;
          font-size: 0.82rem;
          color: #64748b;
          margin-bottom: 2rem;
        }

        /* ── Mode tabs ── */
        .lp-tabs {
          display: flex;
          background: rgba(30,41,59,0.7);
          border: 1px solid rgba(99,102,241,0.1);
          border-radius: 10px;
          padding: 4px;
          margin-bottom: 1.6rem;
        }
        .lp-tab {
          flex: 1;
          padding: 0.5rem;
          border: none;
          border-radius: 7px;
          font-size: 0.82rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.22s;
          background: transparent;
          color: #64748b;
        }
        .lp-tab.active {
          background: linear-gradient(135deg, #4f46e5 0%, #2563eb 100%);
          color: #fff;
          box-shadow: 0 2px 12px rgba(79,70,229,0.35);
        }

        /* ── Form ── */
        .lp-form { display: flex; flex-direction: column; gap: 1rem; }

        .lp-field { display: flex; flex-direction: column; gap: 0.4rem; }
        .lp-label {
          font-size: 0.78rem;
          font-weight: 500;
          color: #94a3b8;
          letter-spacing: 0.04em;
        }
        .lp-input {
          width: 100%;
          padding: 0.7rem 1rem;
          background: rgba(15,23,42,0.9);
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 10px;
          color: #f1f5f9;
          font-size: 0.9rem;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
        }
        .lp-input::placeholder { color: #334155; }
        .lp-input:focus {
          border-color: rgba(99,102,241,0.55);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }

        /* ── Alerts ── */
        .lp-alert {
          padding: 0.65rem 1rem;
          border-radius: 9px;
          font-size: 0.8rem;
          line-height: 1.45;
        }
        .lp-alert-error {
          background: rgba(239,68,68,0.12);
          border: 1px solid rgba(239,68,68,0.3);
          color: #fca5a5;
        }
        .lp-alert-success {
          background: rgba(34,197,94,0.12);
          border: 1px solid rgba(34,197,94,0.3);
          color: #86efac;
        }

        /* ── Submit button ── */
        .lp-btn {
          width: 100%;
          padding: 0.8rem;
          background: linear-gradient(135deg, #4f46e5 0%, #2563eb 100%);
          border: none;
          border-radius: 10px;
          color: #fff;
          font-size: 0.92rem;
          font-weight: 600;
          letter-spacing: 0.03em;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(79,70,229,0.4);
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          margin-top: 0.25rem;
        }
        .lp-btn:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 6px 28px rgba(79,70,229,0.55);
        }
        .lp-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        /* ── Spinner ── */
        .lp-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: lp-spin 0.65s linear infinite;
        }
        @keyframes lp-spin { to { transform: rotate(360deg); } }

        /* ── Switch link ── */
        .lp-switch {
          text-align: center;
          font-size: 0.8rem;
          color: #64748b;
          margin-top: 1.2rem;
        }
        .lp-switch-btn {
          background: none; border: none;
          color: #818cf8; font-size: inherit;
          cursor: pointer; font-weight: 600;
          text-decoration: underline;
          text-decoration-color: transparent;
          transition: text-decoration-color 0.2s;
        }
        .lp-switch-btn:hover { text-decoration-color: #818cf8; }

        /* ── Footer note ── */
        .lp-footer-note {
          text-align: center;
          font-size: 0.7rem;
          color: #1e293b;
          margin-top: 1.5rem;
        }

        /* ══════════════════════════════════════
           RIGHT PANEL — CAROUSEL
        ══════════════════════════════════════ */
        .lp-right {
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: #060d1f;
          border-top: 1px solid #1e293b;
          padding: 3rem 2.5rem;
          position: relative;
          overflow: hidden;
          min-height: 520px;
        }
        @media (min-width: 1024px) {
          .lp-right {
            border-top: none;
            border-left: 1px solid #1e293b;
            padding: 4rem 4.5rem;
            min-height: unset;
          }
        }

        /* ── Orbs ── */
        .lp-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          animation: lp-float 7s ease-in-out infinite alternate;
        }
        @keyframes lp-float {
          from { transform: translateY(0) scale(1); }
          to   { transform: translateY(-28px) scale(1.1); }
        }

        /* ── Brand bar at top ── */
        .lp-brand {
          position: absolute;
          top: 2rem;
          left: 2.5rem;
          display: flex;
          align-items: center;
          gap: 0.6rem;
          z-index: 10;
        }
        @media (min-width: 1024px) {
          .lp-brand { top: 2.5rem; left: 3.5rem; }
        }
        .lp-brand-dot {
          width: 8px; height: 8px;
          background: #22c55e;
          border-radius: 50%;
          box-shadow: 0 0 10px #22c55e;
          animation: lp-pulse 2s ease-in-out infinite;
        }
        @keyframes lp-pulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.6; transform: scale(1.3); }
        }
        .lp-brand-text {
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #475569;
        }

        /* ── Slide content ── */
        .lp-slide-wrapper {
          position: relative;
          z-index: 10;
        }

        .lp-slide-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          padding: 0.45rem 1rem;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          margin-bottom: 1.4rem;
          border: 1px solid transparent;
          transition: background 0.5s, border-color 0.5s, color 0.5s;
        }

        /* Hero icon above title */
        .lp-hero-icon {
          font-size: clamp(3.5rem, 6vw, 5.5rem);
          line-height: 1;
          margin-bottom: 1.2rem;
          display: block;
          filter: drop-shadow(0 0 24px currentColor);
          animation: lp-icon-pop 0.6s cubic-bezier(.16,1,.3,1) both;
        }
        @keyframes lp-icon-pop {
          from { opacity: 0; transform: scale(0.6) translateY(16px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        .lp-slide-icon {
          font-size: 1.2rem;
          display: inline;
        }

        .lp-slide-title {
          font-size: clamp(2rem, 4.5vw, 3.4rem);
          font-weight: 900;
          color: #f1f5f9;
          letter-spacing: -0.04em;
          line-height: 1.05;
          margin-bottom: 1.2rem;
        }

        .lp-slide-desc {
          font-size: clamp(1rem, 1.6vw, 1.2rem);
          color: #94a3b8;
          line-height: 1.75;
          max-width: 560px;
          margin-bottom: 2.2rem;
        }

        /* ── Stats row ── */
        .lp-stats {
          display: flex;
          gap: 2.5rem;
          margin-bottom: 2.5rem;
          flex-wrap: wrap;
        }
        .lp-stat {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          position: relative;
          padding-left: 1rem;
        }
        .lp-stat::before {
          content: '';
          position: absolute;
          left: 0; top: 4px; bottom: 4px;
          width: 2px;
          border-radius: 999px;
          background: currentColor;
          opacity: 0.4;
        }
        .lp-stat-value {
          font-size: clamp(1.8rem, 3vw, 2.4rem);
          font-weight: 900;
          color: #f1f5f9;
          letter-spacing: -0.03em;
          line-height: 1;
        }
        .lp-stat-label {
          font-size: 0.78rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-weight: 500;
        }

        /* ── Progress bar ── */
        .lp-progress-bar {
          height: 3px;
          background: rgba(255,255,255,0.06);
          border-radius: 999px;
          margin-bottom: 2rem;
          overflow: hidden;
        }
        .lp-progress-fill {
          height: 100%;
          border-radius: 999px;
          transition: background 0.5s;
          animation: lp-grow 4s linear forwards;
        }
        @keyframes lp-grow {
          from { width: 0%; }
          to   { width: 100%; }
        }

        /* ── Pagination pills ── */
        .lp-pagination {
          display: flex;
          gap: 0.6rem;
          align-items: center;
        }
        .lp-pill {
          height: 6px;
          border-radius: 999px;
          border: none;
          cursor: pointer;
          transition: width 0.35s, background 0.35s, box-shadow 0.35s;
        }

        /* ── Slide enter animation ── */
        @keyframes lp-slide-up {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lp-animate-in {
          animation: lp-slide-up 0.55s cubic-bezier(.16,1,.3,1) both;
        }

        /* ── Glow aura behind slide ── */
        .lp-aura {
          position: absolute;
          inset: 0;
          pointer-events: none;
          transition: background 0.7s ease;
        }
      `}</style>

      <Navbar />

      <div className="lp-root">
        {/* ══════ LEFT — LOGIN CARD ══════ */}
        <div className="lp-left">
          <div className="lp-card">
            {/* Logo */}
            <div className="lp-logo">🏛️</div>

            {/* Heading */}
            <p className="lp-tagline">Debre Birhan University</p>
            <h1 className="lp-title">{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
            <p className="lp-subtitle">Dormitory Operations Portal</p>

            {/* Mode tabs */}
            <div className="lp-tabs" role="tablist">
              <button
                role="tab"
                aria-selected={mode === 'login'}
                className={`lp-tab${mode === 'login' ? ' active' : ''}`}
                onClick={() => switchMode('login')}
              >
                Login
              </button>
              <button
                role="tab"
                aria-selected={mode === 'signup'}
                className={`lp-tab${mode === 'signup' ? ' active' : ''}`}
                onClick={() => switchMode('signup')}
              >
                Sign Up
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={mode === 'login' ? handleLogin : handleSignUp}
              className="lp-form"
              noValidate
            >
              <div className="lp-field">
                <label className="lp-label" htmlFor="identifier">University ID</label>
                <input
                  id="identifier"
                  type="text"
                  className="lp-input"
                  autoComplete="username"
                  placeholder={
                    mode === 'login'
                      ? 'e.g. dbu1500962, teregna1500901'
                      : 'e.g. dbu1500963, teregna1500999'
                  }
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>

              <div className="lp-field">
                <label className="lp-label" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  className="lp-input"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder={
                    mode === 'login'
                      ? 'Enter your password'
                      : 'Choose a password (min. 6 chars)'
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={mode === 'signup' ? 6 : 1}
                />
              </div>

              {error && <div className="lp-alert lp-alert-error">{error}</div>}
              {success && <div className="lp-alert lp-alert-success">{success}</div>}

              <button
                id="login-submit-btn"
                type="submit"
                className="lp-btn"
                disabled={loading || !identifier.trim() || !password}
              >
                {loading && <span className="lp-spinner" />}
                {loading
                  ? 'Please wait…'
                  : mode === 'login'
                  ? 'Login to Portal'
                  : 'Create Account'}
              </button>
            </form>

            <p className="lp-switch">
              {mode === 'login' ? (
                <>
                  New here?{' '}
                  <button type="button" className="lp-switch-btn" onClick={() => switchMode('signup')}>
                    Create account
                  </button>
                </>
              ) : (
                <>
                  Already registered?{' '}
                  <button type="button" className="lp-switch-btn" onClick={() => switchMode('login')}>
                    Login
                  </button>
                </>
              )}
            </p>
          </div>
        </div>

        {/* ══════ RIGHT — CAROUSEL ══════ */}
        <div className="lp-right">
          {/* Dynamic glow aura */}
          <div
            className="lp-aura"
            style={{
              background: `radial-gradient(ellipse 80% 70% at 50% 100%, ${slide.glow} 0%, transparent 70%)`,
            }}
          />

          {/* Floating orbs — bigger & brighter */}
          <div
            className="lp-orb"
            style={{
              width: 500, height: 500,
              top: -140, left: -140,
              background: slide.glow,
              animationDelay: '0s',
            }}
          />
          <div
            className="lp-orb"
            style={{
              width: 320, height: 320,
              bottom: -60, right: -80,
              background: 'rgba(129,140,248,0.13)',
              animationDelay: '1.4s',
            }}
          />
          <div
            className="lp-orb"
            style={{
              width: 200, height: 200,
              top: '30%', left: '60%',
              background: 'rgba(56,189,248,0.09)',
              animationDelay: '0.7s',
            }}
          />

          {/* Live brand indicator */}
          <div className="lp-brand">
            <span className="lp-brand-dot" />
            <span className="lp-brand-text">DormCare AI • Live</span>
          </div>

          {/* ── Slide Content ── */}
          <div className="lp-slide-wrapper">
            {/* Progress bar */}
            <div className="lp-progress-bar">
              <div
                key={`progress-${animKey}`}
                className="lp-progress-fill"
                style={{ background: slide.color }}
              />
            </div>

            {/* Animated slide body */}
            <div key={`slide-${animKey}`} className="lp-animate-in">
              {/* Tag pill */}
              <span
                className="lp-slide-tag"
                style={{
                  background: `${slide.glow}`,
                  borderColor: `${slide.color}44`,
                  color: slide.color,
                }}
              >
                <span className="lp-slide-icon">{slide.icon}</span>
                {slide.tag}
              </span>

              {/* Giant hero icon */}
              <span
                key={`icon-${animKey}`}
                className="lp-hero-icon"
                style={{ color: slide.color }}
              >
                {slide.icon}
              </span>

              <h2 className="lp-slide-title">{slide.title}</h2>

              <p className="lp-slide-desc">{slide.description}</p>

              {/* Stats */}
              <div className="lp-stats">
                {slide.stats.map((s, i) => (
                  <div className="lp-stat" key={i} style={{ color: slide.color } as React.CSSProperties}>
                    <span className="lp-stat-value" style={{ color: slide.color }}>
                      {s.value}
                    </span>
                    <span className="lp-stat-label">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination pills */}
            <div className="lp-pagination" role="tablist" aria-label="Carousel navigation">
              {slides.map((s, i) => (
                <button
                  key={i}
                  role="tab"
                  aria-selected={activeSlide === i}
                  aria-label={`Slide ${i + 1}: ${s.title}`}
                  className="lp-pill"
                  onClick={() => goToSlide(i)}
                  style={{
                    width: activeSlide === i ? 48 : 10,
                    background: activeSlide === i ? s.color : '#1e293b',
                    boxShadow: activeSlide === i ? `0 0 14px ${s.color}99` : 'none',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
