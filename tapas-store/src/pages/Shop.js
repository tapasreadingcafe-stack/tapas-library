import React, { useEffect, useMemo, useRef, useState } from 'react';
import HeroBand from './shop/HeroBand';
import FeaturedBook from './shop/FeaturedBook';
import FilterSidebar from './shop/FilterSidebar';
import FilterDrawer from './shop/FilterDrawer';
import Toolbar from './shop/Toolbar';
import BookGrid from './shop/BookGrid';
import Pagination from './shop/Pagination';
import SHOP_CSS from './shop/shopStyles';
import { SHOP_PRICE_MAX } from '../data/shopBooks';
import { useShopBooks } from '../cms/hooks';
import { adaptShopBooks } from '../cms/adapters';

const PAGE_SIZE = 12;

// Spec pins inflated totals ("242 titles · 32 new this week") for the
// toolbar even though we only have 12 real books. Using the real
// filtered count would make the toolbar lie when "Fiction" is
// unchecked. Mix the two: real filtered count + the spec's new count
// while the filters are at their defaults; fall back to the real new
// count (books flagged newThisWeek) otherwise.
const DEFAULT_FILTERS = {
  search: '',
  categories: ['Fiction', 'Translation'],
  format: 'Paperback',
  priceMax: SHOP_PRICE_MAX,
  club: 'Slow Fiction',
  inStockOnly: false,
  signedOnly: false,
  memberDiscount: true,
};

const SPEC_BADGES = { total: 242, newThisWeek: 32 };

function filtersAreDefault(f) {
  return (
    f.search === DEFAULT_FILTERS.search
    && f.format === DEFAULT_FILTERS.format
    && f.priceMax === DEFAULT_FILTERS.priceMax
    && f.club === DEFAULT_FILTERS.club
    && f.inStockOnly === DEFAULT_FILTERS.inStockOnly
    && f.signedOnly === DEFAULT_FILTERS.signedOnly
    && f.memberDiscount === DEFAULT_FILTERS.memberDiscount
    && JSON.stringify([...f.categories].sort())
       === JSON.stringify([...DEFAULT_FILTERS.categories].sort())
  );
}

// Debounce the search term so every keystroke doesn't thrash the
// filter pipeline (200ms per spec).
function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function applyFilters(books, filters, debouncedSearch) {
  const q = debouncedSearch.trim().toLowerCase();
  const checkedCats = new Set(filters.categories);
  return books.filter((b) => {
    if (q && !(b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q))) {
      return false;
    }
    // If nothing is checked, show everything — otherwise a fresh
    // visitor who unchecks the two defaults would see an empty grid.
    if (checkedCats.size > 0) {
      const hit = b.categories.some((c) => checkedCats.has(c));
      if (!hit) return false;
    }
    if (filters.format && b.format !== filters.format) return false;
    if (b.price > filters.priceMax) return false;
    if (filters.club) {
      if (!Array.isArray(b.clubs) || !b.clubs.includes(filters.club)) return false;
    }
    if (filters.inStockOnly && !b.inStock) return false;
    if (filters.signedOnly && !b.signed) return false;
    return true;
  });
}

function applySort(books, sort) {
  const arr = books.slice();
  switch (sort) {
    case 'new-arrivals':
      return arr.reverse();
    case 'price-asc':
      return arr.sort((a, b) => a.price - b.price);
    case 'author-az':
      return arr.sort((a, b) => {
        const la = a.author.split(' ').slice(-1)[0].toLowerCase();
        const lb = b.author.split(' ').slice(-1)[0].toLowerCase();
        return la.localeCompare(lb);
      });
    default:
      return arr;
  }
}

export default function Shop() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState('recommended');
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const gridRef = useRef(null);

  const { data: rows, loading } = useShopBooks();
  const books = useMemo(() => adaptShopBooks(rows), [rows]);

  const debouncedSearch = useDebounced(filters.search, 200);

  const filtered = useMemo(
    () => applyFilters(books, filters, debouncedSearch),
    [books, filters, debouncedSearch]
  );
  const sorted = useMemo(() => applySort(filtered, sort), [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  useEffect(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);
  useEffect(() => { setPage(1); }, [filters, debouncedSearch, sort]);

  const pageBooks = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const onPageChange = (next) => {
    setPage(next);
    // Defer one frame so the new page has rendered before we scroll.
    requestAnimationFrame(() => {
      gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  // Toolbar lies intentionally when filters are untouched — the spec
  // quotes inflated catalogue totals ("242 titles · 32 new this
  // week") that only make sense as a header stat for the full
  // catalogue. Once the visitor engages a filter, switch to the real
  // count of the 12 seed books so the number tracks the grid below.
  const showSpecBadges = filtersAreDefault(filters) && debouncedSearch === '' && sort === 'recommended';
  const totalForToolbar = showSpecBadges ? SPEC_BADGES.total : filtered.length;
  const newForToolbar = showSpecBadges
    ? SPEC_BADGES.newThisWeek
    : filtered.filter((b) => b.newThisWeek).length;

  return (
    <div className="shop-root">
      <style>{SHOP_CSS}</style>
      <HeroBand />
      <div className="shop-wrap">
        <FeaturedBook memberDiscount={filters.memberDiscount} />
        <div className="shop-layout">
          <aside className="shop-filters-aside">
            <FilterSidebar filters={filters} setFilters={setFilters} />
          </aside>
          <div>
            <Toolbar
              totalCount={totalForToolbar}
              newCount={newForToolbar}
              sort={sort}
              onSortChange={setSort}
              onOpenFilters={() => setDrawerOpen(true)}
            />
            {loading && books.length === 0 ? (
              <div className="shop-grid" ref={gridRef} aria-busy="true" />
            ) : sorted.length === 0 ? (
              <div ref={gridRef} style={{ padding: '64px 24px', textAlign: 'center', color: 'var(--text-muted, #888)' }}>
                No books match these filters.
              </div>
            ) : (
              <BookGrid
                books={pageBooks}
                memberDiscount={filters.memberDiscount}
                gridRef={gridRef}
              />
            )}
            <Pagination
              page={page}
              totalPages={Math.max(totalPages, showSpecBadges ? 21 : totalPages)}
              onChange={onPageChange}
            />
          </div>
        </div>
      </div>
      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filters={filters}
        setFilters={setFilters}
      />
    </div>
  );
}
