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
    <div className="reports-page">
      <style>{`
        .reports-page { padding: 20px; }
        .reports-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .reports-header h1 { font-size: 28px; margin: 0; }
        .reports-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .reports-metric { padding: 20px; background: white; border-radius: 8px; text-align: center; }
        .reports-metric .val { font-size: 28px; font-weight: bold; }
        .reports-metric .lbl { font-size: 12px; color: #999; margin-top: 5px; }
        .reports-tabs { display: flex; gap: 6px; margin-bottom: 20px; flex-wrap: wrap; overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 4px; }
        .reports-tab { padding: 8px 18px; border-radius: 20px; border: 1px solid #e0e0e0; background: white; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; white-space: nowrap; }
        .reports-tab.active { background: #667eea; color: white; border-color: #667eea; }
        .reports-card { background: white; padding: 20px; border-radius: 8px; overflow-x: auto; }
        .reports-card h2 { font-size: 18px; margin: 0 0 12px; }
        .reports-card table { width: 100%; border-collapse: collapse; }
        .reports-card th { padding: 10px; text-align: left; font-weight: bold; border-bottom: 2px solid #e0e0e0; }
        .reports-card td { padding: 10px; border-bottom: 1px solid #f0f0f0; }
        @media (max-width: 768px) {
          .reports-page { padding: 12px; }
          .reports-header h1 { font-size: 22px; }
          .reports-metrics { grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .reports-metric { padding: 14px; }
          .reports-metric .val { font-size: 20px; }
          .reports-card { padding: 14px; }
          .reports-card h2 { font-size: 16px; }
          .reports-card th, .reports-card td { padding: 8px 6px; font-size: 12px; }
        }
        @media (max-width: 480px) {
          .reports-page { padding: 8px; }
          .reports-metrics { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .reports-metric { padding: 10px; }
          .reports-metric .val { font-size: 16px; }
        }
      `}</style>

      <div className="reports-header">
        <h1>📊 Reports</h1>
        <button onClick={fetchReportData} style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
          🔄 Refresh
        </button>
      </div>

      <div className="reports-metrics">
        <div className="reports-metric" style={{ borderTop: '3px solid #667eea' }}>
          <div className="val">₹{reportData.totalRevenue?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          <div className="lbl">REVENUE THIS MONTH</div>
        </div>
        <div className="reports-metric" style={{ borderTop: '3px solid #1dd1a1' }}>
          <div className="val">{reportData.totalMembers}</div>
          <div className="lbl">TOTAL MEMBERS</div>
        </div>
        <div className="reports-metric" style={{ borderTop: '3px solid #667eea' }}>
          <div className="val">{reportData.activeCheckouts}</div>
          <div className="lbl">ACTIVE CHECKOUTS</div>
        </div>
        <div className="reports-metric" style={{ borderTop: '3px solid #ff9f43' }}>
          <div className="val">{reportData.overdueBooks?.length || 0}</div>
          <div className="lbl">OVERDUE BOOKS</div>
        </div>
      </div>

      <div className="reports-tabs">
        {[
          { key: 'revenue', label: '💰 Revenue' },
          { key: 'topbooks', label: '📚 Top Books' },
          { key: 'overdue', label: '⚠️ Overdue' },
          { key: 'expiring', label: '📅 Expiring Soon' },
        ].map(tab => (
          <button key={tab.key} className={`reports-tab ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#999' }}>Loading reports...</p>
      ) : (
        <>
          {activeTab === 'revenue' && (
            <div className="reports-card">
              <h2>💰 Monthly Revenue</h2>
              <p style={{ fontSize: '14px', marginBottom: '15px' }}>Total revenue this month: <strong>₹{reportData.totalRevenue?.toLocaleString('en-IN')}</strong></p>
              <p style={{ color: '#999', fontSize: '12px' }}>Revenue is calculated from all completed sales in the current month.</p>
            </div>
          )}

          {activeTab === 'topbooks' && (
            <div className="reports-card">
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
            <div className="reports-card">
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
            <div className="reports-card">
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