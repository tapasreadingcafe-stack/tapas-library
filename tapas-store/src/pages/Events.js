import React, { useCallback, useRef, useState } from 'react';
import EventsHero from './events/EventsHero';
import EventsFilters from './events/EventsFilters';
import EventsCalendar from './events/EventsCalendar';
import EventsList from './events/EventsList';
import ClubGrid from './events/ClubGrid';
import FeaturedSupper from './events/FeaturedSupper';
import EVENTS_CSS from './events/eventsStyles';

export default function Events() {
  const [category, setCategory] = useState('all');
  const [view, setView] = useState('calendar');
  const [focusSlug, setFocusSlug] = useState(null);
  const listRef = useRef(null);
  const cardRefs = useRef({});
  const focusTimerRef = useRef(null);

  // Calendar chip click → scroll the matching event card into view
  // and flash its focus ring. Falls back silently if the event
  // doesn't appear in the upcoming list yet (e.g. May 1 rollover).
  const onJumpToEvent = useCallback((event) => {
    const slug = event?.targetSlug;
    if (!slug) return;
    const el = cardRefs.current[slug];
    if (!el) return;
    // Switch to list view on mobile where the calendar is hidden; on
    // desktop staying in Calendar is fine because the list sits
    // immediately below.
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setFocusSlug(slug);
    if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    focusTimerRef.current = setTimeout(() => setFocusSlug(null), 1600);
  }, []);

  return (
    <div className="ev-root">
      <style>{EVENTS_CSS}</style>

      <EventsHero />

      <div className="ev-wrap">
        <EventsFilters
          category={category}
          onCategory={setCategory}
          view={view}
          onView={setView}
        />

        {view === 'calendar' ? (
          <>
            <EventsCalendar category={category} onJumpToEvent={onJumpToEvent} />
            <div className="ev-cal-hint" aria-hidden="true">
              Calendar isn\u2019t shown on narrow screens \u2014 the
              upcoming events are listed below.
            </div>
          </>
        ) : null}

        <header className="ev-head">
          <div>
            <div className="ev-head-kicker">
              <span className="ev-head-dot" aria-hidden="true" />
              This week
            </div>
            <h2 className="ev-head-title">
              Upcoming <em>events.</em>
            </h2>
          </div>
          <p className="ev-head-lede">
            All events are free for members; guest seats are \u20B9650
            and include a drink. Book ahead \u2014 our room holds 24.
          </p>
        </header>

        <EventsList
          category={category}
          focusSlug={focusSlug}
          listRef={listRef}
          cardRefs={cardRefs}
        />

        <header className="ev-head">
          <div>
            <div className="ev-head-kicker">
              <span className="ev-head-dot" aria-hidden="true" />
              Weekly clubs
            </div>
            <h2 className="ev-head-title">
              Find a chair <em>that fits.</em>
            </h2>
          </div>
          <p className="ev-head-lede">
            Six ongoing groups. Come once as a guest to find your
            people, then keep your seat \u2014 we hold it.
          </p>
        </header>

        <ClubGrid category={category} />

        <FeaturedSupper />
      </div>
    </div>
  );
}
