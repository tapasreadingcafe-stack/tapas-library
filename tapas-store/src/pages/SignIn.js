import React from 'react';
import SignInForm from './signIn/SignInForm';
import MemberCardIllustration from './signIn/MemberCardIllustration';
import TestimonialCard from './signIn/TestimonialCard';
import SIGN_IN_CSS from './signIn/signInStyles';

export default function SignIn() {
  return (
    <div className="si-root">
      <style>{SIGN_IN_CSS}</style>
      <div className="si-split">
        <div className="si-left">
          <SignInForm />
        </div>
        <div className="si-right" aria-hidden="false">
          <span className="si-shape si-shape-pink" aria-hidden="true" />
          <span className="si-shape si-shape-orange" aria-hidden="true" />
          <MemberCardIllustration />
          <TestimonialCard />
        </div>
      </div>
    </div>
  );
}
