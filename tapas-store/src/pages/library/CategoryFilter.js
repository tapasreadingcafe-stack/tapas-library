import React from 'react';
import { LIBRARY_CATEGORIES } from '../../data/libraryBooks';

export default function CategoryFilter({ category, onCategory, query, onQuery }) {
  return (
    <div className="library-filter">
      <div className="library-filter-pills" role="tablist" aria-label="Filter by category">
        {LIBRARY_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={category === c}
            className={`library-pill${category === c ? ' is-on' : ''}`}
            onClick={() => onCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <input
        type="search"
        className="library-filter-search"
        placeholder="Title, author, shelf\u2026"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        aria-label="Search the library"
      />
    </div>
  );
}
