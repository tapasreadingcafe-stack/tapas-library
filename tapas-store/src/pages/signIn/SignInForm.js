import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../utils/supabase';

function isValidEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.4-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 16c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.3 0 10-2 13.6-5.3L31.3 33A12 12 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.4 40 16.1 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4 5.4l6.3 5.3c-.4.4 6.4-4.7 6.4-14.7 0-1.2-.1-2.4-.4-3.5z"/>
  </svg>
);

export default function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keep, setKeep] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  const onSubmit = (e) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError('That email doesn’t look right.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError(null);
    setProcessing(true);
    // Fake 800ms delay so the button transition reads. Swap this for
    // the real Supabase auth call when wiring it up.
    setTimeout(() => {
      // TODO: wire to Supabase auth. The project already imports
      // @supabase/supabase-js (see src/utils/supabase.js); the call
      // site is `supabase.auth.signInWithPassword({ email, password })`
      // with a redirect to "/" on success.
      // eslint-disable-next-line no-console
      console.log('[sign-in] submit', { email, keep });
      // eslint-disable-next-line no-alert
      window.alert('Sign-in not wired yet — Supabase auth integration pending.');
      setProcessing(false);
    }, 800);
  };

  const onOAuth = async (provider) => {
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (oauthError) setError(oauthError.message);
  };

  return (
    <div className="si-form-wrap">
      <div className="si-kicker">Members · Sign in</div>
      <h1 className="si-title">Welcome <em>back.</em></h1>
      <p className="si-lede">
        Access your borrowings, book club seats, supper reservations,
        and the monthly dispatch.
      </p>

      <form className="si-form" onSubmit={onSubmit} noValidate>
        <div className="si-field">
          <label htmlFor="si-email">Email</label>
          <input
            id="si-email"
            type="email"
            className="si-input"
            placeholder="you@example.com"
            required
            disabled={processing}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="si-field">
          <label htmlFor="si-password">Password</label>
          <input
            id="si-password"
            type="password"
            className="si-input"
            required
            disabled={processing}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="si-options">
          <label className="si-check">
            <input
              type="checkbox"
              checked={keep}
              onChange={(e) => setKeep(e.target.checked)}
              disabled={processing}
            />
            Keep me signed in
          </label>
          <Link to="/forgot-password" className="si-forgot">
            Forgot password?
          </Link>
        </div>

        {error && <div className="si-error" role="alert">{error}</div>}

        <button type="submit" className="si-submit" disabled={processing}>
          {processing ? (
            <>Signing in…</>
          ) : (
            <>
              Sign in
              <span className="si-submit-arrow" aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </span>
            </>
          )}
        </button>
      </form>

      <div className="si-divider" aria-hidden="true">Or continue with</div>

      <div className="si-oauth">
        <button type="button" onClick={() => onOAuth('google')}>
          <GoogleIcon />
          Continue with Google
        </button>
      </div>

      <p className="si-foot">
        Don’t have an account?
        <Link to="/sign-up">Become a member →</Link>
      </p>
    </div>
  );
}
