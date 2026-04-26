import React from 'react';
import { usePage } from '../../cms/hooks';

export default function CartHero() {
  const { data: page } = usePage('cart');
  const kicker = page?.hero_kicker || 'Your basket';
  const headingHtml = page?.hero_heading_html || 'Books waiting<br /><em>to be read.</em>';
  const lede = page?.hero_lede || 'Free shipping over ₹999, or pick up at the cafe.';
  return (
    <section className="ct-hero" aria-labelledby="ct-hero-h1">
      <div className="ct-hero-inner">
        <div>
          <div className="ct-hero-kicker" aria-hidden="true">
            <span className="ct-hero-dot" />
            {kicker}
          </div>
          <h1
            id="ct-hero-h1"
            className="ct-hero-title"
            dangerouslySetInnerHTML={{ __html: headingHtml }}
          />
        </div>
        <p className="ct-hero-lede">{lede}</p>
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
