import React from 'react';
import { SHOP_BOOKS } from '../../data/shopBooks';
import { useCart } from '../../context/CartContext';
import { rupees } from './cartFormat';

// Show 3 books not already in the cart. If any cart items have a
// matching category, prefer books that share it; otherwise just the
// first 3 remaining books.
function pickPaired(items) {
  const inCart = new Set(items.map((i) => i.book_id));
  const remaining = SHOP_BOOKS.filter((b) => !inCart.has(b.id));
  const cartCats = new Set(
    items.flatMap((i) => {
      const src = SHOP_BOOKS.find((b) => b.id === i.book_id);
      return src?.categories || [];
    }),
  );
  if (cartCats.size === 0) return remaining.slice(0, 3);
  const matches = remaining.filter((b) => b.categories.some((c) => cartCats.has(c)));
  const fillers = remaining.filter((b) => !matches.includes(b));
  return [...matches, ...fillers].slice(0, 3);
}

export default function PairedWith() {
  const { items, addBook } = useCart();
  if (items.length === 0) return null;
  const paired = pickPaired(items);
  if (paired.length === 0) return null;

  return (
    <section className="ct-paired" aria-labelledby="ct-paired-h">
      <h3 id="ct-paired-h" className="ct-paired-title">
        Paired well with whatâs in your basket.
      </h3>
      <div className="ct-paired-grid">
        {paired.map((b) => (
          <div key={b.id} className="ct-paired-card">
            <div className={`ct-paired-cover c-${b.coverVariant} is-${b.coverVariant}`}>
              <div className="ct-paired-cover-title">{b.coverLabel}</div>
              <div className="ct-paired-cover-author">{b.author.toUpperCase()}</div>
            </div>
            <div className="ct-paired-meta">
              <b>{b.title}</b>
              {b.author}
            </div>
            <div className="ct-paired-foot">
              <span className="ct-paired-price">{rupees(b.price)}</span>
              <button
                type="button"
                className="ct-paired-add"
                aria-label={`Add ${b.title} to cart`}
                onClick={() => addBook({
                  id: b.id,
                  title: b.title,
                  author: b.author,
                  sales_price: b.price,
                })}
              >+</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
