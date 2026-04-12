import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useSiteContent } from '../context/SiteContent';
import HeroCarousel from '../components/HeroCarousel';

// =====================================================================
// Home — 2025-2026 redesign
// ---------------------------------------------------------------------
// Layout:
//   1. Hero — gradient background, eyebrow + headline + pill search
//      + featured "This week's pick" card
//   2. Genre chips — rounded pills linking to filtered catalog
//   3. Staff picks — editorial rail with 16px radius cards, scale hover
//   4. New arrivals — minimalist grid of covers
//   5. Cafe story — dark panel with gradient CTA
//   6. Newsletter — subtle gradient card
// =====================================================================

const GENRES = [
  { icon:'📖', label:'Fiction',     blurb:'Novels and short stories from India and beyond' },
  { icon:'🧠', label:'Non-Fiction', blurb:'Memoirs, essays, and books that explain the world' },
  { icon:'🔬', label:'Science',     blurb:'From cosmology to the future of biology' },
  { icon:'📜', label:'History',     blurb:'People, places, and the forces that shaped us' },
  { icon:'🧒', label:'Children',    blurb:'Picture books, chapter books, and YA favourites' },
  { icon:'💼', label:'Business',    blurb:'Strategy, leadership, and entrepreneurial stories' },
  { icon:'🌍', label:'Travel',      blurb:'Guides and memoirs from the road less travelled' },
  { icon:'🎨', label:'Arts',        blurb:'Photography, design, and the craft of making things' },
];

const FALLBACK_BLURB = 'Picked by our team — a must-read this month.';

