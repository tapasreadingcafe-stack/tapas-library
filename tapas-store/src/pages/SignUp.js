import React from 'react';
import { Link } from 'react-router-dom';
import SIGN_IN_CSS from './signIn/signInStyles';

// Stub — full sign-up flow lands in the next spec.
export default function SignUp() {
  return (
    <div className="si-root">
      <style>{SIGN_IN_CSS}</style>
      <div className="si-stub">
        <div className="si-stub-inner">
          <div className="si-kicker">Become a <em style={{ color: '#8F4FD6', fontStyle: 'italic' }}>member</em></div>
          <h1>Sign-up flow <em>coming soon.</em></h1>
          <p>
            We&rsquo;re wiring up the member sign-up in the next pass.
            In the meantime, email <a href="mailto:hello@tapasreadingcafe.com" style={{ color: '#E0004F' }}>hello@tapasreadingcafe.com</a>
            {' '}and we&rsquo;ll set you up by hand.
          </p>
          <Link to="/sign-in" className="si-stub-back">&larr; Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
