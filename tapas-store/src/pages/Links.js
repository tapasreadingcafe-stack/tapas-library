import React from 'react';
import { Link } from 'react-router-dom';
import { useEvents } from '../cms/hooks';
import { formatTime12h } from '../utils/timeFormat';
import { eventExternalUrl, eventHost, eventOpensDirect } from '../utils/eventLink';
import {
  CAFE_ADDRESS, CAFE_PHONES, CAFE_EMAIL, CAFE_LINKS,
  CAFE_TAGLINE, CAFE_FOUNDER, CAFE_COORDS, CAFE_HOURS,
} from '../data/cafeDetails';

/* /links — the cafe's own link-in-bio page.
 *
 * Replaces the Linktree this used to point at. The reason for owning it isn't
 * only the third party's branding and footer: the events on a Linktree are
 * typed in by hand and go stale the day after they happen. Here the upcoming
 * events come straight from the same `events` table the dashboard writes, so
 * the page a customer opens from an Instagram bio is right without anyone
 * maintaining it.
 *
 * Built phone-first — practically every visit arrives from a phone — and kept
 * to one column so it reads the same at any width.
 */

const LIME    = '#caf27e';
const GREEN   = '#3f6b1f';
const ON_LIME = '#23350c';
const INK     = '#1a1a1a';
const MUTED   = '#6e6e6e';
const BG      = '#ffffff';
const HAIRLINE = '#ececf0';

// Same fallback covers the event detail page uses, so a thumbnail here and the
// hero there are recognisably the same event.
const CATEGORY_GRADIENT = {
  'book-club':      'linear-gradient(155deg, #8F4FD6 0%, #5a2b9a 100%)',
  'poetry-supper':  'linear-gradient(155deg, #FF934A 0%, #c65a1e 100%)',
  'silent-reading': 'linear-gradient(155deg, #C9F27F 0%, #6f8a3d 100%)',
  'guest-night':    'linear-gradient(155deg, #E0004F 0%, #8a002f 100%)',
  'members-only':   'linear-gradient(155deg, #5b4d3d 0%, #2c241b 100%)',
};

const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* Places on the site worth sending someone from a bio link. Kept to routes
 * that actually render — a dead link here is worse than a missing one. */
const PLACES = [
  { href: CAFE_LINKS.whatsappCommunity, label: 'Join our WhatsApp community' },
  { to: '/offers', label: 'Become a member' },
  { to: '/events', label: 'All events' },
  { to: '/about',  label: 'About us' },
];

/** Today's hours, and whether the cafe is open at this moment. */
function todayHours() {
  const now = new Date();
  const row = CAFE_HOURS[DAY_KEYS[now.getDay()]];
  if (!row) return { closedToday: true, open: false };

  // Compared as minutes-since-midnight rather than as Dates, so a closing time
  // after midnight doesn't read as "closed all day".
  const mins = (t) => {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(t));
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  const nowM = now.getHours() * 60 + now.getMinutes();
  const o = mins(row.open);
  const c = mins(row.close);
  if (o === null || c === null) return { closedToday: false, open: false, row };
  const open = c > o ? (nowM >= o && nowM < c) : (nowM >= o || nowM < c);
  return { closedToday: false, open, row };
}

/** The next day the cafe is actually open, for the closed-state message. */
function nextOpenDay() {
  const now = new Date();
  for (let i = 1; i <= 7; i++) {
    const key = DAY_KEYS[(now.getDay() + i) % 7];
    if (CAFE_HOURS[key]) return { key, row: CAFE_HOURS[key] };
  }
  return null;
}

/** Events still to come, soonest first.
 *
 * Compared against the clock, not just the calendar: an event at 7am today is
 * over by the evening, and leaving it at the top of the page made the whole
 * list look stale. An event that is currently running still shows — the cutoff
 * is its end time where it has one, its start time otherwise. A row with no
 * time at all stays up for the rest of its day.
 */
function upcoming(events, limit = 4) {
  if (!events || !events.length) return [];
  const now = new Date();

  const endsAt = (e) => {
    const time = e.end_time || e.start_time;
    if (!time) {
      const [y, m, d] = e.start_date.split('-').map(Number);
      return new Date(y, m - 1, d, 23, 59, 59);
    }
    return new Date(`${e.start_date}T${time}`);
  };

  return (events || [])
    .filter((e) => e.slug && e.start_date && endsAt(e) >= now)
    .sort((a, b) => endsAt(a) - endsAt(b))
    .slice(0, limit);
}

