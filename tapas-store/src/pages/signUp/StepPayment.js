import React, { useEffect, useRef } from 'react';
import {
  formatCardNumber, formatExpiry, digitsOnly, detectBrand, BRAND_LABEL,
} from './cardFormat';
import { tierByKey } from '../../data/signUpConfig';

export default function StepPayment({ state, dispatch, errors }) {
  const nameRef = useRef(null);
  useEffect(() => { nameRef.current?.focus({ preventScroll: true }); }, []);

  // Pre-fill billing email from Step 1 the first time this step opens.
  useEffect(() => {
    if (!state.payment.billingEmail && state.aboutYou.email) {
      dispatch({ type: 'PATCH_PAYMENT', patch: { billingEmail: state.aboutYou.email } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const p = state.payment;
  const tier = tierByKey(state.tier);
  const patch = (patchObj) => dispatch({ type: 'PATCH_PAYMENT', patch: patchObj });
  const brand = detectBrand(p.cardNumber);

  return (
    <>
      <h2 className="su-step-title">Seal the <em>seat.</em></h2>
      <p className="su-step-sub">
        Selected plan: <strong>{tier.name}</strong> at <strong>{tier.paymentLabel}</strong>.
        You can cancel anytime.
      </p>

      <div className="su-fields">
        <div className="su-field">
          <label htmlFor="su-cardName">Cardholder name</label>
          <input
            id="su-cardName"
            ref={nameRef}
            type="text"
            className="su-input"
            value={p.cardName}
            onChange={(e) => patch({ cardName: e.target.value })}
            required
            autoComplete="cc-name"
          />
          {errors.cardName && <div className="su-error">{errors.cardName}</div>}
        </div>

        <div className="su-field">
          <label htmlFor="su-cardNumber">Card number</label>
          <div className="su-card-wrap">
            <input
              id="su-cardNumber"
              type="text"
              inputMode="numeric"
              className="su-input su-card-input"
              placeholder="1234 5678 9012 3456"
              value={p.cardNumber}
              onChange={(e) => patch({ cardNumber: formatCardNumber(e.target.value) })}
              autoComplete="cc-number"
              aria-describedby={brand ? 'su-card-brand' : undefined}
            />
            {brand && (
              <span id="su-card-brand" className="su-brand-tag">
                {BRAND_LABEL[brand] || brand.toUpperCase()}
              </span>
            )}
          </div>
          {errors.cardNumber && <div className="su-error">{errors.cardNumber}</div>}
        </div>

        <div className="su-row-3">
          <div className="su-field">
            <label htmlFor="su-expiry">Expiry</label>
            <input
              id="su-expiry"
              type="text"
              inputMode="numeric"
              className="su-input"
              placeholder="MM / YY"
              value={p.expiry}
              onChange={(e) => patch({ expiry: formatExpiry(e.target.value) })}
              autoComplete="cc-exp"
            />
            {errors.expiry && <div className="su-error">{errors.expiry}</div>}
          </div>
          <div className="su-field">
            <label htmlFor="su-cvc">CVC</label>
            <input
              id="su-cvc"
              type="text"
              inputMode="numeric"
              className="su-input"
              maxLength={4}
              value={p.cvc}
              onChange={(e) => patch({ cvc: digitsOnly(e.target.value).slice(0, 4) })}
              autoComplete="cc-csc"
            />
            {errors.cvc && <div className="su-error">{errors.cvc}</div>}
          </div>
          <div className="su-field">
            <label htmlFor="su-postal">Postal code (optional)</label>
            <input
              id="su-postal"
              type="text"
              className="su-input"
              value={p.postal}
              onChange={(e) => patch({ postal: e.target.value })}
              autoComplete="postal-code"
            />
          </div>
        </div>

        <div className="su-field">
          <label htmlFor="su-billingEmail">Billing email</label>
          <input
            id="su-billingEmail"
            type="email"
            className="su-input"
            value={p.billingEmail}
            onChange={(e) => patch({ billingEmail: e.target.value })}
            autoComplete="email"
          />
        </div>

        <label className="su-consent" style={{ alignItems: 'flex-start' }}>
          <input
            type="checkbox"
            checked={p.authorized}
            onChange={(e) => patch({ authorized: e.target.checked })}
          />
          <span>
            I authorize Tapas Reading Cafe to charge my card{' '}
            <strong>{tier.paymentLabel}</strong> until I cancel. Cancel anytime in your account settings.
          </span>
        </label>
        {errors.authorized && <div className="su-error">{errors.authorized}</div>}
      </div>
    </>
  );
}
