import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../utils/supabase';

// =====================================================================
// /store/reviews — Staff moderation for the Review Wall block.
//
// Reads every row in public.reviews regardless of status (RLS allows
// staff to see all). Lets staff publish, reject, or delete.
// =====================================================================

const STATUS_META = {
  pending:   { label: '⏳ Pending',   bg: '#fef3c7', text: '#92400e' },
  published: { label: '✓ Published', bg: '#d1fae5', text: '#065f46' },
  rejected:  { label: '✗ Rejected',  bg: '#fee2e2', text: '#991b1b' },
};

const FILTERS = [
  { key: 'pending',   label: 'Pending',   match: ['pending'] },
  { key: 'published', label: 'Published', match: ['published'] },
  { key: 'rejected',  label: 'Rejected',  match: ['rejected'] },
  { key: 'all',       label: 'All',       match: null },
];

const STAR = '★';
const STAR_EMPTY = '☆';

export default function ReviewsInbox() {
  const [rows, setRows] = useState([]);
  const [books, setBooks] = useState({}); // id → { title, author }
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [actioning, setActioning] = useState(null);
  const [error, setError] = useState('');

  const fetchRows = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data, error: err } = await supabase
        .from('reviews')
        .select('id, book_id, member_id, rating, review_text, guest_name, guest_email, photo_url, status, created_at')
        .order('created_at', { ascending: false })
        .limit(500);
      if (err) throw err;
      setRows(data || []);
      const bookIds = [...new Set((data || []).map(r => r.book_id).filter(Boolean))];
      if (bookIds.length) {
        const { data: bookRows } = await supabase.from('books').select('id, title, author').in('id', bookIds);
        const map = {};
        (bookRows || []).forEach(b => { map[b.id] = b; });
        setBooks(map);
      }
    } catch (err) {
      setError(err.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const patch = async (row, patchObj) => {
    if (actioning) return;
    setActioning(row.id);
    try {
      const { error: err } = await supabase.from('reviews').update(patchObj).eq('id', row.id);
      if (err) throw err;
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, ...patchObj } : r));
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setActioning(null);
    }
  };

  const removeRow = async (row) => {
    if (!window.confirm(`Permanently delete this review? This cannot be undone.`)) return;
    setActioning(row.id);
    try {
      const { error: err } = await supabase.from('reviews').delete().eq('id', row.id);
      if (err) throw err;
      setRows(prev => prev.filter(r => r.id !== row.id));
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setActioning(null);
    }
  };

  const visible = useMemo(() => {
    const f = FILTERS.find(x => x.key === filter);
    return rows.filter(r => !f?.match || f.match.includes(r.status));
  }, [rows, filter]);

  const pendingCount = rows.filter(r => r.status === 'pending').length;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#2c3e50' }}>
            ★ Reviews
            {pendingCount > 0 && (
              <span style={{
                marginLeft: '10px', padding: '3px 10px',
                background: '#f59e0b', color: 'white',
                borderRadius: '12px', fontSize: '12px', fontWeight: 700,
                verticalAlign: 'middle',
              }}>{pendingCount} pending</span>
            )}
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#6b7280' }}>
            Reader reviews submitted through the Review Wall block.
          </p>
        </div>
        <button onClick={fetchRows} style={{
          padding: '8px 16px', background: '#667eea', color: 'white',
          border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600,
        }}>↻ Refresh</button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {FILTERS.map(f => {
          const count = f.match ? rows.filter(r => f.match.includes(r.status)).length : rows.length;
          return (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '8px 16px',
              background: filter === f.key ? '#667eea' : 'white',
              color: filter === f.key ? 'white' : '#2c3e50',
              border: `1.5px solid ${filter === f.key ? '#667eea' : '#dfe4ea'}`,
              borderRadius: '20px', cursor: 'pointer',
              fontWeight: 600, fontSize: '13px',
            }}>{f.label} ({count})</button>
          );
        })}
      </div>

      {error && <div style={{ padding: '12px 16px', marginBottom: '16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '8px', fontSize: '13px' }}>⚠️ {error}</div>}

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#8B6914' }}>Loading…</div>
      ) : visible.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#999', background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>★</div>
          <p style={{ margin: 0, fontWeight: 600 }}>Nothing in {FILTERS.find(f => f.key === filter)?.label}.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {visible.map(row => {
            const s = STATUS_META[row.status] || STATUS_META.pending;
            const book = row.book_id ? books[row.book_id] : null;
            return (
              <div key={row.id} style={{
                padding: '16px 18px',
                background: 'white', border: '1px solid #e5e7eb',
                borderRadius: '10px',
                display: 'grid', gridTemplateColumns: row.photo_url ? '140px 1fr' : '1fr', gap: '16px',
              }}>
                {row.photo_url && (
                  <img src={row.photo_url} alt="" loading="lazy" decoding="async"
                    style={{ width: '140px', height: '140px', objectFit: 'cover', borderRadius: '8px', display: 'block' }} />
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ color: '#f59e0b', fontSize: '16px', letterSpacing: '2px' }}>
                      {STAR.repeat(row.rating || 0)}{STAR_EMPTY.repeat(Math.max(0, 5 - (row.rating || 0)))}
                    </span>
                    <span style={{ padding: '2px 8px', background: s.bg, color: s.text, borderRadius: '10px', fontSize: '11px', fontWeight: 700 }}>
                      {s.label}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#9ca3af' }}>
                      {new Date(row.created_at).toLocaleString()}
                    </span>
                  </div>
                  {book && (
                    <div style={{ fontSize: '12px', color: '#374151', marginBottom: '4px' }}>
                      📚 <b>{book.title}</b>{book.author ? ` · ${book.author}` : ''}
                    </div>
                  )}
                  {row.review_text && (
                    <p style={{ margin: '6px 0', fontSize: '14px', lineHeight: 1.55, color: '#111827', whiteSpace: 'pre-wrap' }}>
                      {row.review_text}
                    </p>
                  )}
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px' }}>
                    — {row.guest_name || 'Anonymous'}
                    {row.guest_email && <> · <a href={`mailto:${row.guest_email}`} style={{ color: '#667eea', textDecoration: 'none' }}>{row.guest_email}</a></>}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {row.status !== 'published' && (
                      <button onClick={() => patch(row, { status: 'published' })} disabled={actioning === row.id}
                        style={{ padding: '6px 14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                      >✓ Publish</button>
                    )}
                    {row.status !== 'rejected' && (
                      <button onClick={() => patch(row, { status: 'rejected' })} disabled={actioning === row.id}
                        style={{ padding: '6px 14px', background: '#fff', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                      >✗ Reject</button>
                    )}
                    {row.guest_email && row.review_text && (
                      <button
                        onClick={async () => {
                          try {
                            const { data, error } = await supabase.functions.invoke('ai-assist', {
                              body: { task: 'reply_draft', subject: `Your review of ${book?.title || 'a book'}`, body: row.review_text, context: `Rating: ${row.rating}/5` },
                            });
                            if (error || !data?.text) throw new Error(data?.error || error?.message || 'AI failed');
                            const mailto = `mailto:${encodeURIComponent(row.guest_email)}?subject=${encodeURIComponent('Thanks for your review')}&body=${encodeURIComponent(data.text)}`;
                            window.location.href = mailto;
                          } catch (err) {
                            alert('AI reply draft failed: ' + (err.message || err));
                          }
                        }}
                        style={{ padding: '6px 14px', background: '#a78bfa', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                      >✨ Draft AI reply</button>
                    )}
                    <button onClick={() => removeRow(row)} disabled={actioning === row.id}
                      style={{ marginLeft: 'auto', padding: '6px 14px', background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >🗑 Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