const CSS = `
  .lk-page { background: ${BG}; min-height: 100vh; font-family: 'Poppins', system-ui, sans-serif; color: ${INK}; padding: 40px 18px 56px; }
  .lk-wrap { max-width: 540px; margin: 0 auto; }

  /* On a wide screen the column otherwise floats in a bare expanse of grey, so
     it is framed like the phone this page is actually read on. Strictly a
     desktop treatment — a phone frame drawn on a phone would be absurd — so the
     whole thing is scoped to a min-width query and mobile keeps full bleed. */
  @media (min-width: 760px) {
    .lk-page { background: #e6e8eb; padding: 46px 18px 60px; }
    .lk-wrap { max-width: 530px; background: ${BG}; border: 11px solid #fff; border-radius: 46px;
               padding: 34px 20px 40px; box-shadow: 0 22px 55px rgba(0,0,0,0.13); }
  }

  .lk-head { text-align: center; margin-bottom: 30px; }

  /* The wordmark carries the name, so there is no separate heading under it.
     It is an RGBA PNG with a real transparent background, so it sits directly
     on the page rather than needing a card behind it. */
  .lk-logo { display: block; margin: 0 auto 16px; width: 232px; max-width: 74%; height: auto; }

  .lk-tag { font-size: 14.5px; color: ${INK}; line-height: 1.6; margin: 0 auto; max-width: 420px; }
  .lk-byline { font-size: 13.5px; color: ${MUTED}; line-height: 1.6; margin: 4px auto 0; }

  /* Header social row — bare glyphs on the page, no disc behind them. */
  .lk-socials { display: flex; justify-content: center; align-items: center; gap: 26px; margin-top: 20px; }
  .lk-social { color: ${INK}; display: flex; align-items: center; justify-content: center;
               text-decoration: none; transition: transform 140ms ease, color 140ms ease; }
  .lk-social:hover { transform: translateY(-2px); color: ${GREEN}; }
  .lk-social svg { display: block; }

  .lk-status { display: inline-flex; align-items: center; gap: 8px; margin-top: 14px; padding: 7px 15px; border-radius: 999px; font-size: 13px; font-weight: 600; background: #fff; border: 1px solid ${HAIRLINE}; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
  .lk-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

  .lk-sec { margin-top: 30px; }
  .lk-sec-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 12px; padding: 0 4px; }
  .lk-sec-title { font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: ${GREEN}; }
  .lk-sec-more { font-size: 12px; font-weight: 600; color: ${MUTED}; text-decoration: none; }
  .lk-sec-more:hover { color: ${GREEN}; }

  /* Event cards — the date block is the anchor, as on the events page. */
  .lk-ev { position: relative; display: flex; align-items: center; justify-content: center;
           /* Symmetric padding — with a bigger pad on one side the title centres
              on the leftover space, not on the card, and sits visibly off. */
           min-height: 96px; background: #fff; border-radius: 16px; padding: 14px 78px;
           margin-bottom: 12px; text-decoration: none; color: inherit;
           border: 1px solid ${HAIRLINE}; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
           transition: transform 140ms ease, box-shadow 140ms ease; }
  .lk-ev:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.10); }

  /* Absolutely placed so it does not take part in the centring — the title is
     centred on the CARD, not on the space left over beside the thumbnail. */
  .lk-ev-thumb-wrap { position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
                      width: 56px; height: 72px; }
  .lk-ev-thumb { display: block; width: 100%; height: 100%; border-radius: 10px;
                 background-color: #fff; background-size: contain; background-repeat: no-repeat;
                 background-position: center; box-shadow: inset 0 0 0 1px #ececef; }

  .lk-ev-body { min-width: 0; text-align: center; }
  .lk-ev-title { font-size: 16px; font-weight: 600; line-height: 1.35; }
  .lk-ev-meta { font-size: 13px; color: ${MUTED}; margin-top: 5px; }
  .lk-ev-chev { position: absolute; right: 18px; top: 50%; transform: translateY(-50%);
                color: #c2c6cb; font-size: 18px; }

  /* Link rows */
  .lk-link { position: relative; display: flex; align-items: center; justify-content: center;
             background: #fff; border-radius: 16px; padding: 18px 46px; margin-bottom: 12px;
             text-decoration: none; color: inherit; border: 1px solid ${HAIRLINE};
             box-shadow: 0 1px 3px rgba(0,0,0,0.04);
             transition: transform 140ms ease, box-shadow 140ms ease; }
  .lk-link:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.10); }
  .lk-link-label { min-width: 0; font-size: 16px; font-weight: 600; text-align: center; }
  .lk-link .lk-ev-chev { right: 18px; }

  /* Contact pills */
  /* Map card — a real embedded map beats a link that only says "Directions".
     Google's /maps?output=embed form needs no API key, so there is no key to
     leak in the bundle and nothing to expire. */
  .lk-map { background: #fff; border-radius: 16px; overflow: hidden; border: 1px solid ${HAIRLINE}; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
  .lk-map-frame { width: 100%; height: 200px; border: 0; display: block; background: #eceff1; }
  .lk-map-body { padding: 14px 16px 16px; text-align: center; }
  .lk-map-addr { font-size: 12.5px; color: ${MUTED}; line-height: 1.55; margin-bottom: 12px; }
  .lk-map-btn { display: inline-block; padding: 10px 22px; border-radius: 999px; background: ${LIME}; color: ${ON_LIME}; font-size: 13.5px; font-weight: 700; text-decoration: none; transition: transform 140ms ease; }
  .lk-map-btn:hover { transform: translateY(-2px); }

  .lk-foot { text-align: center; margin-top: 34px; font-size: 12px; color: ${MUTED}; line-height: 1.8; }
  .lk-foot a { color: ${MUTED}; text-decoration: none; }
  .lk-foot a:hover { color: ${GREEN}; }

  @media (max-width: 420px) {
    .lk-page { padding: 28px 14px 44px; }
    .lk-name { font-size: 22px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .lk-ev, .lk-link { transition: none; }
    .lk-ev:hover, .lk-link:hover { transform: none; }
  }
`;

