import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

const SETUP_SQL = `CREATE TABLE wishlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(book_id, member_id)
);`;

export default function Wishlist() {
  const [tableExists, setTableExists] = useState(null);
  const [wishlists, setWishlists] = useState([]);
  const [books, setBooks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [filterMember, setFilterMember] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ member_id: '', book_id: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { probeTable(); }, []);

  const probeTable = async () => {
    const { error } = await supabase.from('wishlists').select('id').limit(0);
    const exists = !error;
    setTableExists(exists);
    if (exists) fetchAll();
    else setLoading(false);
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [{ data: wData }, { data: booksData }, { data: membersData }] = await Promise.all([
        supabase
          .from('wishlists')
          .select('*, members(id, name, phone), books(id, title, author, category, quantity_available)')
          .order('created_at', { ascending: false }),
        supabase.from('books').select('id, title, author, category, quantity_available').order('title'),
        supabase.from('members').select('id, name, phone').eq('status', 'active').order('name'),
      ]);
      setWishlists(wData || []);
      setBooks(booksData || []);
      setMembers(membersData || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.member_id || !form.book_id) return alert('Select both a member and a book.');
    setSaving(true);
    try {
      const { error } = await supabase.from('wishlists').insert({
        member_id: form.member_id,
        book_id: form.book_id,
      });
      if (error) {
        if (error.code === '23505') throw new Error('This book is already on that member\'s wishlist.');
        throw error;
      }
      setShowModal(false);
      setForm({ member_id: '', book_id: '' });
      fetchAll();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const removeItem = async (id) => {
    if (!window.confirm('Remove from wishlist?')) return;
    await supabase.from('wishlists').delete().eq('id', id);
    fetchAll();
  };

  // Most wishlisted books aggregation
  const bookCounts = {};
  wishlists.forEach(w => {
    const id = w.book_id;
    if (!bookCounts[id]) bookCounts[id] = { book: w.books, count: 0 };
    bookCounts[id].count++;
  });
  const topBooks = Object.values(bookCounts).sort((a, b) => b.count - a.count);

  const filtered = wishlists.filter(w => {
    const term = searchTerm.toLowerCase();
    const matchSearch = !term || w.members?.name?.toLowerCase().includes(term) || w.books?.title?.toLowerCase().includes(term);
    const matchMember = !filterMember || w.member_id === filterMember;
    return matchSearch && matchMember;
  });

  // Books available to wishlist (not already on selected member's wishlist)
  const memberWishlistBookIds = filterMember
    ? new Set(wishlists.filter(w => w.member_id === filterMember).map(w => w.book_id))
    : new Set();

  const tabStyle = (t) => ({
    padding: '8px 18px', border: 'none', borderRadius: '20px', cursor: 'pointer',
    fontWeight: activeTab === t ? '600' : '400',
    background: activeTab === t ? '#667eea' : '#f0f0f0',
    color: activeTab === t ? 'white' : '#666', fontSize: '13px',
  });

  if (tableExists === null || (tableExists && loading)) {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>Loading...</div>;
  }

  if (!tableExists) {
    return (
      <div style={{ padding: '20px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>📋 Wishlist</h1>
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '20px', maxWidth: '700px' }}>
          <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '10px' }}>🛠️ One-Time Setup Required</div>
          <p style={{ fontSize: '13px', color: '#555', marginBottom: '12px' }}>
            Run this SQL in your <strong>Supabase Dashboard → SQL Editor</strong>:
          </p>
          <pre style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '6px', padding: '12px', fontSize: '12px', fontFamily: 'monospace', overflowX: 'auto', lineHeight: '1.6' }}>
            {SETUP_SQL}
          </pre>
          <button onClick={probeTable} style={{ marginTop: '14px', padding: '8px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
            🔄 Check Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '4px' }}>📋 Member Wishlists</h1>
          <p style={{ color: '#999', fontSize: '14px' }}>Books members want to read. Most-wishlisted books guide new purchase decisions.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchAll} style={{ padding: '8px 16px', background: '#f0f0f0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>🔄 Refresh</button>
          <button onClick={() => setShowModal(true)} style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
            + Add to Wishlist
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total Wishlist Items', value: wishlists.length, color: '#667eea' },
          { label: 'Unique Books', value: topBooks.length, color: '#27ae60' },
          { label: 'Members with Wishlist', value: new Set(wishlists.map(w => w.member_id)).size, color: '#f39c12' },
          { label: 'Most Wanted', value: topBooks[0]?.book?.title?.slice(0, 18) + (topBooks[0]?.book?.title?.length > 18 ? '…' : '') || '—', color: '#9b59b6' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', borderRadius: '8px', padding: '16px', borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: typeof s.value === 'number' ? '24px' : '14px', fontWeight: 'bold', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Tabs + Filters */}
      <div style={{ background: 'white', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setActiveTab('all')} style={tabStyle('all')}>All Wishlist Items</button>
            <button onClick={() => setActiveTab('popular')} style={tabStyle('popular')}>Most Wanted Books ({topBooks.length})</button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              style={{ padding: '7px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', width: '180px' }} />
            <select value={filterMember} onChange={e => setFilterMember(e.target.value)}
              style={{ padding: '7px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px' }}>
              <option value="">All Members</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* All Wishlist Items */}
      {activeTab === 'all' && (
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
              <div style={{ fontSize: '40px' }}>📋</div>
              <div style={{ marginTop: '10px' }}>No wishlist items yet.</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
                  {['Member', 'Book', 'Category', 'Availability', 'Added On', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#666', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(w => (
                  <tr key={w.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: '600' }}>{w.members?.name || '—'}</div>
                      <div style={{ fontSize: '12px', color: '#999' }}>{w.members?.phone}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: '500' }}>{w.books?.title || '—'}</div>
                      <div style={{ fontSize: '12px', color: '#999' }}>{w.books?.author}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {w.books?.category ? (
                        <span style={{ background: '#e8f4fd', color: '#2980b9', padding: '2px 10px', borderRadius: '12px', fontSize: '12px' }}>
                          {w.books.category}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {w.books?.quantity_available > 0 ? (
                        <span style={{ background: '#d4edda', color: '#155724', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                          ✅ Available ({w.books.quantity_available})
                        </span>
                      ) : (
                        <span style={{ background: '#f8d7da', color: '#721c24', padding: '2px 10px', borderRadius: '12px', fontSize: '12px' }}>
                          Checked Out
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '12px', color: '#999' }}>
                      {new Date(w.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button onClick={() => removeItem(w.id)}
                        style={{ padding: '3px 10px', background: '#fee', border: '1px solid #fcc', color: '#c0392b', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                        ✕ Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Most Wanted Books */}
      {activeTab === 'popular' && (
        <div>
          {topBooks.length === 0 ? (
            <div style={{ background: 'white', borderRadius: '8px', padding: '40px', textAlign: 'center', color: '#999' }}>No wishlist data yet.</div>
          ) : (
            <div>
              <div style={{ background: '#e8f4fd', border: '1px solid #bee5eb', borderRadius: '8px', padding: '12px 16px', marginBottom: '14px', fontSize: '13px', color: '#0c5460' }}>
                💡 <strong>Purchase Insights:</strong> These are the books most requested by members. Consider purchasing more copies of the top-wishlisted titles.
              </div>
              <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
                      {['Rank', 'Book', 'Category', 'Wishlist Count', 'Availability', 'Action'].map(h => (
                        <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#666', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topBooks.map((item, idx) => (
                      <tr key={item.book?.id} style={{ borderBottom: '1px solid #f0f0f0', background: idx === 0 ? '#fffdf0' : 'white' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            background: idx === 0 ? '#f39c12' : idx === 1 ? '#95a5a6' : idx === 2 ? '#e67e22' : '#f0f0f0',
                            color: idx < 3 ? 'white' : '#555',
                            width: '28px', height: '28px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: '700', fontSize: '13px'
                          }}>
                            {idx + 1}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: '600' }}>{item.book?.title || '—'}</div>
                          <div style={{ fontSize: '12px', color: '#999' }}>{item.book?.author}</div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {item.book?.category ? (
                            <span style={{ background: '#e8f4fd', color: '#2980b9', padding: '2px 10px', borderRadius: '12px', fontSize: '12px' }}>
                              {item.book.category}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ background: '#667eea', height: '8px', borderRadius: '4px', width: `${Math.round((item.count / topBooks[0].count) * 100)}px`, minWidth: '8px' }} />
                            <span style={{ fontWeight: '700', color: '#667eea', fontSize: '15px' }}>{item.count}</span>
                            <span style={{ fontSize: '12px', color: '#999' }}>member{item.count !== 1 ? 's' : ''}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {item.book?.quantity_available > 0 ? (
                            <span style={{ background: '#d4edda', color: '#155724', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                              Available ({item.book.quantity_available})
                            </span>
                          ) : (
                            <span style={{ background: '#f8d7da', color: '#721c24', padding: '2px 10px', borderRadius: '12px', fontSize: '12px' }}>
                              All Checked Out
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {item.book?.quantity_available === 0 && (
                            <span style={{ fontSize: '11px', color: '#9b59b6', fontWeight: '600' }}>📦 Consider buying more</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '420px', maxWidth: '95vw' }}>
            <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>📋 Add to Wishlist</h2>
            <form onSubmit={handleAdd}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px' }}>Member *</label>
                <select value={form.member_id} onChange={e => setForm({ ...form, member_id: e.target.value })} required
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}>
                  <option value="">Select member...</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px' }}>Book *</label>
                <select value={form.book_id} onChange={e => setForm({ ...form, book_id: e.target.value })} required
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}>
                  <option value="">Select book...</option>
                  {books.map(b => <option key={b.id} value={b.id}>{b.title} — {b.author}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowModal(false); setForm({ member_id: '', book_id: '' }); }}
                  style={{ padding: '9px 20px', background: '#f0f0f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={saving}
                  style={{ padding: '9px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                  {saving ? 'Adding...' : 'Add to Wishlist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
