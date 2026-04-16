import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

// =====================================================================
// OrderTracking — /order/:id/track
// Timeline view of an order's lifecycle: pending → paid → ready →
// shipped → delivered (or pickup variant). Pulls from
// customer_order_status_history plus order_shipments when present.
// =====================================================================

const PICKUP_STEPS = [
  { key: 'pending',           label: 'Placed',        icon: '•' },
  { key: 'paid',              label: 'Paid',          icon: '✓' },
  { key: 'ready_for_pickup',  label: 'Ready',         icon: '📦' },
  { key: 'fulfilled',         label: 'Picked up',     icon: '🎉' },
];

const DELIVERY_STEPS = [
  { key: 'pending',           label: 'Placed',        icon: '•' },
  { key: 'paid',              label: 'Paid',          icon: '✓' },
  { key: 'ready_for_pickup',  label: 'Packed',        icon: '📦' },
  { key: 'shipped',           label: 'Shipped',       icon: '🚚' },
  { key: 'fulfilled',         label: 'Delivered',     icon: '🏠' },
];

function stepReachedIndex(current, steps) {
  // "shipped" isn't a real status — map it via shipments presence.
  const idx = steps.findIndex(s => s.key === current);
  if (idx >= 0) return idx;
  if (current === 'cancelled' || current === 'refunded') return -1;
  return 0;
}

