import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { cacheGet, cacheSet } from '../utils/cache';

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    totalMembers: 0,
    totalBooks: 0,
    checkedOutToday: 0,
    revenueMonth: 0,
    overdueBooks: 0,
    outstandingFines: 0,
    activeCheckouts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [topMembers, setTopMembers] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [dueTodayBooks, setDueTodayBooks] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async (force = false) => {
    // Return cached data immediately (unless forced refresh)
    if (!force) {
      const cached = cacheGet('dashboard');
      if (cached) {
        setMetrics(cached.metrics);
        setRecentActivity(cached.recentActivity);
        setWeeklyData(cached.weeklyData);
        setDueTodayBooks(cached.dueTodayBooks);
        setCategoryData(cached.categoryData);
        setTopMembers(cached.topMembers);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const week7ago = (() => { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().split('T')[0]; })();

      // All queries in ONE parallel batch — no sequential round-trips
      const [
        { count: membersCount },
        { count: booksCount },
        { count: checkedOutCount },
        { count: overdueCount },
        { count: activeCheckouts },
        { data: salesData },
        { data: recentSales },
        { data: circData },
        { data: dueTodayData },
        { data: overdueForFines },
        { data: booksForCats },
        { data: activeMembers },
      ] = await Promise.all([
        supabase.from('members').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('books').select('id', { count: 'exact', head: true }),
        supabase.from('circulation').select('id', { count: 'exact', head: true }).eq('status', 'checked_out').eq('checkout_date', today),
        supabase.from('circulation').select('id', { count: 'exact', head: true }).eq('status', 'checked_out').lt('due_date', today),
        supabase.from('circulation').select('id', { count: 'exact', head: true }).eq('status', 'checked_out'),
        supabase.from('sales').select('total_amount').gte('sale_date', firstDay).eq('status', 'completed'),
        supabase.from('sales').select('id, total_amount, sale_date, members(name)').order('sale_date', { ascending: false }).limit(5),
        supabase.from('circulation').select('checkout_date').gte('checkout_date', week7ago).order('checkout_date').limit(500),
        supabase.from('circulation').select('id, due_date, members(name), books(title)').eq('status', 'checked_out').eq('due_date', today).limit(50),
        supabase.from('circulation').select('due_date, fine_paid').eq('status', 'checked_out').lt('due_date', today).eq('fine_paid', false).limit(500),
        supabase.from('books').select('category, quantity_total').limit(500),
        supabase.from('circulation').select('member_id, members(name)').eq('status', 'checked_out').limit(200),
      ]);

      const totalRevenue = salesData?.reduce((s, sale) => s + (sale.total_amount || 0), 0) || 0;

      const outstandingFines = (overdueForFines || []).reduce((s, item) => {
        const days = Math.max(0, Math.floor((new Date() - new Date(item.due_date)) / 86400000));
        return s + days * 10;
      }, 0);

      const metrics = {
        totalMembers: membersCount || 0,
        totalBooks: booksCount || 0,
        checkedOutToday: checkedOutCount || 0,
        revenueMonth: totalRevenue,
        overdueBooks: overdueCount || 0,
        outstandingFines,
        activeCheckouts: activeCheckouts || 0,
      };

      // Weekly bar chart
      const last7 = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
        const count = (circData || []).filter(c => c.checkout_date === dateStr).length;
        last7.push({ date: dateStr, day: dayName, count, isToday: dateStr === today });
      }

      // Category distribution
      const catMap = {};
      (booksForCats || []).forEach(b => {
        const cat = b.category || 'Uncategorized';
        catMap[cat] = (catMap[cat] || 0) + (b.quantity_total || 1);
      });
      const categoryData = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

      // Top active members
      const memberCounts = {};
      (activeMembers || []).forEach(c => {
        const id = c.member_id;
        if (!memberCounts[id]) memberCounts[id] = { name: c.members?.name, count: 0 };
        memberCounts[id].count++;
      });
      const topMembers = Object.values(memberCounts).sort((a, b) => b.count - a.count).slice(0, 5);

      // Save to cache
      const cachePayload = { metrics, recentActivity: recentSales || [], weeklyData: last7, dueTodayBooks: dueTodayData || [], categoryData, topMembers };
      cacheSet('dashboard', cachePayload);

      setMetrics(metrics);
      setRecentActivity(recentSales || []);
      setWeeklyData(last7);
      setDueTodayBooks(dueTodayData || []);
      setCategoryData(categoryData);
      setTopMembers(topMembers);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const maxWeekly = Math.max(...weeklyData.map(d => d.count), 1);
  const catTotal = categoryData.reduce((s, [, v]) => s + v, 0);
  const catColors = ['#667eea', '#1dd1a1', '#f39c12', '#e74c3c', '#9b59b6', '#3498db'];

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '32px', marginBottom: '4px' }}>📊 Dashboard</h1>
          <p style={{ color: '#999' }}>Welcome back! Here's your library overview.</p>
        </div>
        <button onClick={() => fetchDashboardData(true)} disabled={loading}
          style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {loading ? '⏳ Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {loading ? (
          Array.from({ length: 7 }).map((_, i) => (
            <div key={i} style={{ padding: '16px', background: 'white', borderRadius: '8px', textAlign: 'center', borderTop: '3px solid #e0e0e0' }}>
              <div style={{ width: '28px', height: '28px', background: '#f0f0f0', borderRadius: '50%', margin: '0 auto 8px', animation: 'shimmer 1.4s ease-in-out infinite' }} />
              <div style={{ width: '50%', height: '24px', background: '#f0f0f0', borderRadius: '4px', margin: '0 auto 8px', animation: 'shimmer 1.4s ease-in-out infinite' }} />
              <div style={{ width: '80%', height: '10px', background: '#f0f0f0', borderRadius: '4px', margin: '0 auto', animation: 'shimmer 1.4s ease-in-out infinite' }} />
              <style>{`@keyframes shimmer{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
            </div>
          ))
        ) : (
          [
            { label: 'Active Members', value: metrics.totalMembers, color: '#667eea', icon: '👥' },
            { label: 'Total Books', value: metrics.totalBooks, color: '#1dd1a1', icon: '📚' },
            { label: 'Checked Out Today', value: metrics.checkedOutToday, color: '#3498db', icon: '📤' },
            { label: 'Active Borrows', value: metrics.activeCheckouts, color: '#9b59b6', icon: '📖' },
            { label: 'Overdue Books', value: metrics.overdueBooks, color: '#ff9f43', icon: '⚠️' },
            { label: 'Outstanding Fines', value: `₹${metrics.outstandingFines.toLocaleString('en-IN')}`, color: '#e74c3c', icon: '💰' },
            { label: 'Revenue This Month', value: `₹${metrics.revenueMonth.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: '#1dd1a1', icon: '💵' },
          ].map(s => (
            <div key={s.label} style={{ padding: '16px', background: 'white', borderRadius: '8px', textAlign: 'center', borderTop: `3px solid ${s.color}` }}>
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>{s.icon}</div>
              <div style={{ fontSize: typeof s.value === 'string' ? '16px' : '24px', fontWeight: 'bold', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>{s.label.toUpperCase()}</div>
            </div>
          ))
        )}
      </div>

      {/* Due Today Alert */}
      {dueTodayBooks.length > 0 && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '14px 18px', marginBottom: '20px' }}>
          <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '8px' }}>
            📅 {dueTodayBooks.length} Book{dueTodayBooks.length !== 1 ? 's' : ''} Due Back Today
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {dueTodayBooks.map(item => (
              <span key={item.id} style={{ background: 'white', border: '1px solid #ffc107', padding: '3px 10px', borderRadius: '12px', fontSize: '12px' }}>
                {item.books?.title} ({item.members?.name})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        {/* Weekly borrows bar chart */}
        <div style={{ background: 'white', borderRadius: '8px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700' }}>📅 Books Borrowed This Week</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '100px' }}>
            {weeklyData.map(d => (
              <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{ fontSize: '11px', color: '#667eea', fontWeight: '600', height: '14px' }}>
                  {d.count > 0 ? d.count : ''}
                </div>
                <div style={{
                  width: '100%',
                  height: `${Math.max(4, (d.count / maxWeekly) * 70)}px`,
                  background: d.isToday ? '#667eea' : '#c7d2fe',
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 0.3s',
                }} />
                <div style={{ fontSize: '11px', color: d.isToday ? '#667eea' : '#999', fontWeight: d.isToday ? '700' : '400' }}>
                  {d.day}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category distribution */}
        <div style={{ background: 'white', borderRadius: '8px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700' }}>🗂️ Popular Categories</h3>
          {categoryData.length === 0 ? (
            <p style={{ color: '#999', fontSize: '13px' }}>No category data yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {categoryData.map(([cat, count], idx) => {
                const pct = Math.round((count / catTotal) * 100);
                return (
                  <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: catColors[idx], flexShrink: 0 }} />
                    <div style={{ fontSize: '12px', color: '#555', width: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat}</div>
                    <div style={{ flex: 1, height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: catColors[idx], width: `${pct}%`, borderRadius: '4px', transition: 'width 0.4s' }} />
                    </div>
                    <div style={{ fontSize: '11px', color: '#999', width: '30px', textAlign: 'right' }}>{pct}%</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: Most active members + Recent sales */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Most active members */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '700' }}>🏆 Most Active Members</h3>
          {topMembers.length === 0 ? (
            <p style={{ color: '#999', fontSize: '13px' }}>No active borrows.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {topMembers.map((m, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', background: '#f8f9fa', borderRadius: '6px' }}>
                  <span style={{
                    width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: idx === 0 ? '#f39c12' : idx === 1 ? '#95a5a6' : idx === 2 ? '#e67e22' : '#f0f0f0',
                    color: idx < 3 ? 'white' : '#555', fontSize: '12px', fontWeight: '700', flexShrink: 0
                  }}>
                    {idx + 1}
                  </span>
                  <span style={{ flex: 1, fontSize: '14px', fontWeight: '500' }}>{m.name}</span>
                  <span style={{ background: '#667eea', color: 'white', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                    {m.count} out
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Sales */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
          <h2 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '700' }}>📝 Recent Sales</h2>
          {recentActivity.length === 0 ? (
            <p style={{ color: '#999', fontSize: '13px' }}>No recent sales</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <th style={{ textAlign: 'left', padding: '8px', fontWeight: '600', fontSize: '12px', color: '#666' }}>Member</th>
                  <th style={{ textAlign: 'left', padding: '8px', fontWeight: '600', fontSize: '12px', color: '#666' }}>Amount</th>
                  <th style={{ textAlign: 'left', padding: '8px', fontWeight: '600', fontSize: '12px', color: '#666' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((sale) => (
                  <tr key={sale.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '8px', fontSize: '13px' }}>{sale.members?.name || 'N/A'}</td>
                    <td style={{ padding: '8px', fontSize: '13px', fontWeight: '600', color: '#27ae60' }}>₹{sale.total_amount?.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '8px', fontSize: '12px', color: '#999' }}>{new Date(sale.sale_date).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
