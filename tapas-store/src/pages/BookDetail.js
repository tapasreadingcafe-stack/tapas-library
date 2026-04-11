import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useApp } from '../App';
import { useCart } from '../context/CartContext';

// =====================================================================
// BookDetail — editorial two-column product page.
// Left: oversized book cover + purchase/borrow/wishlist actions.
// Right: title, author, price, description, meta, reviews.
// Bottom: "You might also like" strip.
// =====================================================================

function StarRating({ rating, interactive, onRate, size = 18 }) {
  const [hover, setHover] = useState(0);
  return (
    <span>
      {[1,2,3,4,5].map(i => (
        <span
          key={i}
          style={{
            color: i <= (hover || rating) ? '#D4A853' : '#E5DCC3',
            fontSize: interactive ? 28 : size,
            cursor: interactive ? 'pointer' : 'default',
            marginRight: '2px',
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
    <Link to={`/books/${book.id}`} style={{ textDecoration:'none', color:'inherit' }}>
      <div style={{ display:'flex', flexDirection:'column', gap:'10px', cursor:'pointer' }}>
        <div style={{
          width:'100%', aspectRatio:'3/4',
          borderRadius:'4px', overflow:'hidden',
          background:'linear-gradient(145deg, #F5DEB3, #D4A853)',
          boxShadow:'0 8px 24px rgba(44,24,16,0.18)',
          display:'flex', alignItems:'center', justifyContent:'center',
          transition:'transform 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          {src
            ? <img src={src} alt={book.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : <span style={{ fontSize:'36px' }}>📖</span>}
        </div>
        <div>
          <h4 style={{ fontFamily:'"Playfair Display", serif', fontSize:'14px', color:'#2C1810', marginBottom:'2px', lineHeight:'1.3', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
            {book.title}
          </h4>
          <p style={{ color:'#8B6914', fontSize:'12px', fontStyle:'italic' }}>{book.author}</p>
        </div>
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', flexDirection:'column', gap:'16px', fontFamily:'Lato, sans-serif' }}>
        <div style={{ fontSize:'48px' }}>📖</div>
        <p style={{ color:'#8B6914' }}>Loading book…</p>
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
    <div style={{ background:'#FDF8F0', fontFamily:'Lato, sans-serif', minHeight:'90vh' }}>
      <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'40px 20px 80px' }}>

        {/* Breadcrumb */}
        <nav style={{ marginBottom:'32px', fontSize:'13px', color:'#8B6914', display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
          <Link to="/" style={{ color:'#8B6914', textDecoration:'none' }}>Home</Link>
          <span>/</span>
          <Link to="/books" style={{ color:'#8B6914', textDecoration:'none' }}>Books</Link>
          {book.genre && <>
            <span>/</span>
            <Link to={`/books?genre=${encodeURIComponent(book.genre)}`} style={{ color:'#8B6914', textDecoration:'none' }}>{book.genre}</Link>
          </>}
          <span>/</span>
          <span style={{ color:'#2C1810', fontWeight:'600' }}>{book.title}</span>
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
              borderRadius:'4px', overflow:'hidden',
              background:'linear-gradient(145deg, #F5DEB3, #D4A853)',
              boxShadow:'0 30px 80px rgba(44,24,16,0.25), 0 0 0 1px rgba(44,24,16,0.05)',
              display:'flex', alignItems:'center', justifyContent:'center',
              marginBottom:'24px',
            }}>
              {src ? (
                <img src={src} alt={book.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              ) : (
                <div style={{ textAlign:'center', padding:'30px' }}>
                  <div style={{ fontSize:'80px', marginBottom:'16px' }}>📖</div>
                  <div style={{ color:'#8B6914', fontSize:'14px', fontWeight:'600', fontFamily:'"Playfair Display", serif' }}>{book.genre || 'Book'}</div>
                </div>
              )}
            </div>

            {/* Stock pill */}
            <div style={{
              textAlign:'center', padding:'10px', borderRadius:'50px', marginBottom:'16px',
              background: inStock ? 'rgba(72,187,120,0.12)' : 'rgba(252,129,129,0.12)',
              border: `1px solid ${inStock ? '#48BB78' : '#FC8181'}`,
              color: inStock ? '#276749' : '#9B2335',
              fontWeight:'700', fontSize:'13px', textTransform:'uppercase', letterSpacing:'0.5px',
            }}>
              {inStock ? `In stock · ${book.quantity_available} available` : 'Currently sold out'}
            </div>

            {/* CTAs */}
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {forSale && inStock && (
                <button onClick={handleAddToCart} style={{
                  padding:'16px', borderRadius:'50px', border:'none', cursor:'pointer',
                  background:'linear-gradient(135deg, #D4A853, #C49040)', color:'#2C1810',
                  fontWeight:'700', fontSize:'15px', fontFamily:'Lato, sans-serif',
                  boxShadow:'0 6px 20px rgba(212,168,83,0.4)',
                  textTransform:'uppercase', letterSpacing:'1px',
                }}>
                  {addedToCart ? '✅ Added to Cart' : '🛒 Add to Cart'}
                </button>
              )}
              {borrowable && (
                <button onClick={handleReserve} disabled={reserving} style={{
                  padding:'16px', borderRadius:'50px', cursor:'pointer',
                  border: forSale ? '2px solid #2C1810' : 'none',
                  background: forSale ? 'transparent' : '#2C1810',
                  color: forSale ? '#2C1810' : '#F5DEB3',
                  fontWeight:'700', fontSize:'14px', fontFamily:'Lato, sans-serif',
                  textTransform:'uppercase', letterSpacing:'1px',
                }}>
                  {reserving ? 'Reserving…' : '🔖 Reserve to Borrow'}
                </button>
              )}
              <button onClick={handleWishlist} disabled={wishlisting} style={{
                padding:'14px', borderRadius:'50px', cursor:'pointer',
                border:'1px solid rgba(212,168,83,0.5)',
                background: inWishlist ? 'rgba(252,129,129,0.08)' : 'transparent',
                color: inWishlist ? '#9B2335' : '#8B6914',
                fontWeight:'600', fontSize:'13px', fontFamily:'Lato, sans-serif',
              }}>
                {wishlisting ? '…' : inWishlist ? '💔 Remove from Wishlist' : '❤️ Save to Wishlist'}
              </button>
            </div>

            {actionMsg && (
              <div style={{
                marginTop:'14px', padding:'12px 14px', borderRadius:'8px',
                background: actionMsg.startsWith('✅') ? 'rgba(72,187,120,0.1)' : 'rgba(252,129,129,0.1)',
                color: actionMsg.startsWith('✅') ? '#276749' : '#9B2335',
                fontSize:'13px', lineHeight:'1.5', textAlign:'center',
              }}>
                {actionMsg}
              </div>
            )}
          </div>

          {/* RIGHT — editorial copy */}
          <div>
            {book.genre && (
              <div style={{ fontSize:'11px', fontWeight:'800', color:'#D4A853', textTransform:'uppercase', letterSpacing:'2.5px', marginBottom:'18px' }}>
                {book.genre}
              </div>
            )}

            <h1 style={{ fontFamily:'"Playfair Display", serif', fontSize:'clamp(32px, 5vw, 56px)', fontWeight:'800', color:'#2C1810', lineHeight:'1.05', marginBottom:'16px' }}>
              {book.title}
            </h1>

            <p style={{ fontSize:'20px', color:'#8B6914', marginBottom:'24px', fontStyle:'italic' }}>
              by <span style={{ fontWeight:'700', color:'#5C3A1E', fontStyle:'normal' }}>{book.author}</span>
            </p>

            {avgRating && (
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'24px' }}>
                <StarRating rating={Math.round(parseFloat(avgRating))} />
                <span style={{ color:'#8B6914', fontSize:'14px' }}>
                  {avgRating} · {reviews.length} review{reviews.length === 1 ? '' : 's'}
                </span>
              </div>
            )}

            {forSale && (
              <div style={{ marginBottom:'32px', paddingBottom:'24px', borderBottom:'1px solid rgba(212,168,83,0.3)' }}>
                <span style={{ fontSize:'44px', fontWeight:'800', color:'#D4A853', fontFamily:'"Playfair Display", serif' }}>
                  ₹{book.sales_price}
                </span>
                {book.mrp && Number(book.mrp) > Number(book.sales_price) && (
                  <>
                    <span style={{ color:'#8B6914', fontSize:'18px', marginLeft:'14px', textDecoration:'line-through' }}>
                      ₹{book.mrp}
                    </span>
                    <span style={{ display:'inline-block', marginLeft:'12px', padding:'4px 12px', background:'rgba(72,187,120,0.15)', color:'#276749', borderRadius:'20px', fontSize:'12px', fontWeight:'700' }}>
                      Save ₹{Number(book.mrp) - Number(book.sales_price)}
                    </span>
                  </>
                )}
                <div style={{ color:'#8B6914', fontSize:'13px', marginTop:'6px' }}>Purchase price</div>
              </div>
            )}

            {/* Staff pick callout */}
            {book.is_staff_pick && book.staff_pick_blurb && (
              <div style={{
                background:'#FFF8ED', borderLeft:'4px solid #D4A853',
                padding:'20px 24px', marginBottom:'28px', borderRadius:'4px',
              }}>
                <div style={{ fontSize:'11px', fontWeight:'800', color:'#D4A853', textTransform:'uppercase', letterSpacing:'2px', marginBottom:'8px' }}>
                  ★ Staff pick
                </div>
                <p style={{ color:'#5C3A1E', fontSize:'15px', lineHeight:'1.7', fontStyle:'italic', margin:0 }}>
                  “{book.staff_pick_blurb}”
                </p>
              </div>
            )}

            {book.description && (
              <div style={{ marginBottom:'36px' }}>
                <h3 style={{ fontFamily:'"Playfair Display", serif', fontSize:'20px', color:'#2C1810', marginBottom:'14px', fontWeight:'700' }}>
                  About this book
                </h3>
                <p style={{ color:'#5C3A1E', lineHeight:'1.9', fontSize:'16px', whiteSpace:'pre-line' }}>
                  {book.description}
                </p>
              </div>
            )}

            {/* Meta footer */}
            <div style={{
              display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px, 1fr))',
              gap:'20px', padding:'20px 0', borderTop:'1px solid rgba(212,168,83,0.3)',
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
                  <div style={{ fontSize:'10px', fontWeight:'800', color:'#8B6914', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:'4px' }}>
                    {d.label}
                  </div>
                  <div style={{ fontSize:'14px', color:'#2C1810', fontWeight:'600' }}>{d.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reviews */}
        {reviews.length > 0 && (
          <section style={{ marginBottom:'80px' }}>
            <h2 style={{ fontFamily:'"Playfair Display", serif', fontSize:'28px', color:'#2C1810', marginBottom:'28px', fontWeight:'700' }}>
              Member reviews
            </h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:'20px' }}>
              {reviews.map(review => (
                <div key={review.id} style={{
                  background:'white', borderRadius:'8px', padding:'24px',
                  boxShadow:'0 2px 10px rgba(44,24,16,0.06)',
                  borderLeft:'3px solid #D4A853',
                }}>
                  <StarRating rating={review.rating || 5} size={14} />
                  {review.review_text && (
                    <p style={{ color:'#5C3A1E', lineHeight:'1.7', fontStyle:'italic', margin:'12px 0', fontSize:'14px' }}>
                      "{review.review_text}"
                    </p>
                  )}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'12px', color:'#8B6914', marginTop:'10px' }}>
                    <span style={{ fontWeight:'700', color:'#2C1810' }}>— {review.members?.name || 'Anonymous'}</span>
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
            <h2 style={{ fontFamily:'"Playfair Display", serif', fontSize:'28px', color:'#2C1810', marginBottom:'28px', fontWeight:'700' }}>
              You might also like
            </h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(170px, 1fr))', gap:'24px' }}>
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
            max-width: 320px;
            margin: 0 auto;
          }
        }
      `}</style>
    </div>
  );
}
