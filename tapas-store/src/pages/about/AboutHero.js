import React from 'react';

export default function AboutHero() {
  return (
    <section className="ab-hero" aria-labelledby="ab-hero-h1">
      <div className="ab-hero-inner">
        <div>
          <div className="ab-hero-kicker" aria-hidden="true">
            <span className="ab-hero-dot" />
            About Us
          </div>
          <h1 id="ab-hero-h1" className="ab-hero-title">
            A small room<br />
            <em>for big books.</em>
          </h1>
        </div>
        <p className="ab-hero-lede">
          A library-cafe on Haven Street, open since 2021. We cook,
          we pour, we press books into hands. Six clubs, 2,400 books,
          one long table, and a door thatâs nearly always open.
        </p>
      </div>
      <svg
        className="ab-hero-curve"
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0,0 C360,80 1080,80 1440,0 L1440,80 L0,80 Z" />
      </svg>
    </section>
  );
}
