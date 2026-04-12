import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';

// =====================================================================
// Login — staff-only gate for the dashboard
// ---------------------------------------------------------------------
// Single email + password form. No signup (staff accounts are provisioned
// by an admin in Supabase Auth + the `staff` table). A forgot-password
// link sends a Supabase reset email.
//
// Accepts `staffStatus` from App.js so it can surface specific errors
// like "not a staff account" or "account deactivated" when an auth
// session was created but rejected by the staff-table check.
// =====================================================================

export default function Login({ staffStatus }) {
  const { login, sessionExpired } = useAuth();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [forgotMode, setForgotMode]   = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent]   = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  // Translate the staff-status sentinel from AuthContext into a user
  // message. Only shown when present — not on every render.
  const staffError = (() => {
    if (!staffStatus) return '';
    if (staffStatus._not_staff)   return 'This account is not registered as staff. Contact your administrator.';
    if (staffStatus._deactivated) return 'This staff account has been deactivated. Contact your administrator.';
    if (staffStatus._error)       return 'Unable to verify your staff profile. Please try again.';
    return '';
  })();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      await login(email.trim().toLowerCase(), password);
      // The AuthContext onAuthStateChange handler loads the staff row
      // and either grants access or flips `staff` into a sentinel; the
      // App.js gate reacts automatically — no navigate() needed here.
    } catch (err) {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    setError('');
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
        forgotEmail.trim().toLowerCase(),
        { redirectTo: window.location.origin }
      );
      if (resetErr) throw resetErr;
      setForgotSent(true);
    } catch (err) {
      setError('Could not send reset email. Check the address and try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'radial-gradient(ellipse at top, #1e293b 0%, #0f172a 60%, #020617 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Atmospheric glows */}
      <div style={{ position: 'absolute', top: '-200px', left: '-200px', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,168,83,0.14), transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-200px', right: '-200px', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(102,126,234,0.14), transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />

      <div style={{
        width: '100%',
        maxWidth: '420px',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Card */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.72)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderRadius: '20px',
          padding: '44px 40px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
          animation: 'fadeUp 480ms cubic-bezier(0.16, 1, 0.3, 1) both',
        }}>
          {/* Logo + title */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '56px', marginBottom: '14px', lineHeight: 1 }}>📚</div>
            <h1 style={{
              margin: '0 0 6px 0',
              fontSize: '24px',
              fontWeight: '800',
              color: '#f8fafc',
              letterSpacing: '-0.02em',
            }}>
              Tapas Reading Cafe
            </h1>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>
              Staff Dashboard
            </p>
          </div>

          {/* Session expired banner */}
          {sessionExpired && !error && !staffError && (
            <Banner tone="warning">
              Session expired due to inactivity. Please sign in again.
            </Banner>
          )}

          {/* Staff-check error (signed into Supabase but not in staff table) */}
          {staffError && !error && (
            <Banner tone="danger">{staffError}</Banner>
          )}

          {/* Login error */}
          {error && <Banner tone="danger">{error}</Banner>}

          {/* ── FORGOT PASSWORD MODE ─────────────────────────────── */}
          {forgotMode ? (
            forgotSent ? (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ fontSize: '44px', marginBottom: '14px' }}>📧</div>
                <h3 style={{ margin: '0 0 10px 0', color: '#f8fafc', fontSize: '18px' }}>Check your email</h3>
                <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '26px', lineHeight: 1.6 }}>
                  We sent a password reset link to<br />
                  <strong style={{ color: '#e2e8f0' }}>{forgotEmail}</strong>
                </p>
                <button
                  onClick={() => { setForgotMode(false); setForgotSent(false); setForgotEmail(''); setError(''); }}
                  style={primaryButtonStyle(false)}
                >
                  ← Back to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword}>
                <h3 style={{ margin: '0 0 6px 0', color: '#f8fafc', fontSize: '17px', fontWeight: '700' }}>Reset Password</h3>
                <p style={{ margin: '0 0 22px 0', color: '#94a3b8', fontSize: '13px' }}>
                  Enter your email and we'll send a reset link.
                </p>
                <Field label="Email">
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="you@tapasreadingcafe.com"
                    required
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#D4A853'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                  />
                </Field>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  style={primaryButtonStyle(forgotLoading)}
                >
                  {forgotLoading ? 'Sending…' : 'Send Reset Link'}
                </button>
                <button
                  type="button"
                  onClick={() => { setForgotMode(false); setError(''); }}
                  style={{
                    width: '100%', marginTop: '10px', padding: '10px',
                    background: 'transparent', color: '#94a3b8', border: 'none',
                    cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                  }}
                >
                  ← Back to Login
                </button>
              </form>
            )
          ) : (
            /* ── NORMAL LOGIN ────────────────────────────────────── */
            <form onSubmit={handleLogin}>
              <Field label="Email">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@tapasreadingcafe.com"
                  required
                  autoComplete="email"
                  autoFocus
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#D4A853'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                />
              </Field>

              <Field label="Password">
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    style={{ ...inputStyle, paddingRight: '44px' }}
                    onFocus={e => e.target.style.borderColor = '#D4A853'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94a3b8',
                      fontSize: '16px',
                      padding: '4px',
                    }}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </Field>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '22px' }}>
                <button
                  type="button"
                  onClick={() => { setForgotMode(true); setError(''); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#D4A853',
                    fontSize: '13px',
                    fontWeight: '600',
                    padding: 0,
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={primaryButtonStyle(loading)}
              >
                {loading ? '⏳ Signing in…' : 'Sign In'}
              </button>
            </form>
          )}
        </div>

        <p style={{
          textAlign: 'center',
          marginTop: '20px',
          fontSize: '12px',
          color: '#64748b',
        }}>
          🔒 Staff access only · Tapas Reading Cafe
        </p>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── Subcomponents / styles ──────────────────────────────────────────────

