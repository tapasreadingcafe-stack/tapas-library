import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { useReactToPrint } from 'react-to-print';
import { useDevMode } from '../components/DevMode';
import BarcodeScanner from '../BarcodeScanner';

// ── Default service items ─────────────────────────────────────────────────────
const DEFAULT_SERVICES = [
  { id: 'svc_mem_new',    emoji: '📚', name: 'New Membership',     price: 500,  cat: 'Membership' },
  { id: 'svc_mem_renew',  emoji: '🔄', name: 'Membership Renewal', price: 300,  cat: 'Membership' },
  { id: 'svc_mem_gold',   emoji: '🥇', name: 'Gold Membership',    price: 800,  cat: 'Membership' },
  { id: 'svc_late_fine',  emoji: '⚠️', name: 'Late Fine / day',    price: 5,    cat: 'Fines' },
  { id: 'svc_damage',     emoji: '📦', name: 'Book Damage Fee',     price: 100,  cat: 'Fines' },
  { id: 'svc_print_bw',   emoji: '📄', name: 'Printing B&W /page', price: 2,    cat: 'Printing' },
  { id: 'svc_print_col',  emoji: '🖨️', name: 'Printing Color /pg', price: 5,    cat: 'Printing' },
  { id: 'svc_lam',        emoji: '🗂️', name: 'Lamination',         price: 15,   cat: 'Printing' },
  { id: 'svc_station',    emoji: '🖊️', name: 'Stationery',         price: 10,   cat: 'Stationery' },
  { id: 'svc_notebook',   emoji: '📓', name: 'Notebook',           price: 40,   cat: 'Stationery' },
  { id: 'svc_donation',   emoji: '💝', name: 'Donation',           price: 0,    cat: 'Donations', custom: true },
  { id: 'svc_other',      emoji: '💡', name: 'Other Charge',       price: 0,    cat: 'Other',     custom: true },
];

// Load services from localStorage or use defaults
const loadServices = () => {
  try {
    const saved = localStorage.getItem('pos_services');
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_SERVICES;
};
const saveServices = (svcs) => localStorage.setItem('pos_services', JSON.stringify(svcs));

const CATS = ['All', 'Books', 'Membership', 'Fines', 'Printing', 'Stationery', 'Donations', 'Other'];
const FINE_RATE = 10; // ₹ per day

const SQL_SETUP = `-- Run in Supabase SQL Editor to enable full POS features:

CREATE TABLE IF NOT EXISTS pos_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES members(id),
  total_amount NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  cash_received NUMERIC,
  change_given NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE pos_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pos_open" ON pos_transactions FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS pos_transaction_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES pos_transactions(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  item_name TEXT NOT NULL,
  book_id UUID,
  fine_id UUID,
  unit_price NUMERIC NOT NULL,
  quantity INTEGER DEFAULT 1,
  total_price NUMERIC NOT NULL
);
ALTER TABLE pos_transaction_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pos_items_open" ON pos_transaction_items FOR ALL USING (true) WITH CHECK (true);`;

// ── Service card sub-component (own hover state) ──────────────────────────────
function ServiceCard({ svc, onClick, onEdit, fmt }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#667eea' : '#f8f9ff',
        border: `2px solid ${hovered ? '#667eea' : '#e0e8ff'}`,
        borderRadius: '10px', padding: '14px 10px',
        cursor: 'pointer', textAlign: 'center',
        transition: 'all 0.15s', userSelect: 'none',
        position: 'relative',
      }}
    >
      {onEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(svc); }}
          style={{
            position: 'absolute', top: '4px', right: '4px',
            background: hovered ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.05)',
            border: 'none', borderRadius: '4px', cursor: 'pointer',
            fontSize: '12px', padding: '2px 6px', lineHeight: 1,
            color: hovered ? 'white' : '#999',
            opacity: hovered ? 1 : 0.6, transition: 'all 0.15s',
          }}
          title="Edit service"
        >
          ✏️
        </button>
      )}
      <div style={{ fontSize: '24px', marginBottom: '5px' }}>{svc.emoji}</div>
      <div style={{ fontSize: '11px', fontWeight: '700', color: hovered ? 'white' : '#333', lineHeight: 1.3, marginBottom: '4px' }}>{svc.name}</div>
      <div style={{ fontSize: '13px', fontWeight: '800', color: hovered ? 'rgba(255,255,255,0.92)' : '#667eea' }}>
        {svc.price === 0 ? 'Custom' : fmt(svc.price)}
      </div>
    </div>
  );
}

