import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import {
  sendDueReminderEmail,
  sendOverdueAlertEmail,
  sendCheckoutConfirmationEmail
} from '../utils/emailService';
import { formatDate } from '../utils/membershipUtils';

export default function EmailNotifications() {
  const [activeTab, setActiveTab] = useState('send');
  const [circulationData, setCirculationData] = useState([]);
  const [emailHistory, setEmailHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [sending, setSending] = useState(false);
  const [reminderType, setReminderType] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: circData } = await supabase
        .from('circulation')
        .select('*, members(name, email), books(title)')
        .eq('status', 'checked_out')
        .order('due_date', { ascending: true });

      setCirculationData(circData || []);

      const { data: emailData } = await supabase
        .from('transactions')
        .select('*')
        .eq('transaction_type', 'email')
        .order('transaction_date', { ascending: false });

      setEmailHistory(emailData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilDue = (dueDate) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date();
  };

  const filteredBooks = circulationData.filter(item => {
    if (reminderType === 'due-soon') {
      const days = getDaysUntilDue(item.due_date);
      return days <= 3 && days > 0;
    } else if (reminderType === 'overdue') {
      return isOverdue(item.due_date);
    }
    return true;
  });

  const handleSelectBook = (bookId) => {
    if (selectedBooks.includes(bookId)) {
      setSelectedBooks(selectedBooks.filter(id => id !== bookId));
    } else {
      setSelectedBooks([...selectedBooks, bookId]);
    }
  };

  const handleSendEmails = async () => {
    if (selectedBooks.length === 0) {
      alert('Please select at least one book');
      return;
    }

    if (!window.confirm(`Send emails for ${selectedBooks.length} book(s)?`)) {
      return;
    }

    setSending(true);
    const results = { success: 0, failed: 0, errors: [] };

    try {
      for (const circId of selectedBooks) {
        const item = circulationData.find(c => c.id === circId);
        if (!item || !item.members?.email) {
          results.failed++;
          continue;
        }

        try {
          let response;

          if (isOverdue(item.due_date)) {
            const days = Math.floor((new Date() - new Date(item.due_date)) / (1000 * 60 * 60 * 24));
            response = await sendOverdueAlertEmail(
              item.members?.name,
              item.members?.email,
              item.books?.title,
              days
            );
          } else {
            response = await sendDueReminderEmail(
              item.members?.name,
              item.members?.email,
              item.books?.title,
              item.due_date
            );
          }

          // Log to transactions table
          await supabase.from('transactions').insert([{
            member_id: item.member_id,
            transaction_type: 'email',
            item_name: `Reminder email for ${item.books?.title}`,
            item_type: 'notification',
            quantity: 1,
            transaction_date: new Date().toISOString(),
            status: 'completed',
            amount: 0
          }]);

          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(`${item.members?.name}: ${error.message}`);
        }
      }

      alert(`✓ Sent ${results.success} emails\n✗ Failed: ${results.failed}`);
      if (results.errors.length > 0) {
        console.error('Errors:', results.errors);
      }

      setSelectedBooks([]);
      fetchData();
    } catch (error) {
      console.error('Error sending emails:', error);
      alert('Error sending emails: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>📧 Email Notifications & Reminders</h1>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #ddd' }}>
        <button
          onClick={() => setActiveTab('send')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'send' ? '#667eea' : '#f0f0f0',
            color: activeTab === 'send' ? 'white' : '#333',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'send' ? '3px solid #667eea' : 'none',
          }}
        >
          📤 Send Reminders
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'history' ? '#667eea' : '#f0f0f0',
            color: activeTab === 'history' ? 'white' : '#333',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'history' ? '3px solid #667eea' : 'none',
          }}
        >
          📋 Email History
        </button>
      </div>

      {activeTab === 'send' && (
        <div>
          <div style={{
            background: 'white',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <button
                onClick={() => { setReminderType('all'); setSelectedBooks([]); }}
                style={{
                  padding: '8px 16px',
                  background: reminderType === 'all' ? '#667eea' : '#f0f0f0',
                  color: reminderType === 'all' ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                All ({circulationData.length})
              </button>
              <button
                onClick={() => { setReminderType('due-soon'); setSelectedBooks([]); }}
                style={{
                  padding: '8px 16px',
                  background: reminderType === 'due-soon' ? '#FF9800' : '#f0f0f0',
                  color: reminderType === 'due-soon' ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Due Soon ({circulationData.filter(c => getDaysUntilDue(c.due_date) <= 3 && getDaysUntilDue(c.due_date) > 0).length})
              </button>
              <button
                onClick={() => { setReminderType('overdue'); setSelectedBooks([]); }}
                style={{
                  padding: '8px 16px',
                  background: reminderType === 'overdue' ? '#f44336' : '#f0f0f0',
                  color: reminderType === 'overdue' ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Overdue ({circulationData.filter(c => isOverdue(c.due_date)).length})
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setSelectedBooks(filteredBooks.map(b => b.id))}
                style={{
                  padding: '8px 16px',
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Select All ({filteredBooks.length})
              </button>
              <button
                onClick={() => setSelectedBooks([])}
                style={{
                  padding: '8px 16px',
                  background: '#f0f0f0',
                  color: '#333',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Deselect All
              </button>
              <button
                onClick={handleSendEmails}
                disabled={selectedBooks.length === 0 || sending}
                style={{
                  padding: '8px 16px',
                  background: selectedBooks.length === 0 ? '#ccc' : '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: selectedBooks.length === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  marginLeft: 'auto'
                }}
              >
                {sending ? '⏳ Sending...' : `📤 Send ${selectedBooks.length} Emails`}
              </button>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            {filteredBooks.length === 0 ? (
              <p style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No books found</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
                  <tr>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>
                      <input
                        type="checkbox"
                        checked={selectedBooks.length === filteredBooks.length && filteredBooks.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBooks(filteredBooks.map(b => b.id));
                          } else {
                            setSelectedBooks([]);
                          }
                        }}
                      />
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Member</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Email</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Book</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Due Date</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBooks.map((item) => {
                    const days = getDaysUntilDue(item.due_date);
                    const overdue = isOverdue(item.due_date);
                    let statusColor = '#4CAF50';
                    let statusText = `${days} days left`;

                    if (overdue) {
                      statusColor = '#f44336';
                      statusText = `${Math.abs(days)} days overdue`;
                    } else if (days <= 3) {
                      statusColor = '#FF9800';
                      statusText = `${days} days left`;
                    }

                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '12px' }}>
                          <input
                            type="checkbox"
                            checked={selectedBooks.includes(item.id)}
                            onChange={() => handleSelectBook(item.id)}
                          />
                        </td>
                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{item.members?.name}</td>
                        <td style={{ padding: '12px', fontSize: '12px' }}>{item.members?.email || 'No email'}</td>
                        <td style={{ padding: '12px' }}>{item.books?.title}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {new Date(item.due_date).toLocaleDateString('en-IN')}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: statusColor + '20',
                            color: statusColor,
                            fontWeight: 'bold',
                            fontSize: '12px'
                          }}>
                            {statusText}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '20px' }}>
            <h2>Email History ({emailHistory.length})</h2>
          </div>
          {emailHistory.length === 0 ? (
            <p style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No email history</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Date</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Message</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {emailHistory.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px' }}>{formatDate(item.transaction_date)}</td>
                    <td style={{ padding: '12px' }}>{item.item_name}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: '#d4edda',
                        color: '#155724',
                        fontWeight: 'bold',
                        fontSize: '12px'
                      }}>
                        ✓ Sent
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}