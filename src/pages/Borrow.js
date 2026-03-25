import React, { useState, useEffect } from 'react';
import BarcodeScanner from '../BarcodeScanner';
import { supabase } from '../utils/supabase';

export default function Borrow() {
  const [activeTab, setActiveTab] = useState('checkout');
  const [members, setMembers] = useState([]);
  const [books, setBooks] = useState([]);
  const [circulationData, setCirculationData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [checkoutForm, setCheckoutForm] = useState({
    member_id: '',
    book_id: '',
    due_date: '',
  });

  const [showScanner, setShowScanner] = useState(false);
  const [scannerMode, setScannerMode] = useState('book');
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [selectedForRenewal, setSelectedForRenewal] = useState(null);
  const [renewalDueDate, setRenewalDueDate] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: membersData } = await supabase.from('members').select('*');
      const { data: booksData } = await supabase.from('books').select('*');
      const { data: circulationDataFromDB } = await supabase
        .from('circulation')
        .select('*, members(name), books(title)')
        .eq('status', 'checked_out')
        .order('due_date', { ascending: false });

      setMembers(membersData || []);
      setBooks(booksData || []);
      setCirculationData(circulationDataFromDB || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!checkoutForm.member_id || !checkoutForm.book_id || !checkoutForm.due_date) {
      alert('Please fill all fields');
      return;
    }

    try {
      const member = members.find(m => m.id === checkoutForm.member_id);
      if (!member || member.status !== 'active') {
        alert('Member is not active or subscription expired!');
        return;
      }

      const memberCheckouts = circulationData.filter(c => c.member_id === checkoutForm.member_id);
      if (memberCheckouts.length >= member.borrow_limit) {
        alert(`Member has reached borrow limit of ${member.borrow_limit}`);
        return;
      }

      const book = books.find(b => b.id === checkoutForm.book_id);
      if (!book || book.quantity_available <= 0) {
        alert('Book is not available');
        return;
      }

      const { error } = await supabase.from('circulation').insert([{
        member_id: checkoutForm.member_id,
        book_id: checkoutForm.book_id,
        checkout_date: new Date().toISOString().split('T')[0],
        due_date: checkoutForm.due_date,
        status: 'checked_out',
        renewal_count: 0
      }]);

      if (error) throw error;

      await supabase
        .from('books')
        .update({ quantity_available: book.quantity_available - 1 })
        .eq('id', checkoutForm.book_id);

      setCheckoutForm({ member_id: '', book_id: '', due_date: '' });
      fetchData();
      alert('Book checked out successfully!');
    } catch (error) {
      console.error('Error during checkout:', error);
      alert('Error: ' + error.message);
    }
  };

  const handleReturn = async (circulationId) => {
    if (!window.confirm('Confirm book return?')) return;

    try {
      const circulation_record = circulationData.find(c => c.id === circulationId);
      
      const { error } = await supabase
        .from('circulation')
        .update({ status: 'returned', return_date: new Date().toISOString().split('T')[0] })
        .eq('id', circulationId);

      if (error) throw error;

      const book = books.find(b => b.id === circulation_record.book_id);
      await supabase
        .from('books')
        .update({ quantity_available: book.quantity_available + 1 })
        .eq('id', circulation_record.book_id);

      fetchData();
      alert('Book returned successfully!');
    } catch (error) {
      console.error('Error during return:', error);
      alert('Error: ' + error.message);
    }
  };

  const handleRenewal = async () => {
    if (!selectedForRenewal || !renewalDueDate) {
      alert('Please select a new due date');
      return;
    }

    try {
      const renewalCount = selectedForRenewal.renewal_count || 0;
      if (renewalCount >= 3) {
        alert('Maximum 3 renewals allowed per book!');
        return;
      }

      if (new Date(renewalDueDate) < new Date()) {
        alert('Due date cannot be in the past');
        return;
      }

      const { error } = await supabase
        .from('circulation')
        .update({ 
          due_date: renewalDueDate,
          renewal_count: renewalCount + 1,
          last_renewed_date: new Date().toISOString()
        })
        .eq('id', selectedForRenewal.id);

      if (error) throw error;

      alert('Book renewed successfully! New due date: ' + new Date(renewalDueDate).toLocaleDateString('en-IN'));
      setShowRenewalModal(false);
      setSelectedForRenewal(null);
      fetchData();
    } catch (error) {
      console.error('Error renewing book:', error);
      alert('Failed to renew book: ' + error.message);
    }
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date();
  };

  const daysOverdue = (dueDate) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diff = Math.floor((today - due) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>📚 Borrow (Checkout / Return)</h1>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #ddd' }}>
        <button
          onClick={() => setActiveTab('checkout')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'checkout' ? '#667eea' : '#f0f0f0',
            color: activeTab === 'checkout' ? 'white' : '#333',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'checkout' ? '3px solid #667eea' : 'none',
          }}
        >
          ➕ Checkout
        </button>
        <button
          onClick={() => setActiveTab('active')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'active' ? '#667eea' : '#f0f0f0',
            color: activeTab === 'active' ? 'white' : '#333',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'active' ? '3px solid #667eea' : 'none',
          }}
        >
          📚 Active Checkouts
        </button>
      </div>

      {activeTab === 'checkout' && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
          <h2>New Checkout</h2>
          <form onSubmit={handleCheckout}>
            <div style={{ marginBottom: '15px' }}>
              <button
                type="button"
                onClick={() => { setScannerMode('member'); setShowScanner(true); }}
                style={{ padding: '8px 12px', background: '#1dd1a1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '10px' }}
              >
                📱 Scan Member
              </button>
              <button
                type="button"
                onClick={() => { setScannerMode('book'); setShowScanner(true); }}
                style={{ padding: '8px 12px', background: '#1dd1a1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                📱 Scan Book
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Member *</label>
                <select
                  value={checkoutForm.member_id}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, member_id: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                >
                  <option value="">Select Member</option>
                  {members.filter(m => m.status === 'active').map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({member.plan})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Book *</label>
                <select
                  value={checkoutForm.book_id}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, book_id: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                >
                  <option value="">Select Book</option>
                  {books.filter(b => b.quantity_available > 0).map(book => (
                    <option key={book.id} value={book.id}>
                      {book.title} ({book.quantity_available} available)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Due Date *</label>
                <input
                  type="date"
                  value={checkoutForm.due_date}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, due_date: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
            </div>

            <button type="submit" style={{ padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              ✓ Checkout Book
            </button>
          </form>

          {showScanner && (
            <BarcodeScanner
              onScan={(data) => {
                if (scannerMode === 'member') {
                  const member = members.find(m => m.phone === data || m.id === data);
                  if (member) {
                    setCheckoutForm({ ...checkoutForm, member_id: member.id });
                    setShowScanner(false);
                  } else {
                    alert('Member not found');
                  }
                } else {
                  const book = books.find(b => b.book_id === data || b.id === data);
                  if (book) {
                    setCheckoutForm({ ...checkoutForm, book_id: book.id });
                    setShowScanner(false);
                  } else {
                    alert('Book not found');
                  }
                }
              }}
              onClose={() => setShowScanner(false)}
            />
          )}
        </div>
      )}

      {activeTab === 'active' && (
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '20px' }}>
            <h2>Active Checkouts ({circulationData.length})</h2>
          </div>
          {loading ? (
            <p style={{ padding: '20px', textAlign: 'center' }}>Loading...</p>
          ) : circulationData.length === 0 ? (
            <p style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No active checkouts</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Member</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Book</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Checkout Date</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Due Date</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Renewals</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {circulationData.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0', background: isOverdue(item.due_date) ? '#fff3cd' : 'white' }}>
                    <td style={{ padding: '12px' }}>{item.members?.name}</td>
                    <td style={{ padding: '12px' }}>{item.books?.title}</td>
                    <td style={{ padding: '12px' }}>{new Date(item.checkout_date).toLocaleDateString('en-IN')}</td>
                    <td style={{ padding: '12px' }}>
                      {new Date(item.due_date).toLocaleDateString('en-IN')}
                      {isOverdue(item.due_date) && (
                        <span style={{ marginLeft: '10px', color: '#ff6b6b', fontWeight: 'bold' }}>
                          ({daysOverdue(item.due_date)} days overdue)
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: (item.renewal_count || 0) >= 3 ? '#ffebee' : '#e3f2fd',
                        color: (item.renewal_count || 0) >= 3 ? '#c62828' : '#1565c0',
                        fontWeight: 'bold',
                        fontSize: '12px'
                      }}>
                        {item.renewal_count || 0}/3
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '4px', background: isOverdue(item.due_date) ? '#f8d7da' : '#d4edda', color: isOverdue(item.due_date) ? '#721c24' : '#155724', fontSize: '12px' }}>
                        {isOverdue(item.due_date) ? '⚠️ Overdue' : '✓ On Time'}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button
                        onClick={() => {
                          setSelectedForRenewal(item);
                          const currentDue = new Date(item.due_date);
                          const newDue = new Date(currentDue);
                          newDue.setDate(newDue.getDate() + 14);
                          setRenewalDueDate(newDue.toISOString().split('T')[0]);
                          setShowRenewalModal(true);
                        }}
                        disabled={(item.renewal_count || 0) >= 3}
                        style={{ 
                          padding: '6px 12px', 
                          background: (item.renewal_count || 0) >= 3 ? '#ccc' : '#2196F3', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '4px', 
                          cursor: (item.renewal_count || 0) >= 3 ? 'not-allowed' : 'pointer', 
                          fontSize: '12px',
                          marginRight: '5px'
                        }}
                      >
                        ♻️ Renew
                      </button>
                      <button
                        onClick={() => handleReturn(item.id)}
                        style={{ padding: '6px 12px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        ✓ Return
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showRenewalModal && selectedForRenewal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowRenewalModal(false)}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>♻️ Renew Book</h2>

            <div style={{ marginBottom: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '4px' }}>
              <p style={{ margin: '0 0 10px 0', color: '#666', fontSize: '12px' }}>Member</p>
              <p style={{ margin: '0 0 15px 0', fontWeight: 'bold', color: '#333' }}>
                {selectedForRenewal.members?.name}
              </p>

              <p style={{ margin: '0 0 10px 0', color: '#666', fontSize: '12px' }}>Book</p>
              <p style={{ margin: '0 0 15px 0', fontWeight: 'bold', color: '#333' }}>
                {selectedForRenewal.books?.title}
              </p>

              <p style={{ margin: '0 0 10px 0', color: '#666', fontSize: '12px' }}>Current Due Date</p>
              <p style={{ margin: '0 0 15px 0', fontWeight: 'bold', color: '#2196F3' }}>
                {new Date(selectedForRenewal.due_date).toLocaleDateString('en-IN')}
              </p>

              <p style={{ margin: '0 0 10px 0', color: '#666', fontSize: '12px' }}>Renewal Count</p>
              <p style={{ margin: '0', fontWeight: 'bold', color: (selectedForRenewal.renewal_count || 0) >= 3 ? '#f44336' : '#4CAF50' }}>
                {selectedForRenewal.renewal_count || 0} / 3
              </p>
            </div>

            {(selectedForRenewal.renewal_count || 0) >= 3 && (
              <div style={{
                background: '#ffebee',
                border: '1px solid #f44336',
                color: '#c62828',
                padding: '12px',
                borderRadius: '4px',
                marginBottom: '15px',
                fontWeight: 'bold'
              }}>
                ✗ Maximum renewals reached! Please return the book.
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                New Due Date
              </label>
              <input
                type="date"
                value={renewalDueDate}
                onChange={(e) => setRenewalDueDate(e.target.value)}
                disabled={(selectedForRenewal.renewal_count || 0) >= 3}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  backgroundColor: (selectedForRenewal.renewal_count || 0) >= 3 ? '#f5f5f5' : 'white',
                  cursor: (selectedForRenewal.renewal_count || 0) >= 3 ? 'not-allowed' : 'auto'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowRenewalModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#f5f5f5',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRenewal}
                disabled={(selectedForRenewal.renewal_count || 0) >= 3}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: (selectedForRenewal.renewal_count || 0) >= 3 ? '#ccc' : '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (selectedForRenewal.renewal_count || 0) >= 3 ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                ♻️ Renew Book
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}