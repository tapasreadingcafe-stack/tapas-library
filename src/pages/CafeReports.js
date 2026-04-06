import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export default function CafeReports() {
  const [activeTab, setActiveTab] = useState('daily');
  const [loading, setLoading] = useState(true);
  const [tableReady, setTableReady] = useState(true);
  const [dailyData, setDailyData] = useState({ orders: 0, revenue: 0, avgOrder: 0 });
  const [topItems, setTopItems] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [dateRange, setDateRange] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const check = async () => {
      const { error } = await supabase.from('cafe_orders').select('id').limit(0);
      if (error) { setTableReady(false); setLoading(false); return; }
      fetchReports();
    };
    check();
  }, []);

  useEffect(() => { if (tableReady) fetchReports(); }, [dateRange]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const today = dateRange;
      const week7ago = (() => { const d = new Date(today); d.setDate(d.getDate() - 6); return d.toISOString().split('T')[0]; })();

      const [{ data: todayOrders }, { data: weekOrders }, { data: itemsData }] = await Promise.all([
        supabase.from('cafe_orders').select('total_amount, created_at').gte('created_at', today + 'T00:00:00').lte('created_at', today + 'T23:59:59').eq('status', 'completed'),
        supabase.from('cafe_orders').select('total_amount, created_at').gte('created_at', week7ago + 'T00:00:00').eq('status', 'completed'),
        supabase.from('cafe_order_items').select('item_name, quantity, total_price, cafe_orders!inner(status, created_at)').gte('cafe_orders.created_at', week7ago + 'T00:00:00').eq('cafe_orders.status', 'completed'),
      ]);

      const revenue = (todayOrders || []).reduce((s, o) => s + (o.total_amount || 0), 0);
      const count = (todayOrders || []).length;
      setDailyData({ orders: count, revenue, avgOrder: count > 0 ? Math.round(revenue / count) : 0 });

      // Weekly chart
      const last7 = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
        const dayOrders = (weekOrders || []).filter(o => o.created_at?.startsWith(ds));
        last7.push({ date: ds, day: dayName, count: dayOrders.length, revenue: dayOrders.reduce((s, o) => s + (o.total_amount || 0), 0), isToday: ds === today });
      }
      setWeeklyData(last7);

      // Top items
      const itemMap = {};
      (itemsData || []).forEach(item => {
        if (!itemMap[item.item_name]) itemMap[item.item_name] = { name: item.item_name, qty: 0, revenue: 0 };
        itemMap[item.item_name].qty += item.quantity || 0;
        itemMap[item.item_name].revenue += item.total_price || 0;
      });
      setTopItems(Object.values(itemMap).sort((a, b) => b.qty - a.qty).slice(0, 10));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (!tableReady) {
    return (
      <div style={{ padding: '20px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>📊 Cafe Reports</h1>
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '20px' }}>
          <p>Cafe tables not found. Please set up from the Cafe POS page first.</p>
        </div>
      </div>
    );
  }

  const maxWeekly = Math.max(...weeklyData.map(d => d.revenue), 1);
  const tabs = [
    { key: 'daily', label: '📅 Daily', icon: '' },
    { key: 'weekly', label: '📈 Weekly', icon: '' },
    { key: 'items', label: '🏆 Top Items', icon: '' },
  ];

  return (
    <div className="cafe-reports-page">
      <style>{`
        .cafe-reports-page { padding: 20px; }
        .cafe-reports-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
        .cafe-reports-header h1 { font-size: 28px; margin: 0; }
        .cafe-reports-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px; }
        .cafe-report-metric { background: white; padding: 16px; border-radius: 8px; text-align: center; }
        .cafe-report-metric .val { font-size: 24px; font-weight: 700; }
        .cafe-report-metric .lbl { font-size: 11px; color: #999; margin-top: 4px; }
        .cafe-reports-tabs { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
        .cafe-reports-tab { padding: 8px 18px; border-radius: 20px; border: 1px solid #e0e0e0; background: white; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; }
        .cafe-reports-tab.active { background: #667eea; color: white; border-color: #667eea; }
        .cafe-reports-card { background: white; border-radius: 8px; padding: 20px; }
        .cafe-bar-chart { display: flex; align-items: flex-end; gap: 8px; height: 150px; margin-top: 12px; }
        .cafe-bar-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .cafe-top-items-table { width: 100%; border-collapse: collapse; }
        .cafe-top-items-table th { text-align: left; padding: 10px; font-size: 12px; color: #666; border-bottom: 2px solid #eee; }
        .cafe-top-items-table td { padding: 10px; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
        @media (max-width: 768px) {
          .cafe-reports-page { padding: 12px; }
          .cafe-reports-header h1 { font-size: 22px; }
          .cafe-reports-metrics { grid-template-columns: repeat(3, 1fr); gap: 8px; }
          .cafe-report-metric { padding: 12px 8px; }
          .cafe-report-metric .val { font-size: 18px; }
          .cafe-bar-chart { height: 120px; gap: 4px; }
        }
        @media (max-width: 480px) {
          .cafe-reports-page { padding: 8px; }
          .cafe-reports-metrics { grid-template-columns: repeat(3, 1fr); }
          .cafe-report-metric .val { font-size: 16px; }
        }
      `}</style>

      <div className="cafe-reports-header">
        <h1>📊 Cafe Reports</h1>
        <input type="date" value={dateRange} onChange={e => setDateRange(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px' }} />
      </div>

      <div className="cafe-reports-metrics">
        <div className="cafe-report-metric" style={{ borderTop: '3px solid #667eea' }}>
          <div className="val" style={{ color: '#667eea' }}>{dailyData.orders}</div>
          <div className="lbl">ORDERS TODAY</div>
        </div>
        <div className="cafe-report-metric" style={{ borderTop: '3px solid #1dd1a1' }}>
          <div className="val" style={{ color: '#1dd1a1' }}>₹{dailyData.revenue.toLocaleString('en-IN')}</div>
          <div className="lbl">REVENUE TODAY</div>
        </div>
        <div className="cafe-report-metric" style={{ borderTop: '3px solid #f39c12' }}>
          <div className="val" style={{ color: '#f39c12' }}>₹{dailyData.avgOrder}</div>
          <div className="lbl">AVG ORDER VALUE</div>
        </div>
      </div>

      <div className="cafe-reports-tabs">
        {tabs.map(t => (
          <button key={t.key} className={`cafe-reports-tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <p style={{ color: '#999' }}>Loading...</p> : (
        <div className="cafe-reports-card">
          {activeTab === 'daily' && (
            <>
              <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>Daily Summary - {new Date(dateRange).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
              <p style={{ color: '#666', fontSize: '14px' }}>Total orders: <strong>{dailyData.orders}</strong></p>
              <p style={{ color: '#666', fontSize: '14px' }}>Total revenue: <strong style={{ color: '#1dd1a1' }}>₹{dailyData.revenue.toLocaleString('en-IN')}</strong></p>
              <p style={{ color: '#666', fontSize: '14px' }}>Average order: <strong>₹{dailyData.avgOrder}</strong></p>
            </>
          )}

          {activeTab === 'weekly' && (
            <>
              <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>Weekly Revenue</h3>
              <div className="cafe-bar-chart">
                {weeklyData.map(d => (
                  <div key={d.date} className="cafe-bar-item">
                    <div style={{ fontSize: '11px', color: '#667eea', fontWeight: '600', height: '14px' }}>
                      {d.revenue > 0 ? `₹${d.revenue}` : ''}
                    </div>
                    <div style={{
                      width: '100%', borderRadius: '4px 4px 0 0', transition: 'height 0.3s',
                      height: `${Math.max(4, (d.revenue / maxWeekly) * 100)}px`,
                      background: d.isToday ? '#667eea' : '#c7d2fe',
                    }} />
                    <div style={{ fontSize: '11px', color: d.isToday ? '#667eea' : '#999', fontWeight: d.isToday ? '700' : '400' }}>{d.day}</div>
                    <div style={{ fontSize: '10px', color: '#ccc' }}>{d.count} orders</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'items' && (
            <>
              <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>Top Selling Items (Last 7 Days)</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="cafe-top-items-table">
                  <thead>
                    <tr><th>#</th><th>Item</th><th>Quantity</th><th>Revenue</th></tr>
                  </thead>
                  <tbody>
                    {topItems.length === 0 ? (
                      <tr><td colSpan="4" style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No data yet</td></tr>
                    ) : topItems.map((item, idx) => (
                      <tr key={item.name}>
                        <td style={{ fontWeight: '600', color: idx < 3 ? '#f39c12' : '#999' }}>{idx + 1}</td>
                        <td style={{ fontWeight: '500' }}>{item.name}</td>
                        <td>{item.qty}</td>
                        <td style={{ fontWeight: '600', color: '#27ae60' }}>₹{item.revenue.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
