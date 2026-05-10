import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageBreadcrumb from '../components/PageBreadcrumb';
import { UPCOMING_EVENTS, actionMessage } from '../data/eventsData';
import { useEvents } from '../cms/hooks';
import { splitEvents } from '../cms/adapters';
import PageRenderer from '../blocks/PageRenderer';
import { useSiteContent } from '../context/SiteContent';

const PINK = '#E0004F';
const INK = '#1a1a1a';

const CATEGORY_GRADIENT = {
  'book-club':      'linear-gradient(155deg, #8F4FD6 0%, #5a2b9a 100%)',
  'poetry-supper':  'linear-gradient(155deg, #FF934A 0%, #c65a1e 100%)',
  'silent-reading': 'linear-gradient(155deg, #C9F27F 0%, #6f8a3d 100%)',
  'guest-night':    'linear-gradient(155deg, #E0004F 0%, #8a002f 100%)',
  'members-only':   'linear-gradient(155deg, #5b4d3d 0%, #2c241b 100%)',
};

const CSS = `
  .ev-page {
    background: #F6F8F7;
    font-family: 'Poppins', system-ui, sans-serif;
    color: ${INK};
  }
  .ev-wrap {
    max-width: 1280px;
    margin: 0 auto;
    padding: 48px 64px 96px;
  }
  .ev-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 28px;
  }
  .ev-card {
    background: #fff;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06);
    display: flex;
    flex-direction: column;
    transition: transform 200ms, box-shadow 200ms;
  }
  .ev-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 1px 2px rgba(0,0,0,0.06), 0 14px 36px rgba(0,0,0,0.10);
  }
  .ev-card-image {
    position: relative;
    width: 100%;
    aspect-ratio: 4 / 3;
  }
  .ev-card-date {
    position: absolute;
    left: 18px;
    bottom: 18px;
    background: #fff;
    border-radius: 8px;
    padding: 8px 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1;
    box-shadow: 0 2px 6px rgba(0,0,0,0.08);
  }
  .ev-card-date .day {
    font-weight: 700;
    font-size: 20px;
    color: ${INK};
  }
  .ev-card-date .month {
    font-size: 11px;
    font-weight: 600;
    color: #4a4a4a;
    margin-top: 3px;
    letter-spacing: 0.04em;
  }
  .ev-card-body {
    padding: 26px 26px 28px;
    display: flex;
    flex-direction: column;
    flex: 1;
  }
  .ev-card-title {
    margin: 0 0 14px;
    font-weight: 600;
    font-size: 18px;
    line-height: 1.3;
    letter-spacing: -0.01em;
    color: ${INK};
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .ev-card-desc {
    margin: 0 0 22px;
    font-size: 14px;
    line-height: 1.55;
    color: #6e6e6e;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .ev-card-cta {
    margin-top: auto;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    color: ${INK};
    border: 0;
    padding: 0;
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    align-self: flex-start;
    transition: gap 150ms, color 150ms;
  }
  .ev-card-cta:hover { color: ${PINK}; gap: 12px; }
  .ev-card-cta svg { width: 16px; height: 16px; }

  .ev-empty {
    grid-column: 1 / -1;
    text-align: center;
    padding: 64px 24px;
    color: #6e6e6e;
    background: #fafafa;
    border-radius: 12px;
  }

  @media (max-width: 1023px) {
    .ev-wrap { padding: 36px 40px 72px; }
    .ev-grid { grid-template-columns: repeat(2, 1fr); gap: 22px; }
  }
  @media (max-width: 639px) {
    .ev-wrap { padding: 28px 20px 56px; }
    .ev-grid { grid-template-columns: 1fr; gap: 18px; }
  }
`;

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function EventCard({ event }) {
  const bg = CATEGORY_GRADIENT[event.category] || CATEGORY_GRADIENT['book-club'];
  const onAct = () => {
    // eslint-disable-next-line no-console
    console.log('[events] action', { slug: event.slug, action: event.cta.action });
    // eslint-disable-next-line no-alert
    window.alert(actionMessage(event.cta.action, event));
  };
  const fullTitle = `${event.title}${event.italic ? ' ' + event.italic : ''}`;
  return (
    <article className="ev-card">
      <div className="ev-card-image" style={{ background: bg }}>
        <div className="ev-card-date">
          <span className="day">{event.dateDay}</span>
          <span className="month">{event.dateMonth}</span>
        </div>
      </div>
      <div className="ev-card-body">
        <h3 className="ev-card-title">{fullTitle}</h3>
        <p className="ev-card-desc">{event.description}</p>
        <button type="button" className="ev-card-cta" onClick={onAct}>
          Read More <ArrowIcon />
        </button>
      </div>
    </article>
  );
}

export default function Events() {
  const content = useSiteContent();
  if (content?.pages?.events?.use_blocks) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <PageRenderer pageKey="events" />
      </div>
    );
  }
  return <EventsLegacy />;
}

function EventsLegacy() {
  const [searchParams] = useSearchParams();
  const query = (searchParams.get('q') || '').trim().toLowerCase();
  const { data: rows } = useEvents();
  const upcoming = splitEvents(rows || []).upcoming;
  const list = upcoming.length > 0 ? upcoming : UPCOMING_EVENTS;

  const filtered = useMemo(() => list.filter((e) => {
    if (!query) return true;
    return [e.title, e.italic, e.description, e.category]
      .some((s) => (s || '').toLowerCase().includes(query));
  }), [list, query]);

  return (
    <div className="ev-page">
      <style>{CSS}</style>
      <PageBreadcrumb name="Events" />
      <div className="ev-wrap">
        <div className="ev-grid">
          {filtered.length === 0 ? (
            <div className="ev-empty">
              <p style={{ margin: 0 }}>Nothing on the books just yet.</p>
            </div>
          ) : (
            filtered.map((e) => <EventCard key={e.slug} event={e} />)
          )}
        </div>
      </div>
    </div>
  );
}
