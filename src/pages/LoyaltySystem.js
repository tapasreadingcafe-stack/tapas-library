import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

// =====================================================================
// Loyalty & Rewards — points, tiers, streaks, gift cards, vouchers
// =====================================================================

const TABS = ['Points', 'Tiers', 'Streaks', 'Gift Cards', 'Vouchers'];

const tierFor = (pts) => {
  if (pts >= 1000) return { name: 'Gold', color: '#D4A853', bg: '#fef9ee' };
  if (pts >= 500) return { name: 'Silver', color: '#94a3b8', bg: '#f1f5f9' };
  return { name: 'Bronze', color: '#b45309', bg: '#fffbeb' };
};

const genGiftCode = () => {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () => Array.from({ length: 4 }, () => c[Math.floor(Math.random() * c.length)]).join('');
  return `GIFT-${seg()}-${seg()}`;
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const currency = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

export default function LoyaltySystem() {
  const { staff } = useAuth();
  const [tab, setTab] = useState('Points');
  const [loading, setLoading] = useState(true);

  // Points state
  const [pointsTx, setPointsTx] = useState([]);
  const [showAwardModal, setShowAwardModal] = useState(false);

  // Tiers state (derived from members)
  const [memberPoints, setMemberPoints] = useState([]);

  // Streaks
  const [streaks, setStreaks] = useState([]);

  // Gift cards
  const [giftCards, setGiftCards] = useState([]);
  const [showGiftModal, setShowGiftModal] = useState(false);

  // Vouchers
  const [vouchers, setVouchers] = useState([]);
  const [showVoucherModal, setShowVoucherModal] = useState(false);

  // Members list (for modals)
  const [members, setMembers] = useState([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ptsRes, memRes, streakRes, gcRes, vouchRes] = await Promise.all([
        supabase.from('loyalty_points').select('*, members(name, email)').order('created_at', { ascending: false }).limit(200),
        supabase.from('members').select('id, name, email, status').eq('status', 'active').order('name'),
        supabase.from('reading_streaks').select('*, members(name, email)').order('current_streak', { ascending: false }),
        supabase.from('gift_cards').select('*').order('created_at', { ascending: false }),
        supabase.from('staff_vouchers').select('*, members(name, email)').order('created_at', { ascending: false }),
      ]);
      setPointsTx(ptsRes.data || []);
      setMembers(memRes.data || []);
      setStreaks(streakRes.data || []);
      setGiftCards(gcRes.data || []);
      setVouchers(vouchRes.data || []);

      // Build per-member totals for tiers
      const totals = {};
      (ptsRes.data || []).forEach(tx => {
        const mid = tx.member_id;
        if (!totals[mid]) totals[mid] = { member_id: mid, name: tx.members?.name || 'Unknown', email: tx.members?.email || '', total: 0 };
        totals[mid].total += (tx.points || 0);
      });
      setMemberPoints(Object.values(totals).sort((a, b) => b.total - a.total));
    } catch (err) {
      console.error('Loyalty load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Stats helpers ──
  const totalPointsIssued = pointsTx.reduce((s, t) => s + Math.max(0, t.points || 0), 0);
  const membersWithPoints = new Set(pointsTx.map(t => t.member_id)).size;

  const tierCounts = { Bronze: 0, Silver: 0, Gold: 0 };
  memberPoints.forEach(m => { tierCounts[tierFor(m.total).name]++; });

  const activeStreaks = streaks.filter(s => s.is_active).length;
  const longestStreak = streaks.length > 0 ? Math.max(...streaks.map(s => s.current_streak || 0)) : 0;

  const totalGCIssued = giftCards.length;
  const totalGCBalance = giftCards.reduce((s, c) => s + Number(c.balance || 0), 0);

  // ── Render ──
  return (
    <div style={S.root}>
      <header style={S.header}>
        <div>
          <h1 style={S.title}>Loyalty & Rewards</h1>
          <p style={S.subtitle}>Manage points, tiers, streaks, gift cards, and vouchers</p>
        </div>
      </header>

      {/* Tab bar */}
      <div style={S.tabs}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            ...S.tab,
            color: tab === t ? '#0f172a' : '#64748b',
            borderBottom: tab === t ? '2px solid #D4A853' : '2px solid transparent',
            fontWeight: tab === t ? 700 : 500,
          }}>{t}</button>
        ))}
      </div>

      {loading ? <p style={{ textAlign: 'center', color: '#94a3b8', padding: '60px 0' }}>Loading...</p> :
        tab === 'Points' ? <PointsTab txns={pointsTx} totalIssued={totalPointsIssued} membersCount={membersWithPoints} onAward={() => setShowAwardModal(true)} /> :
        tab === 'Tiers' ? <TiersTab tierCounts={tierCounts} memberPoints={memberPoints} /> :
        tab === 'Streaks' ? <StreaksTab streaks={streaks} activeCount={activeStreaks} longest={longestStreak} /> :
        tab === 'Gift Cards' ? <GiftCardsTab cards={giftCards} totalIssued={totalGCIssued} totalBalance={totalGCBalance} onCreate={() => setShowGiftModal(true)} /> :
        <VouchersTab vouchers={vouchers} onCreate={() => setShowVoucherModal(true)} />
      }

      {/* Modals */}
      {showAwardModal && <AwardPointsModal members={members} staffId={staff?.id} onDone={() => { setShowAwardModal(false); loadAll(); }} onClose={() => setShowAwardModal(false)} />}
      {showGiftModal && <CreateGiftCardModal staffId={staff?.id} onDone={() => { setShowGiftModal(false); loadAll(); }} onClose={() => setShowGiftModal(false)} />}
      {showVoucherModal && <CreateVoucherModal members={members} staffId={staff?.id} onDone={() => { setShowVoucherModal(false); loadAll(); }} onClose={() => setShowVoucherModal(false)} />}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// Tab content components
