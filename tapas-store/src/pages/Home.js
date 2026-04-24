import React from 'react';
import { Link } from 'react-router-dom';
import { useSiteContent, useV2Content } from '../context/SiteContent';
import PageRenderer from '../blocks/PageRenderer';
import LandingHero from '../components/LandingHero';
import { findPageByPath, findV2PageByPath } from '../utils/findPage';

// =====================================================================
// Home — Tapas reading cafe landing page (Figma conversion).
// Sections: Hero (lime wave + library photo), Services (3 cards),
// New Arrivals (4 product cards), Room inspiration, Testimonials.
// =====================================================================

const LIME = '#caf27e';
const PINK = '#EF3D7B';
const PINK_DARK = '#D02A65';
const INK = '#1F2937';
const INK_DIM = '#4B5563';
const INK_FAINT = '#9CA3AF';
const PURPLE = '#7E22CE';

// ---------------------------------------------------------------------
// Public asset helper. Drop real images into tapas-store/public/ to
// replace the placeholders — names are documented next to each <img>.
// ---------------------------------------------------------------------
const asset = (name) => `${process.env.PUBLIC_URL || ''}/${name}`;

// SVG silhouette placeholder for missing imagery so the layout still
// reads clearly when there's no asset on disk.
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
      src={src}
      alt={label}
      onError={() => setFailed(true)}
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
    />
  );
}

// The legacy lime "Discover Our / New Collection" Hero component was
// removed when the split-layout LandingHero took over. Keeping this
// comment so future greps for "hero" land somewhere meaningful.

// ---------------------------------------------------------------------
// 2. Services
// ---------------------------------------------------------------------
const SERVICES = [
  {
    icon: '📚',
    title: 'Buying Books',
    body: 'Browse our curated catalogue and take new titles home — from indie debuts to global bestsellers.',
    href: '/books',
  },
  {
    icon: '🪪',
    title: 'Lending Books',
    body: 'Become a member and borrow up to four books at a time. Renewals are free, late fees are gentle.',
    href: '/profile',
  },
  {
    icon: '🎤',
    title: 'Events',
    body: 'Author readings, book clubs, and quiet study evenings — there is always something on the calendar.',
    href: '/blog',
  },
];

