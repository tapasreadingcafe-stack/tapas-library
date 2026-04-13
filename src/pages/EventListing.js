import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
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
  const toast = useToast();
  const confirm = useConfirm();
  const { isReadOnly, canManageEvents } = usePermission();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableReady, setTableReady] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [showRegModal, setShowRegModal] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [regTickets, setRegTickets] = useState(1);

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

  const today = new Date().toISOString().split('T')[0];
  const filtered = events.filter(e => {
    if (activeTab === 'upcoming') return e.status === 'upcoming' || (e.start_date >= today && e.status !== 'cancelled');
    if (activeTab === 'past') return e.start_date < today || e.status === 'completed';
    if (activeTab === 'cancelled') return e.status === 'cancelled';
    return true;
  });

  const viewEvent = async (event) => {
    setSelectedEvent(event);
    const { data } = await supabase.from('event_registrations').select('*, members(name, phone)').eq('event_id', event.id).order('registration_date');
    setRegistrations(data || []);
  };

  const searchMembers = async (q) => {
    setMemberSearch(q);
    if (q.length < 2) { setMemberResults([]); return; }
    const { data } = await supabase.from('members').select('id, name, phone').or(`name.ilike.%${q}%,phone.ilike.%${q}%`).limit(5);
    setMemberResults(data || []);
  };

  const registerMember = async (member) => {
    if (!selectedEvent) return;
    try {
      const payload = {
        event_id: selectedEvent.id,
        member_id: member.id,
        ticket_count: regTickets,
        amount_paid: selectedEvent.is_paid ? selectedEvent.ticket_price * regTickets : 0,
        status: selectedEvent.capacity && registrations.filter(r => r.status === 'registered').length >= selectedEvent.capacity && selectedEvent.waitlist_enabled ? 'waitlisted' : 'registered',
      };
      const { error } = await supabase.from('event_registrations').insert([payload]);
      if (error) throw error;
      setShowRegModal(false);
      setMemberSearch('');
      setMemberResults([]);
      setRegTickets(1);
      viewEvent(selectedEvent);
    } catch (err) {
      toast.error('Error: ' + (err.message.includes('idx_event_member') ? 'Member already registered' : err.message));
    }
  };

  const cancelReg = async (regId) => {
    if (!await confirm({ title: 'Cancel Registration', message: 'Cancel this registration?', variant: 'warning' })) return;
    await supabase.from('event_registrations').update({ status: 'cancelled' }).eq('id', regId);
    viewEvent(selectedEvent);
  };

  const cancelEvent = async (id) => {
    if (!await confirm({ title: 'Cancel Event', message: 'Cancel this event?', variant: 'warning' })) return;
    await supabase.from('events').update({ status: 'cancelled' }).eq('id', id);
    fetchEvents();
    if (selectedEvent?.id === id) setSelectedEvent(null);
  };

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
        .event-card .meta { display: flex; gap: 12px; font-size: 12px; color: #999; flex-wrap: wrap; }
        .event-card .meta span { display: flex; align-items: center; gap: 4px; }
        .event-card .badges { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
        .event-detail-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px; }
        .event-detail { background: white; border-radius: 12px; padding: 24px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto; }
        .event-reg-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        .event-reg-table th { text-align: left; padding: 8px; font-size: 12px; color: #666; background: #f8f9fa; }
        .event-reg-table td { padding: 8px; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
        @media (max-width: 768px) {
          .events-page { padding: 12px; }
          .events-header h1 { font-size: 22px; }
          .events-grid { grid-template-columns: 1fr; gap: 12px; }
          .event-detail { padding: 16px; }
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
            {tab.charAt(0).toUpperCase() + tab.slice(1)} ({events.filter(e => {
              if (tab === 'upcoming') return e.status === 'upcoming' || (e.start_date >= today && e.status !== 'cancelled');
              if (tab === 'past') return e.start_date < today || e.status === 'completed';
              if (tab === 'cancelled') return e.status === 'cancelled';
              return true;
            }).length})
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
            <div key={event.id} className={`event-card ${event.status === 'cancelled' ? 'cancelled' : ''}`} onClick={() => viewEvent(event)}>
              <div className="title">{event.title}</div>
              <div className="meta">
                <span>📅 {new Date(event.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                {event.start_time && <span>🕐 {event.start_time.slice(0, 5)}</span>}
                <span>📍 {event.location}</span>
              </div>
              <div className="badges">
                <span style={statusBadge(event.status)}>{event.status}</span>
                {event.is_paid && <span style={{ ...statusBadge(''), background: '#f39c1220', color: '#f39c12' }}>₹{event.ticket_price}</span>}
                {event.capacity && <span style={{ ...statusBadge(''), background: '#3498db20', color: '#3498db' }}>{event.capacity} capacity</span>}
                {event.event_type === 'recurring' && <span style={{ ...statusBadge(''), background: '#9b59b620', color: '#9b59b6' }}>Recurring</span>}
              </div>
              {event.description && <p style={{ fontSize: '13px', color: '#666', marginTop: '8px', lineHeight: '1.4' }}>{event.description.slice(0, 100)}{event.description.length > 100 ? '...' : ''}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="event-detail-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="event-detail" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '22px' }}>{selectedEvent.title}</h2>
              <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <span style={statusBadge(selectedEvent.status)}>{selectedEvent.status}</span>
              {selectedEvent.is_paid && <span style={{ ...statusBadge(''), background: '#f39c1220', color: '#f39c12' }}>₹{selectedEvent.ticket_price}/ticket</span>}
            </div>

            <div style={{ fontSize: '14px', color: '#666', marginBottom: '16px', lineHeight: '1.5' }}>
              <p>📅 {new Date(selectedEvent.start_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
              {selectedEvent.start_time && <p>🕐 {selectedEvent.start_time.slice(0, 5)} {selectedEvent.end_time ? `- ${selectedEvent.end_time.slice(0, 5)}` : ''}</p>}
              <p>📍 {selectedEvent.location}</p>
              {selectedEvent.capacity && <p>👥 Capacity: {selectedEvent.capacity} | Registered: {registrations.filter(r => r.status === 'registered').length}</p>}
              {selectedEvent.description && <p style={{ marginTop: '8px' }}>{selectedEvent.description}</p>}
            </div>

            {/* Registration actions */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {!isReadOnly && canManageEvents && <button onClick={() => setShowRegModal(true)} style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                + Register Member
              </button>}
              {!isReadOnly && canManageEvents && selectedEvent.status !== 'cancelled' && (
                <button onClick={() => cancelEvent(selectedEvent.id)} style={{ padding: '8px 16px', background: '#ff6b6b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                  Cancel Event
                </button>
              )}
            </div>

            {/* Registrations */}
            <h3 style={{ fontSize: '15px', marginBottom: '8px' }}>Registrations ({registrations.length})</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="event-reg-table">
                <thead><tr><th>Member</th><th>Tickets</th><th>Status</th><th>Paid</th><th></th></tr></thead>
                <tbody>
                  {registrations.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', color: '#999', padding: '16px' }}>No registrations yet</td></tr>
                  ) : registrations.map(reg => (
                    <tr key={reg.id}>
                      <td style={{ fontWeight: '500' }}>{reg.members?.name}</td>
                      <td>{reg.ticket_count}</td>
                      <td><span style={statusBadge(reg.status)}>{reg.status}</span></td>
                      <td>₹{reg.amount_paid}</td>
                      <td>
                        {!isReadOnly && reg.status === 'registered' && (
                          <button onClick={() => cancelReg(reg.id)} style={{ padding: '2px 8px', background: '#ff6b6b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Cancel</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Register Member Modal */}
      {showRegModal && (
        <div className="event-detail-overlay" onClick={() => setShowRegModal(false)} style={{ zIndex: 2001 }}>
          <div className="event-detail" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '18px' }}>Register Member</h3>
            <input placeholder="Search member by name or phone..." value={memberSearch} onChange={e => searchMembers(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px', marginBottom: '8px' }} />
            {memberResults.length > 0 && (
              <div style={{ border: '1px solid #e0e0e0', borderRadius: '6px', maxHeight: '150px', overflowY: 'auto', marginBottom: '12px' }}>
                {memberResults.map(m => (
                  <div key={m.id} onClick={() => registerMember(m)} style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', fontSize: '13px' }}>
                    <span style={{ fontWeight: '500' }}>{m.name}</span> <span style={{ color: '#999' }}>- {m.phone}</span>
                  </div>
                ))}
              </div>
            )}
            {selectedEvent?.is_paid && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', color: '#666', fontWeight: '600' }}>Tickets</label>
                <input type="number" value={regTickets} onChange={e => setRegTickets(Math.max(1, parseInt(e.target.value) || 1))} min="1"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px', marginTop: '4px' }} />
                <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Total: ₹{(selectedEvent.ticket_price * regTickets).toLocaleString('en-IN')}</p>
              </div>
            )}
            <button onClick={() => setShowRegModal(false)} style={{ width: '100%', padding: '8px', background: '#e0e0e0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