// ═════════════════════════════════════════════════════════════════════

function PointsTab({ txns, totalIssued, membersCount, onAward }) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={S.statsRow}>
          <StatCard label="Total points issued" value={totalIssued.toLocaleString()} icon="⭐" />
          <StatCard label="Members with points" value={membersCount} icon="👥" />
        </div>
        <button onClick={onAward} style={S.primaryBtn}>+ Award points</button>
      </div>
      {txns.length === 0 ? <Empty msg="No point transactions yet" /> : (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Member</th>
                <th style={S.th}>Points</th>
                <th style={S.th}>Reason</th>
                <th style={S.th}>Date</th>
              </tr>
            </thead>
            <tbody>
              {txns.map(tx => (
                <tr key={tx.id}>
                  <td style={S.td}>
                    <div style={{ fontWeight: 600 }}>{tx.members?.name || '—'}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{tx.members?.email || ''}</div>
                  </td>
                  <td style={S.td}>
                    <span style={{ fontWeight: 700, color: tx.points > 0 ? '#16a34a' : '#dc2626' }}>
                      {tx.points > 0 ? '+' : ''}{tx.points}
                    </span>
                  </td>
                  <td style={S.td}>{tx.reason || '—'}</td>
                  <td style={{ ...S.td, color: '#64748b', fontSize: '12px' }}>{fmtDate(tx.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function TiersTab({ tierCounts, memberPoints }) {
  const tiers = [
    { name: 'Gold', range: '1,000+', color: '#D4A853', bg: '#fef9ee', icon: '🥇' },
    { name: 'Silver', range: '500 – 999', color: '#94a3b8', bg: '#f1f5f9', icon: '🥈' },
    { name: 'Bronze', range: '0 – 499', color: '#b45309', bg: '#fffbeb', icon: '🥉' },
  ];
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {tiers.map(t => (
          <div key={t.name} style={{ background: t.bg, border: `1.5px solid ${t.color}33`, borderRadius: '14px', padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>{t.icon}</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: t.color }}>{tierCounts[t.name]}</div>
            <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>{t.name}</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{t.range} pts</div>
          </div>
        ))}
      </div>
      {memberPoints.length > 0 && (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Member</th>
                <th style={S.th}>Total Points</th>
                <th style={S.th}>Tier</th>
              </tr>
            </thead>
            <tbody>
              {memberPoints.map(m => {
                const tier = tierFor(m.total);
                return (
                  <tr key={m.member_id}>
                    <td style={S.td}>
                      <div style={{ fontWeight: 600 }}>{m.name}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{m.email}</div>
                    </td>
                    <td style={{ ...S.td, fontWeight: 700 }}>{m.total.toLocaleString()}</td>
                    <td style={S.td}>
                      <span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: '99px', background: tier.bg, color: tier.color, fontWeight: 700, fontSize: '12px', border: `1px solid ${tier.color}33` }}>
                        {tier.name}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function StreaksTab({ streaks, activeCount, longest }) {
  return (
    <>
      <div style={S.statsRow}>
        <StatCard label="Active streaks" value={activeCount} icon="🔥" />
        <StatCard label="Longest streak" value={`${longest} days`} icon="🏆" />
        <StatCard label="Total tracked" value={streaks.length} icon="📊" />
      </div>
      {streaks.length === 0 ? <Empty msg="No reading streaks recorded yet" /> : (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Member</th>
                <th style={S.th}>Current Streak</th>
                <th style={S.th}>Longest Streak</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Last Active</th>
              </tr>
            </thead>
            <tbody>
              {streaks.map(s => (
                <tr key={s.id}>
                  <td style={S.td}>
                    <div style={{ fontWeight: 600 }}>{s.members?.name || '—'}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{s.members?.email || ''}</div>
                  </td>
                  <td style={{ ...S.td, fontWeight: 700 }}>{s.current_streak || 0} days</td>
                  <td style={{ ...S.td, fontWeight: 600, color: '#64748b' }}>{s.longest_streak || 0} days</td>
                  <td style={S.td}>
                    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 700, background: s.is_active ? '#dcfce7' : '#f1f5f9', color: s.is_active ? '#166534' : '#64748b' }}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ ...S.td, fontSize: '12px', color: '#64748b' }}>{fmtDate(s.last_active_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function GiftCardsTab({ cards, totalIssued, totalBalance, onCreate }) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={S.statsRow}>
          <StatCard label="Total issued" value={totalIssued} icon="🎁" />
          <StatCard label="Outstanding balance" value={currency(totalBalance)} icon="💳" />
        </div>
        <button onClick={onCreate} style={S.primaryBtn}>+ Create gift card</button>
      </div>
      {cards.length === 0 ? <Empty msg="No gift cards created yet" /> : (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Code</th>
                <th style={S.th}>Original</th>
                <th style={S.th}>Balance</th>
                <th style={S.th}>Recipient</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Created</th>
              </tr>
            </thead>
            <tbody>
              {cards.map(c => (
                <tr key={c.id}>
                  <td style={S.td}>
                    <span style={S.codePill}>{c.code}</span>
                  </td>
                  <td style={{ ...S.td, fontWeight: 600 }}>{currency(c.original_amount)}</td>
                  <td style={{ ...S.td, fontWeight: 700, color: Number(c.balance) > 0 ? '#16a34a' : '#94a3b8' }}>{currency(c.balance)}</td>
                  <td style={{ ...S.td, fontSize: '12px' }}>{c.recipient_email || '—'}</td>
                  <td style={S.td}>
                    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 700, background: c.status === 'active' ? '#dcfce7' : c.status === 'redeemed' ? '#f1f5f9' : '#fee2e2', color: c.status === 'active' ? '#166534' : c.status === 'redeemed' ? '#64748b' : '#dc2626' }}>
                      {c.status || 'active'}
                    </span>
                  </td>
                  <td style={{ ...S.td, fontSize: '12px', color: '#64748b' }}>{fmtDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function VouchersTab({ vouchers, onCreate }) {
  const totalValue = vouchers.reduce((s, v) => s + Number(v.value || 0), 0);
  const activeCount = vouchers.filter(v => !v.redeemed_at && (!v.expires_at || new Date(v.expires_at) > new Date())).length;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={S.statsRow}>
          <StatCard label="Total vouchers" value={vouchers.length} icon="🎟️" />
          <StatCard label="Active" value={activeCount} icon="✅" />
          <StatCard label="Total value" value={currency(totalValue)} icon="💰" />
        </div>
        <button onClick={onCreate} style={S.primaryBtn}>+ Create voucher</button>
      </div>
      {vouchers.length === 0 ? <Empty msg="No vouchers issued yet" /> : (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Member</th>
                <th style={S.th}>Title</th>
                <th style={S.th}>Value</th>
                <th style={S.th}>Reason</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Expires</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map(v => {
                const expired = v.expires_at && new Date(v.expires_at) < new Date();
                const redeemed = !!v.redeemed_at;
                const status = redeemed ? 'Redeemed' : expired ? 'Expired' : 'Active';
                const statusColor = redeemed ? '#64748b' : expired ? '#dc2626' : '#166534';
                const statusBg = redeemed ? '#f1f5f9' : expired ? '#fee2e2' : '#dcfce7';
                return (
                  <tr key={v.id}>
                    <td style={S.td}>
                      <div style={{ fontWeight: 600 }}>{v.members?.name || '—'}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{v.members?.email || ''}</div>
                    </td>
                    <td style={{ ...S.td, fontWeight: 600 }}>{v.title || '—'}</td>
                    <td style={{ ...S.td, fontWeight: 700 }}>{currency(v.value)}</td>
                    <td style={{ ...S.td, fontSize: '12px', color: '#64748b' }}>{v.reason || '—'}</td>
                    <td style={S.td}>
                      <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 700, background: statusBg, color: statusColor }}>
                        {status}
                      </span>
                    </td>
                    <td style={{ ...S.td, fontSize: '12px', color: '#64748b' }}>{fmtDate(v.expires_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════
// Modals
// ═════════════════════════════════════════════════════════════════════

function AwardPointsModal({ members, staffId, onDone, onClose }) {
  const [form, setForm] = useState({ member_id: '', points: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.member_id || !form.points) return setError('Member and points are required.');
    setSaving(true); setError('');
    try {
      const { error: err } = await supabase.from('loyalty_points').insert({
        member_id: form.member_id,
        points: Number(form.points),
        reason: form.reason || null,
        awarded_by: staffId || null,
      });
      if (err) throw err;
      onDone();
    } catch (err) {
      setError(err.message || 'Failed to award points.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Award Points" onClose={onClose}>
      {error && <div style={S.error}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div style={S.field}>
          <label style={S.label}>Member</label>
          <select value={form.member_id} onChange={e => setForm(f => ({ ...f, member_id: e.target.value }))} style={S.input} required>
            <option value="">Select member...</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.email})</option>)}
          </select>
        </div>
        <div style={S.field}>
          <label style={S.label}>Points</label>
          <input type="number" value={form.points} onChange={e => setForm(f => ({ ...f, points: e.target.value }))}
            placeholder="e.g. 50" style={S.input} required />
        </div>
        <div style={S.field}>
          <label style={S.label}>Reason</label>
          <input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            placeholder="e.g. Book purchase, Reading challenge" style={S.input} />
        </div>
        <div style={S.btnRow}>
          <button type="button" onClick={onClose} style={S.cancelBtn}>Cancel</button>
          <button type="submit" disabled={saving} style={S.primaryBtn}>{saving ? 'Awarding...' : 'Award points'}</button>
        </div>
      </form>
    </Modal>
  );
}

function CreateGiftCardModal({ staffId, onDone, onClose }) {
  const [form, setForm] = useState({ amount: '', recipient_email: '', code: genGiftCode() });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount) return setError('Amount is required.');
    setSaving(true); setError('');
    try {
      const { error: err } = await supabase.from('gift_cards').insert({
        code: form.code,
        original_amount: Number(form.amount),
        balance: Number(form.amount),
        recipient_email: form.recipient_email || null,
        status: 'active',
        created_by: staffId || null,
      });
      if (err) throw err;
      onDone();
    } catch (err) {
      setError(err.message || 'Failed to create gift card.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Create Gift Card" onClose={onClose}>
      {error && <div style={S.error}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div style={S.field}>
          <label style={S.label}>Gift Card Code</label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={S.codePillLarge}>{form.code}</span>
            <button type="button" onClick={() => setForm(f => ({ ...f, code: genGiftCode() }))} style={S.genBtn}>Regenerate</button>
          </div>
        </div>
        <div style={S.field}>
          <label style={S.label}>Amount (₹)</label>
          <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            placeholder="e.g. 500" min="1" style={S.input} required />
        </div>
        <div style={S.field}>
          <label style={S.label}>Recipient Email (optional)</label>
          <input type="email" value={form.recipient_email} onChange={e => setForm(f => ({ ...f, recipient_email: e.target.value }))}
            placeholder="customer@example.com" style={S.input} />
        </div>
        <div style={S.btnRow}>
          <button type="button" onClick={onClose} style={S.cancelBtn}>Cancel</button>
          <button type="submit" disabled={saving} style={S.primaryBtn}>{saving ? 'Creating...' : 'Create card'}</button>
        </div>
      </form>
    </Modal>
  );
}

function CreateVoucherModal({ members, staffId, onDone, onClose }) {
  const [form, setForm] = useState({ member_id: '', title: '', value: '', reason: '', expires_at: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.member_id || !form.value) return setError('Member and value are required.');
    setSaving(true); setError('');
    try {
      const { error: err } = await supabase.from('staff_vouchers').insert({
        member_id: form.member_id,
        title: form.title || null,
        value: Number(form.value),
        reason: form.reason || null,
        expires_at: form.expires_at || null,
        created_by: staffId || null,
      });
      if (err) throw err;
      onDone();
    } catch (err) {
      setError(err.message || 'Failed to create voucher.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Create Voucher" onClose={onClose}>
      {error && <div style={S.error}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div style={S.field}>
          <label style={S.label}>Member</label>
          <select value={form.member_id} onChange={e => setForm(f => ({ ...f, member_id: e.target.value }))} style={S.input} required>
            <option value="">Select member...</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.email})</option>)}
          </select>
        </div>
        <div style={S.formRow}>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Birthday Reward" style={S.input} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Value (₹)</label>
            <input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
              placeholder="100" min="1" style={S.input} required />
          </div>
        </div>
        <div style={S.field}>
          <label style={S.label}>Reason</label>
          <input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            placeholder="e.g. Loyalty appreciation" style={S.input} />
        </div>
        <div style={S.field}>
          <label style={S.label}>Expiry Date (optional)</label>
          <input type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} style={S.input} />
        </div>
        <div style={S.btnRow}>
          <button type="button" onClick={onClose} style={S.cancelBtn}>Cancel</button>
          <button type="submit" disabled={saving} style={S.primaryBtn}>{saving ? 'Creating...' : 'Create voucher'}</button>
        </div>
      </form>
    </Modal>
  );
}

// ═════════════════════════════════════════════════════════════════════
// Shared components
// ═════════════════════════════════════════════════════════════════════

function StatCard({ label, value, icon }) {
  return (
    <div style={S.statCard}>
      <div style={{ fontSize: '24px', marginBottom: '6px' }}>{icon}</div>
      <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{label}</div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <>
      <div onClick={onClose} style={S.backdrop} />
      <div style={S.modal}>
        <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>{title}</h2>
        {children}
      </div>
    </>
  );
}

function Empty({ msg }) {
  return <div style={S.empty}>{msg}</div>;
}

// ═════════════════════════════════════════════════════════════════════
// Styles
// ═════════════════════════════════════════════════════════════════════

const S = {
  root: { padding: '28px 32px 60px', maxWidth: '1100px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' },
  title: { margin: 0, fontSize: '28px', fontWeight: 800, color: '#0f172a' },
  subtitle: { margin: '4px 0 0', fontSize: '13px', color: '#64748b' },
  primaryBtn: { padding: '10px 20px', background: 'linear-gradient(135deg, #D4A853, #C49040)', color: '#1a0f08', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '20px', flex: 1 },
  statCard: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px', textAlign: 'center' },
  tabs: { display: 'flex', gap: '4px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', overflowX: 'auto' },
  tab: { padding: '10px 18px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', marginBottom: '-1px', whiteSpace: 'nowrap' },
  tableWrap: { overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { textAlign: 'left', padding: '10px 14px', background: '#f8fafc', color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '10px 14px', borderBottom: '1px solid #f1f5f9', color: '#0f172a' },
  codePill: { display: 'inline-block', padding: '2px 10px', borderRadius: '6px', background: '#f1f5f9', fontFamily: 'ui-monospace, monospace', fontSize: '12px', fontWeight: 700, color: '#0f172a', letterSpacing: '1px' },
  codePillLarge: { display: 'inline-block', padding: '6px 16px', borderRadius: '8px', background: '#0f172a', fontFamily: 'ui-monospace, monospace', fontSize: '18px', fontWeight: 800, color: '#D4A853', letterSpacing: '2px' },
  empty: { padding: '60px 20px', textAlign: 'center', color: '#64748b', fontSize: '14px' },
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', zIndex: 100 },
  modal: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', zIndex: 101, boxShadow: '0 25px 60px rgba(0,0,0,0.25)' },
  error: { background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#dc2626', fontSize: '13px', fontWeight: 600 },
  field: { marginBottom: '16px' },
  formRow: { display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'flex-end' },
  label: { display: 'block', fontSize: '10px', fontWeight: 700, color: '#64748b', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '6px' },
  input: { width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', color: '#0f172a', background: 'white', boxSizing: 'border-box' },
  genBtn: { padding: '10px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', fontFamily: 'inherit' },
  cancelBtn: { flex: 1, padding: '12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#475569', fontFamily: 'inherit' },
  btnRow: { display: 'flex', gap: '10px', marginTop: '24px' },
};
