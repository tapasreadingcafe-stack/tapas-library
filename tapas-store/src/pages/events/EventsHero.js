import React from 'react';

export default function EventsHero() {
  return (
    <section className="ev-hero" aria-labelledby="ev-hero-h1">
      <div className="ev-hero-inner">
        <div>
          <div className="ev-hero-kicker" aria-hidden="true">
            <span className="ev-hero-dot" />
            Events &amp; Book Clubs
          </div>
          <h1 id="ev-hero-h1" className="ev-hero-title">
            Six clubs, one room,<br />
            <em>all welcome.</em>
          </h1>
        </div>
        <p className="ev-hero-lede">
          Weekly clubs, poetry suppers, and silent reading Saturdays.
          Drop in once as a guest.
        </p>
      </div>
      <svg
        className="ev-hero-curve"
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0,0 C360,80 1080,80 1440,0 L1440,80 L0,80 Z" />
      </svg>
    </section>
  );
}
