import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useNavigate } from 'react-router-dom';
import { usePermission } from '../hooks/usePermission';
import ViewOnlyBanner from '../components/ViewOnlyBanner';

const SETUP_SQL = `
-- Run this SQL in your Supabase SQL Editor:

CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT DEFAULT 'one_time',
  recurrence_rule TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  location TEXT DEFAULT 'Library Hall',
  is_paid BOOLEAN DEFAULT false,
  ticket_price NUMERIC DEFAULT 0,
  capacity INTEGER,
  waitlist_enabled BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'upcoming',
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id),
  registration_date TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'registered',
  ticket_count INTEGER DEFAULT 1,
  amount_paid NUMERIC DEFAULT 0,
  payment_method TEXT,
  notes TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_member ON event_registrations(event_id, member_id);

CREATE TABLE IF NOT EXISTS event_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id),
  registration_id UUID REFERENCES event_registrations(id),
  checked_in_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open" ON events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON event_registrations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON event_attendance FOR ALL USING (true) WITH CHECK (true);
`;

export default function EventListing() {
  const navigate = useNavigate();
  const { isReadOnly, canManageEvents } = usePermission();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableReady, setTableReady] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    const check = async () => {
      const { error } = await supabase.from('events').select('id').limit(0);
      if (error) { setTableReady(false); setLoading(false); return; }
      fetchEvents();
    };
    check();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    const { data } = await supabase.from('events').select('*').order('start_date', { ascending: true });
    setEvents(data || []);
    setLoading(false);
  };

  // Local date, not toISOString() — that yields UTC, so between midnight and
  // 05:30 IST "today" would still read as yesterday and an event happening
  // today would be filed under tomorrow.
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Which bucket an event belongs in. The DATE decides, not the stored status:
  // `status` is written once when the event is created and never revisited, so
  // a finished event still says 'upcoming' forever. That's why past events kept
  // appearing under Upcoming — and, because the Past tab matched on date, the
  // same event was counted in both tabs at once.
  //
  // A multi-day event counts as still running until its end_date passes.
  const bucketOf = (e) => {
    if (e.status === 'cancelled') return 'cancelled';
    const endsOn = e.end_date || e.start_date;
    if (e.status === 'completed' || (endsOn && endsOn < today)) return 'past';
    return 'upcoming';
  };
  const filtered = events.filter(e => {
    if (activeTab === 'upcoming') return bucketOf(e) === 'upcoming';
    if (activeTab === 'past') return bucketOf(e) === 'past';
    if (activeTab === 'cancelled') return bucketOf(e) === 'cancelled';
    return true;
  });

  const statusBadge = (s) => {
    const colors = { upcoming: '#667eea', registered: '#1dd1a1', waitlisted: '#f39c12', cancelled: '#e74c3c', completed: '#95a5a6', attended: '#27ae60' };
    return { background: (colors[s] || '#999') + '20', color: colors[s] || '#999', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', display: 'inline-block' };
  };

  if (!tableReady) {
    return (
      <div style={{ padding: '20px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>🎉 Events</h1>
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '8px' }}>Setup Required</h3>
          <p style={{ marginBottom: '12px', fontSize: '14px' }}>Run the following SQL in your Supabase SQL Editor:</p>
          <pre style={{ background: '#f8f9fa', padding: '16px', borderRadius: '6px', fontSize: '12px', overflow: 'auto', maxHeight: '300px', whiteSpace: 'pre-wrap' }}>{SETUP_SQL}</pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: '12px', padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Check Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="events-page">
      {isReadOnly && <ViewOnlyBanner />}
      <style>{`
        .events-page { padding: 20px; }
        .events-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
        .events-header h1 { font-size: 28px; margin: 0; }
        .events-tabs { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
        .events-tab { padding: 8px 18px; border-radius: 20px; border: 1px solid #e0e0e0; background: white; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; }
        .events-tab.active { background: #667eea; color: white; border-color: #667eea; }
        .events-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
        .event-card { background: white; border-radius: 10px; padding: 20px; border-left: 4px solid #667eea; cursor: pointer; transition: all 0.2s; }
        .event-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); transform: translateY(-2px); }
        .event-card.cancelled { border-left-color: #e74c3c; opacity: 0.6; }
        .event-card .title { font-size: 16px; font-weight: 700; margin-bottom: 6px; }
        .event-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
        .event-card-top .title { margin-bottom: 6px; }
        .event-edit-btn { flex-shrink: 0; padding: 4px 10px; font-size: 12px; font-weight: 600; color: #667eea; background: #eef0fe; border: 1px solid #d5d9fb; border-radius: 6px; text-decoration: none; cursor: pointer; white-space: nowrap; }
        .event-edit-btn:hover { background: #667eea; color: #fff; }
        .event-card .meta { display: flex; gap: 12px; font-size: 12px; color: #999; flex-wrap: wrap; }
        .event-card .meta span { display: flex; align-items: center; gap: 4px; }
        .event-card .badges { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
        @media (max-width: 768px) {
          .events-page { padding: 12px; }
          .events-header h1 { font-size: 22px; }
          .events-grid { grid-template-columns: 1fr; gap: 12px; }
        }
        @media (max-width: 480px) {
          .events-page { padding: 8px; }
          .event-card { padding: 14px; }
        }
      `}</style>

      <div className="events-header">
        <h1>🎉 Events</h1>
        {!isReadOnly && canManageEvents && <a href="/events/create" style={{ padding: '8px 16px', background: '#667eea', color: 'white', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>+ Create Event</a>}
      </div>

      <div className="events-tabs">
        {['upcoming', 'past', 'cancelled'].map(tab => (
          <button key={tab} className={`events-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)} ({events.filter(e => bucketOf(e) === tab).length})
          </button>
        ))}
      </div>

      {loading ? <p style={{ color: '#999' }}>Loading events...</p> : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📅</div>
          <p>No {activeTab} events found</p>
        </div>
      ) : (
        <div className="events-grid">
          {filtered.map(event => (
            <div key={event.id} className={`event-card ${event.status === 'cancelled' ? 'cancelled' : ''}`} onClick={() => navigate(`/events/${event.id}`)}>
              <div className="event-card-top">
                <div className="title">{event.title}</div>
                {!isReadOnly && canManageEvents && (
                  <a href={`/events/create?edit=${event.id}`} className="event-edit-btn" onClick={e => e.stopPropagation()} title="Edit event">✏️ Edit</a>
                )}
              </div>
              <div className="meta">
                <span>📅 {new Date(event.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                {event.start_time && <span>🕐 {event.start_time.slice(0, 5)}</span>}
                <span>📍 {event.location}</span>
              </div>
              <div className="badges">
                <span style={statusBadge(bucketOf(event))}>{bucketOf(event)}</span>
                {event.is_paid && <span style={{ ...statusBadge(''), background: '#f39c1220', color: '#f39c12' }}>₹{event.ticket_price}</span>}
                {event.capacity && <span style={{ ...statusBadge(''), background: '#3498db20', color: '#3498db' }}>{event.capacity} capacity</span>}
                {event.event_type === 'recurring' && <span style={{ ...statusBadge(''), background: '#9b59b620', color: '#9b59b6' }}>Recurring</span>}
              </div>
              {event.description && <p style={{ fontSize: '13px', color: '#666', marginTop: '8px', lineHeight: '1.4' }}>{event.description.slice(0, 100)}{event.description.length > 100 ? '...' : ''}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
