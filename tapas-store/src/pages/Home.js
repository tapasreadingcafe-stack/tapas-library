import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useSiteContent } from '../context/SiteContent';
import { useAuth } from '../context/AuthContext';
import HeroCarousel from '../components/HeroCarousel';
import PageRenderer from '../blocks/PageRenderer';
import { findPageByPath, NotFound } from '../utils/findPage';

// =====================================================================
// Home — "The Digital Curator's Study"
// Modern Heritage design: parchment surfaces, truffle tones, teal
// accents, editorial typography (Newsreader + Plus Jakarta Sans),
// no-border cards with tonal layering.
// =====================================================================

const GENRES = [
  { icon: '📖', label: 'Fiction' },
  { icon: '🧠', label: 'Non-Fiction' },
  { icon: '🔬', label: 'Science' },
  { icon: '📜', label: 'History' },
  { icon: '🧒', label: 'Children' },
  { icon: '💼', label: 'Business' },
  { icon: '🌍', label: 'Travel' },
  { icon: '🎨', label: 'Arts' },
];

function BookCover({ book, size = 200 }) {
  const src = book.book_image || book.cover_image;
  return (
    <div style={{
      width: size, height: size * 1.4,
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      background: 'linear-gradient(145deg, #ede8d0, #d4c9a8)',
      boxShadow: '0 16px 48px rgba(38,23,12,0.18)',
      flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {src ? (
        <img src={src} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: size * 0.2, marginBottom: '8px' }}>📖</div>
          <div style={{ fontSize: '10px', color: 'var(--on-surface-subtle)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {book.genre || 'Book'}
          </div>
        </div>
      )}
    </div>
  );
}

function StaffPickCard({ book }) {
  const forSale = Number(book.sales_price || 0) > 0;
  return (
    <Link to={`/books/${book.id}`} className="tps-card tps-card-interactive" style={{
      textDecoration: 'none', color: 'inherit',
      display: 'flex', flexDirection: 'column', gap: '16px',
      padding: '28px', height: '100%',
    }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <BookCover book={book} size={150} />
      </div>
      <div style={{ flex: 1 }}>
        <div className="tps-eyebrow" style={{ marginBottom: '8px', color: 'var(--accent)' }}>
          ★ Staff Pick
        </div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: '700', color: 'var(--text)', lineHeight: 1.25, marginBottom: '4px' }}>
          {book.title}
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-subtle)', fontStyle: 'italic' }}>by {book.author}</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.6', marginTop: '10px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {book.staff_pick_blurb || book.description || ''}
        </p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px' }}>
        {forSale ? (
          <span style={{ color: 'var(--accent)', fontWeight: '800', fontSize: '20px', fontFamily: 'var(--font-display)' }}>₹{book.sales_price}</span>
        ) : (
          <span className="tps-chip tps-chip-teal">Borrow</span>
        )}
        <span style={{ color: 'var(--secondary)', fontSize: '13px', fontWeight: '700', fontFamily: 'var(--font-display)', borderBottom: '2px solid var(--secondary-fixed)' }}>
          View →
        </span>
      </div>
    </Link>
  );
}

