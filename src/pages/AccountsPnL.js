import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';

const EXP_CATEGORIES = ['ingredients', 'equipment', 'utilities', 'rent', 'salary', 'maintenance', 'marketing', 'other'];

const DEFAULT_GST = { books: 0, cafe: 5, services: 18 };

function getGstRates() {
  try {
    const raw = localStorage.getItem('gst_rate');
    if (raw) return { ...DEFAULT_GST, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_GST };
}

function saveGstRates(rates) {
  localStorage.setItem('gst_rate', JSON.stringify(rates));
}

function getPeriodDates(period, customStart, customEnd) {
  const now = new Date();
  let start, end;
  if (period === 'this_month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else if (period === 'last_month') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 0);
  } else if (period === 'this_quarter') {
    const qStart = Math.floor(now.getMonth() / 3) * 3;
    start = new Date(now.getFullYear(), qStart, 1);
    end = new Date(now.getFullYear(), qStart + 3, 0);
  } else if (period === 'this_year') {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear(), 11, 31);
  } else if (period === 'custom') {
    start = customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), 1);
    end = customEnd ? new Date(customEnd) : now;
  }
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

function getPreviousPeriodDates(period, customStart, customEnd) {
  const now = new Date();
  let start, end;
  if (period === 'this_month') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 0);
  } else if (period === 'last_month') {
    start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    end = new Date(now.getFullYear(), now.getMonth() - 1, 0);
  } else if (period === 'this_quarter') {
    const qStart = Math.floor(now.getMonth() / 3) * 3;
    start = new Date(now.getFullYear(), qStart - 3, 1);
    end = new Date(now.getFullYear(), qStart, 0);
  } else if (period === 'this_year') {
    start = new Date(now.getFullYear() - 1, 0, 1);
    end = new Date(now.getFullYear() - 1, 11, 31);
  } else if (period === 'custom') {
    const s = customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), 1);
    const e = customEnd ? new Date(customEnd) : now;
    const diff = e.getTime() - s.getTime();
    end = new Date(s.getTime() - 1);
    start = new Date(end.getTime() - diff);
  }
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

