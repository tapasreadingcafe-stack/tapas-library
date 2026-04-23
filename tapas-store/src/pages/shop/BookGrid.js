import React from 'react';
import BookCard from './BookCard';

export default function BookGrid({ books, memberDiscount, gridRef }) {
  if (books.length === 0) {
    return (
      <div className="shop-empty" ref={gridRef}>
        <div className="shop-empty-emoji" aria-hidden="true">\ud83d\udcda</div>
        <h3>No books match your filters</h3>
        <p>Loosen a filter or clear the search to see more titles.</p>
      </div>
    );
  }
  return (
    <div className="shop-grid" ref={gridRef}>
      {books.map((b) => (
        <BookCard key={b.id} book={b} memberDiscount={memberDiscount} />
      ))}
    </div>
  );
}
