import React from 'react';
import { Link } from 'react-router-dom';
import SIGN_IN_CSS from './signIn/signInStyles';

// Stub — forgot-password flow lands in the next spec.
export default function ForgotPassword() {
  return (
    <div className="si-root">
      <style>{SIGN_IN_CSS}</style>
      <div className="si-stub">
        <div className="si-stub-inner">
          <div className="si-kicker">Password help</div>
          <h1>Forgot password flow <em>coming soon.</em></h1>
          <p>
            We&rsquo;ll email a reset link here once this is wired up.
            For now, drop a note to <a href="mailto:hello@tapasreadingcafe.com" style={{ color: '#E0004F' }}>hello@tapasreadingcafe.com</a>
            {' '}and we&rsquo;ll sort it.
          </p>
          <Link to="/sign-in" className="si-stub-back">&larr; Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
