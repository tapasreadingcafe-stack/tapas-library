import React, { useEffect, useState } from 'react';
import { CONTACT_HOURS } from '../../data/contactConfig';

// Read the local weekday as 0-6 (Sun-Sat). Kept in state so the
// server-rendered shell (if any) matches the client on mount — SSR
// would flash the wrong "TODAY" column otherwise. For our CRA build
// this just guarantees the highlight updates at midnight if the tab
// stays open across a day boundary.
function useTodayIndex() {
  const [index, setIndex] = useState(() => new Date().getDay());
  useEffect(() => {
    setIndex(new Date().getDay());
    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5
    );
    const t = setTimeout(
      () => setIndex(new Date().getDay()),
      Math.max(5000, nextMidnight - now),
    );
    return () => clearTimeout(t);
  }, []);
  return index;
}

export default function HoursStrip() {
  const todayIdx = useTodayIndex();
  return (
    <div className="contact-hours" role="list" aria-label="Weekly hours">
      {CONTACT_HOURS.map((d) => {
        const isToday = d.dayIndex === todayIdx;
        return (
          <div
            key={d.key}
            role="listitem"
            className={`contact-hours-day${isToday ? ' is-today' : ''}`}
          >
            <div className="contact-hours-name">
              {d.short}{isToday ? ' \u00b7 Today' : ''}
            </div>
            <div className={`contact-hours-value${d.closed ? ' is-closed' : ''}`}>
              {d.hours}
            </div>
          </div>
        );
      })}
    </div>
  );
}
