import React, { useReducer, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SignUpHeading from './signUp/SignUpHeading';
import StepAboutYou from './signUp/StepAboutYou';
import ThisWeekCard from './signUp/ThisWeekCard';
import InfoCards from './signUp/InfoCards';
import SIGN_UP_CSS from './signUp/signUpStyles';
import {
  signupReducer, DEFAULT_SIGNUP_STATE, validateStep1,
} from './signUp/signupReducer';
import { supabase } from '../utils/supabase';

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.4-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 16c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.3 0 10-2 13.6-5.3L31.3 33A12 12 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.4 40 16.1 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4 5.4l6.3 5.3c-.4.4 6.4-4.7 6.4-14.7 0-1.2-.1-2.4-.4-3.5z"/>
  </svg>
);

export default function SignUp() {
  const [state, dispatch] = useReducer(signupReducer, DEFAULT_SIGNUP_STATE);
  const [oauthError, setOauthError] = useState(null);
  const navigate = useNavigate();

  const onGoogle = async () => {
    setOauthError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setOauthError(error.message);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const errs = validateStep1(state);
    if (Object.keys(errs).length > 0) {
      dispatch({ type: 'SET_ERRORS', errors: errs });
      return;
    }
    dispatch({ type: 'SET_ERRORS', errors: {} });
    // TODO: wire to Supabase user creation.
    // eslint-disable-next-line no-console
    console.log('[sign-up] submit', state);
    navigate('/welcome');
  };

  const canContinue = !!state.consent;

  return (
    <div className="su-root">
      <style>{SIGN_UP_CSS}</style>

      <div className="su-wrap">
        <div className="su-grid">
          <div>
            <SignUpHeading />

            <form className="su-form" onSubmit={onSubmit} noValidate>
              <StepAboutYou state={state} dispatch={dispatch} errors={state.errors} />

              <div className="su-actions">
                <label className="su-consent">
                  <input
                    type="checkbox"
                    checked={state.consent}
                    onChange={(e) =>
                      dispatch({ type: 'SET_CONSENT', value: e.target.checked })
                    }
                  />
                  <span>
                    I’ve read the{' '}
                    <Link to="/code-of-the-room">code of the room</Link>{' '}
                    and the{' '}
                    <Link to="/privacy">privacy note</Link>.
                  </span>
                </label>
                <button
                  type="submit"
                  className="su-next is-final"
                  disabled={!canContinue}
                >
                  Create account
                  <span className="su-next-arrow" aria-hidden="true">→</span>
                </button>
              </div>
              {state.errors.consent && (
                <div className="su-error" style={{ marginTop: 12, textAlign: 'right' }}>
                  {state.errors.consent}
                </div>
              )}

              <div className="su-divider" aria-hidden="true">Or</div>
              <div className="su-oauth">
                <button type="button" className="su-oauth-btn" onClick={onGoogle}>
                  <GoogleIcon />
                  Continue with Google
                </button>
                {oauthError && <div className="su-error" role="alert" style={{ marginTop: 12 }}>{oauthError}</div>}
              </div>
            </form>

            <p className="su-below-form">
              Already have an account?
              <Link to="/sign-in">Sign in →</Link>
            </p>
          </div>

          <aside className="su-side">
            <ThisWeekCard />
            <InfoCards />
          </aside>
        </div>
      </div>
    </div>
  );
}
