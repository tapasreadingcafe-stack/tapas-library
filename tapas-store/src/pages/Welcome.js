import React from 'react';
import { Link } from 'react-router-dom';
import SIGN_UP_CSS from './signUp/signUpStyles';

export default function Welcome() {
  return (
    <div className="su-root">
      <style>{SIGN_UP_CSS}</style>
      <div className="su-stub-page">
        <div className="su-stub-inner">
          <div className="su-kicker" style={{ marginBottom: 16 }}>
            The long table
          </div>
          <h1>Welcome to the <em>long table.</em></h1>
          <p>
            Youâre in. Check your email for the welcome dispatch
            â and weâll see you Thursday at 7p.
          </p>
          <Link to="/events" className="su-stub-back">
            See whatâs on this week â
          </Link>
        </div>
      </div>
    </div>
  );
}
