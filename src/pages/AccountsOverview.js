import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';

const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

const PERIODS = [
  { key: 'month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'quarter', label: 'This Quarter' },
  { key: 'year', label: 'This Year' },
  { key: 'custom', label: 'Custom' },
];

function getPeriodDates(period, customStart, customEnd) {
  const now = new Date();
  let start, end;
  switch (period) {
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case 'quarter':
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), qMonth, 1);
      end = now;
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      end = now;
      break;
    case 'custom':
      start = customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), 1);
      end = customEnd ? new Date(customEnd) : now;
      break;
    default: // month
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = now;
  }
  return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
}

function getPrevPeriodDates(period, customStart, customEnd) {
  const { start, end } = getPeriodDates(period, customStart, customEnd);
  const s = new Date(start), e = new Date(end);
  const diff = e - s;
  const prevEnd = new Date(s.getTime() - 86400000);
  const prevStart = new Date(prevEnd.getTime() - diff);
  return { start: prevStart.toISOString().split('T')[0], end: prevEnd.toISOString().split('T')[0] };
}

export default function AccountsOverview() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [data, setData] = useState(null);
  const [prevData, setPrevData] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [weeklyFlow, setWeeklyFlow] = useState([]);
  const [topExpCats, setTopExpCats] = useState([]);

  const gstRates = JSON.parse(localStorage.getItem('gst_rates') || '{"books":0,"cafe":5,"services":18}');
  const [showGstEditor, setShowGstEditor] = useState(false);
  const [gstForm, setGstForm] = useState(gstRates);

  const fetchPeriodData = useCallback(async (startDate, endDate) => {
    const safeQuery = (promise) => promise.then(r => r).catch(() => ({ data: [] }));

    const [salesR, posR, cafeR, eventR, finesR, expR, memberR] = await Promise.all([
      safeQuery(supabase.from('sales').select('total_amount').gte('sale_date', startDate).lte('sale_date', endDate).eq('status', 'completed')),
      safeQuery(supabase.from('pos_transactions').select('total_amount').gte('created_at', startDate + 'T00:00:00').lte('created_at', endDate + 'T23:59:59')),
      safeQuery(supabase.from('cafe_orders').select('total_amount').gte('created_at', startDate + 'T00:00:00').lte('created_at', endDate + 'T23:59:59').eq('status', 'completed')),
      safeQuery(supabase.from('event_registrations').select('amount_paid').gte('registration_date', startDate + 'T00:00:00').lte('registration_date', endDate + 'T23:59:59').neq('status', 'cancelled')),
      safeQuery(supabase.from('circulation').select('fine_amount').eq('fine_paid', true).gte('return_date', startDate).lte('return_date', endDate)),
      safeQuery(supabase.from('cafe_expenses').select('amount, category').gte('expense_date', startDate).lte('expense_date', endDate)),
      safeQuery(supabase.from('members').select('plan_price').not('plan', 'is', null).gte('subscription_start', startDate).lte('subscription_start', endDate)),
    ]);

    const sum = (arr, field) => (arr?.data || []).reduce((s, r) => s + (r[field] || 0), 0);
    const libRevenue = Math.max(sum(salesR, 'total_amount'), sum(posR, 'total_amount'));
    const cafeRevenue = sum(cafeR, 'total_amount');
    const eventRevenue = sum(eventR, 'amount_paid');
    const finesCollected = sum(finesR, 'fine_amount');
    const membershipRevenue = sum(memberR, 'plan_price');
    const totalExpenses = sum(expR, 'amount');
    const totalIncome = libRevenue + cafeRevenue + eventRevenue + finesCollected + membershipRevenue;

    // GST calculation
    const gstAmount = Math.round(
      libRevenue * (gstRates.books / 100) +
      cafeRevenue * (gstRates.cafe / 100) +
      (eventRevenue + finesCollected + membershipRevenue) * (gstRates.services / 100)
    );

    // Expense categories
    const cats = {};
    (expR?.data || []).forEach(e => { cats[e.category || 'other'] = (cats[e.category || 'other'] || 0) + (e.amount || 0); });

    return { libRevenue, cafeRevenue, eventRevenue, finesCollected, membershipRevenue, totalExpenses, totalIncome, gstAmount, expenseCategories: cats };
  }, [gstRates]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getPeriodDates(period, customStart, customEnd);
      const { start: prevStart, end: prevEnd } = getPrevPeriodDates(period, customStart, customEnd);

      const [current, previous] = await Promise.all([
        fetchPeriodData(start, end),
        fetchPeriodData(prevStart, prevEnd),
      ]);
      setData(current);
      setPrevData(previous);
      setTopExpCats(Object.entries(current.expenseCategories).sort((a, b) => b[1] - a[1]).slice(0, 5));

      // Monthly trend (last 6 months)
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const mStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
        const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
        months.push({ label: d.toLocaleDateString('en-IN', { month: 'short' }), start: mStart, end: mEnd });
      }
      const monthlyResults = await Promise.all(months.map(async m => {
        const [salesR, expR] = await Promise.all([
          supabase.from('pos_transactions').select('total_amount').gte('created_at', m.start + 'T00:00:00').lte('created_at', m.end + 'T23:59:59').then(r => r).catch(() => ({ data: [] })),
          supabase.from('cafe_expenses').select('amount').gte('expense_date', m.start).lte('expense_date', m.end).then(r => r).catch(() => ({ data: [] })),
        ]);
        return {
          month: m.label,
          income: (salesR?.data || []).reduce((s, r) => s + (r.total_amount || 0), 0),
          expense: (expR?.data || []).reduce((s, r) => s + (r.amount || 0), 0),
        };
      }));
      setMonthlyData(monthlyResults);

      // Weekly cash flow (last 4 weeks)
      const weeks = [];
      for (let w = 3; w >= 0; w--) {
        const wEnd = new Date(); wEnd.setDate(wEnd.getDate() - w * 7);
        const wStart = new Date(wEnd); wStart.setDate(wStart.getDate() - 6);
        weeks.push({ label: `W${4 - w}`, start: wStart.toISOString().split('T')[0], end: wEnd.toISOString().split('T')[0] });
      }
      const weeklyResults = await Promise.all(weeks.map(async w => {
        const [incR, expR] = await Promise.all([
          supabase.from('pos_transactions').select('total_amount').gte('created_at', w.start + 'T00:00:00').lte('created_at', w.end + 'T23:59:59').then(r => r).catch(() => ({ data: [] })),
          supabase.from('cafe_expenses').select('amount').gte('expense_date', w.start).lte('expense_date', w.end).then(r => r).catch(() => ({ data: [] })),
        ]);
        return {
          label: w.label,
          inflow: (incR?.data || []).reduce((s, r) => s + (r.total_amount || 0), 0),
          outflow: (expR?.data || []).reduce((s, r) => s + (r.amount || 0), 0),
        };
      }));
      setWeeklyFlow(weeklyResults);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [period, customStart, customEnd, fetchPeriodData]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const pctChange = (curr, prev) => {
    if (!prev || prev === 0) return curr > 0 ? '+100%' : '—';
    const pct = Math.round(((curr - prev) / prev) * 100);
    return pct >= 0 ? `+${pct}%` : `${pct}%`;
  };

  const maxMonthly = Math.max(...monthlyData.map(m => Math.max(m.income, m.expense)), 1);
  const maxWeekly = Math.max(...weeklyFlow.map(w => Math.max(w.inflow, w.outflow)), 1);

  const netProfit = data ? data.totalIncome - data.totalExpenses - data.gstAmount : 0;

  return (
    <div style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', margin: '0 0 4px' }}>📊 Financial Overview</h1>
          <p style={{ color: '#999', fontSize: '13px', margin: 0 }}>Complete revenue, expenses & cash flow dashboard</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => setShowGstEditor(!showGstEditor)}
            style={{ padding: '6px 12px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
            title="GST Settings">⚙️ GST</button>
          <button onClick={fetchAll} disabled={loading}
            style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
            {loading ? '⏳' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {/* GST Editor */}
      {showGstEditor && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '16px', marginBottom: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#92400e' }}>GST Rates:</span>
          {[{ key: 'books', label: 'Books' }, { key: 'cafe', label: 'Cafe' }, { key: 'services', label: 'Services' }].map(g => (
            <div key={g.key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '12px', color: '#666' }}>{g.label}:</span>
              <input type="number" value={gstForm[g.key]} min="0" max="100"
                onChange={e => setGstForm(f => ({ ...f, [g.key]: parseFloat(e.target.value) || 0 }))}
                style={{ width: '50px', padding: '4px 6px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '12px', textAlign: 'center' }} />
              <span style={{ fontSize: '11px', color: '#999' }}>%</span>
            </div>
          ))}
          <button onClick={() => { localStorage.setItem('gst_rates', JSON.stringify(gstForm)); setShowGstEditor(false); fetchAll(); }}
            style={{ padding: '6px 14px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
            Save
          </button>
        </div>
      )}

      {/* Period selector */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'white', padding: '4px', borderRadius: '10px', width: 'fit-content', flexWrap: 'wrap' }}>
        {PERIODS.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)} style={{
            padding: '7px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer',
            fontSize: '12px', fontWeight: '600',
            background: period === p.key ? '#667eea' : 'transparent',
            color: period === p.key ? 'white' : '#666',
          }}>{p.label}</button>
        ))}
        {period === 'custom' && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: '8px' }}>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              style={{ padding: '5px 8px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '12px' }} />
            <span style={{ color: '#999' }}>→</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              style={{ padding: '5px 8px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '12px' }} />
          </div>
        )}
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>Loading financial data...</div> : data && (
        <>
          {/* Revenue cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'Library / POS', val: data.libRevenue, prev: prevData?.libRevenue, color: '#667eea', icon: '📚' },
              { label: 'Cafe', val: data.cafeRevenue, prev: prevData?.cafeRevenue, color: '#1dd1a1', icon: '☕' },
              { label: 'Events', val: data.eventRevenue, prev: prevData?.eventRevenue, color: '#9b59b6', icon: '🎉' },
              { label: 'Fines', val: data.finesCollected, prev: prevData?.finesCollected, color: '#f39c12', icon: '⚠️' },
              { label: 'Memberships', val: data.membershipRevenue, prev: prevData?.membershipRevenue, color: '#06b6d4', icon: '💳' },
              { label: 'Expenses', val: data.totalExpenses, prev: prevData?.totalExpenses, color: '#ef4444', icon: '📤' },
            ].map(m => {
              const change = pctChange(m.val, m.prev);
              const isUp = change.startsWith('+');
              return (
                <div key={m.label} style={{ background: 'white', padding: '16px', borderRadius: '10px', borderTop: `3px solid ${m.color}`, position: 'relative' }}>
                  <div style={{ fontSize: '11px', color: '#999', marginBottom: '6px' }}>{m.icon} {m.label.toUpperCase()}</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: m.color }}>{fmt(m.val)}</div>
                  {prevData && (
                    <div style={{ fontSize: '11px', fontWeight: '600', marginTop: '4px', color: m.label === 'Expenses' ? (isUp ? '#ef4444' : '#059669') : (isUp ? '#059669' : '#ef4444') }}>
                      {change} vs prev
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Big Net Profit + GST row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: 'white', borderRadius: '10px', padding: '20px', textAlign: 'center', gridColumn: 'span 1', border: `2px solid ${netProfit >= 0 ? '#d1fae5' : '#fecaca'}` }}>
              <div style={{ fontSize: '11px', color: '#999', fontWeight: '600' }}>TOTAL INCOME</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: '#059669' }}>{fmt(data.totalIncome)}</div>
            </div>
            <div style={{ background: 'white', borderRadius: '10px', padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#999', fontWeight: '600' }}>GST LIABILITY</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: '#f59e0b' }}>{fmt(data.gstAmount)}</div>
              <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>Books {gstRates.books}% · Cafe {gstRates.cafe}% · Services {gstRates.services}%</div>
            </div>
            <div style={{ background: netProfit >= 0 ? '#ecfdf5' : '#fef2f2', borderRadius: '10px', padding: '20px', textAlign: 'center', border: `2px solid ${netProfit >= 0 ? '#a7f3d0' : '#fecaca'}` }}>
              <div style={{ fontSize: '11px', color: '#999', fontWeight: '600' }}>NET PROFIT</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: netProfit >= 0 ? '#059669' : '#dc2626' }}>{fmt(netProfit)}</div>
            </div>
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            {/* Monthly trend with income + expense overlay */}
            <div style={{ background: 'white', borderRadius: '10px', padding: '20px' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: '700' }}>📈 Monthly Trend (6 months)</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '140px' }}>
                {monthlyData.map((m, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                    <div style={{ fontSize: '9px', color: '#059669', fontWeight: '600' }}>{m.income > 0 ? `₹${m.income}` : ''}</div>
                    <div style={{ width: '100%', display: 'flex', gap: '2px', alignItems: 'flex-end', justifyContent: 'center' }}>
                      <div style={{ width: '45%', borderRadius: '3px 3px 0 0', background: '#667eea', height: `${Math.max(2, (m.income / maxMonthly) * 100)}px` }} title={`Income: ₹${m.income}`} />
                      <div style={{ width: '45%', borderRadius: '3px 3px 0 0', background: '#ef4444', opacity: 0.6, height: `${Math.max(2, (m.expense / maxMonthly) * 100)}px` }} title={`Expense: ₹${m.expense}`} />
                    </div>
                    <div style={{ fontSize: '10px', color: '#999' }}>{m.month}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '8px' }}>
                <span style={{ fontSize: '10px', color: '#667eea' }}>● Income</span>
                <span style={{ fontSize: '10px', color: '#ef4444' }}>● Expenses</span>
              </div>
            </div>

            {/* Weekly cash flow */}
            <div style={{ background: 'white', borderRadius: '10px', padding: '20px' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: '700' }}>💸 Weekly Cash Flow</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {weeklyFlow.map((w, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                      <span style={{ fontWeight: '600', color: '#374151' }}>{w.label}</span>
                      <span style={{ color: (w.inflow - w.outflow) >= 0 ? '#059669' : '#dc2626', fontWeight: '600' }}>Net: {fmt(w.inflow - w.outflow)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', height: '12px' }}>
                      <div style={{ background: '#667eea', borderRadius: '3px', width: `${Math.max(2, (w.inflow / maxWeekly) * 100)}%`, transition: 'width 0.3s' }} title={`In: ₹${w.inflow}`} />
                      <div style={{ background: '#ef4444', opacity: 0.5, borderRadius: '3px', width: `${Math.max(2, (w.outflow / maxWeekly) * 100)}%`, transition: 'width 0.3s' }} title={`Out: ₹${w.outflow}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Revenue breakdown + Top expenses */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div style={{ background: 'white', borderRadius: '10px', padding: '20px' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: '700' }}>💰 Revenue Breakdown</h3>
              {[
                { label: 'Library/POS', val: data.libRevenue, color: '#667eea' },
                { label: 'Cafe', val: data.cafeRevenue, color: '#1dd1a1' },
                { label: 'Events', val: data.eventRevenue, color: '#9b59b6' },
                { label: 'Fines', val: data.finesCollected, color: '#f39c12' },
                { label: 'Memberships', val: data.membershipRevenue, color: '#06b6d4' },
              ].map(item => {
                const pct = data.totalIncome > 0 ? Math.round((item.val / data.totalIncome) * 100) : 0;
                return (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                    <div style={{ fontSize: '12px', color: '#555', width: '90px' }}>{item.label}</div>
                    <div style={{ flex: 1, height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: item.color, width: `${pct}%`, borderRadius: '4px' }} />
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: item.color, minWidth: '70px', textAlign: 'right' }}>{fmt(item.val)}</div>
                    <div style={{ fontSize: '10px', color: '#999', minWidth: '30px', textAlign: 'right' }}>{pct}%</div>
                  </div>
                );
              })}
            </div>

            <div style={{ background: 'white', borderRadius: '10px', padding: '20px' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: '700' }}>📤 Top Expense Categories</h3>
              {topExpCats.length === 0 ? (
                <div style={{ color: '#d1d5db', textAlign: 'center', padding: '20px' }}>No expenses recorded</div>
              ) : topExpCats.map(([cat, val]) => {
                const maxExp = topExpCats[0]?.[1] || 1;
                return (
                  <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#555', width: '90px', textTransform: 'capitalize' }}>{cat}</div>
                    <div style={{ flex: 1, height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#ef4444', width: `${(val / maxExp) * 100}%`, borderRadius: '4px', opacity: 0.7 }} />
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#ef4444', minWidth: '70px', textAlign: 'right' }}>{fmt(val)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick links */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            {[
              { label: 'P&L Statement', icon: '📑', path: '/accounts/pnl', color: '#667eea' },
              { label: 'All Transactions', icon: '🧾', path: '/accounts/transactions', color: '#06b6d4' },
              { label: 'Invoices', icon: '🧾', path: '/accounts/invoices', color: '#8b5cf6' },
              { label: 'Expenses', icon: '📤', path: '/accounts/expenses', color: '#ef4444' },
              { label: 'Member Payments', icon: '💳', path: '/accounts/member-payments', color: '#059669' },
              { label: 'Vendor Payments', icon: '🏪', path: '/accounts/vendor-payments', color: '#f59e0b' },
            ].map(link => (
              <button key={link.path} onClick={() => navigate(link.path)}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#374151', transition: 'all 0.15s', textAlign: 'left' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = link.color; e.currentTarget.style.background = link.color + '08'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = 'white'; }}
              >
                <span style={{ fontSize: '20px' }}>{link.icon}</span>
                <span>{link.label}</span>
                <span style={{ marginLeft: 'auto', color: '#d1d5db' }}>→</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
