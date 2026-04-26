// =====================================================================
// HomeSections
//
// The six on-brand sections that sit between the LandingHero and the
// global SiteFooter on the home page. Ported from the original
// hand-authored landing layout (commit ae96245), restyled to:
//   * pull books from shop_books (CMS Phase 3),
//   * pull events from tapas_events,
//   * pull the featured testimonial from home_testimonials,
//   * keep Pricing/Plans + Services hardcoded since the layout is the
//     designed composition (Phase 4 dashboard can lift them later).
//
// CSS is scoped to a single `.home-sections` wrapper so it doesn't
// bleed into other routes. The newsletter "Dispatch" pattern is
// shared with the Blog page via <DispatchNewsletter />.
// =====================================================================
import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import {
  useShopBooks,
  useEvents,
  useHomeTestimonials,
} from '../cms/hooks';
import { adaptShopBooks, splitEvents } from '../cms/adapters';
import { MEMBER_DISCOUNT_RATE } from '../data/shopBooks';
import DispatchNewsletter from '../pages/blog/DispatchNewsletter';

// --- styles -----------------------------------------------------------
const HOME_SECTIONS_CSS = `
  .home-sections {
    --hs-lime: #C9F27F;
    --hs-orange: #FF934A;
    --hs-purple: #8F4FD6;
    --hs-pink: #E0004F;
    --hs-ink: #1a1a1a;
    --hs-ink-2: #3a3a3a;
    --hs-muted: #6e6e6e;
    --hs-rule: #ececea;
    --hs-bg: #caf27e;
    --hs-card: #ffffff;
    --hs-display: 'DM Serif Display', Georgia, serif;
    --hs-ui: 'Poppins', system-ui, sans-serif;
    --hs-mono: 'JetBrains Mono', ui-monospace, monospace;
    background: var(--hs-bg);
    color: var(--hs-ink);
    font-family: var(--hs-ui);
  }
  .home-sections * { box-sizing: border-box; }
  .home-sections h2, .home-sections h3, .home-sections h4 {
    font-family: var(--hs-display); font-weight: 400; margin: 0;
    letter-spacing: -0.015em; color: var(--hs-ink);
  }
  .home-sections h2 em, .home-sections h3 em, .home-sections h4 em {
    font-style: italic; font-weight: 400;
  }
  .home-sections p { line-height: 1.6; margin: 0; }
  .home-sections a { color: inherit; text-decoration: none; }

  .hs-wrap { max-width: 1320px; margin: 0 auto; padding: 0 64px; }
  .hs-section { padding: 100px 0; }
  .hs-head {
    display: grid; grid-template-columns: 1fr 1fr; gap: 60px;
    align-items: start; margin-bottom: 56px;
  }
  .hs-head > div:last-child { padding-top: 18px; }   /* baseline-align lede with heading first line */
  .hs-kicker {
    font-family: var(--hs-mono); font-size: 12px; letter-spacing: 0.18em;
    text-transform: uppercase; color: var(--hs-purple); margin-bottom: 14px;
    display: inline-flex; align-items: center; gap: 10px;
  }
  .hs-kicker::before { content: "●"; color: var(--hs-pink); font-size: 10px; }
  .hs-head h2 { font-size: clamp(40px, 4.6vw, 64px); line-height: 1.02; letter-spacing: -0.022em; }
  .hs-head h2 .p { color: var(--hs-purple); font-style: italic; font-weight: 400; }
  .hs-lede { font-size: 18px; line-height: 1.55; color: var(--hs-ink-2); max-width: 44ch; }

  /* ---------- SERVICES ---------- */
  .hs-services { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
  .hs-service {
    background: var(--hs-card); border: 1px solid var(--hs-rule); border-radius: 22px;
    padding: 32px 28px 28px; display: flex; flex-direction: column; gap: 18px;
    transition: transform .2s, box-shadow .2s;
  }
  .hs-service:hover { transform: translateY(-4px); box-shadow: 0 20px 40px -20px rgba(0,0,0,0.15); }
  .hs-service .ic {
    width: 56px; height: 56px; border-radius: 16px;
    display: grid; place-items: center;
    font-family: var(--hs-display); font-weight: 700; font-size: 28px;
  }
  .hs-service:nth-child(1) .ic { background: var(--hs-lime);   color: var(--hs-ink); }
  .hs-service:nth-child(2) .ic { background: var(--hs-orange); color: #fff; }
  .hs-service:nth-child(3) .ic { background: var(--hs-purple); color: #fff; }
  .hs-service h3 { font-size: 26px; line-height: 1.1; }
  .hs-service p  { color: var(--hs-ink-2); font-size: 15px; }
  .hs-service .more {
    margin-top: auto; display: inline-flex; align-items: center; gap: 10px;
    font-weight: 600; font-size: 13.5px; padding-top: 10px;
  }
  .hs-service .more .a {
    width: 28px; height: 28px; border-radius: 999px;
    background: var(--hs-ink); color: #fff;
    display: grid; place-items: center; font-size: 12px;
    transition: background .2s;
  }
  .hs-service:hover .a { background: var(--hs-pink); }

  /* ---------- ARRIVALS (book grid) ---------- */
  .hs-arrivals { display: grid; grid-template-columns: repeat(4, 1fr); gap: 22px; }
  .hs-book-card {
    background: var(--hs-card); border: 1px solid var(--hs-rule); border-radius: 20px;
    padding: 18px; display: flex; flex-direction: column; gap: 14px;
    transition: transform .2s;
  }
  .hs-book-card:hover { transform: translateY(-4px); }
  .hs-cover {
    aspect-ratio: 3/4; border-radius: 12px; position: relative; overflow: hidden;
  }
  .hs-cover .title-line {
    position: absolute; left: 14px; right: 14px; top: 18px;
    font-family: var(--hs-display); font-weight: 700; font-size: 17px;
    line-height: 1.08; letter-spacing: -0.01em; color: #fff;
  }
  .hs-cover .author-line {
    position: absolute; left: 14px; bottom: 14px;
    font-size: 11px; font-weight: 500; letter-spacing: 0.06em;
    color: rgba(255,255,255,0.9); text-transform: uppercase;
  }
  .hs-cover.c-purple { background: linear-gradient(155deg, #8F4FD6 0%, #5a2b9a 100%); }
  .hs-cover.c-orange { background: linear-gradient(155deg, #FF934A 0%, #c65a1e 100%); }
  .hs-cover.c-ink    { background: linear-gradient(155deg, #1a1a1a 0%, #3a3a3a 100%); }
  .hs-cover.c-pink   { background: linear-gradient(155deg, #E0004F 0%, #8a002f 100%); }
  .hs-cover.c-lime   { background: linear-gradient(155deg, #C9F27F 0%, #8ac13a 100%); }
  .hs-cover.c-lime .title-line, .hs-cover.c-lime .author-line { color: var(--hs-ink); }
  .hs-cover.c-taupe  { background: linear-gradient(155deg, #5b4d3d 0%, #2e251c 100%); }
  .hs-cover.c-cream  { background: linear-gradient(155deg, #e8dfcb 0%, #c5b89c 100%); }
  .hs-cover.c-cream .title-line, .hs-cover.c-cream .author-line { color: var(--hs-ink); }

  .hs-book-card .name { font-family: var(--hs-display); font-weight: 700; font-size: 18px; line-height: 1.15; }
  .hs-book-card .author { font-size: 13px; color: var(--hs-muted); margin-top: 2px; }
  .hs-book-card .row {
    display: flex; justify-content: space-between; align-items: center;
    padding-top: 10px; border-top: 1px dashed var(--hs-rule);
  }
  .hs-book-card .badge {
    font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--hs-purple);
  }
  .hs-book-card .add {
    background: var(--hs-ink); color: #fff; width: 34px; height: 34px;
    border-radius: 999px; display: grid; place-items: center;
    font-size: 14px; border: 0; cursor: pointer;
    transition: background .2s;
  }
  .hs-book-card:hover .add { background: var(--hs-pink); }

  /* ---------- PRICING SPLIT ---------- */
  .hs-split { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .hs-panel {
    border-radius: 28px; padding: 48px;
    display: flex; flex-direction: column; gap: 22px; min-height: 420px;
  }
  .hs-panel.lime { background: #ffffff; color: var(--hs-ink); border: 1px solid var(--hs-rule); }
  .hs-panel.ink  { background: var(--hs-ink);  color: #fff; }
  .hs-panel h3 { font-size: 40px; line-height: 1.02; letter-spacing: -0.02em; color: inherit; }
  .hs-panel.ink h3 { color: #fff; }
  .hs-panel .k {
    font-family: var(--hs-mono); font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase;
  }
  .hs-panel.lime .k { color: var(--hs-purple); }
  .hs-panel.ink  .k { color: var(--hs-lime); }
  .hs-panel p { color: inherit; opacity: 0.85; max-width: 42ch; font-size: 15.5px; }
  .hs-list { display: flex; flex-direction: column; gap: 10px; margin: 6px 0; padding: 0; }
  .hs-list li {
    list-style: none; display: flex; gap: 12px; align-items: center; font-size: 15px;
  }
  .hs-list li::before {
    content: "✓"; width: 22px; height: 22px; border-radius: 999px;
    display: grid; place-items: center; font-size: 11px; font-weight: 700; flex-shrink: 0;
  }
  .hs-panel.lime .hs-list li::before { background: var(--hs-ink); color: var(--hs-lime); }
  .hs-panel.ink  .hs-list li::before { background: var(--hs-pink); color: #fff; }
  .hs-panel-foot {
    display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; gap: 20px;
  }
  .hs-price-big {
    font-family: var(--hs-display); font-weight: 700; font-size: 54px;
    line-height: 1; letter-spacing: -0.03em;
  }
  .hs-price-big small { font-size: 16px; font-weight: 500; opacity: 0.7; margin-left: 6px; font-family: var(--hs-ui); }
  .hs-btn-local {
    border: 0; padding: 14px 22px; border-radius: 999px;
    font-weight: 600; font-size: 14.5px;
    display: inline-flex; align-items: center; gap: 10px;
    cursor: pointer; font-family: inherit;
  }
  .hs-panel.lime .hs-btn-local { background: var(--hs-ink);  color: #fff; }
  .hs-panel.ink  .hs-btn-local { background: var(--hs-lime); color: var(--hs-ink); }
  .hs-btn-local .a {
    width: 22px; height: 22px; border-radius: 999px;
    display: grid; place-items: center; font-size: 11px;
  }
  .hs-panel.lime .hs-btn-local .a { background: var(--hs-pink); color: #fff; }
  .hs-panel.ink  .hs-btn-local .a { background: var(--hs-ink); color: var(--hs-lime); }

  /* ---------- EVENTS CALENDAR ---------- */
  .hs-calendar {
    display: grid; grid-template-columns: 1fr; gap: 0;
    background: var(--hs-card); border: 1px solid var(--hs-rule); border-radius: 24px; overflow: hidden;
  }
  .hs-row-ev {
    display: grid; grid-template-columns: 120px 1.4fr 1fr auto;
    gap: 32px; align-items: center; padding: 24px 32px;
    border-top: 1px solid var(--hs-rule); cursor: pointer; transition: background .15s;
    text-align: left;
  }
  .hs-row-ev:first-child { border-top: 0; }
  .hs-row-ev:hover { background: #fbf7ec; }
  .hs-row-ev .d {
    font-family: var(--hs-display); font-weight: 700; font-size: 14px;
    letter-spacing: 0.04em; text-transform: uppercase; color: var(--hs-purple);
  }
  .hs-row-ev .d b {
    display: block; font-size: 40px; color: var(--hs-ink);
    letter-spacing: -0.02em; text-transform: none; margin-top: 2px; line-height: 1;
  }
  .hs-row-ev .t h4 { font-size: 22px; line-height: 1.15; }
  .hs-row-ev .t h4 em { color: var(--hs-purple); font-style: italic; font-weight: 400; }
  .hs-row-ev .t p { font-size: 14px; color: var(--hs-muted); margin-top: 4px; }
  .hs-row-ev .tag {
    font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
    padding: 6px 12px; border-radius: 999px; justify-self: start;
  }
  .hs-tag-sage    { background: #e4f5bf; color: #4a6418; }
  .hs-tag-peach   { background: #ffeedd; color: #a84a0f; }
  .hs-tag-lavender{ background: #f0e3ff; color: #5a2b9a; }
  .hs-tag-pink    { background: #ffe1eb; color: #a30039; }
  .hs-tag-soft    { background: #ffe1eb; color: #a30039; }
  .hs-row-ev .go {
    width: 38px; height: 38px; border-radius: 999px; background: var(--hs-ink); color: #fff;
    display: grid; place-items: center; font-size: 14px;
    transition: background .2s;
  }
  .hs-row-ev:hover .go { background: var(--hs-pink); }

  /* ---------- TESTIMONIAL ---------- */
  .hs-testimonial {
    background: var(--hs-orange); border-radius: 28px; padding: 72px 64px;
    display: grid; grid-template-columns: 1fr 1.2fr; gap: 48px;
    align-items: center; color: #1a1a1a;
  }
  .hs-quote-mark {
    font-family: var(--hs-display); font-weight: 700; font-size: 160px;
    line-height: 0.7; color: #1a1a1a;
  }
  .hs-tm-kicker {
    font-family: var(--hs-mono); font-size: 12px; letter-spacing: 0.18em;
    text-transform: uppercase; margin-top: 10px;
  }
  .hs-testimonial blockquote {
    margin: 0; font-family: var(--hs-display); font-weight: 400; font-style: italic;
    font-size: 28px; line-height: 1.25; letter-spacing: -0.01em; color: var(--hs-ink);
  }
  .hs-testimonial blockquote em { font-style: italic; }
  .hs-testimonial .who { margin-top: 28px; display: flex; align-items: center; gap: 14px; }
  .hs-testimonial .who .ava {
    width: 48px; height: 48px; border-radius: 999px;
    background: var(--hs-ink); color: var(--hs-lime);
    display: grid; place-items: center; font-weight: 700;
    font-family: var(--hs-display); font-size: 18px;
  }
  .hs-testimonial .who b { display: block; font-weight: 600; font-size: 15px; }
  .hs-testimonial .who span { font-size: 13px; opacity: 0.7; }

  /* ---------- DISPATCH (shared with Blog page) ---------- */
  /* Blog's stylesheet only loads on /blog — duplicate the rules here
     so the same component renders correctly when used on home. */
  .home-sections .blog-dispatch {
    background: var(--hs-ink);
    border-radius: 28px;
    padding: 48px 56px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 48px;
    align-items: center;
    color: #fff;
  }
  .home-sections .blog-dispatch-kicker {
    font-family: var(--hs-mono); font-size: 12px;
    letter-spacing: 0.18em; text-transform: uppercase;
    color: var(--hs-lime); margin-bottom: 12px;
  }
  .home-sections .blog-dispatch-title {
    font-family: var(--hs-display); font-weight: 400;
    font-size: clamp(30px, 3.4vw, 44px); line-height: 1.05;
    letter-spacing: -0.015em; color: #fff; margin: 0 0 14px;
  }
  .home-sections .blog-dispatch-title em {
    color: var(--hs-lime); font-style: italic; font-weight: 400;
  }
  .home-sections .blog-dispatch-lede {
    color: rgba(255,255,255,0.75); font-size: 15px; line-height: 1.6;
    margin: 0; max-width: 44ch;
  }
  .home-sections .blog-dispatch-form {
    display: flex; align-items: center; background: #fff;
    border-radius: 999px; padding: 6px;
  }
  .home-sections .blog-dispatch-form input {
    flex: 1; background: transparent; border: 0; outline: none;
    padding: 12px 20px; font-family: inherit; font-size: 15px;
    color: var(--hs-ink); min-width: 0;
  }
  .home-sections .blog-dispatch-form input::placeholder { color: var(--hs-muted); }
  .home-sections .blog-dispatch-form button {
    background: var(--hs-pink); color: #fff; border: 0;
    border-radius: 999px; padding: 12px 24px;
    font-family: inherit; font-weight: 600; font-size: 14px;
    cursor: pointer; transition: background 150ms;
  }
  .home-sections .blog-dispatch-form button:hover { background: var(--hs-lime); color: var(--hs-ink); }
  .home-sections .blog-dispatch-success {
    background: rgba(202,242,126,0.15); color: var(--hs-lime);
    border-radius: 18px; padding: 18px 24px; font-size: 15px;
  }
  .home-sections .blog-dispatch-error {
    color: #ffa8b8; font-size: 13px; margin-top: 8px; padding: 0 12px;
  }

  /* ---------- responsive ---------- */
  @media (max-width: 1023px) {
    .hs-wrap { padding: 0 32px; }
    .hs-section { padding: 72px 0; }
    .hs-head { grid-template-columns: 1fr; gap: 24px; align-items: start; }
    .hs-services { grid-template-columns: 1fr; }
    .hs-arrivals { grid-template-columns: repeat(2, 1fr); }
    .hs-split { grid-template-columns: 1fr; }
    .hs-panel { padding: 36px; min-height: 0; }
    .hs-row-ev { grid-template-columns: 80px 1fr auto; gap: 16px; padding: 20px; }
    .hs-row-ev .tag { display: none; }
    .hs-testimonial { grid-template-columns: 1fr; padding: 48px 36px; gap: 24px; }
    .hs-quote-mark { font-size: 96px; }
    .hs-testimonial blockquote { font-size: 22px; }
  }
`;