function pctChange(current, previous) {
  if (!previous || previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function formatINR(n) {
  return '₹' + (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function fetchPeriodData(startDate, endDate) {
  const income = { librarySales: 0, cafeSales: 0, membershipFees: 0, eventRevenue: 0, finesCollected: 0 };
  const expenses = {};
  EXP_CATEGORIES.forEach(c => { expenses[c] = 0; });

  const results = await Promise.allSettled([
    // Library sales: try pos_transactions first, fall back to sales
    supabase.from('pos_transactions').select('total_amount').gte('created_at', startDate + 'T00:00:00').lte('created_at', endDate + 'T23:59:59'),
    supabase.from('sales').select('total_amount').gte('sale_date', startDate).lte('sale_date', endDate).eq('status', 'completed'),
    // Cafe sales
    supabase.from('cafe_orders').select('total_amount').gte('created_at', startDate + 'T00:00:00').lte('created_at', endDate + 'T23:59:59').eq('status', 'completed'),
    // Membership fees
    supabase.from('members').select('plan_price').gte('subscription_start', startDate).lte('subscription_start', endDate),
    // Event revenue
    supabase.from('event_registrations').select('amount_paid').gte('registration_date', startDate + 'T00:00:00').lte('registration_date', endDate + 'T23:59:59').neq('status', 'cancelled'),
    // Fines collected
    supabase.from('circulation').select('fine_amount').eq('fine_paid', true).gte('return_date', startDate).lte('return_date', endDate),
    // Expenses
    supabase.from('cafe_expenses').select('category, amount').gte('expense_date', startDate).lte('expense_date', endDate),
  ]);

  // Library sales: use pos_transactions if available, otherwise sales
  const posResult = results[0];
  const salesResult = results[1];
  if (posResult.status === 'fulfilled' && posResult.value.data && posResult.value.data.length > 0) {
    income.librarySales = posResult.value.data.reduce((s, r) => s + (r.total_amount || 0), 0);
  } else if (salesResult.status === 'fulfilled' && salesResult.value.data) {
    income.librarySales = salesResult.value.data.reduce((s, r) => s + (r.total_amount || 0), 0);
  }

  // Cafe
  if (results[2].status === 'fulfilled' && results[2].value.data) {
    income.cafeSales = results[2].value.data.reduce((s, r) => s + (r.total_amount || 0), 0);
  }
  // Membership
  if (results[3].status === 'fulfilled' && results[3].value.data) {
    income.membershipFees = results[3].value.data.reduce((s, r) => s + (r.plan_price || 0), 0);
  }
  // Events
  if (results[4].status === 'fulfilled' && results[4].value.data) {
    income.eventRevenue = results[4].value.data.reduce((s, r) => s + (r.amount_paid || 0), 0);
  }
  // Fines
  if (results[5].status === 'fulfilled' && results[5].value.data) {
    income.finesCollected = results[5].value.data.reduce((s, r) => s + (r.fine_amount || 0), 0);
  }
  // Expenses by category
  if (results[6].status === 'fulfilled' && results[6].value.data) {
    results[6].value.data.forEach(e => {
      const cat = EXP_CATEGORIES.includes(e.category) ? e.category : 'other';
      expenses[cat] += (e.amount || 0);
    });
  }

  return { income, expenses };
}

/* ---------- styles ---------- */
const card = {
  background: 'white', borderRadius: '12px', padding: '24px',
  marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
};
const sectionTitle = {
  fontSize: '13px', fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '1px', color: '#667eea', marginBottom: '12px',
  borderBottom: '2px solid #667eea', paddingBottom: '6px',
};
const row = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '8px 0', borderBottom: '1px solid #f0f0f0',
};
const indent = { paddingLeft: '24px' };
const labelStyle = { fontSize: '14px', color: '#555' };
const valStyle = { fontSize: '14px', fontWeight: 500, fontFamily: 'monospace', color: '#333' };
const totalRow = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '10px 0', borderTop: '2px solid #333', marginTop: '4px',
};
const btnBase = {
  padding: '8px 16px', border: 'none', borderRadius: '8px',
  cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'opacity .15s',
};
const periodBtn = (active) => ({
  ...btnBase,
  background: active ? '#667eea' : '#f0f0f0',
  color: active ? 'white' : '#555',
});

function ChangeIndicator({ value }) {
  if (value === 0 || isNaN(value)) return <span style={{ fontSize: '11px', color: '#999', marginLeft: '8px' }}>--</span>;
  const up = value > 0;
  return (
    <span style={{ fontSize: '11px', fontWeight: 600, marginLeft: '8px', color: up ? '#27ae60' : '#e74c3c' }}>
      {up ? '▲' : '▼'} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export default function AccountsPnL() {
  const [period, setPeriod] = useState('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(null);
  const [previous, setPrevious] = useState(null);
  const [showGst, setShowGst] = useState(false);
  const [gstRates, setGstRates] = useState(getGstRates);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const dates = getPeriodDates(period, customStart, customEnd);
      const prevDates = getPreviousPeriodDates(period, customStart, customEnd);
      const [cur, prev] = await Promise.all([
        fetchPeriodData(dates.start, dates.end),
        fetchPeriodData(prevDates.start, prevDates.end),
      ]);
      setCurrent(cur);
      setPrevious(prev);
    } catch (err) {
      console.error('PnL fetch error:', err);
    }
    setLoading(false);
  }, [period, customStart, customEnd]);

  useEffect(() => { load(); }, [load]);

  if (loading || !current) {
    return (
      <div style={{ padding: '20px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>Profit & Loss Statement</h1>
        <p style={{ color: '#999' }}>Loading financial data...</p>
      </div>
    );
  }

  const { income, expenses } = current;
  const prevIncome = previous?.income || {};
  const prevExpenses = previous?.expenses || {};

  const totalIncome = Object.values(income).reduce((s, v) => s + v, 0);
  const totalExp = Object.values(expenses).reduce((s, v) => s + v, 0);
  const prevTotalIncome = Object.values(prevIncome).reduce((s, v) => s + v, 0);
  const prevTotalExp = Object.values(prevExpenses).reduce((s, v) => s + v, 0);

  const grossProfit = totalIncome - totalExp;
  const prevGrossProfit = prevTotalIncome - prevTotalExp;

  // GST calculation: apply category-specific rates
  const gstOnBooks = (income.librarySales || 0) * (gstRates.books / 100);
  const gstOnCafe = (income.cafeSales || 0) * (gstRates.cafe / 100);
  const gstOnServices = ((income.membershipFees || 0) + (income.eventRevenue || 0)) * (gstRates.services / 100);
  const totalGst = gstOnBooks + gstOnCafe + gstOnServices;

  const netProfit = grossProfit - totalGst;
  const prevNetProfit = prevGrossProfit; // simplified previous comparison

  const incomeMax = Math.max(totalIncome, 1);
  const expMax = Math.max(totalExp, 1);
  const barMax = Math.max(totalIncome, totalExp, 1);

  const incomeItems = [
    { label: 'Library Sales', key: 'librarySales' },
    { label: 'Cafe Sales', key: 'cafeSales' },
    { label: 'Membership Fees', key: 'membershipFees' },
    { label: 'Event Revenue', key: 'eventRevenue' },
    { label: 'Fines Collected', key: 'finesCollected' },
  ];

  const handleGstChange = (key, val) => {
    const updated = { ...gstRates, [key]: parseFloat(val) || 0 };
    setGstRates(updated);
    saveGstRates(updated);
  };

  const periodLabel = (() => {
    const d = getPeriodDates(period, customStart, customEnd);
    return `${d.start} to ${d.end}`;
  })();

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
        @media (max-width: 600px) {
          .pnl-period-row { flex-wrap: wrap; gap: 6px !important; }
          .pnl-period-row button { flex: 1 1 auto; font-size: 12px !important; padding: 6px 10px !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <h1 style={{ fontSize: '28px', margin: 0 }}>Profit & Loss Statement</h1>
        <div className="no-print" style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowGst(!showGst)}
            style={{ ...btnBase, background: '#f0f0f0', color: '#555', fontSize: '16px', padding: '6px 12px' }}
            title="GST Settings"
          >⚙</button>
          <button
            onClick={() => window.print()}
            style={{ ...btnBase, background: '#667eea', color: 'white' }}
          >Print</button>
        </div>
      </div>

      {/* Period selector */}
      <div className="no-print" style={{ ...card, padding: '16px' }}>
        <div className="pnl-period-row" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { key: 'this_month', label: 'This Month' },
            { key: 'last_month', label: 'Last Month' },
            { key: 'this_quarter', label: 'This Quarter' },
            { key: 'this_year', label: 'This Year' },
            { key: 'custom', label: 'Custom' },
          ].map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)} style={periodBtn(period === p.key)}>
              {p.label}
            </button>
          ))}
          {period === 'custom' && (
            <>
              <input
                type="date" value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px' }}
              />
              <span style={{ color: '#999' }}>to</span>
              <input
                type="date" value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px' }}
              />
            </>
          )}
        </div>
      </div>

      {/* GST settings */}
      {showGst && (
        <div className="no-print" style={{ ...card, padding: '16px', background: '#fafbff', border: '1px solid #e0e5ff' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#667eea', marginBottom: '10px' }}>GST Rate Settings</div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {[
              { key: 'books', label: 'Books & Library' },
              { key: 'cafe', label: 'Cafe' },
              { key: 'services', label: 'Services (Memberships, Events)' },
            ].map(g => (
              <label key={g.key} style={{ fontSize: '13px', color: '#555', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {g.label}:
                <input
                  type="number" min="0" max="100" step="0.5"
                  value={gstRates[g.key]}
                  onChange={e => handleGstChange(g.key, e.target.value)}
                  style={{ width: '60px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', textAlign: 'right' }}
                />
                <span style={{ color: '#999' }}>%</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Period label */}
      <div style={{ textAlign: 'center', fontSize: '13px', color: '#888', marginBottom: '8px' }}>
        Period: {periodLabel}
      </div>

      {/* ===== INCOME SECTION ===== */}
      <div style={card}>
        <div style={sectionTitle}>Income</div>
        {incomeItems.map(item => (
          <div key={item.key} style={{ ...row, ...indent }}>
            <span style={labelStyle}>{item.label}</span>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <span style={valStyle}>{formatINR(income[item.key])}</span>
              <ChangeIndicator value={pctChange(income[item.key], prevIncome[item.key])} />
            </span>
          </div>
        ))}
        <div style={totalRow}>
          <span style={{ fontSize: '15px', fontWeight: 700, color: '#333' }}>Total Income</span>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'monospace', color: '#27ae60' }}>
              {formatINR(totalIncome)}
            </span>
            <ChangeIndicator value={pctChange(totalIncome, prevTotalIncome)} />
          </span>
        </div>
      </div>

      {/* ===== EXPENSES SECTION ===== */}
      <div style={card}>
        <div style={{ ...sectionTitle, color: '#e74c3c', borderBottomColor: '#e74c3c' }}>Expenses</div>
        {EXP_CATEGORIES.map(cat => {
          const val = expenses[cat] || 0;
          if (val === 0 && (prevExpenses[cat] || 0) === 0) return null;
          return (
            <div key={cat} style={{ ...row, ...indent }}>
              <span style={labelStyle}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <span style={valStyle}>{formatINR(val)}</span>
                <ChangeIndicator value={pctChange(val, prevExpenses[cat])} />
              </span>
            </div>
          );
        })}
        {/* Show all-zero note if no expenses */}
        {totalExp === 0 && (
          <div style={{ ...row, ...indent }}>
            <span style={{ ...labelStyle, fontStyle: 'italic', color: '#bbb' }}>No expenses recorded this period</span>
          </div>
        )}
        <div style={totalRow}>
          <span style={{ fontSize: '15px', fontWeight: 700, color: '#333' }}>Total Expenses</span>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'monospace', color: '#e74c3c' }}>
              {formatINR(totalExp)}
            </span>
            <ChangeIndicator value={pctChange(totalExp, prevTotalExp)} />
          </span>
        </div>
      </div>

      {/* ===== SUMMARY ===== */}
      <div style={{ ...card, borderTop: '3px solid #667eea' }}>
        <div style={{ ...sectionTitle, borderBottom: 'none', marginBottom: '8px' }}>Summary</div>

        {/* Gross Profit */}
        <div style={row}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#333' }}>Gross Profit</span>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'monospace', color: grossProfit >= 0 ? '#27ae60' : '#e74c3c' }}>
              {formatINR(grossProfit)}
            </span>
            <ChangeIndicator value={pctChange(grossProfit, prevGrossProfit)} />
          </span>
        </div>

        {/* GST breakdown */}
        {totalGst > 0 && (
          <>
            {gstOnBooks > 0 && (
              <div style={{ ...row, ...indent }}>
                <span style={{ ...labelStyle, fontSize: '12px' }}>GST on Books ({gstRates.books}%)</span>
                <span style={{ ...valStyle, fontSize: '12px', color: '#e67e22' }}>- {formatINR(gstOnBooks)}</span>
              </div>
            )}
            {gstOnCafe > 0 && (
              <div style={{ ...row, ...indent }}>
                <span style={{ ...labelStyle, fontSize: '12px' }}>GST on Cafe ({gstRates.cafe}%)</span>
                <span style={{ ...valStyle, fontSize: '12px', color: '#e67e22' }}>- {formatINR(gstOnCafe)}</span>
              </div>
            )}
            {gstOnServices > 0 && (
              <div style={{ ...row, ...indent }}>
                <span style={{ ...labelStyle, fontSize: '12px' }}>GST on Services ({gstRates.services}%)</span>
                <span style={{ ...valStyle, fontSize: '12px', color: '#e67e22' }}>- {formatINR(gstOnServices)}</span>
              </div>
            )}
          </>
        )}

        <div style={{ ...row, borderBottom: 'none' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#555' }}>Less: GST Payable</span>
          <span style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'monospace', color: '#e67e22' }}>
            {formatINR(totalGst)}
          </span>
        </div>

        {/* Net Profit */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 0 8px', borderTop: '3px double #333', marginTop: '8px',
        }}>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#333' }}>Net Profit</span>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{
              fontSize: '22px', fontWeight: 800, fontFamily: 'monospace',
              color: netProfit >= 0 ? '#27ae60' : '#e74c3c',
            }}>
              {formatINR(netProfit)}
            </span>
            <ChangeIndicator value={pctChange(netProfit, prevNetProfit)} />
          </span>
        </div>
      </div>

      {/* ===== VISUAL BAR ===== */}
      <div style={card}>
        <div style={{ ...sectionTitle, borderBottom: 'none', marginBottom: '12px' }}>Income vs Expenses</div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', height: '60px' }}>
          {/* Income bar */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#27ae60' }}>{formatINR(totalIncome)}</span>
            <div style={{
              width: '100%', borderRadius: '6px 6px 0 0',
              background: 'linear-gradient(180deg, #27ae60, #2ecc71)',
              height: `${Math.max((totalIncome / barMax) * 48, 4)}px`,
              transition: 'height .3s ease',
            }} />
            <span style={{ fontSize: '11px', color: '#888' }}>Income</span>
          </div>
          {/* Expenses bar */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#e74c3c' }}>{formatINR(totalExp)}</span>
            <div style={{
              width: '100%', borderRadius: '6px 6px 0 0',
              background: 'linear-gradient(180deg, #e74c3c, #ff6b6b)',
              height: `${Math.max((totalExp / barMax) * 48, 4)}px`,
              transition: 'height .3s ease',
            }} />
            <span style={{ fontSize: '11px', color: '#888' }}>Expenses</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', fontSize: '11px', color: '#bbb', marginTop: '8px', marginBottom: '20px' }}>
        Generated on {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>
  );
}
