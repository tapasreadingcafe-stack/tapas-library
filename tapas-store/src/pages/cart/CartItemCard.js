import React from 'react';
import { SHOP_BOOKS, MEMBER_DISCOUNT_RATE } from '../../data/shopBooks';
import { rupees } from './cartFormat';

const MAX_QTY_PER_ITEM = 5;

// Look up the Shop seed book for a cart item so we can show the
// gradient cover color + format + in-stock state without duplicating
// those fields onto each cart item.
function lookupBook(id) {
  return SHOP_BOOKS.find((b) => b.id === id) || null;
}

export default function CartItemCard({
  item, memberDiscountApplied, onQty, onRemove,
}) {
  const book = lookupBook(item.book_id);
  const coverVariant = book?.coverVariant || 'ink';
  const categories = book?.categories?.join(', ') || '';
  const format = book?.format || 'Paperback';
  const inStock = book ? book.inStock : true;

  const unitEffective = item.unit_price;
  const unitOriginal = memberDiscountApplied
    // Derive original from the discounted unit so the struck line
    // matches the shop card exactly for the 10% case.
    ? Math.round(unitEffective / (1 - MEMBER_DISCOUNT_RATE))
    : null;
  const lineTotal = unitEffective * item.quantity;
  const originalLineTotal = unitOriginal ? unitOriginal * item.quantity : null;

  const canIncrement = item.quantity < MAX_QTY_PER_ITEM;

  return (
    <article className="ct-item">
      <button
        type="button"
        className="ct-item-remove"
        aria-label={`Remove ${item.title}`}
        onClick={onRemove}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      </button>

      <div className={`ct-item-cover c-${coverVariant} is-${coverVariant}`} aria-hidden="true">
        <div className="ct-item-cover-title">{book?.coverLabel || item.title}</div>
        <div className="ct-item-cover-author">{item.author?.toUpperCase()}</div>
      </div>

      <div className="ct-item-meta">
        <h3 className="ct-item-title">{item.title}</h3>
        <div className="ct-item-author">
          {item.author}{categories ? ` \u00b7 ${categories}` : ''}
        </div>
        <div className={`ct-item-info${inStock ? '' : ' is-oos'}`}>
          {inStock
            ? `${format} \u00b7 Ships in 2\u20133 days`
            : `${format} \u00b7 Out of stock \u2014 notify me`}
        </div>
        {memberDiscountApplied && (
          <span className="ct-item-disc">Member 10% off</span>
        )}
      </div>

      <div className="ct-qty" role="group" aria-label={`Quantity for ${item.title}`}>
        <button
          type="button"
          aria-label="Decrease quantity"
          onClick={() => onQty(item.quantity - 1)}
        >\u2212</button>
        <span className="ct-qty-n" aria-live="polite">{item.quantity}</span>
        <button
          type="button"
          aria-label="Increase quantity"
          disabled={!canIncrement}
          title={canIncrement ? undefined : 'Last copy on shelf'}
          onClick={() => onQty(item.quantity + 1)}
        >+</button>
      </div>

      <div className="ct-price">
        {originalLineTotal && (
          <span className="ct-price-strike">{rupees(originalLineTotal)}</span>
        )}
        <span className="ct-price-now">{rupees(lineTotal)}</span>
        {item.quantity > 1 && (
          <span className="ct-price-each">{rupees(unitEffective)} each</span>
        )}
      </div>
    </article>
  );
}
