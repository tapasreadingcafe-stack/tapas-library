import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';

const GENRES = ['All', 'Fiction', 'Non-Fiction', 'Science', 'History', 'Children', 'Business', 'Travel', 'Arts', 'Biography', 'Mystery', 'Romance', 'Fantasy', 'Self-Help'];
const SORT_OPTIONS = [
  { value:'title_asc', label:'Title A–Z' },
  { value:'title_desc', label:'Title Z–A' },
  { value:'newest', label:'Newest First' },
  { value:'available', label:'Available First' },
];

function BookCard({ book }) {
  const available = book.quantity_available > 0;
  return (
    <Link to={`/books/${book.id}`} style={{ textDecoration:'none', color:'inherit' }}>
      <div style={{
        background:'white', borderRadius:'12px', overflow:'hidden',
        boxShadow:'0 3px 12px rgba(0,0,0,0.08)', transition:'all 0.25s',
        cursor:'pointer', display:'flex', flexDirection:'column', height:'100%'
      }}
        onMouseEnter={e => { e.currentTarget.style.transform='translateY(-5px)'; e.currentTarget.style.boxShadow='0 10px 30px rgba(0,0,0,0.15)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 3px 12px rgba(0,0,0,0.08)'; }}
      >
        <div style={{ height:'200px', background:'linear-gradient(145deg, #F5DEB3 0%, #D4A853 100%)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', flexShrink:0 }}>
          {book.cover_image ? (
            <img src={book.cover_image} alt={book.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} loading="lazy" />
          ) : (
            <div style={{ textAlign:'center', padding:'16px' }}>
              <div style={{ fontSize:'52px', marginBottom:'8px' }}>📖</div>
              <div style={{ fontSize:'10px', color:'#8B6914', fontWeight:'700', textTransform:'uppercase', letterSpacing:'1px' }}>{book.genre || 'Book'}</div>
            </div>
          )}
          <span style={{
            position:'absolute', top:'10px', left:'10px',
            background: available ? 'rgba(72,187,120,0.9)' : 'rgba(252,129,129,0.9)',
            color:'white', fontSize:'10px', fontWeight:'700', padding:'4px 8px', borderRadius:'12px'
          }}>
            {available ? '✅ Available' : '❌ Borrowed'}
          </span>
          {book.genre && (
            <span style={{ position:'absolute', bottom:'10px', right:'10px', background:'rgba(44,24,16,0.7)', color:'#F5DEB3', fontSize:'10px', padding:'3px 8px', borderRadius:'8px' }}>
              {book.genre}
            </span>
          )}
        </div>

        <div style={{ padding:'16px', flex:1, display:'flex', flexDirection:'column' }}>
          <h3 style={{ fontFamily:'"Playfair Display", serif', fontSize:'15px', fontWeight:'600', color:'#2C1810', marginBottom:'6px', lineHeight:'1.3', flex:1 }}>
            {book.title}
          </h3>
          <p style={{ color:'#8B6914', fontSize:'13px', marginBottom:'12px' }}>by {book.author}</p>

          {book.description && (
            <p style={{ color:'#666', fontSize:'12px', lineHeight:'1.5', marginBottom:'12px', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
              {book.description}
            </p>
          )}

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'auto' }}>
            {book.price ? (
              <span style={{ color:'#D4A853', fontWeight:'800', fontSize:'17px' }}>₹{book.price}</span>
            ) : (
              <span style={{ color:'#48BB78', fontWeight:'600', fontSize:'13px' }}>Free Borrow</span>
            )}
            <span style={{ color:'#D4A853', fontSize:'13px', fontWeight:'600' }}>
              ★ {book.rating || '4.5'}
            </span>
          </div>

          <div style={{ marginTop:'12px', padding:'8px 16px', background:'linear-gradient(135deg, #2C1810, #4A2C17)', color:'#F5DEB3', borderRadius:'20px', textAlign:'center', fontSize:'13px', fontWeight:'600' }}>
            View Details →
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

  const search = searchParams.get('search') || '';
  const genre = searchParams.get('genre') || 'All';
  const sort = searchParams.get('sort') || 'title_asc';
  const availableOnly = searchParams.get('available') === 'true';

  const PER_PAGE = 24;

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('books').select('*', { count:'exact' });

      if (search) query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%,genre.ilike.%${search}%`);
      if (genre && genre !== 'All') query = query.ilike('genre', `%${genre}%`);
      if (availableOnly) query = query.gt('quantity_available', 0);

      if (sort === 'title_asc') query = query.order('title', { ascending:true });
      else if (sort === 'title_desc') query = query.order('title', { ascending:false });
      else if (sort === 'newest') query = query.order('created_at', { ascending:false });
      else if (sort === 'available') query = query.order('quantity_available', { ascending:false });

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
    params.delete('page');
    setPage(0);
    setSearchParams(params);
  };

  return (
    <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'40px 20px', fontFamily:'Lato, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom:'32px' }}>
        <h1 style={{ fontFamily:'"Playfair Display", serif', fontSize:'40px', fontWeight:'700', color:'#2C1810', marginBottom:'8px' }}>
          📚 Books Catalog
        </h1>
        <p style={{ color:'#8B6914', fontSize:'16px' }}>{total} books in our collection</p>
      </div>

      {/* Filters */}
      <div style={{ background:'white', borderRadius:'16px', padding:'24px', boxShadow:'0 4px 20px rgba(0,0,0,0.08)', marginBottom:'32px' }}>
        {/* Search */}
        <div style={{ marginBottom:'20px' }}>
          <input
            defaultValue={search}
            onKeyDown={e => { if (e.key === 'Enter') setParam('search', e.target.value); }}
            onBlur={e => setParam('search', e.target.value)}
            placeholder="🔍 Search by title, author, or genre..."
            style={{ width:'100%', padding:'12px 16px', border:'2px solid #F5DEB3', borderRadius:'8px', fontSize:'15px', outline:'none', fontFamily:'Lato, sans-serif' }}
            onFocus={e => e.target.style.borderColor = '#D4A853'}
          />
        </div>

        <div style={{ display:'flex', gap:'16px', flexWrap:'wrap', alignItems:'center' }}>
          {/* Genre */}
          <div style={{ flex:'1', minWidth:'200px' }}>
            <label style={{ fontSize:'12px', fontWeight:'700', color:'#8B6914', textTransform:'uppercase', letterSpacing:'1px', display:'block', marginBottom:'8px' }}>Genre</label>
            <select
              value={genre}
              onChange={e => setParam('genre', e.target.value)}
              style={{ width:'100%', padding:'10px 12px', border:'2px solid #F5DEB3', borderRadius:'8px', fontSize:'14px', outline:'none', cursor:'pointer', background:'white', fontFamily:'Lato, sans-serif' }}
            >
              {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          {/* Sort */}
          <div style={{ flex:'1', minWidth:'200px' }}>
            <label style={{ fontSize:'12px', fontWeight:'700', color:'#8B6914', textTransform:'uppercase', letterSpacing:'1px', display:'block', marginBottom:'8px' }}>Sort By</label>
            <select
              value={sort}
              onChange={e => setParam('sort', e.target.value)}
              style={{ width:'100%', padding:'10px 12px', border:'2px solid #F5DEB3', borderRadius:'8px', fontSize:'14px', outline:'none', cursor:'pointer', background:'white', fontFamily:'Lato, sans-serif' }}
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Available Toggle */}
          <div style={{ paddingTop:'20px' }}>
            <label style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', whiteSpace:'nowrap' }}>
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={e => setParam('available', e.target.checked ? 'true' : 'false')}
                style={{ width:'18px', height:'18px', accentColor:'#D4A853', cursor:'pointer' }}
              />
              <span style={{ fontSize:'14px', fontWeight:'600', color:'#2C1810' }}>Available Only</span>
            </label>
          </div>
        </div>

        {/* Genre pills */}
        <div style={{ marginTop:'16px', display:'flex', flexWrap:'wrap', gap:'8px' }}>
          {GENRES.slice(1).map(g => (
            <button key={g} onClick={() => setParam('genre', g === genre ? 'All' : g)} style={{
              padding:'6px 14px', borderRadius:'20px', border:'2px solid',
              borderColor: genre === g ? '#D4A853' : '#F5DEB3',
              background: genre === g ? '#D4A853' : 'transparent',
              color: genre === g ? '#2C1810' : '#8B6914',
              fontWeight: genre === g ? '700' : '400',
              cursor:'pointer', fontSize:'13px', transition:'all 0.15s', fontFamily:'Lato, sans-serif'
            }}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'60px', color:'#8B6914', fontSize:'18px' }}>
          <div style={{ fontSize:'48px', marginBottom:'16px' }}>📚</div>
          Loading books...
        </div>
      ) : books.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px', color:'#8B6914' }}>
          <div style={{ fontSize:'64px', marginBottom:'16px' }}>🔍</div>
          <h3 style={{ fontFamily:'"Playfair Display", serif', fontSize:'24px', color:'#2C1810' }}>No books found</h3>
          <p style={{ marginTop:'8px' }}>Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(210px, 1fr))', gap:'24px', marginBottom:'40px' }}>
            {books.map(book => <BookCard key={book.id} book={book} />)}
          </div>

          {/* Pagination */}
          {total > PER_PAGE && (
            <div style={{ display:'flex', justifyContent:'center', gap:'8px', flexWrap:'wrap' }}>
              <button onClick={() => setPage(p => Math.max(0, p-1))} disabled={page === 0} style={{
                padding:'10px 20px', borderRadius:'8px', border:'2px solid #D4A853',
                background: page === 0 ? '#f5f5f5' : 'white', cursor: page === 0 ? 'not-allowed' : 'pointer',
                color: page === 0 ? '#ccc' : '#D4A853', fontWeight:'600', fontFamily:'Lato, sans-serif'
              }}>
                ← Prev
              </button>
              <span style={{ padding:'10px 20px', color:'#8B6914', fontSize:'14px', display:'flex', alignItems:'center' }}>
                Page {page + 1} of {Math.ceil(total / PER_PAGE)}
              </span>
              <button onClick={() => setPage(p => p+1)} disabled={(page+1)*PER_PAGE >= total} style={{
                padding:'10px 20px', borderRadius:'8px', border:'2px solid #D4A853',
                background: (page+1)*PER_PAGE >= total ? '#f5f5f5' : 'white',
                cursor: (page+1)*PER_PAGE >= total ? 'not-allowed' : 'pointer',
                color: (page+1)*PER_PAGE >= total ? '#ccc' : '#D4A853', fontWeight:'600', fontFamily:'Lato, sans-serif'
              }}>
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
