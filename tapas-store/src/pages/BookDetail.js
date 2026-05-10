import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useApp } from '../App';
import { useCart } from '../context/CartContext';
import { BlockSlot } from '../blocks/PageRenderer';

const PINK = '#E0004F';
const PINK_DARK = '#B8003F';
const GREEN = '#1f9d55';
const INK = '#1a1a1a';

const CSS = `
  .bd-root { background: #F6F8F7; color: ${INK}; font-family: 'Poppins', system-ui, sans-serif; }

  .bd-crumb {
    background: #f3f3f4;
    padding: 16px 0;
    font-size: 13px;
  }
  .bd-crumb-wrap {
    max-width: 1320px;
    margin: 0 auto;
    padding: 0 64px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .bd-crumb-wrap a { color: ${INK}; text-decoration: none; }
  .bd-crumb-wrap a:hover { color: #6e6e6e; }
  .bd-crumb-sep { color: #6e6e6e; }
  .bd-crumb-current { font-weight: 500; }

  .bd-main {
    max-width: 1320px;
    margin: 0 auto;
    padding: 56px 64px 80px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
    align-items: start;
  }
  .bd-cover {
    width: 100%;
    aspect-ratio: 3 / 4;
    border-radius: 12px;
    overflow: hidden;
    background: #f5f5f5;
    display: grid;
    place-items: center;
  }
  .bd-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .bd-cover-placeholder { font-size: 64px; opacity: 0.4; }

  .bd-info-title-row {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    margin-bottom: 18px;
  }
  .bd-title {
    margin: 0;
    font-weight: 600;
    font-size: clamp(26px, 2.6vw, 36px);
    line-height: 1.15;
    letter-spacing: -0.01em;
    color: ${INK};
  }
  .bd-stock {
    background: #d8f3df;
    color: #137a3e;
    border-radius: 4px;
    padding: 4px 10px;
    font-size: 12px;
    font-weight: 600;
  }
  .bd-stock.out { background: #ffe1e3; color: #b80042; }

  .bd-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    font-size: 14px;
    color: ${INK};
    margin-bottom: 18px;
  }
  .bd-meta-dot { width: 4px; height: 4px; border-radius: 50%; background: #b0b0b0; }
  .bd-stars { color: #f0a020; letter-spacing: 1px; font-size: 14px; }
  .bd-meta-label { color: #6e6e6e; font-weight: 500; }

  .bd-price-row {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    margin-bottom: 22px;
  }
  .bd-price-old { color: #9a9a9a; text-decoration: line-through; font-size: 18px; }
  .bd-price-new { color: ${GREEN}; font-weight: 700; font-size: 26px; letter-spacing: -0.01em; }
  .bd-discount {
    background: #d8f3df;
    color: #137a3e;
    border-radius: 999px;
    padding: 4px 10px;
    font-size: 12px;
    font-weight: 600;
  }

  .bd-divider { height: 1px; background: #ececea; margin: 22px 0; }

  .bd-desc {
    font-size: 14px;
    line-height: 1.65;
    color: #2a2a2a;
    margin: 0 0 22px;
  }

  .bd-share {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 22px;
  }
  .bd-share-label { font-size: 14px; color: ${INK}; }
  .bd-share-list { display: flex; gap: 10px; }
  .bd-share-btn {
    width: 34px; height: 34px;
    border-radius: 999px;
    border: 0;
    background: #efeff1;
    color: #6e6e6e;
    display: inline-grid;
    place-items: center;
    cursor: pointer;
    transition: background 150ms, color 150ms, transform 150ms;
  }
  .bd-share-btn:hover { transform: translateY(-1px); }
  .bd-share-btn.fb { background: ${PINK}; color: #fff; }
  .bd-share-btn svg { width: 14px; height: 14px; }

  .bd-actions {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }
  .bd-qty {
    display: inline-flex;
    align-items: center;
    border: 1px solid #d6d6d6;
    border-radius: 999px;
    padding: 4px;
  }
  .bd-qty button {
    width: 32px; height: 32px;
    border: 0; background: transparent;
    color: ${INK};
    font-size: 18px; line-height: 1;
    cursor: pointer; border-radius: 999px;
    display: grid; place-items: center;
  }
  .bd-qty button:hover { background: #f3f3f4; }
  .bd-qty input {
    width: 40px;
    border: 0; outline: none;
    text-align: center;
    font-family: inherit;
    font-size: 14px;
    background: transparent;
    color: ${INK};
  }
  .bd-add {
    flex: 1 1 auto;
    background: ${PINK};
    color: #fff;
    border: 0;
    border-radius: 999px;
    padding: 14px 32px;
    font-family: inherit;
    font-weight: 600;
    font-size: 15px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-width: 240px;
    transition: background 150ms, transform 150ms;
  }
  .bd-add:hover { background: ${PINK_DARK}; transform: translateY(-1px); }
  .bd-add:disabled { background: #c0c0c0; cursor: not-allowed; transform: none; }
  .bd-wish {
    width: 48px; height: 48px;
    border-radius: 999px;
    border: 0;
    background: #fde0e8;
    color: ${PINK};
    cursor: pointer;
    display: grid; place-items: center;
    transition: background 150ms, transform 150ms;
  }
  .bd-wish:hover { background: #fbcad8; transform: translateY(-1px); }
  .bd-wish.is-active { background: ${PINK}; color: #fff; }

  .bd-category {
    margin-top: 24px;
    font-size: 14px;
    color: ${INK};
  }
  .bd-category-label { color: #6e6e6e; margin-right: 6px; }

  .bd-msg {
    margin-top: 12px;
    font-size: 13px;
    color: ${GREEN};
  }

  .bd-similar {
    max-width: 1320px;
    margin: 0 auto;
    padding: 0 64px 80px;
  }
  .bd-similar h3 {
    margin: 0 0 28px;
    font-weight: 600;
    font-size: 22px;
    color: ${INK};
  }
  .bd-similar-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
  }
  .bd-similar-card {
    text-decoration: none;
    color: inherit;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .bd-similar-cover {
    width: 100%;
    aspect-ratio: 3 / 4;
    border-radius: 8px;
    overflow: hidden;
    background: #f5f5f5;
    display: grid; place-items: center;
    transition: transform 200ms;
  }
  .bd-similar-card:hover .bd-similar-cover { transform: translateY(-2px); }
  .bd-similar-cover img { width: 100%; height: 100%; object-fit: cover; }
  .bd-similar-title {
    font-size: 14px;
    font-weight: 500;
    color: ${INK};
    margin: 0;
    line-height: 1.4;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .bd-similar-price {
    font-size: 12px;
    color: #6e6e6e;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  @media (max-width: 1023px) {
    .bd-crumb-wrap, .bd-main, .bd-similar { padding-left: 40px; padding-right: 40px; }
    .bd-main { gap: 48px; padding-top: 40px; padding-bottom: 64px; }
    .bd-similar-grid { grid-template-columns: repeat(2, 1fr); gap: 20px; }
  }
  @media (max-width: 767px) {
    .bd-crumb-wrap, .bd-main, .bd-similar { padding-left: 20px; padding-right: 20px; }
    .bd-main { grid-template-columns: 1fr; gap: 32px; padding-top: 28px; }
    .bd-add { width: 100%; min-width: 0; }
  }
`;

