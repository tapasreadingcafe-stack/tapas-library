import React from 'react';
import { useCart } from '../../context/CartContext';
import { SHOP_BOOKS, FEATURED_BOOK_ID, formatInr, MEMBER_DISCOUNT_RATE } from '../../data/shopBooks';

export default function FeaturedBook({ memberDiscount }) {
  const { addBook } = useCart();
  const book = SHOP_BOOKS.find((b) => b.id === FEATURED_BOOK_ID);
  if (!book) return null;

  const effective = memberDiscount
    ? Math.round(book.price * (1 - MEMBER_DISCOUNT_RATE))
    : book.price;

  const onAdd = () => {
    addBook({
      id: book.id,
      title: book.title,
      author: book.author,
      sales_price: effective,
    });
  };

  return (
    <section className="shop-featured" aria-labelledby="featured-h">
      <div className="shop-featured-left">
        <div className="shop-featured-kicker">Book of the Month</div>
        <h2 id="featured-h" className="shop-featured-title">
          {book.title} <em>Â· {book.author}</em>
        </h2>
        <p className="shop-featured-body">
          A diary-novel the size of a cathedral. Translator Sean Cotter
          pulls off a small miracle. Our Slow Fiction Club is reading it
          through June.
        </p>
        <button type="button" className="shop-featured-cta" onClick={onAdd}>
          <span className="shop-featured-cta-label">
            Add to cart Â· {formatInr(effective)}
          </span>
          <span className="shop-featured-cta-arrow" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </span>
        </button>
      </div>

      <div className="shop-featured-cover-wrap">
        <div className={`shop-featured-cover c-${book.coverVariant}`} aria-hidden="true">
          <div className="shop-featured-cover-title">{book.coverLabel}</div>
          <div className="shop-featured-cover-author">{book.author}</div>
        </div>
      </div>
    </section>
  );
}
