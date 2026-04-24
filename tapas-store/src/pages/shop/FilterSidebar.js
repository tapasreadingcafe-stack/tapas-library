import React from 'react';
import {
  SHOP_CATEGORIES,
  SHOP_FORMATS,
  SHOP_CLUBS,
  SHOP_PRICE_MIN,
  SHOP_PRICE_MAX,
  formatInr,
} from '../../data/shopBooks';

// One shared shape for the sidebar and the slide-in drawer; the
// drawer just wraps this same body in an overlay. Keeping the markup
// in one place means there's a single set of controls to maintain.
export default function FilterSidebar({ filters, setFilters }) {
  const patch = (next) => setFilters((prev) => ({ ...prev, ...next }));

  const toggleCategory = (key) => {
    const curr = new Set(filters.categories);
    if (curr.has(key)) curr.delete(key); else curr.add(key);
    patch({ categories: [...curr] });
  };

  return (
    <div className="shop-filters">
      <div className="shop-filter-group">
        <h4>Search</h4>
        <input
          type="search"
          className="shop-filter-search"
          placeholder="Title, author, ISBNâ¦"
          value={filters.search}
          onChange={(e) => patch({ search: e.target.value })}
        />
      </div>

      <div className="shop-filter-group">
        <h4>Category</h4>
        {SHOP_CATEGORIES.map((c) => (
          <label key={c.key} className="shop-filter-check">
            <input
              type="checkbox"
              checked={filters.categories.includes(c.key)}
              onChange={() => toggleCategory(c.key)}
            />
            <span className="shop-filter-check-label">{c.label}</span>
            <span className="shop-filter-check-count">{c.count}</span>
          </label>
        ))}
      </div>

      <div className="shop-filter-group">
        <h4>Format</h4>
        <div className="shop-chip-row">
          {SHOP_FORMATS.map((f) => (
            <button
              key={f}
              type="button"
              className={`shop-chip${filters.format === f ? ' is-on' : ''}`}
              aria-pressed={filters.format === f}
              onClick={() => patch({ format: filters.format === f ? null : f })}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="shop-filter-group">
        <h4>Price</h4>
        <div className="shop-filter-price">
          <span className="shop-filter-price-bound">{formatInr(SHOP_PRICE_MIN)}</span>
          <input
            type="range"
            min={SHOP_PRICE_MIN}
            max={SHOP_PRICE_MAX}
            step={50}
            value={filters.priceMax}
            onChange={(e) => patch({ priceMax: Number(e.target.value) })}
            aria-label="Maximum price"
          />
          <span className="shop-filter-price-bound">{formatInr(filters.priceMax)}</span>
        </div>
      </div>

      <div className="shop-filter-group">
        <h4>From the clubs</h4>
        <div className="shop-chip-row">
          {SHOP_CLUBS.map((c) => (
            <button
              key={c}
              type="button"
              className={`shop-chip${filters.club === c ? ' is-on' : ''}`}
              aria-pressed={filters.club === c}
              onClick={() => patch({ club: filters.club === c ? null : c })}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="shop-filter-group">
        <h4>On the shelf</h4>
        <label className="shop-filter-check">
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={(e) => patch({ inStockOnly: e.target.checked })}
          />
          <span className="shop-filter-check-label">In stock only</span>
        </label>
        <label className="shop-filter-check">
          <input
            type="checkbox"
            checked={filters.signedOnly}
            onChange={(e) => patch({ signedOnly: e.target.checked })}
          />
          <span className="shop-filter-check-label">Signed copies</span>
        </label>
        <label className="shop-filter-check">
          <input
            type="checkbox"
            checked={filters.memberDiscount}
            onChange={(e) => patch({ memberDiscount: e.target.checked })}
          />
          <span className="shop-filter-check-label">Member discount</span>
        </label>
      </div>
    </div>
  );
}