function StarRow({ rating }) {
  const r = Math.round(rating || 0);
  return (
    <span className="bd-stars" aria-label={`${r} of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (i < r ? '★' : '☆')).join('')}
    </span>
  );
}

function FbIcon() { return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 22v-8h2.7l.4-3.1h-3.1V8.9c0-.9.25-1.5 1.55-1.5H17V4.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.45-4 4.1v2.3H8v3.1h2.6V22h2.9z"/></svg>; }
function TwIcon() { return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 5.8c-.7.3-1.5.6-2.3.7.8-.5 1.5-1.3 1.8-2.2-.8.5-1.7.8-2.6 1-1.5-1.6-4-1.7-5.6-.2-1 1-1.5 2.5-1.2 3.9C8.8 8.8 5.8 7.2 3.8 4.7c-1 1.7-.5 4 1.2 5.1-.6 0-1.3-.2-1.9-.5 0 1.8 1.3 3.4 3 3.8-.6.2-1.2.2-1.8.1.5 1.6 2 2.7 3.7 2.7-1.6 1.2-3.6 1.8-5.5 1.6 1.8 1.2 3.9 1.8 6 1.8 7.2 0 11.2-6 11.2-11.2v-.5c.8-.5 1.4-1.2 1.9-2.0z"/></svg>; }
function PinIcon() { return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 4 5.7 4 8.7c0 1.8.7 3.4 2.2 4 .2.1.4 0 .5-.2 0-.2.2-.7.2-.9.1-.3.1-.4-.1-.7-.5-.6-.8-1.4-.8-2.5C5.9 6 7.7 4 11.2 4c2.7 0 4.4 1.6 4.4 3.9 0 2.9-1.3 5.4-3.2 5.4-1.1 0-1.9-.9-1.6-2 .3-1.3.9-2.7.9-3.7 0-.8-.5-1.5-1.4-1.5-1.1 0-2 1.1-2 2.7 0 1 .3 1.6.3 1.6L7.3 16c-.4 1.5-.1 3.4-.1 3.6 0 .1.1.1.2.1.1-.1 1.3-1.6 1.7-3.1.1-.4.7-2.7.7-2.7.3.6 1.3 1.2 2.4 1.2 3.1 0 5.3-2.9 5.3-6.7C17.4 4.6 14.8 2 12 2z"/></svg>; }
function IgIcon() { return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.4c2.5 0 2.8 0 3.7.05 1.7.08 2.5.9 2.6 2.6.05.95.05 1.2.05 3.7s0 2.8-.05 3.7c-.08 1.7-.9 2.5-2.6 2.6-.95.05-1.2.05-3.7.05s-2.8 0-3.7-.05c-1.7-.08-2.5-.9-2.6-2.6C5.6 14.8 5.6 14.5 5.6 12s0-2.8.05-3.7c.08-1.7.9-2.5 2.6-2.6.95-.05 1.2-.05 3.75-.05M12 2.5c-2.6 0-2.9 0-3.9.06-2.4.1-3.7 1.4-3.8 3.8C4.25 7.4 4.2 7.7 4.2 12s.05 4.6.1 5.6c.1 2.4 1.4 3.7 3.8 3.8 1 .06 1.3.06 3.9.06s2.9 0 3.9-.06c2.4-.1 3.7-1.4 3.8-3.8.06-1 .06-1.3.06-5.6s0-4.6-.06-5.6c-.1-2.4-1.4-3.7-3.8-3.8-1-.06-1.3-.06-3.9-.06zm0 4.6c-2.7 0-4.9 2.2-4.9 4.9s2.2 4.9 4.9 4.9 4.9-2.2 4.9-4.9-2.2-4.9-4.9-4.9zm0 8.1c-1.75 0-3.2-1.45-3.2-3.2s1.45-3.2 3.2-3.2 3.2 1.45 3.2 3.2-1.45 3.2-3.2 3.2zm5.1-9.5c-.6 0-1.15.5-1.15 1.15s.5 1.15 1.15 1.15c.65 0 1.15-.5 1.15-1.15s-.5-1.15-1.15-1.15z"/></svg>; }
function CartIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 6h15l-1.5 9H7L5 6zM5 6L4 3H2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="19" r="1.5" fill="currentColor"/><circle cx="17" cy="19" r="1.5" fill="currentColor"/></svg>; }
function HeartIcon({ filled }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} aria-hidden="true">
      <path d="M12 20.5s-7.5-4.6-7.5-10.2C4.5 7.4 6.6 5.5 9 5.5c1.4 0 2.7.7 3 1.7.3-1 1.6-1.7 3-1.7 2.4 0 4.5 1.9 4.5 4.8 0 5.6-7.5 10.2-7.5 10.2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
    </svg>
  );
}
function MinusIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>; }
function PlusIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>; }

function SimilarTile({ book }) {
  const src = book.book_image || book.cover_image;
  const price = book.sales_price ? `RS. ${Number(book.sales_price).toFixed(2)}` : null;
  return (
    <Link to={`/books/${book.id}`} className="bd-similar-card">
      <div className="bd-similar-cover">
        {src ? <img src={src} alt={book.title} /> : <span style={{ fontSize: 36, opacity: 0.4 }}>📖</span>}
      </div>
      <div>
        <p className="bd-similar-title">{book.title}</p>
        {price && <p className="bd-similar-price">{price}</p>}
      </div>
    </Link>
  );
}

export default function BookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { member } = useApp();
  const { addBook } = useCart();

  const [book, setBook] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlisting, setWishlisting] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (id) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          .limit(4);
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
    addBook(book, qty);
    setActionMsg(`Added ${qty} to cart.`);
    setTimeout(() => setActionMsg(''), 2200);
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
      <div className="bd-root" style={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}>
        <style>{CSS}</style>
        <p style={{ color: '#6e6e6e' }}>Loading book…</p>
      </div>
    );
  }
  if (!book) return null;

  const src = book.book_image || book.cover_image;
  const inStock = book.quantity_available > 0;
  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length
    : 0;
  const sale = Number(book.sales_price || 0);
  const list = Number(book.list_price || book.price || 0);
  const showOld = list > sale && sale > 0;
  const discount = showOld ? Math.round(((list - sale) / list) * 100) : 0;
  const isbn = book.isbn || book.isbn_13 || book.barcode || '—';

  return (
    <div className="bd-root">
      <style>{CSS}</style>
      <BlockSlot pageKey="book_detail" slot="above_blocks" />

      <nav className="bd-crumb" aria-label="Breadcrumb">
        <div className="bd-crumb-wrap">
          <Link to="/">Home</Link>
          <span className="bd-crumb-sep">›</span>
          <Link to="/shop">Shop</Link>
          <span className="bd-crumb-sep">›</span>
          <span className="bd-crumb-current" title={book.title}>{book.title}</span>
        </div>
      </nav>

      <div className="bd-main">
        <div className="bd-cover">
          {src ? <img src={src} alt={book.title} /> : <span className="bd-cover-placeholder">📖</span>}
        </div>

        <div className="bd-info">
          <div className="bd-info-title-row">
            <h1 className="bd-title">{book.title}</h1>
            <span className={`bd-stock${inStock ? '' : ' out'}`}>{inStock ? 'In Stock' : 'Out of Stock'}</span>
          </div>

          <div className="bd-meta">
            <StarRow rating={avgRating} />
            <span>{reviews.length} Review{reviews.length === 1 ? '' : 's'}</span>
            <span className="bd-meta-dot" aria-hidden="true" />
            <span className="bd-meta-label">ISBN</span>
            <span>{isbn}</span>
          </div>

          <div className="bd-price-row">
            {showOld && <span className="bd-price-old">${list.toFixed(2)}</span>}
            <span className="bd-price-new">${sale.toFixed(2)}</span>
            {showOld && <span className="bd-discount">{discount}% Off</span>}
          </div>

          <div className="bd-divider" />

          {book.description && <p className="bd-desc">{book.description}</p>}

          <div className="bd-share">
            <span className="bd-share-label">Share item:</span>
            <div className="bd-share-list">
              <button type="button" className="bd-share-btn fb" aria-label="Share on Facebook"><FbIcon /></button>
              <button type="button" className="bd-share-btn" aria-label="Share on Twitter"><TwIcon /></button>
              <button type="button" className="bd-share-btn" aria-label="Save on Pinterest"><PinIcon /></button>
              <button type="button" className="bd-share-btn" aria-label="Share on Instagram"><IgIcon /></button>
            </div>
          </div>

          <div className="bd-actions">
            <div className="bd-qty">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity"><MinusIcon /></button>
              <input type="number" min="1" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} aria-label="Quantity" />
              <button type="button" onClick={() => setQty((q) => q + 1)} aria-label="Increase quantity"><PlusIcon /></button>
            </div>
            <button
              type="button"
              className="bd-add"
              onClick={handleAddToCart}
              disabled={!inStock}
            >
              Add to Cart <CartIcon />
            </button>
            <button
              type="button"
              className={`bd-wish${inWishlist ? ' is-active' : ''}`}
              onClick={handleWishlist}
              disabled={wishlisting}
              aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <HeartIcon filled={inWishlist} />
            </button>
          </div>

          {actionMsg && <div className="bd-msg" role="status">{actionMsg}</div>}

          <div className="bd-category">
            <span className="bd-category-label">Category:</span>
            {book.genre || 'Fiction'}
          </div>
        </div>
      </div>

      {similar.length > 0 && (
        <section className="bd-similar">
          <h3>You may also like</h3>
          <div className="bd-similar-grid">
            {similar.slice(0, 4).map((b) => <SimilarTile key={b.id} book={b} />)}
          </div>
        </section>
      )}

      <BlockSlot pageKey="book_detail" slot="below_blocks" />
    </div>
  );
}
