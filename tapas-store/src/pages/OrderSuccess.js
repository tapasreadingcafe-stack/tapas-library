import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

// =====================================================================
// /order/:id — confirmation page after a successful Razorpay payment.
//
// Polls the customer_orders row for up to 10 seconds waiting for the
// status to transition from 'pending' → 'paid'. If the webhook beats
// the verify call, the status will already be 'paid'.
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
      // If still pending, poll a few more times — the verify or webhook
      // is racing us.
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
      <div style={{ maxWidth:'600px', margin:'80px auto', padding:'40px 20px', textAlign:'center', fontFamily:'Lato, sans-serif' }}>
        <div style={{ fontSize:'48px', marginBottom:'16px' }}>⏳</div>
        <p style={{ color:'#8B6914' }}>Confirming your order...</p>
      </div>
    );
  }
  if (!order) {
    return (
      <div style={{ maxWidth:'600px', margin:'80px auto', padding:'40px 20px', textAlign:'center', fontFamily:'Lato, sans-serif' }}>
        <div style={{ fontSize:'48px', marginBottom:'16px' }}>⚠️</div>
        <h1 style={{ fontFamily:'"Playfair Display", serif', fontSize:'24px', color:'#2C1810' }}>Order not found</h1>
        <p style={{ color:'#8B6914', marginTop:'8px' }}>We couldn't find that order. Check your profile for your order history.</p>
        <Link to="/profile?tab=orders" style={{ display:'inline-block', marginTop:'16px', color:'#D4A853', fontWeight:'700', textDecoration:'none' }}>
          View my orders →
        </Link>
      </div>
    );
  }

  const isPaid = order.status !== 'pending' && order.status !== 'cancelled';

  return (
    <div style={{ maxWidth:'700px', margin:'0 auto', padding:'60px 20px', fontFamily:'Lato, sans-serif' }}>
      <div style={{
        background:'white', borderRadius:'20px', padding:'40px',
        boxShadow:'0 20px 60px rgba(44,24,16,0.12)', textAlign:'center'
      }}>
        <div style={{ fontSize:'72px', marginBottom:'16px' }}>
          {isPaid ? '🎉' : '⏳'}
        </div>
        <h1 style={{ fontFamily:'"Playfair Display", serif', fontSize:'32px', fontWeight:'700', color:'#2C1810', marginBottom:'8px' }}>
          {isPaid ? 'Order Confirmed!' : 'Processing Payment...'}
        </h1>
        <p style={{ color:'#8B6914', fontSize:'16px', marginBottom:'24px' }}>
          {isPaid
            ? 'Thank you for your purchase. We\'ll notify you when it\'s ready for pickup.'
            : 'We\'re verifying your payment with Razorpay. This usually takes a few seconds.'}
        </p>

        <div style={{
          background:'#FFF8ED', borderRadius:'12px', padding:'20px',
          marginBottom:'24px', textAlign:'left'
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'12px' }}>
            <span style={{ color:'#8B6914', fontSize:'13px' }}>Order number</span>
            <span style={{ fontWeight:'700', color:'#2C1810' }}>#{order.order_number}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'12px' }}>
            <span style={{ color:'#8B6914', fontSize:'13px' }}>Status</span>
            <span style={{ fontWeight:'700', color:isPaid ? '#276749' : '#C05621' }}>
              {order.status.replace(/_/g, ' ')}
            </span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'12px' }}>
            <span style={{ color:'#8B6914', fontSize:'13px' }}>Fulfillment</span>
            <span style={{ fontWeight:'700', color:'#2C1810' }}>
              {order.fulfillment_type === 'pickup' ? '🏪 In-store pickup' : '🚚 Home delivery'}
            </span>
          </div>

          <div style={{ borderTop:'1px solid #F5DEB3', paddingTop:'12px', marginTop:'12px' }}>
            {items.map(it => (
              <div key={it.id} style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', color:'#5C3A1E', padding:'4px 0' }}>
                <span>{it.item_name} × {it.quantity}</span>
                <span>₹{Number(it.total_price).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop:'1px solid #F5DEB3', paddingTop:'12px', marginTop:'12px', display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontWeight:'700', color:'#2C1810', fontSize:'16px' }}>Total</span>
            <span style={{ fontFamily:'"Playfair Display", serif', fontSize:'24px', fontWeight:'800', color:'#2C1810' }}>
              ₹{Number(order.total).toFixed(2)}
            </span>
          </div>
        </div>

        <div style={{ display:'flex', gap:'12px', justifyContent:'center', flexWrap:'wrap' }}>
          <Link to="/profile?tab=orders" style={{
            padding:'12px 24px', borderRadius:'12px',
            background:'linear-gradient(135deg, #2C1810, #4A2C17)', color:'#F5DEB3',
            textDecoration:'none', fontWeight:'700', fontSize:'14px'
          }}>
            📋 View My Orders
          </Link>
          <Link to="/books" style={{
            padding:'12px 24px', borderRadius:'12px',
            border:'2px solid #D4A853', background:'white',
            color:'#2C1810', textDecoration:'none', fontWeight:'700', fontSize:'14px'
          }}>
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
