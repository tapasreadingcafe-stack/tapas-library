import React from 'react';
import { usePage } from '../../cms/hooks';

export default function JournalHero() {
  const { data: page } = usePage('blog');
  const kicker = page?.hero_kicker || 'The Journal';
  const headingHtml = page?.hero_heading_html || 'Notes from the <em>reading room.</em>';
  const lede = page?.hero_lede || 'Essays, marginalia, and conversations. Posted slowly, always from inside the cafe.';
  return (
    <section className="blog-hero" aria-labelledby="blog-hero-h1">
      <div className="blog-hero-inner">
        <div>
          <div className="blog-hero-kicker" aria-hidden="true">
            <span className="blog-hero-dot" />
            {kicker}
          </div>
          <h1
            id="blog-hero-h1"
            className="blog-hero-title"
            dangerouslySetInnerHTML={{ __html: headingHtml }}
          />
        </div>
        <p className="blog-hero-lede">{lede}</p>
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