/* Outlined marks, drawn to match how each brand actually renders.
 *
 * The Instagram glyph was a single filled path — at 28px the counters closed up
 * and it read as a dark blob rather than a camera. Stroked geometry (rounded
 * square, lens circle, flash dot) stays legible at any size and matches the
 * outline weight of the others.
 */
function IgIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.4" />
      <circle cx="12" cy="12" r="4.1" />
      <circle cx="17.4" cy="6.6" r="1.05" fill="currentColor" stroke="none" />
    </svg>
  );
}

function WaIcon({ size = 28 }) {
  // The canonical WhatsApp mark. An earlier version of this drew the handset
  // from a hand-written path and it rendered as a blob — this is the real
  // glyph: the bubble is a filled ring (outer edge plus its counter) with the
  // handset solid inside, which is why it reads as an outline without strokes.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.97 6.45 17.5 2 12.04 2zm0 18.13h-.01c-1.53 0-3.03-.41-4.34-1.19l-.31-.18-3.12.82.83-3.04-.2-.32a8.19 8.19 0 01-1.26-4.35c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 012.41 5.82c0 4.54-3.7 8.23-8.25 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.79.98-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43l-.48-.01c-.16 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.16 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.53.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.22-.17-.47-.29z"/>
    </svg>
  );
}

function YtIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.5 7.1a3 3 0 0 0-2.1-2.1C19.5 4.5 12 4.5 12 4.5s-7.5 0-9.4.5A3 3 0 0 0 .5 7.1 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 4.9 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-4.9zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" />
    </svg>
  );
}