export default function OrderTracking() {
  const { id } = useParams();
  const { member, loading: authLoading } = useAuth();
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !member) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [oRes, itRes, hRes, shRes] = await Promise.all([
          supabase.from('customer_orders').select('*').eq('id', id).single(),
          supabase.from('customer_order_items').select('*').eq('order_id', id),
          supabase.from('customer_order_status_history')
            .select('*').eq('order_id', id).order('created_at', { ascending: true }),
          supabase.from('order_shipments').select('*').eq('order_id', id).maybeSingle(),
        ]);
        if (cancelled) return;
        setOrder(oRes.data);
        setItems(itRes.data || []);
        setHistory(hRes.data || []);
        setShipment(shRes.data || null);
      } catch (err) {
        console.error('[OrderTracking]', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, authLoading, member]);

  if (authLoading) return null;
  if (!member) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center' }}>
        <Link to={`/login?next=/order/${id}/track`} className="tps-btn tps-btn-teal">
          Sign in to view this order
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading tracking info…</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>We couldn't find that order.</p>
        <Link to="/profile?tab=orders" className="tps-btn tps-btn-teal" style={{ marginTop: '16px' }}>
          View my orders
        </Link>
      </div>
    );
  }

  const isDelivery = order.fulfillment_type === 'delivery';
  const steps = isDelivery ? DELIVERY_STEPS : PICKUP_STEPS;

  // Effective current status — if shipped_at is set, treat as 'shipped'.
  let effectiveStatus = order.status;
  if (isDelivery && shipment?.shipped_at && order.status !== 'fulfilled') {
    effectiveStatus = 'shipped';
  }
  const reachedIdx = stepReachedIndex(effectiveStatus, steps);
  const isCancelled = order.status === 'cancelled' || order.status === 'refunded';

  // Map history rows by to_status → timestamp.
  const historyMap = {};
  for (const h of history) {
    if (!historyMap[h.to_status]) historyMap[h.to_status] = h.created_at;
  }
  historyMap['pending'] = historyMap['pending'] || order.created_at;

  return (
    <div style={{
      maxWidth: '780px', margin: '0 auto', padding: '56px 20px 80px',
      fontFamily: 'var(--font-body)',
    }}>
      <div style={{ marginBottom: '28px' }}>
        <p style={{
          fontSize: '13px', fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '1.5px', color: 'var(--text-subtle)', marginBottom: '8px',
        }}>
          Order tracking
        </p>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: '34px', fontWeight: 500,
          color: 'var(--text)', margin: 0,
        }}>
          Order #{order.order_number}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>
          Placed {new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      </div>

      {isCancelled ? (
        <div className="tps-card" style={{
          padding: '28px', borderRadius: 'var(--radius-lg)',
          background: 'rgba(180,60,60,0.08)', color: '#a63d3d',
          fontWeight: 600, textAlign: 'center',
        }}>
          This order was {order.status}.
        </div>
      ) : (
        <div className="tps-card" style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          padding: '32px',
          boxShadow: 'var(--shadow-ambient)',
          marginBottom: '28px',
        }}>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {steps.map((step, idx) => {
              const reached = idx <= reachedIdx;
              const current = idx === reachedIdx;
              const ts = historyMap[step.key];
              return (
                <li key={step.key} style={{
                  display: 'flex', gap: '16px',
                  paddingBottom: idx === steps.length - 1 ? 0 : '22px',
                  position: 'relative',
                }}>
                  {/* Connector line */}
                  {idx < steps.length - 1 && (
                    <span style={{
                      position: 'absolute',
                      left: '15px', top: '32px', bottom: '-4px',
                      width: '2px',
                      background: reached ? 'var(--secondary)' : 'var(--bg-inset)',
                    }} />
                  )}
                  {/* Dot */}
                  <span style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: reached ? 'var(--secondary)' : 'var(--bg-inset)',
                    color: reached ? 'white' : 'var(--text-subtle)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: 700, flexShrink: 0,
                    boxShadow: current ? '0 0 0 4px rgba(0,106,106,0.15)' : 'none',
                  }}>{step.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontSize: '16px',
                      fontWeight: 600,
                      color: reached ? 'var(--text)' : 'var(--text-subtle)',
                    }}>{step.label}</div>
                    {ts && reached && (
                      <div style={{
                        fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px',
                      }}>
                        {new Date(ts).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Shipment details */}
      {isDelivery && shipment && (shipment.tracking_number || shipment.carrier) && (
        <div className="tps-card" style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px', marginBottom: '28px',
        }}>
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700,
            letterSpacing: '2px', textTransform: 'uppercase',
            color: 'var(--text-subtle)', marginBottom: '12px',
          }}>
            Shipment details
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {shipment.carrier && (
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-subtle)', marginBottom: '2px' }}>Carrier</div>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>{shipment.carrier}</div>
              </div>
            )}
            {shipment.tracking_number && (
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-subtle)', marginBottom: '2px' }}>Tracking #</div>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                  {shipment.tracking_url
                    ? <a href={shipment.tracking_url} target="_blank" rel="noreferrer" style={{ color: 'var(--secondary)' }}>{shipment.tracking_number}</a>
                    : shipment.tracking_number}
                </div>
              </div>
            )}
            {shipment.estimated_delivery && (
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-subtle)', marginBottom: '2px' }}>Estimated delivery</div>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                  {new Date(shipment.estimated_delivery).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="tps-card" style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px', marginBottom: '20px',
      }}>
        <div style={{
          fontSize: '11px', fontWeight: 700, letterSpacing: '2px',
          textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: '12px',
        }}>
          Items in this order
        </div>
        {items.map(it => (
          <div key={it.id} style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '8px 0', fontSize: '14px', color: 'var(--text-muted)',
          }}>
            <span>{it.item_name} × {it.quantity}</span>
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>₹{Number(it.total_price).toFixed(2)}</span>
          </div>
        ))}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          paddingTop: '12px', marginTop: '8px',
          borderTop: '1px solid var(--bg-inset)',
          fontFamily: 'var(--font-display)',
          fontSize: '16px', fontWeight: 600, color: 'var(--text)',
        }}>
          <span>Total</span>
          <span style={{ color: 'var(--accent)' }}>₹{Number(order.total).toFixed(2)}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to="/profile?tab=orders" className="tps-btn tps-btn-teal">All my orders</Link>
        <Link to="/books" className="tps-btn tps-btn-ghost">Continue shopping</Link>
      </div>
    </div>
  );
}
