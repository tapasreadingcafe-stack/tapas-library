import React, { useReducer, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SignUpHeading from './signUp/SignUpHeading';
import StepAboutYou from './signUp/StepAboutYou';
import ThisWeekCard from './signUp/ThisWeekCard';
import InfoCards from './signUp/InfoCards';
import MemberCard, { MEMBER_CARD_CSS } from '../components/MemberCard';
import SIGN_UP_CSS from './signUp/signUpStyles';
import {
  signupReducer, DEFAULT_SIGNUP_STATE, validateStep1,
} from './signUp/signupReducer';
import { supabase } from '../utils/supabase';

function friendlySignupError(message) {
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
  const [state, dispatch] = useReducer(signupReducer, DEFAULT_SIGNUP_STATE);
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = validateStep1(state);
    if (Object.keys(errs).length > 0) {
      dispatch({ type: 'SET_ERRORS', errors: errs });
      return;
    }
    if (!state.consent) {
      dispatch({ type: 'SET_ERRORS', errors: { consent: 'Required.' } });
      return;
    }
    dispatch({ type: 'SET_ERRORS', errors: {} });
    setSubmitError('');
    setSubmitting(true);
    try {
      const { firstName, lastName, email, phone, password } = state.aboutYou;
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const { error: err } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          // Stamped on auth.users.raw_user_meta_data so the
          // handle_auth_user_insert trigger can populate the
          // members row (see 20260411_ecommerce.sql).
          data: {
            name: fullName,
            phone: phone || null,
            preferred_club: state.aboutYou.preferredClub || null,
            reading_tags: state.aboutYou.readingTags || [],
          },
          emailRedirectTo: `${window.location.origin}/welcome`,
        },
      });
      if (err) throw err;
      // If email confirmation is required, the session won't be live
      // yet — surface that on the welcome page instead of silently
      // bouncing to a logged-out homepage.
      navigate('/welcome');
    } catch (err) {
      setSubmitError(friendlySignupError(err?.message));
    } finally {
      setSubmitting(false);
    }
  };

  const canContinue = !!state.consent && !submitting;

  return (
    <div className="su-root">
      <style>{SIGN_UP_CSS}</style>
      <style>{MEMBER_CARD_CSS}</style>

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
                  {submitting ? 'Creating account…' : 'Create account'}
                  <span className="su-next-arrow" aria-hidden="true">→</span>
                </button>
              </div>
              {state.errors.consent && (
                <div className="su-error" style={{ marginTop: 12, textAlign: 'right' }}>
                  {state.errors.consent}
                </div>
              )}
              {submitError && (
                <div className="su-error" role="alert" style={{ marginTop: 12, textAlign: 'right' }}>
                  {submitError}
                </div>
              )}
            </form>

            <p className="su-below-form">
              Already have an account?
              <Link to="/sign-in">Sign in →</Link>
            </p>
          </div>

          <aside className="su-side">
            <MemberCard
              variant="stacked"
              showPerforations
              cardNumber="No. 0318"
            />
            <ThisWeekCard />
            <InfoCards />
          </aside>
        </div>
      </div>
    </div>
  );
}