const inputStyle = {
  width: '100%',
  padding: '13px 16px',
  border: '1.5px solid rgba(255,255,255,0.12)',
  borderRadius: '10px',
  fontSize: '15px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s, background 0.2s',
  fontFamily: 'inherit',
  background: 'rgba(15, 23, 42, 0.6)',
  color: '#f1f5f9',
};

function primaryButtonStyle(disabled) {
  return {
    width: '100%',
    padding: '14px',
    background: disabled ? '#64748b' : 'linear-gradient(135deg, #D4A853 0%, #C49040 100%)',
    color: '#1a0f08',
    border: 'none',
    borderRadius: '10px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: '800',
    fontSize: '15px',
    letterSpacing: '0.3px',
    boxShadow: disabled ? 'none' : '0 8px 24px rgba(212,168,83,0.35)',
    transition: 'transform 0.15s, box-shadow 0.15s',
    fontFamily: 'inherit',
  };
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '18px' }}>
      <label style={{
        display: 'block',
        fontSize: '11px',
        fontWeight: '700',
        color: '#94a3b8',
        marginBottom: '8px',
        letterSpacing: '0.8px',
        textTransform: 'uppercase',
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Banner({ tone, children }) {
  const tones = {
    danger:  { bg: 'rgba(220, 38, 38, 0.15)',  border: 'rgba(220, 38, 38, 0.4)',  color: '#fca5a5' },
    warning: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', color: '#fcd34d' },
    success: { bg: 'rgba(22, 163, 74, 0.15)',  border: 'rgba(22, 163, 74, 0.4)',  color: '#86efac' },
  };
  const t = tones[tone] || tones.danger;
  return (
    <div style={{
      background: t.bg,
      border: `1px solid ${t.border}`,
      borderRadius: '10px',
      padding: '11px 14px',
      marginBottom: '18px',
      fontSize: '13px',
      color: t.color,
      fontWeight: '600',
      lineHeight: 1.5,
    }}>
      {children}
    </div>
  );
}
