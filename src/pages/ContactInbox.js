import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';

// =====================================================================
// /store/inbox — Submissions from the Contact Form block.
//
// Reads from contact_submissions (populated by the ContactForm block
// in tapas-store/src/blocks/BlockLibrary.js). Staff can:
//   - Filter by status: New / Read / Replied / Archived / All
//   - Expand a row to see the full message
//   - Mark as read / replied / archived
//   - Click an email to open their mail client with a prefilled reply
//   - Delete (with confirm)
// =====================================================================

const STATUS_META = {
  new:      { label: '🔵 New',      bg: '#dbeafe', text: '#1e40af' },
  read:     { label: '👁  Read',    bg: '#e5e7eb', text: '#374151' },
  replied:  { label: '✉️  Replied', bg: '#d1fae5', text: '#065f46' },
  archived: { label: '📁 Archived', bg: '#f3f4f6', text: '#6b7280' },
};

const FILTERS = [
  { key: 'inbox',    label: 'Inbox',    match: ['new', 'read'] },
  { key: 'new',      label: 'New',      match: ['new'] },
  { key: 'replied',  label: 'Replied',  match: ['replied'] },
  { key: 'archived', label: 'Archived', match: ['archived'] },
  { key: 'all',      label: 'All',      match: null },
];

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return `Today ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  const yest = new Date(now); yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) {
    return `Yesterday ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ContactInbox() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('inbox');
  const [expandedId, setExpandedId] = useState(null);
  const [actioning, setActioning] = useState(null);
  const [error, setError] = useState('');

  const fetchRows = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data, error: err } = await supabase
        .from('contact_submissions')
        .select('id, name, email, message, source_page, status, staff_notes, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(500);
      if (err) throw err;
      setRows(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load submissions');
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
        .from('contact_submissions')
        .update(patch)
        .eq('id', row.id);
      if (err) throw err;
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, ...patch } : r));
    } catch (err) {
      alert('Failed to update: ' + err.message);
    } finally {
      setActioning(null);
    }
  };

  const deleteRow = async (row) => {
    if (!window.confirm(`Permanently delete submission from ${row.name}? This cannot be undone.`)) return;
    if (actioning) return;
    setActioning(row.id);
    try {
      const { error: err } = await supabase.from('contact_submissions').delete().eq('id', row.id);
      if (err) throw err;
      setRows(prev => prev.filter(r => r.id !== row.id));
      if (expandedId === row.id) setExpandedId(null);
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    } finally {
      setActioning(null);
    }
  };

  const toggleExpand = (row) => {
    if (expandedId === row.id) {
      setExpandedId(null);
    } else {
      setExpandedId(row.id);
      // Auto-mark-read the first time we open a "new" message.
      if (row.status === 'new') patchRow(row, { status: 'read' });
    }
  };

  const visibleRows = rows.filter(r => {
    const f = FILTERS.find(x => x.key === filter);
    if (!f || !f.match) return true;
    return f.match.includes(r.status);
  });

  const countByFilter = (f) => {
    if (!f.match) return rows.length;
    return rows.filter(r => f.match.includes(r.status)).length;
  };

  const newCount = rows.filter(r => r.status === 'new').length;

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '20px', flexWrap: 'wrap', gap: '12px',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#2c3e50' }}>
            📨 Contact Inbox
            {newCount > 0 && (
              <span style={{
                marginLeft: '10px', padding: '3px 10px',
                background: '#ef4444', color: 'white',
                borderRadius: '12px', fontSize: '12px', fontWeight: '700',
                verticalAlign: 'middle',
              }}>{newCount} new</span>
            )}
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#6b7280' }}>
            Messages from the Contact Form block on your public website.
          </p>
        </div>
        <button
          onClick={fetchRows}
          style={{
            padding: '8px 16px', background: '#667eea', color: 'white',
            border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600',
          }}
        >↻ Refresh</button>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '8px 16px',
              background: filter === f.key ? '#667eea' : 'white',
              color: filter === f.key ? 'white' : '#2c3e50',
              border: `1.5px solid ${filter === f.key ? '#667eea' : '#dfe4ea'}`,
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '13px',
            }}
          >
            {f.label} ({countByFilter(f)})
          </button>
        ))}
      </div>

      {error && (
        <div style={{
          padding: '12px 16px', marginBottom: '16px',
          background: '#fef2f2', border: '1px solid #fecaca',
          color: '#991b1b', borderRadius: '8px', fontSize: '13px',
        }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#8B6914' }}>
          Loading submissions…
        </div>
      ) : visibleRows.length === 0 ? (
        <div style={{
          padding: '60px', textAlign: 'center', color: '#999',
          background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
          <p style={{ margin: 0, fontWeight: 600 }}>
            {filter === 'inbox' ? 'No new messages.' : `Nothing in ${FILTERS.find(f => f.key === filter)?.label || filter}.`}
          </p>
          <p style={{ margin: '6px 0 0', fontSize: '13px' }}>
            Submissions from the Contact Form block will appear here.
          </p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          {visibleRows.map((row, idx) => {
            const expanded = expandedId === row.id;
            const statusMeta = STATUS_META[row.status] || STATUS_META.new;
            const isNew = row.status === 'new';
            return (
              <div
                key={row.id}
                style={{
                  borderBottom: idx === visibleRows.length - 1 ? 'none' : '1px solid #f1f5f9',
                  background: isNew ? '#fefce8' : 'white',
                }}
              >
                {/* Row header */}
                <div
                  onClick={() => toggleExpand(row)}
                  style={{
                    padding: '14px 20px', cursor: 'pointer',
                    display: 'grid',
                    gridTemplateColumns: '1fr 2fr auto auto',
                    gap: '16px', alignItems: 'center',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: isNew ? 700 : 600, color: '#111827', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.email}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '13px', color: '#374151',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontWeight: isNew ? 600 : 400,
                  }}>
                    {row.message}
                  </div>
                  <span style={{
                    padding: '3px 10px',
                    background: statusMeta.bg, color: statusMeta.text,
                    borderRadius: '12px', fontSize: '11px', fontWeight: '700',
                  }}>{statusMeta.label}</span>
                  <span style={{ fontSize: '11px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                    {fmtDate(row.created_at)}
                  </span>
                </div>

                {/* Expanded content */}
                {expanded && (
                  <div style={{
                    padding: '0 20px 20px', borderTop: '1px solid #f1f5f9',
                    background: '#fafafa',
                  }}>
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px',
                      padding: '16px 0', fontSize: '13px', color: '#374151',
                    }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Name</div>
                        <div style={{ fontWeight: 600 }}>{row.name}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Email</div>
                        <a href={`mailto:${row.email}?subject=Re:%20Your%20message%20to%20Tapas%20Reading%20Cafe`}
                          style={{ color: '#667eea', textDecoration: 'none', fontWeight: 600 }}
                          onClick={(e) => e.stopPropagation()}
                        >{row.email} ↗</a>
                      </div>
                      {row.source_page && (
                        <div>
                          <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Source page</div>
                          <div style={{ fontWeight: 600 }}>{row.source_page}</div>
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Received</div>
                        <div>{new Date(row.created_at).toLocaleString()}</div>
                      </div>
                    </div>

                    <div style={{
                      padding: '16px', background: 'white',
                      border: '1px solid #e5e7eb', borderRadius: '8px',
                      fontSize: '14px', color: '#111827',
                      whiteSpace: 'pre-wrap', lineHeight: 1.6,
                    }}>
                      {row.message}
                    </div>

                    {/* Action buttons */}
                    <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <a
                        href={`mailto:${encodeURIComponent(row.email)}?subject=${encodeURIComponent('Re: Your message to Tapas Reading Cafe')}&body=${encodeURIComponent(`Hi ${row.name},\n\n\n\n—\n\nOn ${new Date(row.created_at).toLocaleString()} you wrote:\n\n> ${row.message.split('\n').join('\n> ')}`)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (row.status !== 'replied') patchRow(row, { status: 'replied' });
                        }}
                        style={{
                          padding: '8px 14px', background: '#667eea', color: 'white',
                          border: 'none', borderRadius: '6px',
                          fontSize: '13px', fontWeight: '600',
                          textDecoration: 'none',
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                        }}
                      >✉️ Reply by email</a>

                      {row.status !== 'replied' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); patchRow(row, { status: 'replied' }); }}
                          disabled={actioning === row.id}
                          style={{
                            padding: '8px 14px', background: '#10b981', color: 'white',
                            border: 'none', borderRadius: '6px',
                            fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                            opacity: actioning === row.id ? 0.6 : 1,
                          }}
                        >Mark replied</button>
                      )}
                      {row.status !== 'new' && row.status !== 'archived' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); patchRow(row, { status: 'archived' }); }}
                          disabled={actioning === row.id}
                          style={{
                            padding: '8px 14px', background: '#6b7280', color: 'white',
                            border: 'none', borderRadius: '6px',
                            fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                            opacity: actioning === row.id ? 0.6 : 1,
                          }}
                        >Archive</button>
                      )}
                      {row.status === 'archived' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); patchRow(row, { status: 'read' }); }}
                          disabled={actioning === row.id}
                          style={{
                            padding: '8px 14px', background: 'white', color: '#374151',
                            border: '1px solid #d1d5db', borderRadius: '6px',
                            fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                            opacity: actioning === row.id ? 0.6 : 1,
                          }}
                        >Restore</button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteRow(row); }}
                        disabled={actioning === row.id}
                        style={{
                          marginLeft: 'auto',
                          padding: '8px 14px', background: 'white', color: '#dc2626',
                          border: '1px solid #fecaca', borderRadius: '6px',
                          fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                          opacity: actioning === row.id ? 0.6 : 1,
                        }}
                      >🗑 Delete</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
