import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useSiteContent } from '../context/SiteContent';

// =====================================================================
// Home — editorial bookstore homepage inspired by powells.com.
//
// Layout, top to bottom:
//   1. Editorial hero — headline + search, with a featured book cover
//      on the right (Powell's-style "marquee" treatment)
//   2. Curated section bar — "Browse by genre" with short descriptors
//   3. Staff Picks — headline section with up-to-5 hand-picked books,
//      each card includes a short "why we love it" blurb
//   4. New & Noteworthy — latest arrivals, grid layout
//   5. The cafe story — warm editorial block about the reading cafe
//   6. Newsletter signup — "Get our weekly reading list"
// =====================================================================

const GENRES = [
  { icon:'📖', label:'Fiction',      blurb:'Novels and short stories from India and beyond',         color:'#667EEA' },
  { icon:'🧠', label:'Non-Fiction',  blurb:'Memoirs, essays, and books that explain the world',       color:'#F6AD55' },
  { icon:'🔬', label:'Science',      blurb:'From cosmology to the future of biology',                  color:'#68D391' },
  { icon:'📜', label:'History',      blurb:'People, places, and the forces that shaped us',           color:'#FC8181' },
  { icon:'🧒', label:'Children',     blurb:'Picture books, chapter books, and YA favourites',         color:'#76E4F7' },
  { icon:'💼', label:'Business',     blurb:'Strategy, leadership, and entrepreneurial stories',       color:'#B794F4' },
  { icon:'🌍', label:'Travel',       blurb:'Guides and memoirs from the road less travelled',         color:'#F6E05E' },
  { icon:'🎨', label:'Arts',         blurb:'Photography, design, and the craft of making things',     color:'#FBB6CE' },
];

// Short blurbs used for staff picks fallback when book.description is missing.
const FALLBACK_BLURB = 'Picked by our team — a must-read this month.';

