import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import BarcodeScanner from '../BarcodeScanner';
import { supabase } from '../utils/supabase';

const FINE_PER_DAY = 10;
const TIER_DAYS = { basic: 7, silver: 14, gold: 21, premium: 21 };
const CONDITIONS = ['New', 'Good', 'Fair', 'Poor', 'Damaged'];

function getTier(m) {
  if (m.plan) return m.plan.toLowerCase();
  if ((m.borrow_limit || 2) >= 5) return 'gold';
  if ((m.borrow_limit || 2) >= 3) return 'silver';
  return 'basic';
}

function getLoanDays(m) {
  return TIER_DAYS[getTier(m)] || 14;
}

function daysOverdue(dueDate) {
  const diff = Math.floor((new Date() - new Date(dueDate)) / 86400000);
  return diff > 0 ? diff : 0;
}

function isOverdue(dueDate) {
  return new Date(dueDate) < new Date();
}

function isDueToday(dueDate) {
  return new Date(dueDate).toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
}

function isDueThisWeek(dueDate) {
  const d = new Date(dueDate);
  const today = new Date();
  const weekLater = new Date();
  weekLater.setDate(today.getDate() + 7);
  return d >= today && d <= weekLater;
}

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function tierColor(m) {
  const t = getTier(m);
  if (t === 'gold' || t === 'premium') return '#f39c12';
  if (t === 'silver') return '#7f8c8d';
  return '#95a5a6';
}