// ── Main POS component ────────────────────────────────────────────────────────
export default function POS() {
  const { devMode } = useDevMode();

  // Catalog
  const [allBooks, setAllBooks]         = useState([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [itemSearch, setItemSearch]     = useState('');
  const [activeCat, setActiveCat]       = useState('All');

  // Member
  const [allMembers, setAllMembers]     = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberDrop, setMemberDrop]     = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberFines, setMemberFines]   = useState([]);
  const [finesLoading, setFinesLoading] = useState(false);

  // Cart
  const [cart, setCart]                 = useState([]);
  const [discountType, setDiscountType] = useState('pct');
  const [discountVal, setDiscountVal]   = useState(0);

  // Payment
  const [payMethod, setPayMethod]       = useState('cash');
  const [cashReceived, setCashReceived] = useState('');

  // DB
  const [hasPosTable, setHasPosTable]   = useState(null);
  const [showSetup, setShowSetup]       = useState(false);
  const [checkingOut, setCheckingOut]   = useState(false);

  // Receipt
  const [lastTxn, setLastTxn]           = useState(null);
  const [showReceipt, setShowReceipt]   = useState(false);
  const receiptRef = useRef();

  // History
  const [showHistory, setShowHistory]   = useState(false);
  const [todayTxns, setTodayTxns]       = useState([]);
  const [todayStats, setTodayStats]     = useState({ total: 0, count: 0, cash: 0, card: 0, upi: 0 });

  // Toast
  const [toast, setToast]               = useState(null);

  // Scanner
  const [showPosScanner, setShowPosScanner] = useState(false);

  // Quick Add Member
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState({ name: '', phone: '', email: '', date_of_birth: '', plan: '', age: '' });

  // Family members
  const [familyMembers, setFamilyMembers] = useState([]);

  // Editable services
  const [SERVICES, setSERVICES]         = useState(loadServices);
  const [editSvcModal, setEditSvcModal] = useState(null);
  const [editSvcForm, setEditSvcForm]   = useState({ emoji: '', name: '', price: '', cat: '' });
  const [showAddSvc, setShowAddSvc]     = useState(false);

  // Refs for keyboard shortcuts
  const memberSearchRef = useRef();
  const itemSearchRef   = useRef();

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const fmt = useCallback((n) =>
    `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, []);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── On mount ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchBooks();
    fetchMembers();
    probeTables();
  }, []);

  useEffect(() => {
    if (hasPosTable !== null) fetchTodayStats();
  }, [hasPosTable]); // eslint-disable-line

  // ── DB probing ───────────────────────────────────────────────────────────────
  const probeTables = async () => {
    const { error } = await supabase.from('pos_transactions').select('id').limit(0);
    setHasPosTable(!error);
  };

  // ── Data fetching ─────────────────────────────────────────────────────────────
  const fetchBooks = async () => {
    setBooksLoading(true);
    try {
      const { data } = await supabase
        .from('books')
        .select('id, book_id, title, author, category, price, sales_price, quantity_available, book_image')
        .order('title').limit(300);
      setAllBooks(data || []);
    } catch (e) { console.error(e); }
    finally { setBooksLoading(false); }
  };

  const fetchMembers = async () => {
    const { data } = await supabase
      .from('members')
      .select('id, name, phone, email, plan, borrow_limit')
      .eq('status', 'active').order('name').limit(500);
    setAllMembers(data || []);
  };

  const fetchMemberFines = async (memberId) => {
    setFinesLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('circulation')
        .select('id, due_date, fine_paid, books(title)')
        .eq('member_id', memberId)
        .eq('status', 'checked_out')
        .lt('due_date', today)
        .limit(20);
      const now = new Date();
      setMemberFines((data || [])
        .filter(r => !r.fine_paid)
        .map(r => ({
          id: r.id,
          bookTitle: r.books?.title || 'Unknown Book',
          dueDate: r.due_date,
          daysOverdue: Math.floor((now - new Date(r.due_date)) / 86400000),
          amount: Math.floor((now - new Date(r.due_date)) / 86400000) * FINE_RATE,
        }))
      );
    } catch (e) { console.error(e); setMemberFines([]); }
    finally { setFinesLoading(false); }
  };

  const fetchTodayStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const table   = hasPosTable ? 'pos_transactions' : 'sales';
      const dateCol = hasPosTable ? 'created_at' : 'sale_date';
      const cols    = hasPosTable ? 'total_amount, payment_method' : 'total_amount';
      const { data } = await supabase.from(table).select(cols).gte(dateCol, today);
      const s = { total: 0, count: (data || []).length, cash: 0, card: 0, upi: 0 };
      (data || []).forEach(t => {
        s.total += t.total_amount || 0;
        if (hasPosTable) {
          if (t.payment_method === 'cash') s.cash += t.total_amount || 0;
          else if (t.payment_method === 'card') s.card += t.total_amount || 0;
          else if (t.payment_method === 'upi')  s.upi  += t.total_amount || 0;
        }
      });
      setTodayStats(s);
    } catch (e) { console.error(e); }
  };

  const fetchTodayTransactions = async () => {
    const today = new Date().toISOString().split('T')[0];
    if (hasPosTable) {
      const { data } = await supabase
        .from('pos_transactions').select('*, members(name)')
        .gte('created_at', today).order('created_at', { ascending: false }).limit(50);
      setTodayTxns(data || []);
    } else {
      const { data } = await supabase
        .from('sales').select('*, members(name)')
        .gte('sale_date', today).order('sale_date', { ascending: false }).limit(50);
      setTodayTxns(data || []);
    }
  };

  // ── Cart operations ───────────────────────────────────────────────────────────
  const addToCart = useCallback((item) => {
    const cartId = item.id;
    setCart(prev => {
      const existing = prev.find(c => c.cartId === cartId);
      if (existing) return prev.map(c => c.cartId === cartId ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, {
        cartId,
        name:   item.title || item.name,
        type:   item.cartType || 'service',
        price:  item.sales_price || item.price || 0,
        qty:    1,
        bookId: item.cartType === 'book' ? item.id : null,
      }];
    });
  }, []);

  // Handle barcode scan — find book by copy code, book_id, or ISBN and auto-add to cart
  const handlePosScan = async (code) => {
    setShowPosScanner(false);
    const trimmed = code.trim();
    if (!trimmed) return;

    // 1. Try copy code (B-FIC-0001 or BCHI0001 without dashes) in book_copies → get book
    const upper = trimmed.toUpperCase();
    if (upper.startsWith('B')) {
      try {
        // Try exact match first
        let { data: copy } = await supabase.from('book_copies').select('book_id, books(*)').eq('copy_code', upper).limit(1);
        // Try adding dashes: BCHI0001 → B-CHI-0001
        if (!copy?.length && !upper.includes('-')) {
          const withDashes = upper.replace(/^B([A-Z]{3})(\d{4})$/, 'B-$1-$2');
          if (withDashes !== upper) {
            const r = await supabase.from('book_copies').select('book_id, books(*)').eq('copy_code', withDashes).limit(1);
            copy = r.data;
          }
        }
        if (copy?.length && copy[0].books) {
          addToCart({ ...copy[0].books, cartType: 'book' });
          showToast(`Added: ${copy[0].books.title} (${copy[0].copy_code || upper})`);
          return;
        }
      } catch {}
    }

    // 2. Try local matches: book_id, isbn, title
    const sl = trimmed.toLowerCase();
    const localMatch = allBooks.find(b =>
      b.book_id?.toLowerCase() === sl ||
      b.isbn === trimmed ||
      b.title?.toLowerCase() === sl
    );
    if (localMatch) {
      addToCart({ ...localMatch, cartType: 'book' });
      showToast(`Added: ${localMatch.title}`);
      return;
    }

    // 3. Try database search by ISBN (might not be loaded in allBooks)
    try {
      const { data: dbBooks } = await supabase.from('books').select('*').eq('isbn', trimmed).limit(1);
      if (dbBooks?.length) {
        addToCart({ ...dbBooks[0], cartType: 'book' });
        showToast(`Added: ${dbBooks[0].title}`);
        return;
      }
    } catch {}

    // 4. Try database search by book_id
    try {
      const { data: dbBooks } = await supabase.from('books').select('*').eq('book_id', trimmed).limit(1);
      if (dbBooks?.length) {
        addToCart({ ...dbBooks[0], cartType: 'book' });
        showToast(`Added: ${dbBooks[0].title}`);
        return;
      }
    } catch {}

    // 5. Not found — put in search
    setItemSearch(trimmed);
    setActiveCat('Books');
    showToast(`"${trimmed}" not found in catalog`, 'error');
  };

  const addFineToCart = (fine) => {
    const cartId = `fine_${fine.id}`;
    if (cart.find(c => c.cartId === cartId)) { showToast('Fine already in cart', 'error'); return; }
    setCart(prev => [...prev, {
      cartId,
      name:   `Late Fine: ${fine.bookTitle.substring(0, 26)}`,
      type:   'fine',
      price:  fine.amount,
      qty:    1,
      fineId: fine.id,
    }]);
    showToast('Fine added to cart');
  };

  const removeFromCart = (cartId) => setCart(prev => prev.filter(c => c.cartId !== cartId));

  const updateQty = (cartId, delta) =>
    setCart(prev => prev
      .map(c => c.cartId !== cartId ? c : { ...c, qty: c.qty + delta })
      .filter(c => c.qty > 0));

  const updateItemPrice = (cartId, val) =>
    setCart(prev => prev.map(c => c.cartId === cartId ? { ...c, price: parseFloat(val) || 0 } : c));

  const resetCart = () => {
    setCart([]); setSelectedMember(null); setMemberSearch('');
    setMemberFines([]); setDiscountVal(0); setCashReceived(''); setPayMethod('cash');
  };

  // ── Computed values ───────────────────────────────────────────────────────────
  const subtotal       = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmount = discountType === 'pct'
    ? subtotal * (discountVal / 100)
    : Math.min(discountVal, subtotal);
  const total          = Math.max(0, subtotal - discountAmount);
  const cashNum        = parseFloat(cashReceived) || 0;
  const change         = Math.max(0, cashNum - total);

  // ── Checkout ──────────────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (payMethod === 'cash' && cashReceived && cashNum < total) {
      showToast('Cash received is less than total!', 'error'); return;
    }
    setCheckingOut(true);
    try {
      let txnId = null;

      if (hasPosTable) {
        const { data: txn, error: txnErr } = await supabase
          .from('pos_transactions')
          .insert({
            member_id: selectedMember?.id || null,
            total_amount: total,
            discount_amount: discountAmount,
            payment_method: payMethod,
            cash_received: payMethod === 'cash' ? (cashNum || total) : null,
            change_given:  payMethod === 'cash' ? change : null,
          })
          .select('id').single();
        if (txnErr) throw txnErr;
        txnId = txn.id;

        await supabase.from('pos_transaction_items').insert(
          cart.map(item => ({
            transaction_id: txnId,
            item_type:  item.type,
            item_name:  item.name,
            book_id:    item.bookId  || null,
            fine_id:    item.fineId  || null,
            unit_price: item.price,
            quantity:   item.qty,
            total_price: item.price * item.qty,
          }))
        );
      } else {
        // Fallback: save to legacy sales table
        const { data: sale, error: saleErr } = await supabase
          .from('sales')
          .insert({
            member_id:    selectedMember?.id || null,
            book_id:      cart.find(c => c.bookId)?.bookId || null,
            quantity:     cart.reduce((s, c) => s + c.qty, 0),
            total_amount: total,
            sale_date:    new Date().toISOString().split('T')[0],
            status:       'completed',
          })
          .select('id').single();
        if (saleErr) throw saleErr;
        txnId = sale?.id;
      }

      // Mark fines as paid
      for (const fi of cart.filter(c => c.type === 'fine' && c.fineId)) {
        await supabase.from('circulation').update({ fine_paid: true }).eq('id', fi.fineId);
      }

      // Decrement book stock for book sales
      for (const bi of cart.filter(c => c.bookId)) {
        const book = allBooks.find(b => b.id === bi.bookId);
        if (book && book.quantity_available > 0) {
          await supabase.from('books')
            .update({ quantity_available: Math.max(0, book.quantity_available - bi.qty) })
            .eq('id', bi.bookId);
        }
      }

      setLastTxn({
        id: txnId,
        txnRef: `TXN${Date.now().toString().slice(-6)}`,
        date: new Date(),
        member: selectedMember,
        items: [...cart],
        subtotal, discount: discountAmount, total,
        payMethod, cashReceived: cashNum || total, change,
      });
      setShowReceipt(true);
      showToast('Transaction complete!');
      fetchTodayStats();
      if (showHistory) fetchTodayTransactions();
      fetchBooks();
    } catch (err) {
      console.error(err);
      showToast('Checkout failed: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setCheckingOut(false);
    }
  };

  // ── Print ─────────────────────────────────────────────────────────────────────
  const handlePrint = useReactToPrint({ content: () => receiptRef.current });

  // ── Keyboard shortcuts (defined after handleCheckout) ─────────────────────────
  const checkoutRef = useRef(handleCheckout);
  checkoutRef.current = handleCheckout;

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'F1')  { e.preventDefault(); memberSearchRef.current?.focus(); }
      if (e.key === 'F2')  { e.preventDefault(); itemSearchRef.current?.focus(); }
      if (e.key === 'F12') { e.preventDefault(); checkoutRef.current(); }
      if (e.key === 'Escape' && !showReceipt) {
        if (cart.length > 0 && window.confirm('Clear cart?')) resetCart();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart.length, showReceipt]); // eslint-disable-line

  // ── Filtered catalog ──────────────────────────────────────────────────────────
  const sl = itemSearch.toLowerCase();
  const visibleServices = SERVICES.filter(s => {
    if (activeCat === 'Books') return false;
    if (activeCat !== 'All' && s.cat !== activeCat) return false;
    if (sl) return s.name.toLowerCase().includes(sl);
    return true;
  });
  const visibleBooks = (activeCat === 'All' || activeCat === 'Books')
    ? allBooks.filter(b =>
        !sl ||
        b.title?.toLowerCase().includes(sl) ||
        b.author?.toLowerCase().includes(sl) ||
        b.book_id?.toLowerCase().includes(sl) ||
        b.isbn?.includes(sl)
      )
    : [];

  const memberMatches = memberSearch.trim()
    ? allMembers.filter(m =>
        m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
        (m.phone || '').includes(memberSearch)
      ).slice(0, 7)
    : [];

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: '#f0f2f5', minHeight: '100vh' }}>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: '70px', right: '20px', zIndex: 9999,
          background: toast.type === 'error' ? '#e74c3c' : '#27ae60',
          color: 'white', padding: '12px 20px', borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)', fontSize: '14px', fontWeight: '600',
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── DAILY SUMMARY BAR ── */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '0', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '14px', fontWeight: '800', color: 'white', marginRight: '20px', flexShrink: 0 }}>📊 Today</span>
        {[
          { label: 'Revenue',       value: fmt(todayStats.total),  accent: '#ffd700' },
          { label: 'Transactions',  value: todayStats.count,       accent: 'white' },
          { label: 'Cash',          value: fmt(todayStats.cash),   accent: '#7bed9f' },
          { label: 'Card',          value: fmt(todayStats.card),   accent: '#74b9ff' },
          { label: 'UPI',           value: fmt(todayStats.upi),    accent: '#fd79a8' },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center', padding: '0 14px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ fontSize: '15px', fontWeight: '800', color: s.accent }}>{s.value}</div>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: '10px', color: 'rgba(255,255,255,0.55)', flexShrink: 0 }}>
          F1=Member · F2=Search · F12=Checkout · Esc=Clear
        </div>
      </div>

      {/* ── SETUP NOTICE ── */}
      {hasPosTable === false && (
        <div style={{ margin: '12px 16px 0', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', padding: '10px 16px', fontSize: '13px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span>⚠️ <strong>POS tables missing</strong> — saving to legacy <code>sales</code> table. Features limited.</span>
          <button onClick={() => setShowSetup(!showSetup)} style={{ padding: '4px 10px', background: '#fbbf24', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>
            {showSetup ? 'Hide SQL' : 'Setup SQL'}
          </button>
          <button onClick={probeTables} style={{ padding: '4px 10px', background: '#f0f0f0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>🔄</button>
        </div>
      )}
      {showSetup && (
        <div style={{ margin: '8px 16px 0', background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px' }}>
          <pre style={{ background: '#1e1e2e', color: '#a6e3a1', padding: '14px', borderRadius: '6px', fontSize: '11px', overflowX: 'auto', margin: 0 }}>{SQL_SETUP}</pre>
        </div>
      )}

      {/* ── MAIN 2-COLUMN LAYOUT ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '16px', padding: '16px', alignItems: 'start' }}>

        {/* ════════════════ LEFT PANEL — CATALOG ════════════════ */}
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', overflow: 'hidden' }}>

          {/* Search + Scan */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: '8px' }}>
            <input
              ref={itemSearchRef}
              type="text"
              placeholder="🔍  Search items, books, author… (F2)"
              value={itemSearch}
              onChange={e => setItemSearch(e.target.value)}
              style={{ flex: 1, padding: '10px 14px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 0.2s' }}
              onFocus={e => e.target.style.borderColor = '#667eea'}
              onBlur={e  => e.target.style.borderColor = '#e0e0e0'}
            />
            <button onClick={() => setShowPosScanner(true)}
              style={{ padding: '10px 14px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', flexShrink: 0 }}
              title="Scan barcode">📷</button>
          </div>

          {/* Category tabs */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: '6px', overflowX: 'auto' }}>
            {CATS.map(cat => (
              <button key={cat} onClick={() => setActiveCat(cat)} style={{
                padding: '5px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                fontWeight: '700', fontSize: '12px', whiteSpace: 'nowrap', transition: 'all 0.15s',
                background: activeCat === cat ? '#667eea' : '#f0f2f5',
                color:      activeCat === cat ? 'white'   : '#666',
              }}>
                {cat}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ padding: '16px', maxHeight: 'calc(100vh - 270px)', overflowY: 'auto' }}>

            {/* Services */}
            {visibleServices.length > 0 && (
              <div style={{ marginBottom: visibleBooks.length > 0 ? '22px' : 0 }}>
                {activeCat === 'All' && (
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#bbb', letterSpacing: '1px', marginBottom: '10px' }}>SERVICES & CHARGES</div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: '10px' }}>
                  {visibleServices.map(svc => (
                    <ServiceCard key={svc.id} svc={svc} fmt={fmt}
                      onEdit={devMode ? (s) => { setEditSvcForm({ emoji: s.emoji, name: s.name, price: String(s.price), cat: s.cat, custom: s.custom || false }); setEditSvcModal(s); } : null}
                      onClick={() => {
                        if (svc.custom) {
                          const raw = window.prompt(`Enter amount for "${svc.name}" (₹):`);
                          if (raw === null) return;
                          const amt = parseFloat(raw);
                          if (isNaN(amt) || amt <= 0) { showToast('Invalid amount', 'error'); return; }
                          addToCart({ ...svc, price: amt, cartType: 'service' });
                        } else {
                          addToCart({ ...svc, cartType: 'service' });
                        }
                        showToast(`${svc.name} added to cart`);
                      }} />
                  ))}
                </div>
                {devMode && (
                  <button onClick={() => { setEditSvcForm({ emoji: '🆕', name: '', price: '', cat: CATS.find(c => c !== 'All' && c !== 'Books') || 'Other', custom: false }); setShowAddSvc(true); }}
                    style={{ marginTop: '8px', padding: '6px 14px', background: 'none', border: '1px dashed #ccc', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#999' }}>
                    + Add Service
                  </button>
                )}
              </div>
            )}

            {/* Books */}
            {(activeCat === 'All' || activeCat === 'Books') && (
              <div>
                {activeCat === 'All' && visibleServices.length > 0 && (
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#bbb', letterSpacing: '1px', marginBottom: '10px' }}>BOOKS FOR SALE</div>
                )}
                {booksLoading ? (
                  <div style={{ textAlign: 'center', color: '#ccc', padding: '30px' }}>Loading books...</div>
                ) : visibleBooks.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#ccc', padding: '30px', fontSize: '13px' }}>
                    {sl ? 'No books match your search' : 'No books in catalog'}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                    {visibleBooks.slice(0, 60).map(book => {
                      const inStock = book.quantity_available > 0;
                      return (
                        <div key={book.id} style={{ background: 'white', border: '1px solid #ebebeb', borderRadius: '8px', overflow: 'hidden', cursor: inStock ? 'pointer' : 'default', opacity: inStock ? 1 : 0.5, transition: 'box-shadow 0.15s' }}
                          onMouseEnter={e => { if (inStock) e.currentTarget.style.boxShadow = '0 4px 14px rgba(102,126,234,0.22)'; }}
                          onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                        >
                          <div style={{ width: '100%', height: '110px', background: '#f4f4f4', overflow: 'hidden', position: 'relative' }}>
                            {book.book_image
                              ? <img src={book.book_image} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                              : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', color: '#ddd' }}>📖</div>
                            }
                            {!inStock && (
                              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ color: 'white', fontSize: '10px', fontWeight: '700', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '4px' }}>OUT OF STOCK</span>
                              </div>
                            )}
                          </div>
                          <div style={{ padding: '8px' }}>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#333', lineHeight: 1.3, marginBottom: '2px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{book.title}</div>
                            <div style={{ fontSize: '10px', color: '#999', marginBottom: '2px' }}>{(book.author || '').substring(0, 18)}</div>
                            <div style={{ display: 'flex', gap: '4px', marginBottom: '4px', flexWrap: 'wrap' }}>
                              {book.book_id && <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#667eea', background: '#f0f3ff', padding: '1px 4px', borderRadius: '3px' }}>{book.book_id}</span>}
                              <span style={{ fontSize: '9px', color: inStock ? '#1dd1a1' : '#e74c3c', fontWeight: '600' }}>{book.quantity_available || 0}/{book.quantity_total || 0} copies</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div>
                                {book.mrp > 0 && book.sales_price > 0 && book.sales_price < book.mrp && (
                                  <span style={{ fontSize: '10px', textDecoration: 'line-through', color: '#999', marginRight: '3px' }}>₹{book.mrp}</span>
                                )}
                                <span style={{ fontSize: '13px', fontWeight: '800', color: '#667eea' }}>{fmt(book.sales_price || book.price)}</span>
                              </div>
                              <button
                                onClick={() => { addToCart({ ...book, cartType: 'book' }); showToast(`"${book.title.substring(0, 18)}…" added`); }}
                                disabled={!inStock}
                                style={{ padding: '3px 8px', background: inStock ? '#667eea' : '#ccc', color: 'white', border: 'none', borderRadius: '4px', cursor: inStock ? 'pointer' : 'not-allowed', fontSize: '12px', fontWeight: '700' }}
                              >+</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {visibleServices.length === 0 && visibleBooks.length === 0 && !booksLoading && (
              <div style={{ textAlign: 'center', color: '#ccc', padding: '50px 20px' }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔍</div>
                <div>No items found</div>
              </div>
            )}
          </div>
        </div>

        {/* ════════════════ RIGHT PANEL — CART ════════════════ */}
        <div style={{
          position: 'sticky', top: '16px',
          background: 'white', borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
          maxHeight: 'calc(100vh - 100px)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>

          {/* ── MEMBER SEARCH ── */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#bbb', letterSpacing: '1px' }}>CUSTOMER (F1)</div>
              <button onClick={() => { setShowAddMember(true); setNewMemberForm({ name: '', phone: '', email: '' }); }} title="Add new member"
                style={{ padding: '2px 8px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
                + New
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                ref={memberSearchRef}
                type="text"
                placeholder="Search by name or phone…"
                value={memberSearch}
                onChange={e => {
                  setMemberSearch(e.target.value);
                  setMemberDrop(true);
                  if (!e.target.value) { setSelectedMember(null); setMemberFines([]); }
                }}
                onFocus={() => setMemberDrop(true)}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e0e0e0', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 0.2s' }}
                onBlur={e => e.target.style.borderColor = '#e0e0e0'}
              />

              {/* Dropdown */}
              {memberDrop && memberSearch.trim() && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setMemberDrop(false)} />
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 999, marginTop: '4px', overflow: 'hidden' }}>
                    <div
                      onClick={() => { setSelectedMember(null); setMemberSearch('Walk-in Customer'); setMemberDrop(false); setMemberFines([]); }}
                      style={{ padding: '10px 14px', fontSize: '12px', color: '#888', cursor: 'pointer', borderBottom: '1px solid #f5f5f5', fontWeight: '600' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9f9f9'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    >
                      🚶 Walk-in Customer (no account)
                    </div>
                    {memberMatches.length === 0 && (
                      <div style={{ padding: '10px 14px', fontSize: '12px', color: '#bbb' }}>No members found</div>
                    )}
                    {memberMatches.map(m => (
                      <div key={m.id}
                        onClick={async () => {
                          setSelectedMember(m); setMemberSearch(m.name); setMemberDrop(false); fetchMemberFines(m.id);
                          try { const { data } = await supabase.from('family_members').select('*').eq('parent_member_id', m.id); setFamilyMembers(data || []); } catch { setFamilyMembers([]); }
                        }}
                        style={{ padding: '10px 14px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f5f0ff'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                      >
                        <div style={{ fontWeight: '600', color: '#333' }}>{m.name}</div>
                        <div style={{ fontSize: '11px', color: '#999', marginTop: '1px' }}>{m.phone}{m.plan ? ` · ${m.plan.replace('_', ' ')}` : ''}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Member badge */}
            {selectedMember && (
              <div style={{ marginTop: '8px', background: '#f5f0ff', border: '1px solid #c4b5fd', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: '#5b21b6' }}>{selectedMember.name}</div>
                  <div style={{ fontSize: '11px', color: '#8b5cf6', marginTop: '2px' }}>
                    {(selectedMember.plan || 'Guest').replace('_', ' ')} · {selectedMember.phone}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => window.open(`/member/${selectedMember.id}`, '_blank')} title="View full profile"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>👁️</button>
                  <button onClick={() => { setSelectedMember(null); setMemberSearch(''); setMemberFines([]); setFamilyMembers([]); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c4b5fd', fontSize: '18px', lineHeight: 1 }}>✕</button>
                </div>
              </div>
              {/* Family members */}
              {familyMembers.length > 0 && (
                <div style={{ marginTop: '6px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '6px 10px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#166534', marginBottom: '4px' }}>👨‍👩‍👧‍👦 FAMILY ({familyMembers.length})</div>
                  {familyMembers.map(fm => (
                    <div key={fm.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', fontSize: '12px' }}>
                      <span style={{ color: '#166534' }}>{fm.name} <span style={{ color: '#86efac', fontSize: '10px' }}>({fm.relationship})</span></span>
                      <button onClick={() => window.open(`/member/${selectedMember.id}/child/${fm.id}`, '_blank')} title="View profile"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px' }}>👁️</button>
                    </div>
                  ))}
                </div>
              )}
            )}
          </div>

          {/* ── OUTSTANDING FINES ── */}
          {finesLoading && (
            <div style={{ padding: '8px 16px', fontSize: '12px', color: '#999', background: '#fffbeb', flexShrink: 0 }}>Loading fines…</div>
          )}
          {!finesLoading && memberFines.length > 0 && (
            <div style={{ padding: '10px 16px', background: '#fffbeb', borderBottom: '1px solid #fde68a', flexShrink: 0 }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#92400e', letterSpacing: '0.5px', marginBottom: '7px' }}>
                ⚠️ OUTSTANDING FINES ({memberFines.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '130px', overflowY: 'auto' }}>
                {memberFines.map(fine => {
                  const inCart = !!cart.find(c => c.fineId === fine.id);
                  return (
                    <div key={fine.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', borderRadius: '6px', padding: '6px 10px', border: '1px solid #fcd34d' }}>
                      <div style={{ flex: 1, marginRight: '8px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#333' }}>{fine.bookTitle.substring(0, 24)}</div>
                        <div style={{ fontSize: '10px', color: '#92400e' }}>{fine.daysOverdue} day{fine.daysOverdue !== 1 ? 's' : ''} overdue</div>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#d97706', marginRight: '8px' }}>{fmt(fine.amount)}</span>
                      {inCart
                        ? <span style={{ fontSize: '10px', color: '#27ae60', fontWeight: '700' }}>✓</span>
                        : <button onClick={() => addFineToCart(fine)} style={{ padding: '3px 8px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: '700' }}>Add</button>
                      }
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── CART ITEMS ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: '#bbb', letterSpacing: '1px', marginBottom: '8px' }}>
              CART {cart.length > 0 && `(${cart.length} items)`}
            </div>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#d1d5db', padding: '24px 0', fontSize: '13px' }}>
                <div style={{ fontSize: '30px', marginBottom: '6px' }}>🛒</div>
                Cart is empty
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {cart.map(item => (
                  <div key={item.cartId} style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: '8px', padding: '8px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <div style={{ flex: 1, marginRight: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151', lineHeight: 1.3 }}>{item.name}</span>
                        {item.bookId && (
                          <div style={{ fontSize: '10px', color: '#667eea', fontFamily: 'monospace', marginTop: '2px' }}>
                            {allBooks.find(b => b.id === item.bookId)?.book_id || ''}
                          </div>
                        )}
                      </div>
                      {item.bookId && (
                        <button onClick={() => window.open(`/books/${item.bookId}/copies`, '_blank')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', padding: '0 4px', flexShrink: 0 }}
                          title="View copies">👁️</button>
                      )}
                      <button onClick={() => removeFromCart(item.cartId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: '14px', lineHeight: 1, padding: 0, flexShrink: 0 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}
                      >✕</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <button onClick={() => updateQty(item.cartId, -1)} style={{ width: '22px', height: '22px', background: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>−</button>
                        <span style={{ fontSize: '13px', fontWeight: '800', minWidth: '18px', textAlign: 'center', color: '#374151' }}>{item.qty}</span>
                        <button onClick={() => updateQty(item.cartId, 1)} style={{ width: '22px', height: '22px', background: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>+</button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <span style={{ position: 'absolute', left: '6px', fontSize: '11px', color: '#9ca3af' }}>₹</span>
                          <input
                            type="number" value={item.price} min="0"
                            onChange={e => updateItemPrice(item.cartId, e.target.value)}
                            style={{ width: '62px', padding: '3px 5px 3px 16px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '12px', textAlign: 'right' }}
                          />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#667eea', minWidth: '48px', textAlign: 'right' }}>{fmt(item.price * item.qty)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── CHECKOUT SECTION ── */}
          <div style={{ borderTop: '2px solid #f0f0f0', padding: '12px 16px 14px', background: '#fafafa', flexShrink: 0 }}>

            {/* Discount */}
            {cart.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', whiteSpace: 'nowrap' }}>Discount</span>
                <select value={discountType} onChange={e => setDiscountType(e.target.value)}
                  style={{ padding: '4px 6px', border: '1px solid #e0e0e0', borderRadius: '5px', fontSize: '12px', background: 'white', fontWeight: '700' }}>
                  <option value="pct">%</option>
                  <option value="fixed">₹</option>
                </select>
                <input type="number" value={discountVal} min="0" placeholder="0"
                  onChange={e => setDiscountVal(parseFloat(e.target.value) || 0)}
                  style={{ flex: 1, padding: '4px 8px', border: '1px solid #e0e0e0', borderRadius: '5px', fontSize: '13px' }} />
              </div>
            )}

            {/* Totals */}
            {cart.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                {discountAmount > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9ca3af', marginBottom: '3px' }}>
                      <span>Subtotal</span><span>{fmt(subtotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#ef4444', marginBottom: '3px' }}>
                      <span>Discount</span><span>−{fmt(discountAmount)}</span>
                    </div>
                  </>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: discountAmount > 0 ? '1px solid #e5e7eb' : 'none' }}>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#111827' }}>TOTAL</span>
                  <span style={{ fontSize: '24px', fontWeight: '900', color: '#059669' }}>{fmt(total)}</span>
                </div>
              </div>
            )}

            {/* Payment method selector */}
            {cart.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                {[
                  { key: 'cash', emoji: '💵', label: 'CASH' },
                  { key: 'card', emoji: '💳', label: 'CARD' },
                  { key: 'upi',  emoji: '📱', label: 'UPI'  },
                ].map(m => (
                  <button key={m.key} onClick={() => setPayMethod(m.key)} style={{
                    padding: '9px 4px', border: `2px solid ${payMethod === m.key ? '#667eea' : '#e5e7eb'}`,
                    borderRadius: '8px', cursor: 'pointer', textAlign: 'center',
                    background: payMethod === m.key ? '#ede9fe' : 'white',
                    color: payMethod === m.key ? '#5b21b6' : '#6b7280',
                    fontWeight: '800', fontSize: '11px', transition: 'all 0.15s',
                  }}>
                    <div style={{ fontSize: '18px', marginBottom: '2px' }}>{m.emoji}</div>
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            {/* Cash change calculator */}
            {cart.length > 0 && payMethod === 'cash' && (
              <div style={{ marginBottom: '10px' }}>
                <input
                  type="number" placeholder="Amount received (₹)" value={cashReceived}
                  onChange={e => setCashReceived(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: '7px', fontSize: '15px', fontWeight: '700', boxSizing: 'border-box', outline: 'none', marginBottom: '6px', transition: 'border-color 0.2s' }}
                  onFocus={e => e.target.style.borderColor = '#667eea'}
                  onBlur={e  => e.target.style.borderColor = '#e5e7eb'}
                />
                {/* Quick cash buttons */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                  {[50, 100, 200, 500].map(amt => {
                    const rounded = Math.ceil(total / amt) * amt || amt;
                    return (
                      <button key={amt} onClick={() => setCashReceived(String(rounded))}
                        style={{ flex: 1, padding: '5px 2px', background: '#f3f4f6', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '11px', fontWeight: '700', color: '#4b5563' }}>
                        ₹{amt}
                      </button>
                    );
                  })}
                  <button onClick={() => setCashReceived(String(Math.ceil(total)))}
                    style={{ flex: 1, padding: '5px 2px', background: '#ede9fe', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '10px', fontWeight: '700', color: '#7c3aed' }}>
                    Exact
                  </button>
                </div>
                {cashReceived && cashNum >= total && (
                  <div style={{ background: '#ecfdf5', border: '2px solid #34d399', borderRadius: '8px', padding: '8px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px', fontWeight: '700' }}>CHANGE TO RETURN</div>
                    <div style={{ fontSize: '26px', fontWeight: '900', color: '#059669' }}>{fmt(change)}</div>
                  </div>
                )}
                {cashReceived && cashNum < total && cashNum > 0 && (
                  <div style={{ background: '#fef2f2', border: '2px solid #f87171', borderRadius: '8px', padding: '8px', textAlign: 'center', fontSize: '12px', color: '#dc2626', fontWeight: '700' }}>
                    ⚠️ Short by {fmt(total - cashNum)}
                  </div>
                )}
              </div>
            )}

            {/* UPI hint */}
            {cart.length > 0 && payMethod === 'upi' && (
              <div style={{ marginBottom: '10px', background: '#faf5ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '4px' }}>📱</div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#7c3aed' }}>Ask customer to scan UPI QR</div>
                <div style={{ fontSize: '11px', color: '#a78bfa', marginTop: '2px' }}>Click CHECKOUT once payment is confirmed</div>
              </div>
            )}

            {/* Card hint */}
            {cart.length > 0 && payMethod === 'card' && (
              <div style={{ marginBottom: '10px', background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '8px', padding: '10px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#1d4ed8' }}>
                💳 Process card payment, then click CHECKOUT
              </div>
            )}

            {/* CHECKOUT button */}
            <button onClick={handleCheckout} disabled={cart.length === 0 || checkingOut} style={{
              width: '100%', padding: '14px',
              background: cart.length > 0 ? 'linear-gradient(135deg, #059669, #047857)' : '#d1d5db',
              color: 'white', border: 'none', borderRadius: '9px',
              cursor: cart.length > 0 ? 'pointer' : 'not-allowed',
              fontSize: '16px', fontWeight: '900', letterSpacing: '0.5px',
              boxShadow: cart.length > 0 ? '0 4px 14px rgba(5,150,105,0.35)' : 'none',
              transition: 'all 0.2s',
            }}>
              {checkingOut ? '⏳ Processing…' : cart.length > 0 ? `✓  CHECKOUT  ${fmt(total)}` : '✓  CHECKOUT'}
            </button>

            {cart.length > 0 && (
              <button onClick={() => { if (window.confirm('Clear cart and start over?')) resetCart(); }}
                style={{ width: '100%', marginTop: '5px', padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: '11px' }}
                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}
              >
                ✕ Clear cart (Esc)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── TRANSACTION HISTORY ── */}
      <div style={{ padding: '0 16px 24px' }}>
        <button
          onClick={() => { setShowHistory(!showHistory); if (!showHistory) fetchTodayTransactions(); }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'white', border: '1px solid #e5e7eb', borderRadius: showHistory ? '8px 8px 0 0' : '8px', padding: '11px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: '#374151', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
        >
          <span>📋 Today's Transactions — {todayStats.count} sale{todayStats.count !== 1 ? 's' : ''} · {fmt(todayStats.total)}</span>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>{showHistory ? '▲ Hide' : '▼ Show'}</span>
        </button>

        {showHistory && (
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
            {todayTxns.length === 0 ? (
              <div style={{ padding: '28px', textAlign: 'center', color: '#d1d5db', fontSize: '13px' }}>No transactions today yet</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead style={{ background: '#f9fafb' }}>
                  <tr>
                    {['Time', 'Customer', 'Total', 'Payment'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {todayTxns.map((txn, i) => (
                    <tr key={txn.id || i} style={{ borderTop: '1px solid #f3f4f6' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    >
                      <td style={{ padding: '10px 16px', color: '#6b7280' }}>
                        {new Date(txn.created_at || txn.sale_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '10px 16px', fontWeight: '600', color: '#374151' }}>{txn.members?.name || 'Walk-in'}</td>
                      <td style={{ padding: '10px 16px', fontWeight: '800', color: '#059669' }}>{fmt(txn.total_amount)}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ background: '#f3f4f6', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', color: '#6b7280' }}>
                          {txn.payment_method === 'cash' ? '💵 Cash' : txn.payment_method === 'card' ? '💳 Card' : txn.payment_method === 'upi' ? '📱 UPI' : '—'}
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

      {/* ── RECEIPT MODAL ── */}
      {showReceipt && lastTxn && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '16px', maxWidth: '460px', width: '100%', boxShadow: '0 25px 60px rgba(0,0,0,0.3)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

            {/* Success header */}
            <div style={{ background: 'linear-gradient(135deg, #059669, #047857)', padding: '22px 24px', color: 'white', textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: '44px', marginBottom: '6px' }}>✅</div>
              <div style={{ fontSize: '20px', fontWeight: '900' }}>Payment Received!</div>
              <div style={{ fontSize: '13px', opacity: 0.8, marginTop: '3px' }}>{lastTxn.txnRef}</div>
            </div>

            {/* Printable receipt content */}
            <div ref={receiptRef} style={{ padding: '24px', fontFamily: '"Courier New", monospace', overflowY: 'auto' }}>
              {/* Receipt header */}
              <div style={{ textAlign: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '2px dashed #ccc' }}>
                <div style={{ fontSize: '18px', fontWeight: '900', letterSpacing: '3px' }}>TAPAS LIBRARY</div>
                <div style={{ fontSize: '11px', color: '#777', marginTop: '2px' }}>Point of Sale Receipt</div>
                <div style={{ fontSize: '11px', color: '#888', marginTop: '8px' }}>
                  {lastTxn.date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{ fontSize: '11px', color: '#888' }}>Ref: {lastTxn.txnRef}</div>
                {lastTxn.member && (
                  <div style={{ fontSize: '12px', fontWeight: '700', marginTop: '6px', color: '#333' }}>
                    Customer: {lastTxn.member.name}
                  </div>
                )}
              </div>

              {/* Items */}
              <div style={{ marginBottom: '14px' }}>
                {lastTxn.items.map(item => (
                  <div key={item.cartId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
                    <div style={{ flex: 1, marginRight: '8px' }}>
                      {item.name.substring(0, 30)}
                      {item.qty > 1 && <span style={{ color: '#888' }}> ×{item.qty}</span>}
                    </div>
                    <span style={{ fontWeight: '700' }}>{fmt(item.price * item.qty)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div style={{ borderTop: '1px dashed #ccc', paddingTop: '10px', marginBottom: '14px', fontSize: '12px' }}>
                {lastTxn.discount > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#777' }}>
                      <span>Subtotal</span><span>{fmt(lastTxn.subtotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#e74c3c' }}>
                      <span>Discount</span><span>−{fmt(lastTxn.discount)}</span>
                    </div>
                  </>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '900', paddingTop: '6px', borderTop: '2px solid #333', marginTop: lastTxn.discount > 0 ? 0 : '4px' }}>
                  <span>TOTAL</span><span>{fmt(lastTxn.total)}</span>
                </div>
              </div>

              {/* Payment details */}
              <div style={{ fontSize: '12px', marginBottom: '16px', color: '#555' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span>Payment Method:</span>
                  <span style={{ fontWeight: '700', textTransform: 'uppercase' }}>{lastTxn.payMethod}</span>
                </div>
                {lastTxn.payMethod === 'cash' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span>Cash Received:</span><span>{fmt(lastTxn.cashReceived)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', color: '#059669' }}>
                      <span>Change Returned:</span><span>{fmt(lastTxn.change)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div style={{ textAlign: 'center', borderTop: '2px dashed #ccc', paddingTop: '14px', fontSize: '11px', color: '#888' }}>
                <div style={{ fontWeight: '700', marginBottom: '4px' }}>Thank you for visiting Tapas Library!</div>
                <div>Happy Reading 📚</div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ padding: '14px 20px 18px', display: 'flex', gap: '10px', borderTop: '1px solid #f0f0f0', background: '#fafafa', flexShrink: 0 }}>
              <button onClick={handlePrint} style={{ flex: 1, padding: '11px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>
                🖨️ Print Receipt
              </button>
              <button onClick={() => { setShowReceipt(false); resetCart(); }}
                style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>
                + New Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT SERVICE MODAL ── */}
      {(editSvcModal || showAddSvc) && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={() => { setEditSvcModal(null); setShowAddSvc(false); }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', maxWidth: '420px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>{showAddSvc ? 'Add New Service' : 'Edit Service'}</h3>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#666', fontWeight: '600', marginBottom: '2px' }}>Emoji</label>
              <input value={editSvcForm.emoji} onChange={e => setEditSvcForm({ ...editSvcForm, emoji: e.target.value })}
                style={{ width: '100%', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '20px' }} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#666', fontWeight: '600', marginBottom: '2px' }}>Name</label>
              <input value={editSvcForm.name} onChange={e => setEditSvcForm({ ...editSvcForm, name: e.target.value })}
                style={{ width: '100%', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px' }} placeholder="Service name" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#666', fontWeight: '600', marginBottom: '2px' }}>Price (₹)</label>
                <input type="number" value={editSvcForm.price} onChange={e => setEditSvcForm({ ...editSvcForm, price: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px' }} placeholder="0 for custom" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#666', fontWeight: '600', marginBottom: '2px' }}>Category</label>
                <select value={editSvcForm.cat} onChange={e => setEditSvcForm({ ...editSvcForm, cat: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px' }}>
                  {CATS.filter(c => c !== 'All' && c !== 'Books').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <input type="checkbox" checked={editSvcForm.custom || false} onChange={e => setEditSvcForm({ ...editSvcForm, custom: e.target.checked })} id="svc-custom" />
              <label htmlFor="svc-custom" style={{ fontSize: '13px', color: '#666' }}>Custom price (ask on each use)</label>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => {
                if (!editSvcForm.name) return;
                const price = parseFloat(editSvcForm.price) || 0;
                if (showAddSvc) {
                  const newSvc = { id: 'svc_' + Date.now(), emoji: editSvcForm.emoji, name: editSvcForm.name, price, cat: editSvcForm.cat, custom: editSvcForm.custom || price === 0 };
                  const updated = [...SERVICES, newSvc];
                  setSERVICES(updated);
                  saveServices(updated);
                  showToast(`"${editSvcForm.name}" added`);
                } else {
                  const updated = SERVICES.map(s => s.id === editSvcModal.id ? { ...s, emoji: editSvcForm.emoji, name: editSvcForm.name, price, cat: editSvcForm.cat, custom: editSvcForm.custom || price === 0 } : s);
                  setSERVICES(updated);
                  saveServices(updated);
                  showToast(`"${editSvcForm.name}" updated`);
                }
                setEditSvcModal(null);
                setShowAddSvc(false);
              }} style={{ flex: 1, padding: '10px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                {showAddSvc ? 'Add Service' : 'Save Changes'}
              </button>
              {editSvcModal && !showAddSvc && (
                <button onClick={() => {
                  if (!window.confirm(`Delete "${editSvcModal.name}"?`)) return;
                  const updated = SERVICES.filter(s => s.id !== editSvcModal.id);
                  setSERVICES(updated);
                  saveServices(updated);
                  showToast(`"${editSvcModal.name}" deleted`, 'error');
                  setEditSvcModal(null);
                }} style={{ padding: '10px 16px', background: '#ff6b6b', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                  Delete
                </button>
              )}
              <button onClick={() => { setEditSvcModal(null); setShowAddSvc(false); }}
                style={{ padding: '10px 16px', background: '#e0e0e0', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POS Barcode Scanner */}
      {showPosScanner && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={() => setShowPosScanner(false)}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', maxWidth: '400px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px', fontSize: '18px' }}>📷 Scan Book Barcode</h3>
            <BarcodeScanner
              onScan={(code) => handlePosScan(code)}
              onClose={() => setShowPosScanner(false)}
            />
            <div style={{ marginTop: '12px', borderTop: '1px solid #eee', paddingTop: '12px' }}>
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '6px', fontWeight: '600' }}>Or use USB barcode scanner:</p>
              <input autoFocus placeholder="Barcode scanner types here..."
                onKeyDown={e => { if (e.key === 'Enter' && e.target.value.trim()) { handlePosScan(e.target.value.trim()); } }}
                style={{ width: '100%', padding: '10px', border: '2px solid #667eea', borderRadius: '6px', fontSize: '16px', textAlign: 'center', fontFamily: 'monospace' }} />
            </div>
            <button onClick={() => setShowPosScanner(false)}
              style={{ width: '100%', marginTop: '10px', padding: '10px', background: '#e0e0e0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Quick Add Member Popup — Full Form */}
      {showAddMember && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}
          onClick={() => setShowAddMember(false)}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', maxWidth: '450px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 14px', fontSize: '16px' }}>👤 Add New Member</h3>
            <p style={{ fontSize: '11px', color: '#999', margin: '0 0 12px' }}>Adding as a member (no plan). Membership is separate — assign plans in Members page.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#666', fontWeight: '600' }}>Name *</label>
                <input value={newMemberForm.name} onChange={e => setNewMemberForm({ ...newMemberForm, name: e.target.value })}
                  autoFocus style={{ width: '100%', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#666', fontWeight: '600' }}>Phone *</label>
                <input value={newMemberForm.phone} onChange={e => setNewMemberForm({ ...newMemberForm, phone: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#666', fontWeight: '600' }}>Email</label>
                <input value={newMemberForm.email} onChange={e => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#666', fontWeight: '600' }}>Date of Birth</label>
                <input type="date" value={newMemberForm.date_of_birth} onChange={e => {
                  const dob = e.target.value;
                  const age = dob ? Math.floor((new Date() - new Date(dob)) / 31557600000) : '';
                  setNewMemberForm({ ...newMemberForm, date_of_birth: dob, age });
                }} style={{ width: '100%', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px' }} />
              </div>
            </div>
            {newMemberForm.age && (
              <p style={{ fontSize: '12px', color: newMemberForm.age < 18 ? '#e74c3c' : '#1dd1a1', margin: '0 0 8px', fontWeight: '600' }}>
                Age: {newMemberForm.age} years {newMemberForm.age < 18 ? '(Minor)' : '(Adult)'}
              </p>
            )}
            <div style={{ background: '#f8f9ff', border: '1px solid #e0e8ff', borderRadius: '6px', padding: '8px', marginBottom: '12px' }}>
              <p style={{ fontSize: '11px', color: '#667eea', margin: 0 }}>
                💡 This creates a member without a plan (Guest). To add a paid membership, go to <strong>Members → Edit → Select Plan</strong> after adding.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={async () => {
                if (!newMemberForm.name || !newMemberForm.phone) { showToast('Name and phone required', 'error'); return; }
                try {
                  const payload = {
                    name: newMemberForm.name, phone: newMemberForm.phone,
                    email: newMemberForm.email || null,
                    date_of_birth: newMemberForm.date_of_birth || null,
                    age: newMemberForm.age || null,
                    customer_type: newMemberForm.age && newMemberForm.age < 18 ? 'minor' : 'adult',
                    status: 'active',
                  };
                  const { error } = await supabase.from('members').insert([payload]);
                  if (error) throw error;
                  showToast(`Member "${newMemberForm.name}" added!`);
                  setShowAddMember(false);
                  const { data } = await supabase.from('members').select('*').order('name');
                  setAllMembers(data || []);
                  setMemberSearch(newMemberForm.name);
                  setMemberDrop(true);
                } catch (err) { showToast('Error: ' + err.message, 'error'); }
              }} style={{ flex: 1, padding: '10px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                Add Member (No Plan)
              </button>
              <button onClick={() => setShowAddMember(false)}
                style={{ padding: '10px 16px', background: '#e0e0e0', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