// --- helpers ----------------------------------------------------------
function isoToMonthDay(iso) {
  if (!iso) return { m: '', d: '' };
  const [, mm, dd] = String(iso).split('-');
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return { m: months[parseInt(mm, 10) - 1] || '', d: parseInt(dd, 10) || '' };
}
function badgeText(e) {
  const map = {
    'weekly':      'WEEKLY',
    'monthly':     'MONTHLY',
    'prix-fixe':   'PRIX FIXE',
    'drop-in':     'DROP IN',
    'guest-night': 'GUEST',
  };
  const base = map[e.badge] || (e.category || '').toUpperCase();
  const { m, d } = isoToMonthDay(e.iso);
  return `${base} · ${m} ${d}`;
}
function chipClass(e) {
  switch (e.category) {
    case 'silent-reading': return 'hs-tag-sage';
    case 'guest-night':    return 'hs-tag-peach';
    case 'book-club':      return 'hs-tag-lavender';
    case 'poetry-supper':  return 'hs-tag-pink';
    case 'members-only':   return 'hs-tag-soft';
    default:               return 'hs-tag-lavender';
  }
}

// --- subsections ------------------------------------------------------
function ServicesSection() {
  return (
    <section className="hs-section" id="services">
      <div className="hs-wrap">
        <div className="hs-head">
          <div>
            <div className="hs-kicker">Our Services</div>
            <h2>Everything a reader needs, <span className="p">under one roof.</span></h2>
          </div>
          <p className="hs-lede">
            Three ways to use the room: take a book home, borrow one for a week, or come read with a group.
            Coffee, wine, and tapas served throughout.
          </p>
        </div>
        <div className="hs-services">
          <div className="hs-service">
            <div className="ic">Aa</div>
            <h3>Buying Books</h3>
            <p>A small, carefully-chosen shelf for purchase — new releases, small presses, and staff favorites. Always 10% off for members.</p>
            <Link className="more" to="/shop">Visit the shop <span className="a">→</span></Link>
          </div>
          <div className="hs-service">
            <div className="ic">↺</div>
            <h3>Lending Library</h3>
            <p>Over 2,400 books you can borrow on the honor system. Take two home at a time, return within three weeks.</p>
            <Link className="more" to="/library">Browse the library <span className="a">→</span></Link>
          </div>
          <div className="hs-service">
            <div className="ic">☕</div>
            <h3>Events &amp; Book Clubs</h3>
            <p>Six weekly clubs, poetry suppers, and silent reading Saturdays. Come once as a guest — decide later.</p>
            <Link className="more" to="/events">See the calendar <span className="a">→</span></Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function NewArrivalsSection() {
  const { addBook } = useCart();
  const { data: rows } = useShopBooks();
  const books = adaptShopBooks(rows).slice(0, 8);

  const onAdd = (book) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    const effective = Math.round(book.price * (1 - MEMBER_DISCOUNT_RATE));
    addBook({ id: book.id, title: book.title, author: book.author, sales_price: effective });
  };

  return (
    <section className="hs-section" id="arrivals" style={{ paddingTop: 20 }}>
      <div className="hs-wrap">
        <div className="hs-head">
          <div>
            <div className="hs-kicker">New on the shelf</div>
            <h2>This week’s <span className="p">arrivals.</span></h2>
          </div>
          <p className="hs-lede">
            Freshly unpacked from the small-press boxes and the translators’ stacks. Borrow for free, or take one home.
          </p>
        </div>
        <div className="hs-arrivals">
          {books.map((b) => (
            <Link to="/shop" key={b.id} className="hs-book-card">
              <div className={`hs-cover c-${b.coverVariant}`}>
                <div className="title-line">{b.title}</div>
                <div className="author-line">{b.author}</div>
              </div>
              <div>
                <div className="name">{b.title}</div>
                <div className="author">{b.author}</div>
              </div>
              <div className="row">
                <span className="badge">{(b.clubs?.[0] || b.categories?.[0] || 'Stock')}</span>
                <button type="button" className="add" aria-label={`Add ${b.title} to cart`} onClick={onAdd(b)}>+</button>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section className="hs-section" id="membership" style={{ paddingTop: 40 }}>
      <div className="hs-wrap">
        <div className="hs-head">
          <div>
            <div className="hs-kicker">Pricing &amp; Plans</div>
            <h2>Two ways to <span className="p">pull up a chair.</span></h2>
          </div>
          <p className="hs-lede">
            Drop in whenever you like — or become a member and unlock every club, a quarterly book, and 10% off the kitchen.
          </p>
        </div>
        <div className="hs-split">
          <div className="hs-panel lime">
            <div className="k">Drop-in</div>
            <h3>The Reading Room</h3>
            <p>Free to enter. Borrow one book at a time, read all afternoon. Buy a coffee or a plate if the mood strikes.</p>
            <ul className="hs-list">
              <li>Lending library, honor system</li>
              <li>Wi-Fi, quiet tables, long hours</li>
              <li>One guest club visit per month</li>
            </ul>
            <div className="hs-panel-foot">
              <div className="hs-price-big">Free</div>
              <Link className="hs-btn-local" to="/library">Visit today <span className="a">→</span></Link>
            </div>
          </div>
          <div className="hs-panel ink">
            <div className="k">Membership</div>
            <h3>The Chair</h3>
            <p>A seat at every club, a book of your choice each quarter, 10% off the kitchen, and first dibs on supper events.</p>
            <ul className="hs-list">
              <li>All six weekly book clubs</li>
              <li>One book per quarter, on us</li>
              <li>10% off food, wine &amp; coffee</li>
              <li>Priority RSVP for supper events</li>
            </ul>
            <div className="hs-panel-foot">
              <div className="hs-price-big">₹467<small>/month</small></div>
              <Link className="hs-btn-local" to="/sign-up">Become a member <span className="a">→</span></Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function UpcomingEventsSection() {
  const { data: rows } = useEvents();
  const upcoming = splitEvents(rows || []).upcoming;
  const today = new Date().toISOString().slice(0, 10);
  const events = upcoming
    .filter((e) => e.iso >= today)
    .sort((a, b) => (a.iso || '').localeCompare(b.iso || ''))
    .slice(0, 5);

  return (
    <section className="hs-section" id="upcoming" style={{ paddingTop: 40 }}>
      <div className="hs-wrap">
        <div className="hs-head">
          <div>
            <div className="hs-kicker">Upcoming Events</div>
            <h2>On the calendar <span className="p">this season.</span></h2>
          </div>
          <p className="hs-lede">
            Weekly clubs, translator evenings, poetry suppers, and the occasional quiet Saturday. All welcome, members first.
          </p>
        </div>
        <div className="hs-calendar">
          {events.map((e) => {
            const { m, d } = isoToMonthDay(e.iso);
            return (
              <Link key={e.slug} to="/events" className="hs-row-ev">
                <div className="d">{m}<b>{d}</b></div>
                <div className="t">
                  <h4>{e.title} <em>{e.italic}</em></h4>
                  <p>{e.description}</p>
                </div>
                <span className={`tag ${chipClass(e)}`}>{badgeText(e)}</span>
                <span className="go">→</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TestimonialSection() {
  const { data: rows } = useHomeTestimonials();
  const t = (rows || []).find((r) => r.is_featured) || (rows || [])[0];
  if (!t) return null;
  return (
    <section className="hs-section" style={{ paddingTop: 0 }}>
      <div className="hs-wrap">
        <div className="hs-testimonial">
          <div>
            <div className="hs-quote-mark">“</div>
            <div className="hs-tm-kicker">What readers say</div>
          </div>
          <div>
            <blockquote dangerouslySetInnerHTML={{ __html: t.quote }} />
            <div className="who">
              <div className="ava">{t.initials}</div>
              <div>
                <b>{t.name}</b>
                <span>{t.context}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DispatchSection() {
  return (
    <section className="hs-section" id="dispatch" style={{ paddingTop: 0 }}>
      <div className="hs-wrap">
        <DispatchNewsletter />
      </div>
    </section>
  );
}

// --- root -------------------------------------------------------------
export default function HomeSections() {
  return (
    <div className="home-sections">
      <style>{HOME_SECTIONS_CSS}</style>
      <ServicesSection />
      <NewArrivalsSection />
      <PricingSection />
      <UpcomingEventsSection />
      <TestimonialSection />
      <DispatchSection />
    </div>
  );
}
