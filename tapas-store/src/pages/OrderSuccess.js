import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

// =====================================================================
// /order/:id — 2025-2026 redesign
// Celebration card with rounded corners, dark-mode aware, modern status
// block, CTAs using tps-btn system.
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
      <div className="tps-container-narrow" style={{ padding:'80px 20px', textAlign:'center' }}>
        <div style={{ fontSize:'56px', marginBottom:'16px', animation:'tps-bookSpin 1s ease-in-out infinite' }}>⏳</div>
        <p className="tps-subtle">Confirming your order…</p>
      </div>
    );
  }
  if (!order) {
    return (
      <div className="tps-container-narrow" style={{ padding:'80px 20px', textAlign:'center' }}>
        <div style={{ fontSize:'56px', marginBottom:'16px' }}>⚠️</div>
        <h1 className="tps-h3">Order not found</h1>
        <p className="tps-subtle" style={{ marginTop:'10px', marginBottom:'20px' }}>
          We couldn't find that order. Check your profile for order history.
        </p>
        <Link to="/profile?tab=orders" className="tps-btn tps-btn-primary">
          View my orders →
        </Link>
      </div>
    );
  }

  const isPaid = order.status !== 'pending' && order.status !== 'cancelled';

  return (
    <div className="tps-container-narrow" style={{ padding:'72px 20px', maxWidth:'720px' }}>
      <div className="tps-card tps-animate-pop" style={{
        padding:'48px 40px',
        textAlign:'center',
        boxShadow:'var(--shadow-xl)',
        borderRadius:'var(--radius-2xl)',
      }}>
        <div style={{ fontSize:'80px', marginBottom:'16px' }}>
          {isPaid ? '🎉' : '⏳'}
        </div>
        <h1 className="tps-h2" style={{ marginBottom:'10px' }}>
          {isPaid ? 'Order Confirmed!' : 'Processing Payment…'}
        </h1>
        <p className="tps-subtle" style={{ fontSize:'16px', marginBottom:'28px', maxWidth:'480px', margin:'0 auto 28px' }}>
          {isPaid
            ? "Thank you for your purchase. We'll notify you when it's ready for pickup."
            : "We're verifying your payment. This usually takes a few seconds."}
        </p>

        <div style={{
          background:'var(--bg-subtle)',
          borderRadius:'var(--radius-lg)',
          padding:'24px 28px',
          marginBottom:'28px',
          textAlign:'left',
          border:'1px solid var(--border)',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'12px' }}>
            <span className="tps-subtle" style={{ fontSize:'13px' }}>Order number</span>
            <span style={{ fontWeight:'800', color:'var(--text)', fontFamily:'var(--font-heading)' }}>#{order.order_number}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'12px' }}>
            <span className="tps-subtle" style={{ fontSize:'13px' }}>Status</span>
            <span className={isPaid ? 'tps-badge tps-badge-success' : 'tps-badge tps-badge-accent'}>
              {order.status.replace(/_/g, ' ')}
            </span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'12px' }}>
            <span className="tps-subtle" style={{ fontSize:'13px' }}>Fulfillment</span>
            <span style={{ fontWeight:'700', color:'var(--text)', fontSize:'13px' }}>
              {order.fulfillment_type === 'pickup' ? '🏪 In-store pickup' : '🚚 Home delivery'}
            </span>
          </div>

          <div style={{ borderTop:'1px solid var(--border)', paddingTop:'14px', marginTop:'14px' }}>
            {items.map(it => (
              <div key={it.id} style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', color:'var(--text-muted)', padding:'5px 0' }}>
                <span>{it.item_name} × {it.quantity}</span>
                <span style={{ fontWeight:'600' }}>₹{Number(it.total_price).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop:'1px solid var(--border)', paddingTop:'14px', marginTop:'14px', display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
            <span style={{ fontWeight:'700', color:'var(--text)', fontSize:'15px' }}>Total</span>
            <span style={{ fontFamily:'var(--font-heading)', fontSize:'28px', fontWeight:'800', color:'var(--text)' }}>
              ₹{Number(order.total).toFixed(2)}
            </span>
          </div>
        </div>

        <div style={{ display:'flex', gap:'12px', justifyContent:'center', flexWrap:'wrap' }}>
          <Link to="/profile?tab=orders" className="tps-btn tps-btn-primary">
            📋 View My Orders
          </Link>
          <Link to="/books" className="tps-btn tps-btn-secondary">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
