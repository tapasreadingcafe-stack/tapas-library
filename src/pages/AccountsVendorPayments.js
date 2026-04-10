import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useToast } from '../components/Toast';

const STATUS_STYLES = {
  pending: { bg: '#fff3cd', color: '#856404', label: 'Pending' },
  partial: { bg: '#d1ecf1', color: '#0c5460', label: 'Partial' },
  completed: { bg: '#d4edda', color: '#155724', label: 'Completed' },
  cancelled: { bg: '#f8d7da', color: '#721c24', label: 'Cancelled' },
};

const card = {
  background: 'white', borderRadius: '12px', padding: '20px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
};

export default function AccountsVendorPayments() {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vendorFilter, setVendorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [posResult, vendorsResult] = await Promise.all([
        supabase.from('purchase_orders').select('*, vendors(name)').order('created_at', { ascending: false }),
        supabase.from('vendors').select('id, name'),
      ]);
      setOrders(posResult.data || []);
      setVendors(vendorsResult.data || []);
    } catch (err) {
      console.error('Error fetching vendor payments:', err);
    }
    setLoading(false);
  };

  const markPaid = async (id) => {
    try {
      const { error } = await supabase.from('purchase_orders').update({ status: 'completed' }).eq('id', id);
      if (error) throw error;
      toast.success('Purchase order marked as paid');
      fetchData();
    } catch (err) {
      toast.error('Failed to update: ' + err.message);
    }
  };

  // Stats
  const totalVendors = vendors.length;
  const openPOs = orders.filter(o => o.status === 'pending' || o.status === 'partial').length;
  const totalOutstanding = orders
    .filter(o => o.status !== 'completed' && o.status !== 'cancelled')
    .reduce((s, o) => s + (o.total_amount || o.amount || 0), 0);
  const totalPaid = orders
    .filter(o => o.status === 'completed')
    .reduce((s, o) => s + (o.total_amount || o.amount || 0), 0);

  // Aging report
  const now = new Date();
  const pendingOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
  const aging = { '0-30': 0, '31-60': 0, '60+': 0 };
  pendingOrders.forEach(o => {
    const created = new Date(o.created_at);
    const days = Math.floor((now - created) / 86400000);
    if (days <= 30) aging['0-30'] += (o.total_amount || o.amount || 0);
    else if (days <= 60) aging['31-60'] += (o.total_amount || o.amount || 0);
    else aging['60+'] += (o.total_amount || o.amount || 0);
  });

  // Vendor spending breakdown
  const vendorSpending = {};
  orders.filter(o => o.status !== 'cancelled').forEach(o => {
    const name = o.vendors?.name || 'Unknown';
    vendorSpending[name] = (vendorSpending[name] || 0) + (o.total_amount || o.amount || 0);
  });
  const vendorSpendingArr = Object.entries(vendorSpending)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
  const maxSpending = Math.max(...vendorSpendingArr.map(v => v.amount), 1);

  // Filtered orders
  const filtered = orders.filter(o => {
    if (vendorFilter !== 'all' && o.vendor_id !== vendorFilter) return false;
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (dateFrom && o.created_at < dateFrom) return false;
    if (dateTo && o.created_at > dateTo + 'T23:59:59') return false;
    if (search) {
      const q = search.toLowerCase();
      const vendorName = (o.vendors?.name || '').toLowerCase();
      const poNum = String(o.po_number || o.id || '').toLowerCase();
      if (!vendorName.includes(q) && !poNum.includes(q)) return false;
    }
    return true;
  });

  // Outstanding payables (pending, oldest first)
  const outstanding = orders
    .filter(o => o.status === 'pending' || o.status === 'partial')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  return (
    <div style={{ padding: '20px' }}>
      <style>{`
        @media (max-width: 768px) {
          .vp-stats { grid-template-columns: repeat(2, 1fr) !important; }
          .vp-aging { grid-template-columns: repeat(3, 1fr) !important; }
          .vp-table-wrap { overflow-x: auto; }
          .vp-bottom { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .vp-stats { grid-template-columns: 1fr !important; gap: 8px !important; }
          .vp-aging { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <h1 style={{ fontSize: '28px', marginBottom: '20px' }}>🏪 Vendor Payments</h1>

      {loading ? <p style={{ color: '#999' }}>Loading...</p> : (
        <>
          {/* Stats Cards */}
          <div className="vp-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
            {[
              { label: 'Total Vendors', val: totalVendors, color: '#667eea', icon: '🏢' },
              { label: 'Open Purchase Orders', val: openPOs, color: '#f39c12', icon: '📋' },
              { label: 'Total Outstanding', val: `₹${totalOutstanding.toLocaleString('en-IN')}`, color: '#e74c3c', icon: '⏳' },
              { label: 'Total Paid', val: `₹${totalPaid.toLocaleString('en-IN')}`, color: '#1dd1a1', icon: '✅' },
            ].map(s => (
              <div key={s.label} style={{ ...card, textAlign: 'center', borderTop: `3px solid ${s.color}` }}>
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>{s.icon}</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: s.color }}>{s.val}</div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Aging Report */}
          <div style={{ ...card, marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: '700' }}>📅 Aging Report</h3>
            <div className="vp-aging" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[
                { label: '0 - 30 Days', amount: aging['0-30'], color: '#1dd1a1' },
                { label: '31 - 60 Days', amount: aging['31-60'], color: '#f39c12' },
                { label: '60+ Days', amount: aging['60+'], color: '#e74c3c' },
              ].map(a => (
                <div key={a.label} style={{
                  background: `${a.color}12`, border: `1px solid ${a.color}40`,
                  borderRadius: '10px', padding: '16px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: a.color, marginBottom: '6px' }}>{a.label}</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#333' }}>₹{a.amount.toLocaleString('en-IN')}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Purchase Orders Table */}
          <div style={{ ...card, marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: '700' }}>📦 Purchase Orders</h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Search PO # or vendor..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ padding: '8px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', minWidth: '180px' }}
              />
              <select value={vendorFilter} onChange={e => setVendorFilter(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}>
                <option value="all">All Vendors</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}>
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }} />
              <span style={{ color: '#999' }}>to</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }} />
            </div>

            <div className="vp-table-wrap">
              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#999' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
                  <p>No purchase orders found.</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #eee' }}>
                      {['PO #', 'Vendor', 'Date', 'Total Amount', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 8px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: '600', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(o => {
                      const st = STATUS_STYLES[o.status] || STATUS_STYLES.pending;
                      return (
                        <tr key={o.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '10px 8px', fontWeight: '600', color: '#667eea' }}>{o.po_number || o.id?.slice(0, 8) || '—'}</td>
                          <td style={{ padding: '10px 8px' }}>{o.vendors?.name || '—'}</td>
                          <td style={{ padding: '10px 8px', color: '#555', fontSize: '13px' }}>{o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN') : '—'}</td>
                          <td style={{ padding: '10px 8px', fontWeight: '600' }}>₹{(o.total_amount || o.amount || 0).toLocaleString('en-IN')}</td>
                          <td style={{ padding: '10px 8px' }}>
                            <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '600' }}>{st.label}</span>
                          </td>
                          <td style={{ padding: '10px 8px' }}>
                            {(o.status === 'pending' || o.status === 'partial') && (
                              <button
                                onClick={() => markPaid(o.id)}
                                style={{
                                  padding: '5px 12px', background: '#667eea', color: 'white',
                                  border: 'none', borderRadius: '6px', fontSize: '12px',
                                  cursor: 'pointer', fontWeight: '600',
                                }}
                              >
                                Mark Paid
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Bottom Section: Vendor Breakdown + Outstanding */}
          <div className="vp-bottom" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Vendor Spending Breakdown */}
            <div style={card}>
              <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: '700' }}>📊 Spending by Vendor</h3>
              {vendorSpendingArr.length === 0 ? (
                <p style={{ color: '#999', fontSize: '14px' }}>No vendor spending data.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {vendorSpendingArr.slice(0, 10).map((v, i) => (
                    <div key={v.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '500' }}>{v.name}</span>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#667eea' }}>₹{v.amount.toLocaleString('en-IN')}</span>
                      </div>
                      <div style={{ height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: '4px',
                          background: i === 0 ? '#667eea' : i === 1 ? '#9b59b6' : '#c7d2fe',
                          width: `${(v.amount / maxSpending) * 100}%`,
                          transition: 'width 0.3s',
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outstanding Payables */}
            <div style={card}>
              <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: '700' }}>🔴 Outstanding Payables</h3>
              {outstanding.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#999' }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎉</div>
                  <p>All caught up! No outstanding payables.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
                  {outstanding.map(o => {
                    const created = new Date(o.created_at);
                    const days = Math.floor((now - created) / 86400000);
                    return (
                      <div key={o.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 14px', borderRadius: '8px',
                        background: days > 60 ? '#fff0f0' : days > 30 ? '#fffbeb' : '#f8f9fa',
                        border: `1px solid ${days > 60 ? '#f8d7da' : days > 30 ? '#ffeeba' : '#eee'}`,
                      }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '600' }}>{o.vendors?.name || 'Unknown'}</div>
                          <div style={{ fontSize: '11px', color: '#888' }}>
                            {o.po_number || o.id?.slice(0, 8)} &middot; {days} day{days !== 1 ? 's' : ''} ago
                          </div>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: days > 60 ? '#e74c3c' : days > 30 ? '#f39c12' : '#333' }}>
                          ₹{(o.total_amount || o.amount || 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
