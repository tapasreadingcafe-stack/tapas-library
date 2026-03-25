import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';

export default function Login() {
  const { login, user, sessionExpired } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password state
  const [forgotMode, setForgotMode]   = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent]   = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      await login(email.trim().toLowerCase(), password);
      // If remember me is unchecked, set a flag to expire on tab close
      if (!rememberMe) {
        sessionStorage.setItem('tapas_session_only', '1');
      } else {
        sessionStorage.removeItem('tapas_session_only');
      }
      navigate('/', { replace: true });
    } catch (err) {
      setError('Invalid email or password. Please try again.');
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

  const inputStyle = {
    width: '100%', padding: '11px 14px', border: '1.5px solid #e0e0e0',
    borderRadius: '8px', fontSize: '15px', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
  };

  const labelStyle = {
    display: 'block', fontSize: '12px', fontWeight: '700',
    color: '#888', marginBottom: '6px', letterSpacing: '0.5px',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
    }}>
      <div style={{
        background: 'white', borderRadius: '16px', padding: '40px',
        width: '100%', maxWidth: '420px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>

        {/* Logo + Title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '52px', marginBottom: '10px', lineHeight: 1 }}>📚</div>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '26px', fontWeight: '800', color: '#1a1a2e' }}>
            Tapas Library
          </h1>
          <p style={{ margin: 0, color: '#aaa', fontSize: '13px' }}>Staff Management System</p>
        </div>

        {/* Session expired banner */}
        {sessionExpired && !error && (
          <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '10px 14px', marginBottom: '18px', fontSize: '13px', color: '#856404', fontWeight: '600' }}>
            Session expired due to inactivity. Please sign in again.
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '8px', padding: '10px 14px', marginBottom: '18px', fontSize: '13px', color: '#721c24', fontWeight: '600' }}>
            {error}
          </div>
        )}

        {/* ── FORGOT PASSWORD MODE ── */}
        {forgotMode ? (
          forgotSent ? (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📧</div>
              <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>Check your email</h3>
              <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px' }}>
                We sent a password reset link to <strong>{forgotEmail}</strong>
              </p>
              <button
                onClick={() => { setForgotMode(false); setForgotSent(false); setForgotEmail(''); setError(''); }}
                style={{ padding: '10px 24px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
              >
                Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword}>
              <h3 style={{ margin: '0 0 6px 0', color: '#333', fontSize: '18px' }}>Reset Password</h3>
              <p style={{ margin: '0 0 20px 0', color: '#888', fontSize: '13px' }}>
                Enter your email and we'll send a reset link.
              </p>
              <div style={{ marginBottom: '18px' }}>
                <label style={labelStyle}>EMAIL</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="you@tapaslibrary.com"
                  required
                  style={inputStyle}
                />
              </div>
              <button
                type="submit"
                disabled={forgotLoading}
                style={{ width: '100%', padding: '12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '15px', marginBottom: '12px' }}
              >
                {forgotLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <button
                type="button"
                onClick={() => { setForgotMode(false); setError(''); }}
                style={{ width: '100%', padding: '10px', background: 'transparent', color: '#667eea', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
              >
                ← Back to Login
              </button>
            </form>
          )
        ) : (
          /* ── NORMAL LOGIN MODE ── */
          <form onSubmit={handleLogin}>
            {/* Email */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@tapaslibrary.com"
                required
                autoComplete="email"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#667eea'}
                onBlur={e => e.target.style.borderColor = '#e0e0e0'}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>PASSWORD</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  style={{ ...inputStyle, paddingRight: '44px' }}
                  onFocus={e => e.target.style.borderColor = '#667eea'}
                  onBlur={e => e.target.style.borderColor = '#e0e0e0'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '16px', padding: '0' }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#555', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#667eea' }}
                />
                Remember me for 7 days
              </label>
              <button
                type="button"
                onClick={() => { setForgotMode(true); setError(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#667eea', fontSize: '13px', fontWeight: '600', padding: 0 }}
              >
                Forgot password?
              </button>
            </div>

            {/* Login button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px',
                background: loading ? '#a0aec0' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white', border: 'none', borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '700', fontSize: '16px',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(102,126,234,0.4)',
                transition: 'all 0.2s',
              }}
            >
              {loading ? '⏳ Signing in...' : 'Sign In'}
            </button>

            <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#ccc' }}>
              No account? Contact your administrator.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
