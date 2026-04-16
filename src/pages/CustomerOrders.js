import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';

function ShipmentEditor({ order }) {
  const [shipment, setShipment] = useState(null);
  const [form, setForm] = useState({ carrier:'', tracking_number:'', tracking_url:'', estimated_delivery:'' });
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('order_shipments').select('*').eq('order_id', order.id).maybeSingle();
      if (cancelled) return;
      setShipment(data || null);
      if (data) {
        setForm({
          carrier: data.carrier || '',
          tracking_number: data.tracking_number || '',
          tracking_url: data.tracking_url || '',
          estimated_delivery: data.estimated_delivery || '',
        });
      }
    })();
    return () => { cancelled = true; };
  }, [order.id]);

  const save = async (withShip = false) => {
    setSaving(true);
    setSavedMsg('');
    try {
      const payload = {
        order_id: order.id,
        carrier: form.carrier || null,
        tracking_number: form.tracking_number || null,
        tracking_url: form.tracking_url || null,
        estimated_delivery: form.estimated_delivery || null,
        shipped_at: withShip ? new Date().toISOString() : (shipment?.shipped_at || null),
      };
      if (shipment) {
        const { data } = await supabase.from('order_shipments').update(payload).eq('id', shipment.id).select('*').single();
        setShipment(data);
      } else {
        const { data } = await supabase.from('order_shipments').insert(payload).select('*').single();
        setShipment(data);
      }
      setSavedMsg('Saved');
      setTimeout(() => setSavedMsg(''), 2000);
    } catch (err) {
      setSavedMsg(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (order.fulfillment_type !== 'delivery') {
    return (
      <div style={{ fontSize:'12px', color:'#8B6914' }}>
        Pickup order — no shipment details.
      </div>
    );
  }

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'10px' }}>
        <input placeholder="Carrier" value={form.carrier} onChange={e => setForm(f => ({...f, carrier:e.target.value}))} style={{ padding:'6px 10px', border:'1px solid #dfe4ea', borderRadius:'4px', fontSize:'12px' }} />
        <input placeholder="Tracking #" value={form.tracking_number} onChange={e => setForm(f => ({...f, tracking_number:e.target.value}))} style={{ padding:'6px 10px', border:'1px solid #dfe4ea', borderRadius:'4px', fontSize:'12px' }} />
        <input placeholder="Tracking URL" value={form.tracking_url} onChange={e => setForm(f => ({...f, tracking_url:e.target.value}))} style={{ padding:'6px 10px', border:'1px solid #dfe4ea', borderRadius:'4px', fontSize:'12px', gridColumn:'1 / -1' }} />
        <input type="date" value={form.estimated_delivery} onChange={e => setForm(f => ({...f, estimated_delivery:e.target.value}))} style={{ padding:'6px 10px', border:'1px solid #dfe4ea', borderRadius:'4px', fontSize:'12px' }} />
      </div>
      <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
        <button onClick={() => save(false)} disabled={saving} style={{ padding:'6px 12px', background:'#667eea', color:'white', border:'none', borderRadius:'4px', fontSize:'12px', fontWeight:'700', cursor:'pointer' }}>
          Save
        </button>
        {!shipment?.shipped_at && (
          <button onClick={() => save(true)} disabled={saving} style={{ padding:'6px 12px', background:'#48BB78', color:'white', border:'none', borderRadius:'4px', fontSize:'12px', fontWeight:'700', cursor:'pointer' }}>
            🚚 Save & mark shipped
          </button>
        )}
        {savedMsg && <span style={{ fontSize:'12px', color:'#48BB78', fontWeight:'600' }}>{savedMsg}</span>}
        {shipment?.shipped_at && (
          <span style={{ fontSize:'11px', color:'#8B6914' }}>
            Shipped {new Date(shipment.shipped_at).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
          </span>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// /store/orders — staff view of online customer orders.
//
// Reads from customer_orders + customer_order_items + members.
// Shows a list with status filter chips and per-row actions:
//   - Mark Ready for Pickup  (paid → ready_for_pickup)
//   - Mark Fulfilled         (ready_for_pickup → fulfilled)
//   - Cancel                 (any non-terminal → cancelled, releases stock)
//
// Every status change is logged by the customer_orders_status_change
// trigger created in Phase 1 migration.
// =====================================================================

const STATUS_META = {
  pending:          { bg: '#fff3cd', text: '#856404', label: '⏳ Awaiting payment' },
  paid:             { bg: '#cce5ff', text: '#004085', label: '💰 Paid' },
  ready_for_pickup: { bg: '#d4edda', text: '#155724', label: '✅ Ready for pickup' },
  fulfilled:        { bg: '#e2d9f3', text: '#5e35b1', label: '📦 Fulfilled' },
  cancelled:        { bg: '#f8d7da', text: '#721c24', label: '❌ Cancelled' },
  refunded:         { bg: '#e2e3e5', text: '#383d41', label: '↩️ Refunded' },
};

const PAYMENT_METHOD_LABEL = {
  cash_on_pickup: '💵 Pay on pickup',
  razorpay: '💳 Razorpay',
};

const FILTERS = [
  { key: 'open',      label: 'Open',       match: ['paid', 'ready_for_pickup'] },
  { key: 'pending',   label: 'Pending',    match: ['pending'] },
  { key: 'fulfilled', label: 'Fulfilled',  match: ['fulfilled'] },
  { key: 'cancelled', label: 'Cancelled',  match: ['cancelled', 'refunded'] },
  { key: 'all',       label: 'All',        match: null },
];

export default function CustomerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');
  const [expandedId, setExpandedId] = useState(null);
  const [actioning, setActioning] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customer_orders')
        .select(`
          id, order_number, status, total, subtotal, discount,
          fulfillment_type, payment_status, razorpay_order_id, razorpay_payment_id,
          shipping_address, notes, created_at, updated_at,
          members ( id, name, phone, email, customer_type ),
          customer_order_items ( id, item_type, item_name, quantity, unit_price, total_price, book_id, membership_plan )
        `)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('[CustomerOrders] fetch error', err);
      alert('Failed to load orders: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const updateStatus = async (order, nextStatus) => {
    if (actioning) return;
    const prompt = nextStatus === 'cancelled'
      ? `Cancel order #${order.order_number}? This releases any reserved stock.`
      : `Move order #${order.order_number} to ${STATUS_META[nextStatus]?.label || nextStatus}?`;
    if (!window.confirm(prompt)) return;

    setActioning(order.id);
    try {
      // If cancelling, release reserved book stock for each book item.
      if (nextStatus === 'cancelled') {
        const bookItems = (order.customer_order_items || []).filter(it => it.item_type === 'book' && it.book_id);
        for (const it of bookItems) {
          const { error: rpcErr } = await supabase.rpc('release_book_copy', {
            p_book_id: it.book_id,
            p_qty: it.quantity,
          });
          if (rpcErr) {
            console.warn('release_book_copy failed', rpcErr);
          }
        }
      }

      // When marking paid on a cash-on-pickup order, also flip payment_status.
      const patch = { status: nextStatus };
      if (nextStatus === 'paid' && order.payment_method === 'cash_on_pickup') {
        patch.payment_status = 'paid';
      }

      const { error } = await supabase
        .from('customer_orders')
        .update(patch)
        .eq('id', order.id);
      if (error) throw error;

      // Optimistic update — reflect the change in-place.
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, ...patch } : o));
    } catch (err) {
      alert('Failed to update order: ' + err.message);
    } finally {
      setActioning(null);
    }
  };

  const visibleOrders = orders.filter(o => {
    const f = FILTERS.find(x => x.key === filter);
    if (!f || !f.match) return true;
    return f.match.includes(o.status);
  });

  const countByFilter = (f) => {
    if (!f.match) return orders.length;
    return orders.filter(o => f.match.includes(o.status)).length;
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#2c3e50' }}>
          🛒 Online Orders
        </h1>
        <button
          onClick={fetchOrders}
          style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '8px 16px',
              background: filter === f.key ? '#667eea' : 'white',
              color: filter === f.key ? 'white' : '#2c3e50',
              border: `1.5px solid ${filter === f.key ? '#667eea' : '#dfe4ea'}`,
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '13px',
            }}
          >
            {f.label} ({countByFilter(f)})
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#8B6914' }}>Loading orders...</div>
      ) : visibleOrders.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#999', background: 'white', borderRadius: '8px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
          <p>No orders in this bucket.</p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dfe4ea' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#5a6c7d' }}>#</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#5a6c7d' }}>Customer</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#5a6c7d' }}>Items</th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '700', color: '#5a6c7d' }}>Total</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#5a6c7d' }}>Fulfillment</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#5a6c7d' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#5a6c7d' }}>Created</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#5a6c7d' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleOrders.map(o => {
                const meta = STATUS_META[o.status] || { bg: '#eee', text: '#333', label: o.status };
                const itemCount = (o.customer_order_items || []).reduce((s, it) => s + it.quantity, 0);
                const isCashOnPickup = o.payment_method === 'cash_on_pickup';
                // Cash-on-pickup orders sit at 'pending' until staff marks paid.
                const canMarkPaid     = isCashOnPickup && o.status === 'pending';
                const canMarkReady    = o.status === 'paid';
                const canMarkFulfilled = o.status === 'ready_for_pickup';
                const canCancel        = ['pending', 'paid', 'ready_for_pickup'].includes(o.status);
                const isExpanded = expandedId === o.id;

                return (
                  <React.Fragment key={o.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : o.id)}
                      style={{ borderBottom: '1px solid #f0f0f0', cursor: 'pointer', background: isExpanded ? '#f8f9ff' : 'white' }}
                    >
                      <td style={{ padding: '14px 12px', fontWeight: '700', color: '#2c3e50' }}>#{o.order_number}</td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: '600', color: '#2c3e50' }}>{o.members?.name || '(unknown)'}</div>
                        <div style={{ fontSize: '12px', color: '#8B6914' }}>{o.members?.email || o.members?.phone || ''}</div>
                      </td>
                      <td style={{ padding: '14px 12px', color: '#5a6c7d' }}>{itemCount} item{itemCount === 1 ? '' : 's'}</td>
                      <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: '700', color: '#2c3e50' }}>₹{Number(o.total).toFixed(2)}</td>
                      <td style={{ padding: '14px 12px', textAlign: 'center', fontSize: '12px' }}>
                        <div>{o.fulfillment_type === 'pickup' ? '🏪 Pickup' : '🚚 Delivery'}</div>
                        <div style={{ color: '#8B6914', fontSize: '11px' }}>
                          {PAYMENT_METHOD_LABEL[o.payment_method] || o.payment_method}
                        </div>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', background: meta.bg, color: meta.text }}>
                          {meta.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center', fontSize: '12px', color: '#8B6914' }}>
                        {new Date(o.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                          {canMarkPaid && (
                            <button
                              onClick={() => updateStatus(o, 'paid')}
                              disabled={actioning === o.id}
                              style={{ padding: '6px 10px', background: '#cce5ff', color: '#004085', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}
                              title="Cash/UPI received — mark as paid"
                            >
                              💰 Paid
                            </button>
                          )}
                          {canMarkReady && (
                            <button
                              onClick={() => updateStatus(o, 'ready_for_pickup')}
                              disabled={actioning === o.id}
                              style={{ padding: '6px 10px', background: '#d4edda', color: '#155724', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}
                              title="Mark ready for pickup"
                            >
                              ✅ Ready
                            </button>
                          )}
                          {canMarkFulfilled && (
                            <button
                              onClick={() => updateStatus(o, 'fulfilled')}
                              disabled={actioning === o.id}
                              style={{ padding: '6px 10px', background: '#e2d9f3', color: '#5e35b1', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}
                              title="Mark fulfilled"
                            >
                              📦 Done
                            </button>
                          )}
                          {canCancel && (
                            <button
                              onClick={() => updateStatus(o, 'cancelled')}
                              disabled={actioning === o.id}
                              style={{ padding: '6px 10px', background: '#f8d7da', color: '#721c24', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}
                              title="Cancel order and release stock"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ background: '#f8f9ff' }}>
                        <td colSpan={8} style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: '700', color: '#8B6914', textTransform: 'uppercase', marginBottom: '8px' }}>
                                Line items
                              </div>
                              {(o.customer_order_items || []).map(it => (
                                <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#2c3e50', padding: '4px 0' }}>
                                  <span>{it.item_name} × {it.quantity} <span style={{ color: '#8B6914', fontSize: '11px' }}>({it.item_type})</span></span>
                                  <span style={{ fontWeight: '600' }}>₹{Number(it.total_price).toFixed(2)}</span>
                                </div>
                              ))}
                              <div style={{ borderTop: '1px solid #dfe4ea', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: '700', color: '#2c3e50' }}>
                                <span>Total</span>
                                <span>₹{Number(o.total).toFixed(2)}</span>
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: '700', color: '#8B6914', textTransform: 'uppercase', marginBottom: '8px' }}>
                                Payment
                              </div>
                              <div style={{ fontSize: '13px', color: '#5a6c7d' }}>
                                <div>Status: <strong>{o.payment_status}</strong></div>
                                {o.razorpay_order_id && <div style={{ fontFamily: 'monospace', fontSize: '11px' }}>rzp_order: {o.razorpay_order_id}</div>}
                                {o.razorpay_payment_id && <div style={{ fontFamily: 'monospace', fontSize: '11px' }}>rzp_payment: {o.razorpay_payment_id}</div>}
                              </div>
                              {o.notes && (
                                <>
                                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#8B6914', textTransform: 'uppercase', marginTop: '12px', marginBottom: '4px' }}>
                                    Notes
                                  </div>
                                  <div style={{ fontSize: '13px', color: '#5a6c7d' }}>{o.notes}</div>
                                </>
                              )}
                              <div style={{ fontSize: '11px', fontWeight: '700', color: '#8B6914', textTransform: 'uppercase', marginTop: '16px', marginBottom: '6px' }}>
                                Shipment
                              </div>
                              <ShipmentEditor order={o} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
