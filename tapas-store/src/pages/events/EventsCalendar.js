import React, { useMemo, useState } from 'react';
import {
  CALENDAR_EVENTS, CHIP, ymd, isSameDay,
} from '../../data/eventsData';
import { useEvents } from '../../cms/hooks';
import { splitEvents } from '../../cms/adapters';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Build a 6-row × 7-col grid of Date objects for `month`, starting on
// the Monday of the week that contains day 1.
function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  // JS weekday: 0=Sun..6=Sat. We want 0=Mon..6=Sun.
  const startWeekday = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - startWeekday);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(d);
  }
  return cells;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function EventsCalendar({ category, onJumpToEvent }) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const { data: rows } = useEvents();
  const calendarEvents = useMemo(() => {
    const all = splitEvents(rows || []).calendar;
    return all.length > 0 ? all : CALENDAR_EVENTS;
  }, [rows]);

  // Bucket events by yyyy-mm-dd for O(1) cell lookups.
  const byDate = useMemo(() => {
    const map = new Map();
    for (const e of calendarEvents) {
      if (category !== 'all' && e.category !== category) continue;
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date).push(e);
    }
    return map;
  }, [calendarEvents, category]);

  const shift = (delta) => {
    setCursor(new Date(year, month + delta, 1));
  };

  return (
    <div className="ev-cal" aria-label="Events calendar">
      <div className="ev-cal-head">
        <div className="ev-cal-title">
          {MONTH_NAMES[month]} {year}
        </div>
        <div className="ev-cal-nav">
          <button type="button" aria-label="Previous month" onClick={() => shift(-1)}>‹</button>
          <button type="button" aria-label="Next month" onClick={() => shift(1)}>›</button>
        </div>
      </div>

      <div className="ev-cal-row ev-cal-head-row" role="row">
        {WEEKDAYS.map((w) => (
          <div key={w} className="ev-cal-weekday" role="columnheader">{w.toUpperCase()}</div>
        ))}
      </div>

      <div className="ev-cal-row" role="rowgroup">
        {cells.map((d) => {
          const inMonth = d.getMonth() === month;
          const events = byDate.get(ymd(d)) || [];
          const isToday = isSameDay(d, today);
          const shown = events.slice(0, 2);
          const extra = events.length - shown.length;
          const hasEvents = events.length > 0;
          return (
            <div
              key={d.toISOString()}
              className={[
                'ev-cal-cell',
                !inMonth && 'is-out',
                isToday && 'is-today',
                hasEvents && 'has-events',
              ].filter(Boolean).join(' ')}
              role="gridcell"
              onClick={hasEvents ? () => onJumpToEvent(events[0]) : undefined}
            >
              <span className="ev-cal-num">{d.getDate()}</span>
              {shown.map((e, i) => (
                <button
                  key={i}
                  type="button"
                  className="ev-cal-chip"
                  style={{ background: CHIP[e.chip] || '#eee' }}
                  onClick={(ev) => { ev.stopPropagation(); onJumpToEvent(e); }}
                >
                  {e.label}
                </button>
              ))}
              {extra > 0 && <span className="ev-cal-chip-more">+{extra} more</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
