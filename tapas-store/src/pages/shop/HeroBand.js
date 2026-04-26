import React from 'react';
import { usePage } from '../../cms/hooks';

export default function HeroBand() {
  const { data: page } = usePage('shop');
  const kicker = page?.hero_kicker || 'The Shop';
  const headingHtml = page?.hero_heading_html || 'Books we keep <em>pressing</em> into people’s hands.';
  const lede = page?.hero_lede || 'A considered shelf of new releases, small presses, and staff favorites. Free shipping over ₹999.';
  return (
    <section className="shop-hero-band" aria-labelledby="shop-hero-h1">
      <div className="shop-hero-wrap">
        <div className="shop-hero-left">
          <div
            className="shop-hero-kicker"
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
              className="shop-hero-dot"
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '999px',
                background: '#E0004F',
              }}
            />
            {String(kicker).toUpperCase()}
          </div>
          <h1
            id="shop-hero-h1"
            className="shop-hero-title"
            dangerouslySetInnerHTML={{ __html: headingHtml }}
          />
        </div>
        <p className="shop-hero-lede">{lede}</p>
      </div>
      <svg
        className="shop-hero-curve"
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0,0 C360,80 1080,80 1440,0 L1440,80 L0,80 Z" />
      </svg>
    </section>
  );
}
