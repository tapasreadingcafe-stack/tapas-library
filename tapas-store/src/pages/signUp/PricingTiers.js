import React from 'react';
import { PRICING_TIERS } from '../../data/signUpConfig';

export default function PricingTiers({ tier, onTier }) {
  return (
    <div className="su-tiers" role="radiogroup" aria-label="Membership tier">
      {PRICING_TIERS.map((t) => {
        const selected = tier === t.key;
        return (
          <button
            key={t.key}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onTier(t.key)}
            className={[
              'su-tier',
              selected && 'is-selected',
              t.highlight && 'is-highlight',
            ].filter(Boolean).join(' ')}
          >
            <span className="su-tier-kicker">{t.kicker}</span>
            <span className="su-tier-name">{t.name}</span>
            <span className="su-tier-price">
              <span className="su-tier-price-num">₹{t.price.toLocaleString('en-IN')}</span>
              <span className="su-tier-price-sfx">{t.suffix}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
