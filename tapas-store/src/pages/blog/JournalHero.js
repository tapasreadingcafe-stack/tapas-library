import React from 'react';

export default function JournalHero() {
  return (
    <section className="blog-hero" aria-labelledby="blog-hero-h1">
      <div className="blog-hero-inner">
        <div>
          <div className="blog-hero-kicker" aria-hidden="true">
            <span className="blog-hero-dot" />
            The Journal
          </div>
          <h1 id="blog-hero-h1" className="blog-hero-title">
            Notes from the <em>reading room.</em>
          </h1>
        </div>
        <p className="blog-hero-lede">
          Essays, marginalia, and conversations with writers,
          translators, and cooks. Posted slowly, always from somewhere
          inside the cafe.
        </p>
      </div>
      <svg
        className="blog-hero-curve"
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0,0 C360,80 1080,80 1440,0 L1440,80 L0,80 Z" />
      </svg>
    </section>
  );
}
