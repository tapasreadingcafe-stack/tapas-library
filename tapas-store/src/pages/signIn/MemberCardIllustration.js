import React from 'react';

const PERKS = [
  'Priority seats at all six weekly clubs',
  '10% off every book, 20% on member picks',
  'A quarterly book, chosen for you by Ava',
  'Early access to prix-fixe suppers',
  'A named seat at the long walnut table',
];

export default function MemberCardIllustration() {
  return (
    <aside className="si-card" aria-label="Member card preview">
      <header className="si-card-head">
        <span>Member card \u00b7 2026</span>
        <span>No. 0318</span>
      </header>
      <h3 className="si-card-title">The <em>perks,</em> all of them.</h3>
      <ul className="si-card-list">
        {PERKS.map((p) => (
          <li key={p}>
            <span className="si-card-bullet" aria-hidden="true" />
            {p}
          </li>
        ))}
      </ul>
      <div className="si-card-foot">
        <span>\u20B9350 / month \u00b7 cancel anytime</span>
        <span className="si-card-foot-plus" aria-hidden="true">+</span>
      </div>
    </aside>
  );
}
