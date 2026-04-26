import React from 'react';
import { LIBRARY_FEATURED } from '../../data/libraryBooks';
import { usePage } from '../../cms/hooks';

const SPINE_COLOR = {
  purple: '#8F4FD6',
  ink:    '#1a1a1a',
  orange: '#FF934A',
  pink:   '#E0004F',
  taupe:  '#5b4d3d',
  lime:   '#C9F27F',
};

export default function FeaturedShelf() {
  const { data: page } = usePage('library');
  // Editable copy from pages.library.stats_jsonb.featured; fall back to
  // the hardcoded fixture for spines/CTA which are visual-only.
  const fromDb = page?.stats_jsonb?.featured;
  const f = {
    ...LIBRARY_FEATURED,
    ...(fromDb || {}),
  };
  const onBrowse = (e) => {
    e.preventDefault();
    const target = document.getElementById(f.ctaTarget);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Mirror the link semantic in the URL so deep-links still work.
      window.history.replaceState(null, '', `#${f.ctaTarget}`);
    }
  };

  return (
    <section className="library-featured" aria-labelledby="library-featured-h">
      <div>
        <div className="library-featured-kicker">{f.kicker}</div>
        <h2 id="library-featured-h" className="library-featured-title">
          {f.headline} <em>{f.accent}</em>
        </h2>
        <p className="library-featured-body">{f.body}</p>
        <button type="button" className="library-featured-cta" onClick={onBrowse}>
          <span>{f.ctaLabel}</span>
          <span className="library-featured-cta-arrow" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </span>
        </button>
      </div>

      <div className="library-featured-spines" aria-hidden="true">
        {f.spines.map(([color, height], i) => (
          <div
            key={i}
            className="library-featured-spine"
            style={{
              background: SPINE_COLOR[color] || '#888',
              height: `${height}%`,
            }}
          />
        ))}
      </div>
    </section>
  );
}
