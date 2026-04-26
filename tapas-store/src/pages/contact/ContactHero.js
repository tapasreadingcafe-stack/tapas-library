import React from 'react';
import { usePage } from '../../cms/hooks';

const decodeEntities = (s) =>
  String(s ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");

export default function ContactHero() {
  const { data: page } = usePage('contact');
  const kicker = decodeEntities(page?.hero_kicker || 'Visit & Contact');
  const headingHtml = page?.hero_heading_html || 'Come <em>read with us.</em>';
  const lede = page?.hero_lede || '14 Haven Street, right off the square. Walk in anytime.';
  return (
    <section className="contact-hero" aria-labelledby="contact-hero-h1">
      <div className="contact-hero-inner">
        <div>
          <div
            className="contact-hero-kicker"
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
              className="contact-hero-dot"
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
