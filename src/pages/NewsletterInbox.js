import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../utils/supabase';

// =====================================================================
// /store/newsletter — Subscribers collected by the Newsletter block.
//
// Shows the list with a search box, a status filter, and per-row
// unsubscribe / delete. One-click CSV export for sending into Mailchimp
// / Buttondown / whatever the staff actually use to send the emails.
// =====================================================================

const STATUS_META = {
  active:       { label: '✓ Active',        bg: '#d1fae5', text: '#065f46' },
  unsubscribed: { label: '✗ Unsubscribed',  bg: '#fee2e2', text: '#991b1b' },
};

const FILTERS = [
  { key: 'active',       label: 'Active',       match: ['active'] },
  { key: 'unsubscribed', label: 'Unsubscribed', match: ['unsubscribed'] },
  { key: 'all',          label: 'All',          match: null },
];

export default function NewsletterInbox() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [query, setQuery] = useState('');
  const [actioning, setActioning] = useState(null);
  const [error, setError] = useState('');

  const fetchRows = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data, error: err } = await supabase
        .from('newsletter_subscribers')
        .select('id, email, source_page, status, created_at')
        .order('created_at', { ascending: false })
        .limit(2000);
      if (err) throw err;
      setRows(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load subscribers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const patchRow = async (row, patch) => {
    if (actioning) return;
    setActioning(row.id);
    try {
      const { error: err } = await supabase
        .from('newsletter_subscribers')
        .update(patch)
        .eq('id', row.id);
      if (err) throw err;
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, ...patch } : r));
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setActioning(null);
    }
  };

  const deleteRow = async (row) => {
    if (!window.confirm(`Permanently delete ${row.email}? This cannot be undone.`)) return;
    if (actioning) return;
    setActioning(row.id);
    try {
      const { error: err } = await supabase.from('newsletter_subscribers').delete().eq('id', row.id);
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
    const q = query.trim().toLowerCase();
    return rows.filter(r => {
      if (f?.match && !f.match.includes(r.status)) return false;
      if (q && !r.email.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, filter, query]);

  const activeCount = rows.filter(r => r.status === 'active').length;

  const exportCsv = () => {
    const header = 'email,status,source_page,subscribed_at\n';
    const body = rows.map(r => {
      const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      return [r.email, r.status, r.source_page || '', r.created_at || ''].map(escape).join(',');
    }).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '20px', flexWrap: 'wrap', gap: '12px',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#2c3e50' }}>
            💌 Newsletter
            <span style={{
              marginLeft: '10px', padding: '3px 10px',
              background: '#0d99ff', color: 'white',
              borderRadius: '12px', fontSize: '12px', fontWeight: '700',
              verticalAlign: 'middle',
            }}>{activeCount} active</span>
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#6b7280' }}>
            Addresses collected by the Newsletter block on your public website.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={exportCsv}
            disabled={rows.length === 0}
            style={{
              padding: '8px 16px', background: '#fff',
              color: '#2c3e50', border: '1.5px solid #dfe4ea',
              borderRadius: '6px', cursor: rows.length ? 'pointer' : 'not-allowed',
              fontWeight: '600', opacity: rows.length ? 1 : 0.5,
            }}
          >⬇ Export CSV</button>
          <button
            onClick={fetchRows}
            style={{
              padding: '8px 16px', background: '#667eea', color: 'white',
              border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600',
            }}
          >↻ Refresh</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        {FILTERS.map(f => {
          const count = f.match ? rows.filter(r => f.match.includes(r.status)).length : rows.length;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '8px 16px',
                background: filter === f.key ? '#667eea' : 'white',
                color: filter === f.key ? 'white' : '#2c3e50',
                border: `1.5px solid ${filter === f.key ? '#667eea' : '#dfe4ea'}`,
                borderRadius: '20px', cursor: 'pointer',
                fontWeight: '600', fontSize: '13px',
              }}
            >{f.label} ({count})</button>
          );
        })}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 Search email…"
          style={{
            flex: 1, minWidth: '180px',
            padding: '8px 12px', background: '#fff',
            border: '1.5px solid #dfe4ea', borderRadius: '20px',
            fontSize: '13px', outline: 'none',
          }}
        />
      </div>

      {error && (
        <div style={{
          padding: '12px 16px', marginBottom: '16px',
          background: '#fef2f2', border: '1px solid #fecaca',
          color: '#991b1b', borderRadius: '8px', fontSize: '13px',
        }}>⚠️ {error}</div>
      )}

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#8B6914' }}>Loading…</div>
      ) : visible.length === 0 ? (
        <div style={{
          padding: '60px', textAlign: 'center', color: '#999',
          background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>💌</div>
          <p style={{ margin: 0, fontWeight: 600 }}>
            {query ? `No emails match "${query}".` :
             filter === 'active' ? 'No active subscribers yet.' :
             `Nothing in ${FILTERS.find(f => f.key === filter)?.label || filter}.`}
          </p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Source</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Subscribed</th>
                <th style={{ padding: '10px 16px' }}></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row, idx) => {
                const s = STATUS_META[row.status] || STATUS_META.active;
                return (
                  <tr key={row.id} style={{ borderBottom: idx === visible.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>{row.email}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '3px 10px', background: s.bg, color: s.text, borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>
                        {s.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b7280', fontFamily: 'ui-monospace, monospace', fontSize: '12px' }}>{row.source_page || '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '12px' }}>
                      {row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '8px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {row.status === 'active' ? (
                        <button
                          onClick={() => patchRow(row, { status: 'unsubscribed' })}
                          disabled={actioning === row.id}
                          style={{
                            padding: '5px 10px', background: '#fff', color: '#6b7280',
                            border: '1px solid #e5e7eb', borderRadius: '4px',
                            fontSize: '11px', fontWeight: '600', cursor: 'pointer',
                            marginRight: '6px',
                          }}
                        >Unsubscribe</button>
                      ) : (
                        <button
                          onClick={() => patchRow(row, { status: 'active' })}
                          disabled={actioning === row.id}
                          style={{
                            padding: '5px 10px', background: '#10b981', color: '#fff',
                            border: 'none', borderRadius: '4px',
                            fontSize: '11px', fontWeight: '600', cursor: 'pointer',
                            marginRight: '6px',
                          }}
                        >Re-subscribe</button>
                      )}
                      <button
                        onClick={() => deleteRow(row)}
                        disabled={actioning === row.id}
                        style={{
                          padding: '5px 10px', background: '#fff', color: '#dc2626',
                          border: '1px solid #fecaca', borderRadius: '4px',
                          fontSize: '11px', fontWeight: '600', cursor: 'pointer',
                        }}
                      >🗑</button>
                    </td>
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
