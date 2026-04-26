import React from 'react';
import { usePage } from '../../cms/hooks';

export default function ContactHero() {
  const { data: page } = usePage('contact');
  const kicker = page?.hero_kicker || 'Visit & Contact';
  const headingHtml = page?.hero_heading_html || 'Come <em>read with us.</em>';
  const lede = page?.hero_lede || '14 Haven Street, right off the square. Walk in anytime.';
  return (
    <section className="contact-hero" aria-labelledby="contact-hero-h1">
      <div className="contact-hero-inner">
        <div>
          <div className="contact-hero-kicker" aria-hidden="true">
            <span className="contact-hero-dot" />
            {kicker}
          </div>
          <h1
            id="contact-hero-h1"
            className="contact-hero-title"
            dangerouslySetInnerHTML={{ __html: headingHtml }}
          />
        </div>
        <p className="contact-hero-lede">{lede}</p>
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
