import React, { useEffect, useMemo, useState } from 'react';
import LibraryHero from './library/LibraryHero';
import StatsRow from './library/StatsRow';
import CategoryFilter from './library/CategoryFilter';
import FeaturedShelf from './library/FeaturedShelf';
import Shelf from './library/Shelf';
import HouseRules from './library/HouseRules';
import LIBRARY_CSS from './library/libraryStyles';
import { matchesBook } from '../data/libraryBooks';
import { useLibraryShelves } from '../cms/hooks';
import { adaptLibraryShelves } from '../cms/adapters';
import PageRenderer from '../blocks/PageRenderer';
import { useSiteContent } from '../context/SiteContent';

// Search input debounce — 200ms per spec so typing doesn't thrash
// the filter pipeline.
function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function Library() {
  const content = useSiteContent();
  if (content?.pages?.library?.use_blocks) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <PageRenderer pageKey="library" />
      </div>
    );
  }
  return <LibraryLegacy />;
}

function LibraryLegacy() {
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounced(query, 200);

  const { data: rows, loading } = useLibraryShelves();
  const shelves = useMemo(() => adaptLibraryShelves(rows), [rows]);

  const filteredShelves = useMemo(() => {
    return shelves.map((shelf) => ({
      ...shelf,
      visibleBooks: shelf.books.filter((b) =>
        matchesBook(b, { category, query: debouncedQuery }),
      ),
    }));
  }, [shelves, category, debouncedQuery]);

  const totalVisible = filteredShelves.reduce(
    (sum, s) => sum + s.visibleBooks.length,
    0,
  );

  // Phase-2 placeholder. Swap the alert for a modal once the
  // reservation flow is designed.
  const onReserve = (book) => {
    // eslint-disable-next-line no-alert
    window.alert(`Reserved \u201C${book.title}\u201D — pick up at the cafe within 48 hours.`);
  };

  // If the URL came in with a #shelf-xxx hash, scroll there once the
  // shelves have mounted. React Router doesn't do this automatically
  // for hash targets inside lazy-loaded routes.
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) {
      // Defer until after the paint so sticky nav offset works.
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, []);

  return (
    <div className="library-root">
      <style>{LIBRARY_CSS}</style>

      <LibraryHero />

      <div className="library-wrap">
        <StatsRow />

        <CategoryFilter
          category={category}
          onCategory={setCategory}
          query={query}
          onQuery={setQuery}
        />

        <FeaturedShelf />

        <div className="library-shelves">
          {loading && shelves.length === 0 ? (
            <div className="library-empty" aria-busy="true">
              <p>Loading shelves…</p>
            </div>
          ) : totalVisible === 0 ? (
            <div className="library-empty">
              <div className="library-empty-emoji" aria-hidden="true">📚</div>
              <h3>No books match your filters</h3>
              <p>Try a different category or clear the search.</p>
            </div>
          ) : (
            filteredShelves.map((shelf) => (
              <Shelf
                key={shelf.id}
                shelf={shelf}
                books={shelf.visibleBooks}
                onReserve={onReserve}
              />
            ))
          )}
        </div>

        <HouseRules />
      </div>
    </div>
  );
}
