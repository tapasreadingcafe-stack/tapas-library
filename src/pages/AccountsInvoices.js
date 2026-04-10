import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { useToast } from '../components/Toast';
import { useReactToPrint } from 'react-to-print';

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

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableReady, setTableReady] = useState(true);

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
        .select('*, members(name, phone)')
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
  const totalRevenue = filtered.reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
  const avgValue = totalCount ? totalRevenue / totalCount : 0;
  const thisMonthCount = filtered.filter(i => {
    const d = new Date(i.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const invoiceNumber = (index) => {
    const year = new Date().getFullYear();
    return `INV-${year}-${String(index + 1).padStart(4, '0')}`;
  };

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

      <h1 style={{ fontSize: '28px', marginBottom: '20px' }}>Invoices</h1>

      {/* Stats bar */}
      <div className="inv-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total Invoices', value: totalCount, color: '#667eea', icon: '📄' },
          { label: 'Total Revenue', value: fmt(totalRevenue), color: '#1dd1a1', icon: '💰' },
          { label: 'Avg Invoice', value: fmt(avgValue), color: '#f39c12', icon: '📊' },
          { label: 'This Month', value: thisMonthCount, color: '#9b59b6', icon: '📅' },
        ].map(s => (
          <div key={s.label} style={{ ...cardStyle, textAlign: 'center', borderTop: `3px solid ${s.color}`, marginBottom: 0 }}>
            <div style={{ fontSize: '22px', marginBottom: '4px' }}>{s.icon}</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#333' }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{s.label}</div>
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
                  <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                  <th style={thStyle}>Payment</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv, idx) => (
                  <tr key={inv.id} style={{ transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8f9ff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: '#667eea', fontFamily: 'monospace' }}>
                      {invoiceNumber(idx)}
                    </td>
                    <td style={tdStyle}>
                      {new Date(inv.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={tdStyle}>{inv.members?.name || 'Walk-in'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmt(inv.total_amount)}</td>
                    <td style={tdStyle}>{paymentBadge(inv.payment_method)}</td>
                    <td style={tdStyle}>
                      <button onClick={() => openDetail(inv)}
                        style={{ padding: '5px 14px', background: '#667eea', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
                  <div><strong>Invoice:</strong> {invoiceNumber(filtered.findIndex(i => i.id === selectedInvoice.id))}</div>
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
