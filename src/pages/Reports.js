import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('revenue');
  const [reportData, setReportData] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // Revenue this month
      const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const { data: revenueData } = await supabase
        .from('sales')
        .select('total_amount')
        .gte('sale_date', firstDay)
        .eq('status', 'completed');
      
      const totalRevenue = revenueData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;

      // Top books
      const { data: topBooksData } = await supabase
        .from('circulation')
        .select('book_id, books(title)');
      
      const bookCounts = {};
      topBooksData?.forEach(item => {
        const bookTitle = item.books?.title;
        bookCounts[bookTitle] = (bookCounts[bookTitle] || 0) + 1;
      });
      
      const topBooks = Object.entries(bookCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([title, count]) => ({ title, count }));

      // Overdue books
      const today = new Date().toISOString().split('T')[0];
      const { data: overdueData } = await supabase
        .from('circulation')
        .select('*, members(name), books(title)')
        .eq('status', 'checked_out')
        .lt('due_date', today);

      // Expiring subscriptions
      const { data: expiringData } = await supabase
        .from('members')
        .select('*')
        .eq('status', 'active')
        .lt('subscription_end', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      // Member activity
      const { data: memberData } = await supabase
        .from('members')
        .select('*');
      
      const { count: activeCheckouts } = await supabase
        .from('circulation')
        .select('*', { count: 'exact' })
        .eq('status', 'checked_out');

      setReportData({
        totalRevenue,
        topBooks,
        overdueBooks: overdueData || [],
        expiringSubscriptions: expiringData || [],
        totalMembers: memberData?.length || 0,
        activeCheckouts: activeCheckouts || 0,
      });
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const daysUntilExpiry = (endDate) => {
    const today = new Date();
    const expiry = new Date(endDate);
    const diff = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const daysOverdue = (dueDate) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diff = Math.floor((today - due) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>📊 Reports</h1>
        <button
          onClick={fetchReportData}
          style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          🔄 Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '30px' }}>
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', textAlign: 'center', borderTop: '3px solid #667eea' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>₹{reportData.totalRevenue?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>REVENUE THIS MONTH</div>
        </div>
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', textAlign: 'center', borderTop: '3px solid #1dd1a1' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{reportData.totalMembers}</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>TOTAL MEMBERS</div>
        </div>
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', textAlign: 'center', borderTop: '3px solid #667eea' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{reportData.activeCheckouts}</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>ACTIVE CHECKOUTS</div>
        </div>
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', textAlign: 'center', borderTop: '3px solid #ff9f43' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{reportData.overdueBooks?.length || 0}</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>OVERDUE BOOKS</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #ddd' }}>
        <button
          onClick={() => setActiveTab('revenue')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'revenue' ? '#667eea' : '#f0f0f0',
            color: activeTab === 'revenue' ? 'white' : '#333',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'revenue' ? '3px solid #667eea' : 'none',
          }}
        >
          💰 Revenue
        </button>
        <button
          onClick={() => setActiveTab('topbooks')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'topbooks' ? '#667eea' : '#f0f0f0',
            color: activeTab === 'topbooks' ? 'white' : '#333',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'topbooks' ? '3px solid #667eea' : 'none',
          }}
        >
          📚 Top Books
        </button>
        <button
          onClick={() => setActiveTab('overdue')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'overdue' ? '#667eea' : '#f0f0f0',
            color: activeTab === 'overdue' ? 'white' : '#333',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'overdue' ? '3px solid #667eea' : 'none',
          }}
        >
          ⚠️ Overdue
        </button>
        <button
          onClick={() => setActiveTab('expiring')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'expiring' ? '#667eea' : '#f0f0f0',
            color: activeTab === 'expiring' ? 'white' : '#333',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'expiring' ? '3px solid #667eea' : 'none',
          }}
        >
          📅 Expiring Soon
        </button>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#999' }}>Loading reports...</p>
      ) : (
        <>
          {activeTab === 'revenue' && (
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
              <h2>💰 Monthly Revenue</h2>
              <p style={{ fontSize: '14px', marginBottom: '15px' }}>Total revenue this month: <strong>₹{reportData.totalRevenue?.toLocaleString('en-IN')}</strong></p>
              <p style={{ color: '#999', fontSize: '12px' }}>Revenue is calculated from all completed sales in the current month.</p>
            </div>
          )}

          {activeTab === 'topbooks' && (
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
              <h2>📚 Most Borrowed Books</h2>
              {reportData.topBooks?.length === 0 ? (
                <p style={{ color: '#999' }}>No data available</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ borderBottom: '2px solid #e0e0e0' }}>
                    <tr>
                      <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold' }}>Book Title</th>
                      <th style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>Times Borrowed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.topBooks?.map((book, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '10px' }}>{book.title}</td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>{book.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'overdue' && (
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
              <h2>⚠️ Overdue Books</h2>
              {reportData.overdueBooks?.length === 0 ? (
                <p style={{ color: '#999' }}>No overdue books 🎉</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ borderBottom: '2px solid #e0e0e0' }}>
                    <tr>
                      <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold' }}>Member</th>
                      <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold' }}>Book</th>
                      <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold' }}>Due Date</th>
                      <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold' }}>Days Overdue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.overdueBooks?.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0', background: '#fff3cd' }}>
                        <td style={{ padding: '10px' }}>{item.members?.name}</td>
                        <td style={{ padding: '10px' }}>{item.books?.title}</td>
                        <td style={{ padding: '10px' }}>{new Date(item.due_date).toLocaleDateString('en-IN')}</td>
                        <td style={{ padding: '10px', color: '#ff6b6b', fontWeight: 'bold' }}>{daysOverdue(item.due_date)} days</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'expiring' && (
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
              <h2>📅 Subscriptions Expiring in 7 Days</h2>
              {reportData.expiringSubscriptions?.length === 0 ? (
                <p style={{ color: '#999' }}>No subscriptions expiring soon</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ borderBottom: '2px solid #e0e0e0' }}>
                    <tr>
                      <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold' }}>Member</th>
                      <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold' }}>Plan</th>
                      <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold' }}>Expiry Date</th>
                      <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold' }}>Days Left</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.expiringSubscriptions?.map((member) => (
                      <tr key={member.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '10px' }}>{member.name}</td>
                        <td style={{ padding: '10px', textTransform: 'capitalize' }}>{member.plan}</td>
                        <td style={{ padding: '10px' }}>{new Date(member.subscription_end).toLocaleDateString('en-IN')}</td>
                        <td style={{ padding: '10px', color: daysUntilExpiry(member.subscription_end) <= 3 ? '#ff6b6b' : '#667eea', fontWeight: 'bold' }}>{daysUntilExpiry(member.subscription_end)} days</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}