import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export default function EventAttendance() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [registrations, setRegistrations] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableReady, setTableReady] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const check = async () => {
      const { error } = await supabase.from('events').select('id').limit(0);
      if (error) { setTableReady(false); setLoading(false); return; }
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase.from('events').select('id, title, start_date').gte('start_date', today).neq('status', 'cancelled').order('start_date');
      setEvents(data || []);
      setLoading(false);
    };
    check();
  }, []);

  useEffect(() => {
    if (selectedEventId) fetchRegistrations();
  }, [selectedEventId]);

  const fetchRegistrations = async () => {
    setLoading(true);
    const [{ data: regs }, { data: atts }] = await Promise.all([
      supabase.from('event_registrations').select('*, members(name, phone)').eq('event_id', selectedEventId).eq('status', 'registered'),
      supabase.from('event_attendance').select('member_id').eq('event_id', selectedEventId),
    ]);
    setRegistrations(regs || []);
    setAttendance((atts || []).map(a => a.member_id));
    setLoading(false);
  };

  const checkIn = async (reg) => {
    try {
      await supabase.from('event_attendance').insert([{
        event_id: selectedEventId,
        member_id: reg.member_id,
        registration_id: reg.id,
      }]);
      setAttendance(prev => [...prev, reg.member_id]);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const checkedInCount = attendance.length;
  const totalRegs = registrations.length;
  const filtered = registrations.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.members?.name?.toLowerCase().includes(q) || r.members?.phone?.includes(q);
  });

  if (!tableReady) {
    return (
      <div style={{ padding: '20px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>✅ Attendance</h1>
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '20px' }}>
          <p>Event tables not found. Please set up from the Events page first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="attendance-page">
      <style>{`
        .attendance-page { padding: 20px; }
        .attendance-page h1 { font-size: 28px; margin-bottom: 16px; }
        .attendance-controls { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
        .attendance-controls select, .attendance-controls input { padding: 10px 12px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 14px; }
        .attendance-stats { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
        .attendance-stat { background: white; padding: 14px 20px; border-radius: 8px; text-align: center; min-width: 120px; }
        .attendance-stat .val { font-size: 28px; font-weight: 700; }
        .attendance-stat .lbl { font-size: 11px; color: #999; margin-top: 2px; }
        .attendance-list { background: white; border-radius: 8px; overflow: hidden; }
        .attendance-row { display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid #f0f0f0; gap: 12px; }
        .attendance-row:hover { background: #fafbff; }
        .attendance-row .name { flex: 1; font-size: 14px; font-weight: 500; }
        .attendance-row .phone { font-size: 12px; color: #999; min-width: 100px; }
        .attendance-checkin-btn { padding: 6px 16px; border-radius: 6px; border: none; cursor: pointer; font-weight: 600; font-size: 13px; }
        .attendance-checked { background: #d4edda; color: #155724; cursor: default; }
        .attendance-pending { background: #667eea; color: white; }
        .attendance-pending:hover { background: #5568d3; }
        .attendance-progress { height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; margin-bottom: 20px; }
        .attendance-progress-bar { height: 100%; background: #1dd1a1; border-radius: 4px; transition: width 0.3s; }
        @media (max-width: 768px) {
          .attendance-page { padding: 12px; }
          .attendance-page h1 { font-size: 22px; }
          .attendance-controls select, .attendance-controls input { flex: 1; min-width: 0; }
          .attendance-stats { gap: 8px; }
          .attendance-stat { padding: 10px 14px; min-width: 0; flex: 1; }
          .attendance-stat .val { font-size: 22px; }
          .attendance-row { padding: 10px 12px; flex-wrap: wrap; }
          .attendance-row .phone { min-width: 0; }
        }
        @media (max-width: 480px) {
          .attendance-page { padding: 8px; }
          .attendance-row .phone { display: none; }
        }
      `}</style>

      <h1>✅ Event Attendance</h1>

      <div className="attendance-controls">
        <select value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)} style={{ flex: 1, maxWidth: '400px' }}>
          <option value="">Select an event...</option>
          {events.map(e => (
            <option key={e.id} value={e.id}>{e.title} - {new Date(e.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</option>
          ))}
        </select>
        {selectedEventId && (
          <input placeholder="Search member..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: '250px' }} />
        )}
      </div>

      {selectedEventId && (
        <>
          <div className="attendance-stats">
            <div className="attendance-stat" style={{ borderTop: '3px solid #667eea' }}>
              <div className="val" style={{ color: '#667eea' }}>{totalRegs}</div>
              <div className="lbl">REGISTERED</div>
            </div>
            <div className="attendance-stat" style={{ borderTop: '3px solid #1dd1a1' }}>
              <div className="val" style={{ color: '#1dd1a1' }}>{checkedInCount}</div>
              <div className="lbl">CHECKED IN</div>
            </div>
            <div className="attendance-stat" style={{ borderTop: '3px solid #f39c12' }}>
              <div className="val" style={{ color: '#f39c12' }}>{totalRegs - checkedInCount}</div>
              <div className="lbl">PENDING</div>
            </div>
          </div>

          {totalRegs > 0 && (
            <div className="attendance-progress">
              <div className="attendance-progress-bar" style={{ width: `${(checkedInCount / totalRegs) * 100}%` }} />
            </div>
          )}

          {loading ? <p style={{ color: '#999' }}>Loading...</p> : (
            <div className="attendance-list">
              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>No registered members found</div>
              ) : filtered.map(reg => {
                const isCheckedIn = attendance.includes(reg.member_id);
                return (
                  <div key={reg.id} className="attendance-row">
                    <span className="name">{reg.members?.name}</span>
                    <span className="phone">{reg.members?.phone}</span>
                    <span style={{ fontSize: '12px', color: '#999' }}>{reg.ticket_count} ticket{reg.ticket_count > 1 ? 's' : ''}</span>
                    <button
                      className={`attendance-checkin-btn ${isCheckedIn ? 'attendance-checked' : 'attendance-pending'}`}
                      onClick={() => !isCheckedIn && checkIn(reg)}
                      disabled={isCheckedIn}
                    >
                      {isCheckedIn ? '✓ Checked In' : 'Check In'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {!selectedEventId && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
          <p>Select an event to track attendance</p>
        </div>
      )}
    </div>
  );
}