function Services() {
  return (
    <section style={{ background: LIME, padding: 'clamp(60px, 8vw, 110px) 20px' }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '54px' }}>
          <div style={{
            color: PURPLE, fontWeight: 700, fontSize: '12px',
            letterSpacing: '2.5px', textTransform: 'uppercase',
          }}>
            Our Services
          </div>
          <h2 style={{
            marginTop: '12px', fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
            fontSize: 'clamp(28px, 3.6vw, 40px)', color: INK, fontWeight: 700,
            lineHeight: 1.2, maxWidth: '720px', marginInline: 'auto',
          }}>
            We provide great services for our customers based on
          </h2>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '24px',
        }}>
          {SERVICES.map((s) => (
            <ServiceCard key={s.title} {...s} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceCard({ icon, title, body, href }) {
  return (
    <div style={{
      background: '#fff', borderRadius: '12px', padding: '36px 28px 28px',
      textAlign: 'center', boxShadow: '0 8px 30px rgba(31,41,55,0.08)',
      transition: 'transform 250ms, box-shadow 250ms',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(31,41,55,0.14)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(31,41,55,0.08)'; }}
    >
      <div style={{ fontSize: '64px', lineHeight: 1, marginBottom: '20px' }}>{icon}</div>
      <h3 style={{
        margin: 0, fontSize: '17px', fontWeight: 700, color: INK,
        letterSpacing: '0.5px', textTransform: 'uppercase',
      }}>
        {title}
      </h3>
      <p style={{
        marginTop: '14px', color: INK_DIM, fontSize: '14px',
        lineHeight: 1.6, minHeight: '64px',
      }}>
        {body}
      </p>
      <Link to={href} style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        marginTop: '18px', color: PURPLE, fontWeight: 700,
        fontSize: '13px', textDecoration: 'none',
      }}>
        Learn more <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------
// 3. New Arrivals
// ---------------------------------------------------------------------
const ARRIVALS = [
  { title: 'Syltherine', sub: 'Stylish café chair',  price: 'Rp 2.500.000', strike: 'Rp 3.500.000', badge: '-30%', img: 'arrival-1.jpg' },
  { title: 'Leviosa',    sub: 'Stylish café chair',  price: 'Rp 2.500.000', strike: null,           badge: null,    img: 'arrival-2.jpg' },
  { title: 'Lolito',     sub: 'Luxury big sofa',     price: 'Rp 7.000.000', strike: 'Rp 14.000.000', badge: '-50%', img: 'arrival-3.jpg' },
  { title: 'Respira',    sub: 'Outdoor bar table and stool', price: 'Rp 500.000', strike: null,    badge: 'New',   img: 'arrival-4.jpg' },
];

function NewArrivals() {
  return (
    <section style={{ background: LIME, padding: '0 20px clamp(60px, 8vw, 110px)' }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '38px' }}>
          <div style={{
            color: PURPLE, fontWeight: 700, fontSize: '12px',
            letterSpacing: '2.5px', textTransform: 'uppercase',
          }}>
            New Arrivals
          </div>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
        }}>
          {ARRIVALS.map((a) => <ArrivalCard key={a.title} {...a} />)}
        </div>
      </div>
    </section>
  );
}

function ArrivalCard({ title, sub, price, strike, badge, img }) {
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
      }}>
      <div style={{ position: 'relative' }}>
        <ImageOrPlaceholder src={asset(img)} ratio="1 / 1" label={img} bg="#E5E7EB" />
        {badge && (
          <span style={{
            position: 'absolute', top: '14px', right: '14px',
            background: badgeColor, color: '#fff',
            width: '46px', height: '46px', borderRadius: '50%',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 700,
          }}>{badge}</span>
        )}
        {hovered && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(31,41,55,0.55)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '14px', animation: 'tapas-fade-up 220ms ease-out',
          }}>
            <button style={{
              background: '#fff', color: PINK, border: 'none',
              padding: '12px 32px', fontWeight: 700, fontSize: '13px',
              cursor: 'pointer', letterSpacing: '0.5px',
            }}>Add to cart</button>
            <div style={{ display: 'flex', gap: '18px', color: '#fff', fontSize: '12px', fontWeight: 600 }}>
              <span>↗ Share</span>
              <span>⇄ Compare</span>
              <span>♡ Like</span>
            </div>
          </div>
        )}
      </div>
      <div style={{ padding: '16px 18px 22px' }}>
        <div style={{ fontSize: '20px', fontWeight: 700, color: INK }}>{title}</div>
        <div style={{ marginTop: '4px', fontSize: '13px', color: INK_FAINT }}>{sub}</div>
        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <span style={{ fontSize: '17px', fontWeight: 700, color: INK }}>{price}</span>
          {strike && (
            <span style={{ fontSize: '12px', color: INK_FAINT, textDecoration: 'line-through' }}>{strike}</span>
          )}
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------
// 4. Room inspiration
// ---------------------------------------------------------------------
function RoomInspiration() {
  return (
    <section style={{ background: '#FBF8EE', padding: 'clamp(60px, 8vw, 100px) 20px' }}>
      <style>{`
        .tapas-rooms { display: grid; grid-template-columns: 1fr 1.4fr; gap: clamp(24px, 4vw, 60px); align-items: center; max-width: 1180px; margin: 0 auto; }
        @media (max-width: 900px) { .tapas-rooms { grid-template-columns: 1fr; } }
      `}</style>
      <div className="tapas-rooms">
        <div>
          <h2 style={{
            margin: 0, fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
            fontSize: 'clamp(28px, 3.6vw, 40px)', color: INK,
            fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.01em',
          }}>
            50+ Beautiful rooms<br />inspiration
          </h2>
          <p style={{ marginTop: '14px', color: INK_DIM, fontSize: '14px', lineHeight: 1.65, maxWidth: '320px' }}>
            Our designers have already arranged a lot of beautiful prototypes
            of reading nooks that inspire us.
          </p>
          <Link to="/blog" style={{
            display: 'inline-block', marginTop: '24px',
            padding: '12px 26px', borderRadius: '6px',
            background: PINK, color: '#fff', fontWeight: 700, fontSize: '13px',
            textDecoration: 'none', letterSpacing: '0.5px', textTransform: 'uppercase',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = PINK_DARK; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = PINK; }}
          >
            Explore More
          </Link>
        </div>

        <div style={{ display: 'flex', gap: '20px', overflow: 'hidden', position: 'relative' }}>
          <div style={{ flex: '0 0 60%', position: 'relative' }}>
            <ImageOrPlaceholder src={asset('room-1.jpg')} ratio="3 / 4" label="room-1.jpg" bg="#EAE3D2" />
            <div style={{
              position: 'absolute', bottom: '16px', left: '16px',
              background: 'rgba(255,255,255,0.92)', padding: '14px 18px',
              borderRadius: '6px',
            }}>
              <div style={{ fontSize: '11px', color: INK_FAINT, letterSpacing: '1px' }}>01 — Bed Room</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: INK }}>Inner Peace</div>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <ImageOrPlaceholder src={asset('room-2.jpg')} ratio="3 / 4" label="room-2.jpg" bg="#F0EAD8" />
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------
// 5. Testimonials
// ---------------------------------------------------------------------
const REVIEWS = [
  { quote: 'You made it so simple.',  body: 'My new shelf is so much faster and easier to browse than my old library app.', author: 'Corey Valdez', role: 'Founder at Zenix' },
  { quote: 'Simply the best.',         body: "Better than all the rest. I'd recommend this place to beginners.", author: 'Ian Klein', role: 'Digital Marketer' },
];

