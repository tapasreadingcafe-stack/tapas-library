import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { usePermission } from '../hooks/usePermission';
import ViewOnlyBanner from '../components/ViewOnlyBanner';

export default function InventoryLibrary() {
  const { isReadOnly } = usePermission();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchBooks(); }, []);

  const fetchBooks = async () => {
    setLoading(true);
    const { data } = await supabase.from('books').select('id, book_id, title, author, category, quantity_total, quantity_available, condition')
      .order('title');
    setBooks(data || []);
    setLoading(false);
  };

  const filtered = books.filter(b => {
    if (search && !b.title?.toLowerCase().includes(search.toLowerCase()) && !b.author?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'low') return (b.quantity_available || 0) <= 2 && (b.quantity_available || 0) > 0;
    if (filter === 'out') return (b.quantity_available || 0) === 0;
    return true;
  });

  const lowStock = books.filter(b => (b.quantity_available || 0) <= 2 && (b.quantity_available || 0) > 0).length;
  const outOfStock = books.filter(b => (b.quantity_available || 0) === 0).length;

  return (
    <div className="inv-lib-page">
      <style>{`
        .inv-lib-page { padding: 20px; }
        .inv-lib-page h1 { font-size: 28px; margin-bottom: 16px; }
        .inv-lib-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-bottom: 20px; }
        .inv-lib-stat { background: white; padding: 14px; border-radius: 8px; text-align: center; }
        .inv-lib-stat .val { font-size: 24px; font-weight: 700; }
        .inv-lib-stat .lbl { font-size: 11px; color: #999; margin-top: 2px; }
        .inv-lib-controls { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
        .inv-lib-controls input, .inv-lib-controls select { padding: 8px 12px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 14px; }
        .inv-lib-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .inv-lib-table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; }
        .inv-lib-table th { text-align: left; padding: 12px; font-size: 12px; color: #666; background: #f8f9fa; font-weight: 600; white-space: nowrap; }
        .inv-lib-table td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
        .inv-lib-table tr:hover { background: #fafbff; }
        .stock-badge { padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
        .stock-ok { background: #d4edda; color: #155724; }
        .stock-low { background: #fff3cd; color: #856404; }
        .stock-out { background: #f8d7da; color: #721c24; }
        @media (max-width: 768px) {
          .inv-lib-page { padding: 12px; }
          .inv-lib-page h1 { font-size: 22px; }
          .inv-lib-controls input, .inv-lib-controls select { flex: 1; min-width: 120px; }
          .inv-lib-stats { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 480px) {
          .inv-lib-page { padding: 8px; }
          .inv-lib-stats { grid-template-columns: repeat(3, 1fr); }
          .inv-lib-stat .val { font-size: 18px; }
          .inv-lib-table th, .inv-lib-table td { padding: 8px 6px; font-size: 12px; }
        }
      `}</style>

      {isReadOnly && <ViewOnlyBanner />}
      <h1>📚 Library Stock</h1>

      <div className="inv-lib-stats">
        <div className="inv-lib-stat" style={{ borderTop: '3px solid #667eea' }}>
          <div className="val" style={{ color: '#667eea' }}>{books.length}</div>
          <div className="lbl">TOTAL TITLES</div>
        </div>
        <div className="inv-lib-stat" style={{ borderTop: '3px solid #f39c12' }}>
          <div className="val" style={{ color: '#f39c12' }}>{lowStock}</div>
          <div className="lbl">LOW STOCK</div>
        </div>
        <div className="inv-lib-stat" style={{ borderTop: '3px solid #e74c3c' }}>
          <div className="val" style={{ color: '#e74c3c' }}>{outOfStock}</div>
          <div className="lbl">OUT OF STOCK</div>
        </div>
      </div>

      <div className="inv-lib-controls">
        <input placeholder="Search by title or author..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All Books</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>
        <button onClick={fetchBooks} style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Refresh</button>
      </div>

      {loading ? <p style={{ color: '#999' }}>Loading...</p> : (
        <div className="inv-lib-table-wrap">
          <table className="inv-lib-table">
            <thead>
              <tr><th>Title</th><th>Author</th><th>Category</th><th>Total</th><th>Available</th><th>Status</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', color: '#999', padding: '30px' }}>No books found</td></tr>
              ) : filtered.map(book => {
                const avail = book.quantity_available || 0;
                const stockClass = avail === 0 ? 'stock-out' : avail <= 2 ? 'stock-low' : 'stock-ok';
                const stockLabel = avail === 0 ? 'Out of Stock' : avail <= 2 ? 'Low Stock' : 'In Stock';
                return (
                  <tr key={book.id}>
                    <td style={{ fontWeight: '600' }}>{book.title}</td>
                    <td style={{ color: '#666' }}>{book.author}</td>
                    <td>{book.category}</td>
                    <td style={{ fontWeight: '600' }}>{book.quantity_total || 0}</td>
                    <td style={{ fontWeight: '600', color: avail === 0 ? '#e74c3c' : avail <= 2 ? '#f39c12' : '#27ae60' }}>{avail}</td>
                    <td><span className={`stock-badge ${stockClass}`}>{stockLabel}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
