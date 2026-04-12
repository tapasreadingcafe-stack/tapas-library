import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import { usePermission } from '../hooks/usePermission';
import ViewOnlyBanner from '../components/ViewOnlyBanner';

export default function CafeOrders() {
  const toast = useToast();
  const confirm = useConfirm();
  const { isReadOnly } = usePermission();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableReady, setTableReady] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { checkAndFetch(); }, []);
  useEffect(() => { if (tableReady) fetchOrders(); }, [dateFilter, statusFilter]);

  const checkAndFetch = async () => {
    const { error } = await supabase.from('cafe_orders').select('id').limit(0);
    if (error) { setTableReady(false); setLoading(false); return; }
    fetchOrders();
  };

  const fetchOrders = async () => {
    setLoading(true);
    let query = supabase.from('cafe_orders').select('*, members(name)').order('created_at', { ascending: false });
    if (dateFilter) {
      query = query.gte('created_at', dateFilter + 'T00:00:00').lte('created_at', dateFilter + 'T23:59:59');
    }
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    const { data } = await query.limit(100);
    setOrders(data || []);
    setLoading(false);
  };

  const viewOrder = async (order) => {
    setSelectedOrder(order);
    const { data } = await supabase.from('cafe_order_items').select('*').eq('order_id', order.id);
    setOrderItems(data || []);
  };

  const cancelOrder = async (id) => {
    if (!await confirm({ title: 'Cancel Order', message: 'Cancel this order?', variant: 'warning' })) return;
    await supabase.from('cafe_orders').update({ status: 'cancelled' }).eq('id', id);
    fetchOrders();
    if (selectedOrder?.id === id) setSelectedOrder(null);
  };

  const statusColor = (s) => {
    if (s === 'completed') return { bg: '#d4edda', color: '#155724' };
    if (s === 'cancelled') return { bg: '#f8d7da', color: '#721c24' };
    if (s === 'pending') return { bg: '#fff3cd', color: '#856404' };
    return { bg: '#e2e3e5', color: '#383d41' };
  };

  if (!tableReady) {
    return (
      <div style={{ padding: '20px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>📋 Cafe Orders</h1>
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '20px' }}>
          <p>Cafe tables not found. Please set up from the Cafe POS page first.</p>
        </div>
      </div>
    );
  }

  const totalRevenue = orders.filter(o => o.status === 'completed').reduce((s, o) => s + (o.total_amount || 0), 0);

  return (
    <div className="cafe-orders-page">
      <style>{`
        .cafe-orders-page { padding: 20px; }
        .cafe-orders-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
        .cafe-orders-header h1 { font-size: 28px; margin: 0; }
        .cafe-orders-stats { display: flex; gap: 12px; }
        .cafe-orders-stat { background: white; padding: 10px 16px; border-radius: 8px; text-align: center; }
        .cafe-orders-stat .val { font-size: 20px; font-weight: 700; color: #667eea; }
        .cafe-orders-stat .lbl { font-size: 11px; color: #999; }
        .cafe-orders-filters { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
        .cafe-orders-filters input, .cafe-orders-filters select { padding: 8px 12px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 14px; }
        .cafe-orders-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .cafe-orders-table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; }
        .cafe-orders-table th { text-align: left; padding: 12px; font-size: 12px; color: #666; background: #f8f9fa; font-weight: 600; white-space: nowrap; }
        .cafe-orders-table td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
        .cafe-orders-table tr:hover { background: #fafbff; }
        .cafe-order-detail-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
        .cafe-order-detail { background: white; border-radius: 12px; padding: 24px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto; }
        @media (max-width: 768px) {
          .cafe-orders-page { padding: 12px; }
          .cafe-orders-header h1 { font-size: 22px; }
          .cafe-orders-stats { flex-wrap: wrap; }
          .cafe-orders-filters input, .cafe-orders-filters select { flex: 1; min-width: 120px; }
        }
        @media (max-width: 480px) {
          .cafe-orders-page { padding: 8px; }
          .cafe-orders-table th, .cafe-orders-table td { padding: 8px 6px; font-size: 12px; }
        }
      `}</style>

      {isReadOnly && <ViewOnlyBanner />}

      <div className="cafe-orders-header">
        <h1>📋 Cafe Orders</h1>
        <div className="cafe-orders-stats">
          <div className="cafe-orders-stat"><div className="val">{orders.length}</div><div className="lbl">ORDERS</div></div>
          <div className="cafe-orders-stat"><div className="val">₹{totalRevenue.toLocaleString('en-IN')}</div><div className="lbl">REVENUE</div></div>
        </div>
      </div>

      <div className="cafe-orders-filters">
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button onClick={fetchOrders} style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Refresh</button>
      </div>

      {loading ? <p style={{ color: '#999' }}>Loading orders...</p> : (
        <div className="cafe-orders-table-wrap">
          <table className="cafe-orders-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', color: '#999', padding: '30px' }}>No orders found</td></tr>
              ) : orders.map(order => {
                const sc = statusColor(order.status);
                return (
                  <tr key={order.id}>
                    <td style={{ fontWeight: '600' }}>#{order.order_number}</td>
                    <td>{order.members?.name || order.customer_name || 'Walk-in'}</td>
                    <td style={{ fontWeight: '600', color: '#27ae60' }}>₹{order.total_amount?.toLocaleString('en-IN')}</td>
                    <td style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: '600' }}>{order.payment_method}</td>
                    <td><span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', background: sc.bg, color: sc.color }}>{order.status}</span></td>
                    <td style={{ color: '#999', fontSize: '12px' }}>{new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => viewOrder(order)} style={{ padding: '4px 8px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>View</button>
                        {order.status === 'completed' && (
                          <button onClick={() => cancelOrder(order.id)} disabled={isReadOnly} style={{ padding: '4px 8px', background: '#ff6b6b', color: 'white', border: 'none', borderRadius: '4px', cursor: isReadOnly ? 'not-allowed' : 'pointer', fontSize: '11px', opacity: isReadOnly ? 0.5 : 1 }}>Cancel</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedOrder && (
        <div className="cafe-order-detail-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="cafe-order-detail" onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 12px', fontSize: '20px' }}>Order #{selectedOrder.order_number}</h2>
            <p style={{ fontSize: '13px', color: '#999', marginBottom: '12px' }}>{new Date(selectedOrder.created_at).toLocaleString('en-IN')}</p>
            <p style={{ fontSize: '14px', marginBottom: '8px' }}><strong>Customer:</strong> {selectedOrder.members?.name || selectedOrder.customer_name || 'Walk-in'}</p>
            <div style={{ borderTop: '1px solid #eee', paddingTop: '12px' }}>
              {orderItems.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f8f8f8' }}>
                  <span>{item.quantity}x {item.item_name}</span>
                  <span style={{ fontWeight: '600' }}>₹{item.total_price}</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '2px solid #eee', marginTop: '12px', paddingTop: '12px' }}>
              {selectedOrder.discount_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#e74c3c' }}><span>Discount</span><span>-₹{selectedOrder.discount_amount}</span></div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '700', color: '#667eea' }}><span>Total</span><span>₹{selectedOrder.total_amount}</span></div>
              <p style={{ fontSize: '12px', color: '#999', marginTop: '6px' }}>Payment: {selectedOrder.payment_method?.toUpperCase()}</p>
            </div>
            <button onClick={() => setSelectedOrder(null)} style={{ width: '100%', marginTop: '16px', padding: '10px', background: '#e0e0e0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
