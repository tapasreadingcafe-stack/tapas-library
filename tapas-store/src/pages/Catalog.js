import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useCart } from '../context/CartContext';
import { useSiteContent } from '../context/SiteContent';

// =====================================================================
// Catalog — 2025-2026 redesign
// Clean minimal layout with sticky filter bar, pill chips, modern cards
// with scale hover, skeleton loading states.
// =====================================================================

const GENRES = ['All', 'Fiction', 'Non-Fiction', 'Science', 'History', 'Children', 'Business', 'Travel', 'Arts', 'Biography', 'Mystery', 'Romance', 'Fantasy', 'Self-Help'];
const SORT_OPTIONS = [
  { value: 'title_asc',  label: 'Title A–Z' },
  { value: 'title_desc', label: 'Title Z–A' },
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
      textDecoration:'none', color:'inherit',
      padding:'16px', display:'flex', flexDirection:'column', gap:'14px', height:'100%',
    }}>
      <div style={{ display:'flex', justifyContent:'center' }}>
        <div style={{
          width:'160px', height:'220px',
          borderRadius:'var(--radius-md)', overflow:'hidden',
          background:'linear-gradient(145deg, #F5DEB3, #D4A853)',
          boxShadow:'0 12px 28px rgba(44,24,16,0.15), 0 0 0 1px rgba(44,24,16,0.04)',
          display:'flex', alignItems:'center', justifyContent:'center', position:'relative',
        }}>
          {src ? (
            <img src={src} alt={book.title} loading="lazy" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          ) : (
            <div style={{ textAlign:'center', padding:'14px' }}>
              <div style={{ fontSize:'40px', marginBottom:'4px' }}>📖</div>
              <div style={{ fontSize:'10px', color:'#8B6914', fontWeight:'700', textTransform:'uppercase', letterSpacing:'1px' }}>
                {book.genre || book.category || 'Book'}
              </div>
            </div>
          )}
          {!inStock && (
            <div style={{
              position:'absolute', inset:0, background:'rgba(15,23,42,0.55)', backdropFilter:'blur(2px)',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'#F5DEB3', fontSize:'11px', fontWeight:'800', textTransform:'uppercase', letterSpacing:'1.5px',
            }}>
              Sold Out
            </div>
          )}
        </div>
      </div>

      <div style={{ flex:1 }}>
        <h3 style={{ fontFamily:'var(--font-heading)', fontSize:'16px', fontWeight:'700', color:'var(--text)', lineHeight:'1.3', marginBottom:'4px', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {book.title}
        </h3>
        <p className="tps-subtle" style={{ fontSize:'13px', marginBottom:'10px', fontStyle:'italic' }}>{book.author}</p>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          {forSale ? (
            <span style={{ color:'var(--brand-accent)', fontWeight:'800', fontSize:'18px', fontFamily:'var(--font-heading)' }}>₹{book.sales_price}</span>
          ) : (
            <span className="tps-badge tps-badge-success">Borrow</span>
          )}
          {forSale && inStock && (
            <button
              onClick={handleAddToCart}
              className="tps-btn tps-btn-outline tps-btn-sm"
              style={{ padding:'6px 14px', fontSize:'11px' }}
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
    <div className="tps-card" style={{ padding:'16px', display:'flex', flexDirection:'column', gap:'14px' }}>
      <div className="tps-skeleton" style={{ width:'160px', height:'220px', margin:'0 auto', borderRadius:'var(--radius-md)' }} />
      <div>
        <div className="tps-skeleton" style={{ height:'16px', width:'90%', marginBottom:'8px' }} />
        <div className="tps-skeleton" style={{ height:'12px', width:'60%', marginBottom:'12px' }} />
        <div className="tps-skeleton" style={{ height:'18px', width:'40%' }} />
      </div>
    </div>
  );
}

export default function Catalog() {
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
      let query = supabase.from('books').select('*', { count:'exact' }).eq('store_visible', true);

      if (search) query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%,genre.ilike.%${search}%`);
      if (genre && genre !== 'All') query = query.ilike('genre', `%${genre}%`);
      if (availableOnly) query = query.gt('quantity_available', 0);

      if      (sort === 'title_asc')  query = query.order('title', { ascending:true });
      else if (sort === 'title_desc') query = query.order('title', { ascending:false });
      else if (sort === 'newest')     query = query.order('created_at', { ascending:false });
      else if (sort === 'available')  query = query.order('quantity_available', { ascending:false });

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
    <div style={{ maxWidth:'1280px', margin:'0 auto', padding:'56px 20px', fontFamily:'var(--font-body)' }}>

      {/* Editorial header */}
      <header style={{ marginBottom:'40px', textAlign:'center' }}>
        <div data-editable="catalog.header_eyebrow" className="tps-eyebrow" style={{ marginBottom:'14px' }}>
          {catalog.header_eyebrow || 'The Collection'}
        </div>
        <h1 data-editable="catalog.header_title" className="tps-h1" style={{ marginBottom:'14px' }}>
          {catalog.header_title || 'Every book on our shelves'}
        </h1>
        <p className="tps-subtle" style={{ fontSize:'16px', maxWidth:'560px', margin:'0 auto', lineHeight:'1.6' }}>
          {loading ? 'Loading…' : `${total} ${catalog.header_subtitle_suffix || 'titles curated by the Tapas team. Browse by genre or search for something specific.'}`}
        </p>
      </header>

      {/* Sticky filter card */}
      <div style={{
        position:'sticky', top:'72px', zIndex:10,
        background:'color-mix(in srgb, var(--bg) 90%, transparent)',
        backdropFilter:'blur(14px) saturate(180%)',
        WebkitBackdropFilter:'blur(14px) saturate(180%)',
        border:'1px solid var(--border)',
        borderRadius:'var(--radius-lg)',
        padding:'18px 20px',
        marginBottom:'36px',
        boxShadow:'var(--shadow-sm)',
      }}>
        <div style={{ display:'flex', gap:'14px', alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ flex:'1 1 280px', minWidth:'240px', position:'relative' }}>
            <span style={{ position:'absolute', left:'18px', top:'50%', transform:'translateY(-50%)', fontSize:'15px', pointerEvents:'none' }}>🔍</span>
            <input
              defaultValue={search}
              onKeyDown={e => { if (e.key === 'Enter') setParam('search', e.target.value); }}
              onBlur={e => setParam('search', e.target.value)}
              placeholder="Search title, author, or genre…"
              className="tps-input tps-input-pill"
              style={{ paddingLeft:'42px' }}
            />
          </div>

          <select
            value={sort}
            onChange={e => setParam('sort', e.target.value)}
            className="tps-select"
            style={{ borderRadius:'var(--radius-pill)', width:'auto', paddingRight:'36px', cursor:'pointer' }}
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <label style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', whiteSpace:'nowrap', color:'var(--text)', fontSize:'13px', fontWeight:'600' }}>
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={e => setParam('available', e.target.checked ? 'true' : 'false')}
              style={{ width:'18px', height:'18px', accentColor:'var(--brand-accent)', cursor:'pointer' }}
            />
            In stock only
          </label>

          {hasFilters && (
            <button onClick={clearFilters} className="tps-btn tps-btn-ghost tps-btn-sm" style={{ color:'var(--danger)' }}>
              Clear filters
            </button>
          )}
        </div>

        {/* Genre pills */}
        <div style={{ marginTop:'14px', display:'flex', flexWrap:'wrap', gap:'8px' }}>
          {GENRES.map(g => {
            const active = genre === g;
            return (
              <button key={g} onClick={() => setParam('genre', active ? 'All' : g)} style={{
                padding:'7px 16px', borderRadius:'var(--radius-pill)',
                border: active ? 'none' : '1.5px solid var(--border)',
                background: active ? 'var(--text)' : 'transparent',
                color: active ? 'var(--bg)' : 'var(--text-subtle)',
                fontWeight: active ? '800' : '600',
                cursor:'pointer', fontSize:'12px',
                transition:'all 200ms var(--ease)',
                fontFamily:'var(--font-body)', letterSpacing:'0.3px',
              }}
              onMouseEnter={(e) => { if (!active) { e.currentTarget.style.borderColor = 'var(--brand-accent)'; e.currentTarget.style.color = 'var(--text)'; } }}
              onMouseLeave={(e) => { if (!active) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-subtle)'; } }}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="tps-grid" style={{ gridTemplateColumns:'repeat(auto-fill, minmax(210px, 1fr))', gap:'16px', marginBottom:'56px' }}>
          {Array.from({ length: 8 }).map((_, i) => <BookTileSkeleton key={i} />)}
        </div>
      ) : books.length === 0 ? (
        <div style={{ textAlign:'center', padding:'80px 20px', color:'var(--text-subtle)' }}>
          <div style={{ fontSize:'64px', marginBottom:'16px' }}>🔍</div>
          <h3 className="tps-h3" style={{ marginBottom:'10px' }}>Nothing matched</h3>
          <p style={{ marginBottom:'20px' }}>Try adjusting your filters or search terms.</p>
          {hasFilters && (
            <button onClick={clearFilters} className="tps-btn tps-btn-primary">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="tps-grid" style={{ gridTemplateColumns:'repeat(auto-fill, minmax(210px, 1fr))', gap:'16px', marginBottom:'56px' }}>
            {books.map(book => <BookTile key={book.id} book={book} />)}
          </div>

          {/* Pagination */}
          {total > PER_PAGE && (
            <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'18px', paddingBottom:'20px' }}>
              <button
                onClick={() => setPage(p => Math.max(0, p-1))}
                disabled={page === 0}
                className="tps-btn tps-btn-secondary tps-btn-sm"
              >
                ← Prev
              </button>
              <span className="tps-subtle" style={{ fontSize:'14px', fontFamily:'var(--font-heading)', fontStyle:'italic' }}>
                Page {page + 1} of {Math.ceil(total / PER_PAGE)}
              </span>
              <button
                onClick={() => setPage(p => p+1)}
                disabled={(page+1) * PER_PAGE >= total}
                className="tps-btn tps-btn-secondary tps-btn-sm"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
