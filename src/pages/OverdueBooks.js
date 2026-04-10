import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { formatDate, formatCurrency } from '../utils/membershipUtils';
import { useConfirm } from '../components/ConfirmModal';

export default function OverdueBooks() {
  const confirm = useConfirm();
  const [overdueBooks, setOverdueBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [fineRate, setFineRate] = useState(10); // ₹10 per day
  const [showFineModal, setShowFineModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [fineAmount, setFineAmount] = useState(0);
  const [finePaid, setFinePaid] = useState(false);

  const FINE_RATE_PER_DAY = 10; // ₹10 per day (you can change this)

  useEffect(() => {
    fetchOverdueBooks();
  }, []);

  const fetchOverdueBooks = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: circulationData, error } = await supabase
        .from('circulation')
        .select('id, due_date, checkout_date, fine_paid, members(name, phone, email), books(title, author)')
        .eq('status', 'checked_out')
        .lt('due_date', today)
        .order('due_date', { ascending: true })
        .limit(200);

      if (error) throw error;

      const now = new Date();
      const overdue = (circulationData || []).map(item => ({
        ...item,
        daysOverdue: Math.floor((now - new Date(item.due_date)) / (1000 * 60 * 60 * 24)),
        fineAmount: Math.floor((now - new Date(item.due_date)) / (1000 * 60 * 60 * 24)) * FINE_RATE_PER_DAY,
      }));

      setOverdueBooks(overdue);
    } catch (error) {
      console.error('Error fetching overdue books:', error);
      alert('Failed to fetch overdue books');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkFinePaid = (item) => {
    setSelectedItem(item);
    setFineAmount(item.fineAmount);
    setFinePaid(false);
    setShowFineModal(true);
  };

  const handleConfirmFinePaid = async () => {
    if (!selectedItem) return;

    try {
      // Create a fine record in transactions table (if you want to track it)
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          member_id: selectedItem.member_id,
          transaction_type: 'fine',
          item_name: `Fine for overdue book: ${selectedItem.books?.title}`,
          item_type: 'fine',
          quantity: 1,
          amount: fineAmount,
          transaction_date: new Date().toISOString(),
          status: 'completed'
        }]);

      if (transactionError) throw transactionError;

      // Update circulation record with fine paid status
      const { error: circulationError } = await supabase
        .from('circulation')
        .update({ fine_paid: true, fine_amount: fineAmount })
        .eq('id', selectedItem.id);

      if (circulationError) throw circulationError;

      alert('Fine marked as paid!');
      setShowFineModal(false);
      fetchOverdueBooks();
    } catch (error) {
      console.error('Error marking fine as paid:', error);
      alert('Failed to mark fine as paid');
    }
  };

  const handleReturnOverdueBook = async (item) => {
    if (!await confirm({ title: 'Mark Returned', message: 'Mark this overdue book as returned?', variant: 'warning' })) return;

    try {
      const { error } = await supabase
        .from('circulation')
        .update({ status: 'returned', return_date: new Date().toISOString().split('T')[0] })
        .eq('id', item.id);

      if (error) throw error;

      // Update book quantity
      const { data: book } = await supabase
        .from('books')
        .select('quantity_available')
        .eq('id', item.book_id)
        .single();

      if (book) {
        await supabase
          .from('books')
          .update({ quantity_available: book.quantity_available + 1 })
          .eq('id', item.book_id);
      }

      alert('Book marked as returned!');
      fetchOverdueBooks();
    } catch (error) {
      console.error('Error returning book:', error);
      alert('Failed to return book');
    }
  };

  const filteredBooks = overdueBooks.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      item.members?.name?.toLowerCase().includes(term) ||
      item.members?.phone?.includes(term) ||
      item.books?.title?.toLowerCase().includes(term)
    );
  });

  const totalFines = filteredBooks.reduce((sum, item) => sum + item.fineAmount, 0);
  const totalOverdueBooks = filteredBooks.length;

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading overdue books...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>🔴 Overdue Books Management</h1>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '25px' }}>
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <p style={{ margin: '0 0 10px 0', color: '#999', fontSize: '14px' }}>Total Overdue</p>
          <h2 style={{ margin: '0', color: '#f44336', fontSize: '32px' }}>{totalOverdueBooks}</h2>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <p style={{ margin: '0 0 10px 0', color: '#999', fontSize: '14px' }}>Total Fines</p>
          <h2 style={{ margin: '0', color: '#f44336', fontSize: '32px' }}>
            {formatCurrency(totalFines)}
          </h2>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <p style={{ margin: '0 0 10px 0', color: '#999', fontSize: '14px' }}>Fine Rate</p>
          <h2 style={{ margin: '0', color: '#667eea', fontSize: '32px' }}>
            ₹{FINE_RATE_PER_DAY}/day
          </h2>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search by member name, phone, or book title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>

      {/* Overdue Books Table */}
      <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        {filteredBooks.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
            {totalOverdueBooks === 0 ? '✓ No overdue books!' : 'No results found'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Member</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Phone</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Book Title</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Due Date</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Days Overdue</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>Fine Amount</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBooks.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0', background: '#fff5f5' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{item.members?.name}</td>
                  <td style={{ padding: '12px' }}>{item.members?.phone}</td>
                  <td style={{ padding: '12px' }}>{item.books?.title}</td>
                  <td style={{ padding: '12px' }}>{formatDate(item.due_date)}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: '#f44336',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '12px'
                    }}>
                      {item.daysOverdue} days
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#f44336' }}>
                    {formatCurrency(item.fineAmount)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleMarkFinePaid(item)}
                      style={{
                        padding: '6px 12px',
                        background: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        marginRight: '5px'
                      }}
                    >
                      💰 Fine Paid
                    </button>
                    <button
                      onClick={() => handleReturnOverdueBook(item)}
                      style={{
                        padding: '6px 12px',
                        background: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
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

      {/* Fine Paid Modal */}
      {showFineModal && selectedItem && (
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
        }} onClick={() => setShowFineModal(false)}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>💰 Mark Fine as Paid</h2>

            <div style={{ marginBottom: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '4px' }}>
              <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px' }}>Member</p>
              <p style={{ margin: '0 0 15px 0', fontWeight: 'bold', color: '#333' }}>
                {selectedItem.members?.name}
              </p>

              <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px' }}>Book</p>
              <p style={{ margin: '0 0 15px 0', fontWeight: 'bold', color: '#333' }}>
                {selectedItem.books?.title}
              </p>

              <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px' }}>Days Overdue</p>
              <p style={{ margin: '0 0 15px 0', fontWeight: 'bold', color: '#f44336', fontSize: '18px' }}>
                {selectedItem.daysOverdue} days
              </p>

              <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px' }}>Fine Amount</p>
              <p style={{ margin: '0', fontWeight: 'bold', color: '#f44336', fontSize: '20px' }}>
                {formatCurrency(fineAmount)}
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={finePaid}
                  onChange={(e) => setFinePaid(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span>Confirm fine has been paid</span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowFineModal(false)}
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
                onClick={handleConfirmFinePaid}
                disabled={!finePaid}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: finePaid ? '#4CAF50' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: finePaid ? 'pointer' : 'not-allowed',
                  fontWeight: 'bold'
                }}
              >
                ✓ Confirm & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}