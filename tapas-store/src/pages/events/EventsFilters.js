import React from 'react';
import { EVENT_FILTERS } from '../../data/eventsData';

export default function EventsFilters({ category, onCategory, view, onView }) {
  return (
    <div className="ev-controls">
      <div className="ev-pills" role="tablist" aria-label="Filter events">
        {EVENT_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={category === f.key}
            className={`ev-pill${category === f.key ? ' is-on' : ''}`}
            onClick={() => onCategory(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="ev-toggle" role="tablist" aria-label="View mode">
        {['calendar', 'list'].map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            className={view === v ? 'is-on' : ''}
            onClick={() => onView(v)}
          >
            {v === 'calendar' ? 'Calendar' : 'List'}
          </button>
        ))}
      </div>
    </div>
  );
}
