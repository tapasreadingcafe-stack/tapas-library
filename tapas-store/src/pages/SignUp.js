import React, { useReducer } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SignUpHeading from './signUp/SignUpHeading';
import PricingTiers from './signUp/PricingTiers';
import SignUpStepper from './signUp/SignUpStepper';
import StepAboutYou from './signUp/StepAboutYou';
import StepYourReading from './signUp/StepYourReading';
import StepPayment from './signUp/StepPayment';
import ThisWeekCard from './signUp/ThisWeekCard';
import InfoCards from './signUp/InfoCards';
import MemberCard, { MEMBER_CARD_CSS } from '../components/MemberCard';
import SIGN_UP_CSS from './signUp/signUpStyles';
import {
  signupReducer, DEFAULT_SIGNUP_STATE,
  validateStep1, validateStep3,
} from './signUp/signupReducer';
import { tierByKey } from '../data/signUpConfig';

export default function SignUp() {
  const [state, dispatch] = useReducer(signupReducer, DEFAULT_SIGNUP_STATE);
  const navigate = useNavigate();

  const onContinue = () => {
    if (state.step === 1) {
      const errs = validateStep1(state);
      if (Object.keys(errs).length > 0) {
        dispatch({ type: 'SET_ERRORS', errors: errs });
        return;
      }
      dispatch({ type: 'SET_ERRORS', errors: {} });
      dispatch({ type: 'GOTO_STEP', step: 2 });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (state.step === 2) {
      dispatch({ type: 'GOTO_STEP', step: 3 });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (state.step === 3) {
      const errs = validateStep3(state);
      if (Object.keys(errs).length > 0) {
        dispatch({ type: 'SET_ERRORS', errors: errs });
        return;
      }
      // TODO: wire to Supabase user creation + Razorpay/Stripe
      // subscription + Kit/Mailchimp tag assignment (use
      // preferredClub + readingTags as tag inputs).
      // eslint-disable-next-line no-console
      console.log('[sign-up] submit', state);
      navigate('/welcome');
    }
  };

  const onBack = () => {
    if (state.step > 1) {
      dispatch({ type: 'GOTO_STEP', step: state.step - 1 });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const currentTier = tierByKey(state.tier);
  const ctaLabel = state.step < 3
    ? 'Continue'
    : `Start membership Â· ${currentTier.paymentLabel}`;

  const canContinue = !state.consent ? false : true;

  return (
    <div className="su-root">
      <style>{SIGN_UP_CSS}</style>
      <style>{MEMBER_CARD_CSS}</style>

      <div className="su-wrap">
        <div className="su-grid">
          <div>
            <SignUpHeading />
            <PricingTiers
              tier={state.tier}
              onTier={(t) => dispatch({ type: 'SET_TIER', tier: t })}
            />

            <form
              className="su-form"
              onSubmit={(e) => { e.preventDefault(); onContinue(); }}
              noValidate
            >
              <SignUpStepper
                step={state.step}
                onGoto={(s) => dispatch({ type: 'GOTO_STEP', step: s })}
              />

              {state.step === 1 && (
                <StepAboutYou state={state} dispatch={dispatch} errors={state.errors} />
              )}
              {state.step === 2 && (
                <StepYourReading state={state} dispatch={dispatch} />
              )}
              {state.step === 3 && (
                <StepPayment state={state} dispatch={dispatch} errors={state.errors} />
              )}

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
                    Iâve read the{' '}
                    <Link to="/code-of-the-room">code of the room</Link>{' '}
                    and the{' '}
                    <Link to="/privacy">privacy note</Link>.
                  </span>
                </label>
                <div style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
                  {state.step > 1 && (
                    <button type="button" className="su-back" onClick={onBack}>
                      â Back
                    </button>
                  )}
                  <button
                    type="submit"
                    className={`su-next${state.step === 3 ? ' is-final' : ''}`}
                    disabled={!canContinue}
                  >
                    {ctaLabel}
                    <span className="su-next-arrow" aria-hidden="true">â</span>
                  </button>
                </div>
              </div>
              {state.errors.consent && (
                <div className="su-error" style={{ marginTop: 12, textAlign: 'right' }}>
                  {state.errors.consent}
                </div>
              )}
            </form>

            <p className="su-below-form">
              Already a member?
              <Link to="/sign-in">Sign in â</Link>
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
