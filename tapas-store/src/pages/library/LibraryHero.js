import React from 'react';
import { usePage } from '../../cms/hooks';

export default function LibraryHero() {
  const { data: page } = usePage('library');
  const kicker = page?.hero_kicker || 'The Lending Library';
  const headingHtml = page?.hero_heading_html || 'Over <em>2,400 books</em>,<br />free to borrow.';
  const lede = page?.hero_lede || 'Take two home at a time. Three weeks to return. No late fees, no paperwork.';
  return (
    <section className="library-hero" aria-labelledby="library-hero-h1">
      <div className="library-hero-inner">
        <div>
          <div className="library-hero-kicker" aria-hidden="true">
            <span className="library-hero-dot" />
            {kicker}
          </div>
          <h1
            id="library-hero-h1"
            className="library-hero-title"
            dangerouslySetInnerHTML={{ __html: headingHtml }}
          />
        </div>
        <p className="library-hero-lede">{lede}</p>
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
