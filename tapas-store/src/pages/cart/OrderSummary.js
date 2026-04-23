import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { resolvePromo } from '../../data/promoCodes';
import { rupees } from './cartFormat';

export default function OrderSummary({
  subtotal, memberDiscount, promoDiscount, giftWrapFee,
  shippingFee, gst, total, itemCount, memberDiscountApplied,
}) {
  const { items, note, giftWrap, pickup, promoCode, applyPromoCode, clearPromoCode } = useCart();
  const [promoOpen, setPromoOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [msg, setMsg] = useState(null);
  const navigate = useNavigate();

  const onApplyPromo = (e) => {
    e.preventDefault();
    const r = resolvePromo(draft, { subtotal, memberDiscountApplied });
    if (!r.ok) {
      setMsg({ ok: false, text: r.message });
      return;
    }
    applyPromoCode(r.code, r.amount);
    setMsg({ ok: true, text: r.message });
    setDraft('');
  };

  const onCheckout = () => {
    if (items.length === 0) return;
    // TODO: hand off to Razorpay / Stripe. For now we route to the
    // /checkout stub which renders the current summary.
    // eslint-disable-next-line no-console
    console.log('[cart] checkout', {
      items, subtotal, memberDiscount, promoDiscount, giftWrapFee,
      shippingFee, gst, total, note, giftWrap, pickup, promoCode,
    });
    navigate('/checkout');
  };

  return (
    <section className="ct-summary" aria-labelledby="ct-summary-h">
      <div className="ct-summary-kicker">Order summary</div>
      <h3 id="ct-summary-h" className="ct-summary-title">
        Before <em>wrapping up.</em>
      </h3>

      <div className="ct-line">
        <span className="ct-line-label">Subtotal</span>
        <span className="ct-line-value">{rupees(subtotal)}</span>
      </div>
      {memberDiscount > 0 && (
        <div className="ct-line">
          <span className="ct-line-label">Member discount (10%)</span>
          <span className="ct-line-value is-discount">\u2212{rupees(memberDiscount)}</span>
        </div>
      )}
      {promoDiscount > 0 && (
        <div className="ct-line">
          <span className="ct-line-label">Promo \u00b7 {promoCode?.code}</span>
          <span className="ct-line-value is-discount">\u2212{rupees(promoDiscount)}</span>
        </div>
      )}
      {giftWrapFee > 0 && (
        <div className="ct-line">
          <span className="ct-line-label">Gift wrap</span>
          <span className="ct-line-value">{rupees(giftWrapFee)}</span>
        </div>
      )}
      <div className="ct-line">
        <span className="ct-line-label">{pickup ? 'Pickup' : 'Shipping'}</span>
        {shippingFee === 0 ? (
          <span className="ct-line-value is-free">Free</span>
        ) : (
          <span className="ct-line-value">{rupees(shippingFee)}</span>
        )}
      </div>
      <div className="ct-line">
        <span className="ct-line-label">Estimated tax (GST 5%)</span>
        <span className="ct-line-value">{rupees(gst)}</span>
      </div>
      <div className="ct-line ct-line-total">
        <span className="ct-line-label">Total</span>
        <span className="ct-line-value">{rupees(total)}</span>
      </div>

      <div className="ct-promo">
        {promoCode ? (
          <div className="ct-promo-applied">
            <span>Promo <b>{promoCode.code}</b> \u2014 \u2212{rupees(promoCode.amount)}</span>
            <button type="button" onClick={() => { clearPromoCode(); setMsg(null); }}>
              Remove
            </button>
          </div>
        ) : !promoOpen ? (
          <button type="button" className="ct-promo-toggle" onClick={() => setPromoOpen(true)}>
            Add a promo code
          </button>
        ) : (
          <form className="ct-promo-form" onSubmit={onApplyPromo}>
            <input
              type="text"
              className="ct-promo-input"
              placeholder="READER10"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="Promo code"
            />
            <button type="submit" className="ct-promo-apply">Apply</button>
          </form>
        )}
        {msg && !promoCode && (
          <div className={`ct-promo-msg ${msg.ok ? 'is-ok' : 'is-err'}`}>{msg.text}</div>
        )}
      </div>

      <button
        type="button"
        className="ct-checkout"
        onClick={onCheckout}
        disabled={itemCount === 0}
      >
        Checkout \u00b7 {rupees(total)}
        <span className="ct-checkout-arrow" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </span>
      </button>

      <div className="ct-secure">Secure checkout \u00b7 Razorpay / UPI / Cards</div>
      <div className="ct-trust">
        <span>Hand-wrapped</span>
        <span>\u00b7</span>
        <span>Ships from the cafe</span>
        <span>\u00b7</span>
        <span>30-day returns</span>
      </div>
    </section>
  );
}
