import React from 'react';
import { Link } from 'react-router-dom';

// =====================================================================
// TapasFigmaBlocks
//
// Six editable CMS blocks that together compose the Figma home page.
// Every text/image/button is a prop so staff can edit them in the
// editor. Keeps visual parity with the previous hard-coded layout but
// makes the page 100% composable.
// =====================================================================

const LIME = '#CFF389';
const PINK = '#EF3D7B';
const PINK_DARK = '#D02A65';
const INK = '#1F2937';
const INK_DIM = '#4B5563';
const INK_FAINT = '#9CA3AF';
const PURPLE = '#7E22CE';

const asset = (name) => (name && !name.startsWith('http') && !name.startsWith('/')
  ? `${process.env.PUBLIC_URL || ''}/${name}`
  : name);

// Ultra-minimal Markdown renderer for inline text fields. Supports the
// three things staff actually type: **bold**, *italic*, and [label](url)
// links. Returns an array of React nodes that can be dropped inline
// inside a <p>, <span>, or <div>. No HTML parsing — every other char is
// preserved verbatim. Safe against XSS because we never dangerouslySet.
function renderInlineMarkdown(text) {
  if (typeof text !== 'string' || !text) return text;
  // Escape nothing — we only match a small alphabet of tokens and emit
  // plain React nodes, so HTML in the source text stays literal.
  const out = [];
  let i = 0;
  let key = 0;
  const pushText = (t) => { if (t) out.push(t); };
  while (i < text.length) {
    // Link: [label](url)
    if (text[i] === '[') {
      const close = text.indexOf('](', i);
      const end = close >= 0 ? text.indexOf(')', close + 2) : -1;
      if (close > i && end > close) {
        const label = text.slice(i + 1, close);
        const url = text.slice(close + 2, end);
        out.push(<a key={`md-${key++}`} href={url} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>{label}</a>);
        i = end + 1;
        continue;
      }
    }
    // Bold: **text**
    if (text[i] === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2);
      if (end > i + 2) {
        out.push(<strong key={`md-${key++}`}>{text.slice(i + 2, end)}</strong>);
        i = end + 2;
        continue;
      }
    }
    // Italic: *text* (but not inside ** which was handled above)
    if (text[i] === '*') {
      const end = text.indexOf('*', i + 1);
      if (end > i + 1) {
        out.push(<em key={`md-${key++}`}>{text.slice(i + 1, end)}</em>);
        i = end + 1;
        continue;
      }
    }
    // Plain text run — greedily consume until the next marker.
    let j = i;
    while (j < text.length && text[j] !== '*' && text[j] !== '[') j++;
    pushText(text.slice(i, j));
    i = j;
  }
  return out;
}

const MD = renderInlineMarkdown;

function Placeholder({ ratio = '4 / 3', label, bg = '#E5E7EB' }) {
  return (
    <div style={{
      width: '100%', aspectRatio: ratio, background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: INK_FAINT, fontSize: '12px', letterSpacing: '0.5px',
      textTransform: 'uppercase', fontWeight: 600,
      borderRadius: '8px', overflow: 'hidden',
    }}>
      {label}
    </div>
  );
}

function ImageOrPlaceholder({ src, ratio, label, bg }) {
  const [failed, setFailed] = React.useState(false);
  if (failed || !src) return <Placeholder ratio={ratio} label={label} bg={bg} />;
  return (
    <img
      src={asset(src)}
      alt={label}
      onError={() => setFailed(true)}
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
    />
  );
}

