import React from 'react';

const SORTS = [
  { key: 'recommended',  label: 'Recommended' },
  { key: 'new-arrivals', label: 'New arrivals' },
  { key: 'price-asc',    label: 'Price: low to high' },
  { key: 'author-az',    label: 'Author: AâZ' },
];

export default function Toolbar({ totalCount, newCount, sort, onSortChange, onOpenFilters }) {
  return (
    <div className="shop-toolbar">
      <div className="shop-toolbar-count">
        {totalCount} {totalCount === 1 ? 'title' : 'titles'} Â· {newCount} new this week
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
