import React from 'react';

export default function LibraryHero() {
  return (
    <section className="library-hero" aria-labelledby="library-hero-h1">
      <div className="library-hero-inner">
        <div>
          <div className="library-hero-kicker" aria-hidden="true">
            <span className="library-hero-dot" />
            The Lending Library
          </div>
          <h1 id="library-hero-h1" className="library-hero-title">
            Over <em>2,400 books</em>,<br />free to borrow.
          </h1>
        </div>
        <p className="library-hero-lede">
          Take two home at a time. Three weeks to return. No late
          fees, no paperwork.
        </p>
      </div>
      <svg
        className="library-hero-curve"
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0,0 C360,80 1080,80 1440,0 L1440,80 L0,80 Z" />
      </svg>
    </section>
  );
}
