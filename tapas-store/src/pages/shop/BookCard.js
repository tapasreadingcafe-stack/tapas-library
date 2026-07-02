import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../hooks/useFavorites';
import { formatInr, MEMBER_DISCOUNT_RATE } from '../../data/shopBooks';

const LOW_STOCK_THRESHOLD = 5;

export default function BookCard({ book, memberDiscount }) {
  const { addBook, items, updateQty } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const fav = isFavorite(book.id);

  const original = book.price;
  const effective = memberDiscount
    ? Math.round(original * (1 - MEMBER_DISCOUNT_RATE))
    : original;

  const cartKey = `book:${book.id}`;
  const lineItem = items.find((i) => i.key === cartKey);
  const inCart = lineItem ? lineItem.quantity : 0;
  const stock = Number.isFinite(book.stock) ? book.stock : 0;
  const isLowStock = stock > 0 && stock <= LOW_STOCK_THRESHOLD;
  const isOutOfStock = stock <= 0 && book.inStock === false;
  const atMax = stock > 0 && inCart >= stock;

  const stop = (e) => { e.preventDefault(); e.stopPropagation(); };

  const onAdd = (e) => {
    stop(e);
    if (atMax) return;
    addBook({
      id: book.id,
      title: book.title,
      author: book.author,
      sales_price: effective,
      cover_url: book.coverUrl || null,
      quantity_available: stock || undefined,
    });
  };

  const onDec = (e) => {
    stop(e);
    updateQty(cartKey, inCart - 1);
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

      <Link to={`/books/${book.id}`} className="shop-card-link" aria-label={book.title}>
        <div className="shop-card-cover-wrap">
          {book.coverUrl ? (
            <div className="shop-cover shop-cover-photo" aria-hidden="true">
              <img src={book.coverUrl} alt="" loading="lazy" />
            </div>
          ) : (
            <div className={`shop-cover c-${book.coverVariant}`} aria-hidden="true">
              <div className="shop-cover-title">{book.coverLabel}</div>
              <div className="shop-cover-author">{book.author}</div>
            </div>
          )}
          {isLowStock && (
            <span className="shop-card-stock-tag" role="status">Only {stock} left</span>
          )}
          {isOutOfStock && (
            <span className="shop-card-stock-tag is-out" role="status">Out of stock</span>
          )}
        </div>

        <div className="shop-card-meta">
          <div className="shop-card-title">{book.title}</div>
          <div className="shop-card-author">{book.author}</div>
        </div>
      </Link>

      <div className="shop-card-row">
        <div className="shop-card-price">
          {memberDiscount && (
            <span className="shop-card-price-strike">{formatInr(original)}</span>
          )}
          <span className="shop-card-price-now">{formatInr(effective)}</span>
        </div>
        {inCart === 0 ? (
          <button
            type="button"
            className="shop-card-add"
            aria-label={`Add ${book.title} to cart`}
            onClick={onAdd}
            disabled={isOutOfStock}
          >
            +
          </button>
        ) : (
          <div className="shop-card-stepper" role="group" aria-label={`${book.title} quantity`}>
            <button
              type="button"
              className="shop-card-stepper-btn"
              aria-label="Remove one"
              onClick={onDec}
            >
              −
            </button>
            <span className="shop-card-stepper-count" aria-live="polite">{inCart}</span>
            <button
              type="button"
              className="shop-card-stepper-btn"
              aria-label="Add one more"
              onClick={onAdd}
              disabled={atMax}
            >
              +
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
