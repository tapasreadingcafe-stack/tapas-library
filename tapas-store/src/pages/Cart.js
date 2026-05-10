import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageBreadcrumb from '../components/PageBreadcrumb';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useShopBooks } from '../cms/hooks';
import { adaptShopBooks } from '../cms/adapters';
import { supabase } from '../utils/supabase';

const PINK = '#E0004F';
const PINK_DARK = '#B8003F';
const INK = '#1a1a1a';

const CSS = `
  .cart-page {
    background: #F6F8F7;
    font-family: 'Poppins', system-ui, sans-serif;
    color: ${INK};
  }
  .cart-wrap {
    max-width: 1280px;
    margin: 0 auto;
    padding: 24px 64px 96px;
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 56px;
    align-items: start;
  }

  .cart-empty {
    text-align: center;
    padding: 80px 24px;
    background: #fafafa;
    border-radius: 16px;
    color: #6e6e6e;
  }
  .cart-empty h2 { margin: 0 0 12px; font-size: 22px; color: ${INK}; font-weight: 600; }
  .cart-empty p { margin: 0 0 24px; font-size: 14px; }
  .cart-empty a {
    display: inline-block;
    background: ${PINK};
    color: #fff;
    text-decoration: none;
    padding: 12px 28px;
    border-radius: 999px;
    font-weight: 600;
    font-size: 14px;
  }
  .cart-empty a:hover { background: ${PINK_DARK}; }

  .cart-list-head {
    display: grid;
    grid-template-columns: 1fr 100px 140px 100px 28px;
    gap: 16px;
    padding: 0 0 14px;
    border-bottom: 2px solid #1a1a1a;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #6e6e6e;
  }
  .cart-list-head span:nth-child(2),
  .cart-list-head span:nth-child(3),
  .cart-list-head span:nth-child(4) { text-align: center; }

  .cart-row {
    display: grid;
    grid-template-columns: 1fr 100px 140px 100px 28px;
    gap: 16px;
    padding: 24px 0;
    border-bottom: 1px solid #ececea;
    align-items: center;
  }
  .cart-row-product {
    display: flex;
    gap: 16px;
    align-items: center;
    min-width: 0;
  }
  .cart-row-cover {
    width: 72px;
    height: 96px;
    border-radius: 6px;
    background: #f5f5f5;
    display: grid;
    place-items: center;
    overflow: hidden;
    flex: 0 0 auto;
  }
  .cart-row-cover img { width: 100%; height: 100%; object-fit: cover; }
  .cart-row-info { min-width: 0; }
  .cart-row-title {
    margin: 0 0 4px;
    font-size: 15px;
    font-weight: 600;
    color: ${INK};
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .cart-row-title a { color: inherit; text-decoration: none; }
  .cart-row-title a:hover { color: ${PINK}; }
  .cart-row-author {
    margin: 0;
    font-size: 12px;
    color: #6e6e6e;
    line-height: 1.4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cart-row-price, .cart-row-total {
    text-align: center;
    font-size: 14px;
    font-weight: 500;
    color: ${INK};
  }
  .cart-row-total { font-weight: 700; }

  .cart-qty {
    display: inline-flex;
    align-items: center;
    border: 1px solid #d6d6d6;
    border-radius: 999px;
    padding: 3px;
    margin: 0 auto;
  }
  .cart-qty button {
    width: 28px; height: 28px;
    border: 0; background: transparent;
    color: ${INK};
    cursor: pointer; border-radius: 999px;
    display: grid; place-items: center;
  }
  .cart-qty button:hover { background: #f3f3f4; }
  .cart-qty .cart-qty-val {
    width: 36px;
    text-align: center;
    font-family: inherit;
    font-size: 13px;
    color: ${INK};
    user-select: none;
  }
  .cart-qty button:disabled { color: #c0c0c0; cursor: not-allowed; }
  .cart-qty button:disabled:hover { background: transparent; }
  .cart-row-stockmsg {
    font-size: 11px;
    color: #b80042;
    margin-top: 6px;
    text-align: center;
    line-height: 1.3;
  }
  .cart-row-remove {
    width: 28px; height: 28px;
    border: 0; background: transparent;
    color: #9a9a9a;
    cursor: pointer; border-radius: 999px;
    display: grid; place-items: center;
    transition: color 150ms, background 150ms;
  }
  .cart-row-remove:hover { color: ${PINK}; background: #fde8ec; }

  .cart-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 20px;
    flex-wrap: wrap;
    gap: 12px;
  }
  .cart-continue, .cart-clear {
    background: transparent;
    border: 1px solid #d6d6d6;
    color: ${INK};
    border-radius: 999px;
    padding: 10px 20px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
    transition: border-color 150ms, color 150ms;
  }
  .cart-continue:hover { border-color: ${INK}; }
  .cart-clear { color: #9a4a4a; }
  .cart-clear:hover { border-color: ${PINK}; color: ${PINK}; }

  .cart-summary {
    background: #fafafa;
    border: 1px solid #ececea;
    border-radius: 14px;
    padding: 28px 26px;
    position: sticky;
    top: 110px;
  }
  .cart-summary h3 {
    margin: 0 0 22px;
    font-size: 16px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: ${INK};
  }
  .cart-summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    font-size: 14px;
    color: #4a4a4a;
  }
  .cart-summary-row.total {
    border-top: 1px solid #ececea;
    margin-top: 10px;
    padding-top: 18px;
    font-size: 17px;
    font-weight: 700;
    color: ${INK};
  }
  .cart-summary-row.total .v { color: ${PINK}; }
  .cart-summary-row.discount .v { color: #137a3e; font-weight: 600; }
  .cart-promo {
    display: flex;
    gap: 8px;
    margin: 16px 0 6px;
  }
  .cart-promo input {
    flex: 1;
    border: 1px solid #d6d6d6;
    border-radius: 999px;
    padding: 10px 14px;
    font-family: inherit;
    font-size: 13px;
    color: ${INK};
    outline: none;
    background: #fff;
  }
  .cart-promo input:focus { border-color: #8A58DB; }
  .cart-promo button {
    background: ${INK};
    color: #fff;
    border: 0;
    border-radius: 999px;
    padding: 10px 18px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }
  .cart-promo button:hover { background: #333; }
  .cart-checkout {
    margin-top: 24px;
    width: 100%;
    background: ${PINK};
    color: #fff;
    border: 0;
    border-radius: 999px;
    padding: 14px;
    font-family: inherit;
    font-weight: 600;
    font-size: 14px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 150ms, transform 150ms;
  }
  .cart-checkout:hover:not(:disabled) { background: ${PINK_DARK}; transform: translateY(-1px); }
  .cart-checkout:disabled { background: #c0c0c0; cursor: not-allowed; }
  .cart-secure {
    margin: 14px 0 0;
    text-align: center;
    font-size: 12px;
    color: #9a9a9a;
  }

  .cart-suggest {
    max-width: 1280px;
    margin: 0 auto;
    padding: 8px 64px 96px;
  }
  .cart-suggest h3 {
    margin: 0 0 22px;
    font-size: 20px;
    font-weight: 600;
    color: ${INK};
  }
  .cart-suggest-grid {
    display: flex;
    flex-wrap: nowrap;
    gap: 18px;
    overflow: hidden;
  }
  .cart-suggest-grid > * { flex: 0 0 160px; }
  .cart-suggest-card {
    background: #fff;
    border: 1px solid #ececea;
    border-radius: 10px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    text-decoration: none;
    color: inherit;
    transition: transform 200ms, box-shadow 200ms;
    min-width: 0;
    overflow: hidden;
  }
  .cart-suggest-card > div { min-width: 0; }
  .cart-suggest-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(0,0,0,0.06);
  }
  .cart-suggest-cover {
    width: 100%;
    aspect-ratio: 3 / 4;
    border-radius: 6px;
    overflow: hidden;
    background: #f5f5f5;
    display: grid;
    place-items: center;
  }
  .cart-suggest-cover img { width: 100%; height: 100%; object-fit: cover; }
  .cart-suggest-title {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.3;
    color: ${INK};
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .cart-suggest-author {
    margin: 0;
    font-size: 11px;
    color: #6e6e6e;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cart-suggest-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: auto;
    padding-top: 2px;
  }
  .cart-suggest-price {
    font-size: 12px;
    font-weight: 700;
    color: ${INK};
  }
  .cart-suggest-add {
    width: 26px;
    height: 26px;
    border: 0;
    border-radius: 999px;
    background: ${INK};
    color: #fff;
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
    display: grid;
    place-items: center;
    transition: background 150ms;
  }
  .cart-suggest-add:hover { background: ${PINK}; }

  @media (max-width: 1023px) {
    .cart-wrap { grid-template-columns: 1fr; padding: 40px 32px 64px; gap: 32px; }
    .cart-summary { position: static; }
    .cart-suggest { padding: 0 32px 64px; }
    .cart-suggest-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 767px) {
    .cart-wrap { padding: 28px 20px 56px; }
    .cart-list-head { display: none; }
    .cart-row {
      grid-template-columns: 1fr auto;
      gap: 12px 16px;
      padding: 16px 0;
    }
    .cart-row-product { grid-column: 1 / span 2; }
    .cart-row-price { grid-column: 1; text-align: left; font-size: 13px; }
    .cart-qty { grid-column: 2; margin: 0; justify-self: end; }
    .cart-row-total { grid-column: 1; text-align: left; }
    .cart-row-remove { grid-column: 2; justify-self: end; }
  }
`;

function MinusIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>; }
function PlusIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>; }
function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 7h14M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M7 7l1 13a2 2 0 002 2h4a2 2 0 002-2l1-13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function rupees(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

export default function Cart() {
  const navigate = useNavigate();
  const { items, itemCount, subtotal, updateQty, removeItem, clear, addBook } = useCart();
  const { member } = useAuth();
  const [promo, setPromo] = useState('');

  const { data: rows } = useShopBooks();
  const allBooks = useMemo(() => adaptShopBooks(rows || []), [rows]);

  // Fresh stock per cart line. The cart's book_id is the book's slug
  // (per adaptShopBook), so we look up by `slug` against the books
  // table — works for both UUID-shaped and human-readable slugs.
  const [stockMap, setStockMap] = useState({});
  useEffect(() => {
    const slugs = items
      .filter((i) => i.type === 'book' && typeof i.book_id === 'string' && i.book_id)
      .map((i) => i.book_id);
    if (slugs.length === 0) { setStockMap({}); return; }
    let cancelled = false;
    (async () => {
      const { data: sRows, error } = await supabase
        .from('books')
        .select('slug, quantity_available')
        .in('slug', slugs);
      if (cancelled || error) return;
      const map = {};
      (sRows || []).forEach((r) => { map[r.slug] = Number(r.quantity_available || 0); });
      setStockMap(map);
      // Clamp any cart line whose stock dropped below the requested qty.
      items.forEach((line) => {
        if (line.type !== 'book' || !line.book_id) return;
        if (!(line.book_id in map)) return; // unknown book — leave alone
        const have = map[line.book_id];
        if (line.quantity > have) updateQty(line.key, Math.max(0, have));
      });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((i) => `${i.book_id}:${i.quantity}`).join(',')]);
  const candidatePool = useMemo(() => {
    const norm = (s) => String(s || '').trim().toLowerCase();
    const cartIds = new Set(items.map((i) => i.book_id).filter(Boolean));
    const cartTitles = new Set(items.map((i) => norm(i.title)).filter(Boolean));
    const cartCats = new Set(items.flatMap((i) => i.categories || []));
    const pool = allBooks.filter((b) => !cartIds.has(b.id) && !cartTitles.has(norm(b.title)));
    const matched = pool.filter((b) => (b.categories || []).some((c) => cartCats.has(c)));
    return matched.length ? matched : pool;
  }, [allBooks, items]);

  // Auto-fill the row: measure container width and divide by the
  // minimum card width + gap so we always show one full row.
  const suggestRef = useRef(null);
  const [perRow, setPerRow] = useState(4);
  useEffect(() => {
    const el = suggestRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const compute = () => {
      const w = el.clientWidth;
      const min = 160; const gap = 18;
      const n = Math.max(2, Math.floor((w + gap) / (min + gap)));
      setPerRow(n);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const suggestions = useMemo(() => candidatePool.slice(0, perRow), [candidatePool, perRow]);

  const memberDiscount = member ? Math.round(subtotal * 0.10) : 0;
  const shippingFee = subtotal === 0 ? 0 : (subtotal >= 999 ? 0 : 80);
  const total = Math.max(0, subtotal - memberDiscount + shippingFee);

  return (
    <div className="cart-page">
      <style>{CSS}</style>
      <PageBreadcrumb name="Shopping Cart" />

      <div className="cart-wrap">
        <div>
          {items.length === 0 ? (
            <div className="cart-empty">
              <h2>Your cart is empty</h2>
              <p>Find a story worth reading and bring it home.</p>
              <Link to="/shop">Browse the shop</Link>
            </div>
          ) : (
            <>
              <div className="cart-list-head">
                <span>Product</span>
                <span>Price</span>
                <span>Quantity</span>
                <span>Total</span>
                <span aria-hidden="true" />
              </div>

              {items.map((item) => {
                const price = Number(item.unit_price ?? item.sales_price ?? item.price ?? 0);
                const qty = Number(item.quantity ?? item.qty ?? 1);
                const cover = item.cover_image || item.cover_url || item.book_image;
                const detailId = item.book_id || item.id;
                const available = item.book_id && stockMap[item.book_id] !== undefined
                  ? stockMap[item.book_id]
                  : Infinity;
                const atCap = qty >= available;
                return (
                  <div key={item.key} className="cart-row">
                    <div className="cart-row-product">
                      <Link to={`/books/${detailId}`} className="cart-row-cover" aria-label={item.title}>
                        {cover ? <img src={cover} alt="" /> : <span style={{ fontSize: 28, opacity: 0.4 }}>📖</span>}
                      </Link>
                      <div className="cart-row-info">
                        <h3 className="cart-row-title"><Link to={`/books/${detailId}`}>{item.title}</Link></h3>
                        {item.author && <p className="cart-row-author">{item.author}</p>}
                      </div>
                    </div>
                    <div className="cart-row-price">{rupees(price)}</div>
                    <div>
                      <div className="cart-qty">
                        <button type="button" onClick={() => updateQty(item.key, qty - 1)} disabled={qty <= 1} aria-label="Decrease"><MinusIcon /></button>
                        <span className="cart-qty-val" aria-label={`Quantity ${qty}`}>{qty}</span>
                        <button type="button" onClick={() => updateQty(item.key, qty + 1)} disabled={atCap} aria-label="Increase"><PlusIcon /></button>
                      </div>
                      {atCap && available > 0 && (
                        <div className="cart-row-stockmsg">Only {available} left in stock</div>
                      )}
                    </div>
                    <div className="cart-row-total">{rupees(price * qty)}</div>
                    <button type="button" className="cart-row-remove" onClick={() => removeItem(item.key)} aria-label={`Remove ${item.title}`}>
                      <TrashIcon />
                    </button>
                  </div>
                );
              })}

              <div className="cart-actions">
                <Link to="/shop" className="cart-continue">← Continue shopping</Link>
                <button type="button" className="cart-clear" onClick={clear}>Clear cart</button>
              </div>
            </>
          )}
        </div>

        <aside className="cart-summary">
          <h3>Order Summary</h3>
          <div className="cart-summary-row">
            <span>Items ({itemCount})</span>
            <span>{rupees(subtotal)}</span>
          </div>
          {memberDiscount > 0 && (
            <div className="cart-summary-row discount">
              <span>Member discount (10%)</span>
              <span className="v">-{rupees(memberDiscount)}</span>
            </div>
          )}
          <div className="cart-summary-row">
            <span>Shipping</span>
            <span>{shippingFee === 0 ? 'Free' : rupees(shippingFee)}</span>
          </div>
          <div className="cart-promo">
            <input
              type="text"
              placeholder="Promo code"
              value={promo}
              onChange={(e) => setPromo(e.target.value)}
            />
            <button type="button">Apply</button>
          </div>
          <div className="cart-summary-row total">
            <span>Total</span>
            <span className="v">{rupees(total)}</span>
          </div>
          <button
            type="button"
            className="cart-checkout"
            disabled={items.length === 0}
            onClick={() => navigate('/checkout')}
          >
            Proceed to checkout
          </button>
          <p className="cart-secure">🔒 Secure checkout</p>
        </aside>
      </div>

      {candidatePool.length > 0 && (
        <section className="cart-suggest" ref={suggestRef}>
          <h3>You may also like</h3>
          <div className="cart-suggest-grid">
            {suggestions.map((b) => (
              <div key={b.id} className="cart-suggest-card">
                <Link to={`/books/${b.id}`} className="cart-suggest-cover" aria-label={b.title}>
                  {b.coverUrl ? <img src={b.coverUrl} alt="" loading="lazy" /> : <span style={{ fontSize: 28, opacity: 0.4 }}>📖</span>}
                </Link>
                <div>
                  <p className="cart-suggest-title"><Link to={`/books/${b.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{b.title}</Link></p>
                  {b.author && <p className="cart-suggest-author">{b.author}</p>}
                </div>
                <div className="cart-suggest-row">
                  <span className="cart-suggest-price">{rupees(b.price)}</span>
                  <button
                    type="button"
                    className="cart-suggest-add"
                    aria-label={`Add ${b.title} to cart`}
                    onClick={() => addBook({ id: b.id, title: b.title, author: b.author, sales_price: b.price, cover_url: b.coverUrl })}
                  >+</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
