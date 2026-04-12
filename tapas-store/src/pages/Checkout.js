import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

// =====================================================================
// /checkout — Modern Heritage redesign
// Two-column, tonal layering, Newsreader headings, ambient shadows.
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
        theme: { color: '#006a6a' },
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

  const labelStyle = {
    fontFamily: 'var(--font-display, Newsreader, serif)',
    fontSize: '13px', fontWeight: 500,
    color: 'var(--text-subtle, #8b7355)',
    marginBottom: '4px',
  };

  return (
    <div style={{
      maxWidth: '1080px', margin: '0 auto',
      padding: '56px 20px 80px',
      fontFamily: 'var(--font-body)',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '36px' }}>
        <p style={{
          fontSize: '13px', fontWeight: 600,
          color: 'var(--text-subtle, #8b7355)', textTransform: 'uppercase',
          letterSpacing: '1.5px', marginBottom: '8px',
        }}>Almost there</p>
        <h1 style={{
          fontFamily: 'var(--font-display, Newsreader, serif)',
          fontSize: '36px', fontWeight: 500, color: 'var(--text, #26170c)',
          lineHeight: 1.2, margin: 0,
        }}>Checkout</h1>
        <p style={{ fontSize: '15px', color: 'var(--text-muted, #5c4a3a)', marginTop: '8px' }}>
          Review your order and confirm your pickup.
        </p>
      </div>

      <div className="checkout-grid" style={{
        display: 'grid', gridTemplateColumns: '1fr 380px', gap: '28px',
      }}>

        {/* ============ Left column ============ */}
        <div>
          {/* Fulfillment card */}
          <section className="tps-card" style={{
            background: 'var(--bg-card, #ede8d0)',
            borderRadius: 'var(--radius-xl, 16px)',
            boxShadow: 'var(--shadow-ambient, 0 1px 4px rgba(0,0,0,.06))',
            padding: '28px', marginBottom: '20px', border: 'none',
          }}>
            <h2 style={{
              fontFamily: 'var(--font-display, Newsreader, serif)',
              fontSize: '20px', fontWeight: 500, color: 'var(--text, #26170c)',
              marginBottom: '18px', marginTop: 0,
            }}>Fulfillment</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Pickup - selected */}
              <label style={{
                display: 'flex', alignItems: 'center', gap: '14px', padding: '18px',
                borderRadius: 'var(--radius-md, 10px)',
                border: '2px solid var(--secondary, #006a6a)',
                background: 'rgba(0,106,106,0.06)',
                cursor: 'pointer',
              }}>
                <input type="radio" checked={fulfillment === 'pickup'} readOnly
                  style={{ accentColor: 'var(--secondary, #006a6a)', width: '18px', height: '18px' }} />
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text, #26170c)', marginBottom: '2px', fontSize: '15px' }}>
                    In-store Pickup
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted, #5c4a3a)' }}>
                    Collect your order at Tapas Reading Cafe. We'll notify you when it's ready.
                  </div>
                </div>
              </label>

              {/* Delivery - disabled */}
              <label style={{
                display: 'flex', alignItems: 'center', gap: '14px', padding: '18px',
                borderRadius: 'var(--radius-md, 10px)',
                border: '2px solid transparent',
                background: 'var(--bg-section, #f5f5dc)',
                cursor: 'not-allowed', opacity: 0.55,
              }}>
                <input type="radio" disabled
                  style={{ accentColor: 'var(--secondary, #006a6a)', width: '18px', height: '18px' }} />
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-muted, #5c4a3a)', marginBottom: '2px', fontSize: '15px' }}>
                    Home Delivery{' '}
                    <span className="tps-chip" style={{
                      fontSize: '11px', marginLeft: '8px', padding: '2px 10px',
                      background: 'var(--bg-inset, #e6e1c8)', color: 'var(--text-subtle, #8b7355)',
                    }}>Coming Soon</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-subtle, #8b7355)' }}>
                    Delivery to your address will be available shortly.
                  </div>
                </div>
              </label>
            </div>
          </section>

          {/* Customer details card */}
          <section className="tps-card" style={{
            background: 'var(--bg-card, #ede8d0)',
            borderRadius: 'var(--radius-xl, 16px)',
            boxShadow: 'var(--shadow-ambient, 0 1px 4px rgba(0,0,0,.06))',
            padding: '28px', border: 'none',
          }}>
            <h2 style={{
              fontFamily: 'var(--font-display, Newsreader, serif)',
              fontSize: '20px', fontWeight: 500, color: 'var(--text, #26170c)',
              marginBottom: '18px', marginTop: 0,
            }}>Customer Details</h2>

            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px',
              fontSize: '14px', color: 'var(--text-muted, #5c4a3a)',
            }}>
              <div>
                <div style={labelStyle}>Name</div>
                <div style={{ fontWeight: 600, color: 'var(--text, #26170c)' }}>{member.name || '(not set)'}</div>
              </div>
              <div>
                <div style={labelStyle}>Email</div>
                <div style={{ fontWeight: 600, color: 'var(--text, #26170c)' }}>{member.email}</div>
              </div>
              <div>
                <div style={labelStyle}>Phone</div>
                <div style={{ fontWeight: 600, color: 'var(--text, #26170c)' }}>{member.phone || '(not set)'}</div>
              </div>
            </div>
            <Link to="/profile" style={{
              display: 'inline-block', marginTop: '16px',
              color: 'var(--secondary, #006a6a)', fontSize: '13px',
              fontWeight: 700, textDecoration: 'none',
            }}>
              Edit in profile
            </Link>
          </section>
        </div>

        {/* ============ Right column: sticky order summary ============ */}
        <div>
          <div style={{
            position: 'sticky', top: '90px',
            background: 'var(--bg-card, #ede8d0)',
            borderRadius: 'var(--radius-xl, 16px)',
            boxShadow: 'var(--shadow-ambient, 0 1px 4px rgba(0,0,0,.06))',
            padding: '28px',
          }}>
            <h2 style={{
              fontFamily: 'var(--font-display, Newsreader, serif)',
              fontSize: '20px', fontWeight: 500, color: 'var(--text, #26170c)',
              marginBottom: '18px', marginTop: 0,
            }}>Order Summary</h2>

            {/* Line items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {items.map(item => (
                <div key={item.key} style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: '13px', color: 'var(--text-muted, #5c4a3a)',
                }}>
                  <span style={{
                    flex: 1, marginRight: '8px', overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {item.title} x {item.quantity}
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--text, #26170c)' }}>
                    ₹{(item.unit_price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div style={{
              background: 'var(--bg-inset, #e6e1c8)',
              borderRadius: 'var(--radius-md, 10px)',
              padding: '16px', marginTop: '8px',
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: '13px', color: 'var(--text-subtle, #8b7355)', marginBottom: '8px',
              }}>
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                marginTop: '8px',
              }}>
                <span style={{
                  fontFamily: 'var(--font-display, Newsreader, serif)',
                  fontSize: '16px', fontWeight: 500, color: 'var(--text, #26170c)',
                }}>Total</span>
                <span style={{
                  fontFamily: 'var(--font-display, Newsreader, serif)',
                  fontSize: '26px', fontWeight: 500, color: 'var(--accent, #c49040)',
                }}>₹{subtotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                marginTop: '16px', padding: '12px 16px',
                background: 'rgba(180,60,60,0.08)',
                borderRadius: 'var(--radius-md, 10px)',
                color: '#a63d3d', fontSize: '13px', lineHeight: 1.5,
                textAlign: 'center', fontWeight: 600,
              }}>
                {error}
              </div>
            )}

            {/* Primary CTA */}
            <button
              onClick={handlePlacePickupOrder}
              disabled={processing}
              className="tps-btn tps-btn-teal tps-btn-lg tps-btn-block"
              style={{ marginTop: '22px', width: '100%' }}
            >
              {processing ? 'Reserving...' : 'Reserve & Pay on Pickup'}
            </button>
            <p style={{
              marginTop: '12px', textAlign: 'center', fontSize: '12px',
              lineHeight: 1.6, color: 'var(--text-subtle, #8b7355)',
            }}>
              We'll hold your books at Tapas Reading Cafe.<br />
              Pay cash or UPI when you collect them.
            </p>

            {/* Razorpay */}
            {razorpayEnabled ? (
              <button
                onClick={handleRazorpayPay}
                disabled={processing}
                className="tps-btn tps-btn-primary tps-btn-block"
                style={{ marginTop: '12px', width: '100%' }}
              >
                Or pay online with Razorpay
              </button>
            ) : (
              <div style={{
                marginTop: '14px', padding: '14px',
                borderRadius: 'var(--radius-md, 10px)',
                border: '1.5px dashed var(--secondary, #006a6a)',
                background: 'rgba(0,106,106,0.04)',
                textAlign: 'center', color: 'var(--secondary, #006a6a)',
                fontSize: '12px', fontWeight: 600,
              }}>
                Online payment (Razorpay) coming soon
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
