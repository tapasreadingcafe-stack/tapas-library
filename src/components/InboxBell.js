/* Website & Events inbox bells.
 *
 * Two notifiers for the two streams that come in from the public site:
 * contact / website form submissions, and event registrations. They sit apart
 * from NotificationBell — that one carries operational alerts (overdue books,
 * low stock, expiring memberships) and runs into the hundreds, which buries
 * anything a visitor actually sent us.
 *
 * They are also separate from each other: the two streams go to different
 * people and different pages, so one shared badge told you something arrived
 * without telling you whose job it was.
 *
 * Neither bell owns state in the database. "Seen" is a local timestamp per
 * stream, so a badge clears when staff look at that stream while the Website
 * Forms / Event RSVPs pages keep their own authoritative status.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';

const FORMS_SEEN_KEY = 'tapas_inbox_bell_forms_last_seen';
const RSVPS_SEEN_KEY = 'tapas_inbox_bell_rsvps_last_seen';
// The single bell these two replaced. Read once, so splitting the bell doesn't
// re-flag everything staff had already worked through.
const LEGACY_SEEN_KEY = 'tapas_inbox_bell_last_seen';
const EPOCH = '1970-01-01T00:00:00.000Z';
const POLL_MS = 60 * 1000;
const MAX_ROWS = 15;

function getLastSeen(key) {
  try {
    return localStorage.getItem(key) || localStorage.getItem(LEGACY_SEEN_KEY) || EPOCH;
  } catch {
    return EPOCH;
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

const rowStyle = (unseen) => ({
  display: 'flex', gap: '10px', alignItems: 'flex-start', width: '100%',
  padding: '10px 14px', cursor: 'pointer', textAlign: 'left',
  background: unseen ? '#fffbeb' : 'white',
  border: 'none', borderBottom: '1px solid #f5f5f5', font: 'inherit',
});

/* One bell over one stream. `fetchRows` and `renderRow` are defined at module
 * scope by each caller below so they stay referentially stable across renders. */
function Bell({ icon, title, tooltip, seenKey, viewAllPath, emptyText, fetchRows, renderRow }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [lastSeen, setLastSeen] = useState(() => getLastSeen(seenKey));
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const load = useCallback(async () => {
    // Best-effort: a missing table or a denied policy should leave the bell
    // empty, never break the navbar.
    try {
      setRows(await fetchRows() || []);
    } catch (e) {
      console.error(`InboxBell: ${title} fetch failed`, e);
    }
  }, [fetchRows, title]);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const isUnseen = (row) => new Date(row.created_at) > new Date(lastSeen);
  const count = rows.filter(isUnseen).length;

  // Opening the bell is the "I've looked at it" signal — the badge clears, but
  // the list still shows recent items so nothing disappears out from under you.
  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && count > 0) {
      const now = new Date().toISOString();
      try { localStorage.setItem(seenKey, now); } catch { /* private mode */ }
      setLastSeen(now);
    }
  };

  const go = () => { setOpen(false); navigate(viewAllPath); };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={toggle} className="menu-toggle" title={tooltip}
        style={{ fontSize: '18px', position: 'relative' }}>
        {icon}
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
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '340px', maxWidth: '92vw',
          background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.16)', overflow: 'hidden', zIndex: 100,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
            padding: '11px 14px', borderBottom: '1px solid #f0f0f0',
          }}>
            <span style={{ fontWeight: '800', fontSize: '13px', color: '#111827' }}>
              {title}{count ? ` (${count} new)` : ''}
            </span>
            <button onClick={go} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: '#667eea',
              fontSize: '10px', fontWeight: '800', letterSpacing: '0.4px', padding: 0,
            }}>VIEW ALL</button>
          </div>

          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {rows.length === 0 ? (
              <div style={{ padding: '18px 14px', fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>{emptyText}</div>
            ) : rows.slice(0, 6).map(row => (
              <button key={row.id} onClick={go} style={rowStyle(isUnseen(row))}>
                <span style={{ fontSize: '15px', flexShrink: 0, lineHeight: 1.3 }}>{icon}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontWeight: '700', fontSize: '12px', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {renderRow(row).title}
                    </span>
                    <span style={{ fontSize: '10px', color: '#9ca3af', flexShrink: 0 }}>{timeAgo(row.created_at)}</span>
                  </span>
                  <span style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                    {renderRow(row).subtitle}
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

async function fetchForms() {
  const { data } = await supabase
    .from('contact_submissions')
    .select('id, name, email, message, status, created_at')
    .order('created_at', { ascending: false })
    .limit(MAX_ROWS);
  return data;
}

const renderForm = (f) => ({
  title: f.name || '(Anonymous)',
  subtitle: truncate(f.message || f.email, 52),
});

export function WebsiteFormsBell() {
  return (
    <Bell
      icon="✉️"
      title="Website forms"
      tooltip="Website form submissions"
      seenKey={FORMS_SEEN_KEY}
      viewAllPath="/store/inbox"
      emptyText="No submissions yet"
      fetchRows={fetchForms}
      renderRow={renderForm}
    />
  );
}

async function fetchRsvps() {
  const { data } = await supabase
    .from('event_registrations')
    .select('id, event_id, guest_name, guest_email, ticket_count, created_at')
    .order('created_at', { ascending: false })
    .limit(MAX_ROWS);
  const rows = data || [];
  const ids = [...new Set(rows.map(r => r.event_id).filter(Boolean))];
  const titles = {};
  if (ids.length) {
    const { data: evs } = await supabase.from('events').select('id, title').in('id', ids);
    (evs || []).forEach(e => { titles[e.id] = e.title; });
  }
  return rows.map(r => ({ ...r, eventTitle: titles[r.event_id] || 'Event' }));
}

const renderRsvp = (r) => ({
  title: r.guest_name || r.guest_email || 'Guest',
  subtitle: `${truncate(r.eventTitle, 40)}${r.ticket_count > 1 ? ` · ${r.ticket_count} tickets` : ''}`,
});

export function EventRsvpBell() {
  return (
    <Bell
      icon="🎟️"
      title="Event registrations"
      tooltip="Event registrations"
      seenKey={RSVPS_SEEN_KEY}
      viewAllPath="/store/rsvps"
      emptyText="No registrations yet"
      fetchRows={fetchRsvps}
      renderRow={renderRsvp}
    />
  );
}
