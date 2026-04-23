import React from 'react';
import { Link } from 'react-router-dom';
import SIGN_UP_CSS from './signUp/signUpStyles';

export default function CodeOfTheRoom() {
  return (
    <div className="su-root">
      <style>{SIGN_UP_CSS}</style>
      <div className="su-stub-page">
        <div className="su-stub-inner">
          <div className="su-kicker" style={{ marginBottom: 16 }}>House rules</div>
          <h1>The <em>code of the room</em> \u2014 coming soon.</h1>
          <p>
            The long version of what makes this room work lives here
            when it\u2019s written. For now: be kind, read slowly,
            whisper after eight, and don\u2019t fold the pages.
          </p>
          <Link to="/sign-up" className="su-stub-back">
            \u2190 Back to the sign-up
          </Link>
        </div>
      </div>
    </div>
  );
}
