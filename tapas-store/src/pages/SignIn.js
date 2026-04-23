import React from 'react';
import SignInForm from './signIn/SignInForm';
import MemberCard, { MEMBER_CARD_CSS } from '../components/MemberCard';
import TestimonialCard from './signIn/TestimonialCard';
import SIGN_IN_CSS from './signIn/signInStyles';

export default function SignIn() {
  return (
    <div className="si-root">
      <style>{SIGN_IN_CSS}</style>
      <style>{MEMBER_CARD_CSS}</style>
      <div className="si-split">
        <div className="si-left">
          <SignInForm />
        </div>
        <div className="si-right" aria-hidden="false">
          <span className="si-shape si-shape-pink" aria-hidden="true" />
          <span className="si-shape si-shape-orange" aria-hidden="true" />
          <MemberCard
            className="si-memcard"
            variant="compact"
            priceLine="\u20B9467 / month \u00b7 cancel anytime"
          />
          <TestimonialCard />
        </div>
      </div>
    </div>
  );
}
