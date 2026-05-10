import React from 'react';

const SORTS = [
  { key: 'recommended',  label: 'Recommended' },
  { key: 'new-arrivals', label: 'New arrivals' },
  { key: 'price-asc',    label: 'Price: low to high' },
  { key: 'author-az',    label: 'Author: A–Z' },
];

export default function Toolbar({ totalCount, newCount, sort, onSortChange, onOpenFilters, sidebarOpen, onToggleSidebar }) {
  return (
    <div className="shop-toolbar">
      <div className="shop-toolbar-left">
        {onToggleSidebar && (
          <button
            type="button"
            className="shop-toggle-filters"
            onClick={onToggleSidebar}
            aria-expanded={sidebarOpen}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            {sidebarOpen ? 'Hide filters' : 'Show filters'}
          </button>
        )}
        <div className="shop-toolbar-count">
          {totalCount} {totalCount === 1 ? 'book' : 'books'} · {newCount} new this week
        </div>
      </div>
      <div className="shop-toolbar-actions">
        <button
          type="button"
          className="shop-toolbar-filters-btn"
          onClick={onOpenFilters}
          aria-label="Open filters"
        >
          Filters
        </button>
        <label className="shop-toolbar-sort">
          <span>Sort by</span>
          <select value={sort} onChange={(e) => onSortChange(e.target.value)}>
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
