import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useCart } from '../context/CartContext';

// =====================================================================
// Catalog — editorial browse page inspired by powells.com.
// Sidebar filters on desktop, collapsible on mobile.
// Clean grid of book cards with cover-first presentation, minimal chrome.
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
    <Link to={`/books/${book.id}`} style={{ textDecoration:'none', color:'inherit' }}>
      <div style={{
        display:'flex', flexDirection:'column', gap:'14px',
        padding:'16px', borderRadius:'8px',
        transition:'background 0.2s',
        cursor:'pointer', height:'100%',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,222,179,0.4)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        <div style={{ display:'flex', justifyContent:'center' }}>
          <div style={{
            width:'160px', height:'220px',
            borderRadius:'4px', overflow:'hidden',
            background:'linear-gradient(145deg, #F5DEB3, #D4A853)',
            boxShadow:'0 10px 30px rgba(44,24,16,0.2), 0 0 0 1px rgba(44,24,16,0.05)',
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
                position:'absolute', inset:0, background:'rgba(44,24,16,0.55)',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'#F5DEB3', fontSize:'11px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'1px',
              }}>
                Sold Out
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 style={{ fontFamily:'"Playfair Display", serif', fontSize:'16px', fontWeight:'600', color:'#2C1810', lineHeight:'1.3', marginBottom:'4px', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
            {book.title}
          </h3>
          <p style={{ color:'#8B6914', fontSize:'13px', marginBottom:'8px', fontStyle:'italic' }}>{book.author}</p>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            {forSale ? (
              <span style={{ color:'#D4A853', fontWeight:'800', fontSize:'17px', fontFamily:'"Playfair Display", serif' }}>₹{book.sales_price}</span>
            ) : (
              <span style={{ color:'#48BB78', fontWeight:'600', fontSize:'12px', textTransform:'uppercase', letterSpacing:'0.5px' }}>Borrow only</span>
            )}
            {forSale && inStock && (
              <button
                onClick={handleAddToCart}
                style={{
                  background:'transparent', border:'1px solid #D4A853', color:'#8B6914',
                  padding:'5px 12px', borderRadius:'50px',
                  fontWeight:'700', fontSize:'11px', cursor:'pointer',
                  fontFamily:'Lato, sans-serif', letterSpacing:'0.5px', textTransform:'uppercase',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#D4A853'; e.currentTarget.style.color = '#2C1810'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8B6914'; }}
              >
                + Cart
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Catalog() {
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
    <div style={{ maxWidth:'1280px', margin:'0 auto', padding:'60px 20px', fontFamily:'Lato, sans-serif' }}>

      {/* Editorial header */}
      <header style={{ marginBottom:'48px', textAlign:'center' }}>
        <div style={{ fontSize:'11px', fontWeight:'800', color:'#D4A853', textTransform:'uppercase', letterSpacing:'2.5px', marginBottom:'12px' }}>
          The Collection
        </div>
        <h1 style={{ fontFamily:'"Playfair Display", serif', fontSize:'clamp(36px, 5vw, 52px)', fontWeight:'800', color:'#2C1810', marginBottom:'12px', lineHeight:'1.1' }}>
          Every book on our shelves
        </h1>
        <p style={{ color:'#8B6914', fontSize:'16px', maxWidth:'540px', margin:'0 auto', lineHeight:'1.6' }}>
          {loading ? 'Loading…' : `${total} titles curated by the Tapas team. Browse by genre or search for something specific.`}
        </p>
      </header>

      {/* Sticky filter strip */}
      <div style={{
        position:'sticky', top:'70px', zIndex:10,
        background:'rgba(253,248,240,0.95)', backdropFilter:'blur(10px)',
        borderBottom:'1px solid rgba(212,168,83,0.3)',
        padding:'20px 0', marginBottom:'40px',
      }}>
        <div style={{ display:'flex', gap:'16px', alignItems:'center', flexWrap:'wrap' }}>
          {/* Search */}
          <div style={{ flex:'1 1 260px', minWidth:'240px' }}>
            <input
              defaultValue={search}
              onKeyDown={e => { if (e.key === 'Enter') setParam('search', e.target.value); }}
              onBlur={e => setParam('search', e.target.value)}
              placeholder="Search title, author, or genre…"
              style={{
                width:'100%', padding:'12px 18px',
                border:'1px solid rgba(212,168,83,0.4)', borderRadius:'50px',
                fontSize:'14px', outline:'none', fontFamily:'Lato, sans-serif',
                background:'white', color:'#2C1810', boxSizing:'border-box',
              }}
              onFocus={e => e.target.style.borderColor = '#D4A853'}
            />
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={e => setParam('sort', e.target.value)}
            style={{
              padding:'12px 18px',
              border:'1px solid rgba(212,168,83,0.4)', borderRadius:'50px',
              fontSize:'14px', outline:'none', background:'white',
              fontFamily:'Lato, sans-serif', color:'#2C1810', cursor:'pointer',
            }}
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Available toggle */}
          <label style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', whiteSpace:'nowrap', color:'#2C1810', fontSize:'14px', fontWeight:'600' }}>
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={e => setParam('available', e.target.checked ? 'true' : 'false')}
              style={{ width:'18px', height:'18px', accentColor:'#D4A853', cursor:'pointer' }}
            />
            In stock only
          </label>

          {hasFilters && (
            <button onClick={clearFilters} style={{
              padding:'10px 18px', border:'none', background:'transparent',
              color:'#9B2335', fontWeight:'700', cursor:'pointer',
              fontFamily:'Lato, sans-serif', fontSize:'13px', textDecoration:'underline',
            }}>
              Clear filters
            </button>
          )}
        </div>

        {/* Genre pills */}
        <div style={{ marginTop:'16px', display:'flex', flexWrap:'wrap', gap:'8px' }}>
          {GENRES.map(g => {
            const active = genre === g;
            return (
              <button key={g} onClick={() => setParam('genre', active ? 'All' : g)} style={{
                padding:'6px 16px', borderRadius:'20px',
                border: active ? 'none' : '1px solid rgba(212,168,83,0.4)',
                background: active ? '#2C1810' : 'transparent',
                color: active ? '#F5DEB3' : '#8B6914',
                fontWeight: active ? '700' : '500',
                cursor:'pointer', fontSize:'12px', transition:'all 0.15s',
                fontFamily:'Lato, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px',
              }}>
                {g}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'80px 20px', color:'#8B6914' }}>
          <div style={{ fontSize:'40px', marginBottom:'16px' }}>📚</div>
          Loading books…
        </div>
      ) : books.length === 0 ? (
        <div style={{ textAlign:'center', padding:'80px 20px', color:'#8B6914' }}>
          <div style={{ fontSize:'56px', marginBottom:'16px' }}>🔍</div>
          <h3 style={{ fontFamily:'"Playfair Display", serif', fontSize:'24px', color:'#2C1810', marginBottom:'8px' }}>Nothing matched</h3>
          <p>Try adjusting your filters or search terms.</p>
          {hasFilters && (
            <button onClick={clearFilters} style={{
              marginTop:'16px', padding:'12px 28px',
              background:'linear-gradient(135deg, #D4A853, #C49040)', color:'#2C1810',
              border:'none', borderRadius:'50px', fontWeight:'700', cursor:'pointer',
              fontFamily:'Lato, sans-serif', fontSize:'14px',
            }}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(210px, 1fr))', gap:'12px', marginBottom:'56px' }}>
            {books.map(book => <BookTile key={book.id} book={book} />)}
          </div>

          {/* Pagination */}
          {total > PER_PAGE && (
            <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'20px', paddingBottom:'20px' }}>
              <button
                onClick={() => setPage(p => Math.max(0, p-1))}
                disabled={page === 0}
                style={{
                  padding:'10px 24px', borderRadius:'50px',
                  border:'1px solid rgba(212,168,83,0.4)',
                  background: page === 0 ? '#f5f5f5' : 'white',
                  cursor: page === 0 ? 'not-allowed' : 'pointer',
                  color: page === 0 ? '#ccc' : '#8B6914',
                  fontWeight:'600', fontFamily:'Lato, sans-serif', fontSize:'13px',
                }}
              >
                ← Prev
              </button>
              <span style={{ color:'#8B6914', fontSize:'14px', fontFamily:'"Playfair Display", serif', fontStyle:'italic' }}>
                Page {page + 1} of {Math.ceil(total / PER_PAGE)}
              </span>
              <button
                onClick={() => setPage(p => p+1)}
                disabled={(page+1) * PER_PAGE >= total}
                style={{
                  padding:'10px 24px', borderRadius:'50px',
                  border:'1px solid rgba(212,168,83,0.4)',
                  background: (page+1)*PER_PAGE >= total ? '#f5f5f5' : 'white',
                  cursor: (page+1)*PER_PAGE >= total ? 'not-allowed' : 'pointer',
                  color: (page+1)*PER_PAGE >= total ? '#ccc' : '#8B6914',
                  fontWeight:'600', fontFamily:'Lato, sans-serif', fontSize:'13px',
                }}
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
