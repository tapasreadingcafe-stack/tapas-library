import React from 'react';
import { Link } from 'react-router-dom';
import CART_CSS from './cart/cartStyles';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { rupees } from './cart/cartFormat';

// Stub checkout. Renders the current order summary so the user can
// see what's about to be charged. The real Razorpay / Stripe hand-off
// lands in the next spec.
export default function Checkout() {
  const {
    items, subtotal, giftWrap, pickup, promoCode, note,
  } = useCart();
  const { member } = useAuth();

  const memberDiscountApplied = !!member;
  const memberDiscount = memberDiscountApplied ? Math.round(subtotal * 0.10) : 0;
  const promoDiscount  = promoCode?.amount || 0;
  const giftWrapFee    = giftWrap ? 50 : 0;
  const shippingFee    = pickup ? 0 : (subtotal >= 999 ? 0 : 80);
  const taxBase        = Math.max(0, subtotal - memberDiscount - promoDiscount + giftWrapFee);
  const gst            = Math.round(taxBase * 0.05);
  const total          = taxBase + shippingFee + gst;

  return (
    <div className="ct-root">
      <style>{CART_CSS}</style>
      <div className="ct-checkout-stub">
        <div className="ct-summary-kicker">Checkout</div>
        <h1>Checkout flow <em>coming next.</em></h1>
        <p>Your basket is safe. Here’s the summary you just confirmed:</p>

        <div className="ct-checkout-stub-box">
          {items.length === 0 ? (
            <div className="ct-checkout-stub-row">
              <span>Basket is empty.</span>
              <span />
            </div>
          ) : items.map((i) => (
            <div key={i.key} className="ct-checkout-stub-row">
              <span>{i.title} · {i.author} \u00d7 {i.quantity}</span>
              <span>{rupees(i.unit_price * i.quantity)}</span>
            </div>
          ))}

          {memberDiscount > 0 && (
            <div className="ct-checkout-stub-row">
              <span>Member discount</span>
              <span>\u2212{rupees(memberDiscount)}</span>
            </div>
          )}
          {promoDiscount > 0 && (
            <div className="ct-checkout-stub-row">
              <span>Promo · {promoCode?.code}</span>
              <span>\u2212{rupees(promoDiscount)}</span>
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
            <span>{rupees(total)}</span>
          </div>
          {note && (
            <div className="ct-checkout-stub-row" style={{ marginTop: 12 }}>
              <span>Note \u201C{note}\u201D</span>
              <span />
            </div>
          )}
        </div>

        <Link to="/cart" className="ct-checkout-stub-back">
          ← Back to the basket
        </Link>
      </div>
    </div>
  );
}
