import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useToast } from '../components/Toast';
import { usePermission } from '../hooks/usePermission';
import ViewOnlyBanner from '../components/ViewOnlyBanner';

const SETUP_SQL = `CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY, order_number SERIAL,
  vendor_id UUID REFERENCES vendors(id), total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft', order_date DATE DEFAULT CURRENT_DATE,
  expected_date DATE, received_date DATE, notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_description TEXT NOT NULL, quantity INTEGER DEFAULT 1,
  unit_price NUMERIC DEFAULT 0, total_price NUMERIC DEFAULT 0
);
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open" ON purchase_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON purchase_order_items FOR ALL USING (true) WITH CHECK (true);`;

export default function PurchaseOrders() {
  const toast = useToast();
  const { isReadOnly, canManageVendors } = usePermission();
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableReady, setTableReady] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [form, setForm] = useState({ vendor_id: '', notes: '', expected_date: '' });
  const [lineItems, setLineItems] = useState([{ item_description: '', quantity: 1, unit_price: 0 }]);

  useEffect(() => {
    const check = async () => {
      const { error } = await supabase.from('purchase_orders').select('id').limit(0);
      if (error) { setTableReady(false); setLoading(false); return; }
      fetchData();
    };
    check();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: po }, { data: v }] = await Promise.all([
      supabase.from('purchase_orders').select('*, vendors(name)').order('created_at', { ascending: false }),
      supabase.from('vendors').select('id, name').eq('is_active', true).order('name'),
    ]);
    setOrders(po || []);
    setVendors(v || []);
    setLoading(false);
  };

  const addLine = () => setLineItems(prev => [...prev, { item_description: '', quantity: 1, unit_price: 0 }]);
  const updateLine = (i, field, val) => setLineItems(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l));
  const removeLine = (i) => setLineItems(prev => prev.filter((_, idx) => idx !== i));

  const createPO = async () => {
    if (!form.vendor_id) return toast.warning('Select a vendor');
    const validLines = lineItems.filter(l => l.item_description);
    if (!validLines.length) return toast.warning('Add at least one item');
    const total = validLines.reduce((s, l) => s + (l.quantity * l.unit_price), 0);
    try {
      const { data: po, error } = await supabase.from('purchase_orders').insert([{ vendor_id: form.vendor_id, total_amount: total, notes: form.notes, expected_date: form.expected_date || null }]).select().single();
      if (error) throw error;
      const items = validLines.map(l => ({ purchase_order_id: po.id, item_description: l.item_description, quantity: parseInt(l.quantity), unit_price: parseFloat(l.unit_price), total_price: l.quantity * l.unit_price }));
      await supabase.from('purchase_order_items').insert(items);
      setShowModal(false);
      setForm({ vendor_id: '', notes: '', expected_date: '' });
      setLineItems([{ item_description: '', quantity: 1, unit_price: 0 }]);
      fetchData();
    } catch (err) { toast.error('Error: ' + err.message); }
  };

  const updateStatus = async (id, status) => {
    const update = { status };
    if (status === 'received') update.received_date = new Date().toISOString().split('T')[0];
    await supabase.from('purchase_orders').update(update).eq('id', id);
    fetchData();
  };

  const viewPO = async (po) => {
    setSelectedOrder(po);
    const { data } = await supabase.from('purchase_order_items').select('*').eq('purchase_order_id', po.id);
    setOrderItems(data || []);
  };

  const statusColor = (s) => ({ draft: '#6c757d', ordered: '#667eea', received: '#1dd1a1', cancelled: '#e74c3c' }[s] || '#999');

  if (!tableReady) {
    return (
      <div style={{ padding: '20px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>📦 Purchase Orders</h1>
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '20px' }}>
          <h3>Setup Required</h3>
          <pre style={{ background: '#f8f9fa', padding: '16px', borderRadius: '6px', fontSize: '12px', overflow: 'auto', whiteSpace: 'pre-wrap', marginTop: '8px' }}>{SETUP_SQL}</pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: '12px', padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Check Again</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {isReadOnly && <ViewOnlyBanner />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '28px', margin: 0 }}>📦 Purchase Orders</h1>
        {!isReadOnly && canManageVendors && <button onClick={() => setShowModal(true)} style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>+ New PO</button>}
      </div>

      {loading ? <p style={{ color: '#999' }}>Loading...</p> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                {['PO#', 'Vendor', 'Amount', 'Status', 'Order Date', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#666', fontWeight: '600' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', color: '#999', padding: '30px' }}>No purchase orders</td></tr>
              ) : orders.map(po => (
                <tr key={po.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '10px 12px', fontWeight: '600', fontSize: '13px' }}>#{po.order_number}</td>
                  <td style={{ padding: '10px 12px', fontSize: '13px' }}>{po.vendors?.name || '-'}</td>
                  <td style={{ padding: '10px 12px', fontWeight: '600', color: '#27ae60', fontSize: '13px' }}>₹{po.total_amount?.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', background: statusColor(po.status) + '20', color: statusColor(po.status) }}>{po.status}</span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '12px', color: '#999' }}>{new Date(po.order_date).toLocaleDateString('en-IN')}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      <button onClick={() => viewPO(po)} style={{ padding: '3px 8px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>View</button>
                      {po.status === 'draft' && <button onClick={() => updateStatus(po.id, 'ordered')} disabled={isReadOnly || !canManageVendors} style={{ padding: '3px 8px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '4px', cursor: (isReadOnly || !canManageVendors) ? 'not-allowed' : 'pointer', fontSize: '11px', opacity: (isReadOnly || !canManageVendors) ? 0.5 : 1 }}>Order</button>}
                      {po.status === 'ordered' && <button onClick={() => updateStatus(po.id, 'received')} disabled={isReadOnly || !canManageVendors} style={{ padding: '3px 8px', background: '#1dd1a1', color: 'white', border: 'none', borderRadius: '4px', cursor: (isReadOnly || !canManageVendors) ? 'not-allowed' : 'pointer', fontSize: '11px', opacity: (isReadOnly || !canManageVendors) ? 0.5 : 1 }}>Received</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create PO Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 16px', fontSize: '18px' }}>New Purchase Order</h2>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#666', fontWeight: '600', marginBottom: '4px' }}>Vendor *</label>
              <select value={form.vendor_id} onChange={e => setForm({ ...form, vendor_id: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px' }}>
                <option value="">Select vendor...</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#666', fontWeight: '600', marginBottom: '4px' }}>Expected Date</label>
                <input type="date" value={form.expected_date} onChange={e => setForm({ ...form, expected_date: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#666', fontWeight: '600', marginBottom: '4px' }}>Notes</label>
                <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px' }} />
              </div>
            </div>
            <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Line Items</h3>
            {lineItems.map((line, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input placeholder="Item description" value={line.item_description} onChange={e => updateLine(i, 'item_description', e.target.value)} style={{ flex: 2, padding: '6px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '13px', minWidth: '120px' }} />
                <input type="number" placeholder="Qty" value={line.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} style={{ width: '60px', padding: '6px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '13px' }} />
                <input type="number" placeholder="Price" value={line.unit_price} onChange={e => updateLine(i, 'unit_price', e.target.value)} style={{ width: '80px', padding: '6px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '13px' }} />
                <span style={{ fontSize: '13px', fontWeight: '600', minWidth: '60px', color: '#667eea' }}>₹{(line.quantity * line.unit_price) || 0}</span>
                {lineItems.length > 1 && <button onClick={() => removeLine(i)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '16px' }}>✕</button>}
              </div>
            ))}
            <button onClick={addLine} style={{ padding: '4px 12px', background: 'none', border: '1px dashed #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', marginBottom: '12px', color: '#666' }}>+ Add Item</button>
            <div style={{ borderTop: '2px solid #eee', paddingTop: '12px', fontSize: '16px', fontWeight: '700', textAlign: 'right', color: '#667eea' }}>
              Total: ₹{lineItems.reduce((s, l) => s + (l.quantity * l.unit_price || 0), 0).toLocaleString('en-IN')}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button onClick={createPO} disabled={isReadOnly} style={{ flex: 1, padding: '10px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: isReadOnly ? 'not-allowed' : 'pointer', opacity: isReadOnly ? 0.5 : 1 }}>Create PO</button>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', background: '#e0e0e0', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* View PO Modal */}
      {selectedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setSelectedOrder(null)}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', maxWidth: '500px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 12px', fontSize: '18px' }}>PO #{selectedOrder.order_number}</h2>
            <p style={{ fontSize: '13px', color: '#666' }}>Vendor: <strong>{selectedOrder.vendors?.name}</strong></p>
            <p style={{ fontSize: '13px', color: '#666' }}>Status: <strong style={{ color: statusColor(selectedOrder.status) }}>{selectedOrder.status}</strong></p>
            <div style={{ borderTop: '1px solid #eee', marginTop: '12px', paddingTop: '12px' }}>
              {orderItems.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f8f8f8', fontSize: '13px' }}>
                  <span>{item.quantity}x {item.item_description}</span>
                  <span style={{ fontWeight: '600' }}>₹{item.total_price}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '16px', marginTop: '12px', color: '#667eea' }}>
                <span>Total</span><span>₹{selectedOrder.total_amount?.toLocaleString('en-IN')}</span>
              </div>
            </div>
            <button onClick={() => setSelectedOrder(null)} style={{ width: '100%', marginTop: '16px', padding: '10px', background: '#e0e0e0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
