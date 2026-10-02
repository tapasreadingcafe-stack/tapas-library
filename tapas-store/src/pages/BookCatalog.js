import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import PageBreadcrumb from '../components/PageBreadcrumb';
import { supabase } from '../utils/supabase';
import { CAFE_LINKS } from '../data/cafeDetails';

// The real library catalogue, read straight from the `books` table the staff
// dashboard maintains.
//
// Covers matter for load: ~half the books still keep their cover as an inline
// base64 string in `book_image` (~120 KB each), so the list query never asks
// for it. Each page of books is fetched narrow, then covers are fetched for
// just that page's ids. Never select('*') here — see the Supabase OOM notes.

const PAGE_SIZE = 24;
const MIN_CATEGORY_COUNT = 5; // smaller categories still show under "All"

const GREEN = '#3f6b1f';
const LIME = '#caf27e';
const ON_LIME = '#23350c';
const INK = '#3a3a3a';
const PURPLE = '#8A58DB';

const LIST_COLUMNS = 'id, title, author, category, quantity_available';

// Strip characters that would break a PostgREST or() filter.
function cleanQuery(q) {
  return q.replace(/[,()*%\\]/g, ' ').trim();
}

function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// Category values in the table are hand-typed ("Children" and "Children "),
// so group them by their trimmed name and keep every raw spelling.
async function fetchCategories() {
  const raw = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('books')
      .select('category')
      .eq('is_borrowable', true)
      .range(from, from + 999);
    if (error || !data) break;
    raw.push(...data);
    if (data.length < 1000) break;
  }
  const groups = new Map();
  raw.forEach(({ category }) => {
    const name = (category || '').trim();
    if (!name) return;
    const g = groups.get(name) || { name, count: 0, spellings: new Set() };
    g.count += 1;
    g.spellings.add(category);
    groups.set(name, g);
  });
  return [...groups.values()]
    .filter((g) => g.count >= MIN_CATEGORY_COUNT)
    .sort((a, b) => b.count - a.count)
    .map((g) => ({ ...g, spellings: [...g.spellings] }));
}