function BookCover({ book, size = 200 }) {
  const src = book.book_image || book.cover_image;
  return (
    <div style={{
      width: size,
      height: size * 1.35,
      borderRadius: '4px',
      overflow: 'hidden',
      background: 'linear-gradient(145deg, #F5DEB3, #D4A853)',
      boxShadow: '0 14px 40px rgba(44,24,16,0.25), 0 0 0 1px rgba(44,24,16,0.05)',
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
    <Link to={`/books/${book.id}`} style={{
      textDecoration:'none', color:'inherit',
      display:'flex', flexDirection:'column', gap:'16px',
      background:'white', borderRadius:'12px', padding:'24px',
      boxShadow:'0 4px 20px rgba(44,24,16,0.08)',
      transition:'transform 0.25s, box-shadow 0.25s',
      height:'100%',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform='translateY(-6px)'; e.currentTarget.style.boxShadow='0 16px 40px rgba(44,24,16,0.15)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 20px rgba(44,24,16,0.08)'; }}
    >
      <div style={{ display:'flex', justifyContent:'center' }}>
        <BookCover book={book} size={160} />
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:'10px', fontWeight:'700', color:'#D4A853', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:'6px' }}>
          ★ Staff Pick{pickedBy ? ` — ${pickedBy}` : ''}
        </div>
        <h3 style={{ fontFamily:'"Playfair Display", serif', fontSize:'18px', fontWeight:'700', color:'#2C1810', marginBottom:'4px', lineHeight:'1.25' }}>
          {book.title}
        </h3>
        <p style={{ color:'#8B6914', fontSize:'13px', marginBottom:'12px' }}>by {book.author}</p>
        <p style={{ color:'#5C3A1E', fontSize:'13px', lineHeight:'1.6', display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden', minHeight:'60px' }}>
          {book.staff_pick_blurb
            ? `"${book.staff_pick_blurb}"`
            : (book.description ? `"${book.description}"` : FALLBACK_BLURB)}
        </p>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid #F5DEB3', paddingTop:'12px' }}>
        {forSale ? (
          <span style={{ color:'#D4A853', fontWeight:'800', fontSize:'18px', fontFamily:'"Playfair Display", serif' }}>₹{book.sales_price}</span>
        ) : (
          <span style={{ color:'#48BB78', fontWeight:'600', fontSize:'13px' }}>Borrow Only</span>
        )}
        <span style={{ color:'#8B6914', fontSize:'12px', fontWeight:'600' }}>View →</span>
      </div>
    </Link>
  );
}

function GridBookCard({ book }) {
  const forSale = Number(book.sales_price || 0) > 0;
  return (
    <Link to={`/books/${book.id}`} style={{ textDecoration:'none', color:'inherit' }}>
      <div style={{
        display:'flex', flexDirection:'column', gap:'14px',
        padding:'12px', borderRadius:'8px',
        transition:'background 0.2s',
        cursor:'pointer', height:'100%',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,222,179,0.4)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        <div style={{ display:'flex', justifyContent:'center' }}>
          <BookCover book={book} size={150} />
        </div>
        <div>
          <h4 style={{ fontFamily:'"Playfair Display", serif', fontSize:'15px', fontWeight:'600', color:'#2C1810', marginBottom:'4px', lineHeight:'1.3', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
            {book.title}
          </h4>
          <p style={{ color:'#8B6914', fontSize:'12px', marginBottom:'8px' }}>{book.author}</p>
          {forSale ? (
            <span style={{ color:'#D4A853', fontWeight:'700', fontSize:'15px', fontFamily:'"Playfair Display", serif' }}>₹{book.sales_price}</span>
          ) : (
            <span style={{ color:'#48BB78', fontWeight:'600', fontSize:'12px' }}>Borrow Only</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const content = useSiteContent();
  const brand = content.brand;
  const home = content.home;
  const newsletter = content.newsletter;
  const images = content.images || {};
  const visibility = content.visibility || {};
  const styles = content.styles || {};
  const layout = content.layout || {};

  // Section order from dashboard. Unknown ids fall to the end.
  const orderArr = (layout.home_section_order || 'hero,genres,staff_picks,new_arrivals,cafe_story,newsletter')
    .split(',').map(s => s.trim()).filter(Boolean);
  const getOrder = (id) => {
    const idx = orderArr.indexOf(id);
    return idx === -1 ? 999 : idx;
  };

  const [featured, setFeatured] = useState(null);     // big hero book
  const [staffPicks, setStaffPicks] = useState([]);    // 4 curated
  const [newArrivals, setNewArrivals] = useState([]);  // 8 latest
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Staff picks come from books the team has explicitly flagged.
      // Fall back to top-rated if nothing is flagged yet.
      const [flaggedRes, newRes] = await Promise.all([
        supabase
          .from('books')
          .select('*')
          .eq('store_visible', true)
          .eq('is_staff_pick', true)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('books')
          .select('*')
          .eq('store_visible', true)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      let picks = flaggedRes.data || [];
      const newest = newRes.data || [];

      // Fallback: if no flagged picks yet, show the top-rated in-stock books
      // so the section isn't empty on first launch.
      if (picks.length === 0) {
        const { data: ratedFallback } = await supabase
          .from('books')
          .select('*')
          .eq('store_visible', true)
          .gt('quantity_available', 0)
          .order('rating', { ascending: false, nullsFirst: false })
          .limit(5);
        picks = ratedFallback || [];
      }

      // Featured book for the hero — first staff pick, fall back to newest.
      setFeatured(picks[0] || newest[0] || null);
      // Curated rail excludes the hero so the same book doesn't render twice.
      setStaffPicks((picks[0] ? picks.slice(1) : picks).slice(0, 4));
      setNewArrivals(newest.filter(b => !picks[0] || b.id !== picks[0].id).slice(0, 8));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) navigate(`/books?search=${encodeURIComponent(searchTerm.trim())}`);
  };

  const handleSubscribe = (e) => {
    e.preventDefault();
    // Placeholder — wire this to a mailing list table or Resend/Mailchimp later.
    if (emailInput.trim()) setSubscribed(true);
  };

  return (
    <div style={{ fontFamily:'var(--tapas-body-font, Lato), sans-serif', background:brand.cream_color, display:'flex', flexDirection:'column' }}>

      {/* ================================================================ */}
      {/* 1. EDITORIAL HERO — headline + search + featured book on the right */}
      {/* ================================================================ */}
      {visibility.home_hero !== false && (
      <section id="section-home-hero" data-editable-section="home" style={{
        order: getOrder('hero'),
        background: images.home_hero_bg_url
          ? `linear-gradient(135deg, ${brand.primary_color}ee 0%, ${brand.primary_color_light}dd 40%, rgba(107,61,38,0.85) 100%), url("${images.home_hero_bg_url}") center/cover`
          : `linear-gradient(135deg, ${brand.primary_color} 0%, ${brand.primary_color_light} 40%, #6B3D26 100%)`,
        color:brand.sand_color, position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', inset:0, pointerEvents:'none',
          backgroundImage:'radial-gradient(circle at 15% 50%, rgba(212,168,83,0.10) 0%, transparent 55%), radial-gradient(circle at 85% 20%, rgba(245,222,179,0.06) 0%, transparent 50%)' }} />
        <div style={{ position:'absolute', right:'-120px', top:'-120px', width:'420px', height:'420px', borderRadius:'50%', background:'rgba(212,168,83,0.06)', border:'1px solid rgba(212,168,83,0.12)' }} />

        <div style={{
          maxWidth:'1200px', margin:'0 auto', padding:'80px 20px 100px',
          position:'relative', zIndex:1,
          display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:'60px', alignItems:'center',
        }} className="hero-grid">
          <div>
            <div data-editable="home.hero_eyebrow" style={{ display:'inline-block', background:'rgba(212,168,83,0.15)', border:'1px solid rgba(212,168,83,0.35)', borderRadius:'20px', padding:'6px 16px', fontSize:'12px', color:brand.accent_color, letterSpacing:'2px', marginBottom:'28px', textTransform:'uppercase', fontWeight:'700' }}>
              📚 {home.hero_eyebrow}
            </div>
            <h1 style={{
              fontFamily:'var(--tapas-heading-font, "Playfair Display"), serif',
              fontSize: `clamp(32px, 6vw, ${styles.home_hero_headline_size || 72}px)`,
              fontWeight:'800', lineHeight:'1.05', marginBottom:'24px', color:brand.sand_color,
              textAlign: styles.home_hero_headline_align || 'left',
            }}>
              <span data-editable="home.hero_headline_line1">{home.hero_headline_line1}</span><br />
              <span data-editable="home.hero_headline_line2" style={{ color:brand.accent_color, fontStyle:'italic' }}>{home.hero_headline_line2}</span>
            </h1>
            <p data-editable="home.hero_description" style={{ fontSize:'18px', lineHeight:'1.7', color:'rgba(245,222,179,0.85)', marginBottom:'36px', maxWidth:'540px' }}>
              {home.hero_description}
            </p>

            <form onSubmit={handleSearch} style={{ display:'flex', gap:'0', marginBottom:'28px', maxWidth:'520px', borderRadius:'50px', overflow:'hidden', boxShadow:'0 10px 30px rgba(0,0,0,0.35)' }}>
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={home.search_placeholder}
                style={{ flex:1, padding:'18px 26px', border:'none', fontSize:'15px', outline:'none', background:'#FFF8ED', color:brand.primary_color, fontFamily:'var(--tapas-body-font, Lato), sans-serif' }}
              />
              <button type="submit" style={{ padding:'18px 30px', background:`linear-gradient(135deg, ${brand.accent_color}, ${brand.accent_color_dark})`, border:'none', color:brand.primary_color, fontWeight:'700', cursor:'pointer', fontSize:'15px', letterSpacing:'0.5px' }}>
                Search
              </button>
            </form>

            <div style={{ display:'flex', gap:'28px', flexWrap:'wrap', alignItems:'center', color:'rgba(245,222,179,0.65)', fontSize:'13px' }}>
              <Link to="/books" style={{ color:'#D4A853', textDecoration:'none', fontWeight:'700', borderBottom:'1px solid #D4A853', paddingBottom:'2px' }}>
                Browse full catalog →
              </Link>
              <span>·</span>
              <Link to="/books?genre=Fiction" style={{ color:'rgba(245,222,179,0.7)', textDecoration:'none' }}>Fiction</Link>
              <Link to="/books?genre=Non-Fiction" style={{ color:'rgba(245,222,179,0.7)', textDecoration:'none' }}>Non-Fiction</Link>
              <Link to="/books?genre=Children" style={{ color:'rgba(245,222,179,0.7)', textDecoration:'none' }}>Children</Link>
            </div>
          </div>

          {/* Featured book card on the right */}
          {featured && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'20px' }}>
              <div style={{ fontSize:'11px', fontWeight:'800', color:'#D4A853', textTransform:'uppercase', letterSpacing:'2.5px' }}>
                ★ This week's pick
              </div>
              <Link to={`/books/${featured.id}`} style={{ textDecoration:'none', color:'inherit' }}>
                <BookCover book={featured} size={230} />
              </Link>
              <div style={{ textAlign:'center', maxWidth:'260px' }}>
                <h3 style={{ fontFamily:'"Playfair Display", serif', fontSize:'20px', fontWeight:'700', color:'#F5DEB3', marginBottom:'4px', lineHeight:'1.25' }}>
                  {featured.title}
                </h3>
                <p style={{ color:'rgba(245,222,179,0.7)', fontSize:'13px', marginBottom:'14px' }}>by {featured.author}</p>
                <Link to={`/books/${featured.id}`} style={{
                  display:'inline-block',
                  background:'linear-gradient(135deg, #D4A853, #C49040)', color:'#2C1810',
                  textDecoration:'none', padding:'10px 24px', borderRadius:'50px',
                  fontWeight:'700', fontSize:'13px', boxShadow:'0 4px 15px rgba(212,168,83,0.4)'
                }}>
                  Read more →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Responsive hero grid breakpoint */}
        <style>{`
          @media (max-width: 860px) {
            .hero-grid { grid-template-columns: 1fr !important; text-align: center; }
            .hero-grid > div:first-child { margin: 0 auto; }
          }
        `}</style>
      </section>
      )}

      {/* ================================================================ */}
      {/* 2. BROWSE BY GENRE — editorial category strip                     */}
      {/* ================================================================ */}
      {visibility.home_genres !== false && (
      <section id="section-home-genres" style={{ order: getOrder('genres'), maxWidth:'1200px', margin:'0 auto', padding:'80px 20px 40px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'32px', flexWrap:'wrap', gap:'12px' }}>
          <h2 style={{ fontFamily:'"Playfair Display", serif', fontSize:'32px', fontWeight:'700', color:'#2C1810', margin:0 }}>
            Browse by genre
          </h2>
          <Link to="/books" style={{ color:'#8B6914', fontSize:'14px', textDecoration:'none', fontWeight:'600', borderBottom:'1px solid #8B6914' }}>
            See every category →
          </Link>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:'16px' }}>
          {GENRES.map(cat => (
            <Link key={cat.label} to={`/books?genre=${encodeURIComponent(cat.label)}`} style={{ textDecoration:'none' }}>
              <div style={{
                background:'white', borderRadius:'10px', padding:'22px 20px',
                borderLeft:`4px solid ${cat.color}`,
                boxShadow:'0 2px 10px rgba(44,24,16,0.06)',
                transition:'all 0.2s', cursor:'pointer', height:'100%',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateX(4px)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(44,24,16,0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform='translateX(0)'; e.currentTarget.style.boxShadow='0 2px 10px rgba(44,24,16,0.06)'; }}
              >
                <div style={{ fontSize:'26px', marginBottom:'8px' }}>{cat.icon}</div>
                <div style={{ fontFamily:'"Playfair Display", serif', fontSize:'17px', fontWeight:'700', color:'#2C1810', marginBottom:'4px' }}>{cat.label}</div>
                <div style={{ color:'#8B6914', fontSize:'13px', lineHeight:'1.5' }}>{cat.blurb}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
      )}

      {/* ================================================================ */}
      {/* 3. STAFF PICKS — curated rail                                     */}
      {/* ================================================================ */}
      {visibility.home_staff_picks !== false && (
      <section id="section-home-staff-picks" data-editable-section="home" style={{ order: getOrder('staff_picks'), background:'#FFF8ED', padding:'80px 20px', borderTop:'1px solid rgba(212,168,83,0.2)', borderBottom:'1px solid rgba(212,168,83,0.2)' }}>
        <div style={{ maxWidth:'1200px', margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:'48px' }}>
            <div data-editable="home.staff_picks_eyebrow" style={{ fontSize:'11px', fontWeight:'800', color:brand.accent_color, textTransform:'uppercase', letterSpacing:'2.5px', marginBottom:'12px' }}>
              {home.staff_picks_eyebrow}
            </div>
            <h2 data-editable="home.staff_picks_title" style={{ fontFamily:'var(--tapas-heading-font, "Playfair Display"), serif', fontSize:'42px', fontWeight:'800', color:brand.primary_color, marginBottom:'12px', lineHeight:'1.1' }}>
              {home.staff_picks_title}
            </h2>
            <p data-editable="home.staff_picks_subtitle" style={{ color:'#8B6914', fontSize:'16px', maxWidth:'560px', margin:'0 auto', lineHeight:'1.6' }}>
              {home.staff_picks_subtitle}
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign:'center', padding:'60px', color:'#8B6914' }}>Loading picks…</div>
          ) : staffPicks.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px', color:'#8B6914' }}>
              Staff picks are on their way. In the meantime,{' '}
              <Link to="/books" style={{ color:'#D4A853', fontWeight:'700' }}>browse the catalog</Link>.
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:'24px' }}>
              {staffPicks.map(book => (
                <StaffPickCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </div>
      </section>
      )}

      {/* ================================================================ */}
      {/* 4. NEW & NOTEWORTHY                                               */}
      {/* ================================================================ */}
      {visibility.home_new_arrivals !== false && (
      <section id="section-home-new-arrivals" style={{ order: getOrder('new_arrivals'), maxWidth:'1200px', margin:'0 auto', padding:'80px 20px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'32px', flexWrap:'wrap', gap:'12px' }}>
          <div>
            <div style={{ fontSize:'11px', fontWeight:'800', color:'#D4A853', textTransform:'uppercase', letterSpacing:'2.5px', marginBottom:'8px' }}>
              Just in
            </div>
            <h2 style={{ fontFamily:'"Playfair Display", serif', fontSize:'32px', fontWeight:'700', color:'#2C1810', margin:0 }}>
              New &amp; noteworthy
            </h2>
          </div>
          <Link to="/books?sort=newest" style={{ color:'#8B6914', fontSize:'14px', textDecoration:'none', fontWeight:'600', borderBottom:'1px solid #8B6914' }}>
            View all new arrivals →
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:'60px', color:'#8B6914' }}>Loading…</div>
        ) : newArrivals.length === 0 ? (
          <div style={{ padding:'40px', color:'#8B6914', textAlign:'center' }}>
            No new arrivals yet. Check back soon.
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'8px' }}>
            {newArrivals.map(book => <GridBookCard key={book.id} book={book} />)}
          </div>
        )}
      </section>
      )}

      {/* ================================================================ */}
      {/* 5. CAFE STORY — editorial block about the reading cafe            */}
      {/* ================================================================ */}
      {visibility.home_cafe_story !== false && (
      <section id="section-home-cafe-story" data-editable-section="home" style={{
        order: getOrder('cafe_story'),
        background: images.cafe_story_bg_url
          ? `linear-gradient(135deg, ${brand.primary_color}ee 0%, ${brand.primary_color_light}dd 100%), url("${images.cafe_story_bg_url}") center/cover`
          : `linear-gradient(135deg, ${brand.primary_color} 0%, ${brand.primary_color_light} 100%)`,
        color:brand.sand_color, padding:'100px 20px'
      }}>
        <div style={{ maxWidth:'980px', margin:'0 auto', textAlign:'center' }}>
          <div style={{ fontSize:'48px', marginBottom:'16px' }}>☕</div>
          <h2 style={{ fontFamily:'var(--tapas-heading-font, "Playfair Display"), serif', fontSize:'clamp(32px, 4.5vw, 48px)', fontWeight:'800', color:brand.sand_color, marginBottom:'24px', lineHeight:'1.15' }}>
            <span data-editable="home.cafe_story_headline_line1">{home.cafe_story_headline_line1}</span><br />
            <span data-editable="home.cafe_story_headline_line2" style={{ color:brand.accent_color, fontStyle:'italic' }}>{home.cafe_story_headline_line2}</span>
          </h2>
          <p data-editable="home.cafe_story_body" style={{ color:'rgba(245,222,179,0.82)', fontSize:'17px', lineHeight:'1.8', maxWidth:'680px', margin:'0 auto 36px' }}>
            {home.cafe_story_body}
          </p>
          <div style={{ display:'flex', gap:'16px', justifyContent:'center', flexWrap:'wrap' }}>
            <Link to="/about" style={{
              background:'linear-gradient(135deg, #D4A853, #C49040)', color:'#2C1810',
              textDecoration:'none', padding:'14px 32px', borderRadius:'50px',
              fontWeight:'700', fontSize:'15px', boxShadow:'0 4px 15px rgba(212,168,83,0.4)'
            }}>
              Our story →
            </Link>
            <Link to="/login?mode=signup" style={{
              border:'2px solid rgba(245,222,179,0.5)', color:'#F5DEB3',
              textDecoration:'none', padding:'14px 32px', borderRadius:'50px',
              fontWeight:'600', fontSize:'15px'
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
      <section id="section-newsletter" data-editable-section="newsletter" style={{ order: getOrder('newsletter'), maxWidth:'1200px', margin:'0 auto', padding:'80px 20px' }}>
        <div style={{
          background:'linear-gradient(135deg, #FFF8ED, #FAEBD7)',
          borderRadius:'20px', padding:'50px 40px', textAlign:'center',
          border:'1px solid rgba(212,168,83,0.3)',
          boxShadow:'0 10px 40px rgba(44,24,16,0.08)'
        }}>
          <div data-editable="newsletter.eyebrow" style={{ fontSize:'40px', marginBottom:'12px' }}>{newsletter.eyebrow}</div>
          <h2 data-editable="newsletter.headline" style={{ fontFamily:'var(--tapas-heading-font, "Playfair Display"), serif', fontSize:'32px', fontWeight:'700', color:brand.primary_color, marginBottom:'10px' }}>
            {newsletter.headline}
          </h2>
          <p data-editable="newsletter.description" style={{ color:'#8B6914', fontSize:'15px', marginBottom:'28px', maxWidth:'480px', margin:'0 auto 28px', lineHeight:'1.6' }}>
            {newsletter.description}
          </p>

          {subscribed ? (
            <div style={{ color:'#276749', fontWeight:'700', fontSize:'15px' }}>
              ✅ You're on the list — check your inbox soon!
            </div>
          ) : (
            <form onSubmit={handleSubscribe} style={{ display:'flex', gap:'10px', maxWidth:'460px', margin:'0 auto', flexWrap:'wrap', justifyContent:'center' }}>
              <input
                type="email" required
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                placeholder="your@email.com"
                style={{ flex:'1 1 240px', padding:'14px 20px', borderRadius:'50px', border:'2px solid #F5DEB3', fontSize:'15px', outline:'none', fontFamily:'Lato, sans-serif', minWidth:0 }}
              />
              <button type="submit" style={{
                padding:'14px 28px', borderRadius:'50px', border:'none',
                background:'linear-gradient(135deg, #2C1810, #4A2C17)', color:'#F5DEB3',
                fontWeight:'700', fontSize:'14px', cursor:'pointer',
                fontFamily:'Lato, sans-serif', letterSpacing:'0.5px'
              }}>
                Subscribe
              </button>
            </form>
          )}
        </div>
      </section>
      )}

    </div>
  );
}
