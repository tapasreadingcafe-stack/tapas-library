import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { usePermission } from '../hooks/usePermission';
import ViewOnlyBanner from '../components/ViewOnlyBanner';
import { getFineSettings, calculateFine } from '../utils/fineUtils';
import { useToast } from '../components/Toast';

export default function Fines() {
  const { isReadOnly, canProcessFines } = usePermission();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('outstanding');
  const [outstanding, setOutstanding] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMember, setFilterMember] = useState('');
  const [members, setMembers] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [fineSettings, setFineSettings] = useState({ ratePerDay: 10, gracePeriod: 0, maxFine: 0 });
  const [modalMode, setModalMode] = useState('pay'); // 'pay' | 'waive'
  const [customAmount, setCustomAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAll();
    getFineSettings().then(setFineSettings);
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      const [{ data: overdueData }, { data: paidData }, { data: membersData }] = await Promise.all([
        // Outstanding: still checked out and overdue
        supabase
          .from('circulation')
          .select('*, members(id, name, phone, email), books(title, author)')
          .eq('status', 'checked_out')
          .lt('due_date', todayStr)
          .order('due_date', { ascending: true }),
        // History: returned books that had a fine
        supabase
          .from('circulation')
          .select('*, members(id, name, phone, email), books(title, author)')
          .eq('status', 'returned')
          .gt('fine_amount', 0)
          .order('return_date', { ascending: false })
          .limit(200),
        supabase.from('members').select('id, name').eq('status', 'active').order('name'),
      ]);

      const calcFine = (dueDate) => {
        return calculateFine(dueDate, fineSettings).fineAmount;
      };

      const withFines = (overdueData || []).map(item => ({
        ...item,
        daysOverdue: Math.max(0, Math.floor((today - new Date(item.due_date)) / 86400000)),
        calculatedFine: calcFine(item.due_date),
      }));

      setOutstanding(withFines);
      setHistory(paidData || []);
      setMembers(membersData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (item, mode) => {
    setSelectedItem(item);
    setModalMode(mode);
    setCustomAmount(item.calculatedFine?.toString() || item.fine_amount?.toString() || '0');
    setShowModal(true);
  };

  const handleConfirm = async () => {
    if (!selectedItem) return;
    setSaving(true);
    try {
      const amount = parseFloat(customAmount) || 0;
      if (modalMode === 'pay') {
        const { error } = await supabase
          .from('circulation')
          .update({ fine_paid: true, fine_amount: amount })
          .eq('id', selectedItem.id);
        if (error) throw error;
        // Also log in transactions table for POS integration
        await supabase.from('transactions').insert({
          member_id: selectedItem.member_id,
          transaction_type: 'fine',
          item_name: `Overdue fine: ${selectedItem.books?.title}`,
          item_type: 'fine',
          quantity: 1,
          amount,
          transaction_date: new Date().toISOString(),
          status: 'completed',
        }).then(() => {}); // Ignore error if transactions table has different schema
      } else {
        // Waive
        const { error } = await supabase
          .from('circulation')
          .update({ fine_paid: true, fine_amount: 0 })
          .eq('id', selectedItem.id);
        if (error) throw error;
      }
      setShowModal(false);
      fetchAll();
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Filtered lists
  const applyFilters = (list) => {
    return list.filter(item => {
      const term = searchTerm.toLowerCase();
      const matchSearch = !term ||
        item.members?.name?.toLowerCase().includes(term) ||
        item.books?.title?.toLowerCase().includes(term) ||
        item.members?.phone?.includes(searchTerm);
      const matchMember = !filterMember || item.member_id === filterMember;
      const itemDate = item.due_date || item.return_date || '';
      const matchFrom = !dateFrom || itemDate >= dateFrom;
      const matchTo = !dateTo || itemDate <= dateTo;
      return matchSearch && matchMember && matchFrom && matchTo;
    });
  };

  const filteredOutstanding = applyFilters(outstanding);
  const filteredHistory = applyFilters(history);

  const totalOutstanding = filteredOutstanding.reduce((s, i) => s + i.calculatedFine, 0);
  const totalCollected = filteredHistory.filter(i => i.fine_paid && i.fine_amount > 0).reduce((s, i) => s + (i.fine_amount || 0), 0);
  const totalWaived = filteredHistory.filter(i => i.fine_paid && i.fine_amount === 0).length;

  const tabStyle = (tab) => ({
    padding: '8px 20px',
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
    fontWeight: activeTab === tab ? '600' : '400',
    background: activeTab === tab ? '#667eea' : '#f0f0f0',
    color: activeTab === tab ? 'white' : '#666',
    fontSize: '13px',
  });

  const filterRow = (
    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
      <input
        placeholder="Search name, book, phone..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        style={{ padding: '7px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', width: '200px' }}
      />
      <select
        value={filterMember}
        onChange={e => setFilterMember(e.target.value)}
        style={{ padding: '7px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px' }}
      >
        <option value="">All Members</option>
        {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
      <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
        style={{ padding: '7px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px' }} />
      <span style={{ color: '#999', fontSize: '13px' }}>to</span>
      <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
        style={{ padding: '7px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px' }} />
      {(searchTerm || filterMember || dateFrom || dateTo) && (
        <button onClick={() => { setSearchTerm(''); setFilterMember(''); setDateFrom(''); setDateTo(''); }}
          style={{ padding: '7px 12px', background: '#fee', border: '1px solid #fcc', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#c0392b' }}>
          ✕ Clear
        </button>
      )}
    </div>
  );

  return (
    <div style={{ padding: '20px' }}>
      {isReadOnly && <ViewOnlyBanner />}
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '4px' }}>💰 Fine & Payment Management</h1>
          <p style={{ color: '#999', fontSize: '14px' }}>Auto-calculated at ₹{fineSettings.ratePerDay}/day{fineSettings.gracePeriod > 0 ? ` (${fineSettings.gracePeriod}-day grace period)` : ''}. Track, collect, or waive overdue fines.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => {
            const csv = ['Member,Book,Days Overdue,Fine Amount', ...outstanding.map(f => `"${f.memberName}","${f.bookTitle}",${f.daysOverdue},${f.fineAmount}`)].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'outstanding_fines.csv'; a.click();
          }} style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
            📥 Export Fines
          </button>
          <button onClick={fetchAll} disabled={loading}
            style={{ padding: '8px 16px', background: '#f0f0f0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Outstanding Fines', value: `₹${totalOutstanding.toLocaleString('en-IN')}`, color: '#e74c3c', icon: '⚠️' },
          { label: 'Books Overdue', value: outstanding.length, color: '#f39c12', icon: '📚' },
          { label: 'Fines Collected', value: `₹${totalCollected.toLocaleString('en-IN')}`, color: '#27ae60', icon: '✅' },
          { label: 'Fines Waived', value: totalWaived, color: '#3498db', icon: '🤝' },
          { label: 'Rate per Day', value: `₹${fineSettings.ratePerDay}`, color: '#9b59b6', icon: '📅' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', borderRadius: '8px', padding: '16px', borderTop: `3px solid ${s.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '20px' }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '3px' }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ background: 'white', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setActiveTab('outstanding')} style={tabStyle('outstanding')}>
              Outstanding ({outstanding.length})
            </button>
            <button onClick={() => setActiveTab('history')} style={tabStyle('history')}>
              History ({history.length})
            </button>
            <button onClick={() => setActiveTab('report')} style={tabStyle('report')}>
              By Member
            </button>
          </div>
          {filterRow}
        </div>
      </div>

      {/* Outstanding fines */}
      {activeTab === 'outstanding' && (
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>Loading fines...</div>
          ) : filteredOutstanding.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
              <div style={{ fontSize: '40px' }}>✅</div>
              <div style={{ marginTop: '10px' }}>No outstanding fines!</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
                  {['Member', 'Book', 'Due Date', 'Days Overdue', 'Fine Amount', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#666', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOutstanding.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0', background: item.daysOverdue > 14 ? '#fff5f5' : 'white' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: '600' }}>{item.members?.name || '—'}</div>
                      <div style={{ fontSize: '12px', color: '#999' }}>{item.members?.phone}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: '14px' }}>{item.books?.title || '—'}</div>
                      <div style={{ fontSize: '12px', color: '#999' }}>{item.books?.author}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '13px', color: '#e74c3c', fontWeight: '600' }}>
                      {new Date(item.due_date).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        background: item.daysOverdue > 14 ? '#fde8e8' : '#fff3cd',
                        color: item.daysOverdue > 14 ? '#c0392b' : '#856404',
                        padding: '2px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: '600'
                      }}>
                        {item.daysOverdue} day{item.daysOverdue !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: '700', fontSize: '15px', color: '#e74c3c' }}>
                      ₹{item.calculatedFine.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => openModal(item, 'pay')} disabled={isReadOnly || !canProcessFines}
                          style={{ padding: '4px 12px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: (isReadOnly || !canProcessFines) ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: '600', opacity: (isReadOnly || !canProcessFines) ? 0.5 : 1 }}>
                          ₹ Collect
                        </button>
                        <button onClick={() => openModal(item, 'waive')} disabled={isReadOnly || !canProcessFines}
                          style={{ padding: '4px 12px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: (isReadOnly || !canProcessFines) ? 'not-allowed' : 'pointer', fontSize: '12px', opacity: (isReadOnly || !canProcessFines) ? 0.5 : 1 }}>
                          🤝 Waive
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8f9fa', borderTop: '2px solid #eee' }}>
                  <td colSpan="4" style={{ padding: '12px 14px', fontWeight: '700', textAlign: 'right', color: '#555' }}>Total Outstanding:</td>
                  <td style={{ padding: '12px 14px', fontWeight: '800', fontSize: '16px', color: '#e74c3c' }}>₹{totalOutstanding.toLocaleString('en-IN')}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* Fine history */}
      {activeTab === 'history' && (
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          {filteredHistory.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>No fine history found.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
                  {['Member', 'Book', 'Returned On', 'Fine Amount', 'Status'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#666', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: '600' }}>{item.members?.name || '—'}</div>
                      <div style={{ fontSize: '12px', color: '#999' }}>{item.members?.phone}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '14px' }}>{item.books?.title || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: '13px', color: '#555' }}>
                      {item.return_date ? new Date(item.return_date).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: '600', color: item.fine_amount > 0 ? '#27ae60' : '#3498db' }}>
                      {item.fine_amount > 0 ? `₹${item.fine_amount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {item.fine_paid && item.fine_amount > 0 ? (
                        <span style={{ background: '#d4edda', color: '#155724', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>✅ Paid</span>
                      ) : item.fine_paid && item.fine_amount === 0 ? (
                        <span style={{ background: '#cce5ff', color: '#004085', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>🤝 Waived</span>
                      ) : (
                        <span style={{ background: '#f8d7da', color: '#721c24', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>Unpaid</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* By-member report */}
      {activeTab === 'report' && (
        <MemberFinesReport outstanding={outstanding} history={history} members={members} />
      )}

      {/* Pay / Waive Modal */}
      {showModal && selectedItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '380px', maxWidth: '95vw' }}>
            <h2 style={{ marginBottom: '6px', fontSize: '20px' }}>
              {modalMode === 'pay' ? '₹ Collect Fine' : '🤝 Waive Fine'}
            </h2>
            <p style={{ color: '#999', fontSize: '13px', marginBottom: '20px' }}>
              {selectedItem.members?.name} — {selectedItem.books?.title}
            </p>

            <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '14px', marginBottom: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                <span style={{ color: '#666' }}>Due Date:</span>
                <span style={{ fontWeight: '600', color: '#e74c3c' }}>{new Date(selectedItem.due_date).toLocaleDateString('en-IN')}</span>
                <span style={{ color: '#666' }}>Days Overdue:</span>
                <span style={{ fontWeight: '600' }}>{selectedItem.daysOverdue}</span>
                <span style={{ color: '#666' }}>Calculated Fine:</span>
                <span style={{ fontWeight: '700', color: '#e74c3c' }}>₹{selectedItem.calculatedFine?.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {modalMode === 'pay' && (
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px' }}>Amount to Collect (₹)</label>
                <input
                  type="number"
                  value={customAmount}
                  onChange={e => setCustomAmount(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '15px', fontWeight: '600' }}
                />
                <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>You can adjust the amount (e.g., for partial payment or discount)</div>
              </div>
            )}

            {modalMode === 'waive' && (
              <div style={{ background: '#e8f4fd', border: '1px solid #bee5eb', borderRadius: '6px', padding: '12px', marginBottom: '18px', fontSize: '13px', color: '#0c5460' }}>
                This will waive the full fine of <strong>₹{selectedItem.calculatedFine?.toLocaleString('en-IN')}</strong> and mark it as resolved.
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)}
                style={{ padding: '9px 20px', background: '#f0f0f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleConfirm} disabled={saving}
                style={{ padding: '9px 20px', background: modalMode === 'pay' ? '#27ae60' : '#3498db', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                {saving ? 'Saving...' : modalMode === 'pay' ? 'Confirm Payment' : 'Confirm Waiver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Member Fines Report sub-component
function MemberFinesReport({ outstanding, history, members }) {
  const memberMap = {};

  outstanding.forEach(item => {
    const id = item.member_id;
    if (!memberMap[id]) memberMap[id] = { member: item.members, outstanding: 0, books: 0, paid: 0 };
    memberMap[id].outstanding += item.calculatedFine || 0;
    memberMap[id].books += 1;
  });

  history.forEach(item => {
    const id = item.member_id;
    if (!memberMap[id]) memberMap[id] = { member: item.members, outstanding: 0, books: 0, paid: 0 };
    memberMap[id].paid += item.fine_amount || 0;
  });

  const rows = Object.entries(memberMap).sort((a, b) => b[1].outstanding - a[1].outstanding);

  if (rows.length === 0) {
    return (
      <div style={{ background: 'white', borderRadius: '8px', padding: '40px', textAlign: 'center', color: '#999' }}>
        No fine data to report.
      </div>
    );
  }

  return (
    <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
            {['Member', 'Phone', 'Books Overdue', 'Outstanding', 'Total Paid'].map(h => (
              <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#666', textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([id, data]) => (
            <tr key={id} style={{ borderBottom: '1px solid #f0f0f0', background: data.outstanding > 0 ? '#fffdf0' : 'white' }}>
              <td style={{ padding: '12px 14px', fontWeight: '600' }}>{data.member?.name || '—'}</td>
              <td style={{ padding: '12px 14px', fontSize: '13px', color: '#666' }}>{data.member?.phone || '—'}</td>
              <td style={{ padding: '12px 14px' }}>
                {data.books > 0 ? (
                  <span style={{ background: '#fff3cd', color: '#856404', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                    {data.books} book{data.books !== 1 ? 's' : ''}
                  </span>
                ) : '—'}
              </td>
              <td style={{ padding: '12px 14px', fontWeight: '700', fontSize: '15px', color: data.outstanding > 0 ? '#e74c3c' : '#27ae60' }}>
                {data.outstanding > 0 ? `₹${data.outstanding.toLocaleString('en-IN')}` : '₹0'}
              </td>
              <td style={{ padding: '12px 14px', fontSize: '14px', color: '#27ae60', fontWeight: '600' }}>
                {data.paid > 0 ? `₹${data.paid.toLocaleString('en-IN')}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
