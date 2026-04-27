import React, { useReducer } from 'react';
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

export default function SignUp() {
  const [state, dispatch] = useReducer(signupReducer, DEFAULT_SIGNUP_STATE);
  const navigate = useNavigate();

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
                  Create account
                  <span className="su-next-arrow" aria-hidden="true">→</span>
                </button>
              </div>
              {state.errors.consent && (
                <div className="su-error" style={{ marginTop: 12, textAlign: 'right' }}>
                  {state.errors.consent}
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
