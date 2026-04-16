import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useApp } from '../App';

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding:'10px 20px', border:'none', borderRadius:'8px', cursor:'pointer', fontFamily:'Lato, sans-serif',
      background: active ? '#2C1810' : 'transparent',
      color: active ? '#F5DEB3' : '#8B6914',
      fontWeight: active ? '700' : '400', fontSize:'14px', transition:'all 0.2s'
    }}>
      {children}
    </button>
  );
}

function randomCode() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export default function MemberDashboard() {
  const navigate = useNavigate();
  const { member } = useApp();
  const [tab, setTab] = useState('borrowed');
  const [borrowed, setBorrowed] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [fines, setFines] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [points, setPoints] = useState(null);
  const [pointsTx, setPointsTx] = useState([]);
  const [referral, setReferral] = useState(null);
  const [referralStats, setReferralStats] = useState({ invited: 0, rewarded: 0 });
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!member) { navigate('/login'); return; }
    fetchAll();
  }, [member]); // eslint-disable-line

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [borrowedRes, reservRes, wishlistRes, pointsRes, txRes, refRes] = await Promise.all([
        supabase.from('circulation').select('*, books(title, author, genre)').eq('member_id', member.id).eq('status', 'checked_out').order('due_date'),
        supabase.from('reservations').select('*, books(title, author)').eq('member_id', member.id).order('reservation_date', { ascending:false }),
        supabase.from('wishlists').select('*, books(id, title, author, genre, quantity_available)').eq('member_id', member.id).order('created_at', { ascending:false }),
        supabase.from('loyalty_balances').select('*').eq('member_id', member.id).maybeSingle(),
        supabase.from('loyalty_transactions').select('*').eq('member_id', member.id).order('created_at', { ascending:false }).limit(30),
        supabase.from('referrals').select('id, code, reward_status, to_member_id').eq('from_member_id', member.id),
      ]);
      setBorrowed(borrowedRes.data || []);
      setReservations(reservRes.data || []);
      const today = new Date();
      setFines((borrowedRes.data || []).filter(b => new Date(b.due_date) < today).map(b => ({
        ...b,
        daysOverdue: Math.floor((today - new Date(b.due_date)) / (1000*60*60*24)),
        fineAmount: Math.floor((today - new Date(b.due_date)) / (1000*60*60*24)) * 10
      })));
      setWishlist(wishlistRes.data || []);
      setPoints(pointsRes.data || { balance: 0, lifetime_earned: 0 });
      setPointsTx(txRes.data || []);

      const refs = refRes.data || [];
      // Keep the first active referral; if none, create one lazily on first render of Rewards tab.
      const activeRef = refs.find(r => r.reward_status !== 'void') || null;
      setReferral(activeRef);
      setReferralStats({
        invited: refs.filter(r => r.to_member_id).length,
        rewarded: refs.filter(r => r.reward_status === 'rewarded').length,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const ensureReferralCode = async () => {
    if (referral?.code) return referral.code;
    // Create one — retry a few times in the astronomically unlikely case of collision.
    for (let i = 0; i < 5; i++) {
      const code = randomCode();
      const { data, error } = await supabase
        .from('referrals')
        .insert({ code, from_member_id: member.id })
        .select('id, code, reward_status, to_member_id')
        .single();
      if (!error && data) {
        setReferral(data);
        return data.code;
      }
    }
    return null;
  };

  const handleCopyReferral = async () => {
    const code = await ensureReferralCode();
    if (!code) return;
    const url = `${window.location.origin}/?ref=${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: prompt
      window.prompt('Copy this link:', url);
    }
  };

  const removeWishlist = async (bookId) => {
    await supabase.from('wishlists').delete().eq('member_id', member.id).eq('book_id', bookId);
    setWishlist(w => w.filter(i => i.book_id !== bookId));
  };

  const cancelReservation = async (id) => {
    await supabase.from('reservations').update({ status:'cancelled' }).eq('id', id);
    setReservations(r => r.map(i => i.id === id ? {...i, status:'cancelled'} : i));
  };

  if (!member) return null;

  const totalFines = fines.reduce((s, f) => s + f.fineAmount, 0);
  const pointsBalance = points?.balance || 0;

  return (
    <div style={{ maxWidth:'1100px', margin:'0 auto', padding:'40px 20px', fontFamily:'Lato, sans-serif' }}>

      {/* Header */}
      <div style={{ background:'linear-gradient(135deg, #2C1810, #4A2C17)', borderRadius:'20px', padding:'32px', marginBottom:'32px', color:'white' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'16px' }}>
          <div>
            <div style={{ fontSize:'40px', marginBottom:'8px' }}>👤</div>
            <h1 style={{ fontFamily:'"Playfair Display", serif', fontSize:'32px', fontWeight:'700', color:'#F5DEB3', marginBottom:'4px' }}>
              Welcome, {member.name?.split(' ')[0]}!
            </h1>
            <p style={{ color:'rgba(245,222,179,0.7)', fontSize:'14px' }}>{member.email}</p>
            {member.membership_type && (
              <span style={{ display:'inline-block', marginTop:'8px', background:'rgba(212,168,83,0.25)', border:'1px solid rgba(212,168,83,0.5)', borderRadius:'20px', padding:'4px 14px', color:'#D4A853', fontSize:'13px', fontWeight:'700' }}>
                {member.membership_type} Member
              </span>
            )}
          </div>
          {member.membership_expiry && (
            <div style={{ textAlign:'right' }}>
              <div style={{ color:'rgba(245,222,179,0.6)', fontSize:'12px', marginBottom:'4px' }}>Membership expires</div>
              <div style={{ color:'#D4A853', fontWeight:'700', fontSize:'16px' }}>{new Date(member.membership_expiry).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}</div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))', gap:'16px', marginTop:'24px' }}>
          {[
            { num: pointsBalance, label:'Reward Points', icon:'✨', accent:true },
            { num: borrowed.length, label:'Books Borrowed', icon:'📚' },
            { num: reservations.filter(r => r.status === 'pending').length, label:'Reservations', icon:'🔖' },
            { num: fines.length, label:'Overdue', icon:'⚠️', warning: fines.length > 0 },
            { num: wishlist.length, label:'Wishlist', icon:'❤️' },
          ].map(s => (
            <div key={s.label} style={{ background:'rgba(255,255,255,0.08)', borderRadius:'12px', padding:'16px', textAlign:'center' }}>
              <div style={{ fontSize:'24px', marginBottom:'4px' }}>{s.icon}</div>
              <div style={{ fontSize:'28px', fontWeight:'800', color: s.warning ? '#FC8181' : s.accent ? '#F5DEB3' : '#D4A853', fontFamily:'"Playfair Display", serif' }}>{s.num}</div>
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
            <div style={{ color:'#5C3A1E', fontSize:'14px' }}>You have {fines.length} overdue book{fines.length > 1 ? 's' : ''}. Please return them and pay the fines.</div>
          </div>
          <div style={{ fontFamily:'"Playfair Display", serif', fontSize:'24px', fontWeight:'800', color:'#FC8181' }}>
            ₹{totalFines}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ background:'white', borderRadius:'16px', overflow:'hidden', boxShadow:'0 4px 20px rgba(0,0,0,0.08)' }}>
        <div style={{ background:'#FFF8ED', padding:'8px', display:'flex', gap:'4px', borderBottom:'1px solid #F5DEB3', flexWrap:'wrap' }}>
          <TabBtn active={tab==='borrowed'} onClick={() => setTab('borrowed')}>📚 Borrowed ({borrowed.length})</TabBtn>
          <TabBtn active={tab==='reservations'} onClick={() => setTab('reservations')}>🔖 Reservations ({reservations.length})</TabBtn>
          <TabBtn active={tab==='rewards'} onClick={() => setTab('rewards')}>✨ Rewards ({pointsBalance})</TabBtn>
          <TabBtn active={tab==='fines'} onClick={() => setTab('fines')}>⚠️ Fines ({fines.length})</TabBtn>
          <TabBtn active={tab==='wishlist'} onClick={() => setTab('wishlist')}>❤️ Wishlist ({wishlist.length})</TabBtn>
        </div>

        <div style={{ padding:'24px' }}>
          {loading ? (
            <div style={{ textAlign:'center', padding:'40px', color:'#8B6914' }}>Loading your library...</div>
          ) : (

            <>
              {/* Borrowed */}
              {tab === 'borrowed' && (
                <div>
                  <h3 style={{ fontFamily:'"Playfair Display", serif', fontSize:'22px', color:'#2C1810', marginBottom:'20px' }}>Currently Borrowed Books</h3>
                  {borrowed.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'40px', color:'#8B6914' }}>
                      <div style={{ fontSize:'48px', marginBottom:'12px' }}>📭</div>
                      <p>You haven't borrowed any books yet.</p>
                      <Link to="/books" style={{ color:'#D4A853', fontWeight:'700', textDecoration:'none', display:'inline-block', marginTop:'12px' }}>Browse Books →</Link>
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                      {borrowed.map(b => {
                        const dueDate = new Date(b.due_date);
                        const today = new Date();
                        const daysLeft = Math.ceil((dueDate - today) / (1000*60*60*24));
                        const overdue = daysLeft < 0;
                        return (
                          <div key={b.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', background: overdue ? 'rgba(252,129,129,0.08)' : '#FFF8ED', borderRadius:'12px', border:`1px solid ${overdue ? 'rgba(252,129,129,0.3)' : '#F5DEB3'}`, flexWrap:'wrap', gap:'12px' }}>
                            <div>
                              <div style={{ fontWeight:'700', color:'#2C1810', fontSize:'16px', marginBottom:'4px' }}>{b.books?.title}</div>
                              <div style={{ color:'#8B6914', fontSize:'13px' }}>by {b.books?.author}</div>
                            </div>
                            <div style={{ textAlign:'right' }}>
                              <div style={{ fontSize:'12px', color:'#8B6914', marginBottom:'4px' }}>Due date</div>
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
                  <h3 style={{ fontFamily:'"Playfair Display", serif', fontSize:'22px', color:'#2C1810', marginBottom:'20px' }}>My Reservations</h3>
                  {reservations.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'40px', color:'#8B6914' }}>
                      <div style={{ fontSize:'48px', marginBottom:'12px' }}>🔖</div>
                      <p>No reservations yet.</p>
                      <Link to="/books" style={{ color:'#D4A853', fontWeight:'700', textDecoration:'none', display:'inline-block', marginTop:'12px' }}>Find a Book →</Link>
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                      {reservations.map(r => (
                        <div key={r.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', background:'#FFF8ED', borderRadius:'12px', border:'1px solid #F5DEB3', flexWrap:'wrap', gap:'12px' }}>
                          <div>
                            <div style={{ fontWeight:'700', color:'#2C1810', fontSize:'16px', marginBottom:'4px' }}>{r.books?.title}</div>
                            <div style={{ color:'#8B6914', fontSize:'13px' }}>Reserved on {new Date(r.reservation_date).toLocaleDateString('en-IN')}</div>
                          </div>
                          <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                            <span style={{
                              padding:'4px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:'700',
                              background: r.status === 'pending' ? 'rgba(246,173,85,0.2)' : r.status === 'ready' ? 'rgba(72,187,120,0.2)' : 'rgba(204,204,204,0.2)',
                              color: r.status === 'pending' ? '#C05621' : r.status === 'ready' ? '#276749' : '#666'
                            }}>
                              {r.status === 'pending' ? '⏳ Pending' : r.status === 'ready' ? '✅ Ready' : '❌ Cancelled'}
                            </span>
                            {r.status === 'pending' && (
                              <button onClick={() => cancelReservation(r.id)} style={{ padding:'6px 12px', borderRadius:'8px', border:'1px solid #FC8181', background:'transparent', color:'#FC8181', cursor:'pointer', fontSize:'12px', fontFamily:'Lato, sans-serif' }}>
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

              {/* Rewards */}
              {tab === 'rewards' && (
                <div>
                  <h3 style={{ fontFamily:'"Playfair Display", serif', fontSize:'22px', color:'#2C1810', marginBottom:'20px' }}>
                    Reward Points
                  </h3>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'24px' }}>
                    <div style={{ background:'linear-gradient(135deg, #FFF8ED, #F5DEB3)', borderRadius:'12px', padding:'20px' }}>
                      <div style={{ fontSize:'12px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'1.5px', color:'#8B6914', marginBottom:'6px' }}>
                        Balance
                      </div>
                      <div style={{ fontFamily:'"Playfair Display", serif', fontSize:'36px', fontWeight:'800', color:'#2C1810' }}>
                        {pointsBalance} <span style={{ fontSize:'14px', color:'#8B6914', fontWeight:'600' }}>pts</span>
                      </div>
                      <div style={{ fontSize:'12px', color:'#5C3A1E', marginTop:'4px' }}>
                        Worth ₹{pointsBalance} at checkout
                      </div>
                    </div>
                    <div style={{ background:'#FFF8ED', borderRadius:'12px', padding:'20px' }}>
                      <div style={{ fontSize:'12px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'1.5px', color:'#8B6914', marginBottom:'6px' }}>
                        Lifetime earned
                      </div>
                      <div style={{ fontFamily:'"Playfair Display", serif', fontSize:'36px', fontWeight:'800', color:'#2C1810' }}>
                        {points?.lifetime_earned || 0}
                      </div>
                      <div style={{ fontSize:'12px', color:'#5C3A1E', marginTop:'4px' }}>
                        1 pt per ₹10 spent · redeemable at checkout
                      </div>
                    </div>
                  </div>

                  {/* Referral card */}
                  <div style={{
                    background:'linear-gradient(135deg, #2C1810 0%, #4A2C17 100%)',
                    borderRadius:'16px', padding:'24px', marginBottom:'28px', color:'#F5DEB3',
                  }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'16px', flexWrap:'wrap', marginBottom:'16px' }}>
                      <div>
                        <div style={{ fontSize:'12px', fontWeight:'700', letterSpacing:'2px', textTransform:'uppercase', color:'#D4A853', marginBottom:'6px' }}>
                          Invite friends, both earn points
                        </div>
                        <h4 style={{ fontFamily:'"Playfair Display", serif', fontSize:'20px', fontWeight:'700', color:'#F5DEB3', margin:0 }}>
                          Get 100 points when a friend places their first order
                        </h4>
                        <p style={{ fontSize:'13px', color:'rgba(245,222,179,0.75)', marginTop:'6px' }}>
                          Your friend also gets a 50-point welcome bonus.
                        </p>
                      </div>
                      <div style={{ textAlign:'right', fontSize:'11px', color:'rgba(245,222,179,0.6)' }}>
                        <div>{referralStats.invited} invited</div>
                        <div>{referralStats.rewarded} rewarded</div>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'center' }}>
                      <button
                        onClick={handleCopyReferral}
                        style={{
                          background:'#D4A853', color:'#2C1810', border:'none',
                          padding:'10px 20px', borderRadius:'8px',
                          fontWeight:'700', fontSize:'14px', cursor:'pointer',
                          fontFamily:'Lato, sans-serif',
                        }}
                      >
                        {copied ? '✓ Copied!' : referral?.code ? `Copy link (${referral.code})` : 'Generate invite link'}
                      </button>
                      {referral?.code && (
                        <span style={{ fontSize:'12px', color:'rgba(245,222,179,0.6)', fontFamily:'ui-monospace, monospace' }}>
                          {window.location.origin}/?ref={referral.code}
                        </span>
                      )}
                    </div>
                  </div>

                  <h4 style={{ fontFamily:'"Playfair Display", serif', fontSize:'16px', color:'#2C1810', marginBottom:'12px' }}>
                    Recent activity
                  </h4>
                  {pointsTx.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'30px', color:'#8B6914' }}>
                      No points activity yet. Place an order to start earning.
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                      {pointsTx.map(t => (
                        <div key={t.id} style={{
                          display:'flex', justifyContent:'space-between', alignItems:'center',
                          padding:'14px 18px', background:'#FFF8ED',
                          borderRadius:'10px', border:'1px solid #F5DEB3',
                        }}>
                          <div>
                            <div style={{ fontWeight:'700', color:'#2C1810', fontSize:'14px' }}>{t.reason}</div>
                            <div style={{ fontSize:'12px', color:'#8B6914', marginTop:'2px' }}>
                              {new Date(t.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                            </div>
                          </div>
                          <div style={{
                            fontFamily:'"Playfair Display", serif', fontSize:'20px', fontWeight:'800',
                            color: t.points > 0 ? '#48BB78' : '#FC8181',
                          }}>
                            {t.points > 0 ? '+' : ''}{t.points}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Fines */}
              {tab === 'fines' && (
                <div>
                  <h3 style={{ fontFamily:'"Playfair Display", serif', fontSize:'22px', color:'#2C1810', marginBottom:'20px' }}>Outstanding Fines</h3>
                  {fines.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'40px', color:'#48BB78' }}>
                      <div style={{ fontSize:'48px', marginBottom:'12px' }}>✅</div>
                      <p style={{ color:'#276749', fontWeight:'600' }}>No outstanding fines!</p>
                    </div>
                  ) : (
                    <>
                      <div style={{ display:'flex', flexDirection:'column', gap:'12px', marginBottom:'20px' }}>
                        {fines.map(f => (
                          <div key={f.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', background:'rgba(252,129,129,0.08)', borderRadius:'12px', border:'1px solid rgba(252,129,129,0.3)', flexWrap:'wrap', gap:'12px' }}>
                            <div>
                              <div style={{ fontWeight:'700', color:'#2C1810', fontSize:'16px', marginBottom:'4px' }}>{f.books?.title}</div>
                              <div style={{ color:'#FC8181', fontSize:'13px' }}>⚠️ {f.daysOverdue} days overdue</div>
                            </div>
                            <div style={{ textAlign:'right' }}>
                              <div style={{ fontFamily:'"Playfair Display", serif', fontSize:'24px', fontWeight:'800', color:'#FC8181' }}>₹{f.fineAmount}</div>
                              <div style={{ color:'#8B6914', fontSize:'12px' }}>₹10/day fine</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ background:'rgba(252,129,129,0.1)', borderRadius:'12px', padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span style={{ fontWeight:'700', color:'#2C1810', fontSize:'16px' }}>Total Fines Due</span>
                        <span style={{ fontFamily:'"Playfair Display", serif', fontSize:'28px', fontWeight:'800', color:'#FC8181' }}>₹{totalFines}</span>
                      </div>
                      <p style={{ marginTop:'12px', color:'#8B6914', fontSize:'13px', textAlign:'center' }}>
                        Please visit the library to return books and pay fines. Call us at +91 98765 43210.
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Wishlist */}
              {tab === 'wishlist' && (
                <div>
                  <h3 style={{ fontFamily:'"Playfair Display", serif', fontSize:'22px', color:'#2C1810', marginBottom:'20px' }}>My Wishlist</h3>
                  {wishlist.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'40px', color:'#8B6914' }}>
                      <div style={{ fontSize:'48px', marginBottom:'12px' }}>❤️</div>
                      <p>Your wishlist is empty.</p>
                      <Link to="/books" style={{ color:'#D4A853', fontWeight:'700', textDecoration:'none', display:'inline-block', marginTop:'12px' }}>Discover Books →</Link>
                    </div>
                  ) : (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:'16px' }}>
                      {wishlist.map(w => (
                        <div key={w.id} style={{ background:'#FFF8ED', borderRadius:'12px', padding:'16px', border:'1px solid #F5DEB3', position:'relative' }}>
                          <button onClick={() => removeWishlist(w.book_id)} style={{ position:'absolute', top:'12px', right:'12px', background:'none', border:'none', cursor:'pointer', fontSize:'16px', color:'#FC8181' }}>✕</button>
                          <div style={{ fontSize:'32px', marginBottom:'8px' }}>📖</div>
                          <h4 style={{ fontFamily:'"Playfair Display", serif', fontSize:'16px', color:'#2C1810', marginBottom:'4px', paddingRight:'24px' }}>{w.books?.title}</h4>
                          <p style={{ color:'#8B6914', fontSize:'13px', marginBottom:'10px' }}>by {w.books?.author}</p>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <span style={{ fontSize:'12px', fontWeight:'700', padding:'3px 10px', borderRadius:'10px', background: w.books?.quantity_available > 0 ? 'rgba(72,187,120,0.15)' : 'rgba(252,129,129,0.15)', color: w.books?.quantity_available > 0 ? '#276749' : '#9B2335' }}>
                              {w.books?.quantity_available > 0 ? '✅ Available' : '❌ Borrowed'}
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
