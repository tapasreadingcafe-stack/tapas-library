import React from 'react';
import { Link } from 'react-router-dom';
import SIGN_UP_CSS from './signUp/signUpStyles';

export default function Privacy() {
  return (
    <div className="su-root">
      <style>{SIGN_UP_CSS}</style>
      <div className="su-stub-page">
        <div className="su-stub-inner">
          <div className="su-kicker" style={{ marginBottom: 16 }}>Privacy note</div>
          <h1>The <em>privacy note</em> \u2014 coming soon.</h1>
          <p>
            A plain-language summary of what we store, why, and how
            to delete it is on its way. Email{' '}
            <a href="mailto:hello@tapasreadingcafe.com" style={{ color: '#E0004F' }}>
              hello@tapasreadingcafe.com
            </a>
            {' '}if you\u2019d like anything removed sooner.
          </p>
          <Link to="/sign-up" className="su-stub-back">
            \u2190 Back to the sign-up
          </Link>
        </div>
      </div>
    </div>
  );
}
