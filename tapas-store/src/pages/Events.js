import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageBreadcrumb from '../components/PageBreadcrumb';
import { UPCOMING_EVENTS } from '../data/eventsData';
import { useEvents } from '../cms/hooks';
import PageRenderer from '../blocks/PageRenderer';
import { useSiteContent } from '../context/SiteContent';

const GREEN = '#3f6b1f';    // dark leaf green — titles, dots, links, month header
const LIME = '#caf27e';     // brand lime — filled blocks (date box, "today")
const ON_LIME = '#23350c';  // dark text that stays legible on the lime fills
const INK = '#3a3a3a';

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 12-hour clock, "01:00 pm" style, matching the reference layout.
function fmtTime(t) {
  if (!t) return '';
  const [hs, ms] = String(t).split(':');
  let h = Number(hs);
  if (Number.isNaN(h)) return '';
  const ampm = h >= 12 ? 'pm' : 'am';
  h = ((h + 11) % 12) + 1;
  return `${String(h).padStart(2, '0')}:${(ms || '00').slice(0, 2)} ${ampm}`;
}

// Flatten the CMS event rows (or the static seed) into a single shape the
// calendar + list both read from.
function normalize(rows) {
  if (rows && rows.length) {
    return rows
      .filter((e) => e.start_date && e.slug)
      .map((e) => ({
        slug: e.slug,
        iso: e.start_date,
        title: `${e.title || ''}${e.italic_accent ? ' ' + e.italic_accent : ''}`.trim(),
        description: e.description || '',
        timeLabel: fmtTime(e.start_time),
        isPaid: !!e.is_paid,
        price: Number(e.ticket_price) || 0,
      }));
  }
  return UPCOMING_EVENTS.map((e) => ({
    slug: e.slug,
    iso: e.iso,
    title: `${e.title}${e.italic ? ' ' + e.italic : ''}`,
    description: e.description,
    timeLabel: e.time || '',
    isPaid: false,
    price: 0,
  }));
}

