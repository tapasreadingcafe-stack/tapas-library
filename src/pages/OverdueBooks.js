import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { formatDate, formatCurrency } from '../utils/membershipUtils';
import { useConfirm } from '../components/ConfirmModal';
import { useToast } from '../components/Toast';
import { getFineSettings, calculateFine, daysOverdue } from '../utils/fineUtils';
import { sendEmail, overdueEmailHtml } from '../utils/emailUtils';
import { sendWhatsApp, overdueWhatsAppMsg } from '../utils/whatsappUtils';

export default function OverdueBooks() {
  const confirm = useConfirm();
  const toast = useToast();
  const [overdueBooks, setOverdueBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [fineSettings, setFineSettings] = useState({ ratePerDay: 10, gracePeriod: 0, maxFine: 0 });
  const [showFineModal, setShowFineModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [fineAmount, setFineAmount] = useState(0);
  const [finePaid, setFinePaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  useEffect(() => {
    fetchOverdueBooks();
    getFineSettings().then(setFineSettings);
  }, []);

  const fetchOverdueBooks = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: circulationData, error } = await supabase
        .from('circulation')
        .select('id, member_id, book_id, due_date, checkout_date, fine_paid, members(name, phone, email), books(title, author)')
        .eq('status', 'checked_out')
        .lt('due_date', today)
        .order('due_date', { ascending: true })
        .limit(200);

      if (error) throw error;

      const now = new Date();
      const overdue = (circulationData || []).map(item => ({
        ...item,
        daysOverdue: Math.floor((now - new Date(item.due_date)) / (1000 * 60 * 60 * 24)),
        fineAmount: calculateFine(item.due_date, fineSettings).fineAmount,
        memberName: item.members?.name || 'Unknown',
        memberEmail: item.members?.email || '',
        bookTitle: item.books?.title || 'Unknown',
        dueDate: item.due_date,
      }));

      setOverdueBooks(overdue);
    } catch (error) {
      console.error('Error fetching overdue books:', error);
      toast.error('Failed to fetch overdue books');
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

      toast.success('Fine collected!');
      setShowFineModal(false);
      fetchOverdueBooks();
    } catch (error) {
      console.error('Error marking fine as paid:', error);
      toast.error('Failed to collect fine');
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

      toast.success('Book marked as returned!');
      fetchOverdueBooks();
    } catch (error) {
      console.error('Error returning book:', error);
      toast.error('Failed to return book');
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
            ₹{fineSettings.ratePerDay}/day{fineSettings.gracePeriod > 0 ? ` (${fineSettings.gracePeriod}-day grace)` : ''}
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
            {totalOverdueBooks === 0 ? '🎉 No overdue books! Your members are keeping up.' : 'No results matching your search'}
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
                      💰 Collect Fine
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
                    {item.memberEmail && (
                      <button
                        onClick={async () => {
                          const result = await sendEmail({
                            to: item.memberEmail,
                            subject: `Overdue Book Reminder - ${item.bookTitle}`,
                            html: overdueEmailHtml({
                              memberName: item.memberName,
                              bookTitle: item.bookTitle,
                              dueDate: new Date(item.dueDate).toLocaleDateString('en-IN'),
                              daysOverdue: item.daysOverdue,
                              fineAmount: item.fineAmount,
                            }),
                            type: 'overdue_reminder',
                          });
                          if (result.success) toast.success(`Reminder sent to ${item.memberEmail}`);
                          else toast.error(result.error || 'Failed to send email');
                        }}
                        style={{
                          padding: '6px 12px', background: '#ff9800', color: 'white',
                          border: 'none', borderRadius: '4px', cursor: 'pointer',
                          fontSize: '12px', marginLeft: '5px'
                        }}
                      >
                        📧 Remind
                      </button>
                    )}
                    {item.members?.phone && (
                      <button
                        onClick={async () => {
                          const result = await sendWhatsApp(item.members.phone, overdueWhatsAppMsg({
                            memberName: item.memberName,
                            bookTitle: item.bookTitle,
                            dueDate: new Date(item.dueDate).toLocaleDateString('en-IN'),
                            daysOverdue: item.daysOverdue,
                            fineAmount: item.fineAmount,
                          }));
                          if (result.success) toast.success(result.mode === 'link' ? 'WhatsApp opened' : 'WhatsApp sent!');
                          else toast.error(result.error || 'Failed');
                        }}
                        style={{ padding: '6px 12px', background: '#25D366', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', marginLeft: '5px' }}
                      >
                        📱 WhatsApp
                      </button>
                    )}
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
            <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>💰 Collect Fine</h2>

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

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#888', marginBottom: '8px', letterSpacing: '0.5px' }}>PAYMENT METHOD</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['cash', 'card', 'upi', 'waive'].map(m => (
                  <button key={m} onClick={() => { setPaymentMethod(m); setFinePaid(true); }}
                    style={{
                      padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
                      background: paymentMethod === m ? (m === 'waive' ? '#e74c3c' : '#38a169') : '#f0f0f0',
                      color: paymentMethod === m ? 'white' : '#555',
                      fontWeight: paymentMethod === m ? '600' : '400',
                    }}>
                    {m === 'cash' ? '💵 Cash' : m === 'card' ? '💳 Card' : m === 'upi' ? '📱 UPI' : '🚫 Waive'}
                  </button>
                ))}
              </div>
              {paymentMethod === 'waive' && (
                <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#e74c3c', fontWeight: '600' }}>Fine will be waived — no payment collected</p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowFineModal(false)}
                style={{ flex: 1, padding: '10px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmFinePaid}
                style={{ flex: 1, padding: '10px', background: paymentMethod === 'waive' ? '#e74c3c' : '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {paymentMethod === 'waive' ? '🚫 Waive Fine' : '✓ Collect Fine'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}