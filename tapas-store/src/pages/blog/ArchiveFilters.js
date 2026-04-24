import React from 'react';
import { JOURNAL_CATEGORIES } from '../../data/journalPosts';

export default function ArchiveFilters({ category, onCategory, query, onQuery }) {
  return (
    <div className="blog-archive-controls">
      <div className="blog-pills" role="tablist" aria-label="Filter the archive">
        {JOURNAL_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={category === c}
            className={`blog-pill${category === c ? ' is-on' : ''}`}
            onClick={() => onCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <input
        type="search"
        className="blog-search"
        placeholder="Search the journal…"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        aria-label="Search the journal"
      />
    </div>
  );
}
