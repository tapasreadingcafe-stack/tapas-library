import React from 'react';
import LibraryBookCard from './LibraryBookCard';

export default function Shelf({ shelf, books, onReserve }) {
  if (books.length === 0) return null;
  const { number, name, totals } = shelf;
  return (
    <section className="library-shelf" id={shelf.id} aria-labelledby={`${shelf.id}-title`}>
      <header className="library-shelf-head">
        <h3 id={`${shelf.id}-title`} className="library-shelf-title">
          Shelf {number} \u00b7 <em>{name}</em>
        </h3>
        <span className="library-shelf-meta">
          {totals.titles} titles \u00b7 {totals.outOnLoan} out on loan
        </span>
      </header>
      <div className="library-shelf-grid">
        {books.map((b) => (
          <LibraryBookCard key={b.id} book={b} onReserve={onReserve} />
        ))}
      </div>
    </section>
  );
}
