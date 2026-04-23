import React from 'react';

export default function CartHero() {
  return (
    <section className="ct-hero" aria-labelledby="ct-hero-h1">
      <div className="ct-hero-inner">
        <div>
          <div className="ct-hero-kicker" aria-hidden="true">
            <span className="ct-hero-dot" />
            Your basket
          </div>
          <h1 id="ct-hero-h1" className="ct-hero-title">
            Books waiting<br /><em>to be read.</em>
          </h1>
        </div>
        <p className="ct-hero-lede">
          Free shipping over \u20B9999, or pick up at the cafe. We
          hand-wrap with paper from the Reading Public Library sale,
          and tuck a staff note inside every order.
        </p>
      </div>
      <svg
        className="ct-hero-curve"
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0,0 C360,80 1080,80 1440,0 L1440,80 L0,80 Z" />
      </svg>
    </section>
  );
}
