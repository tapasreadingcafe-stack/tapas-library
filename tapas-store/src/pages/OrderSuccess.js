import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

// =====================================================================
// /order/:id — Modern Heritage redesign
// Celebration card, tonal layering, Newsreader headings, teal chips.
// =====================================================================

export default function OrderSuccess() {
  const { id } = useParams();
  const { member, loading: authLoading } = useAuth();
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !member) return;
    let cancelled = false;
    let attempts = 0;

    const fetchOnce = async () => {
      const { data: o } = await supabase
        .from('customer_orders')
        .select('id, order_number, status, total, fulfillment_type, created_at')
        .eq('id', id)
        .single();
      const { data: its } = await supabase
        .from('customer_order_items')
        .select('id, item_name, quantity, unit_price, total_price')
        .eq('order_id', id);
      if (cancelled) return;
      setOrder(o);
      setItems(its || []);
      setLoading(false);
    };

    const poll = async () => {
      await fetchOnce();
      attempts++;
      if (!cancelled && attempts < 5) {
        setTimeout(async () => {
          const { data: latest } = await supabase
            .from('customer_orders')
            .select('status')
            .eq('id', id)
            .single();
          if (!cancelled && latest?.status && latest.status !== 'pending') {
            setOrder(o => o ? { ...o, status: latest.status } : o);
          } else if (!cancelled) {
            poll();
          }
        }, 2000);
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [id, authLoading, member]);

  if (authLoading) return null;

  if (loading) {
    return (
      <div style={{
        maxWidth: '720px', margin: '0 auto',
        padding: '80px 20px', textAlign: 'center',
        fontFamily: 'var(--font-body)',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.6 }}>...</div>
        <p style={{ fontSize: '15px', color: 'var(--text-muted, #5c4a3a)' }}>Confirming your order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{
        maxWidth: '720px', margin: '0 auto',
        padding: '80px 20px', textAlign: 'center',
        fontFamily: 'var(--font-body)',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>?</div>
        <h1 style={{
          fontFamily: 'var(--font-display, Newsreader, serif)',
          fontSize: '28px', fontWeight: 500, color: 'var(--text, #26170c)',
          marginBottom: '10px',
        }}>Order not found</h1>
        <p style={{
          fontSize: '15px', color: 'var(--text-muted, #5c4a3a)',
          marginBottom: '24px',
        }}>
          We couldn't find that order. Check your profile for order history.
        </p>
        <Link to="/profile?tab=orders" className="tps-btn tps-btn-teal">
          View my orders
        </Link>
      </div>
    );
  }

  const isPaid = order.status !== 'pending' && order.status !== 'cancelled';

  return (
    <div style={{
      maxWidth: '720px', margin: '0 auto',
      padding: '72px 20px',
      fontFamily: 'var(--font-body)',
    }}>
      {/* Celebration card */}
      <div className="tps-card" style={{
        background: 'var(--bg-card, #ede8d0)',
        borderRadius: 'var(--radius-2xl, 20px)',
        boxShadow: 'var(--shadow-ambient, 0 1px 4px rgba(0,0,0,.06))',
        padding: '48px 40px',
        textAlign: 'center',
        border: 'none',
      }}>
        {/* Icon */}
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%',
          background: isPaid ? 'rgba(0,106,106,0.1)' : 'var(--bg-section, #f5f5dc)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', fontSize: '32px',
        }}>
          {isPaid ? '✓' : '...'}
        </div>

        {/* Title */}
        <h1 style={{
          fontFamily: 'var(--font-display, Newsreader, serif)',
          fontSize: '32px', fontWeight: 500, color: 'var(--text, #26170c)',
          margin: '0 0 10px',
        }}>
          {isPaid ? 'Order Confirmed!' : 'Processing Payment...'}
        </h1>

        <p style={{
          fontSize: '16px', color: 'var(--text-muted, #5c4a3a)',
          maxWidth: '480px', margin: '0 auto 32px', lineHeight: 1.6,
        }}>
          {isPaid
            ? "Thank you for your purchase. We'll notify you when it's ready for pickup."
            : "We're verifying your payment. This usually takes a few seconds."}
        </p>

        {/* Order details */}
        <div style={{
          background: 'var(--bg-section, #f5f5dc)',
          borderRadius: 'var(--radius-lg, 14px)',
          padding: '24px 28px', marginBottom: '32px', textAlign: 'left',
        }}>
          {/* Metadata rows */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '14px',
          }}>
            <span style={{ fontSize: '13px', color: 'var(--text-subtle, #8b7355)' }}>Order number</span>
            <span style={{
              fontFamily: 'var(--font-display, Newsreader, serif)',
              fontWeight: 600, color: 'var(--text, #26170c)', fontSize: '15px',
            }}>#{order.order_number}</span>
          </div>

          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '14px',
          }}>
            <span style={{ fontSize: '13px', color: 'var(--text-subtle, #8b7355)' }}>Status</span>
            <span className="tps-chip tps-chip-teal" style={{
              fontSize: '12px', padding: '3px 12px',
              background: isPaid ? 'rgba(0,106,106,0.12)' : 'var(--bg-inset, #e6e1c8)',
              color: isPaid ? 'var(--secondary, #006a6a)' : 'var(--text-subtle, #8b7355)',
              fontWeight: 700, borderRadius: 'var(--radius-pill, 999px)',
            }}>
              {order.status.replace(/_/g, ' ')}
            </span>
          </div>

          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '18px',
          }}>
            <span style={{ fontSize: '13px', color: 'var(--text-subtle, #8b7355)' }}>Fulfillment</span>
            <span style={{ fontWeight: 600, color: 'var(--text, #26170c)', fontSize: '13px' }}>
              {order.fulfillment_type === 'pickup' ? 'In-store pickup' : 'Home delivery'}
            </span>
          </div>

          {/* Line items */}
          <div style={{
            background: 'var(--bg-card, #ede8d0)',
            borderRadius: 'var(--radius-md, 10px)',
            padding: '14px 16px',
          }}>
            {items.map(it => (
              <div key={it.id} style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: '13px', color: 'var(--text-muted, #5c4a3a)',
                padding: '5px 0',
              }}>
                <span>{it.item_name} x {it.quantity}</span>
                <span style={{ fontWeight: 600, color: 'var(--text, #26170c)' }}>
                  ₹{Number(it.total_price).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div style={{
            marginTop: '18px', paddingTop: '16px',
            background: 'var(--bg-inset, #e6e1c8)',
            borderRadius: 'var(--radius-md, 10px)',
            padding: '14px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          }}>
            <span style={{
              fontFamily: 'var(--font-display, Newsreader, serif)',
              fontWeight: 500, color: 'var(--text, #26170c)', fontSize: '16px',
            }}>Total</span>
            <span style={{
              fontFamily: 'var(--font-display, Newsreader, serif)',
              fontSize: '28px', fontWeight: 500, color: 'var(--accent, #c49040)',
            }}>
              ₹{Number(order.total).toFixed(2)}
            </span>
          </div>
        </div>

        {/* CTAs */}
        <div style={{
          display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap',
        }}>
          <Link to={`/order/${order.id}/track`} className="tps-btn tps-btn-teal" style={{
            fontSize: '14px', padding: '10px 24px',
          }}>
            Track this order
          </Link>
          <Link to="/profile?tab=orders" className="tps-btn" style={{
            background: 'transparent',
            color: 'var(--secondary, #006a6a)',
            border: '1.5px solid var(--secondary, #006a6a)',
            fontWeight: 600, fontSize: '14px', padding: '10px 24px',
          }}>
            All My Orders
          </Link>
          <Link to="/books" className="tps-btn tps-btn-ghost" style={{
            fontSize: '14px', padding: '10px 24px',
          }}>
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
