import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { logActivity, ACTIONS } from '../utils/activityLog';

export default function KioskMode() {
  const [step, setStep] = useState('start'); // start, member, action, book, confirm, done
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [action, setAction] = useState('');
  const [bookSearch, setBookSearch] = useState('');
  const [bookResults, setBookResults] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [activeBorrows, setActiveBorrows] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const memberInputRef = useRef();
  const bookInputRef = useRef();

  useEffect(() => {
    if (step === 'member' && memberInputRef.current) memberInputRef.current.focus();
    if (step === 'book' && bookInputRef.current) bookInputRef.current.focus();
  }, [step]);

  const searchMembers = async (q) => {
    setMemberSearch(q);
    if (q.length < 2) { setMemberResults([]); return; }
    const { data } = await supabase.from('members').select('id, name, phone, plan, borrow_limit').or(`name.ilike.%${q}%,phone.ilike.%${q}%`).eq('status', 'active').limit(5);
    setMemberResults(data || []);
  };

  const selectMember = async (member) => {
    setSelectedMember(member);
    setMemberResults([]);
    const { data } = await supabase.from('circulation').select('id, due_date, books(title, book_image)').eq('member_id', member.id).eq('status', 'checked_out');
    setActiveBorrows(data || []);
    setStep('action');
  };

  const searchBooks = async (q) => {
    setBookSearch(q);
    if (q.length < 2) { setBookResults([]); return; }
    const { data } = await supabase.from('books').select('id, title, author, book_image, quantity_available').or(`title.ilike.%${q}%,author.ilike.%${q}%,isbn.ilike.%${q}%`).gt('quantity_available', 0).limit(5);
    setBookResults(data || []);
  };

  const handleCheckout = async () => {
    if (!selectedMember || !selectedBook) return;
    setProcessing(true);
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);
      const { error } = await supabase.from('circulation').insert([{
        member_id: selectedMember.id,
        book_id: selectedBook.id,
        checkout_date: new Date().toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        status: 'checked_out',
      }]);
      if (error) throw error;
      await supabase.from('books').update({ quantity_available: (selectedBook.quantity_available || 1) - 1 }).eq('id', selectedBook.id);
      logActivity(ACTIONS.BOOK_ISSUED, `Self-checkout: "${selectedBook.title}" to ${selectedMember.name}`, { member_name: selectedMember.name, book_title: selectedBook.title });
      setResult({ type: 'success', msg: `"${selectedBook.title}" checked out!`, detail: `Due: ${dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` });
      setStep('done');
    } catch (err) {
      setResult({ type: 'error', msg: 'Checkout failed', detail: err.message });
      setStep('done');
    }
    setProcessing(false);
  };

  const handleReturn = async (borrow) => {
    setProcessing(true);
    try {
      const { error } = await supabase.from('circulation').update({ status: 'returned', return_date: new Date().toISOString().split('T')[0] }).eq('id', borrow.id);
      if (error) throw error;
      logActivity(ACTIONS.BOOK_RETURNED, `Self-return: "${borrow.books?.title}" by ${selectedMember.name}`, { member_name: selectedMember.name, book_title: borrow.books?.title });
      setResult({ type: 'success', msg: `"${borrow.books?.title}" returned!`, detail: 'Thank you!' });
      setStep('done');
    } catch (err) {
      setResult({ type: 'error', msg: 'Return failed', detail: err.message });
      setStep('done');
    }
    setProcessing(false);
  };

  const reset = () => {
    setStep('start');
    setMemberSearch('');
    setSelectedMember(null);
    setAction('');
    setBookSearch('');
    setSelectedBook(null);
    setActiveBorrows([]);
    setResult(null);
  };

  // Auto-reset after 10 seconds on done
  useEffect(() => {
    if (step === 'done') {
      const timer = setTimeout(reset, 10000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const containerStyle = {
    minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '20px', background: 'linear-gradient(135deg, #667eea15, #764ba215)',
  };

  const cardStyle = {
    background: 'white', borderRadius: '20px', padding: '40px', maxWidth: '500px', width: '100%',
    boxShadow: '0 10px 40px rgba(0,0,0,0.08)', textAlign: 'center',
  };

  return (
    <div style={containerStyle}>
      <style>{`
        @media (max-width: 480px) {
          .kiosk-card { padding: 20px !important; }
          .kiosk-card h1 { font-size: 28px !important; }
          .kiosk-card h2 { font-size: 22px !important; }
        }
      `}</style>

      <div className="kiosk-card" style={cardStyle}>
        {/* START */}
        {step === 'start' && (
          <>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📚</div>
            <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Tapas Reading Cafe</h1>
            <p style={{ color: '#999', fontSize: '16px', marginBottom: '30px' }}>Self-Service Kiosk</p>
            <button onClick={() => setStep('member')}
              style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: '700', cursor: 'pointer' }}>
              Tap to Start
            </button>
          </>
        )}

        {/* MEMBER SEARCH */}
        {step === 'member' && (
          <>
            <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>👤 Who are you?</h2>
            <p style={{ color: '#999', marginBottom: '16px' }}>Enter your name or phone number</p>
            <input ref={memberInputRef} value={memberSearch} onChange={e => searchMembers(e.target.value)}
              placeholder="Search your name or phone..."
              style={{ width: '100%', padding: '14px', border: '2px solid #667eea', borderRadius: '10px', fontSize: '16px', textAlign: 'center', marginBottom: '12px' }} />
            {memberResults.map(m => (
              <button key={m.id} onClick={() => selectMember(m)}
                style={{ width: '100%', padding: '12px', background: '#f8f9ff', border: '1px solid #e0e8ff', borderRadius: '8px', cursor: 'pointer', marginBottom: '6px', fontSize: '15px', fontWeight: '600', textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}>
                <span>{m.name}</span>
                <span style={{ color: '#999', fontSize: '13px' }}>{m.phone}</span>
              </button>
            ))}
            <button onClick={reset} style={{ marginTop: '16px', padding: '10px 24px', background: '#e0e0e0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
          </>
        )}

        {/* ACTION CHOICE */}
        {step === 'action' && selectedMember && (
          <>
            <h2 style={{ fontSize: '22px', marginBottom: '4px' }}>Hi, {selectedMember.name}!</h2>
            <p style={{ color: '#999', marginBottom: '20px' }}>What would you like to do?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={() => { setAction('checkout'); setStep('book'); }}
                style={{ padding: '16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>
                📤 Borrow a Book
              </button>
              {activeBorrows.length > 0 && (
                <button onClick={() => { setAction('return'); setStep('book'); }}
                  style={{ padding: '16px', background: '#1dd1a1', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>
                  📥 Return a Book ({activeBorrows.length} out)
                </button>
              )}
              <button onClick={reset}
                style={{ padding: '12px', background: '#f0f0f0', color: '#666', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                ← Go Back
              </button>
            </div>
          </>
        )}

        {/* BOOK SELECTION */}
        {step === 'book' && (
          <>
            {action === 'checkout' ? (
              <>
                <h2 style={{ fontSize: '22px', marginBottom: '16px' }}>📚 Search Book</h2>
                <input ref={bookInputRef} value={bookSearch} onChange={e => searchBooks(e.target.value)}
                  placeholder="Type book title or author..."
                  style={{ width: '100%', padding: '14px', border: '2px solid #667eea', borderRadius: '10px', fontSize: '16px', textAlign: 'center', marginBottom: '12px' }} />
                {bookResults.map(b => (
                  <button key={b.id} onClick={() => { setSelectedBook(b); handleCheckout(); }}
                    style={{ width: '100%', padding: '12px', background: '#f8f9ff', border: '1px solid #e0e8ff', borderRadius: '8px', cursor: 'pointer', marginBottom: '6px', fontSize: '14px', fontWeight: '600', textAlign: 'left', display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {b.book_image ? <img src={b.book_image} alt="" style={{ width: '36px', height: '50px', borderRadius: '4px', objectFit: 'cover' }} /> : <span style={{ fontSize: '28px' }}>📖</span>}
                    <div>
                      <div>{b.title}</div>
                      <div style={{ fontSize: '12px', color: '#999' }}>{b.author}</div>
                    </div>
                  </button>
                ))}
              </>
            ) : (
              <>
                <h2 style={{ fontSize: '22px', marginBottom: '16px' }}>📥 Select Book to Return</h2>
                {activeBorrows.map(borrow => (
                  <button key={borrow.id} onClick={() => handleReturn(borrow)}
                    style={{ width: '100%', padding: '12px', background: '#f8f9ff', border: '1px solid #e0e8ff', borderRadius: '8px', cursor: 'pointer', marginBottom: '6px', fontSize: '14px', fontWeight: '600', textAlign: 'left', display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {borrow.books?.book_image ? <img src={borrow.books.book_image} alt="" style={{ width: '36px', height: '50px', borderRadius: '4px', objectFit: 'cover' }} /> : <span style={{ fontSize: '28px' }}>📖</span>}
                    <div>
                      <div>{borrow.books?.title}</div>
                      <div style={{ fontSize: '12px', color: borrow.due_date < new Date().toISOString().split('T')[0] ? '#e74c3c' : '#999' }}>
                        Due: {new Date(borrow.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}
            <button onClick={() => setStep('action')} style={{ marginTop: '12px', padding: '10px 24px', background: '#e0e0e0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>← Back</button>
          </>
        )}

        {/* DONE */}
        {step === 'done' && result && (
          <>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>{result.type === 'success' ? '✅' : '❌'}</div>
            <h2 style={{ fontSize: '24px', color: result.type === 'success' ? '#1dd1a1' : '#e74c3c', marginBottom: '8px' }}>{result.msg}</h2>
            <p style={{ color: '#666', fontSize: '16px', marginBottom: '24px' }}>{result.detail}</p>
            <button onClick={reset}
              style={{ width: '100%', padding: '14px', background: '#667eea', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>
              Done — Next Person
            </button>
            <p style={{ color: '#ccc', fontSize: '12px', marginTop: '12px' }}>Auto-resets in 10 seconds</p>
          </>
        )}

        {processing && (
          <div style={{ marginTop: '16px', color: '#667eea', fontWeight: '600' }}>Processing...</div>
        )}
      </div>
    </div>
  );
}
