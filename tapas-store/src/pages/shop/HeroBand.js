import React from 'react';

export default function HeroBand() {
  return (
    <section className="shop-hero-band" aria-labelledby="shop-hero-h1">
      <div className="shop-hero-wrap">
        <div className="shop-hero-left">
          <div className="shop-hero-kicker" aria-hidden="true">
            <span className="shop-hero-dot" />
            The Shop
          </div>
          <h1 id="shop-hero-h1" className="shop-hero-title">
            Books we keep <em>pressing</em> into people\u2019s hands.
          </h1>
        </div>
        <p className="shop-hero-lede">
          A small, considered shelf \u2014 new releases, small presses, and staff
          favorites. Every title here has a paragraph from one of us
          explaining why. Free shipping over \u20B9999, or pick up at the cafe.
        </p>
      </div>
      <svg
        className="shop-hero-curve"
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0,0 C360,80 1080,80 1440,0 L1440,80 L0,80 Z" />
      </svg>
    </section>
  );
}
