import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

// =====================================================================
// /checkout — order summary + Razorpay payment flow.
//
// Flow:
//   1. Assemble cart items as the payload for create-razorpay-order.
//   2. Invoke edge function → returns razorpay_order_id + key_id.
//   3. Open Razorpay modal via window.Razorpay (loaded in index.html).
//   4. On payment success, invoke verify-razorpay-payment.
//   5. Clear cart and navigate to /order/:id.
//
// Fulfillment is locked to 'pickup' for MVP. The selector is rendered
// with 'delivery' disabled so customers can see it's coming.
// =====================================================================

export default function Checkout() {
  const navigate = useNavigate();
  const { items, subtotal, clear } = useCart();
  const { member, loading: authLoading } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [fulfillment] = useState('pickup'); // locked for MVP

  useEffect(() => {
    if (!authLoading && !member) {
      navigate('/login?next=/checkout');
    }
  }, [authLoading, member, navigate]);

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
    }
  }, [items.length, navigate]);

  if (authLoading || !member) return null;
  if (items.length === 0) return null;

  const handlePay = async () => {
    setError('');
    setProcessing(true);
    try {
      if (!window.Razorpay) {
        throw new Error('Payment system not loaded. Please refresh and try again.');
      }

      // Build items payload.
      const payloadItems = items.map(i => {
        if (i.type === 'book') {
          return { type: 'book', book_id: i.book_id, quantity: i.quantity };
        }
        return {
          type: 'membership',
          membership_plan: i.membership_plan,
          membership_days: i.membership_days,
          quantity: 1,
        };
      });

      // Call create-razorpay-order edge function.
      const { data: createData, error: createErr } = await supabase.functions.invoke(
        'create-razorpay-order',
        { body: { items: payloadItems } }
      );

      if (createErr || !createData?.razorpay_order_id) {
        throw new Error(createErr?.message || createData?.error || 'Failed to create order');
      }

      // Open Razorpay checkout modal.
      const rzp = new window.Razorpay({
        key: createData.key_id,
        amount: createData.amount,
        currency: createData.currency || 'INR',
        order_id: createData.razorpay_order_id,
        name: 'Tapas Reading Cafe',
        description: `Order #${createData.order_number}`,
        prefill: {
          name: createData.member?.name || member.name || '',
          email: createData.member?.email || member.email || '',
          contact: createData.member?.phone || member.phone || '',
        },
        theme: { color: '#2C1810' },
        handler: async (response) => {
          try {
            const { data: verifyData, error: verifyErr } = await supabase.functions.invoke(
              'verify-razorpay-payment',
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
              }
            );
            if (verifyErr || !verifyData?.ok) {
              // Payment captured but verify failed — user keeps the order_id,
              // webhook will reconcile. Still redirect to success.
              console.error('[Checkout] verify failed, webhook will reconcile', verifyErr);
            }
            clear();
            navigate(`/order/${createData.customer_order_id}`);
          } catch (err) {
            console.error('[Checkout] verify handler error', err);
            clear();
            navigate(`/order/${createData.customer_order_id}`);
          }
        },
        modal: {
          ondismiss: () => setProcessing(false),
        },
      });
      rzp.open();
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <div style={{ maxWidth:'900px', margin:'0 auto', padding:'40px 20px', fontFamily:'Lato, sans-serif' }}>
      <h1 style={{ fontFamily:'"Playfair Display", serif', fontSize:'36px', fontWeight:'700', color:'#2C1810', marginBottom:'32px' }}>
        💳 Checkout
      </h1>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:'32px' }}>

        {/* Left: fulfillment + customer info */}
        <div>
          <section style={{ background:'white', borderRadius:'16px', padding:'24px', boxShadow:'0 4px 20px rgba(0,0,0,0.08)', marginBottom:'20px' }}>
            <h2 style={{ fontFamily:'"Playfair Display", serif', fontSize:'20px', color:'#2C1810', marginBottom:'16px' }}>
              📦 Fulfillment
            </h2>
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              <label style={{
                display:'flex', alignItems:'center', gap:'12px', padding:'16px',
                borderRadius:'12px', border:'2px solid #D4A853',
                background:'rgba(212,168,83,0.1)', cursor:'pointer'
              }}>
                <input type="radio" checked={fulfillment === 'pickup'} readOnly style={{ accentColor:'#D4A853' }} />
                <div>
                  <div style={{ fontWeight:'700', color:'#2C1810' }}>🏪 In-store Pickup</div>
                  <div style={{ color:'#8B6914', fontSize:'13px' }}>
                    Collect your order at Tapas Reading Cafe. We'll notify you when it's ready.
                  </div>
                </div>
              </label>

              <label style={{
                display:'flex', alignItems:'center', gap:'12px', padding:'16px',
                borderRadius:'12px', border:'2px solid #F5DEB3',
                background:'#FFF8ED', cursor:'not-allowed', opacity:0.6
              }}>
                <input type="radio" disabled style={{ accentColor:'#D4A853' }} />
                <div>
                  <div style={{ fontWeight:'700', color:'#8B6914' }}>🚚 Home Delivery <span style={{ fontSize:'11px', background:'#D4A853', color:'#2C1810', padding:'2px 8px', borderRadius:'10px', marginLeft:'6px' }}>Coming Soon</span></div>
                  <div style={{ color:'#8B6914', fontSize:'13px' }}>
                    Delivery to your address will be available shortly.
                  </div>
                </div>
              </label>
            </div>
          </section>

          <section style={{ background:'white', borderRadius:'16px', padding:'24px', boxShadow:'0 4px 20px rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontFamily:'"Playfair Display", serif', fontSize:'20px', color:'#2C1810', marginBottom:'16px' }}>
              👤 Customer Details
            </h2>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', fontSize:'14px', color:'#5C3A1E' }}>
              <div>
                <div style={{ fontSize:'11px', fontWeight:'700', color:'#8B6914', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'4px' }}>Name</div>
                <div>{member.name || '(not set)'}</div>
              </div>
              <div>
                <div style={{ fontSize:'11px', fontWeight:'700', color:'#8B6914', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'4px' }}>Email</div>
                <div>{member.email}</div>
              </div>
              <div>
                <div style={{ fontSize:'11px', fontWeight:'700', color:'#8B6914', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'4px' }}>Phone</div>
                <div>{member.phone || '(not set)'}</div>
              </div>
            </div>
            <Link to="/profile" style={{ display:'inline-block', marginTop:'12px', color:'#D4A853', fontSize:'13px', fontWeight:'700', textDecoration:'none' }}>
              Edit in profile →
            </Link>
          </section>
        </div>

        {/* Right: order summary */}
        <div>
          <div style={{ background:'white', borderRadius:'16px', padding:'24px', boxShadow:'0 4px 20px rgba(0,0,0,0.08)', position:'sticky', top:'80px' }}>
            <h2 style={{ fontFamily:'"Playfair Display", serif', fontSize:'20px', color:'#2C1810', marginBottom:'16px' }}>
              🧾 Order Summary
            </h2>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'16px' }}>
              {items.map(item => (
                <div key={item.key} style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', color:'#5C3A1E' }}>
                  <span>{item.title} × {item.quantity}</span>
                  <span>₹{(item.unit_price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop:'1px solid #F5DEB3', paddingTop:'12px', marginTop:'12px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'14px', color:'#8B6914', marginBottom:'6px' }}>
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'18px', fontWeight:'800', color:'#2C1810', marginTop:'12px' }}>
                <span>Total</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
            </div>

            {error && (
              <div style={{ marginTop:'16px', padding:'12px', borderRadius:'8px', background:'rgba(252,129,129,0.1)', border:'1px solid #FC8181', color:'#9B2335', fontSize:'13px' }}>
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={handlePay}
              disabled={processing}
              style={{
                width:'100%', marginTop:'20px', padding:'14px',
                background:'linear-gradient(135deg, #D4A853, #C49040)', color:'#2C1810',
                border:'none', borderRadius:'12px', fontWeight:'700', fontSize:'16px',
                cursor: processing ? 'not-allowed' : 'pointer', opacity: processing ? 0.7 : 1,
                fontFamily:'Lato, sans-serif',
                boxShadow:'0 4px 15px rgba(212,168,83,0.4)'
              }}>
              {processing ? '⏳ Processing...' : '💳 Pay with Razorpay'}
            </button>
            <p style={{ marginTop:'12px', textAlign:'center', color:'#8B6914', fontSize:'12px' }}>
              🔒 Secure payment via Razorpay
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
