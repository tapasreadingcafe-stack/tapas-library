import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import { usePermission } from '../hooks/usePermission';
import ViewOnlyBanner from '../components/ViewOnlyBanner';

const badgeStyle = (s) => {
  const colors = { upcoming: '#667eea', registered: '#1dd1a1', confirmed: '#1dd1a1', waitlisted: '#f39c12', cancelled: '#e74c3c', completed: '#95a5a6', attended: '#27ae60' };
  return { background: (colors[s] || '#999') + '20', color: colors[s] || '#999', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, display: 'inline-block' };
};

// wa.me link for a registrant; bare 10-digit Indian numbers get a 91 prefix.
const waLink = (phone, event) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  const intl = digits.length === 10 ? '91' + digits : digits;
  const when = event?.start_date ? ' on ' + new Date(event.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' }) : '';
  const msg = encodeURIComponent(`Hi! Regarding "${event?.title || 'our event'}"${when} — `);
  return `https://wa.me/${intl}?text=${msg}`;
};

export default function EventManage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { isReadOnly, canManageEvents } = usePermission();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [regTickets, setRegTickets] = useState(1);
  const [guestForm, setGuestForm] = useState({ name: '', phone: '', email: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: ev } = await supabase.from('events').select('*').eq('id', id).single();
      const { data: regs } = await supabase.from('event_registrations').select('*, members(name, phone)').eq('event_id', id).order('registration_date');
      if (alive) { setEvent(ev || null); setRegistrations(regs || []); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [id]);

  const reloadRegs = async () => {
    const { data } = await supabase.from('event_registrations').select('*, members(name, phone)').eq('event_id', id).order('registration_date');
    setRegistrations(data || []);
  };

  const searchMembers = async (q) => {
    setMemberSearch(q);
    if (q.length < 2) { setMemberResults([]); return; }
    const { data } = await supabase.from('members').select('id, name, phone').or(`name.ilike.%${q}%,phone.ilike.%${q}%`).limit(6);
    setMemberResults(data || []);
  };

  const activeCount = () => registrations.filter(r => ['registered', 'confirmed'].includes(r.status)).length;

  // ── Payment ────────────────────────────────────────────────────────────────
  // What this booking owes, from the event's price — `amount_paid` records what
  // has actually been collected, so the two must not be conflated. A storefront
  // sign-up leaves amount_paid at 0 because nobody has taken any money yet.
  // Price actually booked at, falling back to the event's base price for
  // registrations taken before ticket options existed.
  const dueFor = (reg) => {
    if (!event?.is_paid) return 0;
    const unit = Number(reg.ticket_unit_price) || Number(event.ticket_price) || 0;
    return unit * (reg.ticket_count || 1);
  };
  const paidFor = (reg) => Number(reg.amount_paid) || 0;
  const payState = (reg) => {
    const due = dueFor(reg);
    if (due <= 0) return 'free';
    const paid = paidFor(reg);
    if (paid <= 0) return 'pending';
    return paid >= due ? 'paid' : 'partial';
  };

  const markPaid = async (reg) => {
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.from('event_registrations')
        .update({ amount_paid: dueFor(reg) }).eq('id', reg.id);
      if (error) throw error;
      toast.success('Marked as paid');
      reloadRegs();
    } catch (err) { toast.error('Error: ' + err.message); }
    finally { setBusy(false); }
  };

  const markUnpaid = async (reg) => {
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.from('event_registrations')
        .update({ amount_paid: 0 }).eq('id', reg.id);
      if (error) throw error;
      toast.success('Marked as not paid');
      reloadRegs();
    } catch (err) { toast.error('Error: ' + err.message); }
    finally { setBusy(false); }
  };

  // Proofs live in a private bucket — a short-lived signed URL is the only way in.
  const openProof = async (path) => {
    try {
      const { data, error } = await supabase.storage
        .from('payment-proofs').createSignedUrl(path, 300);
      if (error) throw error;
      window.open(data.signedUrl, '_blank', 'noopener');
    } catch (e) { toast.error('Could not open screenshot: ' + (e.message || e)); }
  };
  const resetAdd = () => { setShowAdd(false); setMemberSearch(''); setMemberResults([]); setGuestForm({ name: '', phone: '', email: '' }); setRegTickets(1); };

  const registerMember = async (member) => {
    if (!event || busy) return;
    setBusy(true);
    try {
      const tickets = Math.max(1, parseInt(regTickets, 10) || 1);
      const waitlisted = event.capacity && activeCount() >= event.capacity && event.waitlist_enabled;
      const { error } = await supabase.from('event_registrations').insert([{
        event_id: event.id, member_id: member.id, ticket_count: tickets,
        amount_paid: event.is_paid ? (event.ticket_price || 0) * tickets : 0,
        status: waitlisted ? 'waitlisted' : 'registered',
      }]);
      if (error) throw error;
      toast.success(`Registered ${member.name}`);
      resetAdd();
      reloadRegs();
    } catch (err) {
      toast.error('Error: ' + (String(err.message).includes('idx_event_member') ? 'Member already registered' : err.message));
    } finally { setBusy(false); }
  };

  const registerGuest = async () => {
    if (!event || busy) return;
    if (!guestForm.name.trim()) return toast.warning('Guest name is required');
    setBusy(true);
    try {
      const tickets = Math.max(1, parseInt(regTickets, 10) || 1);
      const { error } = await supabase.from('event_registrations').insert([{
        event_id: event.id,
        guest_name: guestForm.name.trim(),
        guest_phone: guestForm.phone.trim() || null,
        guest_email: guestForm.email.trim() || null,
        ticket_count: tickets,
        amount_paid: event.is_paid ? (event.ticket_price || 0) * tickets : 0,
        status: 'confirmed',
        source_page: 'dashboard',
      }]);
      if (error) throw error;
      toast.success('Guest registered');
      resetAdd();
      reloadRegs();
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally { setBusy(false); }
  };

  const cancelReg = async (regId) => {
    if (!await confirm({ title: 'Cancel Registration', message: 'Cancel this registration?', variant: 'warning' })) return;
    await supabase.from('event_registrations').update({ status: 'cancelled' }).eq('id', regId);
    reloadRegs();
  };

  const cancelEvent = async () => {
    if (!await confirm({ title: 'Cancel Event', message: 'Cancel this event?', variant: 'warning' })) return;
    await supabase.from('events').update({ status: 'cancelled' }).eq('id', event.id);
    navigate('/events');
  };

  if (loading) return <p style={{ padding: 20, color: '#999' }}>Loading…</p>;
  if (!event) {
    return (
      <div style={{ padding: 20 }}>
        <p style={{ color: '#999' }}>Event not found.</p>
        <Link to="/events" style={{ color: '#667eea' }}>← Back to events</Link>
      </div>
    );
  }

  const input = { width: '100%', padding: '9px 12px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', marginBottom: 8 };
  const card = { background: '#fff', border: '1px solid #eceef1', borderRadius: 14, padding: 24, marginTop: 16, boxShadow: '0 1px 2px rgba(16,24,40,0.04)' };

  return (
    <div style={{ padding: '20px', maxWidth: 820, margin: '0 auto' }}>
      {isReadOnly && <ViewOnlyBanner />}
      <Link to="/events" style={{ fontSize: 14, color: '#667eea', textDecoration: 'none', fontWeight: 600 }}>← Back to events</Link>

      {/* Event summary */}
      <div style={{ ...card, marginTop: 14 }}>
        <h1 style={{ margin: 0, fontSize: 26 }}>{event.title}</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
          <span style={badgeStyle(event.status)}>{event.status}</span>
          {event.is_paid && <span style={{ ...badgeStyle(''), background: '#f39c1220', color: '#f39c12' }}>₹{event.ticket_price}/ticket</span>}
        </div>
        <div style={{ fontSize: 14, color: '#555', lineHeight: 1.7 }}>
          <div>📅 {new Date(event.start_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
          {event.start_time && <div>🕐 {event.start_time.slice(0, 5)}{event.end_time ? ' – ' + event.end_time.slice(0, 5) : ''}</div>}
          <div>📍 {event.location}</div>
          {event.capacity && <div>👥 Capacity {event.capacity} · Registered {activeCount()}</div>}
        </div>
        {event.description && <p style={{ fontSize: 14, color: '#444', lineHeight: 1.6, marginTop: 12 }}>{event.description}</p>}

        {!isReadOnly && canManageEvents && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
            <button onClick={() => setShowAdd(v => !v)} style={btnPrimary}>+ Add registration</button>
            <a href={`/events/create?edit=${event.id}`} style={btnOutline}>✏️ Edit event</a>
            {event.status !== 'cancelled' && <button onClick={cancelEvent} style={btnDanger}>Cancel event</button>}
          </div>
        )}
      </div>

      {/* Add registration — inline, on the page */}
      {showAdd && !isReadOnly && canManageEvents && (
        <div style={card}>
          <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Add registration</h3>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: '#999' }}>Register an existing member, or add a walk-in guest.</p>

          <label style={lbl}>Existing member</label>
          <input placeholder="Search member by name or phone…" value={memberSearch} onChange={e => searchMembers(e.target.value)} style={input} />
          {memberResults.length > 0 && (
            <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
              {memberResults.map(m => (
                <div key={m.id} onClick={() => registerMember(m)} style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}>
                  <b>{m.name}</b> <span style={{ color: '#999' }}>· {m.phone}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#eee' }} />
            <span style={{ fontSize: 12, color: '#aaa' }}>or walk-in</span>
            <div style={{ flex: 1, height: 1, background: '#eee' }} />
          </div>

          <input placeholder="Guest name *" value={guestForm.name} onChange={e => setGuestForm(f => ({ ...f, name: e.target.value }))} style={input} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input placeholder="Phone" value={guestForm.phone} onChange={e => setGuestForm(f => ({ ...f, phone: e.target.value }))} style={input} />
            <input placeholder="Email (optional)" value={guestForm.email} onChange={e => setGuestForm(f => ({ ...f, email: e.target.value }))} style={input} />
          </div>
          <label style={lbl}>Tickets</label>
          <input type="number" min="1" value={regTickets} onChange={e => setRegTickets(Math.max(1, parseInt(e.target.value, 10) || 1))} style={{ ...input, maxWidth: 140 }} />
          {event.is_paid && <p style={{ fontSize: 12, color: '#999', margin: '0 0 12px' }}>Total: ₹{((event.ticket_price || 0) * regTickets).toLocaleString('en-IN')}</p>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={registerGuest} disabled={busy} style={{ ...btnPrimary, opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving…' : 'Register guest'}</button>
            <button onClick={resetAdd} style={btnOutline}>Cancel</button>
          </div>
        </div>
      )}

      {/* Registrations */}
      <div style={card}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Registrations ({registrations.length})</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Name', 'Tickets', 'Status', 'Payment', 'Proof', ''].map((h, i) => <th key={i} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {registrations.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 20 }}>No registrations yet</td></tr>
              ) : registrations.map(reg => {
                const phone = reg.members?.phone || reg.guest_phone;
                const wl = waLink(phone, event);
                return (
                  <tr key={reg.id}>
                    <td style={td}>
                      <div style={{ fontWeight: 500 }}>{reg.members?.name || reg.guest_name || '—'}</div>
                      {(phone || reg.guest_email) && <div style={{ fontSize: 11, color: '#999' }}>{phone}{phone && reg.guest_email ? ' · ' : ''}{reg.guest_email}</div>}
                    </td>
                    <td style={td}>
                      {reg.ticket_count}
                      {reg.ticket_tier && (
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{reg.ticket_tier}</div>
                      )}
                    </td>
                    <td style={td}><span style={badgeStyle(reg.status)}>{reg.status}</span></td>
                    <td style={td}>
                      {(() => {
                        const st = payState(reg);
                        if (st === 'free') return <span style={{ color: '#999', fontSize: 12 }}>Free</span>;
                        const due = dueFor(reg), paid = paidFor(reg);
                        const chip = {
                          paid:    { text: 'PAID',    bg: '#d1fae5', fg: '#047857' },
                          partial: { text: 'PARTIAL', bg: '#fef3c7', fg: '#b45309' },
                          pending: { text: 'UNPAID',  bg: '#fee2e2', fg: '#b91c1c' },
                        }[st];
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
                            <span style={{ background: chip.bg, color: chip.fg, padding: '2px 8px', borderRadius: 9, fontSize: 10, fontWeight: 800, letterSpacing: '0.4px' }}>
                              {chip.text}
                            </span>
                            <span style={{ fontSize: 12, color: '#374151' }}>
                              ₹{paid.toLocaleString('en-IN')} of ₹{due.toLocaleString('en-IN')}
                            </span>
                            {!isReadOnly && (
                              st === 'paid'
                                ? <button onClick={() => markUnpaid(reg)} disabled={busy} style={{ background: 'none', border: 0, color: '#9ca3af', fontSize: 11, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Undo</button>
                                : <button onClick={() => markPaid(reg)} disabled={busy} style={{ padding: '3px 9px', background: '#059669', color: '#fff', border: 0, borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Mark paid</button>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td style={td}>
                      {reg.payment_proof_url ? (
                        <button onClick={() => openProof(reg.payment_proof_url)}
                          title="Open the screenshot this person uploaded"
                          style={{ padding: '3px 9px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: 5, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                          🧾 Screenshot
                        </button>
                      ) : reg.payment_reference ? (
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#374151' }}>{reg.payment_reference}</span>
                      ) : (
                        <span style={{ color: '#d1d5db' }}>—</span>
                      )}
                    </td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>
                      {wl && <a href={wl} target="_blank" rel="noopener noreferrer" style={{ padding: '3px 9px', background: '#25D366', color: '#fff', borderRadius: 5, fontSize: 11, fontWeight: 600, textDecoration: 'none', marginRight: 6 }}>WhatsApp</a>}
                      {!isReadOnly && reg.status !== 'cancelled' && <button onClick={() => cancelReg(reg.id)} style={{ padding: '3px 9px', background: '#ff6b6b', color: '#fff', border: 0, borderRadius: 5, fontSize: 11, cursor: 'pointer' }}>Cancel</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const btnPrimary = { padding: '10px 18px', background: '#667eea', color: '#fff', border: 0, borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' };
const btnOutline = { padding: '10px 18px', background: '#fff', color: '#667eea', border: '1px solid #667eea', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' };
const btnDanger = { padding: '10px 18px', background: '#ff6b6b', color: '#fff', border: 0, borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' };
const lbl = { display: 'block', fontSize: 12, color: '#666', fontWeight: 600, marginBottom: 4 };
const th = { textAlign: 'left', padding: '8px', fontSize: 12, color: '#666', background: '#f8f9fa', borderBottom: '1px solid #eee' };
const td = { padding: '10px 8px', fontSize: 13, borderBottom: '1px solid #f0f0f0', verticalAlign: 'top' };
