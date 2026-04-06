import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export default function AccountsOverview() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ libRevenue: 0, cafeRevenue: 0, eventRevenue: 0, finesCollected: 0, totalExpenses: 0 });
  const [monthlyData, setMonthlyData] = useState([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const sixMonthsAgo = (() => { const d = new Date(); d.setMonth(d.getMonth() - 5); d.setDate(1); return d.toISOString().split('T')[0]; })();

      const [{ data: sales }, cafeResult, eventResult, { data: fines }, expResult] = await Promise.all([
        supabase.from('sales').select('total_amount, sale_date').gte('sale_date', firstDay).eq('status', 'completed'),
        supabase.from('cafe_orders').select('total_amount, created_at').gte('created_at', firstDay + 'T00:00:00').eq('status', 'completed').then(r => r).catch(() => ({ data: [] })),
        supabase.from('event_registrations').select('amount_paid, registration_date').gte('registration_date', firstDay + 'T00:00:00').neq('status', 'cancelled').then(r => r).catch(() => ({ data: [] })),
        supabase.from('circulation').select('fine_amount').eq('fine_paid', true).gte('return_date', firstDay),
        supabase.from('cafe_expenses').select('amount, expense_date').gte('expense_date', firstDay).then(r => r).catch(() => ({ data: [] })),
      ]);

      const libRevenue = (sales || []).reduce((s, r) => s + (r.total_amount || 0), 0);
      const cafeRevenue = (cafeResult?.data || []).reduce((s, r) => s + (r.total_amount || 0), 0);
      const eventRevenue = (eventResult?.data || []).reduce((s, r) => s + (r.amount_paid || 0), 0);
      const finesCollected = (fines || []).reduce((s, r) => s + (r.fine_amount || 0), 0);
      const totalExpenses = (expResult?.data || []).reduce((s, r) => s + (r.amount || 0), 0);

      setData({ libRevenue, cafeRevenue, eventRevenue, finesCollected, totalExpenses });

      // Monthly trend (last 6 months from sales)
      const monthMap = {};
      const allSalesResult = await supabase.from('sales').select('total_amount, sale_date').gte('sale_date', sixMonthsAgo).eq('status', 'completed');
      (allSalesResult.data || []).forEach(s => {
        const m = s.sale_date?.slice(0, 7);
        if (m) monthMap[m] = (monthMap[m] || 0) + (s.total_amount || 0);
      });
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const key = d.toISOString().slice(0, 7);
        months.push({ month: d.toLocaleDateString('en-IN', { month: 'short' }), revenue: monthMap[key] || 0 });
      }
      setMonthlyData(months);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const totalIncome = data.libRevenue + data.cafeRevenue + data.eventRevenue + data.finesCollected;
  const profit = totalIncome - data.totalExpenses;
  const maxMonthly = Math.max(...monthlyData.map(m => m.revenue), 1);

  return (
    <div style={{ padding: '20px' }}>
      <style>{`
        @media (max-width: 768px) {
          .acc-metrics { grid-template-columns: repeat(2, 1fr) !important; }
          .acc-chart { height: 100px !important; }
        }
        @media (max-width: 480px) {
          .acc-metrics { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
          .acc-metric .val { font-size: 16px !important; }
        }
      `}</style>
      <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>📊 Financial Overview</h1>

      {loading ? <p style={{ color: '#999' }}>Loading...</p> : (
        <>
          <div className="acc-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'LIBRARY REVENUE', val: `₹${data.libRevenue.toLocaleString('en-IN')}`, color: '#667eea' },
              { label: 'CAFE REVENUE', val: `₹${data.cafeRevenue.toLocaleString('en-IN')}`, color: '#1dd1a1' },
              { label: 'EVENT REVENUE', val: `₹${data.eventRevenue.toLocaleString('en-IN')}`, color: '#9b59b6' },
              { label: 'FINES COLLECTED', val: `₹${data.finesCollected.toLocaleString('en-IN')}`, color: '#f39c12' },
              { label: 'EXPENSES', val: `₹${data.totalExpenses.toLocaleString('en-IN')}`, color: '#e74c3c' },
              { label: 'NET PROFIT', val: `₹${profit.toLocaleString('en-IN')}`, color: profit >= 0 ? '#27ae60' : '#e74c3c' },
            ].map(m => (
              <div key={m.label} className="acc-metric" style={{ background: 'white', padding: '16px', borderRadius: '8px', textAlign: 'center', borderTop: `3px solid ${m.color}` }}>
                <div className="val" style={{ fontSize: '22px', fontWeight: '700', color: m.color }}>{m.val}</div>
                <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>{m.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ background: 'white', borderRadius: '8px', padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700' }}>📈 Monthly Revenue Trend</h3>
              <div className="acc-chart" style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '130px' }}>
                {monthlyData.map((m, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{ fontSize: '10px', color: '#667eea', fontWeight: '600' }}>{m.revenue > 0 ? `₹${m.revenue}` : ''}</div>
                    <div style={{ width: '100%', borderRadius: '4px 4px 0 0', background: i === monthlyData.length - 1 ? '#667eea' : '#c7d2fe', height: `${Math.max(4, (m.revenue / maxMonthly) * 100)}px`, transition: 'height 0.3s' }} />
                    <div style={{ fontSize: '11px', color: '#999' }}>{m.month}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: '8px', padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700' }}>💰 Revenue Breakdown (This Month)</h3>
              {[
                { label: 'Library', val: data.libRevenue, color: '#667eea' },
                { label: 'Cafe', val: data.cafeRevenue, color: '#1dd1a1' },
                { label: 'Events', val: data.eventRevenue, color: '#9b59b6' },
                { label: 'Fines', val: data.finesCollected, color: '#f39c12' },
              ].map(item => {
                const pct = totalIncome > 0 ? Math.round((item.val / totalIncome) * 100) : 0;
                return (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                    <div style={{ fontSize: '13px', color: '#555', width: '60px' }}>{item.label}</div>
                    <div style={{ flex: 1, height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: item.color, width: `${pct}%`, borderRadius: '4px' }} />
                    </div>
                    <div style={{ fontSize: '12px', color: '#999', minWidth: '70px', textAlign: 'right' }}>₹{item.val.toLocaleString('en-IN')}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
