import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

const STATUS_COLORS = {
  pending:   { bg: '#fff3cd', text: '#856404', label: 'Waiting' },
  available: { bg: '#d4edda', text: '#155724', label: 'Ready to Pick Up' },
  fulfilled: { bg: '#cce5ff', text: '#004085', label: 'Fulfilled' },
  cancelled: { bg: '#f8d7da', text: '#721c24', label: 'Cancelled' },
  expired:   { bg: '#e2e3e5', text: '#383d41', label: 'Expired' },
};

export default function Reservations() {
  const [reservations, setReservations] = useState([]);
  const [checkedOutBooks, setCheckedOutBooks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ member_id: '', book_id: '' });
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasExpiresAt, setHasExpiresAt] = useState(false);

  useEffect(() => {
    probeSchema().then(fetchAll);
  }, []);

  // Check if the expires_at column exists (added via SQL migration)
  const probeSchema = async () => {
    const { error } = await supabase
      .from('reservations')
      .select('expires_at')
      .limit(0);
    setHasExpiresAt(!error);
    return !error;
  };

  const fetchAll = async (expiresAtExists) => {
    setLoading(true);
    try {
      const selectCols = expiresAtExists
        ? '*, members(name, phone), books(title, author)'
        : 'id, book_id, member_id, status, queue_position, created_at, members(name, phone), books(title, author)';

      const [{ data: resData }, { data: circData }, { data: membersData }] = await Promise.all([
        supabase
          .from('reservations')
          .select(selectCols)
          .order('created_at', { ascending: false }),
        supabase
          .from('circulation')
          .select('*, books(title, author)')
          .eq('status', 'checked_out'),
        supabase
          .from('members')
          .select('id, name, phone')
          .eq('status', 'active')
          .order('name'),
      ]);

      // Mark expired reservations (only if expires_at column exists)
      const now = new Date();
      let updated = resData || [];
      if (expiresAtExists) {
        updated = updated.map(r => {
          if (r.status === 'available' && r.expires_at && new Date(r.expires_at) < now) {
            return { ...r, status: 'expired' };
          }
          return r;
        });

        const toExpire = updated.filter((r, i) =>
          r.status === 'expired' && (resData || [])[i].status === 'available'
        );
        if (toExpire.length > 0) {
          await Promise.all(toExpire.map(r =>
            supabase.from('reservations').update({ status: 'expired' }).eq('id', r.id)
          ));
        }
      }

      setReservations(updated);

      // Unique books currently checked out
      const booksSeen = new Set();
      const unique = (circData || []).filter(c => {
        if (booksSeen.has(c.book_id)) return false;
        booksSeen.add(c.book_id);
        return true;
      });
      setCheckedOutBooks(unique);
      setMembers(membersData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReserve = async (e) => {
    e.preventDefault();
    if (!form.member_id || !form.book_id) return alert('Select both member and book.');
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('reservations')
        .select('id')
        .eq('member_id', form.member_id)
        .eq('book_id', form.book_id)
        .in('status', ['pending', 'available']);

      if (existing && existing.length > 0) {
        alert('This member already has an active reservation for this book.');
        setSaving(false);
        return;
      }

      // Count existing pending reservations for this book to set queue_position
      const { count } = await supabase
        .from('reservations')
        .select('*', { count: 'exact' })
        .eq('book_id', form.book_id)
        .in('status', ['pending', 'available']);

      const { error } = await supabase.from('reservations').insert({
        member_id: form.member_id,
        book_id: form.book_id,
        status: 'pending',
        queue_position: (count || 0) + 1,
      });

      if (error) throw error;
      setShowModal(false);
      setForm({ member_id: '', book_id: '' });
      probeSchema().then(fetchAll);
    } catch (err) {
      alert('Failed to create reservation: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const cancelReservation = async (id) => {
    if (!window.confirm('Cancel this reservation?')) return;
    await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', id);
    probeSchema().then(fetchAll);
  };

  const markFulfilled = async (id) => {
    await supabase.from('reservations').update({ status: 'fulfilled' }).eq('id', id);
    probeSchema().then(fetchAll);
  };

  const getQueuePosition = (reservation) => {
    if (reservation.status !== 'pending') return null;
    const sameBook = reservations
      .filter(r => r.book_id === reservation.book_id && r.status === 'pending')
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return sameBook.findIndex(r => r.id === reservation.id) + 1;
  };

  const filtered = reservations.filter(r => {
    const matchTab = activeTab === 'all' || r.status === activeTab;
    const term = searchTerm.toLowerCase();
    const matchSearch = !term ||
      r.members?.name?.toLowerCase().includes(term) ||
      r.books?.title?.toLowerCase().includes(term);
    return matchTab && matchSearch;
  });

  const counts = {
    all: reservations.length,
    pending: reservations.filter(r => r.status === 'pending').length,
    available: reservations.filter(r => r.status === 'available').length,
    fulfilled: reservations.filter(r => r.status === 'fulfilled').length,
    cancelled: reservations.filter(r => r.status === 'cancelled').length,
    expired: reservations.filter(r => r.status === 'expired').length,
  };

  const tabStyle = (tab) => ({
    padding: '8px 16px',
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
    fontWeight: activeTab === tab ? '600' : '400',
    background: activeTab === tab ? '#667eea' : '#f0f0f0',
    color: activeTab === tab ? 'white' : '#666',
    fontSize: '13px',
  });

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '4px' }}>🔖 Reservations</h1>
          <p style={{ color: '#999', fontSize: '14px' }}>Manage book reservation queue — first-come, first-served.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => probeSchema().then(fetchAll)} style={{ padding: '8px 16px', background: '#f0f0f0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
            🔄 Refresh
          </button>
          <button onClick={() => setShowModal(true)} style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
            + New Reservation
          </button>
        </div>
      </div>

      {/* Migration notice if expires_at column is missing */}
      {!hasExpiresAt && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '14px 18px', marginBottom: '16px' }}>
          <div style={{ fontWeight: '600', marginBottom: '6px', fontSize: '13px' }}>⚠️ Optional: Enable 48-Hour Expiry Feature</div>
          <div style={{ fontSize: '12px', color: '#555', marginBottom: '8px' }}>
            Run this SQL in your <strong>Supabase Dashboard → SQL Editor</strong> to enable automatic reservation expiry:
          </div>
          <code style={{ display: 'block', background: '#fff', border: '1px solid #ddd', borderRadius: '4px', padding: '8px 12px', fontSize: '12px', fontFamily: 'monospace' }}>
            ALTER TABLE reservations ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
          </code>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '6px' }}>All other reservation features work without this column.</div>
        </div>
      )}

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total', count: counts.all, color: '#667eea' },
          { label: 'Waiting', count: counts.pending, color: '#f39c12' },
          { label: 'Ready', count: counts.available, color: '#27ae60' },
          { label: 'Fulfilled', count: counts.fulfilled, color: '#3498db' },
          { label: 'Expired', count: counts.expired, color: '#95a5a6' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', borderRadius: '8px', padding: '15px', textAlign: 'center', borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: s.color }}>{s.count}</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div style={{ background: 'white', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['all', 'pending', 'available', 'fulfilled', 'cancelled', 'expired'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={tabStyle(tab)}>
                {tab === 'all' ? 'All' : STATUS_COLORS[tab]?.label || tab} ({counts[tab] || 0})
              </button>
            ))}
          </div>
          <input
            placeholder="Search member or book..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', width: '220px' }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>Loading reservations...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔖</div>
            <div>No reservations found</div>
            {activeTab === 'all' && <div style={{ fontSize: '13px', marginTop: '6px' }}>Click "+ New Reservation" to add one</div>}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
                {['#', 'Member', 'Book', 'Status', 'Queue', 'Reserved On', hasExpiresAt ? 'Expires (48hr)' : 'Expires', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#666', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx) => {
                const sc = STATUS_COLORS[r.status] || STATUS_COLORS.pending;
                const qPos = getQueuePosition(r);
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px 14px', color: '#999', fontSize: '13px' }}>{idx + 1}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{r.members?.name || '—'}</div>
                      <div style={{ fontSize: '12px', color: '#999' }}>{r.members?.phone || ''}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: '500', fontSize: '14px' }}>{r.books?.title || '—'}</div>
                      <div style={{ fontSize: '12px', color: '#999' }}>{r.books?.author || ''}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: sc.bg, color: sc.text, padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                        {sc.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {qPos != null ? (
                        <span style={{ background: qPos === 1 ? '#667eea' : '#e0e0e0', color: qPos === 1 ? 'white' : '#555', padding: '2px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: '600' }}>
                          #{qPos}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '13px', color: '#555' }}>
                      {r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '13px', color: r.status === 'available' ? '#c0392b' : '#555' }}>
                      {hasExpiresAt && r.status === 'available' && r.expires_at
                        ? `${new Date(r.expires_at).toLocaleDateString('en-IN')} ${new Date(r.expires_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
                        : '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {r.status === 'available' && (
                          <button onClick={() => markFulfilled(r.id)} style={{ padding: '4px 10px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                            ✓ Fulfilled
                          </button>
                        )}
                        {(r.status === 'pending' || r.status === 'available') && (
                          <button onClick={() => cancelReservation(r.id)} style={{ padding: '4px 10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                            ✕ Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* How it works */}
      <div style={{ marginTop: '16px', background: '#f0f4ff', border: '1px solid #c7d2fe', borderRadius: '8px', padding: '14px 18px' }}>
        <div style={{ fontWeight: '600', marginBottom: '6px', fontSize: '13px' }}>ℹ️ How Reservations Work</div>
        <div style={{ fontSize: '12px', color: '#555', lineHeight: '1.7' }}>
          1. A member reserves a book that is currently checked out.<br />
          2. When the book is returned via the <strong>Borrow</strong> page, the #1 member in queue is automatically moved to "Ready to Pick Up".<br />
          3. They have <strong>48 hours</strong> to collect it (requires expires_at column — see notice above if not enabled).<br />
          4. Once picked up, click <strong>✓ Fulfilled</strong>. If not collected, click <strong>✕ Cancel</strong> and re-reserve for the next person.
        </div>
      </div>

      {/* New Reservation Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '420px', maxWidth: '95vw' }}>
            <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>🔖 New Reservation</h2>
            <form onSubmit={handleReserve}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px' }}>Member *</label>
                <select
                  value={form.member_id}
                  onChange={e => setForm({ ...form, member_id: e.target.value })}
                  required
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                >
                  <option value="">Select a member...</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} — {m.phone}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px' }}>Book (currently checked out) *</label>
                <select
                  value={form.book_id}
                  onChange={e => setForm({ ...form, book_id: e.target.value })}
                  required
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                >
                  <option value="">Select a book...</option>
                  {checkedOutBooks.map(c => (
                    <option key={c.book_id} value={c.book_id}>
                      {c.books?.title} — {c.books?.author}
                    </option>
                  ))}
                </select>
                {checkedOutBooks.length === 0 && (
                  <div style={{ fontSize: '12px', color: '#f39c12', marginTop: '6px' }}>No books are currently checked out.</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowModal(false); setForm({ member_id: '', book_id: '' }); }}
                  style={{ padding: '9px 20px', background: '#f0f0f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  style={{ padding: '9px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                  {saving ? 'Saving...' : 'Reserve Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
