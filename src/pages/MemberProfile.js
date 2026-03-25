import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { calculateAge, isMinor, generateCustomerID, formatCurrency, formatDate, calculateStatusColor } from '../utils/membershipUtils';

export default function MemberProfile() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  
  const [member, setMember] = useState(null);
  const [membershipHistory, setMembershipHistory] = useState([]);
  const [borrowingHistory, borrowingHistoryData] = useState([]);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading profile...</div>;
  }

  if (!member) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Member not found</div>;
  }

  const age = calculateAge(member.date_of_birth);
  const customerId = generateCustomerID(member);
  const statusColor = calculateStatusColor(member);

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