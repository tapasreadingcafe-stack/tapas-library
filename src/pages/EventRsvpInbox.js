import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../utils/supabase';

// =====================================================================
// /store/rsvps — RSVPs collected by the Event RSVP block.
// =====================================================================

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function EventRsvpInbox() {
  const [rows, setRows] = useState([]);
  const [events, setEvents] = useState({}); // id → event
  const [loading, setLoading] = useState(true);
  const [filterEvent, setFilterEvent] = useState('');
  const [error, setError] = useState('');

  const fetchRows = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data, error: err } = await supabase
        .from('event_registrations')
        .select('id, event_id, member_id, guest_name, guest_email, guest_phone, ticket_count, status, notes, source_page, created_at')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (err) throw err;
      setRows(data || []);
      const eventIds = [...new Set((data || []).map(r => r.event_id).filter(Boolean))];
      if (eventIds.length) {
        const { data: evRows } = await supabase.from('events').select('id, title, event_date, start_time, location').in('id', eventIds);
        const map = {};
        (evRows || []).forEach(e => { map[e.id] = e; });
        setEvents(map);
      }
    } catch (err) {
      setError(err.message || 'Failed to load RSVPs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const deleteRow = async (row) => {
    if (!window.confirm('Delete this RSVP? The visitor will not be notified.')) return;
    try {
      const { error: err } = await supabase.from('event_registrations').delete().eq('id', row.id);
      if (err) throw err;
      setRows(prev => prev.filter(r => r.id !== row.id));
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  };

  const visible = useMemo(() => {
    return rows.filter(r => !filterEvent || r.event_id === filterEvent);
  }, [rows, filterEvent]);

  const exportCsv = () => {
    const header = 'event,name,email,phone,guests,status,source_page,rsvp_at\n';
    const body = visible.map(r => {
      const ev = events[r.event_id]?.title || r.event_id || '';
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      return [ev, r.guest_name, r.guest_email, r.guest_phone, r.ticket_count, r.status, r.source_page, r.created_at].map(esc).join(',');
    }).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `rsvps-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const eventsList = Object.values(events).sort((a, b) => (a.event_date || '').localeCompare(b.event_date || ''));

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#2c3e50' }}>
            🎟 Event RSVPs
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#6b7280' }}>
            Visitors who reserved a spot through the Event RSVP block.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={exportCsv} disabled={visible.length === 0}
            style={{ padding: '8px 16px', background: '#fff', color: '#2c3e50', border: '1.5px solid #dfe4ea', borderRadius: '6px', cursor: visible.length ? 'pointer' : 'not-allowed', fontWeight: 600, opacity: visible.length ? 1 : 0.5 }}
          >⬇ Export CSV</button>
          <button onClick={fetchRows} style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setFilterEvent('')} style={{
          padding: '8px 16px',
          background: !filterEvent ? '#667eea' : 'white',
          color: !filterEvent ? 'white' : '#2c3e50',
          border: `1.5px solid ${!filterEvent ? '#667eea' : '#dfe4ea'}`,
          borderRadius: '20px', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
        }}>All events ({rows.length})</button>
        {eventsList.map(ev => {
          const n = rows.filter(r => r.event_id === ev.id).length;
          return (
            <button key={ev.id} onClick={() => setFilterEvent(ev.id)} style={{
              padding: '8px 16px',
              background: filterEvent === ev.id ? '#667eea' : 'white',
              color: filterEvent === ev.id ? 'white' : '#2c3e50',
              border: `1.5px solid ${filterEvent === ev.id ? '#667eea' : '#dfe4ea'}`,
              borderRadius: '20px', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
            }}>{ev.title} ({n})</button>
          );
        })}
      </div>

      {error && <div style={{ padding: '12px 16px', marginBottom: '16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '8px', fontSize: '13px' }}>⚠️ {error}</div>}

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#8B6914' }}>Loading…</div>
      ) : visible.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#999', background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎟</div>
          <p style={{ margin: 0, fontWeight: 600 }}>No RSVPs yet.</p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Event</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Guest</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Guests</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>When</th>
                <th style={{ padding: '10px 16px' }}></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row, idx) => (
                <tr key={row.id} style={{ borderBottom: idx === visible.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', color: '#374151' }}>
                    {events[row.event_id]?.title || <span style={{ color: '#9ca3af' }}>Unknown</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{row.guest_name || 'Anonymous'}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {row.guest_email && <>{row.guest_email}</>}
                      {row.guest_phone && <> · {row.guest_phone}</>}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#111827' }}>
                    {row.ticket_count || 1}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '12px' }}>{fmtDate(row.created_at)}</td>
                  <td style={{ padding: '8px 16px', textAlign: 'right' }}>
                    <button onClick={() => deleteRow(row)}
                      style={{ padding: '5px 10px', background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                    >🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
