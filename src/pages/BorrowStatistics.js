import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { formatCurrency, formatDate } from '../utils/membershipUtils';

export default function BorrowStatistics() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30days'); // all, 7days, 30days, 90days
  const [circulationData, setCirculationData] = useState([]);
  const [memberData, setMemberData] = useState([]);
  const [booksData, setBooksData] = useState([]);
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetchAllData();
  }, [timeRange]);

  const getDateRange = () => {
    const today = new Date();
    let startDate = new Date();

    switch (timeRange) {
      case '7days':
        startDate.setDate(today.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(today.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(today.getDate() - 90);
        break;
      case 'all':
      default:
        startDate = new Date('2000-01-01');
    }

    return startDate.toISOString().split('T')[0];
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const startDate = getDateRange();

      // Fetch circulation data
      const { data: circData } = await supabase
        .from('circulation')
        .select('*, members(name, plan), books(title, category)')
        .gte('checkout_date', startDate)
        .order('checkout_date', { ascending: false });

      // Fetch members
      const { data: memData } = await supabase.from('members').select('*');

      // Fetch books
      const { data: bkData } = await supabase.from('books').select('*');

      setCirculationData(circData || []);
      setMemberData(memData || []);
      setBooksData(bkData || []);

      // Calculate statistics
      calculateStats(circData || [], memData || []);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (circulation, members) => {
    const totalCheckouts = circulation.filter(c => c.status === 'checked_out' || c.status === 'returned').length;
    const totalReturns = circulation.filter(c => c.status === 'returned').length;
    const activeCheckouts = circulation.filter(c => c.status === 'checked_out').length;
    const overdueBooks = circulation.filter(c => {
      if (c.status !== 'checked_out') return false;
      return new Date(c.due_date) < new Date();
    }).length;

    // Most borrowed books
    const bookCounts = {};
    circulation.forEach(c => {
      const bookTitle = c.books?.title || 'Unknown';
      bookCounts[bookTitle] = (bookCounts[bookTitle] || 0) + 1;
    });
    const mostBorrowedBooks = Object.entries(bookCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([title, count]) => ({ title, count }));

    // Member borrowing patterns
    const memberCounts = {};
    circulation.forEach(c => {
      const memberName = c.members?.name || 'Unknown';
      memberCounts[memberName] = (memberCounts[memberName] || 0) + 1;
    });
    const topMembers = Object.entries(memberCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Daily checkout trend
    const dailyCounts = {};
    circulation.forEach(c => {
      const date = c.checkout_date.split('T')[0];
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });
    const dailyTrend = Object.entries(dailyCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Plan distribution
    const planCounts = {};
    members.forEach(m => {
      const plan = m.plan || 'No Plan';
      planCounts[plan] = (planCounts[plan] || 0) + 1;
    });

    setStats({
      totalCheckouts,
      totalReturns,
      activeCheckouts,
      overdueBooks,
      totalMembers: members.length,
      activeMembers: members.filter(m => m.plan).length,
      mostBorrowedBooks,
      topMembers,
      dailyTrend,
      planCounts
    });
  };

  const getReturnRate = () => {
    if (stats.totalCheckouts === 0) return 0;
    return Math.round((stats.totalReturns / stats.totalCheckouts) * 100);
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading statistics...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>📊 Borrow Statistics & Analytics</h1>

      {/* Time Range Selector */}
      <div style={{
        background: 'white',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        display: 'flex',
        gap: '10px'
      }}>
        <button
          onClick={() => setTimeRange('7days')}
          style={{
            padding: '8px 16px',
            background: timeRange === '7days' ? '#667eea' : '#f0f0f0',
            color: timeRange === '7days' ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Last 7 Days
        </button>
        <button
          onClick={() => setTimeRange('30days')}
          style={{
            padding: '8px 16px',
            background: timeRange === '30days' ? '#667eea' : '#f0f0f0',
            color: timeRange === '30days' ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Last 30 Days
        </button>
        <button
          onClick={() => setTimeRange('90days')}
          style={{
            padding: '8px 16px',
            background: timeRange === '90days' ? '#667eea' : '#f0f0f0',
            color: timeRange === '90days' ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Last 90 Days
        </button>
        <button
          onClick={() => setTimeRange('all')}
          style={{
            padding: '8px 16px',
            background: timeRange === 'all' ? '#667eea' : '#f0f0f0',
            color: timeRange === 'all' ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          All Time
        </button>
      </div>

      {/* Key Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px', marginBottom: '25px' }}>
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center',
          borderLeft: '4px solid #2196F3'
        }}>
          <p style={{ margin: '0 0 8px 0', color: '#999', fontSize: '12px' }}>Total Checkouts</p>
          <h2 style={{ margin: '0', color: '#2196F3', fontSize: '28px' }}>{stats.totalCheckouts}</h2>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center',
          borderLeft: '4px solid #4CAF50'
        }}>
          <p style={{ margin: '0 0 8px 0', color: '#999', fontSize: '12px' }}>Total Returns</p>
          <h2 style={{ margin: '0', color: '#4CAF50', fontSize: '28px' }}>{stats.totalReturns}</h2>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center',
          borderLeft: '4px solid #FF9800'
        }}>
          <p style={{ margin: '0 0 8px 0', color: '#999', fontSize: '12px' }}>Active Checkouts</p>
          <h2 style={{ margin: '0', color: '#FF9800', fontSize: '28px' }}>{stats.activeCheckouts}</h2>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center',
          borderLeft: '4px solid #f44336'
        }}>
          <p style={{ margin: '0 0 8px 0', color: '#999', fontSize: '12px' }}>Overdue Books</p>
          <h2 style={{ margin: '0', color: '#f44336', fontSize: '28px' }}>{stats.overdueBooks}</h2>
        </div>
      </div>

      {/* Secondary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '25px' }}>
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <p style={{ margin: '0 0 8px 0', color: '#999', fontSize: '12px' }}>Return Rate</p>
          <h2 style={{ margin: '0', color: '#667eea', fontSize: '28px' }}>{getReturnRate()}%</h2>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <p style={{ margin: '0 0 8px 0', color: '#999', fontSize: '12px' }}>Total Members</p>
          <h2 style={{ margin: '0', color: '#667eea', fontSize: '28px' }}>{stats.totalMembers}</h2>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <p style={{ margin: '0 0 8px 0', color: '#999', fontSize: '12px' }}>Active Members</p>
          <h2 style={{ margin: '0', color: '#4CAF50', fontSize: '28px' }}>{stats.activeMembers}</h2>
        </div>
      </div>

      {/* Top 5 Most Borrowed Books */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '25px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: '0 0 15px 0', color: '#333', borderBottom: '2px solid #667eea', paddingBottom: '10px' }}>
          📚 Top 5 Most Borrowed Books
        </h2>
        {stats.mostBorrowedBooks && stats.mostBorrowedBooks.length > 0 ? (
          <div>
            {stats.mostBorrowedBooks.map((book, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: idx < stats.mostBorrowedBooks.length - 1 ? '1px solid #f0f0f0' : 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    width: '32px',
                    height: '32px',
                    background: '#667eea',
                    color: 'white',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold'
                  }}>
                    {idx + 1}
                  </span>
                  <span style={{ fontWeight: 'bold', color: '#333' }}>{book.title}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{
                    background: '#f0f0f0',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    color: '#667eea'
                  }}>
                    {book.count} times
                  </div>
                  <div style={{
                    width: '200px',
                    height: '8px',
                    background: '#f0f0f0',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      background: '#667eea',
                      width: `${(book.count / (stats.mostBorrowedBooks[0]?.count || 1)) * 100}%`
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#999' }}>No borrowing data available</p>
        )}
      </div>

      {/* Top 5 Active Members */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '25px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: '0 0 15px 0', color: '#333', borderBottom: '2px solid #667eea', paddingBottom: '10px' }}>
          👥 Top 5 Active Members
        </h2>
        {stats.topMembers && stats.topMembers.length > 0 ? (
          <div>
            {stats.topMembers.map((member, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: idx < stats.topMembers.length - 1 ? '1px solid #f0f0f0' : 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    width: '32px',
                    height: '32px',
                    background: '#4CAF50',
                    color: 'white',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold'
                  }}>
                    {idx + 1}
                  </span>
                  <span style={{ fontWeight: 'bold', color: '#333' }}>{member.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{
                    background: '#f0f0f0',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    color: '#4CAF50'
                  }}>
                    {member.count} checkouts
                  </div>
                  <div style={{
                    width: '200px',
                    height: '8px',
                    background: '#f0f0f0',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      background: '#4CAF50',
                      width: `${(member.count / (stats.topMembers[0]?.count || 1)) * 100}%`
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#999' }}>No member data available</p>
        )}
      </div>

      {/* Membership Plan Distribution */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '25px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: '0 0 15px 0', color: '#333', borderBottom: '2px solid #667eea', paddingBottom: '10px' }}>
          💳 Membership Plan Distribution
        </h2>
        {stats.planCounts && Object.keys(stats.planCounts).length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
            {Object.entries(stats.planCounts).map(([plan, count]) => (
              <div key={plan} style={{
                padding: '15px',
                background: '#f5f5f5',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <p style={{ margin: '0 0 8px 0', color: '#999', fontSize: '12px' }}>{plan}</p>
                <h3 style={{ margin: '0', color: '#667eea', fontSize: '24px' }}>{count}</h3>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#999' }}>No plan data available</p>
        )}
      </div>

      {/* Daily Trend Chart (Simple Text Chart) */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: '0 0 15px 0', color: '#333', borderBottom: '2px solid #667eea', paddingBottom: '10px' }}>
          📈 Daily Checkout Trend (Last 7 Days)
        </h2>
        {stats.dailyTrend && stats.dailyTrend.length > 0 ? (
          <div>
            {stats.dailyTrend.slice(-7).map((day, idx) => {
              const maxCount = Math.max(...stats.dailyTrend.slice(-7).map(d => d.count));
              const barWidth = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
              return (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '12px'
                }}>
                  <span style={{ minWidth: '100px', fontSize: '12px', color: '#666' }}>
                    {new Date(day.date).toLocaleDateString('en-IN')}
                  </span>
                  <div style={{
                    flex: 1,
                    background: '#f0f0f0',
                    borderRadius: '4px',
                    height: '24px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      background: '#667eea',
                      width: `${barWidth}%`,
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: '8px',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {day.count}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: '#999' }}>No trend data available</p>
        )}
      </div>
    </div>
  );
}
