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

export default function EventsHero() {
  const { data: page, loading } = usePage('events');
  const ready = !loading && !!page;
  const kicker = decodeEntities(page?.hero_kicker || 'Events & Book Clubs');
  const headingHtml = page?.hero_heading_html || 'Six clubs, one room,<br /><em>all welcome.</em>';
  const lede = page?.hero_lede || 'Weekly clubs, poetry suppers, and silent reading Saturdays. Drop in once as a guest.';
  return (
    <section className="ev-hero" aria-labelledby="ev-hero-h1">
      <div
        className="ev-hero-inner"
        style={{ opacity: ready ? 1 : 0, transition: 'opacity 180ms ease-out' }}
      >
        <div>
          <div
            className="ev-hero-kicker"
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
              className="ev-hero-dot"
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
            id="ev-hero-h1"
            className="ev-hero-title"
            dangerouslySetInnerHTML={{ __html: headingHtml }}
          />
        </div>
        <p className="ev-hero-lede">{lede}</p>
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