function Testimonials() {
  return (
    <section style={{ background: LIME, padding: 'clamp(60px, 8vw, 100px) 20px' }}>
      <div style={{
        maxWidth: '1080px', margin: '0 auto',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '40px', textAlign: 'center',
      }}>
        {REVIEWS.map((r) => (
          <div key={r.author}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: '#D1D5DB', margin: '0 auto 18px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#6B7280', fontSize: '28px',
            }}>👤</div>
            <div style={{
              fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
              fontSize: '20px', fontWeight: 700, color: INK,
            }}>
              "{r.quote}"
            </div>
            <p style={{ marginTop: '10px', color: INK_DIM, fontSize: '14px', lineHeight: 1.6, maxWidth: '320px', marginInline: 'auto' }}>
              {r.body}
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
// 6. Newsletter strip (dark)
// ---------------------------------------------------------------------
function Newsletter() {
  return (
    <section style={{ background: '#1F1F1F', padding: '34px 20px' }}>
      <div style={{
        maxWidth: '1180px', margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '24px', flexWrap: 'wrap', color: '#fff',
      }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 700 }}>✉ Subscribe to our Newsletter</div>
          <div style={{ fontSize: '12px', color: '#A0A0A0', marginTop: '4px' }}>
            Monthly book picks, member events, and quiet announcements.
          </div>
        </div>
        <form
          onSubmit={(e) => e.preventDefault()}
          style={{ display: 'flex', gap: '8px', flex: '1 1 320px', maxWidth: '520px' }}
        >
          <input
            type="email" placeholder="Your email address"
            style={{
              flex: 1, padding: '12px 16px', border: 'none',
              background: '#2A2A2A', color: '#fff',
              borderRadius: '4px', fontSize: '14px', outline: 'none',
            }}
          />
          <button style={{
            padding: '12px 24px', border: 'none',
            background: PINK, color: '#fff',
            borderRadius: '4px', fontWeight: 700, fontSize: '13px',
            cursor: 'pointer', letterSpacing: '0.5px',
          }}>Subscribe</button>
        </form>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------
// Compose
// ---------------------------------------------------------------------
function LegacyHome() {
  // LegacyHome no longer owns a hero â the split-layout
  // LandingHero sits above whatever branch Home() picks, so having
  // the old Hero() here too would double-stack.
  return (
    <>
      <Services />
      <NewArrivals />
      <RoomInspiration />
      <Testimonials />
      <Newsletter />
    </>
  );
}

// Public Home — always open with the split-layout LandingHero, then
// delegate the rest of the page to the v2 tree (or the legacy React
// sections when v2 is off).
export default function Home() {
  const content = useSiteContent();
  const v2 = useV2Content();

  let body = null;
  if (v2?.enabled && v2.loaded) {
    const v2Key = findV2PageByPath(v2?.content?.pages, '/');
    if (v2Key) body = <PageRenderer pageKey={v2Key} />;
  }
  if (!body) {
    const matchKey = findPageByPath(content?.pages, '/');
    if (matchKey) {
      const blocks = content.pages[matchKey].blocks;
      if (Array.isArray(blocks) && blocks.length > 0) {
        body = <PageRenderer pageKey={matchKey} />;
      } else if (matchKey === 'home') {
        body = <LegacyHome />;
      }
    } else {
      body = <LegacyHome />;
    }
  }

  return (
    <>
      <LandingHero />
      {body}
    </>
  );
}
