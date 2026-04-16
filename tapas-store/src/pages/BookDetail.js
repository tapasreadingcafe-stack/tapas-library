import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useApp } from '../App';
import { useCart } from '../context/CartContext';
import ReviewForm from '../components/ReviewForm';

// =====================================================================
// BookDetail — Modern Heritage design system
// Parchment bg, Newsreader headings, ambient shadows, teal CTAs,
// gold accent prices, no hard borders, extreme white space.
// =====================================================================

function StarRating({ rating, interactive, onRate, size = 18 }) {
  const [hover, setHover] = useState(0);
  return (
    <span>
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          style={{
            color: i <= (hover || rating) ? 'var(--accent)' : 'var(--bg-card)',
            fontSize: interactive ? 28 : size,
            cursor: interactive ? 'pointer' : 'default',
            marginRight: '2px',
            transition: 'color 150ms',
          }}
          onMouseEnter={() => interactive && setHover(i)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onRate && onRate(i)}
        >\u2605</span>
      ))}
    </span>
  );
}

function SimilarTile({ book }) {
  const src = book.book_image || book.cover_image;
  return (
    <Link to={`/books/${book.id}`} className="tps-card tps-card-interactive" style={{
      textDecoration: 'none', color: 'inherit',
      display: 'flex', flexDirection: 'column', gap: '12px',
      cursor: 'pointer', padding: '16px', borderRadius: 'var(--radius-lg)',
      background: 'var(--bg-card)', border: 'none',
      boxShadow: 'var(--shadow-ambient)',
    }}>
      <div style={{
        width: '100%', aspectRatio: '3/4',
        borderRadius: 'var(--radius-md)', overflow: 'hidden',
        background: 'linear-gradient(160deg, #ede8d0, #d4c9a8)',
        boxShadow: '0 16px 48px rgba(38,23,12,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {src
          ? <img src={src} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: '36px' }}>📖</span>}
      </div>
      <div>
        <h4 style={{
          fontFamily: 'var(--font-display)', fontSize: '14px', color: 'var(--text)',
          marginBottom: '4px', lineHeight: 1.3, fontWeight: '600',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {book.title}
        </h4>
        <p style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', margin: 0 }}>
          {book.author}
        </p>
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
        supabase.from('reviews').select('*, members(name)').eq('book_id', id).order('created_at', { ascending: false }).limit(10),
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
      setActionMsg('Reserved! We\'ll notify you when your copy is ready to pick up.');
    } catch (err) {
      setActionMsg(err.message || 'Could not reserve this book.');
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

  /* Loading state */
  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '70vh', flexDirection: 'column', gap: '16px',
        background: 'var(--bg)', fontFamily: 'var(--font-body)',
      }}>
        <div className="tps-skeleton" style={{ width: '240px', height: '320px', borderRadius: 'var(--radius-xl)' }} />
        <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>Loading book\u2026</p>
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
    <div style={{ background: 'var(--bg)', fontFamily: 'var(--font-body)', minHeight: '90vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px 96px' }}>

        {/* Breadcrumb */}
        <nav style={{
          marginBottom: '48px', fontSize: '13px', color: 'var(--text-subtle)',
          display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap',
          fontFamily: 'var(--font-body)',
        }}>
          <Link to="/" style={{ color: 'var(--text-subtle)', textDecoration: 'none' }}>Home</Link>
          <span style={{ color: 'var(--text-subtle)' }}>/</span>
          <Link to="/books" style={{ color: 'var(--text-subtle)', textDecoration: 'none' }}>Books</Link>
          {book.genre && <>
            <span style={{ color: 'var(--text-subtle)' }}>/</span>
            <Link to={`/books?genre=${encodeURIComponent(book.genre)}`} style={{ color: 'var(--text-subtle)', textDecoration: 'none' }}>{book.genre}</Link>
          </>}
          <span style={{ color: 'var(--text-subtle)' }}>/</span>
          <span style={{ color: 'var(--text)', fontWeight: '600' }}>{book.title}</span>
        </nav>

        {/* Main two-column layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 400px) 1fr',
          gap: '72px', marginBottom: '96px',
        }} className="detail-grid">

          {/* LEFT — cover + actions */}
          <div style={{ position: 'sticky', top: '96px', alignSelf: 'start' }}>
            {/* Cover */}
            <div style={{
              width: '100%', aspectRatio: '3/4',
              borderRadius: 'var(--radius-xl)', overflow: 'hidden',
              background: 'linear-gradient(160deg, #ede8d0, #d4c9a8)',
              boxShadow: '0 30px 70px rgba(38,23,12,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '28px',
            }}>
              {src ? (
                <img src={src} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ textAlign: 'center', padding: '30px' }}>
                  <div style={{ fontSize: '80px', marginBottom: '16px' }}>📖</div>
                  <div style={{
                    color: 'var(--text-subtle)', fontSize: '14px', fontWeight: '600',
                    fontFamily: 'var(--font-display)',
                  }}>
                    {book.genre || 'Book'}
                  </div>
                </div>
              )}
            </div>

            {/* Stock chip */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <span className={inStock ? 'tps-chip tps-chip-teal' : 'tps-chip'} style={{
                padding: '8px 20px', fontSize: '12px', fontWeight: '700',
                fontFamily: 'var(--font-body)',
                ...(!inStock ? { background: '#d44', color: '#fff' } : {}),
              }}>
                {inStock ? `In stock \u00b7 ${book.quantity_available} available` : 'Currently sold out'}
              </span>
            </div>

            {/* CTAs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {forSale && inStock && (
                <button onClick={handleAddToCart} className="tps-btn tps-btn-teal tps-btn-lg tps-btn-block" style={{
                  fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: '700',
                }}>
                  {addedToCart ? '\u2713 Added to Cart' : 'Add to Cart'}
                </button>
              )}
              {borrowable && (
                <button onClick={handleReserve} disabled={reserving} className="tps-btn tps-btn-primary tps-btn-lg tps-btn-block" style={{
                  fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: '700',
                }}>
                  {reserving ? 'Reserving\u2026' : 'Reserve to Borrow'}
                </button>
              )}
              <button onClick={handleWishlist} disabled={wishlisting} className="tps-btn tps-btn-ghost tps-btn-block" style={{
                fontFamily: 'var(--font-body)', fontSize: '14px',
                color: inWishlist ? '#c44' : 'var(--text-muted)',
              }}>
                {wishlisting ? '\u2026' : inWishlist ? 'Remove from Wishlist' : 'Save to Wishlist'}
              </button>
            </div>

            {actionMsg && (
              <div style={{
                marginTop: '16px', padding: '14px 18px', fontSize: '13px',
                background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
                color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5,
                fontFamily: 'var(--font-body)',
              }}>
                {actionMsg}
              </div>
            )}
          </div>

          {/* RIGHT — editorial copy */}
          <div>
            {/* Genre eyebrow */}
            {book.genre && (
              <div style={{
                marginBottom: '20px', fontFamily: 'var(--font-body)',
                fontSize: '12px', fontWeight: '700', textTransform: 'uppercase',
                letterSpacing: '2.5px', color: 'var(--text-subtle)',
              }}>
                {book.genre}
              </div>
            )}

            {/* Title */}
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(32px, 5vw, 56px)',
              fontWeight: '700',
              color: 'var(--text)',
              lineHeight: 1.05,
              marginBottom: '16px',
              letterSpacing: '-0.02em',
            }}>
              {book.title}
            </h1>

            {/* Author */}
            <p style={{
              fontSize: '20px', color: 'var(--text-subtle)', marginBottom: '28px',
              fontStyle: 'italic', fontFamily: 'var(--font-body)',
            }}>
              by <span style={{ fontWeight: '700', color: 'var(--text-muted)', fontStyle: 'normal' }}>{book.author}</span>
            </p>

            {/* Rating */}
            {avgRating && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
                <StarRating rating={Math.round(parseFloat(avgRating))} />
                <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                  {avgRating} \u00b7 {reviews.length} review{reviews.length === 1 ? '' : 's'}
                </span>
              </div>
            )}

            {/* Price */}
            {forSale && (
              <div style={{ marginBottom: '40px', paddingBottom: '32px' }}>
                <span style={{
                  fontSize: '48px', fontWeight: '700', color: 'var(--accent)',
                  fontFamily: 'var(--font-display)',
                }}>
                  \u20b9{book.sales_price}
                </span>
                {book.mrp && Number(book.mrp) > Number(book.sales_price) && (
                  <>
                    <span style={{
                      fontSize: '18px', marginLeft: '14px', textDecoration: 'line-through',
                      color: 'var(--text-subtle)',
                    }}>
                      \u20b9{book.mrp}
                    </span>
                    <span className="tps-chip tps-chip-teal" style={{ marginLeft: '12px', fontSize: '11px' }}>
                      Save \u20b9{Number(book.mrp) - Number(book.sales_price)}
                    </span>
                  </>
                )}
                <div style={{
                  fontSize: '13px', marginTop: '10px', color: 'var(--text-subtle)',
                  fontFamily: 'var(--font-body)',
                }}>
                  Purchase price \u00b7 In-store pickup
                </div>
              </div>
            )}

            {/* Staff pick callout */}
            {book.is_staff_pick && book.staff_pick_blurb && (
              <div style={{
                background: 'var(--bg-card)',
                borderLeft: '4px solid var(--secondary)',
                padding: '24px 28px',
                marginBottom: '36px',
                borderRadius: 'var(--radius-md)',
              }}>
                <div style={{
                  fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: '700',
                  textTransform: 'uppercase', letterSpacing: '2px',
                  color: 'var(--secondary)', marginBottom: '10px',
                }}>
                  Staff pick
                </div>
                <p style={{
                  color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.8,
                  fontStyle: 'italic', margin: 0, fontFamily: 'var(--font-display)',
                }}>
                  "{book.staff_pick_blurb}"
                </p>
              </div>
            )}

            {/* Description */}
            {book.description && (
              <div style={{ marginBottom: '48px' }}>
                <h3 style={{
                  fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '600',
                  color: 'var(--text)', marginBottom: '16px',
                }}>
                  About this book
                </h3>
                <p style={{
                  color: 'var(--text-muted)', lineHeight: 1.9, fontSize: '16px',
                  whiteSpace: 'pre-line', fontFamily: 'var(--font-body)',
                }}>
                  {book.description}
                </p>
              </div>
            )}

            {/* Meta grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '24px',
              background: 'var(--bg-section)', borderRadius: 'var(--radius-lg)',
              padding: '28px 24px',
            }}>
              {[
                { label: 'ISBN',       value: book.isbn || '\u2014' },
                { label: 'Publisher',   value: book.publisher || '\u2014' },
                { label: 'Year',        value: book.publication_year || '\u2014' },
                { label: 'Language',    value: book.language || 'English' },
                { label: 'Condition',   value: book.condition || '\u2014' },
                { label: 'Total copies', value: book.quantity_total || 1 },
              ].map(d => (
                <div key={d.label}>
                  <div style={{
                    fontSize: '12px', fontWeight: '600', color: 'var(--text-subtle)',
                    fontFamily: 'var(--font-display)', fontStyle: 'italic',
                    marginBottom: '6px',
                  }}>
                    {d.label}
                  </div>
                  <div style={{
                    fontSize: '15px', color: 'var(--text)', fontWeight: '600',
                    fontFamily: 'var(--font-body)',
                  }}>
                    {d.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reviews */}
        <section style={{ marginBottom: '96px' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: '700',
            color: 'var(--text)', marginBottom: '24px',
          }}>
            Member reviews
          </h2>

          {/* AI review digest (cached) */}
          {book.review_summary && reviews.length >= 5 && (
            <div style={{
              padding: '24px 28px',
              marginBottom: '28px',
              background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-section) 100%)',
              borderRadius: 'var(--radius-lg)',
              borderLeft: '4px solid var(--accent)',
            }}>
              <div style={{
                fontSize: '11px', fontWeight: 700, letterSpacing: '2px',
                textTransform: 'uppercase', color: 'var(--accent)',
                marginBottom: '10px',
              }}>
                ✨ What readers are saying
              </div>
              <p style={{
                color: 'var(--text-muted)', lineHeight: 1.8, fontSize: '15px',
                margin: 0, fontStyle: 'italic', fontFamily: 'var(--font-display)',
                whiteSpace: 'pre-line',
              }}>
                {book.review_summary}
              </p>
            </div>
          )}

          {/* Write-a-review widget */}
          <ReviewForm
            bookId={book.id}
            member={member}
            onReviewSaved={(r) => {
              setReviews(prev => {
                const without = prev.filter(p => p.id !== r.id);
                return [r, ...without].slice(0, 10);
              });
            }}
          />

          {reviews.length === 0 ? (
            <div style={{
              padding: '40px', textAlign: 'center', color: 'var(--text-subtle)',
              fontSize: '14px', background: 'var(--bg-section)',
              borderRadius: 'var(--radius-md)',
            }}>
              No reviews yet — be the first.
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '24px',
            }}>
              {reviews.map(review => (
                <div key={review.id} className="tps-card" style={{
                  padding: '28px',
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-md)',
                  borderLeft: '3px solid var(--secondary)',
                  boxShadow: 'var(--shadow-ambient)',
                }}>
                  <StarRating rating={review.rating || 5} size={14} />
                  {review.review_text && (
                    <p style={{
                      color: 'var(--text-muted)', lineHeight: 1.8, fontStyle: 'italic',
                      margin: '14px 0', fontSize: '14px', fontFamily: 'var(--font-body)',
                    }}>
                      "{review.review_text}"
                    </p>
                  )}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: '12px', color: 'var(--text-subtle)', marginTop: '12px',
                    fontFamily: 'var(--font-body)',
                  }}>
                    <span style={{ fontWeight: '700', color: 'var(--text)' }}>
                      \u2014 {review.members?.name || 'Anonymous'}
                    </span>
                    <span>{review.created_at ? new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Similar books */}
        {similar.length > 0 && (
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: '700',
              color: 'var(--text)', marginBottom: '36px',
            }}>
              You might also like
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '24px',
            }}>
              {similar.map(b => <SimilarTile key={b.id} book={b} />)}
            </div>
          </section>
        )}
      </div>

      <style>{`
        @media (max-width: 820px) {
          .detail-grid {
            grid-template-columns: 1fr !important;
            gap: 48px !important;
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
