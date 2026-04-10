import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useConfirm } from '../components/ConfirmModal';

const SETUP_SQL = `CREATE TABLE reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(book_id, member_id)
);`;

function StarRating({ value, onChange, readOnly = false, size = 20 }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map(star => (
        <span
          key={star}
          onClick={() => !readOnly && onChange && onChange(star)}
          onMouseEnter={() => !readOnly && setHovered(star)}
          onMouseLeave={() => !readOnly && setHovered(0)}
          style={{
            fontSize: `${size}px`,
            cursor: readOnly ? 'default' : 'pointer',
            color: star <= (hovered || value) ? '#f39c12' : '#ddd',
            transition: 'color 0.1s',
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default function Reviews() {
  const confirm = useConfirm();
  const [tableExists, setTableExists] = useState(null); // null = loading
  const [reviews, setReviews] = useState([]);
  const [books, setBooks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBook, setFilterBook] = useState('');
  const [form, setForm] = useState({ member_id: '', book_id: '', rating: 0, review_text: '' });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    probeTable();
  }, []);

  const probeTable = async () => {
    const { error } = await supabase.from('reviews').select('id').limit(0);
    const exists = !error;
    setTableExists(exists);
    if (exists) fetchAll();
    else setLoading(false);
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [{ data: reviewData }, { data: booksData }, { data: membersData }] = await Promise.all([
        supabase
          .from('reviews')
          .select('*, members(name, phone), books(title, author, image_url)')
          .order('created_at', { ascending: false }),
        supabase.from('books').select('id, title, author').order('title'),
        supabase.from('members').select('id, name').eq('status', 'active').order('name'),
      ]);
      setReviews(reviewData || []);
      setBooks(booksData || []);
      setMembers(membersData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.member_id || !form.book_id || form.rating === 0) {
      return alert('Please select a member, book, and rating.');
    }
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('reviews')
          .update({ rating: form.rating, review_text: form.review_text })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('reviews').insert({
          member_id: form.member_id,
          book_id: form.book_id,
          rating: form.rating,
          review_text: form.review_text.trim() || null,
        });
        if (error) {
          if (error.message.includes('unique') || error.code === '23505') {
            throw new Error('This member has already reviewed this book.');
          }
          throw error;
        }
      }
      setShowModal(false);
      resetForm();
      fetchAll();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteReview = async (id) => {
    if (!await confirm({ title: 'Delete Review', message: 'Delete this review?', variant: 'danger' })) return;
    await supabase.from('reviews').delete().eq('id', id);
    fetchAll();
  };

  const openEdit = (r) => {
    setEditingId(r.id);
    setForm({ member_id: r.member_id, book_id: r.book_id, rating: r.rating, review_text: r.review_text || '' });
    setShowModal(true);
  };

  const resetForm = () => {
    setForm({ member_id: '', book_id: '', rating: 0, review_text: '' });
    setEditingId(null);
  };

  // Aggregate stats per book
  const bookStats = {};
  reviews.forEach(r => {
    if (!bookStats[r.book_id]) bookStats[r.book_id] = { count: 0, total: 0, title: r.books?.title, author: r.books?.author };
    bookStats[r.book_id].count++;
    bookStats[r.book_id].total += r.rating;
  });
  const bookRankings = Object.entries(bookStats)
    .map(([id, s]) => ({ id, ...s, avg: (s.total / s.count).toFixed(1) }))
    .sort((a, b) => b.avg - a.avg || b.count - a.count);

  const filtered = reviews.filter(r => {
    const term = searchTerm.toLowerCase();
    const matchSearch = !term || r.members?.name?.toLowerCase().includes(term) || r.books?.title?.toLowerCase().includes(term);
    const matchBook = !filterBook || r.book_id === filterBook;
    return matchSearch && matchBook;
  });

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—';

  const tabStyle = (tab) => ({
    padding: '8px 18px', border: 'none', borderRadius: '20px', cursor: 'pointer',
    fontWeight: activeTab === tab ? '600' : '400',
    background: activeTab === tab ? '#667eea' : '#f0f0f0',
    color: activeTab === tab ? 'white' : '#666', fontSize: '13px',
  });

  if (tableExists === null || (tableExists && loading)) {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>Loading...</div>;
  }

  if (!tableExists) {
    return (
      <div style={{ padding: '20px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>⭐ Book Reviews & Ratings</h1>
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '20px', maxWidth: '700px' }}>
          <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '10px' }}>🛠️ One-Time Setup Required</div>
          <p style={{ fontSize: '13px', color: '#555', marginBottom: '12px' }}>
            Run this SQL in your <strong>Supabase Dashboard → SQL Editor</strong> to enable Reviews:
          </p>
          <pre style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '6px', padding: '12px', fontSize: '12px', fontFamily: 'monospace', overflowX: 'auto', lineHeight: '1.6' }}>
            {SETUP_SQL}
          </pre>
          <button onClick={probeTable} style={{ marginTop: '14px', padding: '8px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
            🔄 Check Again (after running SQL)
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
          <h1 style={{ fontSize: '28px', marginBottom: '4px' }}>⭐ Book Reviews & Ratings</h1>
          <p style={{ color: '#999', fontSize: '14px' }}>Member ratings and reviews. Discover the most popular books.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchAll} style={{ padding: '8px 16px', background: '#f0f0f0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
            🔄 Refresh
          </button>
          <button onClick={() => { resetForm(); setShowModal(true); }}
            style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
            + Add Review
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total Reviews', value: reviews.length, color: '#667eea', icon: '⭐' },
          { label: 'Avg Rating', value: avgRating + ' / 5', color: '#f39c12', icon: '📊' },
          { label: 'Books Rated', value: Object.keys(bookStats).length, color: '#27ae60', icon: '📖' },
          { label: '5-Star Reviews', value: reviews.filter(r => r.rating === 5).length, color: '#f39c12', icon: '🌟' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', borderRadius: '8px', padding: '16px', borderTop: `3px solid ${s.color}`, textAlign: 'center' }}>
            <div style={{ fontSize: '22px', marginBottom: '4px' }}>{s.icon}</div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '3px' }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Tabs + Filters */}
      <div style={{ background: 'white', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setActiveTab('all')} style={tabStyle('all')}>All Reviews ({reviews.length})</button>
            <button onClick={() => setActiveTab('popular')} style={tabStyle('popular')}>Most Popular</button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              placeholder="Search member or book..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ padding: '7px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', width: '200px' }}
            />
            <select value={filterBook} onChange={e => setFilterBook(e.target.value)}
              style={{ padding: '7px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', maxWidth: '200px' }}>
              <option value="">All Books</option>
              {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* All Reviews Tab */}
      {activeTab === 'all' && (
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
              <div style={{ fontSize: '40px' }}>⭐</div>
              <div style={{ marginTop: '10px' }}>No reviews yet. Add the first one!</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
                  {['Book', 'Member', 'Rating', 'Review', 'Date', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#666', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{r.books?.title || '—'}</div>
                      <div style={{ fontSize: '12px', color: '#999' }}>{r.books?.author}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '14px' }}>{r.members?.name || '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <StarRating value={r.rating} readOnly size={16} />
                      <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>{r.rating}/5</div>
                    </td>
                    <td style={{ padding: '12px 14px', maxWidth: '250px' }}>
                      <div style={{ fontSize: '13px', color: '#555', fontStyle: r.review_text ? 'normal' : 'italic' }}>
                        {r.review_text || <span style={{ color: '#bbb' }}>No written review</span>}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '12px', color: '#999' }}>
                      {new Date(r.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => openEdit(r)}
                          style={{ padding: '3px 10px', background: '#f0f4ff', border: '1px solid #c7d2fe', color: '#4338ca', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                          ✏️ Edit
                        </button>
                        <button onClick={() => deleteReview(r.id)}
                          style={{ padding: '3px 10px', background: '#fee', border: '1px solid #fcc', color: '#c0392b', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Most Popular Tab */}
      {activeTab === 'popular' && (
        <div>
          {bookRankings.length === 0 ? (
            <div style={{ background: 'white', borderRadius: '8px', padding: '40px', textAlign: 'center', color: '#999' }}>No ratings yet.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
              {bookRankings.map((b, idx) => (
                <div key={b.id} style={{ background: 'white', borderRadius: '10px', padding: '18px', border: idx === 0 ? '2px solid #f39c12' : '1px solid #eee', position: 'relative' }}>
                  {idx === 0 && (
                    <span style={{ position: 'absolute', top: '-10px', right: '14px', background: '#f39c12', color: 'white', fontSize: '11px', fontWeight: '700', padding: '2px 10px', borderRadius: '10px' }}>
                      🏆 TOP RATED
                    </span>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '15px' }}>{b.title}</div>
                      <div style={{ fontSize: '12px', color: '#999' }}>{b.author}</div>
                    </div>
                    <div style={{ background: '#fff3cd', color: '#856404', padding: '4px 10px', borderRadius: '8px', textAlign: 'center', minWidth: '50px' }}>
                      <div style={{ fontSize: '18px', fontWeight: '800' }}>{b.avg}</div>
                      <div style={{ fontSize: '10px' }}>/ 5.0</div>
                    </div>
                  </div>
                  <StarRating value={Math.round(parseFloat(b.avg))} readOnly size={18} />
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                    Based on {b.count} review{b.count !== 1 ? 's' : ''}
                  </div>
                  {/* Rating distribution mini-bar */}
                  <div style={{ marginTop: '10px' }}>
                    {[5, 4, 3, 2, 1].map(star => {
                      const starReviews = reviews.filter(r => r.book_id === b.id && r.rating === star);
                      const pct = b.count ? (starReviews.length / b.count) * 100 : 0;
                      return (
                        <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                          <span style={{ fontSize: '11px', color: '#999', width: '12px' }}>{star}</span>
                          <span style={{ color: '#f39c12', fontSize: '11px' }}>★</span>
                          <div style={{ flex: 1, height: '6px', background: '#f0f0f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: '#f39c12', width: `${pct}%`, borderRadius: '3px', transition: 'width 0.3s' }} />
                          </div>
                          <span style={{ fontSize: '11px', color: '#999', width: '20px' }}>{starReviews.length}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '460px', maxWidth: '95vw' }}>
            <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>{editingId ? '✏️ Edit Review' : '⭐ Add Review'}</h2>
            <form onSubmit={handleSubmit}>
              {!editingId && (
                <>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px' }}>Member *</label>
                    <select value={form.member_id} onChange={e => setForm({ ...form, member_id: e.target.value })} required
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}>
                      <option value="">Select member...</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px' }}>Book *</label>
                    <select value={form.book_id} onChange={e => setForm({ ...form, book_id: e.target.value })} required
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}>
                      <option value="">Select book...</option>
                      {books.map(b => <option key={b.id} value={b.id}>{b.title} — {b.author}</option>)}
                    </select>
                  </div>
                </>
              )}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>Rating *</label>
                <StarRating value={form.rating} onChange={v => setForm({ ...form, rating: v })} size={30} />
                {form.rating > 0 && (
                  <div style={{ fontSize: '12px', color: '#f39c12', marginTop: '4px' }}>
                    {['', '⭐ Poor', '⭐⭐ Fair', '⭐⭐⭐ Good', '⭐⭐⭐⭐ Very Good', '⭐⭐⭐⭐⭐ Excellent'][form.rating]}
                  </div>
                )}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px' }}>Review (optional)</label>
                <textarea
                  value={form.review_text}
                  onChange={e => setForm({ ...form, review_text: e.target.value })}
                  rows={3}
                  maxLength={500}
                  placeholder="Share your thoughts about this book..."
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', resize: 'vertical' }}
                />
                <div style={{ fontSize: '11px', color: '#bbb', textAlign: 'right' }}>{form.review_text.length}/500</div>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }}
                  style={{ padding: '9px 20px', background: '#f0f0f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving || form.rating === 0}
                  style={{ padding: '9px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                  {saving ? 'Saving...' : editingId ? 'Update Review' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
