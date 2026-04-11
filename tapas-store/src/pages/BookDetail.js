import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useApp } from '../App';
import { useCart } from '../context/CartContext';

// =====================================================================
// BookDetail — 2025-2026 redesign
// Two-column editorial layout, rounded cards, scale hover on similar
// titles, micro-interactions on action buttons, dark-mode aware.
// =====================================================================

function StarRating({ rating, interactive, onRate, size = 18 }) {
  const [hover, setHover] = useState(0);
  return (
    <span>
      {[1,2,3,4,5].map(i => (
        <span
          key={i}
          style={{
            color: i <= (hover || rating) ? 'var(--brand-accent)' : 'var(--border)',
            fontSize: interactive ? 28 : size,
            cursor: interactive ? 'pointer' : 'default',
            marginRight: '2px',
            transition: 'color 150ms',
          }}
          onMouseEnter={() => interactive && setHover(i)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onRate && onRate(i)}
        >★</span>
      ))}
    </span>
  );
}

function SimilarTile({ book }) {
  const src = book.book_image || book.cover_image;
  return (
    <Link to={`/books/${book.id}`} className="tps-card-interactive" style={{
      textDecoration:'none', color:'inherit',
      display:'flex', flexDirection:'column', gap:'10px',
      cursor:'pointer', padding:'10px', borderRadius:'var(--radius-md)',
    }}>
      <div style={{
        width:'100%', aspectRatio:'3/4',
        borderRadius:'var(--radius-sm)', overflow:'hidden',
        background:'linear-gradient(145deg, #F5DEB3, #D4A853)',
        boxShadow:'0 10px 24px rgba(44,24,16,0.16)',
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        {src
          ? <img src={src} alt={book.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          : <span style={{ fontSize:'36px' }}>📖</span>}
      </div>
      <div>
        <h4 style={{ fontFamily:'var(--font-heading)', fontSize:'14px', color:'var(--text)', marginBottom:'2px', lineHeight:'1.3', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {book.title}
        </h4>
        <p className="tps-subtle" style={{ fontSize:'12px', fontStyle:'italic' }}>{book.author}</p>
      </div>
    </Link>
  );
}

export default function BookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { member } = useApp();
  const { addBook } = useCart();

  const [book, setBook]           = useState(null);
  const [reviews, setReviews]     = useState([]);
  const [similar, setSimilar]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [reserving, setReserving] = useState(false);
  const [wishlisting, setWishlisting] = useState(false);
  const [inWishlist, setInWishlist]   = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    if (id) fetchAll();
    // eslint-disable-next-line
  }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [bookRes, reviewsRes] = await Promise.all([
        supabase.from('books').select('*').eq('id', id).single(),
        supabase.from('reviews').select('*, members(name)').eq('book_id', id).order('created_at', { ascending:false }).limit(10),
      ]);

      if (bookRes.error || !bookRes.data) { navigate('/books'); return; }

      setBook(bookRes.data);
      setReviews(reviewsRes.data || []);

      if (bookRes.data.genre) {
        const { data: simRes } = await supabase
          .from('books')
          .select('*')
          .eq('store_visible', true)
          .ilike('genre', `%${bookRes.data.genre}%`)
          .neq('id', id)
          .limit(5);
        setSimilar(simRes || []);
      }

      if (member) {
        const { data: wl } = await supabase.from('wishlists').select('id').eq('member_id', member.id).eq('book_id', id).maybeSingle();
        setInWishlist(!!wl);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!book) return;
    addBook(book, 1);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2500);
  };

  const handleReserve = async () => {
    if (!member) { navigate('/login'); return; }
    setReserving(true);
    try {
      const { error } = await supabase.from('reservations').insert([{
        member_id: member.id,
        book_id: book.id,
        status: 'pending',
      }]);
      if (error) throw error;
      setActionMsg('✅ Reserved! We\'ll notify you when your copy is ready to pick up.');
    } catch (err) {
      setActionMsg('❌ ' + (err.message || 'Could not reserve this book.'));
    } finally {
      setReserving(false);
    }
  };

  const handleWishlist = async () => {
    if (!member) { navigate('/login'); return; }
    setWishlisting(true);
    try {
      if (inWishlist) {
        await supabase.from('wishlists').delete().eq('member_id', member.id).eq('book_id', id);
        setInWishlist(false);
      } else {
        await supabase.from('wishlists').insert([{ member_id: member.id, book_id: book.id }]);
        setInWishlist(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setWishlisting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'70vh', flexDirection:'column', gap:'16px' }}>
        <div style={{ fontSize:'56px', animation:'tps-bookSpin 1s ease-in-out infinite' }}>📖</div>
        <p className="tps-subtle">Loading book…</p>
      </div>
    );
  }
  if (!book) return null;

  const src       = book.book_image || book.cover_image;
  const inStock   = book.quantity_available > 0;
  const forSale   = Number(book.sales_price || 0) > 0 && book.store_visible !== false;
  const borrowable = book.is_borrowable !== false;
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div style={{ background:'var(--bg)', fontFamily:'var(--font-body)', minHeight:'90vh' }}>
      <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'40px 20px 80px' }}>

        {/* Breadcrumb */}
        <nav style={{ marginBottom:'32px', fontSize:'13px', color:'var(--text-subtle)', display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
          <Link to="/" style={{ color:'var(--text-subtle)', textDecoration:'none' }}>Home</Link>
          <span>/</span>
          <Link to="/books" style={{ color:'var(--text-subtle)', textDecoration:'none' }}>Books</Link>
          {book.genre && <>
            <span>/</span>
            <Link to={`/books?genre=${encodeURIComponent(book.genre)}`} style={{ color:'var(--text-subtle)', textDecoration:'none' }}>{book.genre}</Link>
          </>}
          <span>/</span>
          <span style={{ color:'var(--text)', fontWeight:'600' }}>{book.title}</span>
        </nav>

        {/* Main two-column layout */}
        <div style={{
          display:'grid',
          gridTemplateColumns:'minmax(260px, 380px) 1fr',
          gap:'64px', marginBottom:'80px',
        }} className="detail-grid">

          {/* LEFT — cover + actions */}
          <div style={{ position:'sticky', top:'90px', alignSelf:'start' }}>
            <div style={{
              width:'100%', aspectRatio:'3/4',
              borderRadius:'var(--radius-lg)', overflow:'hidden',
              background:'linear-gradient(145deg, #F5DEB3, #D4A853)',
              boxShadow:'0 30px 70px rgba(15,23,42,0.22), 0 0 0 1px var(--border)',
              display:'flex', alignItems:'center', justifyContent:'center',
              marginBottom:'24px',
            }}>
              {src ? (
                <img src={src} alt={book.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              ) : (
                <div style={{ textAlign:'center', padding:'30px' }}>
                  <div style={{ fontSize:'80px', marginBottom:'16px' }}>📖</div>
                  <div style={{ color:'#8B6914', fontSize:'14px', fontWeight:'600', fontFamily:'var(--font-heading)' }}>{book.genre || 'Book'}</div>
                </div>
              )}
            </div>

            {/* Stock pill */}
            <div className={inStock ? 'tps-badge tps-badge-success' : 'tps-badge tps-badge-danger'} style={{
              display:'flex', justifyContent:'center', width:'100%',
              padding:'10px 16px', fontSize:'12px', marginBottom:'16px',
            }}>
              {inStock ? `In stock · ${book.quantity_available} available` : 'Currently sold out'}
            </div>

            {/* CTAs */}
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {forSale && inStock && (
                <button onClick={handleAddToCart} className="tps-btn tps-btn-primary tps-btn-lg tps-btn-block">
                  {addedToCart ? '✓ Added to Cart' : '🛒 Add to Cart'}
                </button>
              )}
              {borrowable && (
                <button onClick={handleReserve} disabled={reserving} className={forSale ? 'tps-btn tps-btn-secondary tps-btn-lg tps-btn-block' : 'tps-btn tps-btn-primary tps-btn-lg tps-btn-block'}>
                  {reserving ? 'Reserving…' : '🔖 Reserve to Borrow'}
                </button>
              )}
              <button onClick={handleWishlist} disabled={wishlisting} className="tps-btn tps-btn-outline tps-btn-block" style={{
                color: inWishlist ? 'var(--danger)' : 'var(--text-subtle)',
              }}>
                {wishlisting ? '…' : inWishlist ? '💔 Remove from Wishlist' : '❤️ Save to Wishlist'}
              </button>
            </div>

            {actionMsg && (
              <div className={actionMsg.startsWith('✅') ? 'tps-badge tps-badge-success' : 'tps-badge tps-badge-danger'} style={{
                marginTop:'14px', padding:'12px 14px', fontSize:'12px',
                display:'block', width:'100%', textAlign:'center',
                textTransform:'none', letterSpacing:'0', lineHeight:'1.5',
              }}>
                {actionMsg}
              </div>
            )}
          </div>

          {/* RIGHT — editorial copy */}
          <div>
            {book.genre && (
              <div className="tps-eyebrow" style={{ marginBottom:'18px' }}>
                {book.genre}
              </div>
            )}

            <h1 style={{
              fontFamily:'var(--font-heading)',
              fontSize:'clamp(32px, 5vw, 56px)',
              fontWeight:'800',
              color:'var(--text)',
              lineHeight:'1.05',
              marginBottom:'16px',
              letterSpacing:'-0.02em',
            }}>
              {book.title}
            </h1>

            <p style={{ fontSize:'20px', color:'var(--text-subtle)', marginBottom:'24px', fontStyle:'italic' }}>
              by <span style={{ fontWeight:'700', color:'var(--text-muted)', fontStyle:'normal' }}>{book.author}</span>
            </p>

            {avgRating && (
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'24px' }}>
                <StarRating rating={Math.round(parseFloat(avgRating))} />
                <span className="tps-subtle" style={{ fontSize:'14px' }}>
                  {avgRating} · {reviews.length} review{reviews.length === 1 ? '' : 's'}
                </span>
              </div>
            )}

            {forSale && (
              <div style={{ marginBottom:'32px', paddingBottom:'28px', borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:'48px', fontWeight:'800', color:'var(--brand-accent)', fontFamily:'var(--font-heading)' }}>
                  ₹{book.sales_price}
                </span>
                {book.mrp && Number(book.mrp) > Number(book.sales_price) && (
                  <>
                    <span className="tps-subtle" style={{ fontSize:'18px', marginLeft:'14px', textDecoration:'line-through' }}>
                      ₹{book.mrp}
                    </span>
                    <span className="tps-badge tps-badge-success" style={{ marginLeft:'12px' }}>
                      Save ₹{Number(book.mrp) - Number(book.sales_price)}
                    </span>
                  </>
                )}
                <div className="tps-subtle" style={{ fontSize:'13px', marginTop:'8px' }}>Purchase price · In-store pickup</div>
              </div>
            )}

            {/* Staff pick callout */}
            {book.is_staff_pick && book.staff_pick_blurb && (
              <div style={{
                background:'var(--bg-subtle)',
                borderLeft:'4px solid var(--brand-accent)',
                padding:'22px 26px',
                marginBottom:'28px',
                borderRadius:'var(--radius-md)',
              }}>
                <div className="tps-eyebrow" style={{ marginBottom:'10px' }}>
                  ★ Staff pick
                </div>
                <p style={{ color:'var(--text-muted)', fontSize:'15px', lineHeight:'1.7', fontStyle:'italic', margin:0 }}>
                  "{book.staff_pick_blurb}"
                </p>
              </div>
            )}

            {book.description && (
              <div style={{ marginBottom:'36px' }}>
                <h3 className="tps-h4" style={{ marginBottom:'14px' }}>
                  About this book
                </h3>
                <p style={{ color:'var(--text-muted)', lineHeight:'1.9', fontSize:'16px', whiteSpace:'pre-line' }}>
                  {book.description}
                </p>
              </div>
            )}

            {/* Meta footer */}
            <div style={{
              display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))',
              gap:'20px', padding:'24px 0', borderTop:'1px solid var(--border)',
            }}>
              {[
                { label:'ISBN', value: book.isbn || '—' },
                { label:'Publisher', value: book.publisher || '—' },
                { label:'Year', value: book.publication_year || '—' },
                { label:'Language', value: book.language || 'English' },
                { label:'Condition', value: book.condition || '—' },
                { label:'Total copies', value: book.quantity_total || 1 },
              ].map(d => (
                <div key={d.label}>
                  <div style={{ fontSize:'10px', fontWeight:'800', color:'var(--text-subtle)', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:'4px' }}>
                    {d.label}
                  </div>
                  <div style={{ fontSize:'14px', color:'var(--text)', fontWeight:'600' }}>{d.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reviews */}
        {reviews.length > 0 && (
          <section style={{ marginBottom:'80px' }}>
            <h2 className="tps-h3" style={{ marginBottom:'28px' }}>
              Member reviews
            </h2>
            <div className="tps-grid" style={{ gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))' }}>
              {reviews.map(review => (
                <div key={review.id} className="tps-card" style={{
                  padding:'24px',
                  borderLeft:'3px solid var(--brand-accent)',
                }}>
                  <StarRating rating={review.rating || 5} size={14} />
                  {review.review_text && (
                    <p style={{ color:'var(--text-muted)', lineHeight:'1.7', fontStyle:'italic', margin:'12px 0', fontSize:'14px' }}>
                      "{review.review_text}"
                    </p>
                  )}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'12px', color:'var(--text-subtle)', marginTop:'10px' }}>
                    <span style={{ fontWeight:'700', color:'var(--text)' }}>— {review.members?.name || 'Anonymous'}</span>
                    <span>{review.created_at ? new Date(review.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Similar books */}
        {similar.length > 0 && (
          <section>
            <h2 className="tps-h3" style={{ marginBottom:'28px' }}>
              You might also like
            </h2>
            <div className="tps-grid" style={{ gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:'20px' }}>
              {similar.map(b => <SimilarTile key={b.id} book={b} />)}
            </div>
          </section>
        )}
      </div>

      <style>{`
        @media (max-width: 820px) {
          .detail-grid {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
          .detail-grid > div:first-child {
            position: static !important;
            max-width: 340px;
            margin: 0 auto;
          }
        }
      `}</style>
    </div>
  );
}