const CSS = `
  .bc-page { background: #fff; font-family: 'Poppins', system-ui, sans-serif; color: ${INK}; }
  .bc-wrap { max-width: 1320px; margin: 0 auto; padding: 8px 64px 96px; }
  .bc-intro { max-width: 640px; margin: 0 0 28px; font-size: 15px; line-height: 1.6; color: #555; }

  .bc-controls { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 16px; }
  .bc-search { flex: 1 1 280px; position: relative; }
  .bc-search input {
    width: 100%; box-sizing: border-box; padding: 12px 16px 12px 42px;
    border: 1.5px solid #e2e2e2; border-radius: 999px; font: inherit; font-size: 15px; color: ${INK};
    background: #fafafa; outline: none; transition: border-color 150ms, background 150ms;
  }
  .bc-search input:focus { border-color: ${GREEN}; background: #fff; }
  .bc-search svg { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); width: 18px; height: 18px; color: #999; }
  .bc-avail {
    display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 999px;
    border: 1.5px solid #e2e2e2; background: #fff; font: inherit; font-size: 14px; font-weight: 500;
    color: ${INK}; cursor: pointer; white-space: nowrap;
  }
  .bc-avail[aria-pressed="true"] { background: ${LIME}; border-color: ${LIME}; color: ${ON_LIME}; }
  .bc-avail .dot { width: 8px; height: 8px; border-radius: 50%; background: #2f9e44; }

  .bc-cats { display: flex; gap: 8px; overflow-x: auto; padding: 4px 0 12px; margin-bottom: 8px; scrollbar-width: none; }
  .bc-cats::-webkit-scrollbar { display: none; }
  .bc-cat {
    flex: 0 0 auto; padding: 8px 16px; border-radius: 999px; border: 1px solid #e6e6e6; background: #fff;
    font: inherit; font-size: 13px; font-weight: 500; color: #555; cursor: pointer; transition: all 150ms;
  }
  .bc-cat:hover { border-color: ${GREEN}; color: ${GREEN}; }
  .bc-cat.is-active { background: ${GREEN}; border-color: ${GREEN}; color: #fff; }

  .bc-count { font-size: 13px; color: #888; margin: 0 0 18px; min-height: 18px; }

  .bc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 28px 22px; }
  .bc-card { all: unset; cursor: pointer; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
  .bc-card:focus-visible { outline: 2px solid ${GREEN}; outline-offset: 4px; border-radius: 8px; }
  .bc-cover {
    position: relative; aspect-ratio: 2 / 3; border-radius: 8px; overflow: hidden; background: #f1efe9;
    box-shadow: 0 2px 10px rgba(0,0,0,0.08); transition: transform 200ms, box-shadow 200ms;
  }
  .bc-card:hover .bc-cover { transform: translateY(-3px); box-shadow: 0 8px 22px rgba(0,0,0,0.12); }
  .bc-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .bc-cover-blank {
    position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; gap: 6px;
    padding: 14px; background: linear-gradient(160deg, #eef5e3, #dfe9cf); color: ${ON_LIME};
  }
  .bc-cover-blank .t { font-family: 'DM Serif Display', Georgia, serif; font-size: 17px; line-height: 1.2;
    display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
  .bc-cover-blank .a { font-size: 11px; opacity: 0.75; }
  .bc-badge {
    position: absolute; left: 8px; top: 8px; padding: 3px 9px; border-radius: 999px;
    font-size: 11px; font-weight: 600; letter-spacing: 0.02em; backdrop-filter: blur(4px);
  }
  .bc-badge.in  { background: rgba(202,242,126,0.95); color: ${ON_LIME}; }
  .bc-badge.out { background: rgba(255,255,255,0.92); color: #777; }
  .bc-title { font-size: 14px; font-weight: 600; line-height: 1.35; color: #1a1a1a;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .bc-author { font-size: 12.5px; color: #888; margin-top: -4px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .bc-skel .bc-cover { animation: bc-pulse 1.4s ease-in-out infinite; box-shadow: none; }
  .bc-skel .bar { height: 12px; border-radius: 6px; background: #f1efe9; animation: bc-pulse 1.4s ease-in-out infinite; }
  @keyframes bc-pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.55 } }

  .bc-more { display: flex; justify-content: center; margin-top: 40px; }
  .bc-more button {
    padding: 13px 34px; border-radius: 999px; border: none; background: ${GREEN}; color: #fff;
    font: inherit; font-size: 15px; font-weight: 600; cursor: pointer;
  }
  .bc-more button:disabled { opacity: 0.6; cursor: default; }
  .bc-empty { text-align: center; padding: 60px 20px; color: #888; }
  .bc-empty h3 { margin: 10px 0 6px; color: ${INK}; font-weight: 600; }
  .bc-empty button { margin-top: 14px; background: none; border: none; color: ${GREEN}; font: inherit; font-weight: 600; cursor: pointer; text-decoration: underline; }

  /* Pop-up */
  .bc-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(20,20,20,0.55);
    display: flex; align-items: center; justify-content: center; padding: 16px; animation: bc-fade 150ms ease-out; }
  @keyframes bc-fade { from { opacity: 0 } to { opacity: 1 } }
  .bc-modal { position: relative; background: #fff; border-radius: 16px; width: 100%; max-width: 640px; max-height: calc(100vh - 32px);
    overflow-y: auto; display: grid; grid-template-columns: 200px 1fr; gap: 26px; padding: 28px; box-sizing: border-box;
    box-shadow: 0 24px 60px rgba(0,0,0,0.25); }
  .bc-modal .bc-cover { box-shadow: 0 6px 18px rgba(0,0,0,0.12); }
  .bc-close { position: absolute; right: 12px; top: 10px; width: 36px; height: 36px; border-radius: 50%;
    border: none; background: #f3f3f3; color: #555; font-size: 20px; line-height: 1; cursor: pointer; }
  .bc-m-cat { font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: ${PURPLE}; margin-bottom: 8px; }
  .bc-m-title { font-family: 'DM Serif Display', Georgia, serif; font-weight: 400; font-size: 28px; line-height: 1.15; color: #1a1a1a; margin: 0 0 6px; padding-right: 30px; }
  .bc-m-author { font-size: 15px; color: #666; margin: 0 0 18px; }
  .bc-m-status { display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px; border-radius: 999px; font-size: 13px; font-weight: 600; margin-bottom: 18px; }
  .bc-m-status.in  { background: #eef9e0; color: ${GREEN}; }
  .bc-m-status.out { background: #f3f3f3; color: #777; }
  .bc-m-status .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
  .bc-m-note { font-size: 14px; line-height: 1.6; color: #555; margin: 0 0 20px; }
  .bc-m-actions { display: flex; flex-wrap: wrap; gap: 10px; }
  .bc-btn { display: inline-flex; align-items: center; justify-content: center; padding: 11px 20px; border-radius: 999px;
    font-size: 14px; font-weight: 600; text-decoration: none; }
  .bc-btn.primary { background: ${GREEN}; color: #fff; }
  .bc-btn.ghost { border: 1.5px solid #ddd; color: ${INK}; }

  @media (max-width: 1023px) {
    .bc-wrap { padding: 8px 40px 80px; }
  }
  @media (max-width: 639px) {
    .bc-wrap { padding: 4px 16px 64px; }
    .bc-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px 14px; }
    .bc-modal { grid-template-columns: 1fr; padding: 22px 18px; gap: 18px; }
    .bc-modal .bc-cover { width: 150px; margin: 0 auto; }
    .bc-m-title { font-size: 24px; }
  }
`;