export default function Borrow() {
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('checkout');
  const [members, setMembers] = useState([]);
  const [books, setBooks] = useState([]);
  const [circulationData, setCirculationData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalOut: 0, overdue: 0, dueToday: 0, returnedToday: 0 });

  // Checkout state
  const [memberSearch, setMemberSearch] = useState('');
  const [bookSearch, setBookSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [dueDate, setDueDate] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [bookResults, setBookResults] = useState([]);

  // Child borrowing state
  const [childrenOfMember, setChildrenOfMember] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null); // null = borrowing for parent
  const [hasChildIdCol, setHasChildIdCol] = useState(false);

  // Active borrows filters
  const [filter, setFilter] = useState('all');
  const [activeSearch, setActiveSearch] = useState('');

  // Modals
  const [returnModal, setReturnModal] = useState(null);
  const [returnCondition, setReturnCondition] = useState('Good');
  const [collectFine, setCollectFine] = useState(false);
  const [receiptModal, setReceiptModal] = useState(null);
  const [renewalModal, setRenewalModal] = useState(null);
  const [renewalDueDate, setRenewalDueDate] = useState('');

  // Scanner
  const [showScanner, setShowScanner] = useState(false);
  const [scannerMode, setScannerMode] = useState('book');

  // Toast
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  };

  // Keyboard shortcuts: Ctrl+B = checkout, Ctrl+R = active
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); setActiveTab('checkout'); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') { e.preventDefault(); setActiveTab('active'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    fetchData();
    probeChildIdColumn();
  }, []);

  // Pre-select parent + child if navigated from ChildProfile
  useEffect(() => {
    if (location.state?.parentId && members.length > 0) {
      const parent = members.find(m => m.id === location.state.parentId);
      if (parent) {
        selectMember(parent);
        // Child will be pre-selected after children load via selectMember's fetchChildren
      }
    }
  }, [location.state, members]);

  // Pre-select child after children load (from ChildProfile navigation)
  useEffect(() => {
    if (location.state?.childId && childrenOfMember.length > 0) {
      const child = childrenOfMember.find(c => c.id === location.state.childId);
      if (child) setSelectedChild(child);
    }
  }, [location.state, childrenOfMember]);

  const probeChildIdColumn = async () => {
    const { error } = await supabase.from('circulation').select('child_id').limit(0);
    setHasChildIdCol(!error);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const [
        { data: membersData },
        { data: booksData },
        { data: circData },
        { count: returnedToday },
      ] = await Promise.all([
        supabase.from('members').select('*').order('name'),
        supabase.from('books').select('*').order('title'),
        supabase
          .from('circulation')
          .select('*, members(name, plan, borrow_limit, phone), books(title, book_image, author)')
          .eq('status', 'checked_out')
          .order('due_date', { ascending: true }),
        supabase
          .from('circulation')
          .select('*', { count: 'exact' })
          .eq('status', 'returned')
          .eq('return_date', today),
      ]);

      setMembers(membersData || []);
      setBooks(booksData || []);
      setCirculationData(circData || []);
      console.log('[Borrow] Fetched:', { members: (membersData||[]).length, books: (booksData||[]).length, circulation: (circData||[]).length, returnedToday });

      const cd = circData || [];
      setStats({
        totalOut: cd.length,
        overdue: cd.filter(c => isOverdue(c.due_date)).length,
        dueToday: cd.filter(c => isDueToday(c.due_date)).length,
        returnedToday: returnedToday || 0,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Member search
  useEffect(() => {
    if (!memberSearch.trim()) { setMemberResults([]); return; }
    const q = memberSearch.toLowerCase();
    setMemberResults(
      members.filter(m =>
        m.name?.toLowerCase().includes(q) ||
        m.phone?.includes(q) ||
        String(m.id).toLowerCase().includes(q)
      ).slice(0, 6)
    );
  }, [memberSearch, members]);

  // Book search
  useEffect(() => {
    if (!bookSearch.trim()) { setBookResults([]); return; }
    const q = bookSearch.toLowerCase();
    setBookResults(
      books.filter(b =>
        b.title?.toLowerCase().includes(q) ||
        b.author?.toLowerCase().includes(q) ||
        b.isbn?.toLowerCase?.().includes(q)
      ).slice(0, 6)
    );
  }, [bookSearch, books]);

  const fetchChildrenForMember = async (memberId) => {
    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('parent_member_id', memberId)
        .order('created_at');
      if (!error) setChildrenOfMember(data || []);
    } catch {
      setChildrenOfMember([]);
    }
  };

  const selectMember = (m) => {
    setSelectedMember(m);
    setMemberSearch(m.name);
    setMemberResults([]);
    setSelectedChild(null);
    setChildrenOfMember([]);
    const d = new Date();
    d.setDate(d.getDate() + getLoanDays(m));
    setDueDate(d.toISOString().split('T')[0]);
    fetchChildrenForMember(m.id);
  };

  const selectBook = (b) => {
    setSelectedBook(b);
    setBookSearch(b.title);
    setBookResults([]);
  };

  const getMemberBorrows = (memberId) =>
    circulationData.filter(c => c.member_id === memberId).length;

  const getMemberFines = (memberId) =>
    circulationData
      .filter(c => c.member_id === memberId && isOverdue(c.due_date))
      .reduce((sum, c) => sum + daysOverdue(c.due_date) * FINE_PER_DAY, 0);

  const handleCheckout = async () => {
    if (!selectedMember || !selectedBook || !dueDate) {
      showToast('Please select a member, book, and due date', 'error');
      return;
    }
    const currentBorrows = getMemberBorrows(selectedMember.id);
    if (currentBorrows >= (selectedMember.borrow_limit || 2)) {
      showToast(`Member has reached their borrow limit (${selectedMember.borrow_limit})`, 'error');
      return;
    }
    if (selectedBook.quantity_available <= 0) {
      showToast('Book is not available', 'error');
      return;
    }
    try {
      const circRecord = {
        member_id: selectedMember.id,
        book_id: selectedBook.id,
        checkout_date: new Date().toISOString().split('T')[0],
        due_date: dueDate,
        status: 'checked_out',
      };

      // Include child_id if borrowing on behalf of a child
      if (selectedChild && hasChildIdCol) {
        circRecord.child_id = selectedChild.id;
      }

      // Try insert — if columns like renewal_count or child_id don't exist, retry without them
      let { error } = await supabase.from('circulation').insert([circRecord]);
      if (error) {
        delete circRecord.child_id;
        const { error: e2 } = await supabase.from('circulation').insert([circRecord]);
        if (e2) throw e2;
      }

      await supabase
        .from('books')
        .update({ quantity_available: selectedBook.quantity_available - 1 })
        .eq('id', selectedBook.id);

      setReceiptModal({ member: selectedMember, book: selectedBook, dueDate, child: selectedChild });
      setSelectedMember(null);
      setSelectedBook(null);
      setSelectedChild(null);
      setChildrenOfMember([]);
      setMemberSearch('');
      setBookSearch('');
      setDueDate('');
      fetchData();
    } catch (err) {
      showToast('Checkout failed: ' + err.message, 'error');
    }
  };

  const openReturn = (item) => {
    setReturnModal(item);
    setReturnCondition('Good');
    setCollectFine(false);
  };

  const handleReturn = async () => {
    if (!returnModal) return;
    const fine = daysOverdue(returnModal.due_date) * FINE_PER_DAY;
    const today = new Date().toISOString().split('T')[0];
    try {
      const updates = {
        status: 'returned',
        return_date: today,
        fine_amount: fine,
        fine_paid: collectFine,
      };

      const { error } = await supabase.from('circulation').update(updates).eq('id', returnModal.id);
      if (error) throw error;

      const book = books.find(b => b.id === returnModal.book_id);
      if (book) {
        await supabase
          .from('books')
          .update({ quantity_available: book.quantity_available + 1 })
          .eq('id', returnModal.book_id);
      }

      // Notify next reservation
      const { data: nextRes } = await supabase
        .from('reservations')
        .select('id')
        .eq('book_id', returnModal.book_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1);

      if (nextRes && nextRes.length > 0) {
        const expires = new Date();
        expires.setHours(expires.getHours() + 48);
        const { error: re } = await supabase
          .from('reservations')
          .update({ status: 'available', expires_at: expires.toISOString() })
          .eq('id', nextRes[0].id);
        if (re) {
          await supabase.from('reservations').update({ status: 'available' }).eq('id', nextRes[0].id);
        }
        showToast('Book returned! A reservation is now available (48h window).', 'success');
      } else {
        showToast('Book returned successfully!', 'success');
      }

      setReturnModal(null);
      fetchData();
    } catch (err) {
      showToast('Return failed: ' + err.message, 'error');
    }
  };

  const openRenewal = (item) => {
    setRenewalModal(item);
    const d = new Date(item.due_date);
    d.setDate(d.getDate() + 14);
    setRenewalDueDate(d.toISOString().split('T')[0]);
  };

  const handleRenewal = async () => {
    if (!renewalModal || !renewalDueDate) return;
    if ((renewalModal.renewal_count || 0) >= 3) {
      showToast('Max 3 renewals allowed', 'error');
      return;
    }
    if (new Date(renewalDueDate) < new Date()) {
      showToast('Due date cannot be in the past', 'error');
      return;
    }
    try {
      const { error } = await supabase
        .from('circulation')
        .update({
          due_date: renewalDueDate,
          renewal_count: (renewalModal.renewal_count || 0) + 1,
          last_renewed_date: new Date().toISOString(),
        })
        .eq('id', renewalModal.id);
      if (error) throw error;
      showToast('Renewed! New due: ' + new Date(renewalDueDate).toLocaleDateString('en-IN'));
      setRenewalModal(null);
      fetchData();
    } catch (err) {
      showToast('Renewal failed: ' + err.message, 'error');
    }
  };

  const filteredCirculation = circulationData.filter(c => {
    const matchSearch = !activeSearch ||
      c.members?.name?.toLowerCase().includes(activeSearch.toLowerCase()) ||
      c.books?.title?.toLowerCase().includes(activeSearch.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'overdue') return isOverdue(c.due_date);
    if (filter === 'today') return isDueToday(c.due_date);
    if (filter === 'week') return isDueThisWeek(c.due_date);
    return true;
  });

  const getRowBg = (dueDate) => {
    if (isOverdue(dueDate)) return '#fff5f5';
    const diff = Math.floor((new Date(dueDate) - new Date()) / 86400000);
    if (diff <= 3) return '#fffcf0';
    return 'white';
  };

  const getStatusBadge = (dueDate) => {
    if (isOverdue(dueDate)) return { label: `⚠️ ${daysOverdue(dueDate)}d overdue`, bg: '#f8d7da', color: '#721c24' };
    if (isDueToday(dueDate)) return { label: '📅 Due today', bg: '#fff3cd', color: '#856404' };
    const diff = Math.floor((new Date(dueDate) - new Date()) / 86400000);
    if (diff <= 3) return { label: `⏰ In ${diff}d`, bg: '#fff3cd', color: '#856404' };
    return { label: '✓ On time', bg: '#d4edda', color: '#155724' };
  };

  const inputStyle = {
    padding: '9px 12px', border: '2px solid #e0e0e0', borderRadius: '6px',
    fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box',
  };

  const btnPrimary = {
    padding: '9px 18px', background: '#667eea', color: 'white',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px',
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: '70px', right: '20px', zIndex: 9999,
          background: toast.type === 'error' ? '#e74c3c' : '#27ae60',
          color: 'white', padding: '12px 20px', borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)', fontSize: '14px', fontWeight: '500',
          maxWidth: '340px',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '4px' }}>📚 Borrow Management</h1>
          <p style={{ color: '#aaa', fontSize: '12px' }}>Ctrl+B = New Checkout &nbsp;·&nbsp; Ctrl+R = Active Borrows</p>
        </div>
        <button onClick={fetchData} disabled={loading} style={{ ...btnPrimary, padding: '8px 16px' }}>
          {loading ? '⏳' : '🔄 Refresh'}
        </button>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total Out', value: stats.totalOut, icon: '📖', color: '#667eea' },
          { label: 'Overdue', value: stats.overdue, icon: '⚠️', color: '#e74c3c' },
          { label: 'Due Today', value: stats.dueToday, icon: '📅', color: '#f39c12' },
          { label: 'Returned Today', value: stats.returnedToday, icon: '✓', color: '#27ae60' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'white', borderRadius: '8px', padding: '14px 18px',
            borderLeft: `4px solid ${s.color}`, display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <span style={{ fontSize: '22px' }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '3px' }}>{s.label.toUpperCase()}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ background: 'white', borderRadius: '8px', padding: '6px', width: 'fit-content', marginBottom: '20px', display: 'flex', gap: '4px' }}>
        {[['checkout', '➕ New Checkout'], ['active', `📚 Active (${circulationData.length})`]].map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '8px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px',
            background: activeTab === tab ? '#667eea' : 'transparent',
            color: activeTab === tab ? 'white' : '#666',
            fontWeight: activeTab === tab ? '600' : '400',
          }}>{label}</button>
        ))}
      </div>

      {/* ─── CHECKOUT TAB ─── */}
      {activeTab === 'checkout' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

          {/* Member panel */}
          <div style={{ background: 'white', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '700' }}>👤 Select Member</h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                placeholder="Search by name, phone, or ID..."
                value={memberSearch}
                onChange={e => { setMemberSearch(e.target.value); if (selectedMember) setSelectedMember(null); }}
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>

            {/* Search results */}
            {memberResults.length > 0 && !selectedMember && (
              <div style={{ border: '1px solid #e0e0e0', borderRadius: '6px', overflow: 'hidden', marginBottom: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                {memberResults.map(m => {
                  const borrows = getMemberBorrows(m.id);
                  const fines = getMemberFines(m.id);
                  const atLimit = borrows >= (m.borrow_limit || 2);
                  return (
                    <div key={m.id} onClick={() => selectMember(m)} style={{
                      padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                      borderBottom: '1px solid #f5f5f5',
                      background: atLimit ? '#fff5f5' : 'white',
                    }}>
                      <div style={{
                        width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                        background: tierColor(m), color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: '700', fontSize: '12px',
                      }}>{initials(m.name)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: '600', fontSize: '13px' }}>{m.name}</div>
                        <div style={{ fontSize: '11px', color: '#999' }}>
                          {m.phone} · {borrows}/{m.borrow_limit} books{fines > 0 ? ` · ₹${fines} fine` : ''}
                        </div>
                      </div>
                      {atLimit && <span style={{ fontSize: '10px', color: '#e74c3c', fontWeight: '700', background: '#f8d7da', padding: '2px 6px', borderRadius: '8px' }}>LIMIT</span>}
                      {fines > 0 && !atLimit && <span style={{ fontSize: '10px', color: '#f39c12', fontWeight: '700', background: '#fff3cd', padding: '2px 6px', borderRadius: '8px' }}>FINES</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Selected member card */}
            {selectedMember && (() => {
              const borrows = getMemberBorrows(selectedMember.id);
              const fines = getMemberFines(selectedMember.id);
              const atLimit = borrows >= (selectedMember.borrow_limit || 2);
              return (
                <div style={{ border: `2px solid ${atLimit ? '#e74c3c' : '#667eea'}`, borderRadius: '8px', padding: '14px', background: atLimit ? '#fff5f5' : '#f5f7ff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                      background: tierColor(selectedMember), color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: '700', fontSize: '16px',
                    }}>{initials(selectedMember.name)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '16px' }}>{selectedMember.name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {selectedMember.phone} · {getTier(selectedMember).toUpperCase()} · {getLoanDays(selectedMember)}-day loan
                      </div>
                    </div>
                    <button onClick={() => { setSelectedMember(null); setMemberSearch(''); setDueDate(''); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '20px', padding: '0 4px' }}>×</button>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ background: atLimit ? '#f8d7da' : '#d4edda', color: atLimit ? '#721c24' : '#155724', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                      {borrows}/{selectedMember.borrow_limit} books out
                    </span>
                    {fines > 0 && (
                      <span style={{ background: '#fff3cd', color: '#856404', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                        ₹{fines} outstanding fines
                      </span>
                    )}
                    {atLimit && (
                      <span style={{ background: '#f8d7da', color: '#721c24', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700' }}>
                        ⚠️ At borrow limit
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Book panel */}
          <div style={{ background: 'white', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '700' }}>📖 Select Book</h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                placeholder="Search by title, author, or ISBN..."
                value={bookSearch}
                onChange={e => { setBookSearch(e.target.value); if (selectedBook) setSelectedBook(null); }}
                style={{ ...inputStyle }}
              />
              <button onClick={() => { setScannerMode('book'); setShowScanner(true); }}
                style={{ padding: '9px 12px', background: '#1dd1a1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>
                📱 Scan
              </button>
            </div>

            {/* Book search results */}
            {bookResults.length > 0 && !selectedBook && (
              <div style={{ border: '1px solid #e0e0e0', borderRadius: '6px', overflow: 'hidden', marginBottom: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                {bookResults.map(b => (
                  <div key={b.id} onClick={() => b.quantity_available > 0 && selectBook(b)} style={{
                    padding: '10px 14px', cursor: b.quantity_available > 0 ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    borderBottom: '1px solid #f5f5f5',
                    opacity: b.quantity_available > 0 ? 1 : 0.45,
                  }}>
                    {b.book_image ? (
                      <img src={b.book_image} alt={b.title} style={{ width: '32px', height: '46px', objectFit: 'cover', borderRadius: '3px', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div style={{ width: '32px', height: '46px', background: '#f0f0f0', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>📖</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '600', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div>
                      <div style={{ fontSize: '11px', color: '#999' }}>{b.author}</div>
                    </div>
                    <span style={{
                      background: b.quantity_available > 0 ? '#d4edda' : '#f8d7da',
                      color: b.quantity_available > 0 ? '#155724' : '#721c24',
                      padding: '2px 8px', borderRadius: '10px', fontSize: '11px', flexShrink: 0, fontWeight: '600',
                    }}>
                      {b.quantity_available > 0 ? `${b.quantity_available} avail` : 'Out'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Selected book card */}
            {selectedBook && (
              <div style={{ border: '2px solid #667eea', borderRadius: '8px', padding: '14px', background: '#f5f7ff', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                {selectedBook.book_image ? (
                  <img src={selectedBook.book_image} alt={selectedBook.title} style={{ width: '50px', height: '70px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />
                ) : (
                  <div style={{ width: '50px', height: '70px', background: '#e8f0ff', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>📖</div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '3px' }}>{selectedBook.title}</div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>{selectedBook.author}</div>
                  <span style={{ background: '#d4edda', color: '#155724', padding: '2px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '600' }}>
                    {selectedBook.quantity_available} available
                  </span>
                </div>
                <button onClick={() => { setSelectedBook(null); setBookSearch(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '20px', padding: '0 4px' }}>×</button>
              </div>
            )}
          </div>

          {/* Borrowing for child — full width, shown when member has children */}
          {selectedMember && childrenOfMember.length > 0 && (
            <div style={{ gridColumn: '1 / -1', background: 'white', borderRadius: '8px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', border: '2px solid #e8f4fd' }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#555', whiteSpace: 'nowrap' }}>📋 Borrowing for:</span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setSelectedChild(null)}
                  style={{
                    padding: '7px 16px', border: '2px solid', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                    borderColor: !selectedChild ? '#667eea' : '#ddd',
                    background: !selectedChild ? '#667eea' : 'white',
                    color: !selectedChild ? 'white' : '#555',
                  }}
                >
                  👤 {selectedMember.name} (myself)
                </button>
                {childrenOfMember.map((child, idx) => {
                  const CHILD_COLORS = ['#3498db', '#27ae60', '#9b59b6', '#f39c12', '#e91e63'];
                  const color = CHILD_COLORS[idx % CHILD_COLORS.length];
                  const active = selectedChild?.id === child.id;
                  return (
                    <button
                      key={child.id}
                      onClick={() => setSelectedChild(child)}
                      style={{
                        padding: '7px 16px', border: `2px solid ${active ? color : '#ddd'}`, borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                        background: active ? color : 'white',
                        color: active ? 'white' : '#555',
                      }}
                    >
                      {child.relationship === 'Daughter' ? '👧' : '👦'} {child.name}
                    </button>
                  );
                })}
              </div>
              {selectedChild && (
                <span style={{ fontSize: '12px', color: '#27ae60', fontWeight: '600', marginLeft: 'auto' }}>
                  ✓ Book will appear under {selectedChild.name}'s profile
                </span>
              )}
              {!hasChildIdCol && (
                <span style={{ fontSize: '11px', color: '#f39c12', marginLeft: 'auto' }}>
                  ⚠️ child_id column missing — borrow will use parent account only
                </span>
              )}
            </div>
          )}

          {/* Due date + checkout — full width */}
          <div style={{ gridColumn: '1 / -1', background: 'white', borderRadius: '8px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#888', marginBottom: '6px', letterSpacing: '0.5px' }}>DUE DATE</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                style={{ padding: '9px 14px', border: '2px solid #e0e0e0', borderRadius: '6px', fontSize: '14px' }} />
            </div>
            {selectedMember && (
              <div style={{ fontSize: '12px', color: '#667eea', background: '#f0f3ff', padding: '6px 12px', borderRadius: '6px' }}>
                Auto-set to <strong>{getLoanDays(selectedMember)} days</strong> ({getTier(selectedMember)} tier)
              </div>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
              {selectedMember && selectedBook && (
                <div style={{ fontSize: '13px', color: '#555' }}>
                  <strong>{selectedMember.name}</strong> ← <strong>{selectedBook.title}</strong>
                </div>
              )}
              <button
                onClick={handleCheckout}
                disabled={!selectedMember || !selectedBook || !dueDate}
                style={{
                  padding: '11px 32px', fontWeight: '700', fontSize: '15px',
                  background: (!selectedMember || !selectedBook || !dueDate) ? '#ccc' : '#667eea',
                  color: 'white', border: 'none', borderRadius: '6px',
                  cursor: (!selectedMember || !selectedBook || !dueDate) ? 'not-allowed' : 'pointer',
                }}>
                ✓ Checkout Book
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ACTIVE BORROWS TAB ─── */}
      {activeTab === 'active' && (
        <div>
          {/* Filter bar */}
          <div style={{ background: 'white', borderRadius: '8px', padding: '12px 16px', marginBottom: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              placeholder="🔍 Search member or book..."
              value={activeSearch}
              onChange={e => setActiveSearch(e.target.value)}
              style={{ padding: '7px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', width: '220px' }}
            />
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                ['all', `All (${circulationData.length})`],
                ['overdue', `⚠️ Overdue (${stats.overdue})`],
                ['today', `📅 Due Today (${stats.dueToday})`],
                ['week', '📆 This Week'],
              ].map(([key, label]) => (
                <button key={key} onClick={() => setFilter(key)} style={{
                  padding: '6px 14px', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '12px',
                  background: filter === key ? '#667eea' : '#f0f0f0',
                  color: filter === key ? 'white' : '#666',
                  fontWeight: filter === key ? '600' : '400',
                }}>{label}</button>
              ))}
            </div>
            <div style={{ marginLeft: 'auto', fontSize: '13px', color: '#999' }}>
              {filteredCirculation.length} record{filteredCirculation.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>Loading...</div>
            ) : filteredCirculation.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>No borrows found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e8e8e8' }}>
                    {['Member', 'Book', 'Checked Out', 'Due Date', 'Status', 'Renewals', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCirculation.map(item => {
                    const badge = getStatusBadge(item.due_date);
                    const fine = daysOverdue(item.due_date) * FINE_PER_DAY;
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0', background: getRowBg(item.due_date) }}>
                        <td style={{ padding: '11px 14px', fontSize: '14px', fontWeight: '500' }}>
                          {item.members?.name}
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: '13px', color: '#333', maxWidth: '200px' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.books?.title}</div>
                          {item.books?.author && <div style={{ fontSize: '11px', color: '#aaa' }}>{item.books.author}</div>}
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: '12px', color: '#999', whiteSpace: 'nowrap' }}>
                          {new Date(item.checkout_date).toLocaleDateString('en-IN')}
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                          <div>{new Date(item.due_date).toLocaleDateString('en-IN')}</div>
                          {fine > 0 && (
                            <div style={{ fontSize: '11px', color: '#e74c3c', fontWeight: '700' }}>₹{fine} fine</div>
                          )}
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ background: badge.bg, color: badge.color, padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: (item.renewal_count || 0) >= 3 ? '#e74c3c' : '#667eea' }}>
                            {item.renewal_count || 0}/3
                          </span>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => openRenewal(item)}
                              disabled={(item.renewal_count || 0) >= 3}
                              style={{
                                padding: '5px 10px', border: 'none', borderRadius: '5px', fontSize: '12px', fontWeight: '600', cursor: (item.renewal_count || 0) >= 3 ? 'not-allowed' : 'pointer',
                                background: (item.renewal_count || 0) >= 3 ? '#f5f5f5' : '#e8f0ff',
                                color: (item.renewal_count || 0) >= 3 ? '#ccc' : '#667eea',
                              }}>
                              ♻️ Renew
                            </button>
                            <button onClick={() => openReturn(item)} style={{ padding: '5px 10px', background: '#e8faf0', color: '#27ae60', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                              ✓ Return
                            </button>
                          </div>
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

      {/* ─── BARCODE SCANNER ─── */}
      {showScanner && (
        <BarcodeScanner
          onScan={(data) => {
            if (scannerMode === 'member') {
              const m = members.find(x => x.phone === data || x.id === data);
              if (m) { selectMember(m); setShowScanner(false); }
              else showToast('Member not found', 'error');
            } else {
              const b = books.find(x => x.book_id === data || x.id === data);
              if (b) { selectBook(b); setShowScanner(false); }
              else showToast('Book not found', 'error');
            }
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* ─── CHECKOUT RECEIPT MODAL ─── */}
      {receiptModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
          onClick={() => setReceiptModal(null)}>
          <div style={{ background: 'white', borderRadius: '10px', padding: '32px', maxWidth: '380px', width: '90%', fontFamily: 'monospace' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px dashed #ddd' }}>
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>📚</div>
              <div style={{ fontSize: '18px', fontWeight: '700' }}>TAPAS LIBRARY</div>
              <div style={{ fontSize: '12px', color: '#888' }}>Checkout Receipt</div>
            </div>
            <div style={{ fontSize: '13px', lineHeight: '2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Member:</span>
                <span style={{ fontWeight: '700' }}>{receiptModal.member.name}</span>
              </div>
              {receiptModal.child && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>For:</span>
                  <span style={{ fontWeight: '700', color: '#667eea' }}>👦 {receiptModal.child.name}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Book:</span>
                <span style={{ fontWeight: '700', maxWidth: '200px', textAlign: 'right' }}>{receiptModal.book.title}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Checkout:</span>
                <span>{new Date().toLocaleDateString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Due Date:</span>
                <span style={{ fontWeight: '700', color: '#e74c3c' }}>{new Date(receiptModal.dueDate).toLocaleDateString('en-IN')}</span>
              </div>
            </div>
            <div style={{ borderTop: '2px dashed #ddd', marginTop: '16px', paddingTop: '14px', textAlign: 'center', fontSize: '12px', color: '#888' }}>
              Late fine: ₹{FINE_PER_DAY}/day after due date
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
              <button onClick={() => window.print()} style={{ flex: 1, padding: '10px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                🖨️ Print
              </button>
              <button onClick={() => setReceiptModal(null)} style={{ flex: 1, padding: '10px', background: '#f0f0f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── RETURN MODAL ─── */}
      {returnModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
          onClick={() => setReturnModal(null)}>
          <div style={{ background: 'white', borderRadius: '10px', padding: '28px', maxWidth: '480px', width: '90%' }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>✓ Return Book</h2>
            <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '14px', marginBottom: '16px', fontSize: '13px', lineHeight: '1.9' }}>
              <div><strong>Member:</strong> {returnModal.members?.name}</div>
              <div><strong>Book:</strong> {returnModal.books?.title}</div>
              <div><strong>Due Date:</strong> {new Date(returnModal.due_date).toLocaleDateString('en-IN')}</div>
              {isOverdue(returnModal.due_date) ? (
                <div style={{ marginTop: '8px', background: '#f8d7da', borderRadius: '6px', padding: '8px 12px', color: '#721c24', fontWeight: '700' }}>
                  ⚠️ {daysOverdue(returnModal.due_date)} days overdue &nbsp;·&nbsp; Fine: ₹{daysOverdue(returnModal.due_date) * FINE_PER_DAY}
                </div>
              ) : (
                <div style={{ marginTop: '8px', color: '#27ae60', fontWeight: '600' }}>✓ Returned on time — no fine</div>
              )}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#888', marginBottom: '8px', letterSpacing: '0.5px' }}>
                BOOK CONDITION ON RETURN
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {CONDITIONS.map(c => (
                  <button key={c} onClick={() => setReturnCondition(c)} style={{
                    padding: '6px 14px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
                    background: returnCondition === c ? '#667eea' : '#f0f0f0',
                    color: returnCondition === c ? 'white' : '#555',
                    fontWeight: returnCondition === c ? '600' : '400',
                  }}>{c}</button>
                ))}
              </div>
            </div>

            {isOverdue(returnModal.due_date) && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                  <input type="checkbox" checked={collectFine} onChange={e => setCollectFine(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  Collect fine of ₹{daysOverdue(returnModal.due_date) * FINE_PER_DAY} now
                </label>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setReturnModal(null)} style={{ flex: 1, padding: '10px', background: '#f0f0f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleReturn} style={{ flex: 1, padding: '10px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                ✓ Confirm Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── RENEWAL MODAL ─── */}
      {renewalModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
          onClick={() => setRenewalModal(null)}>
          <div style={{ background: 'white', borderRadius: '10px', padding: '28px', maxWidth: '420px', width: '90%' }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>♻️ Renew Book</h2>
            <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '14px', marginBottom: '16px', fontSize: '13px', lineHeight: '1.9' }}>
              <div><strong>Member:</strong> {renewalModal.members?.name}</div>
              <div><strong>Book:</strong> {renewalModal.books?.title}</div>
              <div><strong>Current Due:</strong> {new Date(renewalModal.due_date).toLocaleDateString('en-IN')}</div>
              <div><strong>Renewals used:</strong> {renewalModal.renewal_count || 0} / 3</div>
            </div>
            {(renewalModal.renewal_count || 0) >= 3 && (
              <div style={{ background: '#f8d7da', color: '#721c24', padding: '10px 14px', borderRadius: '6px', marginBottom: '14px', fontWeight: '700', fontSize: '13px' }}>
                ✗ Maximum renewals reached. Please return the book.
              </div>
            )}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#888', marginBottom: '6px', letterSpacing: '0.5px' }}>NEW DUE DATE</label>
              <input type="date" value={renewalDueDate} onChange={e => setRenewalDueDate(e.target.value)}
                disabled={(renewalModal.renewal_count || 0) >= 3}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', background: (renewalModal.renewal_count || 0) >= 3 ? '#f5f5f5' : 'white' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setRenewalModal(null)} style={{ flex: 1, padding: '10px', background: '#f0f0f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleRenewal}
                disabled={(renewalModal.renewal_count || 0) >= 3}
                style={{
                  flex: 1, padding: '10px', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600',
                  background: (renewalModal.renewal_count || 0) >= 3 ? '#ccc' : '#667eea',
                  cursor: (renewalModal.renewal_count || 0) >= 3 ? 'not-allowed' : 'pointer',
                }}>
                ♻️ Renew
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
