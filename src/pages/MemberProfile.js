import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { calculateAge, isMinor, generateCustomerID, formatCurrency, formatDate, calculateStatusColor, PLAN_DEFAULTS } from '../utils/membershipUtils';

const TIERS = {
  basic:  { name: 'Basic',  icon: '🥉', borrow_limit: 2,  loan_days: 7,  color: '#95a5a6', bg: '#f4f4f4' },
  silver: { name: 'Silver', icon: '🥈', borrow_limit: 4,  loan_days: 14, color: '#7f8c8d', bg: '#ecf0f1' },
  gold:   { name: 'Gold',   icon: '🥇', borrow_limit: 6,  loan_days: 21, color: '#f39c12', bg: '#fefdf0' },
};

export default function MemberProfile() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  
  const [member, setMember] = useState(null);
  const [membershipHistory, setMembershipHistory] = useState([]);
  const [borrowingHistory, borrowingHistoryData] = useState([]);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upgradingTier, setUpgradingTier] = useState(false);

  useEffect(() => {
    fetchMemberProfile();
  }, [memberId]);

  const fetchMemberProfile = async () => {
    setLoading(true);
    try {
      // Fetch member details
      const { data: memberData } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId)
        .single();

      setMember(memberData);

      // Fetch borrowing history
      const { data: circulationData } = await supabase
        .from('circulation')
        .select('*, books(title, author, isbn)')
        .eq('member_id', memberId)
        .order('checkout_date', { ascending: false });

      borrowingHistoryData(circulationData || []);

      // Fetch purchase history
      const { data: salesData } = await supabase
        .from('sales')
        .select('*, sale_items(*, products(name, category))')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });

      setPurchaseHistory(salesData || []);

      // Create membership history (from member record)
      if (memberData) {
        const history = [];
        
        // Initial signup
        history.push({
          date: memberData.created_at,
          event: 'Account Created',
          details: 'Member joined',
          type: 'signup'
        });

        // Membership plan history
        if (memberData.plan && memberData.subscription_start) {
          history.push({
            date: memberData.subscription_start,
            event: 'Plan Activated',
            details: `${memberData.plan} plan started`,
            type: 'plan_start'
          });
        }

        if (memberData.subscription_end) {
          history.push({
            date: memberData.subscription_end,
            event: 'Plan Expiry',
            details: `${memberData.plan} plan expires`,
            type: 'plan_end'
          });
        }

        // Sort by date
        history.sort((a, b) => new Date(b.date) - new Date(a.date));
        setMembershipHistory(history);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTierUpgrade = async (tierKey) => {
    if (!window.confirm(`Upgrade membership to ${TIERS[tierKey].name} tier?`)) return;
    setUpgradingTier(true);
    try {
      const tier = TIERS[tierKey];
      const { error } = await supabase
        .from('members')
        .update({ borrow_limit: tier.borrow_limit, membership_tier: tierKey })
        .eq('id', memberId);
      if (error) {
        // membership_tier column may not exist — update just borrow_limit
        const { error: e2 } = await supabase
          .from('members')
          .update({ borrow_limit: tier.borrow_limit })
          .eq('id', memberId);
        if (e2) throw e2;
      }
      alert(`Tier updated to ${tier.name}! Borrow limit: ${tier.borrow_limit} books.`);
      fetchMemberProfile();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setUpgradingTier(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading profile...</div>;
  }

  if (!member) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Member not found</div>;
  }

  const age = calculateAge(member.date_of_birth);
  const customerId = generateCustomerID(member);
  const statusColor = calculateStatusColor(member);

  // Reading analytics
  const returned = borrowingHistory.filter(b => b.status === 'returned');
  const genreMap = {};
  returned.forEach(b => {
    const cat = b.books?.category;
    if (cat) genreMap[cat] = (genreMap[cat] || 0) + 1;
  });
  const topGenres = Object.entries(genreMap).sort((a, b) => b[1] - a[1]).slice(0, 3);

  // Reading streak: consecutive months with at least one borrow
  const readMonths = new Set(
    borrowingHistory.map(b => b.checkout_date?.slice(0, 7)).filter(Boolean)
  );
  let streak = 0;
  const now = new Date();
  let m = new Date(now.getFullYear(), now.getMonth(), 1);
  while (readMonths.has(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`)) {
    streak++;
    m.setMonth(m.getMonth() - 1);
  }

  // Determine current tier from borrow_limit
  const bLimit = member.borrow_limit || 0;
  const currentTierKey = bLimit <= 2 ? 'basic' : bLimit <= 4 ? 'silver' : 'gold';
  const currentTier = TIERS[currentTierKey];

  return (
    <div style={{ padding: '20px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* Back Button */}
      <button
        onClick={() => navigate('/members')}
        style={{
          padding: '8px 16px',
          background: '#667eea',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '20px',
          fontSize: '14px'
        }}
      >
        ← Back to Members
      </button>

      {/* Member Header Card */}
      <div style={{
        background: 'white',
        padding: '25px',
        borderRadius: '8px',
        marginBottom: '25px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        borderLeft: `5px solid ${statusColor === 'gold' ? '#ffc107' : statusColor === 'orange' ? '#ff9800' : statusColor === 'red' ? '#f44336' : '#9e9e9e'}`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <h1 style={{ margin: '0 0 10px 0', color: '#333' }}>{member.name}</h1>
            <p style={{ margin: '5px 0', color: '#666', fontSize: '16px' }}>
              <strong>Customer ID:</strong> {customerId}
            </p>
            <p style={{ margin: '5px 0', color: '#666', fontSize: '16px' }}>
              <strong>Age:</strong> {age} years old {isMinor(member.date_of_birth) ? '(Minor)' : '(Adult)'}
            </p>
            <p style={{ margin: '5px 0', color: '#666', fontSize: '16px' }}>
              <strong>Phone:</strong> {member.phone}
            </p>
            <p style={{ margin: '5px 0', color: '#666', fontSize: '16px' }}>
              <strong>Email:</strong> {member.email}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>Current Plan</p>
            <h2 style={{ margin: '0 0 10px 0', color: '#667eea', textTransform: 'capitalize' }}>
              {member.plan || 'No Plan'}
            </h2>
            <p style={{
              padding: '6px 12px',
              borderRadius: '4px',
              background: statusColor === 'gold' ? '#fff3cd' : statusColor === 'orange' ? '#fff9e6' : statusColor === 'red' ? '#ffebee' : '#f0f0f0',
              color: statusColor === 'gold' ? '#856404' : statusColor === 'orange' ? '#856404' : statusColor === 'red' ? '#c62828' : '#666',
              fontSize: '12px',
              fontWeight: 'bold',
              margin: '0'
            }}>
              {statusColor === 'gold' ? '🟡 Active' : statusColor === 'orange' ? '🟠 Expiring Soon' : statusColor === 'red' ? '🔴 Expired' : '⚪ Guest'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '25px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 10px 0', color: '#999', fontSize: '14px' }}>Total Books Borrowed</p>
          <h2 style={{ margin: '0', color: '#667eea', fontSize: '32px' }}>{borrowingHistory.length}</h2>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 10px 0', color: '#999', fontSize: '14px' }}>Total Purchases</p>
          <h2 style={{ margin: '0', color: '#667eea', fontSize: '32px' }}>{purchaseHistory.length}</h2>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 10px 0', color: '#999', fontSize: '14px' }}>Total Spent</p>
          <h2 style={{ margin: '0', color: '#667eea', fontSize: '32px' }}>
            {formatCurrency(purchaseHistory.reduce((sum, sale) => sum + (sale.final_total || 0), 0))}
          </h2>
        </div>
      </div>

      {/* Reading Analytics Card */}
      <div style={{ background: 'white', padding: '25px', borderRadius: '8px', marginBottom: '25px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #667eea', paddingBottom: '10px', marginBottom: '20px' }}>
          <h2 style={{ margin: '0', color: '#333' }}>📖 Reading Analytics</h2>
          <button
            onClick={() => window.print()}
            style={{ padding: '6px 14px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
          >
            🖨️ Export / Print
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px', marginBottom: '20px' }}>
          {[
            { label: 'Books Read', value: returned.length, color: '#27ae60', icon: '✅' },
            { label: 'Currently Borrowed', value: borrowingHistory.filter(b => b.status === 'checked_out').length, color: '#3498db', icon: '📚' },
            { label: 'Reading Streak', value: `${streak} mo.`, color: '#f39c12', icon: '🔥' },
            { label: 'Genres Explored', value: Object.keys(genreMap).length, color: '#9b59b6', icon: '🗂️' },
          ].map(s => (
            <div key={s.label} style={{ background: '#f8f9fa', borderRadius: '8px', padding: '14px', textAlign: 'center', borderTop: `3px solid ${s.color}` }}>
              <div style={{ fontSize: '20px' }}>{s.icon}</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: s.color, marginTop: '4px' }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '3px' }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>
        {topGenres.length > 0 && (
          <div>
            <div style={{ fontWeight: '600', marginBottom: '10px', fontSize: '14px' }}>🎭 Favourite Genres</div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {topGenres.map(([genre, count], idx) => (
                <div key={genre} style={{
                  background: idx === 0 ? '#f0f4ff' : '#f8f9fa',
                  border: `1px solid ${idx === 0 ? '#c7d2fe' : '#eee'}`,
                  borderRadius: '20px', padding: '6px 14px', fontSize: '13px', fontWeight: idx === 0 ? '700' : '500'
                }}>
                  {idx === 0 ? '⭐ ' : ''}{genre} <span style={{ color: '#999', fontSize: '11px' }}>({count})</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {returned.length === 0 && (
          <p style={{ color: '#999', textAlign: 'center', padding: '10px' }}>No reading history yet.</p>
        )}
      </div>

      {/* Membership Tier Card */}
      <div style={{ background: 'white', padding: '25px', borderRadius: '8px', marginBottom: '25px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#333', borderBottom: '2px solid #667eea', paddingBottom: '10px' }}>
          🏅 Membership Tier
        </h2>
        <div style={{ marginBottom: '16px', padding: '14px', background: currentTier.bg, border: `2px solid ${currentTier.color}`, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '32px' }}>{currentTier.icon}</span>
          <div>
            <div style={{ fontWeight: '700', fontSize: '18px', color: currentTier.color }}>{currentTier.name} Tier</div>
            <div style={{ fontSize: '13px', color: '#666', marginTop: '3px' }}>
              Borrow limit: {currentTier.borrow_limit} books · Loan duration: {currentTier.loan_days} days
            </div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: '13px', color: '#666' }}>
            Current borrow limit: <strong>{member.borrow_limit || '—'}</strong>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {Object.entries(TIERS).map(([key, tier]) => {
            const isCurrentTier = key === currentTierKey;
            return (
              <div key={key} style={{
                border: `2px solid ${isCurrentTier ? tier.color : '#eee'}`,
                borderRadius: '8px', padding: '16px', textAlign: 'center',
                background: isCurrentTier ? tier.bg : 'white',
                opacity: isCurrentTier ? 1 : 0.8
              }}>
                <div style={{ fontSize: '28px', marginBottom: '6px' }}>{tier.icon}</div>
                <div style={{ fontWeight: '700', color: tier.color }}>{tier.name}</div>
                <div style={{ fontSize: '12px', color: '#666', margin: '6px 0' }}>
                  {tier.borrow_limit} books · {tier.loan_days} days
                </div>
                {isCurrentTier ? (
                  <span style={{ background: tier.color, color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                    Current
                  </span>
                ) : (
                  <button
                    onClick={() => handleTierUpgrade(key)}
                    disabled={upgradingTier}
                    style={{ padding: '5px 14px', background: tier.color, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                  >
                    {upgradingTier ? '...' : key === 'gold' ? '⬆️ Upgrade' : '⬇️ Downgrade'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Membership History Card */}
      <div style={{ background: 'white', padding: '25px', borderRadius: '8px', marginBottom: '25px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#333', borderBottom: '2px solid #667eea', paddingBottom: '10px' }}>
          📅 Membership History
        </h2>
        {membershipHistory.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>No membership history</p>
        ) : (
          <div>
            {membershipHistory.map((item, idx) => (
              <div key={idx} style={{
                padding: '15px',
                borderLeft: '3px solid #667eea',
                marginBottom: '10px',
                background: '#f9f9f9',
                borderRadius: '4px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#333' }}>{item.event}</p>
                    <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>{item.details}</p>
                  </div>
                  <p style={{ margin: '0', color: '#999', fontSize: '14px', minWidth: '120px', textAlign: 'right' }}>
                    {formatDate(item.date)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Borrowing History Card */}
      <div style={{ background: 'white', padding: '25px', borderRadius: '8px', marginBottom: '25px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#333', borderBottom: '2px solid #667eea', paddingBottom: '10px' }}>
          📚 Borrowing History ({borrowingHistory.length})
        </h2>
        {borrowingHistory.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>No books borrowed</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Book Title</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Author</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Checkout</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Due Date</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {borrowingHistory.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px' }}>{item.books?.title}</td>
                    <td style={{ padding: '12px' }}>{item.books?.author || '-'}</td>
                    <td style={{ padding: '12px' }}>{formatDate(item.checkout_date)}</td>
                    <td style={{ padding: '12px' }}>{formatDate(item.due_date)}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        background: item.status === 'returned' ? '#d4edda' : '#fff3cd',
                        color: item.status === 'returned' ? '#155724' : '#856404'
                      }}>
                        {item.status === 'returned' ? '✓ Returned' : '📖 Checked Out'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Purchase History Card */}
      <div style={{ background: 'white', padding: '25px', borderRadius: '8px', marginBottom: '25px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#333', borderBottom: '2px solid #667eea', paddingBottom: '10px' }}>
          🛒 Purchase History ({purchaseHistory.length})
        </h2>
        {purchaseHistory.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>No purchases</p>
        ) : (
          <div>
            {purchaseHistory.map((sale) => (
              <div key={sale.id} style={{
                padding: '15px',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#333' }}>
                    {sale.sale_items?.map(item => item.products?.name).join(', ') || 'Items'}
                  </p>
                  <p style={{ margin: '0', color: '#999', fontSize: '14px' }}>
                    Payment: {sale.payment_method?.toUpperCase()} | {formatDate(sale.created_at)}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0', fontWeight: 'bold', color: '#667eea', fontSize: '16px' }}>
                    {formatCurrency(sale.final_total)}
                  </p>
                  {sale.discount_amount > 0 && (
                    <p style={{ margin: '5px 0 0 0', color: '#4caf50', fontSize: '12px' }}>
                      Discount: {formatCurrency(sale.discount_amount)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}