import React from 'react';

export default function LibraryBookCard({ book, onReserve }) {
  const isOut = book.status?.kind === 'out';
  const statusLabel = isOut
    ? `Out Â· back ${book.status.returnDate}`
    : 'Available';

  return (
    <button
      type="button"
      className="library-book"
      onClick={() => onReserve(book)}
      aria-label={`Reserve ${book.title} by ${book.author}, ${statusLabel}`}
    >
      <div className={`library-cover c-${book.cover}`} aria-hidden="true">
        <div className="library-cover-title">{book.title}</div>
        <div className="library-cover-author">{book.author.toUpperCase()}</div>
      </div>
      <div className={`library-status ${isOut ? 'is-out' : 'is-available'}`}>
        <span className="library-status-dot" />
        {statusLabel}
      </div>
    </button>
  );
}
