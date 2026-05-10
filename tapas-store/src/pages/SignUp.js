import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
    max-width: 480px;
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
  .auth-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
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
  .auth-input.is-error { border-color: ${PINK}; }
  .auth-hint { font-size: 12px; color: #9a9a9a; margin: -10px 0 14px; }
  .auth-fielderr { font-size: 12px; color: ${PINK}; margin: 4px 2px 0; }
  .auth-consent {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin: 4px 0 18px;
    font-size: 13px;
    color: ${INK};
    line-height: 1.5;
  }
  .auth-consent input { width: 16px; height: 16px; accent-color: ${PINK}; margin-top: 2px; flex: 0 0 auto; }
  .auth-consent a { color: ${PINK}; text-decoration: none; }
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
    .auth-row { grid-template-columns: 1fr; gap: 0; }
  }
`;

function isValidEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function friendlyError(message) {
  const m = (message || '').toLowerCase();
  if (m.includes('already registered') || m.includes('user already')) {
    return 'An account with that email already exists. Try signing in instead.';
  }
  if (m.includes('weak password') || m.includes('password should')) {
    return 'Password is too weak — try a longer one with mixed characters.';
  }
  return message || 'Could not create your account. Please try again.';
}

export default function SignUp() {
  const navigate = useNavigate();
  const { authUser } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (authUser) navigate('/', { replace: true }); }, [authUser, navigate]);

  const validate = () => {
    const e = {};
    if (!firstName.trim()) e.firstName = 'Required.';
    if (!lastName.trim()) e.lastName = 'Required.';
    if (!isValidEmail(email)) e.email = 'Enter a valid email.';
    if (!password || password.length < 6) e.password = 'At least 6 characters.';
    if (confirm !== password) e.confirm = "Passwords don't match.";
    if (!consent) e.consent = 'Please accept to continue.';
    return e;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSubmitError('');
    setSubmitting(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const { error: err } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { name: fullName },
          emailRedirectTo: `${window.location.origin}/welcome`,
        },
      });
      if (err) throw err;
      navigate('/welcome', { replace: true });
    } catch (err) {
      setSubmitError(friendlyError(err?.message));
    } finally {
      setSubmitting(false);
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
          <h1>Create your account</h1>
          <p>Join Tapas — read together, slow down, share a long table.</p>
        </div>

        {submitError && <div className="auth-error" role="alert">{submitError}</div>}

        <form onSubmit={onSubmit} noValidate>
          <div className="auth-row">
            <div className="auth-field">
              <label htmlFor="su-first">First name</label>
              <input
                id="su-first"
                type="text"
                className={`auth-input${errors.firstName ? ' is-error' : ''}`}
                placeholder="Jane"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={submitting}
              />
              {errors.firstName && <div className="auth-fielderr">{errors.firstName}</div>}
            </div>
            <div className="auth-field">
              <label htmlFor="su-last">Last name</label>
              <input
                id="su-last"
                type="text"
                className={`auth-input${errors.lastName ? ' is-error' : ''}`}
                placeholder="Doe"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={submitting}
              />
              {errors.lastName && <div className="auth-fielderr">{errors.lastName}</div>}
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="su-email">Email</label>
            <input
              id="su-email"
              type="email"
              className={`auth-input${errors.email ? ' is-error' : ''}`}
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />
            {errors.email && <div className="auth-fielderr">{errors.email}</div>}
          </div>

          <div className="auth-field">
            <label htmlFor="su-password">Password</label>
            <input
              id="su-password"
              type="password"
              className={`auth-input${errors.password ? ' is-error' : ''}`}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
            />
            {errors.password && <div className="auth-fielderr">{errors.password}</div>}
          </div>

          <div className="auth-field">
            <label htmlFor="su-confirm">Confirm password</label>
            <input
              id="su-confirm"
              type="password"
              className={`auth-input${errors.confirm ? ' is-error' : ''}`}
              placeholder="Re-enter password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={submitting}
            />
            {errors.confirm && <div className="auth-fielderr">{errors.confirm}</div>}
          </div>

          <label className="auth-consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              disabled={submitting}
            />
            <span>
              I agree to the <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.
            </span>
          </label>
          {errors.consent && <div className="auth-fielderr" style={{ marginTop: -10, marginBottom: 12 }}>{errors.consent}</div>}

          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Sign up'}
          </button>
        </form>

        <p className="auth-foot">
          Already have an account?
          <Link to="/sign-in">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
