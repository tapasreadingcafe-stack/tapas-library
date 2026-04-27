import React from 'react';
import { UPCOMING_EVENTS, BADGE, actionMessage } from '../../data/eventsData';
import { useEvents } from '../../cms/hooks';
import { splitEvents } from '../../cms/adapters';

function EventCard({ event, focus, cardRef }) {
  const badge = BADGE[event.badge] || BADGE.weekly;

  const onClick = () => {
    // TODO: wire RSVP/Reserve/Drop-in to a real backend. For now we
    // acknowledge the click and log the payload so the front-end flow
    // can be demoed without a server round-trip.
    // eslint-disable-next-line no-console
    console.log('[events] action', { slug: event.slug, action: event.cta.action });
    // eslint-disable-next-line no-alert
    window.alert(actionMessage(event.cta.action, event));
  };

  return (
    <article
      ref={cardRef}
      id={`event-${event.slug}`}
      className={`ev-card${focus ? ' is-focus' : ''}`}
    >
      <div className="ev-card-date">
        <span className="ev-card-date-month">{event.dateMonth}</span>
        <span className="ev-card-date-day">{event.dateDay}</span>
        <button type="button" className="ev-card-cta" onClick={onClick}>
          {event.cta.label} →
        </button>
      </div>

      <div>
        <h3 className="ev-card-title">
          {event.title} <em>{event.italic}</em>
        </h3>
        <p className="ev-card-body">{event.description}</p>
      </div>

      <div className="ev-card-time">
        <div className="ev-card-time-top">{event.time}</div>
        <div className="ev-card-time-bottom">{event.seats}</div>
      </div>

      <span
        className="ev-badge"
        style={{
          background: badge.bg,
          color: badge.fg,
          border: badge.border ? `1px solid ${badge.border}` : 'none',
        }}
      >
        {badge.label}
      </span>
    </article>
  );
}

export default function EventsList({
  category, focusSlug, listRef, cardRefs,
}) {
  const { data: rows, loading } = useEvents();
  const upcoming = splitEvents(rows || []).upcoming;
  const list = upcoming.length > 0 ? upcoming : UPCOMING_EVENTS;
  const visible = list.filter((e) =>
    category === 'all' ? true : e.category === category,
  );

  return (
    <div
      className="ev-list"
      ref={listRef}
      style={{ opacity: loading ? 0 : 1, transition: 'opacity 180ms ease-out' }}
    >
      {visible.length === 0 ? (
        <div className="ev-empty">
          <h3>Nothing on the books in that category.</h3>
          <p>Try another filter or check back next week.</p>
        </div>
      ) : (
        visible.map((e) => (
          <EventCard
            key={e.slug}
            event={e}
            focus={focusSlug === e.slug}
            cardRef={(el) => {
              if (cardRefs) cardRefs.current[e.slug] = el;
            }}
          />
        ))
      )}
    </div>
  );
}
