import React from 'react';
import { THIS_WEEK } from '../../data/signUpConfig';

export default function ThisWeekCard() {
  return (
    <section className="su-week" aria-label="This week">
      <div className="su-week-kicker">This week</div>
      <h3 className="su-week-title">
        Your <em>first</em> possible nights.
      </h3>
      {THIS_WEEK.map((row) => (
        <div key={row.when} className="su-week-row">
          <span className="su-week-dot" aria-hidden="true" />
          <div>
            <div className="su-week-when">{row.when}</div>
            <div className="su-week-copy">
              <em>{row.titleItalic}</em>{row.tail}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