const CSS = `
  .evl-page { background: #fff; font-family: 'Poppins', system-ui, sans-serif; color: ${INK}; }
  .evl-wrap { max-width: 1280px; margin: 0 auto; padding: 8px 64px 96px; }
  .evl-grid { display: grid; grid-template-columns: minmax(0, 440px) minmax(0, 1fr); gap: 52px; align-items: start; }

  /* Calendar */
  .evl-cal-head { display: flex; align-items: center; justify-content: center; gap: 24px; margin-bottom: 26px; }
  .evl-month { font-family: 'Poppins', system-ui, sans-serif; font-weight: 700; font-size: 22px; letter-spacing: 0.06em; color: ${GREEN}; text-align: center; min-width: 210px; }
  .evl-nav { width: 42px; height: 42px; border-radius: 50%; border: 1px solid #dcdcdc; background: #fff; color: #b0b0b0; font-size: 17px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: border-color 150ms, color 150ms; }
  .evl-nav:hover { border-color: ${GREEN}; color: ${GREEN}; }
  .evl-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 13px; font-weight: 600; letter-spacing: 0.05em; color: #a6a6a6; margin-bottom: 6px; }
  .evl-days { display: grid; grid-template-columns: repeat(7, 1fr); }
  .evl-day { aspect-ratio: 1 / 1; display: flex; align-items: center; justify-content: center; position: relative; appearance: none; border: 0; background: none; font: inherit; padding: 0; border-radius: 10px; cursor: pointer; transition: background 120ms; }
  .evl-day--empty { cursor: default; }
  .evl-day:hover:not(.is-today):not(.is-selected):not(.evl-day--empty) { background: #f3f3f3; }
  .evl-daynum { font-size: 16px; color: #8f8f8f; font-weight: 500; }
  .evl-day.is-today .evl-daynum { background: ${LIME}; color: ${ON_LIME}; width: 58px; height: 58px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; }
  .evl-day.is-selected .evl-daynum { background: #E0004F; color: #fff; width: 58px; height: 58px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; }
  .evl-dot { position: absolute; bottom: 9px; left: 50%; transform: translateX(-50%); width: 7px; height: 7px; border-radius: 50%; background: ${GREEN}; }

  /* Event list */
  .evl-list { border: 1px solid #ededed; border-radius: 4px; }
  .evl-item { display: flex; gap: 30px; padding: 34px 38px; border-bottom: 1px solid #ededed; text-decoration: none; color: inherit; cursor: pointer; transition: background 150ms; }
  .evl-item:last-child { border-bottom: 0; }
  .evl-item:hover { background: #fafafa; }
  .evl-item:hover .evl-more { text-decoration: underline; }
  .evl-datecol { flex-shrink: 0; width: 70px; text-align: center; }
  .evl-datebox { background: #E0004F; color: #fff; border-radius: 3px; padding: 9px 0 11px; display: flex; flex-direction: column; align-items: center; line-height: 1.1; }
  .evl-datebox .m { font-size: 15px; font-weight: 500; }
  .evl-datebox .d { font-size: 30px; font-weight: 700; margin: 1px 0; }
  .evl-datebox .y { font-size: 13px; opacity: 0.92; }
  .evl-time { margin-top: 16px; font-size: 15px; color: ${INK}; }
  .evl-body { flex: 1; min-width: 0; }
  .evl-titlerow { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
  .evl-title { margin: 0 0 12px; font-family: 'Poppins', system-ui, sans-serif; font-weight: 700; font-size: 22px; line-height: 1.25; color: #1a1a1a; }
  .evl-price { flex-shrink: 0; margin-top: 3px; background: ${LIME}; color: ${ON_LIME}; font-size: 14px; font-weight: 700; padding: 5px 13px; border-radius: 999px; white-space: nowrap; }
  .evl-desc { margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #555; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .evl-more { display: block; text-align: right; font-size: 15px; font-weight: 500; color: ${GREEN}; text-decoration: none; }
  .evl-more:hover { text-decoration: underline; }
  .evl-empty { padding: 60px 36px; text-align: center; color: #a0a0a0; border: 1px solid #ededed; border-radius: 4px; font-size: 15px; }
  .evl-filterbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
  .evl-filterlabel { font-family: 'Poppins', system-ui, sans-serif; font-weight: 700; font-size: 18px; color: #1a1a1a; }
  .evl-clear { appearance: none; border: 1px solid #dcdcdc; background: #fff; color: ${GREEN}; font-family: inherit; font-size: 13px; font-weight: 600; padding: 7px 14px; border-radius: 999px; cursor: pointer; transition: border-color 150ms; }
  .evl-clear:hover { border-color: ${GREEN}; }

  @media (max-width: 1023px) {
    .evl-wrap { padding: 8px 40px 72px; }
    .evl-grid { grid-template-columns: 1fr; gap: 44px; }
    .evl-cal { max-width: 440px; }
  }
  @media (max-width: 639px) {
    .evl-wrap { padding: 8px 20px 56px; }
    .evl-item { padding: 24px; gap: 18px; }
    .evl-title { font-size: 19px; }
    .evl-day.is-today .evl-daynum { width: 44px; height: 44px; }
  }
`;

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
  const { data: rows } = useEvents();
  const events = useMemo(() => normalize(rows), [rows]);

  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selectedDay, setSelectedDay] = useState(null);

  // Changing month clears any day filter so the new month shows in full.
  const goMonth = (delta) => {
    setSelectedDay(null);
    setView((v) => {
      const m = v.m + delta;
      if (m < 0) return { y: v.y - 1, m: 11 };
      if (m > 11) return { y: v.y + 1, m: 0 };
      return { y: v.y, m };
    });
  };
  const prevMonth = () => goMonth(-1);
  const nextMonth = () => goMonth(1);

  // Events falling in the displayed month, sorted by date then time.
  const monthEvents = useMemo(() => (
    events
      .filter((e) => {
        const [y, m] = e.iso.split('-').map(Number);
        return y === view.y && m - 1 === view.m;
      })
      .sort((a, b) => a.iso.localeCompare(b.iso) || a.timeLabel.localeCompare(b.timeLabel))
  ), [events, view]);

  const eventDays = useMemo(
    () => new Set(monthEvents.map((e) => Number(e.iso.split('-')[2]))),
    [monthEvents],
  );

  // Grid cells: leading blanks for the weekday offset, then each day number.
  const firstWeekday = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);

  const isToday = (d) => d && view.y === now.getFullYear() && view.m === now.getMonth() && d === now.getDate();
  const monthLabel = new Date(view.y, view.m, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    .toUpperCase();

  // When a day is picked, narrow the list to that day; otherwise show the month.
  const dayEvents = selectedDay
    ? monthEvents.filter((e) => Number(e.iso.split('-')[2]) === selectedDay)
    : monthEvents;

  return (
    <div className="evl-page">
      <style>{CSS}</style>
      <PageBreadcrumb name="Events" />
      <div className="evl-wrap">
        <div className="evl-grid">
          {/* Calendar */}
          <div className="evl-cal">
            <div className="evl-cal-head">
              <button type="button" className="evl-nav" onClick={prevMonth} aria-label="Previous month">‹</button>
              <div className="evl-month">{monthLabel}</div>
              <button type="button" className="evl-nav" onClick={nextMonth} aria-label="Next month">›</button>
            </div>
            <div className="evl-weekdays">
              {WEEKDAYS.map((d) => <span key={d}>{d}</span>)}
            </div>
            <div className="evl-days">
              {cells.map((d, i) => (
                d === null ? (
                  <div key={i} className="evl-day evl-day--empty" />
                ) : (
                  <button
                    key={i}
                    type="button"
                    className={`evl-day${isToday(d) ? ' is-today' : ''}${selectedDay === d ? ' is-selected' : ''}`}
                    onClick={() => setSelectedDay((s) => (s === d ? null : d))}
                    aria-pressed={selectedDay === d}
                    aria-label={`${monthLabel} ${d}${eventDays.has(d) ? ', has events' : ''}`}
                  >
                    <span className="evl-daynum">{d}</span>
                    {!isToday(d) && selectedDay !== d && eventDays.has(d) && <span className="evl-dot" />}
                  </button>
                )
              ))}
            </div>
          </div>

          {/* Event list for the displayed month */}
          <div className="evl-listcol">
            {selectedDay && (
              <div className="evl-filterbar">
                <span className="evl-filterlabel">{MON_SHORT[view.m]} {selectedDay}, {view.y}</span>
                <button type="button" className="evl-clear" onClick={() => setSelectedDay(null)}>Show all events</button>
              </div>
            )}
            {dayEvents.length === 0 ? (
              <div className="evl-empty">{selectedDay ? 'No events on this day.' : 'No events this month.'}</div>
            ) : (
              <div className="evl-list">
                {dayEvents.map((e) => {
                  const [y, m, d] = e.iso.split('-');
                  return (
                    <Link className="evl-item" key={e.slug} to={`/events/${e.slug}`}>
                      <div className="evl-datecol">
                        <div className="evl-datebox">
                          <span className="m">{MON_SHORT[Number(m) - 1]}</span>
                          <span className="d">{Number(d)}</span>
                          <span className="y">{y}</span>
                        </div>
                        {e.timeLabel && <div className="evl-time">{e.timeLabel}</div>}
                      </div>
                      <div className="evl-body">
                        <div className="evl-titlerow">
                          <h3 className="evl-title">{e.title}</h3>
                          {e.isPaid && e.price > 0 && <span className="evl-price">₹{e.price}</span>}
                        </div>
                        {e.description && <p className="evl-desc">{e.description}</p>}
                        <span className="evl-more">Read More</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
