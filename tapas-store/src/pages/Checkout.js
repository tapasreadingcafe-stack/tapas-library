import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

// =====================================================================
// /checkout — 2025-2026 redesign
// Modern two-column layout with sticky order summary, rounded cards.
// =====================================================================

export default function Checkout() {
  const navigate = useNavigate();
  const { items, subtotal, clear } = useCart();
  const { member, loading: authLoading } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [fulfillment] = useState('pickup');

  useEffect(() => {
    if (!authLoading && !member) navigate('/login?next=/checkout');
  }, [authLoading, member, navigate]);

  useEffect(() => {
    if (items.length === 0) navigate('/cart');
  }, [items.length, navigate]);

  if (authLoading || !member) return null;
  if (items.length === 0) return null;

  const buildPayloadItems = () => items.map(i => {
    if (i.type === 'book') return { type: 'book', book_id: i.book_id, quantity: i.quantity };
    return { type: 'membership', membership_plan: i.membership_plan, membership_days: i.membership_days, quantity: 1 };
  });

  const handlePlacePickupOrder = async () => {
    setError('');
    setProcessing(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('place-pickup-order', { body: { items: buildPayloadItems() } });
      if (fnErr || !data?.ok) {
        if (data?.error === 'insufficient_stock') {
          throw new Error('Sorry, one of the books in your cart just went out of stock. Please remove it and try again.');
        }
        throw new Error(fnErr?.message || data?.error || 'Failed to place order');
      }
      clear();
      navigate(`/order/${data.customer_order_id}`);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setProcessing(false);
    }
  };

  const razorpayEnabled = !!process.env.REACT_APP_RAZORPAY_KEY_ID;

  const handleRazorpayPay = async () => {
    setError('');
    setProcessing(true);
    try {
      if (!window.Razorpay) throw new Error('Payment system not loaded. Please refresh and try again.');
      const { data: createData, error: createErr } = await supabase.functions.invoke('create-razorpay-order', { body: { items: buildPayloadItems() } });
      if (createErr || !createData?.razorpay_order_id) {
        throw new Error(createErr?.message || createData?.error || 'Failed to create order');
      }
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
            await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            });
          } catch (err) {
            console.error('[Checkout] verify handler error', err);
          }
          clear();
          navigate(`/order/${createData.customer_order_id}`);
        },
        modal: { ondismiss: () => setProcessing(false) },
      });
      rzp.open();
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <div className="tps-container-narrow" style={{ padding:'56px 20px 80px', fontFamily:'var(--font-body)', maxWidth:'1080px' }}>
      <div style={{ marginBottom:'36px' }}>
        <div className="tps-eyebrow" style={{ marginBottom:'10px' }}>Almost there</div>
        <h1 className="tps-h1" style={{ marginBottom:'8px' }}>💳 Checkout</h1>
        <p className="tps-subtle">Review your order and confirm your pickup.</p>
      </div>

      <div className="checkout-grid" style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:'28px' }}>

        {/* Left: fulfillment + customer info */}
        <div>
          <section className="tps-card" style={{ padding:'28px', marginBottom:'20px' }}>
            <h2 className="tps-h4" style={{ marginBottom:'18px' }}>📦 Fulfillment</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              <label style={{
                display:'flex', alignItems:'center', gap:'14px', padding:'18px',
                borderRadius:'var(--radius-md)',
                border:'2px solid var(--brand-accent)',
                background:'rgba(212,168,83,0.08)',
                cursor:'pointer',
              }}>
                <input type="radio" checked={fulfillment === 'pickup'} readOnly style={{ accentColor:'var(--brand-accent)', width:'18px', height:'18px' }} />
                <div>
                  <div style={{ fontWeight:'700', color:'var(--text)', marginBottom:'2px' }}>🏪 In-store Pickup</div>
                  <div className="tps-subtle" style={{ fontSize:'13px' }}>
                    Collect your order at Tapas Reading Cafe. We'll notify you when it's ready.
                  </div>
                </div>
              </label>

              <label style={{
                display:'flex', alignItems:'center', gap:'14px', padding:'18px',
                borderRadius:'var(--radius-md)',
                border:'2px solid var(--border)',
                background:'var(--bg-subtle)',
                cursor:'not-allowed', opacity:0.6,
              }}>
                <input type="radio" disabled style={{ accentColor:'var(--brand-accent)', width:'18px', height:'18px' }} />
                <div>
                  <div style={{ fontWeight:'700', color:'var(--text-subtle)', marginBottom:'2px' }}>
                    🚚 Home Delivery <span className="tps-badge tps-badge-muted" style={{ marginLeft:'8px' }}>Coming Soon</span>
                  </div>
                  <div className="tps-subtle" style={{ fontSize:'13px' }}>
                    Delivery to your address will be available shortly.
                  </div>
                </div>
              </label>
            </div>
          </section>

          <section className="tps-card" style={{ padding:'28px' }}>
            <h2 className="tps-h4" style={{ marginBottom:'18px' }}>👤 Customer Details</h2>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', fontSize:'14px', color:'var(--text-muted)' }}>
              <div>
                <div className="tps-label">Name</div>
                <div>{member.name || '(not set)'}</div>
              </div>
              <div>
                <div className="tps-label">Email</div>
                <div>{member.email}</div>
              </div>
              <div>
                <div className="tps-label">Phone</div>
                <div>{member.phone || '(not set)'}</div>
              </div>
            </div>
            <Link to="/profile" style={{ display:'inline-block', marginTop:'16px', color:'var(--brand-accent)', fontSize:'13px', fontWeight:'700', textDecoration:'none' }}>
              Edit in profile →
            </Link>
          </section>
        </div>

        {/* Right: order summary */}
        <div>
          <div className="tps-card" style={{
            padding:'28px',
            position:'sticky', top:'90px',
            background:'var(--gradient-subtle)',
          }}>
            <h2 className="tps-h4" style={{ marginBottom:'18px' }}>🧾 Order Summary</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'16px' }}>
              {items.map(item => (
                <div key={item.key} style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', color:'var(--text-muted)' }}>
                  <span style={{ flex:1, marginRight:'8px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {item.title} × {item.quantity}
                  </span>
                  <span style={{ fontWeight:'600', color:'var(--text)' }}>₹{(item.unit_price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop:'1px solid var(--border)', paddingTop:'14px', marginTop:'14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', color:'var(--text-subtle)', marginBottom:'6px' }}>
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'22px', fontWeight:'800', color:'var(--text)', marginTop:'14px', fontFamily:'var(--font-heading)' }}>
                <span>Total</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
            </div>

            {error && (
              <div className="tps-badge tps-badge-danger" style={{
                marginTop:'16px', padding:'12px', display:'block', width:'100%',
                textAlign:'center', textTransform:'none', letterSpacing:'0', lineHeight:'1.5',
              }}>
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={handlePlacePickupOrder}
              disabled={processing}
              className="tps-btn tps-btn-primary tps-btn-lg tps-btn-block"
              style={{ marginTop:'22px' }}
            >
              {processing ? '⏳ Reserving...' : '🔖 Reserve & Pay on Pickup'}
            </button>
            <p className="tps-subtle" style={{ marginTop:'12px', textAlign:'center', fontSize:'12px', lineHeight:'1.6' }}>
              We'll hold your books at Tapas Reading Cafe.<br/>
              Pay cash or UPI when you collect them.
            </p>

            {razorpayEnabled ? (
              <button
                onClick={handleRazorpayPay}
                disabled={processing}
                className="tps-btn tps-btn-secondary tps-btn-block"
                style={{ marginTop:'12px' }}
              >
                💳 Or pay online with Razorpay
              </button>
            ) : (
              <div style={{
                marginTop:'14px', padding:'14px', borderRadius:'var(--radius-md)',
                background:'var(--surface-alt)',
                border:'1px dashed var(--border-strong)',
                textAlign:'center', color:'var(--text-subtle)', fontSize:'12px',
              }}>
                💳 Online payment (Razorpay) coming soon
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .checkout-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
