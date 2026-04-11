import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

// =====================================================================
// Profile (/profile) — the one-stop customer page.
//
// Tabs:
//   overview  — name/email/phone edit + membership status
//   orders    — online orders from customer_orders
//   borrowed  — currently-borrowed books (read-only view of circulation)
//   reserved  — library reservations
//   wishlist  — add/remove books from wishlist
//
// Replaces the old MemberDashboard.js. /member is redirected here in
// App.js for backward compat.
// =====================================================================

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding:'10px 18px', border:'none', borderRadius:'8px', cursor:'pointer', fontFamily:'var(--font-body)',
      background: active ? '#2C1810' : 'transparent',
      color: active ? '#F5DEB3' : '#8B6914',
      fontWeight: active ? '700' : '400', fontSize:'14px', transition:'all 0.2s', whiteSpace:'nowrap'
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
      setSaveMsg('✅ Profile updated');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) {
      setSaveMsg(`❌ ${err.message || 'Failed to save'}`);
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
      pending:          { bg:'rgba(246,173,85,0.2)',  fg:'#C05621', label:'⏳ Pending payment' },
      paid:             { bg:'rgba(66,153,225,0.15)', fg:'#2B6CB0', label:'💰 Paid' },
      ready_for_pickup: { bg:'rgba(72,187,120,0.2)',  fg:'#276749', label:'✅ Ready for pickup' },
      fulfilled:        { bg:'rgba(107,70,193,0.15)', fg:'#553C9A', label:'📦 Fulfilled' },
      cancelled:        { bg:'rgba(252,129,129,0.15)', fg:'#9B2335', label:'❌ Cancelled' },
      refunded:         { bg:'rgba(160,174,192,0.2)', fg:'#4A5568', label:'↩️ Refunded' },
    };
    const s = map[status] || { bg:'rgba(204,204,204,0.2)', fg:'#666', label: status };
    return (
      <span style={{ padding:'4px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:'700', background:s.bg, color:s.fg }}>
        {s.label}
      </span>
    );
  };

  return (
    <div style={{ maxWidth:'1100px', margin:'0 auto', padding:'40px 20px', fontFamily:'var(--font-body)' }}>

      {/* Header */}
      <div style={{ background:'linear-gradient(135deg, #2C1810, #4A2C17)', borderRadius:'20px', padding:'32px', marginBottom:'32px', color:'white' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'16px' }}>
          <div>
            <div style={{ fontSize:'40px', marginBottom:'8px' }}>👤</div>
            <h1 style={{ fontFamily:'var(--font-heading)', fontSize:'32px', fontWeight:'700', color:'#F5DEB3', marginBottom:'4px' }}>
              Welcome, {member.name?.split(' ')[0] || 'there'}!
            </h1>
            <p style={{ color:'rgba(245,222,179,0.7)', fontSize:'14px' }}>{member.email}</p>
            {member.plan && member.plan !== 'no_plan' && (
              <span style={{ display:'inline-block', marginTop:'8px', background:'rgba(212,168,83,0.25)', border:'1px solid rgba(212,168,83,0.5)', borderRadius:'20px', padding:'4px 14px', color:'#D4A853', fontSize:'13px', fontWeight:'700', textTransform:'capitalize' }}>
                {member.plan} Member
              </span>
            )}
          </div>
          {member.subscription_end && (
            <div style={{ textAlign:'right' }}>
              <div style={{ color:'rgba(245,222,179,0.6)', fontSize:'12px', marginBottom:'4px' }}>Membership {membershipActive ? 'expires' : 'expired'}</div>
              <div style={{ color: membershipActive ? '#D4A853' : '#FC8181', fontWeight:'700', fontSize:'16px' }}>
                {new Date(member.subscription_end).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))', gap:'16px', marginTop:'24px' }}>
          {[
            { num: orders.length,        label:'Online Orders', icon:'🛒' },
            { num: borrowed.length,      label:'Borrowed',       icon:'📚' },
            { num: reservations.filter(r => r.status === 'pending').length, label:'Reservations', icon:'🔖' },
            { num: fines.length,         label:'Overdue', icon:'⚠️', warning: fines.length > 0 },
            { num: wishlist.length,      label:'Wishlist', icon:'❤️' },
          ].map(s => (
            <div key={s.label} style={{ background:'rgba(255,255,255,0.08)', borderRadius:'12px', padding:'16px', textAlign:'center' }}>
              <div style={{ fontSize:'24px', marginBottom:'4px' }}>{s.icon}</div>
              <div style={{ fontSize:'28px', fontWeight:'800', color: s.warning ? '#FC8181' : '#D4A853', fontFamily:'var(--font-heading)' }}>{s.num}</div>
              <div style={{ color:'rgba(245,222,179,0.7)', fontSize:'12px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Fine Alert */}
      {fines.length > 0 && (
        <div style={{ background:'rgba(252,129,129,0.15)', border:'2px solid #FC8181', borderRadius:'12px', padding:'16px 20px', marginBottom:'24px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'12px' }}>
          <div>
            <div style={{ fontWeight:'700', color:'#9B2335', fontSize:'16px', marginBottom:'4px' }}>⚠️ Outstanding Fines</div>
            <div style={{ color:'var(--text-muted)', fontSize:'14px' }}>You have {fines.length} overdue book{fines.length > 1 ? 's' : ''}. Please return them at the library.</div>
          </div>
          <div style={{ fontFamily:'var(--font-heading)', fontSize:'24px', fontWeight:'800', color:'#FC8181' }}>
            ₹{totalFines}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ background:'var(--surface)', borderRadius:'16px', overflow:'hidden', boxShadow:'0 4px 20px rgba(0,0,0,0.08)' }}>
        <div style={{ background:'var(--bg-subtle)', padding:'8px', display:'flex', gap:'4px', borderBottom:'1px solid var(--border)', overflowX:'auto' }}>
          <TabBtn active={tab==='overview'}     onClick={() => setTab('overview')}>👤 Profile</TabBtn>
          <TabBtn active={tab==='orders'}       onClick={() => setTab('orders')}>🛒 Orders ({orders.length})</TabBtn>
          <TabBtn active={tab==='borrowed'}     onClick={() => setTab('borrowed')}>📚 Borrowed ({borrowed.length})</TabBtn>
          <TabBtn active={tab==='reservations'} onClick={() => setTab('reservations')}>🔖 Reservations ({reservations.length})</TabBtn>
          <TabBtn active={tab==='wishlist'}     onClick={() => setTab('wishlist')}>❤️ Wishlist ({wishlist.length})</TabBtn>
        </div>

        <div style={{ padding:'24px' }}>
          {loading ? (
            <div style={{ textAlign:'center', padding:'40px', color:'var(--text-subtle)' }}>Loading...</div>
          ) : (
            <>

              {/* Overview — profile edit */}
              {tab === 'overview' && (
                <div style={{ maxWidth:'560px' }}>
                  <h3 style={{ fontFamily:'var(--font-heading)', fontSize:'22px', color:'var(--text)', marginBottom:'20px' }}>Personal Information</h3>
                  <form onSubmit={saveProfile} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                    <div>
                      <label style={{ fontSize:'12px', fontWeight:'700', color:'var(--text-subtle)', textTransform:'uppercase', letterSpacing:'1px', display:'block', marginBottom:'8px' }}>Full Name</label>
                      <input value={formName} onChange={e => setFormName(e.target.value)} required
                        style={{ width:'100%', padding:'12px 16px', border:'2px solid var(--border)', borderRadius:'8px', fontSize:'15px', outline:'none', fontFamily:'var(--font-body)', boxSizing:'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize:'12px', fontWeight:'700', color:'var(--text-subtle)', textTransform:'uppercase', letterSpacing:'1px', display:'block', marginBottom:'8px' }}>Email (read-only)</label>
                      <input value={member.email || ''} disabled
                        style={{ width:'100%', padding:'12px 16px', border:'2px solid var(--border)', borderRadius:'8px', fontSize:'15px', background:'var(--bg-subtle)', color:'var(--text-subtle)', fontFamily:'var(--font-body)', boxSizing:'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize:'12px', fontWeight:'700', color:'var(--text-subtle)', textTransform:'uppercase', letterSpacing:'1px', display:'block', marginBottom:'8px' }}>Phone</label>
                      <input value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="+91 98765 43210"
                        style={{ width:'100%', padding:'12px 16px', border:'2px solid var(--border)', borderRadius:'8px', fontSize:'15px', outline:'none', fontFamily:'var(--font-body)', boxSizing:'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize:'12px', fontWeight:'700', color:'var(--text-subtle)', textTransform:'uppercase', letterSpacing:'1px', display:'block', marginBottom:'8px' }}>Date of Birth</label>
                      <input type="date" value={formDob || ''} onChange={e => setFormDob(e.target.value)}
                        style={{ width:'100%', padding:'12px 16px', border:'2px solid var(--border)', borderRadius:'8px', fontSize:'15px', outline:'none', fontFamily:'var(--font-body)', boxSizing:'border-box' }} />
                    </div>
                    <button type="submit" disabled={saving} style={{
                      padding:'14px', background:'linear-gradient(135deg, #2C1810, #4A2C17)', color:'#F5DEB3',
                      border:'none', borderRadius:'12px', fontWeight:'700', fontSize:'16px', cursor: saving ? 'not-allowed' : 'pointer',
                      opacity: saving ? 0.7 : 1, fontFamily:'var(--font-body)', marginTop:'4px'
                    }}>
                      {saving ? '⏳ Saving...' : '💾 Save Changes'}
                    </button>
                    {saveMsg && <div style={{ textAlign:'center', color:'#276749', fontSize:'14px' }}>{saveMsg}</div>}
                  </form>
                </div>
              )}

              {/* Orders */}
              {tab === 'orders' && (
                <div>
                  <h3 style={{ fontFamily:'var(--font-heading)', fontSize:'22px', color:'var(--text)', marginBottom:'20px' }}>My Online Orders</h3>
                  {orders.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'40px', color:'var(--text-subtle)' }}>
                      <div style={{ fontSize:'48px', marginBottom:'12px' }}>🛒</div>
                      <p>No online orders yet.</p>
                      <Link to="/books" style={{ color:'#D4A853', fontWeight:'700', textDecoration:'none', display:'inline-block', marginTop:'12px' }}>Browse Books →</Link>
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                      {orders.map(o => (
                        <div key={o.id} style={{ background:'var(--bg-subtle)', borderRadius:'12px', border:'1px solid var(--border)', padding:'20px' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'12px', marginBottom:'12px' }}>
                            <div>
                              <div style={{ fontWeight:'700', color:'var(--text)', fontSize:'16px' }}>
                                Order #{o.order_number}
                              </div>
                              <div style={{ color:'var(--text-subtle)', fontSize:'12px' }}>
                                {new Date(o.created_at).toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'numeric', minute:'2-digit' })}
                                {' · '}
                                {o.fulfillment_type === 'pickup' ? '🏪 Pickup' : '🚚 Delivery'}
                              </div>
                            </div>
                            <div style={{ textAlign:'right' }}>
                              <div style={{ fontFamily:'var(--font-heading)', fontSize:'22px', fontWeight:'800', color:'var(--text)' }}>₹{Number(o.total).toFixed(2)}</div>
                              <div style={{ marginTop:'4px' }}>{statusPill(o.status)}</div>
                            </div>
                          </div>
                          <div style={{ borderTop:'1px solid var(--border)', paddingTop:'12px' }}>
                            {(o.customer_order_items || []).map(it => (
                              <div key={it.id} style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', color:'var(--text-muted)', padding:'4px 0' }}>
                                <span>{it.item_name} × {it.quantity}</span>
                                <span>₹{Number(it.total_price).toFixed(2)}</span>
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
                  <h3 style={{ fontFamily:'var(--font-heading)', fontSize:'22px', color:'var(--text)', marginBottom:'20px' }}>Currently Borrowed Books</h3>
                  {borrowed.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'40px', color:'var(--text-subtle)' }}>
                      <div style={{ fontSize:'48px', marginBottom:'12px' }}>📭</div>
                      <p>You haven't borrowed any books yet.</p>
                      <Link to="/books" style={{ color:'#D4A853', fontWeight:'700', textDecoration:'none', display:'inline-block', marginTop:'12px' }}>Browse Books →</Link>
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                      {borrowed.map(b => {
                        const dueDate = new Date(b.due_date);
                        const daysLeft = Math.ceil((dueDate - today) / (1000*60*60*24));
                        const overdue = daysLeft < 0;
                        return (
                          <div key={b.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', background: overdue ? 'rgba(252,129,129,0.08)' : '#FFF8ED', borderRadius:'12px', border:`1px solid ${overdue ? 'rgba(252,129,129,0.3)' : '#F5DEB3'}`, flexWrap:'wrap', gap:'12px' }}>
                            <div>
                              <div style={{ fontWeight:'700', color:'var(--text)', fontSize:'16px', marginBottom:'4px' }}>{b.books?.title}</div>
                              <div style={{ color:'var(--text-subtle)', fontSize:'13px' }}>by {b.books?.author}</div>
                            </div>
                            <div style={{ textAlign:'right' }}>
                              <div style={{ fontSize:'12px', color:'var(--text-subtle)', marginBottom:'4px' }}>Due date</div>
                              <div style={{ fontWeight:'700', color: overdue ? '#FC8181' : daysLeft <= 3 ? '#F6AD55' : '#48BB78', fontSize:'15px' }}>
                                {dueDate.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                              </div>
                              <div style={{ fontSize:'12px', color: overdue ? '#FC8181' : '#8B6914', marginTop:'2px' }}>
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
                  <h3 style={{ fontFamily:'var(--font-heading)', fontSize:'22px', color:'var(--text)', marginBottom:'20px' }}>My Reservations</h3>
                  {reservations.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'40px', color:'var(--text-subtle)' }}>
                      <div style={{ fontSize:'48px', marginBottom:'12px' }}>🔖</div>
                      <p>No reservations yet.</p>
                      <Link to="/books" style={{ color:'#D4A853', fontWeight:'700', textDecoration:'none', display:'inline-block', marginTop:'12px' }}>Find a Book →</Link>
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                      {reservations.map(r => (
                        <div key={r.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', background:'var(--bg-subtle)', borderRadius:'12px', border:'1px solid var(--border)', flexWrap:'wrap', gap:'12px' }}>
                          <div>
                            <div style={{ fontWeight:'700', color:'var(--text)', fontSize:'16px', marginBottom:'4px' }}>{r.books?.title}</div>
                            <div style={{ color:'var(--text-subtle)', fontSize:'13px' }}>Reserved {new Date(r.created_at).toLocaleDateString('en-IN')}</div>
                          </div>
                          <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                            <span style={{
                              padding:'4px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:'700',
                              background: r.status === 'pending' ? 'rgba(246,173,85,0.2)' : r.status === 'available' ? 'rgba(72,187,120,0.2)' : 'rgba(204,204,204,0.2)',
                              color: r.status === 'pending' ? '#C05621' : r.status === 'available' ? '#276749' : '#666'
                            }}>
                              {r.status === 'pending' ? '⏳ Pending' : r.status === 'available' ? '✅ Available' : r.status === 'cancelled' ? '❌ Cancelled' : r.status}
                            </span>
                            {r.status === 'pending' && (
                              <button onClick={() => cancelReservation(r.id)} style={{ padding:'6px 12px', borderRadius:'8px', border:'1px solid #FC8181', background:'transparent', color:'#FC8181', cursor:'pointer', fontSize:'12px', fontFamily:'var(--font-body)' }}>
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

              {/* Wishlist */}
              {tab === 'wishlist' && (
                <div>
                  <h3 style={{ fontFamily:'var(--font-heading)', fontSize:'22px', color:'var(--text)', marginBottom:'20px' }}>My Wishlist</h3>
                  {wishlist.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'40px', color:'var(--text-subtle)' }}>
                      <div style={{ fontSize:'48px', marginBottom:'12px' }}>❤️</div>
                      <p>Your wishlist is empty.</p>
                      <Link to="/books" style={{ color:'#D4A853', fontWeight:'700', textDecoration:'none', display:'inline-block', marginTop:'12px' }}>Discover Books →</Link>
                    </div>
                  ) : (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:'16px' }}>
                      {wishlist.map(w => (
                        <div key={w.id} style={{ background:'var(--bg-subtle)', borderRadius:'12px', padding:'16px', border:'1px solid var(--border)', position:'relative' }}>
                          <button onClick={() => removeWishlist(w.book_id)} style={{ position:'absolute', top:'12px', right:'12px', background:'none', border:'none', cursor:'pointer', fontSize:'16px', color:'#FC8181' }}>✕</button>
                          <div style={{ fontSize:'32px', marginBottom:'8px' }}>📖</div>
                          <h4 style={{ fontFamily:'var(--font-heading)', fontSize:'16px', color:'var(--text)', marginBottom:'4px', paddingRight:'24px' }}>{w.books?.title}</h4>
                          <p style={{ color:'var(--text-subtle)', fontSize:'13px', marginBottom:'10px' }}>by {w.books?.author}</p>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <span style={{ fontSize:'12px', fontWeight:'700', padding:'3px 10px', borderRadius:'10px', background: w.books?.quantity_available > 0 ? 'rgba(72,187,120,0.15)' : 'rgba(252,129,129,0.15)', color: w.books?.quantity_available > 0 ? '#276749' : '#9B2335' }}>
                              {w.books?.quantity_available > 0 ? '✅ Available' : '❌ Out'}
                            </span>
                            <Link to={`/books/${w.book_id}`} style={{ color:'#D4A853', fontSize:'13px', fontWeight:'700', textDecoration:'none' }}>View →</Link>
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
