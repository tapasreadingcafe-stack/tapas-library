import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export default function PublicCatalog() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [availability, setAvailability] = useState('all');
  const [selectedBook, setSelectedBook] = useState(null);
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => { fetchBooks(); }, []);

  const fetchBooks = async () => {
    setLoading(true);
    const { data } = await supabase.from('books').select('id, title, author, isbn, category, quantity_available, quantity_total, book_image, mrp, sales_price, condition').order('title').limit(500);
    setBooks(data || []);
    const cats = [...new Set((data || []).map(b => b.category).filter(Boolean))].sort();
    setCategories(cats);
    setLoading(false);
  };

  const filtered = books.filter(b => {
    if (search) {
      const q = search.toLowerCase();
      if (!b.title?.toLowerCase().includes(q) && !b.author?.toLowerCase().includes(q) && !b.isbn?.includes(q)) return false;
    }
    if (category !== 'all' && b.category !== category) return false;
    if (availability === 'available' && (b.quantity_available || 0) <= 0) return false;
    if (availability === 'unavailable' && (b.quantity_available || 0) > 0) return false;
    return true;
  });

  return (
    <div className="catalog-page">
      <style>{`
        .catalog-page { padding: 20px; min-height: 100vh; }
        .catalog-header { text-align: center; margin-bottom: 24px; }
        .catalog-header h1 { font-size: 32px; margin: 0 0 4px; }
        .catalog-header p { color: #999; font-size: 14px; }
        .catalog-search-bar { display: flex; gap: 10px; max-width: 800px; margin: 0 auto 20px; flex-wrap: wrap; }
        .catalog-search-bar input { flex: 1; min-width: 200px; padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 10px; font-size: 15px; transition: border-color 0.2s; }
        .catalog-search-bar input:focus { border-color: #667eea; outline: none; }
        .catalog-filters { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-bottom: 16px; }
        .catalog-filter-btn { padding: 6px 16px; border-radius: 20px; border: 1px solid #e0e0e0; background: white; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s; }
        .catalog-filter-btn.active { background: #667eea; color: white; border-color: #667eea; }
        .catalog-stats { text-align: center; color: #999; font-size: 13px; margin-bottom: 16px; }
        .catalog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
        .catalog-list { display: flex; flex-direction: column; gap: 8px; }
        .catalog-card { background: white; border-radius: 10px; overflow: hidden; cursor: pointer; transition: all 0.2s; border: 1px solid #f0f0f0; }
        .catalog-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.08); transform: translateY(-2px); }
        .catalog-card-img { width: 100%; height: 200px; object-fit: cover; background: #f0f0f0; }
        .catalog-card-placeholder { width: 100%; height: 200px; background: linear-gradient(135deg, #667eea20, #764ba220); display: flex; align-items: center; justify-content: center; font-size: 48px; }
        .catalog-card-body { padding: 12px; }
        .catalog-card-title { font-size: 14px; font-weight: 700; color: #333; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .catalog-card-author { font-size: 12px; color: #999; margin-bottom: 6px; }
        .catalog-card-footer { display: flex; justify-content: space-between; align-items: center; }
        .catalog-avail { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
        .catalog-avail.yes { background: #d4edda; color: #155724; }
        .catalog-avail.no { background: #f8d7da; color: #721c24; }
        .catalog-price { font-size: 14px; font-weight: 700; color: #667eea; }
        .catalog-list-item { display: flex; gap: 12px; background: white; border-radius: 8px; padding: 12px; border: 1px solid #f0f0f0; cursor: pointer; transition: all 0.2s; }
        .catalog-list-item:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .catalog-list-img { width: 50px; height: 70px; border-radius: 4px; object-fit: cover; background: #f0f0f0; flex-shrink: 0; }
        .catalog-detail-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px; }
        .catalog-detail { background: white; border-radius: 12px; padding: 0; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto; }
        .catalog-detail-img { width: 100%; height: 250px; object-fit: cover; background: #f0f0f0; }
        .catalog-detail-body { padding: 20px; }
        .catalog-view-toggle { display: flex; gap: 4px; }
        .catalog-view-btn { padding: 6px 10px; border: 1px solid #e0e0e0; background: white; cursor: pointer; border-radius: 6px; font-size: 14px; }
        .catalog-view-btn.active { background: #667eea; color: white; border-color: #667eea; }
        @media (max-width: 768px) {
          .catalog-page { padding: 12px; }
          .catalog-header h1 { font-size: 24px; }
          .catalog-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
          .catalog-card-img, .catalog-card-placeholder { height: 160px; }
          .catalog-search-bar input { font-size: 14px; padding: 10px 14px; }
        }
        @media (max-width: 480px) {
          .catalog-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .catalog-card-img, .catalog-card-placeholder { height: 140px; }
          .catalog-card-body { padding: 8px; }
          .catalog-card-title { font-size: 13px; }
        }
      `}</style>

      <div className="catalog-header">
        <h1>📚 Book Catalog</h1>
        <p>Search and browse our collection</p>
      </div>

      <div className="catalog-search-bar">
        <input placeholder="Search by title, author, or ISBN..." value={search} onChange={e => setSearch(e.target.value)} />
        <select value={category} onChange={e => setCategory(e.target.value)} style={{ padding: '10px 14px', border: '2px solid #e0e0e0', borderRadius: '10px', fontSize: '14px' }}>
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="catalog-view-toggle">
          <button className={`catalog-view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="Grid view">▦</button>
          <button className={`catalog-view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="List view">≡</button>
        </div>
      </div>

      <div className="catalog-filters">
        {['all', 'available', 'unavailable'].map(f => (
          <button key={f} className={`catalog-filter-btn ${availability === f ? 'active' : ''}`} onClick={() => setAvailability(f)}>
            {f === 'all' ? `All (${books.length})` : f === 'available' ? `Available (${books.filter(b => (b.quantity_available || 0) > 0).length})` : `Unavailable (${books.filter(b => (b.quantity_available || 0) <= 0).length})`}
          </button>
        ))}
      </div>

      <div className="catalog-stats">{filtered.length} book{filtered.length !== 1 ? 's' : ''} found</div>

      {loading ? <p style={{ textAlign: 'center', color: '#999' }}>Loading catalog...</p> : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📖</div>
          <p>No books match your search</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="catalog-grid">
          {filtered.map(book => (
            <div key={book.id} className="catalog-card" onClick={() => setSelectedBook(book)}>
              {book.book_image ? (
                <img src={book.book_image} alt={book.title} className="catalog-card-img" loading="lazy" onError={e => { e.target.style.display = 'none'; }} />
              ) : (
                <div className="catalog-card-placeholder">📚</div>
              )}
              <div className="catalog-card-body">
                <div className="catalog-card-title">{book.title}</div>
                <div className="catalog-card-author">{book.author || 'Unknown'}</div>
                <div className="catalog-card-footer">
                  <span className={`catalog-avail ${(book.quantity_available || 0) > 0 ? 'yes' : 'no'}`}>
                    {(book.quantity_available || 0) > 0 ? `${book.quantity_available} available` : 'Unavailable'}
                  </span>
                  {(book.sales_price || book.mrp) ? (
                    <span className="catalog-price">₹{book.sales_price || book.mrp}</span>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="catalog-list">
          {filtered.map(book => (
            <div key={book.id} className="catalog-list-item" onClick={() => setSelectedBook(book)}>
              {book.book_image ? (
                <img src={book.book_image} alt="" className="catalog-list-img" loading="lazy" />
              ) : (
                <div className="catalog-list-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', background: '#f0f0f0' }}>📚</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '2px' }}>{book.title}</div>
                <div style={{ fontSize: '12px', color: '#999' }}>{book.author} {book.isbn ? `· ISBN: ${book.isbn}` : ''}</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
                  <span className={`catalog-avail ${(book.quantity_available || 0) > 0 ? 'yes' : 'no'}`}>
                    {(book.quantity_available || 0) > 0 ? 'Available' : 'Unavailable'}
                  </span>
                  {book.category && <span style={{ fontSize: '11px', color: '#667eea', background: '#667eea15', padding: '2px 8px', borderRadius: '10px' }}>{book.category}</span>}
                </div>
              </div>
              {(book.sales_price || book.mrp) ? <span className="catalog-price" style={{ alignSelf: 'center' }}>₹{book.sales_price || book.mrp}</span> : null}
            </div>
          ))}
        </div>
      )}

      {/* Book Detail Modal */}
      {selectedBook && (
        <div className="catalog-detail-overlay" onClick={() => setSelectedBook(null)}>
          <div className="catalog-detail" onClick={e => e.stopPropagation()}>
            {selectedBook.book_image && (
              <img src={selectedBook.book_image} alt={selectedBook.title} className="catalog-detail-img" />
            )}
            <div className="catalog-detail-body">
              <h2 style={{ margin: '0 0 6px', fontSize: '22px' }}>{selectedBook.title}</h2>
              <p style={{ color: '#666', fontSize: '14px', margin: '0 0 12px' }}>by {selectedBook.author || 'Unknown'}</p>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <span className={`catalog-avail ${(selectedBook.quantity_available || 0) > 0 ? 'yes' : 'no'}`} style={{ fontSize: '13px', padding: '4px 12px' }}>
                  {(selectedBook.quantity_available || 0) > 0 ? `${selectedBook.quantity_available} of ${selectedBook.quantity_total} available` : 'Currently unavailable'}
                </span>
                {selectedBook.category && <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '13px', background: '#667eea15', color: '#667eea', fontWeight: '600' }}>{selectedBook.category}</span>}
                {selectedBook.condition && <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '13px', background: '#f0f0f0', color: '#666' }}>{selectedBook.condition}</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                {selectedBook.isbn && (
                  <div><span style={{ fontSize: '11px', color: '#999', fontWeight: '600' }}>ISBN</span><br /><span style={{ fontSize: '14px' }}>{selectedBook.isbn}</span></div>
                )}
                {selectedBook.mrp > 0 && (
                  <div><span style={{ fontSize: '11px', color: '#999', fontWeight: '600' }}>MRP</span><br /><span style={{ fontSize: '14px' }}>₹{selectedBook.mrp}</span></div>
                )}
                {selectedBook.sales_price > 0 && (
                  <div><span style={{ fontSize: '11px', color: '#999', fontWeight: '600' }}>Selling Price</span><br /><span style={{ fontSize: '16px', fontWeight: '700', color: '#667eea' }}>₹{selectedBook.sales_price}</span></div>
                )}
              </div>

              <button onClick={() => setSelectedBook(null)}
                style={{ width: '100%', padding: '12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
