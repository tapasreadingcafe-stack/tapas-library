import React from 'react';

export default function ContactHero() {
  return (
    <section className="contact-hero" aria-labelledby="contact-hero-h1">
      <div className="contact-hero-inner">
        <div>
          <div className="contact-hero-kicker" aria-hidden="true">
            <span className="contact-hero-dot" />
            Visit &amp; Contact
          </div>
          <h1 id="contact-hero-h1" className="contact-hero-title">
            Come <em>read with us.</em>
          </h1>
        </div>
        <p className="contact-hero-lede">
          14 Haven Street, right off the square. No reservations for
          reading \u2014 just walk in. For supper events, private
          bookings, and press, use the form below.
        </p>
      </div>
      <svg
        className="contact-hero-curve"
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0,0 C360,80 1080,80 1440,0 L1440,80 L0,80 Z" />
      </svg>
    </section>
  );
}