function Cover({ book, cover, children }) {
  // Open Library answers a missing cover with a 1x1 image rather than an
  // error, so treat a tiny image as no cover too.
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [cover]);
  return (
    <div className="bc-cover">
      {cover && !broken ? (
        <img
          src={cover}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
          onLoad={(e) => { if (e.currentTarget.naturalWidth < 10) setBroken(true); }}
        />
      ) : (
        <div className="bc-cover-blank" aria-hidden="true">
          <span className="t">{book.title}</span>
          {book.author && <span className="a">{book.author}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

const isIn = (book) => Number(book.quantity_available) > 0;

function BookModal({ book, cover, onClose }) {
  const closeRef = useRef(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const available = isIn(book);
  const ask = `Hi Tapas Reading Cafe! Is "${book.title}"${book.author ? ` by ${book.author}` : ''} available to borrow?`;

  return (
    <div className="bc-overlay" onClick={onClose}>
      <div className="bc-modal" role="dialog" aria-modal="true" aria-labelledby="bc-m-title" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} type="button" className="bc-close" onClick={onClose} aria-label="Close">×</button>
        <Cover book={book} cover={cover} />
        <div>
          {book.category && <div className="bc-m-cat">{book.category.trim()}</div>}
          <h2 id="bc-m-title" className="bc-m-title">{book.title}</h2>
          {book.author && <p className="bc-m-author">by {book.author}</p>}
          <div className={`bc-m-status ${available ? 'in' : 'out'}`}>
            <span className="dot" /> {available ? 'On the shelf now' : 'Currently borrowed'}
          </div>
          <p className="bc-m-note">
            {available
              ? 'Members can borrow up to 2 books at a time. Drop by the café to pick it up.'
              : 'Someone is reading this one right now. Ask us and we’ll let you know when it’s back.'}
          </p>
          <div className="bc-m-actions">
            <a className="bc-btn primary" href={`${CAFE_LINKS.whatsapp}?text=${encodeURIComponent(ask)}`} target="_blank" rel="noopener noreferrer">
              Ask on WhatsApp
            </a>
            <Link className="bc-btn ghost" to="/#membership" onClick={onClose}>Membership plans</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookCatalog() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounced(query, 300);
  const [category, setCategory] = useState(null); // null = All
  const [availableOnly, setAvailableOnly] = useState(false);
  const [categories, setCategories] = useState([]);

  const [books, setBooks] = useState([]);
  const [covers, setCovers] = useState({});
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState(null);
  const requestId = useRef(0);

  useEffect(() => { fetchCategories().then(setCategories).catch(() => {}); }, []);

  const activeCategory = useMemo(
    () => categories.find((c) => c.name === category) || null,
    [categories, category],
  );

  const fetchPage = useCallback(async (from) => {
    let q = supabase
      .from('books')
      .select(LIST_COLUMNS, { count: 'exact' })
      .eq('is_borrowable', true)
      .order('title', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    const term = cleanQuery(debouncedQuery);
    if (term) q = q.or(`title.ilike.*${term}*,author.ilike.*${term}*`);
    if (activeCategory) q = q.in('category', activeCategory.spellings);
    if (availableOnly) q = q.gt('quantity_available', 0);
    const { data, count, error: err } = await q;
    if (err) throw err;
    return { rows: data || [], count: count ?? 0 };
  }, [debouncedQuery, activeCategory, availableOnly]);

  const loadCovers = useCallback(async (rows) => {
    const ids = rows.map((r) => r.id);
    if (!ids.length) return;
    const { data } = await supabase.from('books').select('id, book_image').in('id', ids);
    if (!data) return;
    setCovers((prev) => {
      const next = { ...prev };
      data.forEach((r) => { next[r.id] = r.book_image || null; });
      return next;
    });
  }, []);

  // First page whenever the filters change.
  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError(false);
    fetchPage(0)
      .then(({ rows, count }) => {
        if (id !== requestId.current) return;
        setBooks(rows);
        setTotal(count);
        loadCovers(rows);
      })
      .catch(() => { if (id === requestId.current) setError(true); })
      .finally(() => { if (id === requestId.current) setLoading(false); });
  }, [fetchPage, loadCovers]);

  const loadMore = async () => {
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const { rows, count } = await fetchPage(books.length);
      if (id !== requestId.current) return;
      setBooks((prev) => [...prev, ...rows]);
      setTotal(count);
      loadCovers(rows);
    } catch {
      setError(true);
    } finally {
      setLoadingMore(false);
    }
  };

  const closeModal = useCallback(() => setSelected(null), []);
  const clearFilters = () => { setQuery(''); setCategory(null); setAvailableOnly(false); };
  const hasMore = total !== null && books.length < total;

  return (
    <div className="bc-page">
      <style>{CSS}</style>
      <PageBreadcrumb name="Library" />
      <div className="bc-wrap">
        <p className="bc-intro">
          Every book on our shelves, free to borrow for members. Search by title or author,
          or browse by category. Tap a book to see if it&rsquo;s in.
        </p>

        <div className="bc-controls">
          <label className="bc-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title or author"
              aria-label="Search books by title or author"
            />
          </label>
          <button
            type="button"
            className="bc-avail"
            aria-pressed={availableOnly}
            onClick={() => setAvailableOnly((v) => !v)}
          >
            <span className="dot" aria-hidden="true" /> Available now
          </button>
        </div>

        {categories.length > 0 && (
          <div className="bc-cats" role="group" aria-label="Filter by category">
            <button type="button" className={`bc-cat${category === null ? ' is-active' : ''}`} aria-pressed={category === null} onClick={() => setCategory(null)}>All</button>
            {categories.map((c) => (
              <button
                key={c.name}
                type="button"
                className={`bc-cat${category === c.name ? ' is-active' : ''}`}
                aria-pressed={category === c.name}
                onClick={() => setCategory(c.name)}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        <p className="bc-count" aria-live="polite">
          {!loading && !error && total !== null && `${total.toLocaleString('en-IN')} ${total === 1 ? 'book' : 'books'}`}
        </p>

        {error && books.length === 0 ? (
          <div className="bc-empty">
            <h3>Couldn&rsquo;t load the catalogue</h3>
            <p>Check your connection and try again.</p>
            <button type="button" onClick={() => window.location.reload()}>Reload</button>
          </div>
        ) : loading ? (
          <div className="bc-grid" aria-busy="true">
            {Array.from({ length: 12 }).map((_, i) => (
              <div className="bc-card bc-skel" key={i}>
                <div className="bc-cover" />
                <div className="bar" style={{ width: '85%' }} />
                <div className="bar" style={{ width: '55%' }} />
              </div>
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="bc-empty">
            <div style={{ fontSize: 40 }} aria-hidden="true">📚</div>
            <h3>No books match</h3>
            <p>Try another search or category.</p>
            <button type="button" onClick={clearFilters}>Clear filters</button>
          </div>
        ) : (
          <>
            <div className="bc-grid">
              {books.map((b) => (
                <button type="button" className="bc-card" key={b.id} onClick={() => setSelected(b)}>
                  <Cover book={b} cover={covers[b.id]}>
                    <span className={`bc-badge ${isIn(b) ? 'in' : 'out'}`}>{isIn(b) ? 'Available' : 'Borrowed'}</span>
                  </Cover>
                  <span className="bc-title">{b.title}</span>
                  {b.author && <span className="bc-author">{b.author}</span>}
                </button>
              ))}
            </div>
            {hasMore && (
              <div className="bc-more">
                <button type="button" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? 'Loading…' : 'Show more books'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selected && <BookModal book={selected} cover={covers[selected.id]} onClose={closeModal} />}
    </div>
  );
}
