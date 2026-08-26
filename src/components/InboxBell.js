/* Website & Events inbox bell.
 *
 * A notifier for the two streams that come in from the public site: contact /
 * website form submissions and event registrations. It deliberately sits apart
 * from NotificationBell — that one carries operational alerts (overdue books,
 * low stock, expiring memberships) and runs into the hundreds, which buries
 * anything a visitor actually sent us.
 *
 * This bell owns no state in the database. "Seen" is a local timestamp, so the
 * badge clears when staff look at it while the Website Forms page keeps its own
 * authoritative New/Read/Replied status.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';

const SEEN_KEY = 'tapas_inbox_bell_last_seen';
const POLL_MS = 60 * 1000;
const MAX_ROWS = 15;

function getLastSeen() {
  try {
    return localStorage.getItem(SEEN_KEY) || '1970-01-01T00:00:00.000Z';
  } catch {
    return '1970-01-01T00:00:00.000Z';
  }
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function truncate(s, n) {
  const t = (s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

export default function InboxBell() {
  const navigate = useNavigate();
  const [forms, setForms] = useState([]);
  const [rsvps, setRsvps] = useState([]);
  const [lastSeen, setLastSeen] = useState(getLastSeen);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const fetchAll = useCallback(async () => {
    // Both queries are best-effort: a missing table or a denied policy should
    // leave the bell empty, never break the navbar.
    try {
      const { data } = await supabase
        .from('contact_submissions')
        .select('id, name, email, message, status, created_at')
        .order('created_at', { ascending: false })
        .limit(MAX_ROWS);
      setForms(data || []);
    } catch (e) {
      console.error('InboxBell: contact_submissions failed', e);
    }

    try {
      const { data } = await supabase
        .from('event_registrations')
        .select('id, event_id, guest_name, guest_email, ticket_count, created_at')
        .order('created_at', { ascending: false })
        .limit(MAX_ROWS);
      const rows = data || [];
      const ids = [...new Set(rows.map(r => r.event_id).filter(Boolean))];
      let titles = {};
      if (ids.length) {
        const { data: evs } = await supabase.from('events').select('id, title').in('id', ids);
        (evs || []).forEach(e => { titles[e.id] = e.title; });
      }
      setRsvps(rows.map(r => ({ ...r, eventTitle: titles[r.event_id] || 'Event' })));
    } catch (e) {
      console.error('InboxBell: event_registrations failed', e);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, POLL_MS);
    return () => clearInterval(t);
  }, [fetchAll]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const isUnseen = (row) => new Date(row.created_at) > new Date(lastSeen);
  const unseenForms = forms.filter(isUnseen);
  const unseenRsvps = rsvps.filter(isUnseen);
  const count = unseenForms.length + unseenRsvps.length;

  // Opening the bell is the "I've looked at it" signal — the badge clears, but
  // the list still shows recent items so nothing disappears out from under you.
  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && count > 0) {
      const now = new Date().toISOString();
      try { localStorage.setItem(SEEN_KEY, now); } catch { /* private mode */ }
      setLastSeen(now);
    }
  };

  const go = (path) => { setOpen(false); navigate(path); };

  const sectionHeader = (text, action, onAction) => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 14px', background: '#fafbfc', borderBottom: '1px solid #f0f0f0',
      fontSize: '10px', fontWeight: '800', letterSpacing: '0.6px', color: '#6b7280',
      position: 'sticky', top: 0, zIndex: 1,
    }}>
      <span>{text}</span>
      <button onClick={onAction} style={{
        background: 'none', border: 'none', cursor: 'pointer', color: '#667eea',
        fontSize: '10px', fontWeight: '800', letterSpacing: '0.4px', padding: 0,
      }}>{action}</button>
    </div>
  );

  const rowStyle = (unseen) => ({
    display: 'flex', gap: '10px', alignItems: 'flex-start', width: '100%',
    padding: '10px 14px', cursor: 'pointer', textAlign: 'left',
    background: unseen ? '#fffbeb' : 'white',
    border: 'none', borderBottom: '1px solid #f5f5f5', font: 'inherit',
  });

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={toggle} className="menu-toggle" title="Website forms & event registrations"
        style={{ fontSize: '18px', position: 'relative' }}>
        📥
        {count > 0 && (
          <span style={{
            position: 'absolute', top: '-2px', right: '-4px', minWidth: '17px', height: '17px',
            padding: '0 4px', background: '#ef4444', color: 'white', borderRadius: '9px',
            fontSize: '10px', fontWeight: '800', lineHeight: '17px', textAlign: 'center',
            boxSizing: 'border-box',
          }}>{count > 99 ? '99+' : count}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '360px', maxWidth: '92vw',
          background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.16)', overflow: 'hidden', zIndex: 100,
        }}>
          <div style={{ padding: '11px 14px', borderBottom: '1px solid #f0f0f0', fontWeight: '800', fontSize: '13px', color: '#111827' }}>
            From the website
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {sectionHeader(
              `WEBSITE FORMS${unseenForms.length ? ` (${unseenForms.length} NEW)` : ''}`,
              'VIEW ALL', () => go('/store/inbox'))}
            {forms.length === 0 ? (
              <div style={{ padding: '14px', fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>No submissions yet</div>
            ) : forms.slice(0, 5).map(f => (
              <button key={f.id} onClick={() => go('/store/inbox')} style={rowStyle(isUnseen(f))}>
                <span style={{ fontSize: '15px', flexShrink: 0, lineHeight: 1.3 }}>✉️</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontWeight: '700', fontSize: '12px', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.name || '(Anonymous)'}
                    </span>
                    <span style={{ fontSize: '10px', color: '#9ca3af', flexShrink: 0 }}>{timeAgo(f.created_at)}</span>
                  </span>
                  <span style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                    {truncate(f.message || f.email, 52)}
                  </span>
                </span>
              </button>
            ))}

            {sectionHeader(
              `EVENT REGISTRATIONS${unseenRsvps.length ? ` (${unseenRsvps.length} NEW)` : ''}`,
              'VIEW ALL', () => go('/store/rsvps'))}
            {rsvps.length === 0 ? (
              <div style={{ padding: '14px', fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>No registrations yet</div>
            ) : rsvps.slice(0, 5).map(r => (
              <button key={r.id} onClick={() => go('/store/rsvps')} style={rowStyle(isUnseen(r))}>
                <span style={{ fontSize: '15px', flexShrink: 0, lineHeight: 1.3 }}>🎟️</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontWeight: '700', fontSize: '12px', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.guest_name || r.guest_email || 'Guest'}
                    </span>
                    <span style={{ fontSize: '10px', color: '#9ca3af', flexShrink: 0 }}>{timeAgo(r.created_at)}</span>
                  </span>
                  <span style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                    {truncate(r.eventTitle, 40)}{r.ticket_count > 1 ? ` · ${r.ticket_count} tickets` : ''}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
