import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { buildBillNumbers } from '../utils/invoiceNumber';
import { STREAMS, splitByStream, streamOf } from '../utils/revenueStreams';
import { useToast } from '../components/Toast';
import { useReactToPrint } from 'react-to-print';
import { exportToCSV, exportRowsToCSV } from '../utils/exportCSV';

const fmt = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const paymentBadge = (method) => {
  const map = {
    cash: { bg: '#e8f5e9', color: '#2e7d32', label: 'Cash' },
    upi: { bg: '#e3f2fd', color: '#1565c0', label: 'UPI' },
    card: { bg: '#fff3e0', color: '#e65100', label: 'Card' },
    online: { bg: '#f3e5f5', color: '#7b1fa2', label: 'Online' },
  };
  const s = map[(method || '').toLowerCase()] || { bg: '#f5f5f5', color: '#555', label: method || 'N/A' };
  return (
    <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
      {s.label}
    </span>
  );
};

export default function AccountsInvoices() {
  const toast = useToast();
  const printRef = useRef();
  const listPrintRef = useRef();
  const [exportOpen, setExportOpen] = useState(false);

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableReady, setTableReady] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // filters
  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastOfMonth = (() => { const d = new Date(now.getFullYear(), now.getMonth() + 1, 0); return d.toISOString().split('T')[0]; })();
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(lastOfMonth);
  const [memberSearch, setMemberSearch] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  // detail modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { error } = await supabase.from('pos_transactions').select('id').limit(0);
      if (error) { setTableReady(false); setLoading(false); return; }
      fetchInvoices();
    };
    check();
  }, []);

  useEffect(() => { if (tableReady) fetchInvoices(); }, [dateFrom, dateTo]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('pos_transactions')
        .select('*, members(name, phone), pos_transaction_items(*)')
        .order('created_at', { ascending: false });

      if (dateFrom) q = q.gte('created_at', dateFrom + 'T00:00:00');
      if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59');

      const { data, error } = await q;
      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load invoices');
    }
    setLoading(false);
  };

  const handleReactToPrint = useReactToPrint({ contentRef: printRef });
  const printList = useReactToPrint({ contentRef: listPrintRef, documentTitle: `Invoices ${dateFrom} to ${dateTo}` });

  const deleteInvoice = async (inv) => {
    try {
      await supabase.from('pos_transaction_items').delete().eq('transaction_id', inv.id);
      const { error } = await supabase.from('pos_transactions').delete().eq('id', inv.id);
      if (error) throw error;
      setInvoices(prev => prev.filter(i => i.id !== inv.id));
      setConfirmDeleteId(null);
      toast.success('Invoice deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete invoice');
    }
  };

  const openDetail = async (inv) => {
    setSelectedInvoice(inv);
    setDetailLoading(true);
    setLineItems([]);
    try {
      const { data } = await supabase
        .from('pos_transaction_items')
        .select('*')
        .eq('transaction_id', inv.id);
      setLineItems(data || []);
    } catch (err) {
      console.error(err);
    }
    setDetailLoading(false);
  };

  // filtered list
  const filtered = invoices.filter(inv => {
    const name = (inv.members?.name || 'Walk-in').toLowerCase();
    if (memberSearch && !name.includes(memberSearch.toLowerCase())) return false;
    if (minAmount && Number(inv.total_amount) < Number(minAmount)) return false;
    if (maxAmount && Number(inv.total_amount) > Number(maxAmount)) return false;
    return true;
  });

  // stats
  const totalCount = filtered.length;
  // Money taken across these bills — includes refundable deposits, so it is
  // NOT the revenue figure. See netRevenue below.
  const totalBilled = filtered.reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
  const avgValue = totalCount ? totalBilled / totalCount : 0;
  const thisMonthCount = filtered.filter(i => {
    const d = new Date(i.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // Date-wise bill numbers: INV-YYYYMMDD-NNN, sequenced within each day.
  //
  // Built from `invoices` — the full fetched set — and deliberately NOT from
  // `filtered`. Numbering a filtered view is what made these numbers move:
  // the old code used the row's screen position, so the newest bill was always
  // INV-2026-0001 and every search or deletion renumbered the lot.
  const billNumbers = buildBillNumbers(invoices);
  // A stored serial (assigned at checkout once GST is on) is permanent and
  // wins; older bills fall back to the date-wise number derived above.
  const invoiceNumber = (inv) => inv?.invoice_no || billNumbers[inv?.id] || '—';
  // GST on a bill is held for the government, and round-off is an artefact of
  // settling to the rupee — neither is revenue, so both come off first.
  const taxOnBill = (inv) => (Number(inv?.cgst_amount) || 0) + (Number(inv?.sgst_amount) || 0) + (Number(inv?.igst_amount) || 0);
  const preTax = (inv) => (Number(inv?.total_amount) || 0) - taxOnBill(inv) - (Number(inv?.round_off) || 0);
  const forSplit = (ls) => ls.map(l => (l.taxable_value !== null && l.taxable_value !== undefined ? { ...l, total_price: Number(l.taxable_value) } : l));

  // What each bill is made of. One customer bill routinely mixes a membership,
  // a book and a coffee, plus a refundable deposit — this splits it back out
  // using the same classifier the Accounts pages use, so the two always agree.
  const categoriesOf = (inv) => {
    const lines = inv?.pos_transaction_items || [];
    if (!lines.length) return [];
    const totals = splitByStream(forSplit(lines), { [inv.id]: preTax(inv) });
    return Object.keys(STREAMS)
      .filter(k => totals[k] > 0)
      .map(k => ({ ...STREAMS[k], amount: totals[k] }));
  };

  // Category totals across the filtered view.
  const categoryTotals = (() => {
    const acc = {};
    Object.keys(STREAMS).forEach(k => { acc[k] = 0; });
    let anyLines = false;
    filtered.forEach(inv => {
      const lines = inv.pos_transaction_items || [];
      if (!lines.length) return;
      anyLines = true;
      const t = splitByStream(forSplit(lines), { [inv.id]: preTax(inv) });
      Object.keys(acc).forEach(k => { acc[k] += t[k]; });
    });
    return anyLines ? acc : null;
  })();

  // A refundable deposit is money held for the customer, not earned. Counting
  // it as revenue overstated August by ₹6,000 of ₹11,810.
  const depositsHeld = categoryTotals?.deposit || 0;
  const taxCollected = filtered.reduce((s, i) => s + taxOnBill(i) + (Number(i.round_off) || 0), 0);
  const netRevenue = totalBilled - depositsHeld - taxCollected;

  // ── Exports — all follow the filters on screen ──────────────────────
  const num = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const ymdOf = (ts) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const fileTag = `${dateFrom || 'start'}_to_${dateTo || 'today'}`;
  const streamTotals = (inv) => {
    const lines = inv.pos_transaction_items || [];
    return lines.length ? splitByStream(forSplit(lines), { [inv.id]: preTax(inv) }) : null;
  };

  const exportInvoices = () => {
    exportToCSV(filtered.map(inv => {
      const t = streamTotals(inv) || {};
      return {
        'Invoice #': invoiceNumber(inv),
        Date: ymdOf(inv.created_at),
        Customer: inv.members?.name || 'Walk-in',
        Phone: inv.members?.phone || '',
        Payment: (inv.payment_method || '').toUpperCase(),
        Library: num(t.library), Cafe: num(t.cafe), Memberships: num(t.membership), Fines: num(t.fines),
        'Deposits (refundable)': num(t.deposit),
        Discount: num(inv.discount_amount),
        'Taxable value': num(inv.taxable_value),
        CGST: num(inv.cgst_amount), SGST: num(inv.sgst_amount), IGST: num(inv.igst_amount),
        'Round off': num(inv.round_off),
        Total: num(inv.total_amount),
      };
    }), `invoices_${fileTag}`);
  };

  const exportLineItems = () => {
    const rows = [];
    filtered.forEach(inv => (inv.pos_transaction_items || []).forEach(l => {
      rows.push({
        'Invoice #': invoiceNumber(inv),
        Date: ymdOf(inv.created_at),
        Customer: inv.members?.name || 'Walk-in',
        Item: l.item_name,
        Category: STREAMS[streamOf(l)]?.label || '',
        Qty: l.quantity,
        'Unit price': num(l.unit_price),
        'Line total': num(l.total_price),
        HSN: l.hsn_code || '',
        'GST %': l.gst_rate ?? '',
        'Taxable value': l.taxable_value ?? '',
        CGST: l.cgst_amount ?? '', SGST: l.sgst_amount ?? '', IGST: l.igst_amount ?? '',
        Payment: (inv.payment_method || '').toUpperCase(),
      });
    }));
    exportToCSV(rows, `invoice_items_${fileTag}`);
  };

  const exportDaily = () => {
    const days = {};
    filtered.forEach(inv => {
      const k = ymdOf(inv.created_at);
      const d = days[k] || (days[k] = { Date: k, Bills: 0, Library: 0, Cafe: 0, Memberships: 0, Fines: 0, 'Deposits (refundable)': 0, GST: 0, Cash: 0, UPI: 0, Card: 0, Other: 0, Total: 0 });
      const t = streamTotals(inv) || {};
      d.Bills += 1;
      d.Library += t.library || 0; d.Cafe += t.cafe || 0; d.Memberships += t.membership || 0;
      d.Fines += t.fines || 0; d['Deposits (refundable)'] += t.deposit || 0;
      d.GST += taxOnBill(inv);
      const total = Number(inv.total_amount) || 0;
      const m = (inv.payment_method || '').toLowerCase();
      if (m === 'cash') d.Cash += total; else if (m === 'upi') d.UPI += total; else if (m === 'card') d.Card += total; else d.Other += total;
      d.Total += total;
    });
    exportToCSV(Object.values(days).sort((a, b) => a.Date.localeCompare(b.Date))
      .map(d => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, typeof v === 'number' && k !== 'Bills' ? num(v) : v]))),
      `daily_summary_${fileTag}`);
  };

  // Plain-language names for the HSN / SAC codes the GST settings use.
  const HSN_NAMES = {
    '996331': 'Café food & drinks',
    '4901': 'Books',
    '999723': 'Library memberships',
    '999799': 'Fines & other charges',
    '999293': 'Events & workshops',
  };
  const prettyDate = (ymd) => (ymd ? new Date(`${ymd}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '…');

  const exportGst = () => {
    const groups = {};
    filtered.forEach(inv => (inv.pos_transaction_items || []).forEach(l => {
      const stream = streamOf(l);
      const exempt = l.is_exempt || stream === 'deposit';
      const hasRate = l.gst_rate !== null && l.gst_rate !== undefined;
      const rateKey = exempt ? 'exempt' : hasRate ? String(l.gst_rate) : 'off';
      const key = `${stream}|${l.hsn_code || ''}|${rateKey}`;
      const g = groups[key] || (groups[key] = {
        what: stream === 'deposit' ? 'Refundable deposits' : (HSN_NAMES[l.hsn_code] || STREAMS[stream]?.label || 'Other'),
        hsn: l.hsn_code || '',
        rate: exempt ? 'Exempt (refundable deposit, not a sale)' : hasRate ? `${Number(l.gst_rate)}%` : 'Not charged (GST off for this)',
        sortRate: exempt ? -2 : hasRate ? Number(l.gst_rate) : -1,
        items: 0, value: 0, cgst: 0, sgst: 0, igst: 0,
      });
      const value = l.taxable_value !== null && l.taxable_value !== undefined ? Number(l.taxable_value) : Number(l.total_price) || 0;
      g.items += Number(l.quantity) || 1;
      g.value += value;
      g.cgst += Number(l.cgst_amount) || 0;
      g.sgst += Number(l.sgst_amount) || 0;
      g.igst += Number(l.igst_amount) || 0;
    }));
    const list = Object.values(groups).sort((a, b) => b.sortRate - a.sortRate || b.value - a.value);
    const sum = (k) => list.reduce((s, g) => s + g[k], 0);
    const rowOf = (g) => {
      const tax = g.cgst + g.sgst + g.igst;
      return [g.what, g.hsn, g.rate, g.items, num(g.value), num(g.cgst), num(g.sgst), num(g.igst), num(tax), num(g.value + tax)];
    };
    const totalTax = sum('cgst') + sum('sgst') + sum('igst');
    exportRowsToCSV([
      ['GST summary — Tapas Reading Cafe'],
      ['Period', `${prettyDate(dateFrom)} to ${prettyDate(dateTo)}`],
      ['Bills', filtered.length],
      ['GST collected', num(totalTax)],
      [],
      ['What was sold', 'HSN / SAC code', 'GST rate', 'Items', 'Value before GST (₹)', 'CGST (₹)', 'SGST (₹)', 'IGST (₹)', 'Total GST (₹)', 'Total collected (₹)'],
      ...list.map(rowOf),
      ['TOTAL', '', '', sum('items'), num(sum('value')), num(sum('cgst')), num(sum('sgst')), num(sum('igst')), num(totalTax), num(sum('value') + totalTax)],
      [],
      ['What the columns mean'],
      ['Value before GST', 'The price of what was sold, with no tax in it (the "taxable value" in GST returns).'],
      ['CGST / SGST', 'GST on a sale inside Karnataka is split half-and-half: CGST goes to the central government, SGST to the state.'],
      ['IGST', 'GST on a sale to a customer outside Karnataka. Normally zero for a café.'],
      ['Total GST', 'The tax collected from customers, which is owed to the government.'],
      ['Not charged', 'GST is switched off for this type of sale in Accounts → GST Settings, so no tax was added.'],
      ['Exempt', 'Refundable deposits are not sales, so GST never applies and they are not income.'],
    ], `gst_summary_${fileTag}`);
  };

  const EXPORTS = [
    { icon: '🧾', label: 'Invoices', hint: 'One row per bill, split by category, with GST', run: exportInvoices },
    { icon: '📋', label: 'Line items', hint: 'Every item on every bill', run: exportLineItems },
    { icon: '📅', label: 'Daily summary', hint: 'Totals per day, by category and Cash / UPI / Card', run: exportDaily },
    { icon: '🏛️', label: 'GST summary', hint: 'Taxable value and tax by HSN and rate, for your accountant', run: exportGst },
    { icon: '🖨️', label: 'Print / Save as PDF', hint: 'The list as shown, ready to print', run: () => printList() },
  ];

  // GST from localStorage
  const gstRate = Number(localStorage.getItem('gst_rate') || 0);

  if (!tableReady) {
    return (
      <div style={{ padding: '20px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>Invoices</h1>
        <div style={{ background: '#fff3cd', padding: '20px', borderRadius: '12px', color: '#856404' }}>
          <strong>POS table not found.</strong> Run the SQL setup from the POS page first to create the <code>pos_transactions</code> table.
        </div>
      </div>
    );
  }

  const cardStyle = { background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' };
  const thStyle = { padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#888', textTransform: 'uppercase', borderBottom: '2px solid #f0f0f0' };
  const tdStyle = { padding: '10px 12px', fontSize: '14px', borderBottom: '1px solid #f5f5f5' };

  return (
    <div style={{ padding: '20px' }}>
      <style>{`
        @media (max-width: 768px) {
          .inv-stats { grid-template-columns: repeat(2, 1fr) !important; }
          .inv-filters { flex-direction: column !important; }
          .inv-table-wrap { overflow-x: auto; }
        }
        @media print { .no-print { display: none !important; } }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '28px', margin: 0 }}>Invoices</h1>
        <div style={{ position: 'relative' }} className="no-print">
          <button onClick={() => setExportOpen(o => !o)} disabled={loading || filtered.length === 0}
            style={{ padding: '10px 18px', background: filtered.length === 0 ? '#c7cbd1' : '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: filtered.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '14px' }}>
            📥 Export ▾
          </button>
          {exportOpen && (
            <>
              <div onClick={() => setExportOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
              <div style={{ position: 'absolute', right: 0, top: '46px', zIndex: 51, background: 'white', borderRadius: '10px', boxShadow: '0 12px 36px rgba(0,0,0,0.18)', padding: '6px', width: '300px' }}>
                <div style={{ padding: '8px 10px 6px', fontSize: '11px', color: '#9ca3af' }}>
                  {filtered.length} invoice{filtered.length === 1 ? '' : 's'} · {dateFrom || '…'} to {dateTo || '…'} · opens in Excel
                </div>
                {EXPORTS.map(x => (
                  <button key={x.label} onClick={() => { setExportOpen(false); x.run(); }}
                    style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', width: '100%', padding: '9px 10px', border: 'none', background: 'transparent', borderRadius: '6px', cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f5f7ff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <span style={{ fontSize: '18px' }}>{x.icon}</span>
                    <span>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#333' }}>{x.label}</div>
                      <div style={{ fontSize: '11px', color: '#888', marginTop: '1px' }}>{x.hint}</div>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="inv-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total Invoices', value: totalCount, color: '#667eea', icon: '📄' },
          { label: 'Revenue', value: fmt(netRevenue), color: '#1dd1a1', icon: '💰',
            note: depositsHeld > 0 ? `excl. ${fmt(depositsHeld)} deposits` : null },
          { label: 'Avg Invoice', value: fmt(avgValue), color: '#f39c12', icon: '📊' },
          { label: 'This Month', value: thisMonthCount, color: '#9b59b6', icon: '📅' },
        ].map(s => (
          <div key={s.label} style={{ ...cardStyle, textAlign: 'center', borderTop: `3px solid ${s.color}`, marginBottom: 0 }}>
            <div style={{ fontSize: '22px', marginBottom: '4px' }}>{s.icon}</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#333' }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{s.label}</div>
            {s.note && <div style={{ fontSize: '10px', color: '#b0b4ba', marginTop: '2px', fontStyle: 'italic' }}>{s.note}</div>}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={cardStyle}>
        <div className="inv-filters" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ fontSize: '13px', color: '#555' }}>
            From
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ display: 'block', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', marginTop: '4px' }} />
          </label>
          <label style={{ fontSize: '13px', color: '#555' }}>
            To
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ display: 'block', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', marginTop: '4px' }} />
          </label>
          <label style={{ fontSize: '13px', color: '#555' }}>
            Customer
            <input type="text" placeholder="Search member..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
              style={{ display: 'block', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', marginTop: '4px', width: '160px' }} />
          </label>
          <label style={{ fontSize: '13px', color: '#555' }}>
            Min ₹
            <input type="number" placeholder="0" value={minAmount} onChange={e => setMinAmount(e.target.value)}
              style={{ display: 'block', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', marginTop: '4px', width: '90px' }} />
          </label>
          <label style={{ fontSize: '13px', color: '#555' }}>
            Max ₹
            <input type="number" placeholder="999999" value={maxAmount} onChange={e => setMaxAmount(e.target.value)}
              style={{ display: 'block', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', marginTop: '4px', width: '90px' }} />
          </label>
          <button onClick={fetchInvoices}
            style={{ padding: '8px 18px', background: '#667eea', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', height: '38px', alignSelf: 'flex-end' }}>
            Refresh
          </button>
        </div>
      </div>

      {/* Category totals for the filtered view */}
      {categoryTotals && (
        <div style={{ ...cardStyle, marginBottom: '16px', padding: '14px 18px' }}>
          <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.6px', color: '#9ca3af', marginBottom: '10px' }}>
            BY CATEGORY
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {Object.keys(STREAMS).map(k => {
              const st = STREAMS[k];
              const val = categoryTotals[k];
              const isDeposit = k === 'deposit';
              return (
                <div key={k} style={{
                  flex: '1 1 130px', minWidth: '130px', padding: '10px 12px', borderRadius: '8px',
                  background: val > 0 ? '#fafbfc' : 'transparent',
                  border: `1px solid ${val > 0 ? '#eef0f3' : '#f5f6f8'}`,
                  borderLeft: `3px solid ${val > 0 ? st.color : '#eef0f3'}`,
                  opacity: val > 0 ? 1 : 0.45,
                }}>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '3px' }}>{st.icon} {st.label}</div>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: val > 0 ? st.color : '#c7cbd1' }}>{fmt(val)}</div>
                  {isDeposit && <div style={{ fontSize: '9px', color: '#9ca3af', fontStyle: 'italic', marginTop: '2px' }}>refundable — not revenue</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Invoice table */}
      <div style={cardStyle}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '30px' }}>Loading invoices...</p>
        ) : filtered.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '30px' }}>No invoices found for the selected filters.</p>
        ) : (
          <div className="inv-table-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Invoice #</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Customer</th>
                  <th style={thStyle}>Category</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                  <th style={thStyle}>Payment</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id} style={{ transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8f9ff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: '#667eea', fontFamily: 'monospace' }}>
                      {invoiceNumber(inv)}
                    </td>
                    <td style={tdStyle}>
                      {new Date(inv.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={tdStyle}>{inv.members?.name || 'Walk-in'}</td>
                    <td style={tdStyle}>
                      {(() => {
                        const cats = categoriesOf(inv);
                        if (!cats.length) {
                          return <span style={{ fontSize: '11px', color: '#c7cbd1', fontStyle: 'italic' }}>no line detail</span>;
                        }
                        return (
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            {cats.map(c => (
                              <span key={c.key} title={`${c.label}: ${fmt(c.amount)}`}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                                  padding: '2px 8px', borderRadius: '11px', whiteSpace: 'nowrap',
                                  fontSize: '11px', fontWeight: 700,
                                  color: c.color, background: `${c.color}14`, border: `1px solid ${c.color}33`,
                                }}>
                                {c.icon} {c.label} {fmt(c.amount)}
                              </span>
                            ))}
                          </div>
                        );
                      })()}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmt(inv.total_amount)}</td>
                    <td style={tdStyle}>{paymentBadge(inv.payment_method)}</td>
                    <td style={{ ...tdStyle, display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button onClick={() => openDetail(inv)}
                        style={{ padding: '5px 14px', background: '#667eea', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                        View
                      </button>
                      {confirmDeleteId === inv.id ? (
                        <>
                          <span style={{ fontSize: '12px', color: '#e74c3c', fontWeight: 600 }}>Sure?</span>
                          <button onClick={() => deleteInvoice(inv)}
                            style={{ padding: '5px 10px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                            Yes
                          </button>
                          <button onClick={() => setConfirmDeleteId(null)}
                            style={{ padding: '5px 10px', background: '#aaa', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                            No
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(inv.id)}
                          style={{ padding: '5px 14px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Print / Save as PDF of the filtered list (hidden on screen) */}
      <div style={{ display: 'none' }}>
        <div ref={listPrintRef} style={{ padding: '24px', fontFamily: 'sans-serif', color: '#222' }}>
          <h2 style={{ margin: '0 0 2px' }}>Tapas Reading Cafe — Invoices</h2>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '14px' }}>
            {dateFrom} to {dateTo} · {filtered.length} invoices · Billed {fmt(totalBilled)} · Revenue {fmt(netRevenue)} (excl. {fmt(depositsHeld)} deposits, {fmt(taxCollected)} GST)
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr>{['Invoice #', 'Date', 'Customer', 'Category', 'Payment', 'Amount'].map(h => (
                <th key={h} style={{ textAlign: h === 'Amount' ? 'right' : 'left', borderBottom: '2px solid #333', padding: '5px 6px' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.id}>
                  <td style={{ borderBottom: '1px solid #ddd', padding: '4px 6px', fontFamily: 'monospace' }}>{invoiceNumber(inv)}</td>
                  <td style={{ borderBottom: '1px solid #ddd', padding: '4px 6px' }}>{new Date(inv.created_at).toLocaleDateString('en-IN')}</td>
                  <td style={{ borderBottom: '1px solid #ddd', padding: '4px 6px' }}>{inv.members?.name || 'Walk-in'}</td>
                  <td style={{ borderBottom: '1px solid #ddd', padding: '4px 6px' }}>{categoriesOf(inv).map(c => `${c.label} ${fmt(c.amount)}`).join(', ')}</td>
                  <td style={{ borderBottom: '1px solid #ddd', padding: '4px 6px' }}>{(inv.payment_method || '').toUpperCase()}</td>
                  <td style={{ borderBottom: '1px solid #ddd', padding: '4px 6px', textAlign: 'right' }}>{fmt(inv.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedInvoice && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedInvoice(null); }}>
          <div style={{ background: 'white', borderRadius: '12px', maxWidth: '650px', width: '100%', maxHeight: '90vh', overflow: 'auto', position: 'relative' }}>
            {/* Modal header (non-printable) */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #eee' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Invoice Detail</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => handleReactToPrint()}
                  style={{ padding: '6px 16px', background: '#667eea', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                  Print
                </button>
                <button onClick={() => setSelectedInvoice(null)}
                  style={{ padding: '6px 14px', background: '#f0f0f0', color: '#555', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>
                  ✕
                </button>
              </div>
            </div>

            {/* Printable invoice content */}
            <div ref={printRef} style={{ padding: '30px' }}>
              {/* Invoice header */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#333', letterSpacing: '1px' }}>TAPAS READING CAFE</h2>
                <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#667eea', fontWeight: 600, letterSpacing: '2px' }}>TAX INVOICE</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '13px', color: '#555' }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '4px', color: '#333' }}>Bill To:</div>
                  <div>{selectedInvoice.members?.name || 'Walk-in Customer'}</div>
                  {selectedInvoice.members?.phone && <div>Ph: {selectedInvoice.members.phone}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div><strong>Invoice:</strong> {invoiceNumber(selectedInvoice)}</div>
                  <div><strong>Date:</strong> {new Date(selectedInvoice.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  <div style={{ marginTop: '6px' }}>{paymentBadge(selectedInvoice.payment_method)}</div>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '16px 0' }} />

              {detailLoading ? (
                <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>Loading items...</p>
              ) : (
                <>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                    <thead>
                      <tr style={{ background: '#f8f9ff' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#667eea', borderBottom: '2px solid #667eea' }}>#</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#667eea', borderBottom: '2px solid #667eea' }}>Item</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#667eea', borderBottom: '2px solid #667eea' }}>Qty</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#667eea', borderBottom: '2px solid #667eea' }}>Unit Price</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#667eea', borderBottom: '2px solid #667eea' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, i) => (
                        <tr key={item.id}>
                          <td style={{ padding: '8px 10px', fontSize: '13px', borderBottom: '1px solid #f0f0f0', color: '#888' }}>{i + 1}</td>
                          <td style={{ padding: '8px 10px', fontSize: '13px', borderBottom: '1px solid #f0f0f0' }}>{item.item_name}</td>
                          <td style={{ padding: '8px 10px', fontSize: '13px', borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}>{item.quantity}</td>
                          <td style={{ padding: '8px 10px', fontSize: '13px', borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>{fmt(item.unit_price)}</td>
                          <td style={{ padding: '8px 10px', fontSize: '13px', borderBottom: '1px solid #f0f0f0', textAlign: 'right', fontWeight: 600 }}>{fmt(item.total_price)}</td>
                        </tr>
                      ))}
                      {lineItems.length === 0 && (
                        <tr><td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: '#999', fontSize: '13px' }}>No line items found</td></tr>
                      )}
                    </tbody>
                  </table>

                  {/* Totals */}
                  {(() => {
                    const subtotal = lineItems.reduce((s, i) => s + (Number(i.total_price) || 0), 0);
                    const discount = Number(selectedInvoice.discount_amount) || 0;
                    const afterDiscount = subtotal - discount;
                    const gst = gstRate > 0 ? afterDiscount * (gstRate / 100) : 0;
                    const grandTotal = afterDiscount + gst;
                    return (
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ width: '240px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px', color: '#555' }}>
                            <span>Subtotal</span><span>{fmt(subtotal)}</span>
                          </div>
                          {discount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px', color: '#e74c3c' }}>
                              <span>Discount</span><span>-{fmt(discount)}</span>
                            </div>
                          )}
                          {gstRate > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px', color: '#555' }}>
                              <span>GST ({gstRate}%)</span><span>{fmt(gst)}</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', fontSize: '16px', fontWeight: 700, borderTop: '2px solid #333', marginTop: '6px', color: '#333' }}>
                            <span>Grand Total</span><span>{fmt(grandTotal)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}

              <div style={{ textAlign: 'center', marginTop: '30px', paddingTop: '16px', borderTop: '1px dashed #ccc', fontSize: '12px', color: '#999' }}>
                Thank you for visiting Tapas Reading Cafe!
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