// ---------------------------------------------------------------------
// 1. Hero — lime wave + photo on the right
// ---------------------------------------------------------------------
export function TapasHero({
  headline_line1 = 'Discover Our',
  headline_line2 = 'New Collection',
  description = 'Curated reads from our shelves — fresh fiction, deep non-fiction, and the year\'s most-talked-about titles, all under one roof.',
  cta_text = 'Join now!',
  cta_href = '/books',
  image_url = 'HERO-LIBRARY.png',
}) {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', background: LIME, marginTop: '-64px' }}>
      <style>{`
        @keyframes tapas-fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        .tapas-hero-wrap { display: grid; grid-template-columns: 0.9fr 1.3fr; min-height: 720px; }
        .tapas-hero-photo { position: relative; }
        @media (max-width: 900px) {
          .tapas-hero-wrap { grid-template-columns: 1fr; min-height: auto; }
          .tapas-hero-photo { aspect-ratio: 4 / 3; }
        }
      `}</style>
      <div className="tapas-hero-wrap">
        <div style={{
          background: LIME, position: 'relative',
          padding: 'clamp(40px, 6vw, 96px) clamp(20px, 6vw, 80px)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          animation: 'tapas-fade-up 600ms ease-out',
        }}>
          <h1 style={{
            margin: 0, fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
            fontSize: 'clamp(34px, 4.5vw, 58px)', lineHeight: 1.05,
            color: INK, fontWeight: 700, letterSpacing: '-0.01em',
          }}>
            {headline_line1}<br />{headline_line2}
          </h1>
          <p style={{ marginTop: '18px', maxWidth: '440px', color: INK_DIM, fontSize: '15px', lineHeight: 1.65 }}>
            {MD(description)}
          </p>
          <div style={{ marginTop: '28px' }}>
            <Link
              to={cta_href}
              style={{
                display: 'inline-block', padding: '14px 30px', borderRadius: '999px',
                background: PINK, color: '#fff', fontWeight: 700, fontSize: '14px',
                letterSpacing: '0.5px', textDecoration: 'none', textTransform: 'uppercase',
                boxShadow: '0 8px 20px rgba(239,61,123,0.35)',
                transition: 'transform 200ms, box-shadow 200ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = PINK_DARK; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = PINK; e.currentTarget.style.transform = 'none'; }}
            >
              {cta_text}
            </Link>
          </div>
        </div>

        <div className="tapas-hero-photo" style={{ background: LIME }}>
          <ImageOrPlaceholder src={image_url} ratio="auto" label="Hero photo" bg="transparent" />
        </div>
      </div>

      <svg
        viewBox="0 0 160 600" preserveAspectRatio="none" aria-hidden="true"
        className="tapas-hero-wave"
        style={{
          position: 'absolute', top: 0, left: '50%', height: '100%',
          width: '120px', transform: 'translateX(-60px)', display: 'block', pointerEvents: 'none',
        }}
      >
        <path d="M 0,0 L 40,0 C 80,150 20,300 90,450 C 120,540 60,580 40,600 L 0,600 Z" fill={LIME} />
      </svg>
      <style>{`@media (max-width: 900px) { .tapas-hero-wave { display: none !important; } }`}</style>
    </section>
  );
}

// ---------------------------------------------------------------------
// 2. Services — 3 cards (icon, title, body, link)
// ---------------------------------------------------------------------
export function TapasServices({
  eyebrow = 'Our Services',
  heading = 'We provide great services for our customers based on',
  items = [
    { icon: '📚', title: 'Buying Books', body: 'Browse our curated catalogue and take new titles home — from indie debuts to global bestsellers.', cta_text: 'Learn more', cta_href: '/books' },
    { icon: '🪪', title: 'Lending Books', body: 'Become a member and borrow up to four books at a time. Renewals are free, late fees are gentle.', cta_text: 'Learn more', cta_href: '/profile' },
    { icon: '🎤', title: 'Events', body: 'Author readings, book clubs, and quiet study evenings — there is always something on the calendar.', cta_text: 'Learn more', cta_href: '/blog' },
  ],
}) {
  return (
    <section style={{ background: LIME, padding: 'clamp(60px, 8vw, 110px) 20px' }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '54px' }}>
          <div style={{ color: PURPLE, fontWeight: 700, fontSize: '12px', letterSpacing: '2.5px', textTransform: 'uppercase' }}>
            {eyebrow}
          </div>
          <h2 style={{
            marginTop: '12px', fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
            fontSize: 'clamp(28px, 3.6vw, 40px)', color: INK, fontWeight: 700,
            lineHeight: 1.2, maxWidth: '720px', marginInline: 'auto',
          }}>
            {heading}
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
          {(items || []).map((s, i) => (
            <ServiceCard key={i} {...s} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceCard({ icon, title, body, cta_text, cta_href }) {
  return (
    <div
      style={{
        background: '#fff', borderRadius: '12px', padding: '36px 28px 28px',
        textAlign: 'center', boxShadow: '0 8px 30px rgba(31,41,55,0.08)',
        transition: 'transform 250ms, box-shadow 250ms',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(31,41,55,0.14)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(31,41,55,0.08)'; }}
    >
      <div style={{ fontSize: '64px', lineHeight: 1, marginBottom: '20px' }}>{icon}</div>
      <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: INK, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
        {title}
      </h3>
      <p style={{ marginTop: '14px', color: INK_DIM, fontSize: '14px', lineHeight: 1.6, minHeight: '64px' }}>
        {MD(body)}
      </p>
      {cta_text && cta_href && (
        <Link to={cta_href} style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          marginTop: '18px', color: PURPLE, fontWeight: 700,
          fontSize: '13px', textDecoration: 'none',
        }}>
          {cta_text} <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// 3. New Arrivals — 4 product cards
// ---------------------------------------------------------------------
export function TapasNewArrivals({
  eyebrow = 'New Arrivals',
  items = [
    { title: 'Syltherine', sub: 'Stylish café chair', price: 'Rp 2.500.000', strike: 'Rp 3.500.000', badge: '-30%', image_url: 'arrival-1.jpg' },
    { title: 'Leviosa',    sub: 'Stylish café chair', price: 'Rp 2.500.000', strike: '',              badge: '',     image_url: 'arrival-2.jpg' },
    { title: 'Lolito',     sub: 'Luxury big sofa',    price: 'Rp 7.000.000', strike: 'Rp 14.000.000', badge: '-50%', image_url: 'arrival-3.jpg' },
    { title: 'Respira',    sub: 'Outdoor bar table',  price: 'Rp 500.000',   strike: '',              badge: 'New',  image_url: 'arrival-4.jpg' },
  ],
}) {
  return (
    <section style={{ background: LIME, padding: '0 20px clamp(60px, 8vw, 110px)' }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '38px' }}>
          <div style={{ color: PURPLE, fontWeight: 700, fontSize: '12px', letterSpacing: '2.5px', textTransform: 'uppercase' }}>
            {eyebrow}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          {(items || []).map((a, i) => <ArrivalCard key={i} {...a} />)}
        </div>
      </div>
    </section>
  );
}

function ArrivalCard({ title, sub, price, strike, badge, image_url }) {
  const [hovered, setHovered] = React.useState(false);
  const badgeColor = badge === 'New' ? '#2BB673' : PINK;
  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff', borderRadius: '4px', overflow: 'hidden',
        position: 'relative', cursor: 'pointer',
        boxShadow: hovered ? '0 14px 30px rgba(31,41,55,0.16)' : '0 4px 14px rgba(31,41,55,0.06)',
        transition: 'box-shadow 200ms',
      }}
    >
      <div style={{ position: 'relative' }}>
        <ImageOrPlaceholder src={image_url} ratio="1 / 1" label={title} bg="#E5E7EB" />
        {badge && (
          <span style={{
            position: 'absolute', top: '14px', right: '14px',
            background: badgeColor, color: '#fff',
            width: '46px', height: '46px', borderRadius: '50%',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 700,
          }}>{badge}</span>
        )}
      </div>
      <div style={{ padding: '16px 18px 22px' }}>
        <div style={{ fontSize: '20px', fontWeight: 700, color: INK }}>{title}</div>
        <div style={{ marginTop: '4px', fontSize: '13px', color: INK_FAINT }}>{sub}</div>
        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <span style={{ fontSize: '17px', fontWeight: 700, color: INK }}>{price}</span>
          {strike && <span style={{ fontSize: '12px', color: INK_FAINT, textDecoration: 'line-through' }}>{strike}</span>}
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------
// 4. Room Inspiration — split layout with 2 images + CTA
// ---------------------------------------------------------------------
export function TapasInspiration({
  heading_line1 = '50+ Beautiful rooms',
  heading_line2 = 'inspiration',
  description = 'Our designers have already arranged a lot of beautiful prototypes of reading nooks that inspire us.',
  cta_text = 'Explore More',
  cta_href = '/blog',
  image_1_url = 'room-1.jpg',
  image_2_url = 'room-2.jpg',
  badge_eyebrow = '01 — Bed Room',
  badge_title = 'Inner Peace',
  background_color = '#FBF8EE',
}) {
  return (
    <section style={{ background: background_color, padding: 'clamp(60px, 8vw, 100px) 20px' }}>
      <style>{`
        .tapas-rooms { display: grid; grid-template-columns: 1fr 1.4fr; gap: clamp(24px, 4vw, 60px); align-items: center; max-width: 1180px; margin: 0 auto; }
        @media (max-width: 900px) { .tapas-rooms { grid-template-columns: 1fr; } }
      `}</style>
      <div className="tapas-rooms">
        <div>
          <h2 style={{
            margin: 0, fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
            fontSize: 'clamp(28px, 3.6vw, 40px)', color: INK, fontWeight: 700,
            lineHeight: 1.2, letterSpacing: '-0.01em',
          }}>
            {heading_line1}<br />{heading_line2}
          </h2>
          <p style={{ marginTop: '14px', color: INK_DIM, fontSize: '14px', lineHeight: 1.65, maxWidth: '320px' }}>
            {MD(description)}
          </p>
          {cta_text && (
            <Link to={cta_href} style={{
              display: 'inline-block', marginTop: '24px', padding: '12px 26px',
              borderRadius: '6px', background: PINK, color: '#fff', fontWeight: 700,
              fontSize: '13px', textDecoration: 'none', letterSpacing: '0.5px', textTransform: 'uppercase',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = PINK_DARK; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = PINK; }}
            >
              {cta_text}
            </Link>
          )}
        </div>
        <div style={{ display: 'flex', gap: '20px', overflow: 'hidden', position: 'relative' }}>
          <div style={{ flex: '0 0 60%', position: 'relative' }}>
            <ImageOrPlaceholder src={image_1_url} ratio="3 / 4" label="inspiration-1" bg="#EAE3D2" />
            {(badge_eyebrow || badge_title) && (
              <div style={{
                position: 'absolute', bottom: '16px', left: '16px',
                background: 'rgba(255,255,255,0.92)', padding: '14px 18px', borderRadius: '6px',
              }}>
                <div style={{ fontSize: '11px', color: INK_FAINT, letterSpacing: '1px' }}>{badge_eyebrow}</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: INK }}>{badge_title}</div>
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <ImageOrPlaceholder src={image_2_url} ratio="3 / 4" label="inspiration-2" bg="#F0EAD8" />
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------
// 5. Testimonials — centered quote grid
// ---------------------------------------------------------------------
export function TapasTestimonials({
  items = [
    { quote: 'You made it so simple.', body: 'My new shelf is so much faster and easier to browse than my old library app.', author: 'Corey Valdez', role: 'Founder at Zenix' },
    { quote: 'Simply the best.',        body: "Better than all the rest. I'd recommend this place to beginners.", author: 'Ian Klein', role: 'Digital Marketer' },
  ],
  background_color = LIME,
}) {
  return (
    <section style={{ background: background_color, padding: 'clamp(60px, 8vw, 100px) 20px' }}>
      <div style={{
        maxWidth: '1080px', margin: '0 auto',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '40px', textAlign: 'center',
      }}>
        {(items || []).map((r, i) => (
          <div key={i}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', background: '#D1D5DB',
              margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#6B7280', fontSize: '28px',
            }}>👤</div>
            <div style={{ fontFamily: 'var(--tapas-heading-font, Newsreader, serif)', fontSize: '20px', fontWeight: 700, color: INK }}>
              "{r.quote}"
            </div>
            <p style={{ marginTop: '10px', color: INK_DIM, fontSize: '14px', lineHeight: 1.6, maxWidth: '320px', marginInline: 'auto' }}>
              {MD(r.body)}
            </p>
            <div style={{ marginTop: '18px', fontWeight: 700, color: INK, fontSize: '14px' }}>{r.author}</div>
            <div style={{ color: INK_FAINT, fontSize: '12px' }}>{r.role}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------
// 6. Newsletter strip — dark bg
// ---------------------------------------------------------------------
export function TapasNewsletter({
  headline = '✉ Subscribe to our Newsletter',
  subtext = 'Monthly book picks, member events, and quiet announcements.',
  placeholder = 'Your email address',
  button_text = 'Subscribe',
  background_color = '#1F1F1F',
}) {
  return (
    <section style={{ background: background_color, padding: '34px 20px' }}>
      <div style={{
        maxWidth: '1180px', margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '24px', flexWrap: 'wrap', color: '#fff',
      }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 700 }}>{headline}</div>
          <div style={{ fontSize: '12px', color: '#A0A0A0', marginTop: '4px' }}>
            {MD(subtext)}
          </div>
        </div>
        <form
          onSubmit={(e) => e.preventDefault()}
          style={{ display: 'flex', gap: '8px', flex: '1 1 320px', maxWidth: '520px' }}
        >
          <input
            type="email" placeholder={placeholder}
            style={{
              flex: 1, padding: '12px 16px', border: 'none',
              background: '#2A2A2A', color: '#fff',
              borderRadius: '4px', fontSize: '14px', outline: 'none',
            }}
          />
          <button style={{
            padding: '12px 24px', border: 'none', background: PINK, color: '#fff',
            borderRadius: '4px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', letterSpacing: '0.5px',
          }}>{button_text}</button>
        </form>
      </div>
    </section>
  );
}
