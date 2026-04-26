import React from 'react';
import { usePage } from '../../cms/hooks';

export default function AboutHero() {
  const { data: page } = usePage('about');
  const kicker = page?.hero_kicker || 'About Us';
  const headingHtml = page?.hero_heading_html || 'A small room<br /><em>for big books.</em>';
  const lede = page?.hero_lede || 'A library-cafe on Haven Street since 2021. Six clubs, 2,400 books, one long table.';
  return (
    <section className="ab-hero" aria-labelledby="ab-hero-h1">
      <div className="ab-hero-inner">
        <div>
          <div
            className="ab-hero-kicker"
            aria-hidden="true"
            style={{
              fontFamily: '"JetBrains Mono", ui-monospace, monospace',
              fontSize: '12px',
              fontWeight: 400,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#3a3a3a',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '14px',
            }}
          >
            <span
              className="ab-hero-dot"
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '999px',
                background: '#E0004F',
              }}
            />
            {kicker}
          </div>
          <h1
            id="ab-hero-h1"
            className="ab-hero-title"
            dangerouslySetInnerHTML={{ __html: headingHtml }}
          />
        </div>
        <p className="ab-hero-lede">{lede}</p>
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