export default function Links() {
  const { data: events } = useEvents();

  const next = upcoming(events);
  const today = todayHours();
  const logo = `${process.env.PUBLIC_URL || ''}/logo.png`;

  return (
    <div className="lk-page">
      <style>{CSS}</style>
      <div className="lk-wrap">

        <header className="lk-head">
          <h1 style={{ margin: 0 }}>
            <img className="lk-logo" src={logo} alt="Tapas Reading Cafe" />
          </h1>
          <p className="lk-tag">{CAFE_TAGLINE}</p>
          <p className="lk-byline">Founded with love by {CAFE_FOUNDER}</p>

          <div className="lk-socials">
            <a className="lk-social" href={CAFE_LINKS.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><IgIcon /></a>
            <a className="lk-social" href={CAFE_LINKS.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><WaIcon /></a>
            {CAFE_LINKS.youtube && (
              <a className="lk-social" href={CAFE_LINKS.youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube"><YtIcon /></a>
            )}
          </div>

          <div className="lk-status">
            <span className="lk-dot" style={{ background: today.open ? '#22a35b' : '#c0392b' }} />
            {today.open
              ? `Open now · until ${formatTime12h(today.row.close)}`
              : today.closedToday
                ? (() => {
                    const n = nextOpenDay();
                    return n ? `Closed today · open ${n.key} ${formatTime12h(n.row.open)}` : 'Closed today';
                  })()
                : `Closed · opens ${formatTime12h(today.row.open)}`}
          </div>
        </header>

        {/* Upcoming events — the whole reason this page is ours and not a
            Linktree. Nobody updates it; the dashboard already did. */}
        {next.length > 0 && (
          <section className="lk-sec">
            <div className="lk-sec-head">
              <span className="lk-sec-title">What's coming up</span>
              <Link className="lk-sec-more" to="/events">See all →</Link>
            </div>
            {next.map((e) => {
              const d = new Date(`${e.start_date}T00:00:00`);
              const cover = e.cover_url || e.image_url;
              const time = formatTime12h(e.start_time);
              const price = e.is_paid && Number(e.ticket_price) > 0 ? `₹${Number(e.ticket_price)}` : 'Free';
              // An event booked on Luma (or anywhere else) can go straight
              // there — routing it through our own page would only add a tap
              // and a register form that can't take the booking. Staff can
              // choose our page instead per event, and then this card behaves
              // like any of ours.
              const direct = eventOpensDirect(e);
              const away = direct ? eventHost(e) : null;
              const href = direct ? eventExternalUrl(e) : null;
              const inner = (
                <>
                  <div className="lk-ev-thumb-wrap">
                    <span
                      className="lk-ev-thumb"
                      aria-hidden="true"
                      style={cover
                        ? { backgroundImage: `url(${cover})` }
                        : { background: CATEGORY_GRADIENT[e.category] || CATEGORY_GRADIENT['book-club'], boxShadow: 'none' }}
                    />
                  </div>
                  <div className="lk-ev-body">
                    <div className="lk-ev-title">
                      {e.title}{e.italic_accent ? ` ${e.italic_accent}` : ''}
                    </div>
                    <div className="lk-ev-meta">
                      {[`${d.getDate()} ${MON_SHORT[d.getMonth()]}`, time, price, away].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  {/* ↗ rather than › so it's clear before the tap that this one
                      leaves the site. */}
                  <span className="lk-ev-chev" aria-hidden="true">{away ? '↗' : '›'}</span>
                </>
              );
              return away ? (
                <a className="lk-ev" key={e.slug} href={href} target="_blank" rel="noopener noreferrer">{inner}</a>
              ) : (
                <Link className="lk-ev" key={e.slug} to={`/events/${e.slug}`}>{inner}</Link>
              );
            })}
          </section>
        )}

        <section className="lk-sec">
          <div className="lk-sec-head"><span className="lk-sec-title">Explore</span></div>
          {PLACES.map((p) => {
            const inner = (
              <>
                <span className="lk-link-label">{p.label}</span>
                <span className="lk-ev-chev" aria-hidden="true">{p.href ? '↗' : '›'}</span>
              </>
            );
            // An off-site destination needs a real anchor; a router Link would
            // treat the URL as an in-app path and land on the 404 page.
            return p.href
              ? <a className="lk-link" key={p.href} href={p.href} target="_blank" rel="noopener noreferrer">{inner}</a>
              : <Link className="lk-link" key={p.to} to={p.to}>{inner}</Link>;
          })}
        </section>

        <section className="lk-sec">
          <div className="lk-sec-head"><span className="lk-sec-title">Find us</span></div>
          <div className="lk-map">
            <iframe
              className="lk-map-frame"
              title="Tapas Reading Cafe on Google Maps"
              src={`https://www.google.com/maps?q=${CAFE_COORDS.lat},${CAFE_COORDS.lng}&z=17&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            <div className="lk-map-body">
              <div className="lk-map-addr">{CAFE_ADDRESS}</div>
              <a className="lk-map-btn" href={CAFE_LINKS.maps} target="_blank" rel="noopener noreferrer">
                Get directions
              </a>
            </div>
          </div>
        </section>

        <footer className="lk-foot">
          {/* No address here — the map card above already carries it, and
              repeating it twice in a row just reads as a mistake. */}
          <div>
            {CAFE_PHONES.map((p, i) => (
              <React.Fragment key={p.tel}>
                {i > 0 && ' / '}
                <a href={`tel:${p.tel}`}>{p.label}</a>
              </React.Fragment>
            ))}
          </div>
          <div><a href={`mailto:${CAFE_EMAIL}`}>{CAFE_EMAIL}</a></div>
          <div style={{ marginTop: 10 }}>© {new Date().getFullYear()} Tapas Reading Cafe</div>
        </footer>

      </div>
    </div>
  );
}
