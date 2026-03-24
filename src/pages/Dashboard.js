import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    totalMembers: 0,
    totalBooks: 0,
    checkedOutToday: 0,
    revenueMonth: 0,
    overdueBooks: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { count: membersCount } = await supabase
        .from('members')
        .select('*', { count: 'exact' })
        .eq('status', 'active');

      const { count: booksCount } = await supabase
        .from('books')
        .select('*', { count: 'exact' });

      const today = new Date().toISOString().split('T')[0];
      const { count: checkedOutCount } = await supabase
        .from('circulation')
        .select('*', { count: 'exact' })
        .eq('status', 'checked_out')
        .eq('checkout_date', today);

      const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const { data: salesData } = await supabase
        .from('sales')
        .select('total_amount')
        .gte('sale_date', firstDay)
        .eq('status', 'completed');

      const totalRevenue = salesData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;

      const { count: overdueCount } = await supabase
        .from('circulation')
        .select('*', { count: 'exact' })
        .eq('status', 'checked_out')
        .lt('due_date', today);

      setMetrics({
        totalMembers: membersCount || 0,
        totalBooks: booksCount || 0,
        checkedOutToday: checkedOutCount || 0,
        revenueMonth: totalRevenue,
        overdueBooks: overdueCount || 0,
      });

      const { data: recentSales } = await supabase
        .from('sales')
        .select('*, members(name), books(title)')
        .order('sale_date', { ascending: false })
        .limit(5);

      setRecentActivity(recentSales || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '10px' }}>📊 Dashboard</h1>
        <p style={{ color: '#999', marginBottom: '20px' }}>Welcome back! Here's your library overview.</p>
        <button onClick={fetchDashboardData} disabled={loading} style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {loading ? '⏳ Loading...' : '🔄 Refresh'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '30px' }}>
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', textAlign: 'center', borderTop: '3px solid #667eea' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{metrics.totalMembers}</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>ACTIVE MEMBERS</div>
        </div>
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', textAlign: 'center', borderTop: '3px solid #1dd1a1' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{metrics.totalBooks}</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>TOTAL BOOKS</div>
        </div>
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', textAlign: 'center', borderTop: '3px solid #667eea' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{metrics.checkedOutToday}</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>CHECKED OUT TODAY</div>
        </div>
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', textAlign: 'center', borderTop: '3px solid #1dd1a1' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>₹{metrics.revenueMonth.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>REVENUE THIS MONTH</div>
        </div>
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', textAlign: 'center', borderTop: '3px solid #ff9f43' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{metrics.overdueBooks}</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>OVERDUE BOOKS</div>
        </div>
      </div>

      <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
        <h2 style={{ margin: '0 0 15px 0' }}>📝 Recent Sales</h2>
        {recentActivity.length === 0 ? (
          <p style={{ color: '#999' }}>No recent sales</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <th style={{ textAlign: 'left', padding: '10px', fontWeight: 'bold' }}>Member</th>
                <th style={{ textAlign: 'left', padding: '10px', fontWeight: 'bold' }}>Book</th>
                <th style={{ textAlign: 'left', padding: '10px', fontWeight: 'bold' }}>Amount</th>
                <th style={{ textAlign: 'left', padding: '10px', fontWeight: 'bold' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.map((sale) => (
                <tr key={sale.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '10px' }}>{sale.members?.name || 'N/A'}</td>
                  <td style={{ padding: '10px' }}>{sale.books?.title || 'N/A'}</td>
                  <td style={{ padding: '10px' }}>₹{sale.total_amount?.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '10px' }}>{new Date(sale.sale_date).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}