function BookCover({ book, size = 200 }) {
  const src = book.book_image || book.cover_image;
  return (
    <div style={{
      width: size,
      height: size * 1.35,
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      background: 'linear-gradient(145deg, #F5DEB3, #D4A853)',
      boxShadow: '0 16px 40px rgba(44,24,16,0.18), 0 0 0 1px rgba(44,24,16,0.04)',
      flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {src ? (
        <img src={src} alt={book.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
      ) : (
        <div style={{ textAlign:'center', padding:'20px' }}>
          <div style={{ fontSize: size * 0.22, marginBottom:'8px' }}>📖</div>
          <div style={{ fontSize:'10px', color:'#8B6914', fontWeight:'700', textTransform:'uppercase', letterSpacing:'1px' }}>
            {book.genre || book.category || 'Book'}
          </div>
        </div>
      )}
    </div>
  );
}

function StaffPickCard({ book, pickedBy }) {
  const forSale = Number(book.sales_price || 0) > 0;
  return (
    <Link to={`/books/${book.id}`} className="tps-card tps-card-interactive" style={{
      textDecoration:'none', color:'inherit',
      display:'flex', flexDirection:'column', gap:'16px',
      padding:'24px',
      height:'100%',
    }}>
      <div style={{ display:'flex', justifyContent:'center' }}>
        <BookCover book={book} size={160} />
      </div>
      <div style={{ flex:1 }}>
        <div className="tps-eyebrow" style={{ marginBottom:'8px' }}>
          ★ Staff Pick{pickedBy ? ` — ${pickedBy}` : ''}
        </div>
        <h3 className="tps-card-title" style={{ marginBottom:'4px' }}>
          {book.title}
        </h3>
        <p className="tps-subtle" style={{ fontSize:'13px', marginBottom:'12px' }}>by {book.author}</p>
        <p style={{ color:'var(--text-muted)', fontSize:'13px', lineHeight:'1.6', display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden', minHeight:'60px' }}>
          {book.staff_pick_blurb
            ? `"${book.staff_pick_blurb}"`
            : (book.description ? `"${book.description}"` : FALLBACK_BLURB)}
        </p>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid var(--border)', paddingTop:'14px' }}>
        {forSale ? (
          <span style={{ color:'var(--brand-accent)', fontWeight:'800', fontSize:'20px', fontFamily:'var(--font-heading)' }}>₹{book.sales_price}</span>
        ) : (
          <span className="tps-badge tps-badge-success">Borrow</span>
        )}
        <span className="tps-subtle" style={{ fontSize:'12px', fontWeight:'600' }}>View →</span>
      </div>
    </Link>
  );
}

function GridBookCard({ book }) {
  const forSale = Number(book.sales_price || 0) > 0;
  return (
    <Link to={`/books/${book.id}`} style={{ textDecoration:'none', color:'inherit' }}>
      <div className="tps-card-interactive" style={{
        display:'flex', flexDirection:'column', gap:'12px',
        padding:'12px', borderRadius:'var(--radius-md)',
        transition:'all 200ms var(--ease)',
        cursor:'pointer', height:'100%',
      }}>
        <div style={{ display:'flex', justifyContent:'center' }}>
          <BookCover book={book} size={150} />
        </div>
        <div>
          <h4 style={{ fontFamily:'var(--font-heading)', fontSize:'15px', fontWeight:'600', color:'var(--text)', marginBottom:'4px', lineHeight:'1.3', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
            {book.title}
          </h4>
          <p className="tps-subtle" style={{ fontSize:'12px', marginBottom:'6px' }}>{book.author}</p>
          {forSale ? (
            <span style={{ color:'var(--brand-accent)', fontWeight:'700', fontSize:'15px', fontFamily:'var(--font-heading)' }}>₹{book.sales_price}</span>
          ) : (
            <span className="tps-badge tps-badge-success" style={{ fontSize:'10px' }}>Borrow</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const content = useSiteContent();
  const home = content.home;
  const newsletter = content.newsletter;
  const visibility = content.visibility || {};
  const layout = content.layout || {};
  const sectionStyles = content.section_styles || {};
  const images = content.images || {};

  const bgOverlay = 'linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(44,24,16,0.78) 100%)';
  const resolveBg = (imgUrl, solidColor, fallbackImgUrl, defaultBg) => {
    if (imgUrl) return `${bgOverlay}, url("${imgUrl}") center/cover`;
    if (solidColor) return solidColor;
    if (fallbackImgUrl) return `${bgOverlay}, url("${fallbackImgUrl}") center/cover`;
    return defaultBg;
  };

  const orderArr = (layout.home_section_order || 'hero,genres,staff_picks,new_arrivals,cafe_story,newsletter')
    .split(',').map(s => s.trim()).filter(Boolean);
  const getOrder = (id) => {
    const idx = orderArr.indexOf(id);
    return idx === -1 ? 999 : idx;
  };

  const [staffPicks, setStaffPicks] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [emailInput, setEmailInput] = useState('');

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [flaggedRes, newRes] = await Promise.all([
        supabase.from('books').select('*').eq('store_visible', true).eq('is_staff_pick', true).order('created_at', { ascending: false }).limit(5),
        supabase.from('books').select('*').eq('store_visible', true).order('created_at', { ascending: false }).limit(10),
      ]);
      let picks = flaggedRes.data || [];
      const newest = newRes.data || [];
      if (picks.length === 0) {
        const { data: ratedFallback } = await supabase.from('books').select('*').eq('store_visible', true).gt('quantity_available', 0).order('rating', { ascending: false, nullsFirst: false }).limit(5);
        picks = ratedFallback || [];
      }
      setStaffPicks((picks[0] ? picks.slice(1) : picks).slice(0, 4));
      setNewArrivals(newest.filter(b => !picks[0] || b.id !== picks[0].id).slice(0, 8));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (emailInput.trim()) setSubscribed(true);
  };

  return (
    <div style={{ fontFamily:'var(--font-body)', background:'var(--bg)', display:'flex', flexDirection:'column' }}>

      {/* ================================================================ */}
      {/* 1. HERO — full-width rotating carousel                            */}
      {/* ================================================================ */}
      {visibility.home_hero !== false && (
        <div style={{ order: getOrder('hero') }}>
          <HeroCarousel home={home} sectionStyles={sectionStyles} />
        </div>
      )}

      {/* ================================================================ */}
      {/* 2. GENRES                                                         */}
      {/* ================================================================ */}
      {visibility.home_genres !== false && (
      <section id="section-home-genres" className="tps-section" style={{
        order: getOrder('genres'),
        background: sectionStyles.home_genres_bg_color || undefined,
        textAlign: sectionStyles.home_genres_text_align || undefined,
      }}>
        <div className="tps-container">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'32px', flexWrap:'wrap', gap:'12px' }}>
            <div>
              <div className="tps-eyebrow" style={{ marginBottom:'8px' }}>Explore</div>
              <h2 className="tps-h2">Browse by genre</h2>
            </div>
            <Link to="/books" className="tps-btn tps-btn-ghost tps-btn-sm">
              See every category →
            </Link>
          </div>

          <div className="tps-grid tps-grid-wide">
            {GENRES.map(cat => (
              <Link key={cat.label} to={`/books?genre=${encodeURIComponent(cat.label)}`} className="tps-card tps-card-interactive" style={{
                padding:'22px 20px', textDecoration:'none',
              }}>
                <div style={{ fontSize:'28px', marginBottom:'10px' }}>{cat.icon}</div>
                <div style={{ fontFamily:'var(--font-heading)', fontSize:'18px', fontWeight:'700', color:'var(--text)', marginBottom:'6px' }}>{cat.label}</div>
                <div className="tps-subtle" style={{ fontSize:'13px', lineHeight:'1.5' }}>{cat.blurb}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ================================================================ */}
      {/* 3. STAFF PICKS                                                    */}
      {/* ================================================================ */}
      {visibility.home_staff_picks !== false && (
      <section id="section-home-staff-picks" data-editable-section="home" style={{
        order: getOrder('staff_picks'),
        background: resolveBg(sectionStyles.home_staff_picks_bg_image, sectionStyles.home_staff_picks_bg_color, null, 'var(--bg-subtle)'),
        paddingTop:    `${sectionStyles.home_staff_picks_padding_top ?? 80}px`,
        paddingBottom: `${sectionStyles.home_staff_picks_padding_bottom ?? 80}px`,
        paddingLeft: '20px', paddingRight: '20px',
        borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)',
      }}>
        <div className="tps-container">
          <div style={{ textAlign:'center', marginBottom:'48px' }}>
            <div data-editable="home.staff_picks_eyebrow" className="tps-eyebrow" style={{ marginBottom:'14px' }}>
              {home.staff_picks_eyebrow}
            </div>
            <h2 data-editable="home.staff_picks_title" className="tps-h2" style={{ marginBottom:'14px' }}>
              {home.staff_picks_title}
            </h2>
            <p data-editable="home.staff_picks_subtitle" className="tps-subtle" style={{ fontSize:'16px', maxWidth:'580px', margin:'0 auto', lineHeight:'1.6' }}>
              {home.staff_picks_subtitle}
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign:'center', padding:'60px', color:'var(--text-subtle)' }}>Loading picks…</div>
          ) : staffPicks.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px', color:'var(--text-subtle)' }}>
              Staff picks are on their way. In the meantime,{' '}
              <Link to="/books" style={{ color:'var(--brand-accent)', fontWeight:'700' }}>browse the catalog</Link>.
            </div>
          ) : (
            <div className="tps-grid" style={{ gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))' }}>
              {staffPicks.map(book => (
                <StaffPickCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </div>
      </section>
      )}

      {/* ================================================================ */}
      {/* 4. NEW ARRIVALS                                                   */}
      {/* ================================================================ */}
      {visibility.home_new_arrivals !== false && (
      <section id="section-home-new-arrivals" className="tps-section" style={{
        order: getOrder('new_arrivals'),
        background: sectionStyles.home_new_arrivals_bg_color || undefined,
        textAlign: sectionStyles.home_new_arrivals_text_align || undefined,
      }}>
        <div className="tps-container">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'32px', flexWrap:'wrap', gap:'12px' }}>
            <div>
              <div className="tps-eyebrow" style={{ marginBottom:'8px' }}>Just in</div>
              <h2 className="tps-h2">New &amp; noteworthy</h2>
            </div>
            <Link to="/books?sort=newest" className="tps-btn tps-btn-ghost tps-btn-sm">
              View all →
            </Link>
          </div>

          {loading ? (
            <div style={{ textAlign:'center', padding:'60px', color:'var(--text-subtle)' }}>Loading…</div>
          ) : newArrivals.length === 0 ? (
            <div style={{ padding:'40px', color:'var(--text-subtle)', textAlign:'center' }}>
              No new arrivals yet. Check back soon.
            </div>
          ) : (
            <div className="tps-grid" style={{ gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'12px' }}>
              {newArrivals.map(book => <GridBookCard key={book.id} book={book} />)}
            </div>
          )}
        </div>
      </section>
      )}

      {/* ================================================================ */}
      {/* 5. CAFE STORY                                                     */}
      {/* ================================================================ */}
      {visibility.home_cafe_story !== false && (
      <section id="section-home-cafe-story" data-editable-section="home" style={{
        order: getOrder('cafe_story'),
        background: resolveBg(
          sectionStyles.home_cafe_story_bg_image,
          sectionStyles.home_cafe_story_bg_color,
          images.cafe_story_bg_url,
          'var(--gradient-hero)'
        ),
        color: '#F5DEB3',
        paddingTop:    `${sectionStyles.home_cafe_story_padding_top ?? 104}px`,
        paddingBottom: `${sectionStyles.home_cafe_story_padding_bottom ?? 104}px`,
        paddingLeft: '20px', paddingRight: '20px',
        position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle at 80% 20%, rgba(212,168,83,0.12) 0%, transparent 55%)', pointerEvents:'none' }} />
        <div className="tps-container-narrow" style={{ textAlign:'center', position:'relative' }}>
          <div style={{ fontSize:'52px', marginBottom:'16px' }}>☕</div>
          <h2 style={{
            fontFamily:'var(--font-heading)',
            fontSize:'clamp(32px, 4.5vw, 52px)',
            fontWeight:'800',
            color:'#F5DEB3',
            marginBottom:'24px',
            lineHeight:'1.12',
            letterSpacing:'-0.02em',
          }}>
            <span data-editable="home.cafe_story_headline_line1">{home.cafe_story_headline_line1}</span><br />
            <span data-editable="home.cafe_story_headline_line2" style={{ color:'#D4A853', fontStyle:'italic' }}>{home.cafe_story_headline_line2}</span>
          </h2>
          <p data-editable="home.cafe_story_body" style={{ color:'rgba(245,222,179,0.82)', fontSize:'17px', lineHeight:'1.8', maxWidth:'680px', margin:'0 auto 36px' }}>
            {home.cafe_story_body}
          </p>
          <div style={{ display:'flex', gap:'14px', justifyContent:'center', flexWrap:'wrap' }}>
            <Link to="/about" className="tps-btn tps-btn-primary tps-btn-lg">
              Our story →
            </Link>
            <Link to="/login?mode=signup" className="tps-btn tps-btn-lg" style={{
              border:'1.5px solid rgba(245,222,179,0.55)', color:'#F5DEB3',
            }}>
              Become a member
            </Link>
          </div>
        </div>
      </section>
      )}

      {/* ================================================================ */}
      {/* 6. NEWSLETTER                                                     */}
      {/* ================================================================ */}
      {visibility.home_newsletter !== false && (
      <section id="section-newsletter" data-editable-section="newsletter" className="tps-section" style={{
        order: getOrder('newsletter'),
        background: sectionStyles.home_newsletter_bg_color || undefined,
        textAlign: sectionStyles.home_newsletter_text_align || undefined,
      }}>
        <div className="tps-container-narrow">
          <div style={{
            background:'var(--gradient-subtle)',
            borderRadius:'var(--radius-2xl)',
            padding:'56px 40px',
            textAlign:'center',
            border:'1px solid var(--border)',
            boxShadow:'var(--shadow-md)',
          }}>
            <div data-editable="newsletter.eyebrow" style={{ fontSize:'40px', marginBottom:'12px' }}>{newsletter.eyebrow}</div>
            <h2 data-editable="newsletter.headline" className="tps-h3" style={{ marginBottom:'12px' }}>
              {newsletter.headline}
            </h2>
            <p data-editable="newsletter.description" className="tps-subtle" style={{ fontSize:'15px', marginBottom:'28px', maxWidth:'480px', margin:'0 auto 28px', lineHeight:'1.6' }}>
              {newsletter.description}
            </p>

            {subscribed ? (
              <div className="tps-badge tps-badge-success" style={{ padding:'10px 20px', fontSize:'13px' }}>
                ✓ You're on the list — check your inbox soon!
              </div>
            ) : (
              <form onSubmit={handleSubscribe} style={{ display:'flex', gap:'10px', maxWidth:'460px', margin:'0 auto', flexWrap:'wrap', justifyContent:'center' }}>
                <input
                  type="email" required
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  placeholder="your@email.com"
                  className="tps-input tps-input-pill"
                  style={{ flex:'1 1 240px', minWidth:0 }}
                />
                <button type="submit" className="tps-btn tps-btn-primary">
                  Subscribe
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
      )}

    </div>
  );
}
