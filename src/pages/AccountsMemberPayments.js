import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

const PLANS = ['basic', 'premium', 'gold', 'family', 'student', 'teen', 'day_pass'];
const PLAN_COLORS = {
  basic: '#667eea', premium: '#9b59b6', gold: '#f39c12', family: '#1dd1a1',
  student: '#3498db', teen: '#e67e22', day_pass: '#95a5a6',
};
const STATUS_STYLES = {
  active: { bg: '#d4edda', color: '#155724', label: 'Active' },
  expiring: { bg: '#fff3cd', color: '#856404', label: 'Expiring Soon' },
  expired: { bg: '#f8d7da', color: '#721c24', label: 'Expired' },
  guest: { bg: '#e2e3e5', color: '#383d41', label: 'Guest' },
};

const card = {
  background: 'white', borderRadius: '12px', padding: '20px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
};

export default function AccountsMemberPayments() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthlyTrend, setMonthlyTrend] = useState([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [membersResult] = await Promise.all([
        supabase.from('members').select('*').order('subscription_end', { ascending: true }),
      ]);
      const rows = membersResult.data || [];
      setMembers(rows);

      // Monthly trend: new subscriptions per month (last 6 months)
      const monthMap = {};
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      rows.forEach(m => {
        if (!m.subscription_start) return;
        const key = m.subscription_start.slice(0, 7);
        if (key >= sixMonthsAgo.toISOString().slice(0, 7)) {
          monthMap[key] = (monthMap[key] || 0) + 1;
        }
      });
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = d.toISOString().slice(0, 7);
        months.push({
          month: d.toLocaleDateString('en-IN', { month: 'short' }),
          count: monthMap[key] || 0,
        });
      }
      setMonthlyTrend(months);
    } catch (err) {
      console.error('Error fetching member payments:', err);
    }
    setLoading(false);
  };

  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 86400000);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const getEffectiveStatus = (m) => {
    if (m.status === 'guest') return 'guest';
    if (m.status === 'expired') return 'expired';
    if (!m.subscription_end) return m.status || 'active';
    const end = new Date(m.subscription_end);
    if (end < now) return 'expired';
    if (end <= sevenDaysLater) return 'expiring';
    return 'active';
  };

  // Stats
  const totalMembers = members.length;
  const activeMembers = members.filter(m => getEffectiveStatus(m) === 'active' || getEffectiveStatus(m) === 'expiring');
  const activeSubs = activeMembers.length;
  const totalRevenue = activeMembers.reduce((s, m) => s + (m.plan_price || 0), 0);
  const expiringThisMonth = members.filter(m => {
    if (!m.subscription_end) return false;
    const end = new Date(m.subscription_end);
    return end >= now && end <= monthEnd;
  }).length;

  // Revenue by plan
  const planBreakdown = PLANS.map(plan => {
    const planMembers = members.filter(m => m.plan === plan && (getEffectiveStatus(m) === 'active' || getEffectiveStatus(m) === 'expiring'));
    return {
      plan,
      count: planMembers.length,
      revenue: planMembers.reduce((s, m) => s + (m.plan_price || 0), 0),
    };
  }).filter(p => p.count > 0);

  // Filtered members
  const filtered = members.filter(m => {
    if (planFilter !== 'all' && m.plan !== planFilter) return false;
    if (statusFilter !== 'all' && getEffectiveStatus(m) !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(m.name || '').toLowerCase().includes(q) && !(m.phone || '').includes(q)) return false;
    }
    return true;
  });

  // Expiring soon members
  const expiringSoon = members.filter(m => getEffectiveStatus(m) === 'expiring');

  const maxTrend = Math.max(...monthlyTrend.map(m => m.count), 1);

  return (
    <div style={{ padding: '20px' }}>
      <style>{`
        @media (max-width: 768px) {
          .mp-stats { grid-template-columns: repeat(2, 1fr) !important; }
          .mp-plans { grid-template-columns: repeat(2, 1fr) !important; }
          .mp-table-wrap { overflow-x: auto; }
          .mp-bottom { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .mp-stats { grid-template-columns: 1fr !important; gap: 8px !important; }
          .mp-plans { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <h1 style={{ fontSize: '28px', marginBottom: '20px' }}>💳 Member Payments</h1>

      {loading ? <p style={{ color: '#999' }}>Loading...</p> : (
        <>
          {/* Stats Cards */}
          <div className="mp-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
            {[
              { label: 'Total Members', val: totalMembers, color: '#667eea', icon: '👥' },
              { label: 'Active Subscriptions', val: activeSubs, color: '#1dd1a1', icon: '✅' },
              { label: 'Membership Revenue', val: `₹${totalRevenue.toLocaleString('en-IN')}`, color: '#9b59b6', icon: '💰' },
              { label: 'Expiring This Month', val: expiringThisMonth, color: expiringThisMonth > 0 ? '#e74c3c' : '#95a5a6', icon: '⏰' },
            ].map(s => (
              <div key={s.label} style={{ ...card, textAlign: 'center', borderTop: `3px solid ${s.color}` }}>
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>{s.icon}</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: s.color }}>{s.val}</div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Revenue by Plan */}
          <div style={{ ...card, marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: '700' }}>📊 Revenue by Plan</h3>
            {planBreakdown.length === 0 ? (
              <p style={{ color: '#999', fontSize: '14px' }}>No active plan data available.</p>
            ) : (
              <div className="mp-plans" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(planBreakdown.length, 4)}, 1fr)`, gap: '10px' }}>
                {planBreakdown.map(p => (
                  <div key={p.plan} style={{
                    background: `${PLAN_COLORS[p.plan]}15`,
                    border: `1px solid ${PLAN_COLORS[p.plan]}40`,
                    borderRadius: '10px', padding: '14px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: PLAN_COLORS[p.plan], textTransform: 'capitalize', marginBottom: '6px' }}>
                      {p.plan.replace('_', ' ')}
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#333' }}>₹{p.revenue.toLocaleString('en-IN')}</div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{p.count} member{p.count !== 1 ? 's' : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expiring Soon Alert */}
          {expiringSoon.length > 0 && (
            <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>⚠️</span>
              <div>
                <strong style={{ color: '#856404' }}>{expiringSoon.length} member{expiringSoon.length !== 1 ? 's' : ''} expiring within 7 days:</strong>
                <span style={{ color: '#856404', marginLeft: '8px' }}>
                  {expiringSoon.slice(0, 5).map(m => m.name).join(', ')}{expiringSoon.length > 5 ? ` +${expiringSoon.length - 5} more` : ''}
                </span>
              </div>
            </div>
          )}

          {/* Filters */}
          <div style={{ ...card, marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Search name or phone..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ padding: '8px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', minWidth: '200px' }}
              />
              <select value={planFilter} onChange={e => setPlanFilter(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}>
                <option value="all">All Plans</option>
                {PLANS.map(p => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}>
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="expiring">Expiring Soon</option>
                <option value="expired">Expired</option>
                <option value="guest">Guest</option>
              </select>
              <span style={{ fontSize: '13px', color: '#888' }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Members Table */}
            <div className="mp-table-wrap">
              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#999' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
                  <p>No members found matching your filters.</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #eee' }}>
                      {['Name', 'Phone', 'Plan', 'Price', 'Start', 'End', 'Status'].map(h => (
                        <th key={h} style={{ padding: '10px 8px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: '600', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(m => {
                      const es = getEffectiveStatus(m);
                      const st = STATUS_STYLES[es] || STATUS_STYLES.active;
                      return (
                        <tr key={m.id} style={{ borderBottom: '1px solid #f0f0f0', background: es === 'expiring' ? '#fffbeb' : 'transparent' }}>
                          <td style={{ padding: '10px 8px', fontWeight: '500' }}>{m.name || '—'}</td>
                          <td style={{ padding: '10px 8px', color: '#555' }}>{m.phone || '—'}</td>
                          <td style={{ padding: '10px 8px' }}>
                            <span style={{ background: `${PLAN_COLORS[m.plan] || '#667eea'}20`, color: PLAN_COLORS[m.plan] || '#667eea', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: '600', textTransform: 'capitalize' }}>
                              {(m.plan || '—').replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ padding: '10px 8px', fontWeight: '600' }}>₹{(m.plan_price || 0).toLocaleString('en-IN')}</td>
                          <td style={{ padding: '10px 8px', color: '#555', fontSize: '13px' }}>{m.subscription_start ? new Date(m.subscription_start).toLocaleDateString('en-IN') : '—'}</td>
                          <td style={{ padding: '10px 8px', color: '#555', fontSize: '13px' }}>{m.subscription_end ? new Date(m.subscription_end).toLocaleDateString('en-IN') : '—'}</td>
                          <td style={{ padding: '10px 8px' }}>
                            <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '600' }}>{st.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Monthly Trend Bar Chart */}
          <div className="mp-bottom" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
            <div style={card}>
              <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: '700' }}>📈 New Subscriptions (Last 6 Months)</h3>
              {monthlyTrend.every(m => m.count === 0) ? (
                <p style={{ color: '#999', fontSize: '14px' }}>No subscription data for the last 6 months.</p>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '140px' }}>
                  {monthlyTrend.map((m, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <div style={{ fontSize: '12px', color: '#667eea', fontWeight: '700' }}>{m.count > 0 ? m.count : ''}</div>
                      <div style={{
                        width: '100%', maxWidth: '60px', borderRadius: '6px 6px 0 0',
                        background: i === monthlyTrend.length - 1 ? '#667eea' : '#c7d2fe',
                        height: `${Math.max(4, (m.count / maxTrend) * 110)}px`,
                        transition: 'height 0.3s',
                      }} />
                      <div style={{ fontSize: '12px', color: '#888' }}>{m.month}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
