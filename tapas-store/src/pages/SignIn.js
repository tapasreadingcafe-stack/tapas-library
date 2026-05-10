import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

const PINK = '#E0004F';
const PINK_DARK = '#B8003F';
const INK = '#1a1a1a';

const CSS = `
  .auth-page {
    background: #F6F8F7;
    min-height: calc(100vh - 86px);
    padding: 56px 24px 96px;
    font-family: 'Poppins', system-ui, sans-serif;
    display: flex;
    align-items: flex-start;
    justify-content: center;
  }
  .auth-card {
    position: relative;
    width: 100%;
    max-width: 460px;
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.06);
    padding: 40px 36px 32px;
  }
  .auth-back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: transparent;
    border: 0;
    color: #6e6e6e;
    font-family: inherit;
    font-size: 13px;
    font-weight: 500;
    padding: 4px 8px 4px 0;
    margin: 0 0 16px -4px;
    cursor: pointer;
    border-radius: 6px;
    transition: color 150ms;
  }
  .auth-back:hover { color: ${INK}; }
  .auth-head { text-align: center; margin-bottom: 28px; }
  .auth-head h1 {
    margin: 0 0 8px;
    font-weight: 600;
    font-size: 26px;
    color: ${INK};
    letter-spacing: -0.01em;
  }
  .auth-head p {
    margin: 0;
    font-size: 14px;
    color: #6e6e6e;
    line-height: 1.5;
  }
  .auth-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
  .auth-field label {
    font-size: 13px;
    font-weight: 500;
    color: ${INK};
  }
  .auth-input {
    width: 100%;
    border: 1px solid #d6d6d6;
    border-radius: 10px;
    padding: 12px 14px;
    font-family: inherit;
    font-size: 14px;
    color: ${INK};
    background: #fff;
    outline: none;
    transition: border-color 150ms;
  }
  .auth-input:focus { border-color: #8A58DB; }
  .auth-input::placeholder { color: #b0b0b0; }
  .auth-options {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 4px 0 18px;
    font-size: 13px;
  }
  .auth-check { display: inline-flex; align-items: center; gap: 8px; color: ${INK}; cursor: pointer; }
  .auth-check input { width: 16px; height: 16px; accent-color: ${PINK}; }
  .auth-forgot { color: ${PINK}; text-decoration: none; font-weight: 500; }
  .auth-forgot:hover { color: ${PINK_DARK}; }
  .auth-submit {
    width: 100%;
    background: ${PINK};
    color: #fff;
    border: 0;
    border-radius: 999px;
    padding: 14px;
    font-family: inherit;
    font-weight: 600;
    font-size: 14px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 150ms, transform 150ms;
  }
  .auth-submit:hover:not(:disabled) { background: ${PINK_DARK}; transform: translateY(-1px); }
  .auth-submit:disabled { background: #c0c0c0; cursor: not-allowed; }
  .auth-error {
    background: #fde8ec;
    color: #b80042;
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 13px;
    margin-bottom: 14px;
  }
  .auth-divider {
    text-align: center;
    color: #9a9a9a;
    font-size: 12px;
    margin: 20px 0 14px;
    position: relative;
  }
  .auth-divider::before, .auth-divider::after {
    content: '';
    position: absolute; top: 50%;
    width: calc(50% - 70px);
    height: 1px; background: #ececea;
  }
  .auth-divider::before { left: 0; }
  .auth-divider::after { right: 0; }
  .auth-oauth {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .auth-oauth button {
    background: #fff;
    border: 1px solid #d6d6d6;
    border-radius: 10px;
    padding: 11px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 500;
    color: ${INK};
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: border-color 150ms, background 150ms;
  }
  .auth-oauth button:hover { border-color: ${INK}; background: #fafafa; }
  .auth-foot {
    text-align: center;
    margin: 24px 0 0;
    font-size: 13px;
    color: #6e6e6e;
  }
  .auth-foot a { color: ${PINK}; text-decoration: none; font-weight: 600; margin-left: 6px; }
  .auth-foot a:hover { color: ${PINK_DARK}; }
  @media (max-width: 480px) {
    .auth-page { padding: 32px 16px 56px; }
    .auth-card { padding: 32px 24px 24px; border-radius: 14px; }
    .auth-head h1 { font-size: 22px; }
  }
`;

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.4-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 16c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.3 0 10-2 13.6-5.3L31.3 33A12 12 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.4 40 16.1 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4 5.4l6.3 5.3c-.4.4 6.4-4.7 6.4-14.7 0-1.2-.1-2.4-.4-3.5z"/>
  </svg>
);
const AppleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.5-.2-2.9 .9-3.7.9-.8 0-1.9-.9-3.1-.9-1.6 0-3.1.9-3.9 2.4-1.7 2.9-.4 7.2 1.2 9.5.8 1.2 1.7 2.4 2.9 2.4 1.2 0 1.6-.8 3.1-.8 1.4 0 1.8.8 3.1.8 1.3 0 2.1-1.2 2.9-2.4 .9-1.4 1.3-2.7 1.3-2.8-.1 0-2.4-.9-2.4-3.8zM14 5.7c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1 .1 2.2-.6 2.8-1.4z"/>
  </svg>
);

function isValidEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function friendlyError(message) {
  const m = (message || '').toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid grant')) return 'Email or password is incorrect.';
  if (m.includes('email not confirmed')) return 'Please confirm your email first — check your inbox.';
  return message || 'Could not sign in. Please try again.';
}

export default function SignIn() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';
  const { authUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keep, setKeep] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => { if (authUser) navigate(next, { replace: true }); }, [authUser, next, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!isValidEmail(email)) { setError('That email doesn’t look right.'); return; }
    if (!password || password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setError(null);
    setProcessing(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (err) throw err;
      navigate(next, { replace: true });
    } catch (err) {
      setError(friendlyError(err?.message));
    } finally {
      setProcessing(false);
    }
  };

  const onOAuth = async (provider) => {
    setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}${next}` },
      });
      if (err) throw err;
    } catch (err) {
      setError(friendlyError(err?.message));
    }
  };

  return (
    <div className="auth-page">
      <style>{CSS}</style>
      <div className="auth-card">
        <button type="button" className="auth-back" onClick={() => navigate(-1)} aria-label="Go back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>
        <div className="auth-head">
          <h1>Welcome back</h1>
          <p>Sign in to your Tapas account.</p>
        </div>

        {error && <div className="auth-error" role="alert">{error}</div>}

        <form onSubmit={onSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="si-email">Email</label>
            <input
              id="si-email"
              type="email"
              className="auth-input"
              placeholder="you@example.com"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={processing}
            />
          </div>
          <div className="auth-field">
            <label htmlFor="si-password">Password</label>
            <input
              id="si-password"
              type="password"
              className="auth-input"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={processing}
            />
          </div>

          <div className="auth-options">
            <label className="auth-check">
              <input
                type="checkbox"
                checked={keep}
                onChange={(e) => setKeep(e.target.checked)}
                disabled={processing}
              />
              Keep me signed in
            </label>
            <Link to="/forgot-password" className="auth-forgot">Forgot password?</Link>
          </div>

          <button type="submit" className="auth-submit" disabled={processing}>
            {processing ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="auth-divider">Or continue with</div>
        <div className="auth-oauth">
          <button type="button" onClick={() => onOAuth('google')}><GoogleIcon /> Google</button>
          <button type="button" onClick={() => onOAuth('apple')}><AppleIcon /> Apple</button>
        </div>

        <p className="auth-foot">
          Don't have an account?
          <Link to="/sign-up">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
