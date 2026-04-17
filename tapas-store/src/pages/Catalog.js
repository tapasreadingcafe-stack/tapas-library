import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useCart } from '../context/CartContext';
import { useSiteContent } from '../context/SiteContent';
import PageRenderer from '../blocks/PageRenderer';
import { findPageByPath, NotFound } from '../utils/findPage';

// =====================================================================
// Catalog — Modern Heritage design system
// Parchment bg, Newsreader headings, ambient shadows, no hard borders,
// tps-chip pills, tps-card-interactive tiles, tps-input bottom-line.
// =====================================================================

const GENRES = ['All', 'Fiction', 'Non-Fiction', 'Science', 'History', 'Children', 'Business', 'Travel', 'Arts', 'Biography', 'Mystery', 'Romance', 'Fantasy', 'Self-Help'];
const SORT_OPTIONS = [
  { value: 'title_asc',  label: 'Title A\u2013Z' },
  { value: 'title_desc', label: 'Title Z\u2013A' },
  { value: 'newest',     label: 'Recently added' },
  { value: 'available',  label: 'In stock first' },
];

const PER_PAGE = 24;

function BookTile({ book }) {
  const { addBook } = useCart();
  const inStock = book.quantity_available > 0;
  const forSale = Number(book.sales_price || 0) > 0;
  const src = book.book_image || book.cover_image;

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addBook(book, 1);
  };

  return (
    <Link to={`/books/${book.id}`} className="tps-card tps-card-interactive" style={{
      textDecoration: 'none', color: 'inherit',
      padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%',
      background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
      border: 'none', boxShadow: 'var(--shadow-ambient)',
    }}>
      {/* Cover */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: '160px', height: '220px',
          borderRadius: 'var(--radius-md)', overflow: 'hidden',
          background: 'linear-gradient(160deg, #ede8d0, #d4c9a8)',
          boxShadow: '0 16px 48px rgba(38,23,12,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
        }}>
          {src ? (
            <img src={src} alt={book.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ textAlign: 'center', padding: '14px' }}>
              <div style={{ fontSize: '40px', marginBottom: '4px' }}>📖</div>
              <div style={{
                fontSize: '10px', color: 'var(--text-subtle)', fontWeight: '700',
                textTransform: 'uppercase', letterSpacing: '1px',
                fontFamily: 'var(--font-body)',
              }}>
                {book.genre || book.category || 'Book'}
              </div>
            </div>
          )}
          {!inStock && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(38,23,12,0.6)', backdropFilter: 'blur(2px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fbfbe2', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px',
              fontFamily: 'var(--font-body)',
            }}>
              Sold Out
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div style={{ flex: 1 }}>
        <h3 style={{
          fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: '700',
          color: 'var(--text)', lineHeight: 1.3, marginBottom: '4px',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {book.title}
        </h3>
        <p style={{
          fontSize: '13px', marginBottom: '12px', fontStyle: 'italic',
          color: 'var(--text-muted)', fontFamily: 'var(--font-body)',
        }}>
          {book.author}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {forSale ? (
            <span style={{
              color: 'var(--accent)', fontWeight: '800', fontSize: '18px',
              fontFamily: 'var(--font-display)',
            }}>
              ₹{book.sales_price}
            </span>
          ) : (
            <span className="tps-chip tps-chip-teal" style={{ fontSize: '11px' }}>Borrow</span>
          )}
          {forSale && inStock && (
            <button
              onClick={handleAddToCart}
              className="tps-btn tps-btn-teal"
              style={{ padding: '6px 14px', fontSize: '11px' }}
            >
              + Cart
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}

function BookTileSkeleton() {
  return (
    <div style={{
      padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px',
      background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-ambient)',
    }}>
      <div className="tps-skeleton" style={{ width: '160px', height: '220px', margin: '0 auto', borderRadius: 'var(--radius-md)' }} />
      <div>
        <div className="tps-skeleton" style={{ height: '16px', width: '90%', marginBottom: '8px', borderRadius: '4px' }} />
        <div className="tps-skeleton" style={{ height: '12px', width: '60%', marginBottom: '12px', borderRadius: '4px' }} />
        <div className="tps-skeleton" style={{ height: '18px', width: '40%', borderRadius: '4px' }} />
      </div>
    </div>
  );
}

export default function Catalog() {
  const content = useSiteContent();
  const matchKey = findPageByPath(content?.pages, '/books');
  if (matchKey) {
    const blocks = content.pages[matchKey].blocks;
    if (Array.isArray(blocks) && blocks.length > 0) {
      return <PageRenderer pageKey={matchKey} />;
    }
    if (matchKey === 'catalog') return <LegacyCatalog />;
    return null;
  }
  return <NotFound path="/books" />;
}

function LegacyCatalog() {
  const content = useSiteContent();
  const catalog = content.catalog || {};
  const [searchParams, setSearchParams] = useSearchParams();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  const search        = searchParams.get('search') || '';
  const genre         = searchParams.get('genre')  || 'All';
  const sort          = searchParams.get('sort')   || 'newest';
  const availableOnly = searchParams.get('available') === 'true';

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('books').select('*', { count: 'exact' }).eq('store_visible', true);

      if (search) query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%,genre.ilike.%${search}%`);
      if (genre && genre !== 'All') query = query.ilike('genre', `%${genre}%`);
      if (availableOnly) query = query.gt('quantity_available', 0);

      if      (sort === 'title_asc')  query = query.order('title', { ascending: true });
      else if (sort === 'title_desc') query = query.order('title', { ascending: false });
      else if (sort === 'newest')     query = query.order('created_at', { ascending: false });
      else if (sort === 'available')  query = query.order('quantity_available', { ascending: false });

      query = query.range(page * PER_PAGE, (page + 1) * PER_PAGE - 1);

      const { data, count, error } = await query;
      if (error) throw error;
      setBooks(data || []);
      setTotal(count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, genre, sort, availableOnly, page]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  const setParam = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'All' && value !== 'false') params.set(key, value);
    else params.delete(key);
    setPage(0);
    setSearchParams(params);
  };

  const clearFilters = () => {
    setPage(0);
    setSearchParams({});
  };

  const hasFilters = search || (genre && genre !== 'All') || availableOnly;

  return (
    <div style={{
      maxWidth: '1280px', margin: '0 auto',
      padding: '96px 24px', fontFamily: 'var(--font-body)',
    }}>

      {/* Editorial header */}
      <header style={{ marginBottom: '64px', textAlign: 'center' }}>
        <div data-editable="catalog.header_eyebrow" className="tps-eyebrow" style={{
          marginBottom: '16px', color: 'var(--text-subtle)',
          fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: '700',
          textTransform: 'uppercase', letterSpacing: '2.5px',
        }}>
          {catalog.header_eyebrow || 'The Collection'}
        </div>
        <h1 data-editable="catalog.header_title" className="tps-h1" style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(36px, 5vw, 56px)',
          fontWeight: '700', color: 'var(--text)', lineHeight: 1.05,
          marginBottom: '18px', letterSpacing: '-0.02em',
        }}>
          {catalog.header_title || 'Every book on our shelves'}
        </h1>
        <p style={{
          fontSize: '17px', maxWidth: '560px', margin: '0 auto', lineHeight: 1.7,
          color: 'var(--text-muted)', fontFamily: 'var(--font-body)',
        }}>
          {loading ? 'Loading\u2026' : `${total} ${catalog.header_subtitle_suffix || 'titles curated by the Tapas team. Browse by genre or search for something specific.'}`}
        </p>
      </header>

      {/* Sticky filter bar */}
      <div style={{
        position: 'sticky', top: '72px', zIndex: 10,
        background: 'color-mix(in srgb, var(--bg-card) 92%, transparent)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        marginBottom: '48px',
        boxShadow: 'var(--shadow-ambient)',
      }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ flex: '1 1 280px', minWidth: '240px', position: 'relative' }}>
            <span style={{
              position: 'absolute', left: '0', top: '50%', transform: 'translateY(-50%)',
              fontSize: '15px', pointerEvents: 'none', color: 'var(--text-subtle)',
            }}>
              🔍
            </span>
            <input
              defaultValue={search}
              onKeyDown={e => { if (e.key === 'Enter') setParam('search', e.target.value); }}
              onBlur={e => setParam('search', e.target.value)}
              placeholder="Search title, author, or genre\u2026"
              className="tps-input"
              style={{ paddingLeft: '32px', fontFamily: 'var(--font-body)' }}
            />
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={e => setParam('sort', e.target.value)}
            className="tps-input"
            style={{
              width: 'auto', paddingRight: '36px', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: '14px',
              color: 'var(--text)', background: 'transparent',
            }}
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* In stock checkbox */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
            whiteSpace: 'nowrap', color: 'var(--text)', fontSize: '13px', fontWeight: '600',
            fontFamily: 'var(--font-body)',
          }}>
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={e => setParam('available', e.target.checked ? 'true' : 'false')}
              style={{ width: '18px', height: '18px', accentColor: 'var(--secondary)', cursor: 'pointer' }}
            />
            In stock only
          </label>

          {hasFilters && (
            <button onClick={clearFilters} className="tps-btn tps-btn-ghost" style={{
              color: 'var(--text-subtle)', fontSize: '13px', fontFamily: 'var(--font-body)',
            }}>
              Clear filters
            </button>
          )}
        </div>

        {/* Genre pills */}
        <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {GENRES.map(g => {
            const active = genre === g;
            return (
              <button
                key={g}
                onClick={() => setParam('genre', active ? 'All' : g)}
                className={active ? '' : 'tps-chip tps-chip-truffle'}
                style={{
                  padding: '7px 18px', borderRadius: 'var(--radius-pill)',
                  border: 'none',
                  background: active ? 'var(--text)' : undefined,
                  color: active ? 'var(--bg)' : undefined,
                  fontWeight: active ? '800' : '600',
                  cursor: 'pointer', fontSize: '12px',
                  transition: 'all 200ms ease',
                  fontFamily: 'var(--font-body)', letterSpacing: '0.3px',
                }}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '24px', marginBottom: '96px',
        }}>
          {Array.from({ length: 8 }).map((_, i) => <BookTileSkeleton key={i} />)}
        </div>
      ) : books.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '96px 20px', color: 'var(--text-subtle)' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔍</div>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: '700',
            color: 'var(--text)', marginBottom: '12px',
          }}>
            Nothing matched
          </h3>
          <p style={{
            marginBottom: '28px', color: 'var(--text-muted)',
            fontFamily: 'var(--font-body)', fontSize: '16px', lineHeight: 1.6,
          }}>
            Try adjusting your filters or search terms.
          </p>
          {hasFilters && (
            <button onClick={clearFilters} className="tps-btn tps-btn-primary">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '24px', marginBottom: '96px',
          }}>
            {books.map(book => <BookTile key={book.id} book={book} />)}
          </div>

          {/* Pagination */}
          {total > PER_PAGE && (
            <div style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              gap: '24px', paddingBottom: '32px',
            }}>
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="tps-btn tps-btn-ghost"
                style={{ fontFamily: 'var(--font-body)', fontSize: '14px' }}
              >
                \u2190 Prev
              </button>
              <span style={{
                fontSize: '15px', fontFamily: 'var(--font-display)',
                fontStyle: 'italic', color: 'var(--text-muted)',
              }}>
                Page {page + 1} of {Math.ceil(total / PER_PAGE)}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * PER_PAGE >= total}
                className="tps-btn tps-btn-ghost"
                style={{ fontFamily: 'var(--font-body)', fontSize: '14px' }}
              >
                Next \u2192
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
