import React from 'react';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../hooks/useFavorites';
import { formatInr, MEMBER_DISCOUNT_RATE } from '../../data/shopBooks';

export default function BookCard({ book, memberDiscount }) {
  const { addBook } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const fav = isFavorite(book.id);

  const original = book.price;
  const effective = memberDiscount
    ? Math.round(original * (1 - MEMBER_DISCOUNT_RATE))
    : original;

  const onAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addBook({
      id: book.id,
      title: book.title,
      author: book.author,
      sales_price: effective,
    });
  };

  return (
    <article className="shop-card">
      <button
        type="button"
        className={`shop-card-fav${fav ? ' is-on' : ''}`}
        aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
        aria-pressed={fav}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(book.id); }}
      >
        {fav ? '\u2665' : '\u2661'}
      </button>

      <div className={`shop-cover c-${book.coverVariant}`} aria-hidden="true">
        <div className="shop-cover-title">{book.coverLabel}</div>
        <div className="shop-cover-author">{book.author}</div>
      </div>

      <div className="shop-card-meta">
        <div className="shop-card-title">{book.title}</div>
        <div className="shop-card-author">{book.author}</div>
      </div>

      <div className="shop-card-row">
        <div className="shop-card-price">
          {memberDiscount && (
            <span className="shop-card-price-strike">{formatInr(original)}</span>
          )}
          <span className="shop-card-price-now">{formatInr(effective)}</span>
        </div>
        <button
          type="button"
          className="shop-card-add"
          aria-label={`Add ${book.title} to cart`}
          onClick={onAdd}
        >
          +
        </button>
      </div>
    </article>
  );
}
