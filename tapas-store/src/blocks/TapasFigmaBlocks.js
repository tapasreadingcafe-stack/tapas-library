import React from 'react';
import { Link } from 'react-router-dom';
import { useShopBooks } from '../cms/hooks';
import { adaptShopBooks } from '../cms/adapters';
import { useCart } from '../context/CartContext';

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
export function TapasHero({ props = {} }) {
  const {
    headline_line1 = 'Discover Our',
    headline_line2 = 'New Collection',
    description = 'Curated reads from our shelves — fresh fiction, deep non-fiction, and the year\'s most-talked-about titles, all under one roof.',
    cta_text = 'Join now!',
    cta_href = '/books',
    image_url = 'HERO-LIBRARY.png',
  } = props;
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
export function TapasServices({ props = {} }) {
  const {
    eyebrow = 'Our Services',
    heading = 'We provide great services for our customers based on',
    items = [
      { icon: '📚', title: 'Buying Books', body: 'Browse our curated catalogue and take new titles home — from indie debuts to global bestsellers.', cta_text: 'Learn more', cta_href: '/books' },
      { icon: '🪪', title: 'Lending Books', body: 'Become a member and borrow up to four books at a time. Renewals are free, late fees are gentle.', cta_text: 'Learn more', cta_href: '/profile' },
      { icon: '🎤', title: 'Events', body: 'Author readings, book clubs, and quiet study evenings — there is always something on the calendar.', cta_text: 'Learn more', cta_href: '/blog' },
    ],
  } = props;
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
// Member discount mirrored from the live HomeSections — kept local so
// this block doesn't reach into a sibling component file.
const MEMBER_DISCOUNT_RATE = 0.10;

const formatRupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export function TapasNewArrivals({ props = {} }) {
  const {
    eyebrow = 'New Arrivals',
    source = 'static',          // 'static' | 'live'
    limit = 8,
    show_add_to_cart = true,
    items = [
      { title: 'Syltherine', sub: 'Stylish café chair', price: 'Rp 2.500.000', strike: 'Rp 3.500.000', badge: '-30%', image_url: 'arrival-1.jpg' },
      { title: 'Leviosa',    sub: 'Stylish café chair', price: 'Rp 2.500.000', strike: '',              badge: '',     image_url: 'arrival-2.jpg' },
      { title: 'Lolito',     sub: 'Luxury big sofa',    price: 'Rp 7.000.000', strike: 'Rp 14.000.000', badge: '-50%', image_url: 'arrival-3.jpg' },
      { title: 'Respira',    sub: 'Outdoor bar table',  price: 'Rp 500.000',   strike: '',              badge: 'New',  image_url: 'arrival-4.jpg' },
    ],
  } = props;

  // Always call hooks unconditionally (rules of hooks). The `source`
  // toggle just decides which set of items the renderer maps over.
  const { data: liveRows } = useShopBooks();
  const { addBook } = useCart();

  const liveItems = React.useMemo(() => {
    if (source !== 'live') return [];
    return adaptShopBooks(liveRows)
      .slice(0, Math.max(1, Math.min(48, Number(limit) || 8)))
      .map((b) => {
        const effective = Math.round(Number(b.price || 0) * (1 - MEMBER_DISCOUNT_RATE));
        return {
          id: b.id,
          title: b.title,
          sub: b.author,
          price: formatRupees(effective),
          strike: b.price && effective < b.price ? formatRupees(b.price) : '',
          badge: b.clubs?.[0] || b.categories?.[0] || '',
          image_url: b.coverUrl || '',
          _bookForCart: { id: b.id, title: b.title, author: b.author, sales_price: effective },
        };
      });
  }, [source, liveRows, limit]);

  const renderItems = source === 'live' ? liveItems : (items || []);

  return (
    <section style={{ background: LIME, padding: '0 20px clamp(60px, 8vw, 110px)' }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '38px' }}>
          <div style={{ color: PURPLE, fontWeight: 700, fontSize: '12px', letterSpacing: '2.5px', textTransform: 'uppercase' }}>
            {eyebrow}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          {renderItems.map((a, i) => (
            <ArrivalCard
              key={a.id || i}
              {...a}
              onAddToCart={show_add_to_cart && a._bookForCart ? () => addBook(a._bookForCart) : null}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ArrivalCard({ title, sub, price, strike, badge, image_url, onAddToCart }) {
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
          {onAddToCart && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddToCart(); }}
              aria-label={`Add ${title} to cart`}
              style={{
                marginLeft: 'auto', width: 32, height: 32, borderRadius: '50%',
                background: PINK, color: '#fff', border: 'none', cursor: 'pointer',
                fontSize: 18, lineHeight: 1, fontWeight: 700,
              }}
            >+</button>
          )}
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------
// 4. Room Inspiration — split layout with 2 images + CTA
// ---------------------------------------------------------------------
export function TapasInspiration({ props = {} }) {
  const {
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
  } = props;
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
export function TapasTestimonials({ props = {} }) {
  const {
    items = [
      { quote: 'You made it so simple.', body: 'My new shelf is so much faster and easier to browse than my old library app.', author: 'Corey Valdez', role: 'Founder at Zenix' },
      { quote: 'Simply the best.',        body: "Better than all the rest. I'd recommend this place to beginners.", author: 'Ian Klein', role: 'Digital Marketer' },
    ],
    background_color = LIME,
  } = props;
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
// 7. Section — styled wrapper with heading + subtext. Acts as a
// visual divider / colored band between other blocks. Full-bleed
// background so adjacent sections can use different colors.
// ---------------------------------------------------------------------
export function TapasSection({ props = {} }) {
  const {
    eyebrow = '',
    heading = 'Section heading',
    subtext = '',
    text_color = INK,
    background_color = '#FBF8EE',
    padding_y = 80,
    max_width = 960,
    align = 'center',
  } = props;
  const textAlign = align === 'left' ? 'left' : align === 'right' ? 'right' : 'center';
  const inlineAlign = textAlign === 'center' ? '0 auto' : textAlign === 'right' ? '0 0 0 auto' : '0';
  return (
    <section style={{ background: background_color, padding: `${padding_y}px 20px` }}>
      <div style={{ maxWidth: `${max_width}px`, margin: inlineAlign, textAlign }}>
        {eyebrow && (
          <div style={{
            color: PURPLE, fontWeight: 700, fontSize: '12px',
            letterSpacing: '2.5px', textTransform: 'uppercase',
            marginBottom: '14px',
          }}>
            {eyebrow}
          </div>
        )}
        <h2 style={{
          margin: 0, fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
          fontSize: 'clamp(28px, 3.6vw, 44px)', color: text_color,
          fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.01em',
        }}>
          {MD(heading)}
        </h2>
        {subtext && (
          <p style={{
            marginTop: '18px', color: text_color, opacity: 0.75,
            fontSize: '16px', lineHeight: 1.7,
            maxWidth: textAlign === 'center' ? '640px' : '100%',
            margin: textAlign === 'center' ? '18px auto 0' : '18px 0 0',
          }}>
            {MD(subtext)}
          </p>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------
// 6. Newsletter strip — dark bg
// ---------------------------------------------------------------------
export function TapasNewsletter({ props = {} }) {
  const {
    headline = '✉ Subscribe to our Newsletter',
    subtext = 'Monthly book picks, member events, and quiet announcements.',
    placeholder = 'Your email address',
    button_text = 'Subscribe',
    background_color = '#1F1F1F',
  } = props;
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


// =====================================================================
// Below: 3 blocks added in Phase 1 of the visual-builder migration
// (PR follow-up to #58). They each mirror one section of the live
// HomeSections.js (UpcomingEventsSection / PricingSection /
// TestimonialSection) so a block-tree home page can recreate it.
// Inline CSS — no external stylesheet dependency.
// =====================================================================

// Local palette mirrored from HomeSections.js so blocks render
// identically when the host page doesn't include the hs-* classes.
const HS_INK    = '#1F1B16';
const HS_LIME   = '#caf27e';
const HS_PURPLE = '#7E22CE';
const HS_ORANGE = '#FF934A';
const HS_PINK   = '#EF3D7B';
const HS_RULE   = 'rgba(31,27,22,0.10)';
const HS_CARD   = '#fffaf0';

const _MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
function _isoMD(iso) {
  if (!iso) return { m: '', d: '' };
  const [, mm, dd] = String(iso).split('-');
  return { m: _MONTHS[parseInt(mm, 10) - 1] || '', d: parseInt(dd, 10) || '' };
}
function _badgeText(e) {
  const map = { 'weekly': 'WEEKLY', 'monthly': 'MONTHLY', 'prix-fixe': 'PRIX FIXE', 'drop-in': 'DROP IN', 'guest-night': 'GUEST' };
  const base = map[e.badge] || (e.category || '').toUpperCase();
  const { m, d } = _isoMD(e.iso);
  return base ? `${base} · ${m} ${d}` : `${m} ${d}`;
}
function _chipBg(category) {
  switch (category) {
    case 'silent-reading': return { bg: '#e4f5bf', fg: '#4a6418' };
    case 'guest-night':    return { bg: '#ffeedd', fg: '#a84a0f' };
    case 'book-club':      return { bg: '#f0e3ff', fg: '#5a2b9a' };
    case 'poetry-supper':  return { bg: '#ffe1eb', fg: '#a30039' };
    case 'members-only':   return { bg: '#ffe1eb', fg: '#a30039' };
    default:               return { bg: '#f0e3ff', fg: '#5a2b9a' };
  }
}

// ---------------------------------------------------------------------
// TapasEventsCalendar — calendar-grid block matching the live home
// UpcomingEventsSection (date column · title+lede · category chip ·
// arrow-button row).
// ---------------------------------------------------------------------
export function TapasEventsCalendar({ props = {} }) {
  const {
    eyebrow = 'Upcoming Events',
    heading_html = 'On the calendar <em>this season.</em>',
    lede = 'Weekly clubs, translator evenings, poetry suppers, and the occasional quiet Saturday. All welcome, members first.',
    limit = 5,
    cta_href = '/events',
  } = props;

  // Lazy-required so blocks/index.js can import this component without
  // pulling the whole CMS hook graph for static-only callers.
  const { useEvents } = require('../cms/hooks');
  const { splitEvents } = require('../cms/adapters');
  const { data: rows } = useEvents();

  const today = new Date().toISOString().slice(0, 10);
  const events = (splitEvents(rows || []).upcoming || [])
    .filter((e) => e.iso >= today)
    .sort((a, b) => (a.iso || '').localeCompare(b.iso || ''))
    .slice(0, Math.max(1, Math.min(20, Number(limit) || 5)));

  return (
    <section style={{ padding: 'clamp(60px, 8vw, 96px) 20px 40px' }}>
      <style>{`
        .tpx-cal { display: grid; grid-template-columns: 1fr; gap: 0;
          background: ${HS_CARD}; border: 1px solid ${HS_RULE};
          border-radius: 24px; overflow: hidden; }
        .tpx-cal-row { display: grid; grid-template-columns: 120px 1.4fr 1fr auto;
          gap: 32px; align-items: center; padding: 24px 32px;
          border-top: 1px solid ${HS_RULE}; cursor: pointer;
          transition: background .15s; text-decoration: none; color: inherit; }
        .tpx-cal-row:first-child { border-top: 0; }
        .tpx-cal-row:hover { background: #fbf7ec; }
        .tpx-cal-d { font-family: serif; font-weight: 700; font-size: 14px;
          letter-spacing: 0.04em; text-transform: uppercase; color: ${HS_PURPLE}; }
        .tpx-cal-d b { display: block; font-size: 40px; color: ${HS_INK};
          letter-spacing: -0.02em; text-transform: none; margin-top: 2px; line-height: 1; }
        .tpx-cal-t h4 { font-size: 22px; line-height: 1.15; margin: 0; font-family: serif; font-weight: 600; color: ${HS_INK}; }
        .tpx-cal-t h4 em { color: ${HS_PURPLE}; font-style: italic; font-weight: 400; }
        .tpx-cal-t p { font-size: 14px; color: rgba(31,27,22,0.65); margin: 4px 0 0; }
        .tpx-cal-tag { font-size: 11px; font-weight: 600; letter-spacing: 0.1em;
          text-transform: uppercase; padding: 6px 12px; border-radius: 999px; justify-self: start; }
        .tpx-cal-go { width: 38px; height: 38px; border-radius: 999px; background: ${HS_INK};
          color: #fff; display: grid; place-items: center; font-size: 14px; transition: background .2s; }
        .tpx-cal-row:hover .tpx-cal-go { background: ${HS_PINK}; }
        @media (max-width: 1023px) {
          .tpx-cal-row { grid-template-columns: 80px 1fr auto; gap: 16px; padding: 20px; }
          .tpx-cal-tag { display: none; }
        }
      `}</style>
      <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32, marginBottom: 36 }}>
          <div>
            <div style={{ color: HS_PURPLE, fontWeight: 700, fontSize: 12, letterSpacing: '2.5px', textTransform: 'uppercase' }}>{eyebrow}</div>
            <h2 style={{ margin: '8px 0 0', fontSize: 'clamp(34px, 4vw, 56px)', fontFamily: 'serif', lineHeight: 1.05, color: HS_INK }} dangerouslySetInnerHTML={{ __html: heading_html }} />
          </div>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: 'rgba(31,27,22,0.7)' }}>{lede}</p>
        </div>
        <div className="tpx-cal">
          {events.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'rgba(31,27,22,0.6)' }}>No upcoming events.</div>
          ) : events.map((e) => {
            const { m, d } = _isoMD(e.iso);
            const chip = _chipBg(e.category);
            return (
              <Link key={e.slug || e.id} to={cta_href} className="tpx-cal-row">
                <div className="tpx-cal-d">{m}<b>{d}</b></div>
                <div className="tpx-cal-t">
                  <h4>{e.title} {e.italic && <em>{e.italic}</em>}</h4>
                  {e.description && <p>{e.description}</p>}
                </div>
                <span className="tpx-cal-tag" style={{ background: chip.bg, color: chip.fg }}>{_badgeText(e)}</span>
                <span className="tpx-cal-go">→</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------
// TapasPricingSplit — 2-column "Drop-in vs Membership" panel matching
// the live home PricingSection. Defaults preserve current copy; staff
// can edit each panel's title/lede/list/price/CTA.
// ---------------------------------------------------------------------
export function TapasPricingSplit({ props = {} }) {
  const {
    eyebrow = 'Pricing & Plans',
    heading_html = 'Two ways to <em>pull up a chair.</em>',
    lede = 'Drop in whenever you like — or become a member and unlock every club, a quarterly book, and 10% off the kitchen.',
    left_kicker = 'Drop-in',
    left_title = 'The Reading Room',
    left_body = 'Free to enter. Borrow one book at a time, read all afternoon. Buy a coffee or a plate if the mood strikes.',
    left_features = ['Lending library, honor system', 'Wi-Fi, quiet tables, long hours', 'One guest club visit per month'],
    left_price = 'Free',
    left_cta_text = 'Visit today',
    left_cta_href = '/library',
    right_kicker = 'Membership',
    right_title = 'The Chair',
    right_body = 'A seat at every club, a book of your choice each quarter, 10% off the kitchen, and first dibs on supper events.',
    right_features = ['All six weekly book clubs', 'One book per quarter, on us', '10% off food, wine & coffee', 'Priority RSVP for supper events'],
    right_price = '₹467',
    right_price_suffix = '/month',
    right_cta_text = 'Become a member',
    right_cta_href = '/sign-up',
  } = props;

  const PanelStyle = (variant) => ({
    background: variant === 'ink' ? HS_INK : '#fff',
    color: variant === 'ink' ? '#fff' : HS_INK,
    border: variant === 'ink' ? 'none' : `1px solid ${HS_RULE}`,
    borderRadius: 28, padding: 48, display: 'flex', flexDirection: 'column', gap: 22, minHeight: 420,
  });

  return (
    <section style={{ padding: 'clamp(60px, 8vw, 96px) 20px 40px' }}>
      <style>{`
        .tpx-split { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; max-width: 1180px; margin: 0 auto; }
        .tpx-split-list { display: flex; flex-direction: column; gap: 10px; margin: 6px 0; padding: 0; list-style: none; }
        .tpx-split-list li { display: flex; gap: 12px; align-items: center; font-size: 15px; }
        .tpx-split-list li::before { content: "✓"; width: 22px; height: 22px; border-radius: 999px;
          display: grid; place-items: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
        .tpx-split-lime .tpx-split-list li::before { background: ${HS_INK}; color: ${HS_LIME}; }
        .tpx-split-ink  .tpx-split-list li::before { background: ${HS_PINK}; color: #fff; }
        .tpx-split-foot { display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; gap: 20px; }
        .tpx-split-price { font-family: serif; font-weight: 700; font-size: 54px; line-height: 1; letter-spacing: -0.03em; }
        .tpx-split-price small { font-size: 16px; font-weight: 500; opacity: 0.7; margin-left: 6px; font-family: sans-serif; }
        .tpx-split-btn { border: 0; padding: 14px 22px; border-radius: 999px; font-weight: 600; font-size: 14.5px;
          display: inline-flex; align-items: center; gap: 10px; cursor: pointer; text-decoration: none; }
        .tpx-split-lime .tpx-split-btn { background: ${HS_INK}; color: #fff; }
        .tpx-split-ink  .tpx-split-btn { background: ${HS_LIME}; color: ${HS_INK}; }
        @media (max-width: 1023px) {
          .tpx-split { grid-template-columns: 1fr; }
          .tpx-split > div { padding: 36px !important; min-height: 0 !important; }
        }
      `}</style>
      <div style={{ maxWidth: '1180px', margin: '0 auto 36px' }}>
        <div style={{ color: HS_PURPLE, fontWeight: 700, fontSize: 12, letterSpacing: '2.5px', textTransform: 'uppercase' }}>{eyebrow}</div>
        <h2 style={{ margin: '8px 0 14px', fontSize: 'clamp(34px, 4vw, 56px)', fontFamily: 'serif', lineHeight: 1.05, color: HS_INK }} dangerouslySetInnerHTML={{ __html: heading_html }} />
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: 'rgba(31,27,22,0.7)', maxWidth: 640 }}>{lede}</p>
      </div>
      <div className="tpx-split">
        <div className="tpx-split-lime" style={PanelStyle('lime')}>
          <div style={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: HS_PURPLE }}>{left_kicker}</div>
          <h3 style={{ margin: 0, fontSize: 40, lineHeight: 1.02, letterSpacing: '-0.02em', fontFamily: 'serif' }}>{left_title}</h3>
          <p style={{ margin: 0, opacity: 0.85, maxWidth: '42ch', fontSize: 15.5 }}>{left_body}</p>
          <ul className="tpx-split-list">
            {(left_features || []).map((f, i) => <li key={i}>{f}</li>)}
          </ul>
          <div className="tpx-split-foot">
            <div className="tpx-split-price">{left_price}</div>
            <Link className="tpx-split-btn" to={left_cta_href}>{left_cta_text} →</Link>
          </div>
        </div>
        <div className="tpx-split-ink" style={PanelStyle('ink')}>
          <div style={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: HS_LIME }}>{right_kicker}</div>
          <h3 style={{ margin: 0, fontSize: 40, lineHeight: 1.02, letterSpacing: '-0.02em', fontFamily: 'serif', color: '#fff' }}>{right_title}</h3>
          <p style={{ margin: 0, opacity: 0.85, maxWidth: '42ch', fontSize: 15.5 }}>{right_body}</p>
          <ul className="tpx-split-list">
            {(right_features || []).map((f, i) => <li key={i}>{f}</li>)}
          </ul>
          <div className="tpx-split-foot">
            <div className="tpx-split-price">{right_price}{right_price_suffix && <small>{right_price_suffix}</small>}</div>
            <Link className="tpx-split-btn" to={right_cta_href}>{right_cta_text} →</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------
// TapasFeaturedTestimonial — large quote-mark + orange panel single
// quote layout matching the live home TestimonialSection. Pulls a
// featured testimonial from `home_testimonials` when source='live',
// or uses the static prop fields otherwise.
// ---------------------------------------------------------------------
export function TapasFeaturedTestimonial({ props = {} }) {
  const {
    source = 'static',           // 'static' | 'live'
    background = HS_ORANGE,
    kicker = 'What readers say',
    quote_html = 'My new shelf is so much faster and easier to browse than my old library app.',
    author_name = 'Corey Valdez',
    author_context = 'Founder at Zenix',
    initials = 'CV',
  } = props;

  const { useHomeTestimonials } = require('../cms/hooks');
  const { data: rows } = useHomeTestimonials();
  const live = (rows || []).find((r) => r.is_featured) || (rows || [])[0];

  const display = source === 'live' && live ? {
    quote: live.quote || quote_html,
    name: live.name || author_name,
    context: live.context || author_context,
    initials: live.initials || initials,
  } : { quote: quote_html, name: author_name, context: author_context, initials };

  return (
    <section style={{ padding: '40px 20px clamp(60px, 8vw, 96px)' }}>
      <style>{`
        .tpx-tm { background: ${background}; border-radius: 28px; padding: 72px 64px;
          display: grid; grid-template-columns: 1fr 1.2fr; gap: 48px;
          align-items: center; color: #1a1a1a; max-width: 1180px; margin: 0 auto; }
        .tpx-tm-q { font-family: serif; font-weight: 700; font-size: 160px;
          line-height: 0.7; color: #1a1a1a; }
        .tpx-tm-k { font-family: monospace; font-size: 12px; letter-spacing: 0.18em;
          text-transform: uppercase; margin-top: 10px; }
        .tpx-tm blockquote { margin: 0; font-family: serif; font-weight: 400; font-style: italic;
          font-size: 28px; line-height: 1.25; letter-spacing: -0.01em; color: ${HS_INK}; }
        .tpx-tm-who { margin-top: 28px; display: flex; align-items: center; gap: 14px; }
        .tpx-tm-ava { width: 48px; height: 48px; border-radius: 999px; background: ${HS_INK};
          color: ${HS_LIME}; display: grid; place-items: center; font-weight: 700;
          font-family: serif; font-size: 18px; }
        .tpx-tm-who b { display: block; font-weight: 600; font-size: 15px; }
        .tpx-tm-who span { font-size: 13px; opacity: 0.7; }
        @media (max-width: 1023px) {
          .tpx-tm { grid-template-columns: 1fr; padding: 48px 36px; gap: 24px; }
          .tpx-tm-q { font-size: 96px; }
          .tpx-tm blockquote { font-size: 22px; }
        }
      `}</style>
      <div className="tpx-tm">
        <div>
          <div className="tpx-tm-q">“</div>
          <div className="tpx-tm-k">{kicker}</div>
        </div>
        <div>
          <blockquote dangerouslySetInnerHTML={{ __html: display.quote }} />
          <div className="tpx-tm-who">
            <div className="tpx-tm-ava">{display.initials}</div>
            <div>
              <b>{display.name}</b>
              <span>{display.context}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// =====================================================================
// Phase 2 (Events page) blocks
// =====================================================================

// ---------------------------------------------------------------------
// TapasClubsGrid — recurring clubs grid matching the live Events page
// ClubGrid. Pulls from `clubs` table via useClubs() + adaptClubs().
// ---------------------------------------------------------------------
export function TapasClubsGrid({ props = {} }) {
  const {
    eyebrow = 'Weekly clubs',
    heading_html = 'Find a chair <em>that fits.</em>',
    lede = 'Six ongoing groups. Come once as a guest to find your people, then keep your seat — we hold it.',
  } = props;
  const { useClubs } = require('../cms/hooks');
  const { adaptClubs } = require('../cms/adapters');
  const { data: rows, loading } = useClubs();
  const list = adaptClubs(rows || []);

  return (
    <section style={{ padding: 'clamp(40px, 6vw, 80px) 20px' }}>
      <style>{`
        .tpx-clubs { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px; max-width: 1180px; margin: 0 auto; }
        .tpx-club { border: 1px solid ${HS_RULE}; border-radius: 18px; padding: 24px; background: ${HS_CARD}; display: flex; flex-direction: column; gap: 12px; }
        .tpx-club-head { font-family: monospace; font-size: 11px; letter-spacing: 0.18em; color: ${HS_PURPLE}; text-transform: uppercase; }
        .tpx-club-title { margin: 0; font-family: serif; font-size: 22px; line-height: 1.15; color: ${HS_INK}; font-weight: 600; }
        .tpx-club-title em { font-style: italic; color: ${HS_PURPLE}; font-weight: 400; }
        .tpx-club-body { margin: 0; font-size: 14.5px; color: rgba(31,27,22,0.7); line-height: 1.55; flex: 1; }
        .tpx-club-foot { display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px dashed ${HS_RULE}; font-size: 12px; color: rgba(31,27,22,0.65); }
      `}</style>
      <div style={{ maxWidth: '1180px', margin: '0 auto 28px' }}>
        <div style={{ color: HS_PURPLE, fontWeight: 700, fontSize: 12, letterSpacing: '2.5px', textTransform: 'uppercase' }}>{eyebrow}</div>
        <h2 style={{ margin: '8px 0 10px', fontSize: 'clamp(30px, 3.6vw, 48px)', fontFamily: 'serif', lineHeight: 1.05, color: HS_INK }} dangerouslySetInnerHTML={{ __html: heading_html }} />
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: 'rgba(31,27,22,0.7)', maxWidth: 640 }}>{lede}</p>
      </div>
      <div className="tpx-clubs" style={{ opacity: loading ? 0 : 1, transition: 'opacity 180ms ease-out' }}>
        {list.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: 'rgba(31,27,22,0.6)' }}>No clubs configured yet.</div>
        ) : list.map((c) => (
          <article key={c.id} className="tpx-club">
            <div className="tpx-club-head">
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: HS_PURPLE, marginRight: 8 }} />
              {(c.schedule || '').toUpperCase()}
            </div>
            <h3 className="tpx-club-title">
              {c.title}
              {c.titleItalic && <em> {c.titleItalic}</em>}
              {c.titleTail && ` ${c.titleTail}`}
            </h3>
            <p className="tpx-club-body">{c.body}</p>
            <div className="tpx-club-foot">
              {c.seats ? <span><strong style={{ color: HS_INK }}>{c.seats}</strong> seats</span> : <span>—</span>}
              <span>{c.status}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------
// TapasFeaturedSupper — large left/right split for the seasonal supper.
// Pulls from `featured_supper` singleton via useFeaturedSupper().
// ---------------------------------------------------------------------
export function TapasFeaturedSupper({ props = {} }) {
  const { menu_kicker = 'The menu', menu_title = 'Read & eaten.' } = props;
  const { useFeaturedSupper } = require('../cms/hooks');
  const { adaptFeaturedSupper } = require('../cms/adapters');
  const { data: row, loading } = useFeaturedSupper();
  const s = adaptFeaturedSupper(row);
  if (loading || !s) return null;

  return (
    <section style={{ padding: 'clamp(40px, 6vw, 80px) 20px' }}>
      <style>{`
        .tpx-supper { display: grid; grid-template-columns: 1.1fr 1fr; gap: 48px;
          background: ${HS_CARD}; border: 1px solid ${HS_RULE}; border-radius: 28px;
          padding: 56px 56px; max-width: 1180px; margin: 0 auto; align-items: start; }
        .tpx-supper-k { font-family: monospace; font-size: 11px; letter-spacing: 0.18em;
          text-transform: uppercase; color: ${HS_PURPLE}; }
        .tpx-supper-h { margin: 10px 0 16px; font-family: serif; font-weight: 600;
          font-size: clamp(36px, 4vw, 56px); line-height: 1.05; color: ${HS_INK}; }
        .tpx-supper-h em { font-style: italic; color: ${HS_PURPLE}; font-weight: 400; }
        .tpx-supper-b { margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: rgba(31,27,22,0.75); max-width: 48ch; }
        .tpx-menu-k { font-family: monospace; font-size: 11px; letter-spacing: 0.18em;
          text-transform: uppercase; color: ${HS_PURPLE}; margin-bottom: 6px; }
        .tpx-menu-h { margin: 0 0 14px; font-family: serif; font-size: 22px; color: ${HS_INK}; font-weight: 600; }
        .tpx-menu-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
        .tpx-menu-row { display: grid; grid-template-columns: 28px 1fr auto; gap: 12px; align-items: baseline; padding: 8px 0; border-bottom: 1px dashed ${HS_RULE}; }
        .tpx-menu-n { font-family: serif; font-weight: 700; color: ${HS_PURPLE}; }
        .tpx-menu-dish i { font-style: italic; color: rgba(31,27,22,0.55); display: block; font-size: 13px; }
        @media (max-width: 1023px) { .tpx-supper { grid-template-columns: 1fr; padding: 40px 32px; gap: 28px; } }
      `}</style>
      <div className="tpx-supper">
        <div>
          <div className="tpx-supper-k">{(s.kicker || '').toUpperCase()}</div>
          <h2 className="tpx-supper-h">
            {s.titleLead}{s.titleItalic && <em>{s.titleItalic}</em>}
          </h2>
          <p className="tpx-supper-b">{s.body}</p>
          {s.cta?.label && (
            <Link to={s.cta.href || '#'} style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: HS_INK, color: '#fff', padding: '14px 24px',
              borderRadius: 999, fontWeight: 600, fontSize: 14.5,
              textDecoration: 'none',
            }}>{s.cta.label} <span aria-hidden="true">→</span></Link>
          )}
        </div>
        <aside>
          <div className="tpx-menu-k">{menu_kicker}</div>
          <h3 className="tpx-menu-h">{menu_title}</h3>
          <ol className="tpx-menu-list">
            {(s.menu || []).map((c, i) => (
              <li key={c.n || i} className="tpx-menu-row">
                <span className="tpx-menu-n">{c.n || (i + 1)}</span>
                <span className="tpx-menu-dish">
                  {c.dish}
                  {c.poem && <i>{c.poem}</i>}
                </span>
                <span style={{ color: HS_PURPLE }}>·</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </section>
  );
}

// =====================================================================
// Phase 2 (Contact page) blocks
// =====================================================================

// ---------------------------------------------------------------------
// TapasFindUs — "Find us" address/phone/email card. Pulls from
// contact_info via useContactInfo() with safe fallbacks.
// ---------------------------------------------------------------------
export function TapasFindUs({ props = {} }) {
  const {
    eyebrow = 'Find us',
    heading_html = 'The <em>room itself.</em>',
    lede = 'The fastest way is the front door. For everything else:',
  } = props;
  const { useContactInfo } = require('../cms/hooks');
  const { adaptContactInfo } = require('../cms/adapters');
  const { data: row } = useContactInfo();
  const i = adaptContactInfo(row) || {};

  const Row = ({ label, children }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 14, padding: '12px 0', borderTop: `1px dashed ${HS_RULE}`, alignItems: 'baseline' }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: HS_PURPLE }}>{label}</div>
      <div style={{ fontSize: 15, color: HS_INK, lineHeight: 1.5 }}>{children}</div>
    </div>
  );

  return (
    <section style={{ padding: 'clamp(24px, 4vw, 48px) 0' }}>
      <div style={{ background: HS_CARD, border: `1px solid ${HS_RULE}`, borderRadius: 24, padding: '36px 36px' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: HS_PURPLE }}>{eyebrow}</div>
        <h3 style={{ margin: '8px 0 12px', fontFamily: 'serif', fontSize: 32, fontWeight: 600, color: HS_INK, lineHeight: 1.1 }} dangerouslySetInnerHTML={{ __html: heading_html }} />
        <p style={{ margin: '0 0 14px', fontSize: 15, color: 'rgba(31,27,22,0.7)' }}>{lede}</p>

        {(i.address?.bold || i.address?.line) && (
          <Row label="Address">
            {i.address?.bold && <strong style={{ display: 'block' }}>{i.address.bold}</strong>}
            {i.address?.line}
          </Row>
        )}
        {i.phone && (
          <Row label="Phone">
            <a href={`tel:${String(i.phone).replace(/[^+\d]/g, '')}`} style={{ color: HS_INK }}>{i.phone}</a>
          </Row>
        )}
        {i.email && (
          <Row label="Email">
            <a href={`mailto:${i.email}`} style={{ color: HS_INK }}>{i.email}</a>
          </Row>
        )}
        {i.events && (
          <Row label="Events">
            <a href={`mailto:${i.events}`} style={{ color: HS_INK }}>{i.events}</a>
          </Row>
        )}
        {i.press && (
          <Row label="Press">
            <a href={`mailto:${i.press}`} style={{ color: HS_INK }}>{i.press}</a>
          </Row>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------
// TapasHoursStrip — weekly hours with "Today" highlight. Pulls from
// hours table via useHours() + adaptHours().
// ---------------------------------------------------------------------
export function TapasHoursStrip({ props = {} }) {
  const { useHours } = require('../cms/hooks');
  const { adaptHours } = require('../cms/adapters');
  const { data: rows } = useHours();
  const list = require('../cms/adapters').adaptHours(rows || []);
  const todayIdx = new Date().getDay();
  const _ = adaptHours; const __ = useHours; void _; void __;

  return (
    <section style={{ padding: 'clamp(24px, 4vw, 48px) 0' }}>
      <style>{`
        .tpx-hours { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0;
          background: ${HS_CARD}; border: 1px solid ${HS_RULE}; border-radius: 18px; overflow: hidden; }
        .tpx-hours-d { padding: 18px 14px; text-align: center; border-left: 1px solid ${HS_RULE}; }
        .tpx-hours-d:first-child { border-left: 0; }
        .tpx-hours-d.today { background: ${HS_LIME}; color: ${HS_INK}; }
        .tpx-hours-name { font-family: monospace; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: ${HS_PURPLE}; }
        .tpx-hours-d.today .tpx-hours-name { color: ${HS_INK}; }
        .tpx-hours-val { margin-top: 8px; font-family: serif; font-size: 16px; color: ${HS_INK}; }
        .tpx-hours-val.closed { font-style: italic; opacity: 0.55; }
        @media (max-width: 767px) { .tpx-hours { grid-template-columns: repeat(2, 1fr); } .tpx-hours-d { border-left: 0; border-top: 1px solid ${HS_RULE}; } .tpx-hours-d:nth-child(2n) { border-left: 1px solid ${HS_RULE}; } }
      `}</style>
      <div className="tpx-hours" role="list">
        {list.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: 24, textAlign: 'center', color: 'rgba(31,27,22,0.6)' }}>Hours not configured.</div>
        ) : list.map((d) => {
          const isToday = d.dayIndex === todayIdx;
          return (
            <div key={d.key} role="listitem" className={`tpx-hours-d${isToday ? ' today' : ''}`}>
              <div className="tpx-hours-name">{d.short}{isToday ? ' · TODAY' : ''}</div>
              <div className={`tpx-hours-val${d.closed ? ' closed' : ''}`}>{d.hours}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------
// TapasFaqAccordion — FAQ accordion pulled from faqs table via
// useFaqs() + adaptFaqs(). Native <details> for keyboard a11y.
// ---------------------------------------------------------------------
export function TapasFaqAccordion({ props = {} }) {
  const {
    eyebrow = 'Good to know',
    heading_html = 'A few <em>common questions.</em>',
    lede = 'If you can’t find it here, just ask us at the counter.',
  } = props;
  const { useFaqs } = require('../cms/hooks');
  const { adaptFaqs } = require('../cms/adapters');
  const { data: rows } = useFaqs();
  const list = adaptFaqs(rows || []);

  return (
    <section style={{ padding: 'clamp(40px, 6vw, 80px) 0' }}>
      <style>{`
        .tpx-faq-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .tpx-faq { background: ${HS_CARD}; border: 1px solid ${HS_RULE}; border-radius: 14px;
          padding: 14px 20px; cursor: pointer; }
        .tpx-faq summary { list-style: none; font-family: serif; font-weight: 600; font-size: 17px;
          color: ${HS_INK}; cursor: pointer; padding: 6px 0; }
        .tpx-faq summary::-webkit-details-marker { display: none; }
        .tpx-faq summary::after { content: '+'; float: right; font-family: monospace; opacity: 0.5; }
        .tpx-faq[open] summary::after { content: '−'; }
        .tpx-faq p { margin: 8px 0 0; font-size: 14.5px; color: rgba(31,27,22,0.75); line-height: 1.55; }
        @media (max-width: 767px) { .tpx-faq-grid { grid-template-columns: 1fr; } }
      `}</style>
      <div style={{ marginBottom: 24, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32, alignItems: 'end' }}>
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: HS_PURPLE }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: HS_PURPLE, marginRight: 8 }} />
            {eyebrow}
          </div>
          <h2 style={{ margin: '8px 0 0', fontFamily: 'serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 44px)', lineHeight: 1.1, color: HS_INK }} dangerouslySetInnerHTML={{ __html: heading_html }} />
        </div>
        <p style={{ margin: 0, fontSize: 15, color: 'rgba(31,27,22,0.7)' }}>{lede}</p>
      </div>
      <div className="tpx-faq-grid">
        {list.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: 24, textAlign: 'center', color: 'rgba(31,27,22,0.6)' }}>No FAQs yet.</div>
        ) : list.map((f, idx) => (
          <details key={f.q || idx} className="tpx-faq" open={idx === 0 || undefined}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

// =====================================================================
// Phase 2 (About page) blocks — six small renderers, one shared CSS
// block. All pull from useAbout()/adaptAbout() which already aggregates
// the about_* tables.
// =====================================================================

function _useAboutData() {
  const { useAbout } = require('../cms/hooks');
  const { adaptAbout } = require('../cms/adapters');
  const { data } = useAbout();
  return adaptAbout(data) || null;
}

function _renderTitleParts(parts) {
  if (!Array.isArray(parts)) return null;
  return parts.map((p, i) => p.em
    ? <em key={i} style={{ fontStyle: 'italic', color: '#7E22CE' }}>{p.t}</em>
    : <React.Fragment key={i}>{p.t}</React.Fragment>);
}

const AboutSectionHeader = ({ kicker, title, lede }) => (
  <header style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32, alignItems: 'end', marginBottom: 28 }}>
    <div>
      <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: HS_PURPLE }}>
        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: HS_PURPLE, marginRight: 8 }} />
        {kicker}
      </div>
      <h2 style={{ margin: '8px 0 0', fontFamily: 'serif', fontWeight: 600, fontSize: 'clamp(30px, 3.6vw, 48px)', lineHeight: 1.05, color: HS_INK }}>
        {_renderTitleParts(title)}
      </h2>
    </div>
    {lede && <p style={{ margin: 0, fontSize: 15.5, color: 'rgba(31,27,22,0.7)', lineHeight: 1.55 }}>{lede}</p>}
  </header>
);

export function TapasManifesto() {
  const a = _useAboutData();
  if (!a?.manifesto) return null;
  const m = a.manifesto;
  return (
    <section style={{ padding: 'clamp(40px, 6vw, 80px) 0', display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 48 }}>
      <div>
        <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: HS_PURPLE }}>{m.kicker}</div>
        <h2 style={{ margin: '8px 0 0', fontFamily: 'serif', fontWeight: 600, fontSize: 'clamp(34px, 4vw, 56px)', lineHeight: 1.05, color: HS_INK }}>
          {_renderTitleParts(m.title)}
        </h2>
      </div>
      <div>
        {(m.paragraphs || []).map((p, i) => (
          <p key={i} style={{ marginTop: i === 0 ? 0 : 18, fontFamily: 'serif', fontSize: 18, lineHeight: 1.55, color: HS_INK }}>
            {p.dropCap && <span style={{ float: 'left', fontFamily: 'serif', fontSize: 64, lineHeight: 1, marginRight: 12, color: HS_PURPLE }}>{p.dropCap}</span>}
            {p.body}
          </p>
        ))}
      </div>
    </section>
  );
}

export function TapasStatsStrip() {
  const a = _useAboutData();
  if (!a?.stats) return null;
  return (
    <section style={{ padding: 'clamp(40px, 6vw, 80px) 0' }}>
      <h2 style={{ margin: '0 0 24px', fontFamily: 'serif', fontWeight: 600, fontSize: 'clamp(28px, 3.4vw, 44px)', lineHeight: 1.05, color: HS_INK }}>
        {_renderTitleParts(a.stats.title)}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 24 }}>
        {(a.stats.items || []).map((s, i) => (
          <div key={i} style={{ borderTop: `1px solid ${HS_RULE}`, paddingTop: 18 }}>
            <div style={{ fontFamily: 'serif', fontSize: 48, fontWeight: 700, color: s.highlighted ? HS_PURPLE : HS_INK, lineHeight: 1, letterSpacing: '-0.02em' }}>{s.value}</div>
            <div style={{ marginTop: 8, fontSize: 13, color: 'rgba(31,27,22,0.7)' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TapasTimeline() {
  const a = _useAboutData();
  if (!a?.history) return null;
  const h = a.history;
  return (
    <section style={{ padding: 'clamp(40px, 6vw, 80px) 0' }}>
      <AboutSectionHeader kicker={h.kicker} title={h.title} lede={h.lede} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
        {(h.items || []).map((it, i) => (
          <div key={i} style={{ background: HS_CARD, border: `1px solid ${HS_RULE}`, borderRadius: 16, padding: 22 }}>
            <div style={{ fontFamily: 'serif', fontWeight: 700, fontSize: 22, color: HS_PURPLE }}>{it.year}</div>
            <h3 style={{ margin: '8px 0 8px', fontFamily: 'serif', fontWeight: 600, fontSize: 18, color: HS_INK }}>{it.heading}</h3>
            {it.body && <p style={{ margin: 0, fontSize: 14, color: 'rgba(31,27,22,0.7)', lineHeight: 1.55 }}>{it.body}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

export function TapasCompromises() {
  const a = _useAboutData();
  if (!a?.compromises) return null;
  const c = a.compromises;
  const bg = (variant) => variant === 'lime' ? HS_LIME : variant === 'orange' ? HS_ORANGE : '#fff';
  return (
    <section style={{ padding: 'clamp(40px, 6vw, 80px) 0' }}>
      <AboutSectionHeader kicker={c.kicker} title={c.title} lede={c.lede} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
        {(c.cards || []).map((card, i) => (
          <article key={i} style={{ background: bg(card.variant), border: `1px solid ${HS_RULE}`, borderRadius: 18, padding: '28px 24px' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: HS_INK, opacity: 0.5 }}>{card.n}</div>
            <h3 style={{ margin: '10px 0 12px', fontFamily: 'serif', fontWeight: 600, fontSize: 24, lineHeight: 1.15, color: HS_INK }}>
              {_renderTitleParts(card.title)}
            </h3>
            <p style={{ margin: 0, fontSize: 14.5, color: HS_INK, opacity: 0.78, lineHeight: 1.6 }}>{card.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function TapasTeamGrid() {
  const a = _useAboutData();
  if (!a?.team) return null;
  const t = a.team;
  return (
    <section style={{ padding: 'clamp(40px, 6vw, 80px) 0' }}>
      <AboutSectionHeader kicker={t.kicker} title={t.title} lede={t.lede} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
        {(t.members || []).map((m, i) => (
          <div key={i} style={{ background: HS_CARD, border: `1px solid ${HS_RULE}`, borderRadius: 16, padding: 18, display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: m.color, display: 'grid', placeItems: 'center', fontFamily: 'serif', fontWeight: 700, fontSize: 20, color: HS_INK, flexShrink: 0 }}>{m.initials}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: HS_INK }}>{m.name}</div>
              {m.role && <div style={{ fontSize: 12, color: 'rgba(31,27,22,0.6)' }}>{m.role}</div>}
              {m.reading && <div style={{ fontSize: 12, color: HS_PURPLE, fontStyle: 'italic', marginTop: 4 }}>Reading: {m.reading}</div>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TapasPressQuotes() {
  const a = _useAboutData();
  if (!a?.press) return null;
  const p = a.press;
  return (
    <section style={{ padding: 'clamp(40px, 6vw, 80px) 0' }}>
      <AboutSectionHeader kicker={p.kicker} title={p.title} lede={p.lede} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
        {(p.quotes || []).map((q, i) => (
          <blockquote key={i} style={{ margin: 0, background: HS_CARD, border: `1px solid ${HS_RULE}`, borderRadius: 16, padding: 22, fontFamily: 'serif' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: HS_PURPLE, marginBottom: 10 }}>{q.source}</div>
            <p style={{ margin: 0, fontStyle: 'italic', fontSize: 16, lineHeight: 1.55, color: HS_INK }}>“{q.body}”</p>
            {q.footer && <footer style={{ marginTop: 10, fontSize: 12, color: 'rgba(31,27,22,0.6)', fontFamily: 'sans-serif' }}>{q.footer}</footer>}
          </blockquote>
        ))}
      </div>
    </section>
  );
}

// =====================================================================
// Phase 2 (Blog page) blocks — featured article, sidebar 3-card stack,
// archive grid (with built-in category filter + search).
// =====================================================================

function _useJournal() {
  const { useJournalPosts } = require('../cms/hooks');
  const { adaptJournalPosts } = require('../cms/adapters');
  const { data: rows } = useJournalPosts();
  return adaptJournalPosts(rows || []);
}

function _renderJournalTitle(parts) {
  if (!Array.isArray(parts)) return null;
  return parts.map((p, i) => p.em
    ? <em key={i} style={{ fontStyle: 'italic', color: HS_PURPLE }}>{p.t}</em>
    : <React.Fragment key={i}>{p.t}</React.Fragment>);
}

export function TapasBlogFeatured() {
  const j = _useJournal();
  const a = j?.featured;
  if (!a) return null;
  return (
    <Link to={`/blog/${a.slug}`} style={{
      display: 'block', textDecoration: 'none', color: 'inherit',
      background: HS_INK, color2: HS_LIME,
      borderRadius: 28, padding: '52px 56px', position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', right: -80, top: -80,
        width: 280, height: 280, borderRadius: '50%',
        background: HS_LIME, opacity: 0.18,
      }} aria-hidden="true" />
      <div style={{
        fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.18em',
        textTransform: 'uppercase', color: HS_LIME, marginBottom: 16,
      }}>
        {(a.kicker || 'FEATURED').toUpperCase()}
      </div>
      <h2 style={{
        margin: 0, color: '#fff',
        fontFamily: 'serif', fontWeight: 600,
        fontSize: 'clamp(36px, 4.4vw, 60px)', lineHeight: 1.05, letterSpacing: '-0.01em',
      }}>{_renderJournalTitle(a.title)}</h2>
      {a.excerpt && (
        <p style={{ marginTop: 18, color: 'rgba(255,255,255,0.78)', maxWidth: '52ch', fontSize: 16, lineHeight: 1.6 }}>
          {a.excerpt}
        </p>
      )}
      <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{
          width: 36, height: 36, borderRadius: '50%',
          background: HS_LIME, color: HS_INK,
          display: 'grid', placeItems: 'center',
          fontFamily: 'serif', fontWeight: 700,
        }}>{a.author?.initial}</span>
        <div style={{ color: '#fff', fontSize: 14 }}>
          {a.author?.name}
          {a.readMinutes && <span style={{ opacity: 0.6 }}> · {a.readMinutes} min read</span>}
        </div>
      </div>
    </Link>
  );
}

export function TapasBlogSidebar() {
  const j = _useJournal();
  const list = j?.sidebar || [];
  if (list.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {list.map((c) => (
        <Link key={c.slug} to={`/blog/${c.slug}`} style={{
          textDecoration: 'none', color: 'inherit',
          background: HS_CARD, border: `1px solid ${HS_RULE}`,
          borderRadius: 18, padding: '20px 22px',
        }}>
          <div style={{
            fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: HS_PURPLE, marginBottom: 8,
          }}>{(c.kicker || '').toUpperCase()}</div>
          <h3 style={{ margin: 0, fontFamily: 'serif', fontWeight: 600, fontSize: 20, lineHeight: 1.15, color: HS_INK }}>
            {_renderJournalTitle(c.title)}
          </h3>
          {c.excerpt && <p style={{ margin: '8px 0 12px', fontSize: 14, color: 'rgba(31,27,22,0.7)', lineHeight: 1.55 }}>{c.excerpt}</p>}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(31,27,22,0.6)' }}>
            <span>{c.author?.name}</span>
            <span>{c.readMinutes} min</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

// Self-contained archive: handles its own category filter + search box.
// Does NOT receive props from external state — that's the whole point of
// being a block. Categories pulled from FILTER_TO_CATEGORY constant.
export function TapasBlogArchive({ props = {} }) {
  const {
    eyebrow = 'The Archive',
    heading_html = 'More from <em>the room.</em>',
    lede = 'Essays and interviews, sorted however’s useful.',
  } = props;
  const j = _useJournal();
  const { FILTER_TO_CATEGORY, titleText } = require('../data/journalPosts');

  const [category, setCategory] = React.useState('All');
  const [query, setQuery] = React.useState('');
  const filtered = React.useMemo(() => {
    const archive = j?.archive || [];
    const mapped = FILTER_TO_CATEGORY[category];
    const q = query.trim().toLowerCase();
    return archive.filter((a) => {
      if (mapped && a.category !== mapped) return false;
      if (q) {
        const haystack = [titleText(a.title), a.excerpt || '', a.author?.name || ''].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [j, category, query, FILTER_TO_CATEGORY, titleText]);

  const cats = ['All', ...Object.keys(FILTER_TO_CATEGORY).filter(k => k !== 'All')];

  return (
    <section style={{ padding: 'clamp(40px, 6vw, 80px) 0' }}>
      <header style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32, alignItems: 'end', marginBottom: 28 }}>
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: HS_PURPLE }}>{eyebrow}</div>
          <h2 style={{ margin: '8px 0 0', fontFamily: 'serif', fontWeight: 600, fontSize: 'clamp(30px, 3.6vw, 48px)', lineHeight: 1.05, color: HS_INK }} dangerouslySetInnerHTML={{ __html: heading_html }} />
        </div>
        <p style={{ margin: 0, fontSize: 15, color: 'rgba(31,27,22,0.7)' }}>{lede}</p>
      </header>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 22 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {cats.map(c => (
            <button key={c} onClick={() => setCategory(c)} style={{
              padding: '8px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600,
              border: `1px solid ${category === c ? HS_INK : HS_RULE}`,
              background: category === c ? HS_INK : '#fff',
              color: category === c ? '#fff' : HS_INK,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>{c}</button>
          ))}
        </div>
        <input
          type="search" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          style={{
            marginLeft: 'auto', minWidth: 240, padding: '10px 16px',
            borderRadius: 999, border: `1px solid ${HS_RULE}`, background: '#fff',
            fontSize: 14, fontFamily: 'inherit', color: HS_INK, outline: 'none',
          }}
        />
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(31,27,22,0.6)', background: HS_CARD, border: `1px dashed ${HS_RULE}`, borderRadius: 16 }}>
          No notes yet from that corner. Try another category.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map((a) => (
            <Link key={a.slug} to={`/blog/${a.slug}`} style={{
              textDecoration: 'none', color: 'inherit',
              background: HS_CARD, border: `1px solid ${HS_RULE}`,
              borderRadius: 16, padding: '20px 22px',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: HS_PURPLE }}>
                {a.category || 'NOTE'}
              </div>
              <h3 style={{ margin: 0, fontFamily: 'serif', fontWeight: 600, fontSize: 20, lineHeight: 1.2, color: HS_INK }}>
                {_renderJournalTitle(a.title)}
              </h3>
              {a.excerpt && <p style={{ margin: 0, fontSize: 14, color: 'rgba(31,27,22,0.7)', lineHeight: 1.55 }}>{a.excerpt}</p>}
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(31,27,22,0.6)', paddingTop: 10, borderTop: `1px dashed ${HS_RULE}` }}>
                <span>{a.author?.name}</span>
                {a.readMinutes && <span>{a.readMinutes} min</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

// =====================================================================
// Phase 2 (Library page) blocks — stats row, full filterable shelf
// browser (self-contained state), house-rules ordered list.
// =====================================================================

export function TapasLibraryStats({ props = {} }) {
  const { fallback = [] } = props;
  const { usePage } = require('../cms/hooks');
  const { data: page } = usePage('library');
  const stats = page?.stats_jsonb?.stats || fallback;
  if (!Array.isArray(stats) || stats.length === 0) return null;
  return (
    <section style={{ padding: 'clamp(24px, 4vw, 48px) 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(180px, 1fr))`, gap: 24, background: HS_CARD, border: `1px solid ${HS_RULE}`, borderRadius: 18, padding: 28 }} role="list">
        {stats.map((s, i) => (
          <div key={i} role="listitem" style={{ borderLeft: i === 0 ? 0 : `1px solid ${HS_RULE}`, paddingLeft: i === 0 ? 0 : 24 }}>
            <div style={{ fontFamily: 'serif', fontWeight: 700, fontSize: 36, color: s.accent ? HS_PURPLE : HS_INK, lineHeight: 1, letterSpacing: '-0.02em' }}>{s.value}</div>
            <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(31,27,22,0.7)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// Full library browser — filter + featured + shelves + reserve.
// Self-contained: owns its category + search state internally so a
// staff-placed instance behaves the same anywhere it's dropped.
export function TapasLibraryShelves({ props = {} }) {
  const {
    show_featured = true,
    show_filter   = true,
  } = props;
  const { useLibraryShelves, usePage } = require('../cms/hooks');
  const { adaptLibraryShelves } = require('../cms/adapters');
  const { matchesBook, LIBRARY_CATEGORIES, LIBRARY_FEATURED } = require('../data/libraryBooks');
  const { data: rows, loading } = useLibraryShelves();
  const { data: page } = usePage('library');
  const shelves = React.useMemo(() => adaptLibraryShelves(rows), [rows, adaptLibraryShelves]);

  const [category, setCategory] = React.useState('All');
  const [query, setQuery] = React.useState('');

  const filtered = React.useMemo(() => shelves.map((shelf) => ({
    ...shelf,
    visibleBooks: shelf.books.filter((b) => matchesBook(b, { category, query })),
  })), [shelves, category, query, matchesBook]);

  const totalVisible = filtered.reduce((sum, s) => sum + s.visibleBooks.length, 0);

  const onReserve = (book) => {
    // eslint-disable-next-line no-alert
    window.alert(`Reserved "${book.title}" — pick up at the cafe within 48 hours.`);
  };

  const fromDb = page?.stats_jsonb?.featured;
  const f = { ...LIBRARY_FEATURED, ...(fromDb || {}) };

  const cats = ['All', ...(LIBRARY_CATEGORIES || [])];

  return (
    <section style={{ padding: 'clamp(40px, 6vw, 80px) 0' }}>
      <style>{`
        .tpx-lib-cover { aspect-ratio: 3 / 4; border-radius: 8px;
          display: flex; flex-direction: column; align-items: flex-start;
          padding: 12px; color: #fff; font-family: serif; font-weight: 600;
          overflow: hidden; }
        .tpx-lib-cover.c-purple { background: #8F4FD6; }
        .tpx-lib-cover.c-ink    { background: #1a1a1a; }
        .tpx-lib-cover.c-orange { background: #FF934A; }
        .tpx-lib-cover.c-pink   { background: #E0004F; }
        .tpx-lib-cover.c-taupe  { background: #5b4d3d; }
        .tpx-lib-cover.c-lime   { background: #C9F27F; color: ${HS_INK}; }
        .tpx-lib-cover.has-photo { padding: 0; }
        .tpx-lib-cover img { width: 100%; height: 100%; object-fit: cover; }
        .tpx-lib-book { all: unset; cursor: pointer; display: flex; flex-direction: column; gap: 8px;
          background: #fff; border: 1px solid ${HS_RULE}; border-radius: 12px; padding: 12px; transition: box-shadow .2s; }
        .tpx-lib-book:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.06); }
        .tpx-lib-book .stat { font-size: 11px; font-weight: 600; letter-spacing: 0.05em; }
        .tpx-lib-book .stat.is-out { color: #c0392b; }
        .tpx-lib-book .stat.is-available { color: #2BB673; }
      `}</style>

      {show_filter && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {cats.map((c) => (
              <button key={c} onClick={() => setCategory(c)} style={{
                padding: '8px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                border: `1px solid ${category === c ? HS_INK : HS_RULE}`,
                background: category === c ? HS_INK : '#fff',
                color: category === c ? '#fff' : HS_INK,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>{c}</button>
            ))}
          </div>
          <input
            type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or author"
            style={{
              marginLeft: 'auto', minWidth: 260, padding: '10px 16px',
              borderRadius: 999, border: `1px solid ${HS_RULE}`, background: '#fff',
              fontSize: 14, fontFamily: 'inherit', color: HS_INK, outline: 'none',
            }}
          />
        </div>
      )}

      {show_featured && f && (
        <section style={{ background: HS_LIME, borderRadius: 24, padding: 'clamp(28px, 4vw, 56px)', marginBottom: 36 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: HS_PURPLE }}>{f.kicker}</div>
          <h2 style={{ margin: '12px 0 10px', fontFamily: 'serif', fontWeight: 600, fontSize: 'clamp(28px, 3.4vw, 44px)', lineHeight: 1.05, color: HS_INK }}>
            {f.headline} {f.accent && <em style={{ fontStyle: 'italic', color: HS_PURPLE }}>{f.accent}</em>}
          </h2>
          {f.body && <p style={{ margin: '0 0 18px', fontSize: 15.5, color: 'rgba(31,27,22,0.78)', maxWidth: 640 }}>{f.body}</p>}
          {f.ctaLabel && (
            <button type="button" onClick={() => {
              const t = document.getElementById(f.ctaTarget);
              if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'start' }); window.history.replaceState(null, '', `#${f.ctaTarget}`); }
            }} style={{
              background: HS_INK, color: '#fff', border: 0, padding: '12px 22px',
              borderRadius: 999, fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
            }}>
              {f.ctaLabel} →
            </button>
          )}
        </section>
      )}

      {loading && shelves.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'rgba(31,27,22,0.55)' }}>Loading shelves…</div>
      ) : totalVisible === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', background: HS_CARD, border: `1px dashed ${HS_RULE}`, borderRadius: 16, color: 'rgba(31,27,22,0.7)' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }} aria-hidden="true">📚</div>
          <h3 style={{ margin: '0 0 6px', fontFamily: 'serif' }}>No books match your filters</h3>
          <p style={{ margin: 0, fontSize: 14 }}>Try a different category or clear the search.</p>
        </div>
      ) : filtered.map((shelf) => shelf.visibleBooks.length === 0 ? null : (
        <section key={shelf.id} id={shelf.id} style={{ marginBottom: 36 }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontFamily: 'serif', fontWeight: 600, fontSize: 22, color: HS_INK }}>
              Shelf {shelf.number} · <em style={{ fontStyle: 'italic', color: HS_PURPLE }}>{shelf.name}</em>
            </h3>
            {shelf.totals && (
              <span style={{ fontSize: 12, color: 'rgba(31,27,22,0.6)', fontFamily: 'monospace', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {shelf.totals.titles} titles · {shelf.totals.outOnLoan} out on loan
              </span>
            )}
          </header>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
            {shelf.visibleBooks.map((b) => {
              const isOut = b.status?.kind === 'out';
              const statusLabel = isOut ? `Out · back ${b.status.returnDate}` : 'Available';
              return (
                <button key={b.id} type="button" className="tpx-lib-book" onClick={() => onReserve(b)} aria-label={`Reserve ${b.title} by ${b.author}, ${statusLabel}`}>
                  {b.coverUrl ? (
                    <div className="tpx-lib-cover has-photo" aria-hidden="true"><img src={b.coverUrl} alt="" loading="lazy" /></div>
                  ) : (
                    <div className={`tpx-lib-cover c-${b.cover || 'taupe'}`} aria-hidden="true">
                      <div style={{ fontSize: 12, lineHeight: 1.2, fontWeight: 700 }}>{b.title}</div>
                      <div style={{ marginTop: 'auto', fontSize: 10, opacity: 0.85, letterSpacing: '0.08em' }}>{(b.author || '').toUpperCase()}</div>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: HS_INK, fontWeight: 600, lineHeight: 1.2, textAlign: 'left' }}>{b.title}</span>
                  </div>
                  <div className={`stat ${isOut ? 'is-out' : 'is-available'}`}>● {statusLabel}</div>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </section>
  );
}

export function TapasLibraryHouseRules({ props = {} }) {
  const {
    eyebrow = 'House Rules',
    heading = 'How the lending works.',
    body    = 'No library card, no paperwork. Just a signature in the ledger by the door and a promise to bring them back.',
  } = props;
  const { usePage } = require('../cms/hooks');
  const { data: page } = usePage('library');
  const { LIBRARY_HOUSE_RULES } = require('../data/libraryBooks');
  const rules = page?.stats_jsonb?.houseRules || LIBRARY_HOUSE_RULES;
  return (
    <section style={{ padding: 'clamp(40px, 6vw, 80px) 0', display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 48, alignItems: 'start' }}>
      <div>
        <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: HS_PURPLE }}>{eyebrow}</div>
        <h2 style={{ margin: '8px 0 12px', fontFamily: 'serif', fontWeight: 600, fontSize: 'clamp(28px, 3.4vw, 44px)', lineHeight: 1.05, color: HS_INK }}>{heading}</h2>
        <p style={{ margin: 0, fontSize: 15.5, color: 'rgba(31,27,22,0.7)', lineHeight: 1.55 }}>{body}</p>
      </div>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {(rules || []).map((r, i) => (
          <li key={r.n || i} style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: 16, padding: '16px 18px', background: HS_CARD, border: `1px solid ${HS_RULE}`, borderRadius: 14 }}>
            <span style={{ fontFamily: 'serif', fontWeight: 700, fontSize: 24, color: HS_PURPLE }}>{r.n}</span>
            <div>
              <h4 style={{ margin: 0, fontFamily: 'serif', fontWeight: 600, fontSize: 17, color: HS_INK }}>{r.title}</h4>
              {r.body && <p style={{ margin: '4px 0 0', fontSize: 14, color: 'rgba(31,27,22,0.7)', lineHeight: 1.55 }}>{r.body}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// =====================================================================
// Phase 2 (Shop page) blocks — featured book spotlight + full
// browser (filter sidebar + toolbar + grid + pagination, all inside
// one self-contained block).
// =====================================================================

const _SHOP_PAGE_SIZE = 12;

export function TapasShopFeatured({ props = {} }) {
  const { eyebrow = 'Book of the Month', member_discount = true } = props;
  const { useShopBooks } = require('../cms/hooks');
  const { adaptShopBooks } = require('../cms/adapters');
  const { formatInr, MEMBER_DISCOUNT_RATE } = require('../data/shopBooks');
  const { useCart } = require('../context/CartContext');
  const { data: rows } = useShopBooks();
  const { addBook } = useCart();
  const books = adaptShopBooks(rows);
  const book = books.find((b) => b.isFeatured) || books[0];
  if (!book) return null;

  const effective = member_discount
    ? Math.round(Number(book.price || 0) * (1 - MEMBER_DISCOUNT_RATE))
    : Number(book.price || 0);

  const onAdd = () => addBook({ id: book.id, title: book.title, author: book.author, sales_price: effective });

  return (
    <section style={{ padding: 'clamp(40px, 6vw, 80px) 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 48, background: HS_LIME, borderRadius: 28, padding: 'clamp(28px, 4vw, 56px)', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: HS_PURPLE }}>{eyebrow}</div>
          <h2 style={{ margin: '12px 0 14px', fontFamily: 'serif', fontWeight: 600, fontSize: 'clamp(30px, 3.6vw, 48px)', lineHeight: 1.05, color: HS_INK }}>
            {book.title} <em style={{ fontStyle: 'italic', color: HS_PURPLE }}>· {book.author}</em>
          </h2>
          <p style={{ margin: '0 0 22px', fontSize: 16, lineHeight: 1.6, color: 'rgba(31,27,22,0.78)', maxWidth: 560 }}>
            {book.description || 'A diary-novel the size of a cathedral.'}
          </p>
          <button type="button" onClick={onAdd} style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: HS_INK, color: '#fff', border: 0,
            padding: '14px 24px', borderRadius: 999,
            fontFamily: 'inherit', fontWeight: 600, fontSize: 14.5, cursor: 'pointer',
          }}>
            Add to cart · {formatInr(effective)} <span aria-hidden="true">→</span>
          </button>
        </div>
        <div style={{ aspectRatio: '3 / 4', borderRadius: 18, overflow: 'hidden', background: '#fff', boxShadow: '0 18px 40px rgba(31,27,22,0.18)' }}>
          {book.coverUrl ? (
            <img src={book.coverUrl} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%', padding: 18, color: '#fff',
              background: '#5b4d3d', display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ fontFamily: 'serif', fontWeight: 700, fontSize: 18, lineHeight: 1.2 }}>{book.title}</div>
              <div style={{ marginTop: 'auto', fontSize: 12, opacity: 0.85, letterSpacing: '0.08em' }}>{(book.author || '').toUpperCase()}</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// Big self-contained shop browser. Owns filter / sort / pagination state.
export function TapasShopBrowser({ props = {} }) {
  const { page_size = _SHOP_PAGE_SIZE, member_discount_default = true } = props;
  const { useShopBooks } = require('../cms/hooks');
  const { adaptShopBooks } = require('../cms/adapters');
  const { SHOP_PRICE_MAX, formatInr, MEMBER_DISCOUNT_RATE } = require('../data/shopBooks');
  const { useCart } = require('../context/CartContext');

  const { data: rows, loading } = useShopBooks();
  const books = React.useMemo(() => adaptShopBooks(rows), [rows, adaptShopBooks]);
  const { addBook } = useCart();

  const [filters, setFilters] = React.useState({
    search: '',
    categories: new Set(),
    format: '',
    priceMax: SHOP_PRICE_MAX,
    inStockOnly: false,
    signedOnly: false,
    memberDiscount: !!member_discount_default,
  });
  const [sort, setSort] = React.useState('recommended');
  const [page, setPage] = React.useState(1);
  const gridRef = React.useRef(null);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search), 200);
    return () => clearTimeout(t);
  }, [filters.search]);

  const categoryCounts = React.useMemo(() => {
    const m = {};
    books.forEach((b) => (b.categories || []).forEach((c) => { m[c] = (m[c] || 0) + 1; }));
    return m;
  }, [books]);

  const filtered = React.useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return books.filter((b) => {
      if (q && !(b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q))) return false;
      if (filters.categories.size > 0) {
        const hit = (b.categories || []).some((c) => filters.categories.has(c));
        if (!hit) return false;
      }
      if (filters.format && b.format !== filters.format) return false;
      if (b.price > filters.priceMax) return false;
      if (filters.inStockOnly && !b.inStock) return false;
      if (filters.signedOnly && !b.signed) return false;
      return true;
    });
  }, [books, filters, debouncedSearch]);

  const sorted = React.useMemo(() => {
    const arr = filtered.slice();
    if (sort === 'price-asc') return arr.sort((a, b) => a.price - b.price);
    if (sort === 'author-az') return arr.sort((a, b) => {
      const la = (a.author || '').split(' ').slice(-1)[0].toLowerCase();
      const lb = (b.author || '').split(' ').slice(-1)[0].toLowerCase();
      return la.localeCompare(lb);
    });
    if (sort === 'new-arrivals') return arr.reverse();
    return arr;
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / page_size));
  React.useEffect(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);
  React.useEffect(() => { setPage(1); }, [filters, debouncedSearch, sort]);
  const pageBooks = sorted.slice((page - 1) * page_size, page * page_size);

  const toggleCategory = (c) => setFilters((f) => {
    const next = new Set(f.categories);
    if (next.has(c)) next.delete(c); else next.add(c);
    return { ...f, categories: next };
  });

  const onAdd = (book) => {
    const eff = filters.memberDiscount
      ? Math.round(Number(book.price || 0) * (1 - MEMBER_DISCOUNT_RATE))
      : Number(book.price || 0);
    addBook({ id: book.id, title: book.title, author: book.author, sales_price: eff });
  };

  const allCats = Object.keys(categoryCounts).sort();

  return (
    <section style={{ padding: 'clamp(40px, 6vw, 80px) 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 32, alignItems: 'start' }}>
        {/* Sidebar */}
        <aside style={{ background: HS_CARD, border: `1px solid ${HS_RULE}`, borderRadius: 18, padding: 22, position: 'sticky', top: 88 }}>
          <div style={{ marginBottom: 18 }}>
            <input
              type="search" value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Search"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 999, border: `1px solid ${HS_RULE}`, background: '#fff', fontSize: 14, fontFamily: 'inherit', color: HS_INK, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: HS_PURPLE, marginBottom: 8 }}>Categories</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
              {allCats.length === 0 && <span style={{ fontSize: 12, color: 'rgba(31,27,22,0.5)' }}>None yet</span>}
              {allCats.map((c) => (
                <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: HS_INK, cursor: 'pointer' }}>
                  <input type="checkbox" checked={filters.categories.has(c)} onChange={() => toggleCategory(c)} />
                  <span style={{ flex: 1 }}>{c}</span>
                  <span style={{ fontSize: 11, color: 'rgba(31,27,22,0.55)' }}>{categoryCounts[c]}</span>
                </label>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: HS_PURPLE, marginBottom: 8 }}>Max price</div>
            <input type="range" min="0" max={SHOP_PRICE_MAX} step="50" value={filters.priceMax}
              onChange={(e) => setFilters((f) => ({ ...f, priceMax: Number(e.target.value) }))} style={{ width: '100%' }} />
            <div style={{ fontSize: 13, color: HS_INK, marginTop: 4 }}>{formatInr(filters.priceMax)}</div>
          </div>
          <div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: HS_INK, cursor: 'pointer', marginBottom: 8 }}>
              <input type="checkbox" checked={filters.inStockOnly} onChange={(e) => setFilters((f) => ({ ...f, inStockOnly: e.target.checked }))} />
              In stock only
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: HS_INK, cursor: 'pointer', marginBottom: 8 }}>
              <input type="checkbox" checked={filters.signedOnly} onChange={(e) => setFilters((f) => ({ ...f, signedOnly: e.target.checked }))} />
              Signed copies only
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: HS_INK, cursor: 'pointer' }}>
              <input type="checkbox" checked={filters.memberDiscount} onChange={(e) => setFilters((f) => ({ ...f, memberDiscount: e.target.checked }))} />
              Apply member discount
            </label>
          </div>
        </aside>

        {/* Right column */}
        <div ref={gridRef}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'rgba(31,27,22,0.65)', fontFamily: 'monospace', letterSpacing: '0.06em' }}>
              {sorted.length} of {books.length} titles
            </span>
            <select value={sort} onChange={(e) => setSort(e.target.value)} style={{
              padding: '8px 14px', borderRadius: 999, border: `1px solid ${HS_RULE}`, background: '#fff',
              fontFamily: 'inherit', fontSize: 13, color: HS_INK, cursor: 'pointer',
            }}>
              <option value="recommended">Recommended</option>
              <option value="new-arrivals">New arrivals</option>
              <option value="price-asc">Price · low to high</option>
              <option value="author-az">Author · A → Z</option>
            </select>
          </div>

          {loading && books.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'rgba(31,27,22,0.55)' }}>Loading shop…</div>
          ) : sorted.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', background: HS_CARD, border: `1px dashed ${HS_RULE}`, borderRadius: 16, color: 'rgba(31,27,22,0.7)' }}>
              No books match these filters.
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                {pageBooks.map((b) => {
                  const eff = filters.memberDiscount
                    ? Math.round(Number(b.price || 0) * (1 - MEMBER_DISCOUNT_RATE))
                    : Number(b.price || 0);
                  return (
                    <article key={b.id} style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 14px rgba(31,27,22,0.06)', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ aspectRatio: '3 / 4', background: '#5b4d3d', position: 'relative' }}>
                        {b.coverUrl
                          ? <img src={b.coverUrl} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ padding: 14, color: '#fff', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                              <div style={{ fontFamily: 'serif', fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>{b.title}</div>
                              <div style={{ marginTop: 'auto', fontSize: 11, opacity: 0.85, letterSpacing: '0.08em' }}>{(b.author || '').toUpperCase()}</div>
                            </div>}
                      </div>
                      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                        <div style={{ fontFamily: 'serif', fontWeight: 600, fontSize: 16, color: HS_INK, lineHeight: 1.2 }}>{b.title}</div>
                        <div style={{ fontSize: 12, color: 'rgba(31,27,22,0.6)' }}>{b.author}</div>
                        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                          <div>
                            <span style={{ fontWeight: 700, color: HS_INK }}>{formatInr(eff)}</span>
                            {filters.memberDiscount && eff < b.price && (
                              <span style={{ marginLeft: 6, fontSize: 12, color: 'rgba(31,27,22,0.5)', textDecoration: 'line-through' }}>{formatInr(b.price)}</span>
                            )}
                          </div>
                          <button onClick={() => onAdd(b)} aria-label={`Add ${b.title} to cart`} style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: HS_PINK, color: '#fff', border: 'none', cursor: 'pointer',
                            fontSize: 18, lineHeight: 1, fontWeight: 700,
                          }}>+</button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 28 }}>
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '8px 14px', borderRadius: 999, border: `1px solid ${HS_RULE}`, background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>← Prev</button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button key={i} onClick={() => setPage(i + 1)} style={{
                      padding: '8px 14px', borderRadius: 999,
                      border: `1px solid ${page === i + 1 ? HS_INK : HS_RULE}`,
                      background: page === i + 1 ? HS_INK : '#fff',
                      color: page === i + 1 ? '#fff' : HS_INK,
                      cursor: 'pointer',
                    }}>{i + 1}</button>
                  ))}
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '8px 14px', borderRadius: 999, border: `1px solid ${HS_RULE}`, background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1 }}>Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
