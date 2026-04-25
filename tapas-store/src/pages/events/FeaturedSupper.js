import React from 'react';
import { FEATURED_SUPPER, actionMessage } from '../../data/eventsData';

export default function FeaturedSupper() {
  const s = FEATURED_SUPPER;
  const onReserve = () => {
    // TODO: wire to a real booking endpoint.
    // eslint-disable-next-line no-console
    console.log('[events] action', { slug: s.slug, action: s.cta.action });
    // eslint-disable-next-line no-alert
    window.alert(actionMessage(s.cta.action, { time: 'Fri · 8:00p' }));
  };
  return (
    <section className="ev-supper" aria-labelledby="ev-supper-h">
      <div>
        <div className="ev-supper-kicker">{s.kicker.toUpperCase()}</div>
        <h2 id="ev-supper-h" className="ev-supper-title">
          {s.titleLead}<em>{s.titleItalic}</em>
        </h2>
        <p className="ev-supper-body">{s.body}</p>
        <button type="button" className="ev-supper-cta" onClick={onReserve}>
          {s.cta.label}
          <span className="ev-supper-cta-arrow" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </span>
        </button>
      </div>

      <aside className="ev-menu" aria-label="Menu">
        <div className="ev-menu-kicker">The menu</div>
        <h3 className="ev-menu-title">Read &amp; eaten, May 8.</h3>
        <ol className="ev-menu-list">
          {s.menu.map((c) => (
            <li key={c.n} className="ev-menu-row">
              <span className="ev-menu-n">{c.n}</span>
              <span className="ev-menu-dish">
                {c.dish}
                <i>{c.poem}</i>
              </span>
              <span className="ev-menu-bullet" aria-hidden="true">\u2022</span>
            </li>
          ))}
        </ol>
      </aside>
    </section>
  );
}
