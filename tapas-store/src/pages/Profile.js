import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

// =====================================================================
// Profile (/profile) — the one-stop customer page.
// Modern Heritage design system.
//
// Tabs:
//   overview  — name/email/phone edit + membership status
//   orders    — online orders from customer_orders
//   borrowed  — currently-borrowed books (read-only view of circulation)
//   reserved  — library reservations
//   wishlist  — add/remove books from wishlist
// =====================================================================

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding:'10px 20px', border:'none', cursor:'pointer',
      fontFamily:'var(--font-display)',
      fontSize:'15px', fontWeight: active ? '600' : '400',
      background: 'transparent',
      color: active ? 'var(--secondary)' : 'var(--text-subtle)',
      borderBottom: active ? '2px solid var(--secondary)' : '2px solid transparent',
      borderRadius: 0,
      transition:'all 200ms ease',
      whiteSpace:'nowrap',
    }}>
      {children}
    </button>
  );
}

const FINE_RATE_PER_DAY = 10;

export default function Profile() {
  const navigate = useNavigate();
  const { member, loading: authLoading, refresh, updateMember } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'overview';
  const [tab, setTab] = useState(initialTab);

  const [orders, setOrders] = useState([]);
  const [borrowed, setBorrowed] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  // ---- profile form state ------------------------------------------
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDob, setFormDob] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    if (!authLoading && !member) {
      navigate('/login');
    }
  }, [authLoading, member, navigate]);

  useEffect(() => {
    if (member) {
      setFormName(member.name || '');
      setFormPhone(member.phone || '');
      setFormDob(member.date_of_birth || '');
    }
  }, [member]);

  const fetchAll = useCallback(async () => {
    if (!member) return;
    setLoading(true);
    try {
      const [ordersRes, borrowedRes, reservRes, wishlistRes] = await Promise.all([
        supabase
          .from('customer_orders')
          .select('id, order_number, status, total, fulfillment_type, created_at, customer_order_items(id, item_name, quantity, unit_price, total_price)')
          .eq('member_id', member.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('circulation')
          .select('*, books(title, author, genre)')
          .eq('member_id', member.id)
          .eq('status', 'checked_out')
          .order('due_date'),
        supabase
          .from('reservations')
          .select('*, books(title, author)')
          .eq('member_id', member.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('wishlists')
          .select('*, books(id, title, author, genre, quantity_available, sales_price, store_visible)')
          .eq('member_id', member.id)
          .order('created_at', { ascending: false }),
      ]);
      setOrders(ordersRes.data || []);
      setBorrowed(borrowedRes.data || []);
      setReservations(reservRes.data || []);
      setWishlist(wishlistRes.data || []);
    } catch (err) {
      console.error('[Profile] fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [member]);

  useEffect(() => {
    if (member) fetchAll();
  }, [member, fetchAll]);

  // Keep tab URL param in sync so links like /profile?tab=wishlist work.
  useEffect(() => {
    if (tab !== (searchParams.get('tab') || 'overview')) {
      setSearchParams({ tab }, { replace: true });
    }
  }, [tab]); // eslint-disable-line

  if (authLoading || !member) return null;

  // ---- derived ------------------------------------------------------
  const today = new Date();
  const fines = borrowed
    .filter(b => new Date(b.due_date) < today)
    .map(b => {
      const daysOverdue = Math.floor((today - new Date(b.due_date)) / (1000 * 60 * 60 * 24));
      return { ...b, daysOverdue, fineAmount: daysOverdue * FINE_RATE_PER_DAY };
    });
  const totalFines = fines.reduce((s, f) => s + f.fineAmount, 0);

  const membershipActive =
    member.subscription_end && new Date(member.subscription_end) > today;

  // ---- actions ------------------------------------------------------
  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg('');
    try {
      await updateMember({
        name: formName.trim(),
        phone: formPhone.trim(),
        date_of_birth: formDob || null,
      });
      setSaveMsg('Profile updated');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) {
      setSaveMsg(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const removeWishlist = async (bookId) => {
    await supabase.from('wishlists').delete().eq('member_id', member.id).eq('book_id', bookId);
    setWishlist(w => w.filter(i => i.book_id !== bookId));
    refresh();
  };

  const cancelReservation = async (id) => {
    await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', id);
    setReservations(r => r.map(i => i.id === id ? { ...i, status: 'cancelled' } : i));
  };

  const statusPill = (status) => {
    const map = {
      pending:          { bg:'rgba(196,144,64,0.15)',  fg:'var(--accent)', label:'Pending payment' },
      paid:             { bg:'rgba(0,106,106,0.12)', fg:'var(--secondary)', label:'Paid' },
      ready_for_pickup: { bg:'rgba(0,106,106,0.15)',  fg:'var(--secondary)', label:'Ready for pickup' },
      fulfilled:        { bg:'rgba(0,106,106,0.12)', fg:'var(--secondary)', label:'Fulfilled' },
      cancelled:        { bg:'rgba(155,35,53,0.12)', fg:'#9B2335', label:'Cancelled' },
      refunded:         { bg:'rgba(139,115,85,0.15)', fg:'var(--text-subtle)', label:'Refunded' },
    };
    const s = map[status] || { bg:'rgba(139,115,85,0.1)', fg:'var(--text-subtle)', label: status };
    return (
      <span className="tps-chip" style={{ padding:'4px 12px', fontSize:'12px', fontWeight:'700', background:s.bg, color:s.fg }}>
        {s.label}
      </span>
    );
  };

  return (
    <div style={{ maxWidth:'1100px', margin:'0 auto', padding:'40px 20px', fontFamily:'var(--font-body)' }}>

      {/* Header — truffle gradient */}
      <div style={{
        background:'linear-gradient(135deg, var(--primary), var(--primary-container))',
        borderRadius:'var(--radius-2xl, 24px)', padding:'32px', marginBottom:'32px', color:'#fbfbe2',
        boxShadow:'var(--shadow-ambient, 0 8px 32px rgba(38,23,12,0.06))',
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'16px' }}>
          <div>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:'32px', fontWeight:'600', color:'#fbfbe2', marginBottom:'4px' }}>
              Welcome, {member.name?.split(' ')[0] || 'there'}!
            </h1>
            <p style={{ color:'rgba(251,251,226,0.65)', fontSize:'14px', fontFamily:'var(--font-body)' }}>{member.email}</p>
            {member.plan && member.plan !== 'no_plan' && (
              <span className="tps-chip tps-chip-teal" style={{ display:'inline-block', marginTop:'8px', textTransform:'capitalize' }}>
                {member.plan} Member
              </span>
            )}
          </div>
          {member.subscription_end && (
            <div style={{ textAlign:'right' }}>
              <div style={{ color:'rgba(251,251,226,0.5)', fontSize:'12px', marginBottom:'4px', fontFamily:'var(--font-body)' }}>Membership {membershipActive ? 'expires' : 'expired'}</div>
              <div style={{ color: membershipActive ? 'var(--accent)' : '#FC8181', fontWeight:'600', fontSize:'16px', fontFamily:'var(--font-display)' }}>
                {new Date(member.subscription_end).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))', gap:'16px', marginTop:'24px' }}>
          {[
            { num: orders.length,        label:'Online Orders' },
            { num: borrowed.length,      label:'Borrowed' },
            { num: reservations.filter(r => r.status === 'pending').length, label:'Reservations' },
            { num: fines.length,         label:'Overdue', warning: fines.length > 0 },
            { num: wishlist.length,      label:'Wishlist' },
          ].map(s => (
            <div key={s.label} style={{ background:'rgba(251,251,226,0.06)', borderRadius:'var(--radius-lg, 16px)', padding:'16px', textAlign:'center' }}>
              <div style={{ fontSize:'28px', fontWeight:'600', color: s.warning ? '#FC8181' : 'var(--accent)', fontFamily:'var(--font-display)' }}>{s.num}</div>
              <div style={{ color:'rgba(251,251,226,0.6)', fontSize:'12px', fontFamily:'var(--font-body)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Fine Alert */}
      {fines.length > 0 && (
        <div style={{ background:'rgba(252,129,129,0.1)', borderRadius:'var(--radius-lg, 16px)', padding:'16px 20px', marginBottom:'24px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'12px' }}>
          <div>
            <div style={{ fontWeight:'700', color:'#9B2335', fontSize:'16px', marginBottom:'4px', fontFamily:'var(--font-display)' }}>Outstanding Fines</div>
            <div style={{ color:'var(--text-muted)', fontSize:'14px', fontFamily:'var(--font-body)' }}>You have {fines.length} overdue book{fines.length > 1 ? 's' : ''}. Please return them at the library.</div>
          </div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:'24px', fontWeight:'600', color:'#FC8181' }}>
            Rs.{totalFines}
          </div>
        </div>
      )}

      {/* Tabs — Newsreader labels, teal active indicator, no borders */}
      <div style={{ background:'var(--bg-card)', borderRadius:'var(--radius-2xl, 24px)', overflow:'hidden', boxShadow:'var(--shadow-ambient, 0 8px 32px rgba(38,23,12,0.06))' }}>
        <div style={{ padding:'4px 16px 0', display:'flex', gap:'4px', overflowX:'auto' }}>
          <TabBtn active={tab==='overview'}     onClick={() => setTab('overview')}>Profile</TabBtn>
          <TabBtn active={tab==='orders'}       onClick={() => setTab('orders')}>Orders ({orders.length})</TabBtn>
          <TabBtn active={tab==='borrowed'}     onClick={() => setTab('borrowed')}>Borrowed ({borrowed.length})</TabBtn>
          <TabBtn active={tab==='reservations'} onClick={() => setTab('reservations')}>Reservations ({reservations.length})</TabBtn>
          <TabBtn active={tab==='wishlist'}     onClick={() => setTab('wishlist')}>Wishlist ({wishlist.length})</TabBtn>
        </div>

        <div style={{ padding:'24px' }}>
          {loading ? (
            <div style={{ textAlign:'center', padding:'40px', color:'var(--text-subtle)', fontFamily:'var(--font-body)' }}>Loading...</div>
          ) : (
            <>

              {/* Overview — profile edit */}
              {tab === 'overview' && (
                <div style={{ maxWidth:'560px' }}>
                  <h3 style={{ fontFamily:'var(--font-display)', fontSize:'22px', color:'var(--text)', marginBottom:'20px', fontWeight:'600' }}>Personal Information</h3>
                  <form onSubmit={saveProfile} style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
                    <div>
                      <label style={{ fontSize:'11px', fontWeight:'700', color:'var(--text-subtle)', textTransform:'uppercase', letterSpacing:'1.5px', display:'block', marginBottom:'8px', fontFamily:'var(--font-body)' }}>Full Name</label>
                      <input value={formName} onChange={e => setFormName(e.target.value)} required className="tps-input" />
                    </div>
                    <div>
                      <label style={{ fontSize:'11px', fontWeight:'700', color:'var(--text-subtle)', textTransform:'uppercase', letterSpacing:'1.5px', display:'block', marginBottom:'8px', fontFamily:'var(--font-body)' }}>Email (read-only)</label>
                      <input value={member.email || ''} disabled className="tps-input" style={{ opacity:0.5 }} />
                    </div>
                    <div>
                      <label style={{ fontSize:'11px', fontWeight:'700', color:'var(--text-subtle)', textTransform:'uppercase', letterSpacing:'1.5px', display:'block', marginBottom:'8px', fontFamily:'var(--font-body)' }}>Phone</label>
                      <input value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="+91 98765 43210" className="tps-input" />
                    </div>
                    <div>
                      <label style={{ fontSize:'11px', fontWeight:'700', color:'var(--text-subtle)', textTransform:'uppercase', letterSpacing:'1.5px', display:'block', marginBottom:'8px', fontFamily:'var(--font-body)' }}>Date of Birth</label>
                      <input type="date" value={formDob || ''} onChange={e => setFormDob(e.target.value)} className="tps-input" />
                    </div>
                    <button type="submit" disabled={saving} className="tps-btn tps-btn-teal tps-btn-lg" style={{ opacity: saving ? 0.7 : 1 }}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    {saveMsg && (
                      <div className={saveMsg.includes('Failed') ? 'tps-chip tps-chip-truffle' : 'tps-chip tps-chip-teal'} style={{ textAlign:'center', padding:'10px 16px', fontSize:'14px' }}>
                        {saveMsg}
                      </div>
                    )}
                  </form>
                </div>
              )}

              {/* Orders — tonal bg shifts instead of borders */}
              {tab === 'orders' && (
                <div>
                  <h3 style={{ fontFamily:'var(--font-display)', fontSize:'22px', color:'var(--text)', marginBottom:'20px', fontWeight:'600' }}>My Online Orders</h3>
                  {orders.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'40px', color:'var(--text-subtle)' }}>
                      <p style={{ fontFamily:'var(--font-display)', fontSize:'18px', marginBottom:'12px' }}>No online orders yet.</p>
                      <Link to="/books" className="tps-btn-tertiary" style={{ color:'var(--secondary)', fontWeight:'600', textDecoration:'none' }}>Browse Books</Link>
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                      {orders.map(o => (
                        <div key={o.id} style={{ background:'var(--bg-section)', borderRadius:'var(--radius-lg, 16px)', padding:'20px' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'12px', marginBottom:'12px' }}>
                            <div>
                              <div style={{ fontWeight:'700', color:'var(--text)', fontSize:'16px', fontFamily:'var(--font-body)' }}>
                                Order #{o.order_number}
                              </div>
                              <div style={{ color:'var(--text-subtle)', fontSize:'12px', fontFamily:'var(--font-body)' }}>
                                {new Date(o.created_at).toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'numeric', minute:'2-digit' })}
                                {' -- '}
                                {o.fulfillment_type === 'pickup' ? 'Pickup' : 'Delivery'}
                              </div>
                            </div>
                            <div style={{ textAlign:'right' }}>
                              <div style={{ fontFamily:'var(--font-display)', fontSize:'22px', fontWeight:'600', color:'var(--text)' }}>Rs.{Number(o.total).toFixed(2)}</div>
                              <div style={{ marginTop:'4px' }}>{statusPill(o.status)}</div>
                            </div>
                          </div>
                          <div style={{ paddingTop:'12px' }}>
                            {(o.customer_order_items || []).map((it, idx) => (
                              <div key={it.id} style={{
                                display:'flex', justifyContent:'space-between', fontSize:'13px', color:'var(--text-muted)',
                                padding:'8px 12px',
                                background: idx % 2 === 0 ? 'var(--bg-inset)' : 'transparent',
                                borderRadius:'6px',
                                fontFamily:'var(--font-body)',
                              }}>
                                <span>{it.item_name} x {it.quantity}</span>
                                <span>Rs.{Number(it.total_price).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Borrowed */}
              {tab === 'borrowed' && (
                <div>
                  <h3 style={{ fontFamily:'var(--font-display)', fontSize:'22px', color:'var(--text)', marginBottom:'20px', fontWeight:'600' }}>Currently Borrowed Books</h3>
                  {borrowed.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'40px', color:'var(--text-subtle)' }}>
                      <p style={{ fontFamily:'var(--font-display)', fontSize:'18px', marginBottom:'12px' }}>You haven't borrowed any books yet.</p>
                      <Link to="/books" className="tps-btn-tertiary" style={{ color:'var(--secondary)', fontWeight:'600', textDecoration:'none' }}>Browse Books</Link>
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                      {borrowed.map((b, idx) => {
                        const dueDate = new Date(b.due_date);
                        const daysLeft = Math.ceil((dueDate - today) / (1000*60*60*24));
                        const overdue = daysLeft < 0;
                        return (
                          <div key={b.id} style={{
                            display:'flex', justifyContent:'space-between', alignItems:'center',
                            padding:'16px 20px',
                            background: overdue ? 'rgba(252,129,129,0.06)' : (idx % 2 === 0 ? 'var(--bg-section)' : 'var(--bg-inset)'),
                            borderRadius:'var(--radius-lg, 16px)',
                            flexWrap:'wrap', gap:'12px',
                          }}>
                            <div>
                              <div style={{ fontWeight:'700', color:'var(--text)', fontSize:'16px', marginBottom:'4px', fontFamily:'var(--font-body)' }}>{b.books?.title}</div>
                              <div style={{ color:'var(--text-subtle)', fontSize:'13px', fontFamily:'var(--font-body)' }}>by {b.books?.author}</div>
                            </div>
                            <div style={{ textAlign:'right' }}>
                              <div style={{ fontSize:'12px', color:'var(--text-subtle)', marginBottom:'4px', fontFamily:'var(--font-body)' }}>Due date</div>
                              <div style={{ fontWeight:'600', color: overdue ? '#FC8181' : daysLeft <= 3 ? 'var(--accent)' : 'var(--secondary)', fontSize:'15px', fontFamily:'var(--font-display)' }}>
                                {dueDate.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                              </div>
                              <div style={{ fontSize:'12px', color: overdue ? '#FC8181' : 'var(--text-subtle)', marginTop:'2px', fontFamily:'var(--font-body)' }}>
                                {overdue ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Reservations */}
              {tab === 'reservations' && (
                <div>
                  <h3 style={{ fontFamily:'var(--font-display)', fontSize:'22px', color:'var(--text)', marginBottom:'20px', fontWeight:'600' }}>My Reservations</h3>
                  {reservations.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'40px', color:'var(--text-subtle)' }}>
                      <p style={{ fontFamily:'var(--font-display)', fontSize:'18px', marginBottom:'12px' }}>No reservations yet.</p>
                      <Link to="/books" className="tps-btn-tertiary" style={{ color:'var(--secondary)', fontWeight:'600', textDecoration:'none' }}>Find a Book</Link>
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                      {reservations.map((r, idx) => (
                        <div key={r.id} style={{
                          display:'flex', justifyContent:'space-between', alignItems:'center',
                          padding:'16px 20px',
                          background: idx % 2 === 0 ? 'var(--bg-section)' : 'var(--bg-inset)',
                          borderRadius:'var(--radius-lg, 16px)',
                          flexWrap:'wrap', gap:'12px',
                        }}>
                          <div>
                            <div style={{ fontWeight:'700', color:'var(--text)', fontSize:'16px', marginBottom:'4px', fontFamily:'var(--font-body)' }}>{r.books?.title}</div>
                            <div style={{ color:'var(--text-subtle)', fontSize:'13px', fontFamily:'var(--font-body)' }}>Reserved {new Date(r.created_at).toLocaleDateString('en-IN')}</div>
                          </div>
                          <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                            <span className="tps-chip" style={{
                              padding:'4px 12px', fontSize:'12px', fontWeight:'700',
                              background: r.status === 'pending' ? 'rgba(196,144,64,0.15)' : r.status === 'available' ? 'rgba(0,106,106,0.12)' : 'rgba(139,115,85,0.1)',
                              color: r.status === 'pending' ? 'var(--accent)' : r.status === 'available' ? 'var(--secondary)' : 'var(--text-subtle)'
                            }}>
                              {r.status === 'pending' ? 'Pending' : r.status === 'available' ? 'Available' : r.status === 'cancelled' ? 'Cancelled' : r.status}
                            </span>
                            {r.status === 'pending' && (
                              <button onClick={() => cancelReservation(r.id)} style={{
                                padding:'6px 12px', borderRadius:'var(--radius-lg, 16px)',
                                border:'none', background:'rgba(155,35,53,0.1)', color:'#9B2335',
                                cursor:'pointer', fontSize:'12px', fontFamily:'var(--font-body)', fontWeight:'600'
                              }}>
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Wishlist — grid of book cards */}
              {tab === 'wishlist' && (
                <div>
                  <h3 style={{ fontFamily:'var(--font-display)', fontSize:'22px', color:'var(--text)', marginBottom:'20px', fontWeight:'600' }}>My Wishlist</h3>
                  {wishlist.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'40px', color:'var(--text-subtle)' }}>
                      <p style={{ fontFamily:'var(--font-display)', fontSize:'18px', marginBottom:'12px' }}>Your wishlist is empty.</p>
                      <Link to="/books" className="tps-btn-tertiary" style={{ color:'var(--secondary)', fontWeight:'600', textDecoration:'none' }}>Discover Books</Link>
                    </div>
                  ) : (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:'16px' }}>
                      {wishlist.map(w => (
                        <div key={w.id} className="tps-card-interactive" style={{
                          background:'var(--bg-section)', borderRadius:'var(--radius-lg, 16px)', padding:'20px',
                          position:'relative',
                          boxShadow:'var(--shadow-ambient, 0 8px 32px rgba(38,23,12,0.06))',
                          transition:'transform 200ms ease, box-shadow 200ms ease',
                        }}>
                          <button onClick={() => removeWishlist(w.book_id)} style={{
                            position:'absolute', top:'12px', right:'12px',
                            background:'rgba(155,35,53,0.08)', border:'none', cursor:'pointer',
                            fontSize:'14px', color:'#9B2335', borderRadius:'50%',
                            width:'28px', height:'28px', display:'flex', alignItems:'center', justifyContent:'center',
                          }}>x</button>
                          <h4 style={{ fontFamily:'var(--font-display)', fontSize:'16px', color:'var(--text)', marginBottom:'4px', paddingRight:'24px', fontWeight:'600' }}>{w.books?.title}</h4>
                          <p style={{ color:'var(--text-subtle)', fontSize:'13px', marginBottom:'12px', fontFamily:'var(--font-body)' }}>by {w.books?.author}</p>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <span className="tps-chip" style={{
                              fontSize:'12px', fontWeight:'700', padding:'3px 10px',
                              background: w.books?.quantity_available > 0 ? 'rgba(0,106,106,0.12)' : 'rgba(155,35,53,0.1)',
                              color: w.books?.quantity_available > 0 ? 'var(--secondary)' : '#9B2335'
                            }}>
                              {w.books?.quantity_available > 0 ? 'Available' : 'Out of stock'}
                            </span>
                            <Link to={`/books/${w.book_id}`} className="tps-btn-tertiary" style={{ color:'var(--secondary)', fontSize:'13px', fontWeight:'600', textDecoration:'none', fontFamily:'var(--font-display)' }}>View</Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </>
          )}
        </div>
      </div>
    </div>
  );
}