function GridBookCard({ book }) {
  const forSale = Number(book.sales_price || 0) > 0;
  return (
    <Link to={`/books/${book.id}`} className="tps-card-interactive" style={{
      textDecoration: 'none', color: 'inherit',
      display: 'flex', flexDirection: 'column', gap: '12px',
      padding: '12px', borderRadius: 'var(--radius-lg)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <BookCover book={book} size={140} />
      </div>
      <div>
        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: '600', color: 'var(--text)', lineHeight: 1.3, marginBottom: '4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {book.title}
        </h4>
        <p style={{ fontSize: '12px', color: 'var(--text-subtle)', fontStyle: 'italic' }}>{book.author}</p>
        {forSale && (
          <span style={{ color: 'var(--accent)', fontWeight: '700', fontSize: '15px', fontFamily: 'var(--font-display)', marginTop: '6px', display: 'block' }}>₹{book.sales_price}</span>
        )}
      </div>
    </Link>
  );
}

// Webflow-style block system shim. The route is mounted at "/", but
// the user can rename or delete any page in the editor — so we look up
// whatever page currently claims this slug instead of assuming "home".
//   - Page found with blocks → PageRenderer
//   - Page found, no blocks, default key → legacy hardcoded JSX (so
//     un-migrated sites keep their existing look)
//   - Page found, no blocks, user-created → blank
//   - No page maps here → 404
export default function Home() {
  const content = useSiteContent();
  const matchKey = findPageByPath(content?.pages, '/');
  if (matchKey) {
    const blocks = content.pages[matchKey].blocks;
    if (Array.isArray(blocks) && blocks.length > 0) {
      return <PageRenderer pageKey={matchKey} />;
    }
    if (matchKey === 'home') return <LegacyHome />;
    return null;
  }
  return <NotFound path="/" />;
}

function LegacyHome() {
  const content = useSiteContent();
  const home = content.home;
  const newsletter = content.newsletter;
  const images = content.images || {};
  const visibility = content.visibility || {};
  const layout = content.layout || {};
  const sectionStyles = content.section_styles || {};

  const bgOverlay = 'linear-gradient(135deg, rgba(38,23,12,0.88) 0%, rgba(61,43,31,0.78) 100%)';
  const resolveBg = (imgUrl, solidColor, fallbackImgUrl, defaultBg) => {
    if (imgUrl) return `${bgOverlay}, url("${imgUrl}") center/cover`;
    if (solidColor) return solidColor;
    if (fallbackImgUrl) return `${bgOverlay}, url("${fallbackImgUrl}") center/cover`;
    return defaultBg;
  };

  const orderArr = (layout.home_section_order || 'hero,genres,staff_picks,recommended,new_arrivals,cafe_story,newsletter')
    .split(',').map(s => s.trim()).filter(Boolean);
  const getOrder = (id) => {
    const idx = orderArr.indexOf(id);
    return idx === -1 ? 999 : idx;
  };

  const { member } = useAuth();

  const [staffPicks, setStaffPicks] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [emailInput, setEmailInput] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, [member?.id]);

  const fetchRecommended = async () => {
    if (!member) return [];
    // Derive genres from wishlist + borrow history + order history.
    const [wlRes, circRes, orderItRes] = await Promise.all([
      supabase.from('wishlists').select('books(id, genre)').eq('member_id', member.id).limit(20),
      supabase.from('circulation').select('books(id, genre)').eq('member_id', member.id).limit(20),
      supabase.from('customer_order_items')
        .select('book_id, books(id, genre), customer_orders!inner(member_id)')
        .eq('customer_orders.member_id', member.id)
        .limit(20),
    ]);
    const seenIds = new Set();
    const genreCounts = {};
    const collect = (rows, pickBook) => {
      for (const r of (rows || [])) {
        const b = pickBook(r);
        if (!b?.id) continue;
        seenIds.add(b.id);
        if (b.genre) genreCounts[b.genre] = (genreCounts[b.genre] || 0) + 1;
      }
    };
    collect(wlRes.data, r => r.books);
    collect(circRes.data, r => r.books);
    collect(orderItRes.data, r => r.books);

    const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => g);
    if (topGenres.length === 0) return [];

    // OR query across genres
    const filters = topGenres.map(g => `genre.ilike.%${g}%`).join(',');
    const { data } = await supabase.from('books').select('*')
      .eq('store_visible', true)
      .gt('quantity_available', 0)
      .or(filters)
      .order('created_at', { ascending: false })
      .limit(16);
    const filtered = (data || []).filter(b => !seenIds.has(b.id)).slice(0, 6);
    return filtered;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [flaggedRes, newRes, recRes] = await Promise.all([
        supabase.from('books').select('*').eq('store_visible', true).eq('is_staff_pick', true).order('created_at', { ascending: false }).limit(5),
        supabase.from('books').select('*').eq('store_visible', true).order('created_at', { ascending: false }).limit(10),
        fetchRecommended(),
      ]);
      let picks = flaggedRes.data || [];
      const newest = newRes.data || [];
      if (picks.length === 0) {
        // Fallback: no staff picks flagged yet — show newest in-stock books.
        // (Was ordering by `rating` which doesn't exist on books; rating
        // lives in the reviews table.)
        const { data } = await supabase.from('books').select('*').eq('store_visible', true).gt('quantity_available', 0).order('created_at', { ascending: false }).limit(5);
        picks = data || [];
      }
      setStaffPicks(picks.slice(0, 4));
      setNewArrivals(newest.slice(0, 8));
      setRecommended(recRes || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (emailInput.trim()) setSubscribed(true);
  };

  return (
    <div style={{ fontFamily: 'var(--font-body)', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* 1. HERO — Full carousel */}
      {visibility.home_hero !== false && (
        <div style={{ order: getOrder('hero') }}>
          <HeroCarousel home={home} sectionStyles={sectionStyles} />
        </div>
      )}

      {/* 2. GENRES — Tapas chips */}
      {visibility.home_genres !== false && (
      <section className="tps-section" style={{ order: getOrder('genres'), background: 'var(--bg-section)' }}>
        <div className="tps-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '36px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div className="tps-eyebrow" style={{ marginBottom: '10px' }}>Explore</div>
              <h2 className="tps-h2">Browse by genre</h2>
            </div>
            <Link to="/books" className="tps-btn-tertiary">See all categories →</Link>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {GENRES.map(g => (
              <Link key={g.label} to={`/books?genre=${encodeURIComponent(g.label)}`} className="tps-chip tps-chip-truffle tps-card-interactive" style={{
                padding: '12px 22px', fontSize: '14px', textDecoration: 'none',
              }}>
                <span>{g.icon}</span> {g.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* 3. STAFF PICKS — Editorial cards */}
      {visibility.home_staff_picks !== false && (
      <section data-editable-section="home" style={{
        order: getOrder('staff_picks'),
        background: 'var(--bg)',
        padding: `${sectionStyles.home_staff_picks_padding_top ?? 96}px 24px ${sectionStyles.home_staff_picks_padding_bottom ?? 96}px`,
      }}>
        <div className="tps-container">
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <div data-editable="home.staff_picks_eyebrow" className="tps-eyebrow" style={{ marginBottom: '14px', color: 'var(--accent)' }}>
              {home.staff_picks_eyebrow}
            </div>
            <h2 data-editable="home.staff_picks_title" className="tps-h2" style={{ marginBottom: '16px' }}>
              {home.staff_picks_title}
            </h2>
            <p data-editable="home.staff_picks_subtitle" style={{ color: 'var(--text-muted)', fontSize: '16px', maxWidth: '580px', margin: '0 auto', lineHeight: '1.7' }}>
              {home.staff_picks_subtitle}
            </p>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-subtle)' }}>Loading picks…</div>
          ) : staffPicks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-subtle)' }}>
              Staff picks coming soon. <Link to="/books" style={{ color: 'var(--secondary)', fontWeight: '700' }}>Browse the catalog</Link>.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
              {staffPicks.map(book => <StaffPickCard key={book.id} book={book} />)}
            </div>
          )}
        </div>
      </section>
      )}

      {/* 3b. RECOMMENDED FOR YOU — signed-in members only */}
      {member && recommended.length > 0 && visibility.home_recommended !== false && (
        <section style={{
          order: getOrder('recommended'),
          background: 'var(--bg)',
          padding: '72px 24px',
        }}>
          <div className="tps-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '36px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div className="tps-eyebrow" style={{ marginBottom: '10px', color: 'var(--accent)' }}>
                  ✨ For {member.name?.split(' ')[0] || 'you'}
                </div>
                <h2 className="tps-h2">Picked based on your reading</h2>
              </div>
              <Link to="/books" className="tps-btn-tertiary">Discover more →</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
              {recommended.map(book => <GridBookCard key={book.id} book={book} />)}
            </div>
          </div>
        </section>
      )}

      {/* 4. NEW ARRIVALS */}
      {visibility.home_new_arrivals !== false && (
      <section className="tps-section" style={{ order: getOrder('new_arrivals'), background: 'var(--bg-section)' }}>
        <div className="tps-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '36px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div className="tps-eyebrow" style={{ marginBottom: '10px' }}>Just in</div>
              <h2 className="tps-h2">New &amp; noteworthy</h2>
            </div>
            <Link to="/books?sort=newest" className="tps-btn-tertiary">View all →</Link>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-subtle)' }}>Loading…</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
              {newArrivals.map(book => <GridBookCard key={book.id} book={book} />)}
            </div>
          )}
        </div>
      </section>
      )}

      {/* 5. CAFE STORY */}
      {visibility.home_cafe_story !== false && (
      <section data-editable-section="home" style={{
        order: getOrder('cafe_story'),
        background: resolveBg(sectionStyles.home_cafe_story_bg_image, sectionStyles.home_cafe_story_bg_color, images.cafe_story_bg_url, 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)'),
        color: 'var(--surface-warm)',
        padding: `${sectionStyles.home_cafe_story_padding_top ?? 112}px 24px ${sectionStyles.home_cafe_story_padding_bottom ?? 112}px`,
        position: 'relative',
      }}>
        <div className="tps-container-narrow" style={{ textAlign: 'center', position: 'relative' }}>
          <div style={{ fontSize: '52px', marginBottom: '20px' }}>☕</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: '800', color: 'var(--surface-warm)', marginBottom: '28px', lineHeight: 1.08, letterSpacing: '-0.02em' }}>
            <span data-editable="home.cafe_story_headline_line1">{home.cafe_story_headline_line1}</span><br />
            <span data-editable="home.cafe_story_headline_line2" style={{ color: 'var(--accent)', fontStyle: 'italic' }}>{home.cafe_story_headline_line2}</span>
          </h2>
          <p data-editable="home.cafe_story_body" style={{ color: 'rgba(245,245,220,0.82)', fontSize: '17px', lineHeight: '1.85', maxWidth: '680px', margin: '0 auto 40px' }}>
            {home.cafe_story_body}
          </p>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/about" className="tps-btn tps-btn-teal tps-btn-lg">Our story →</Link>
            <Link to="/login?mode=signup" className="tps-btn tps-btn-lg" style={{ background: 'transparent', border: '2px solid rgba(245,245,220,0.5)', color: 'var(--surface-warm)' }}>
              Join the circle
            </Link>
          </div>
        </div>
      </section>
      )}

      {/* 6. NEWSLETTER */}
      {visibility.home_newsletter !== false && (
      <section data-editable-section="newsletter" className="tps-section" style={{ order: getOrder('newsletter') }}>
        <div className="tps-container-narrow">
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-2xl)',
            padding: '64px 48px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-ambient)',
          }}>
            <div data-editable="newsletter.eyebrow" style={{ fontSize: '40px', marginBottom: '14px' }}>{newsletter.eyebrow}</div>
            <h2 data-editable="newsletter.headline" className="tps-h3" style={{ marginBottom: '14px' }}>
              {newsletter.headline}
            </h2>
            <p data-editable="newsletter.description" style={{ color: 'var(--text-muted)', fontSize: '15px', marginBottom: '32px', maxWidth: '460px', margin: '0 auto 32px', lineHeight: '1.7' }}>
              {newsletter.description}
            </p>
            {subscribed ? (
              <div className="tps-chip tps-chip-teal" style={{ padding: '12px 24px', fontSize: '14px' }}>
                ✓ You're on the list!
              </div>
            ) : (
              <form onSubmit={handleSubscribe} style={{ display: 'flex', gap: '10px', maxWidth: '440px', margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
                <input
                  type="email" required
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  placeholder="your@email.com"
                  className="tps-input"
                  style={{ flex: '1 1 240px', minWidth: 0, borderRadius: 'var(--radius-md)' }}
                />
                <button type="submit" className="tps-btn tps-btn-primary">Subscribe</button>
              </form>
            )}
          </div>
        </div>
      </section>
      )}
    </div>
  );
}
