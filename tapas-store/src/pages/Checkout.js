import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CART_CSS from './cart/cartStyles';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { rupees } from './cart/cartFormat';
import { supabase } from '../utils/supabase';

// =====================================================================
// /checkout — wires the cart to Supabase Edge Functions:
//   1. create-razorpay-order  -> server validates prices, creates a
//      pending customer_orders row, returns Razorpay order id + key.
//   2. opens the Razorpay checkout modal (loaded via CDN <script>).
//   3. verify-razorpay-payment -> HMAC-checks the signature server-side
//      and flips the order to `paid`.
//   4. redirects to /order/:id, where OrderSuccess polls for status.
//
// All money math is server-authoritative. The summary block here is
// purely display; nothing it shows is sent to Razorpay.
// =====================================================================

const RAZORPAY_SDK = 'https://checkout.razorpay.com/v1/checkout.js';

function loadRazorpay() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector(`script[src="${RAZORPAY_SDK}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const s = document.createElement('script');
    s.src = RAZORPAY_SDK;
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function Checkout() {
  const navigate = useNavigate();
  const {
    items, subtotal, giftWrap, pickup, promoCode, note, clear,
  } = useCart();
  const { member, loading: authLoading } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadRazorpay(); }, []);

  // Display-only math (server re-computes the authoritative total).
  const memberDiscountApplied = !!member;
  const memberDiscount = memberDiscountApplied ? Math.round(subtotal * 0.10) : 0;
  const promoDiscount  = promoCode?.amount || 0;
  const giftWrapFee    = giftWrap ? 50 : 0;
  const shippingFee    = pickup ? 0 : (subtotal >= 999 ? 0 : 80);
  const taxBase        = Math.max(0, subtotal - memberDiscount - promoDiscount + giftWrapFee);
  const gst            = Math.round(taxBase * 0.05);
  const displayTotal   = taxBase + shippingFee + gst;

  const cartItemsForServer = useMemo(() => items.map(i => i.type === 'membership'
    ? {
        type: 'membership',
        membership_plan: i.membership_plan,
        membership_days: i.membership_days,
        quantity: i.quantity,
      }
    : {
        type: 'book',
        book_id: i.book_id,
        quantity: i.quantity,
      }
  ), [items]);

  const handlePay = async () => {
    setError('');
    if (!member) {
      navigate('/sign-in?next=/checkout');
      return;
    }
    if (items.length === 0) {
      setError('Your cart is empty.');
      return;
    }
    setSubmitting(true);
    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error('Could not load the Razorpay SDK. Check your connection and retry.');

      // 1. Server creates the order + Razorpay order id.
      const { data, error: fnErr } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          items: cartItemsForServer,
          notes: note || undefined,
          fulfillment_type: pickup ? 'pickup' : 'delivery',
          promo_code: promoCode?.code || null,
        },
      });
      if (fnErr) throw new Error(fnErr.message || 'Could not create order.');
      if (!data?.razorpay_order_id) throw new Error(data?.error || 'Order creation failed.');

      const customerOrderId = data.customer_order_id;

      // 2. Open Razorpay modal.
      await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: data.key_id,
          order_id: data.razorpay_order_id,
          amount: data.amount,
          currency: data.currency,
          name: 'Tapas Reading Cafe',
          description: `Order #${data.order_number}`,
          prefill: {
            name: data.member?.name || member.name || '',
            email: data.member?.email || member.email || '',
            contact: data.member?.phone || member.phone || '',
          },
          theme: { color: '#c49040' },
          handler: async (resp) => {
            try {
              const { data: vData, error: vErr } = await supabase.functions.invoke('verify-razorpay-payment', {
                body: {
                  razorpay_order_id: resp.razorpay_order_id,
                  razorpay_payment_id: resp.razorpay_payment_id,
                  razorpay_signature: resp.razorpay_signature,
                },
              });
              if (vErr) return reject(new Error(vErr.message || 'Payment verification failed.'));
              if (!vData?.ok) return reject(new Error(vData?.error || 'Payment verification failed.'));
              resolve();
            } catch (e) {
              reject(e);
            }
          },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled.')),
          },
        });
        rzp.on('payment.failed', (failed) => {
          reject(new Error(failed?.error?.description || 'Payment failed.'));
        });
        rzp.open();
      });

      // 3. Clear cart + go to confirmation page (which polls for status).
      clear();
      navigate(`/order/${customerOrderId}`);
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="ct-root">
        <style>{CART_CSS}</style>
        <div className="ct-checkout-stub">
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ct-root">
      <style>{CART_CSS}</style>
      <div className="ct-checkout-stub">
        <div className="ct-summary-kicker">Checkout</div>
        <h1>Review &amp; <em>pay.</em></h1>
        <p>{member ? 'Confirm your order — we hand you off to Razorpay to complete the payment.' : 'Please sign in to complete your purchase.'}</p>

        <div className="ct-checkout-stub-box">
          {items.length === 0 ? (
            <div className="ct-checkout-stub-row">
              <span>Basket is empty.</span>
              <span />
            </div>
          ) : items.map((i) => (
            <div key={i.key} className="ct-checkout-stub-row">
              <span>{i.title} · {i.author} × {i.quantity}</span>
              <span>{rupees(i.unit_price * i.quantity)}</span>
            </div>
          ))}

          {memberDiscount > 0 && (
            <div className="ct-checkout-stub-row">
              <span>Member discount</span>
              <span>−{rupees(memberDiscount)}</span>
            </div>
          )}
          {promoDiscount > 0 && (
            <div className="ct-checkout-stub-row">
              <span>Promo · {promoCode?.code}</span>
              <span>−{rupees(promoDiscount)}</span>
            </div>
          )}
          {giftWrapFee > 0 && (
            <div className="ct-checkout-stub-row">
              <span>Gift wrap</span>
              <span>{rupees(giftWrapFee)}</span>
            </div>
          )}
          <div className="ct-checkout-stub-row">
            <span>{pickup ? 'Pickup' : 'Shipping'}</span>
            <span>{shippingFee === 0 ? 'Free' : rupees(shippingFee)}</span>
          </div>
          <div className="ct-checkout-stub-row">
            <span>GST (5%)</span>
            <span>{rupees(gst)}</span>
          </div>
          <div className="ct-checkout-stub-total">
            <span>Total</span>
            <span>{rupees(displayTotal)}</span>
          </div>
          {note && (
            <div className="ct-checkout-stub-row" style={{ marginTop: 12 }}>
              <span>Note “{note}”</span>
              <span />
            </div>
          )}
          <p style={{ marginTop: 14, fontSize: 12, opacity: 0.7 }}>
            Final amount is recomputed on the server before charging.
          </p>
        </div>

        {error && (
          <div role="alert" style={{
            margin: '16px 0', padding: '12px 14px',
            background: '#fee2e2', border: '1px solid #fecaca',
            borderRadius: 10, color: '#991b1b', fontSize: 14, fontWeight: 600,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={handlePay}
            disabled={submitting || items.length === 0}
            className="tps-btn tps-btn-teal"
            style={{
              fontSize: 14, padding: '12px 28px', fontWeight: 700,
              cursor: submitting || items.length === 0 ? 'not-allowed' : 'pointer',
              opacity: submitting || items.length === 0 ? 0.6 : 1,
            }}
          >
            {!member ? 'Sign in to continue' : submitting ? 'Processing…' : `Pay ${rupees(displayTotal)} →`}
          </button>
          <Link to="/cart" className="ct-checkout-stub-back">← Back to the basket</Link>
        </div>
      </div>
    </div>
  );
}
