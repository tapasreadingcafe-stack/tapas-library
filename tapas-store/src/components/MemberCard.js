import React from 'react';
import { MEMBERSHIP_PERKS } from '../data/signUpConfig';

// Shared MemberCard illustration used on both /sign-in and /sign-up.
//
// Keeping the perks list in signUpConfig.js guarantees the two pages
// never drift. The footer differs per page, so callers pass a
// `variant` plus any overrides.
//
//   /sign-in  uses variant="compact" with a price line.
//   /sign-up  uses variant="stacked" with Starts today / No contract.

const DEFAULT_PRICE_LINE = '\u20B9467 / month \u00b7 cancel anytime';

export default function MemberCard({
  className = '',
  title,
  perks = MEMBERSHIP_PERKS,
  cardNumber = 'No. 0318',
  variant = 'compact',
  priceLine = DEFAULT_PRICE_LINE,
  leftBlock = { title: 'Starts today', sub: 'First meeting this week' },
  rightBlock = { title: 'No contract', sub: 'Cancel anytime, no fees' },
  showPerforations = false,
}) {
  const resolvedTitle = title ?? (
    variant === 'stacked' ? (
      <>Everything <em>a seat</em> unlocks.</>
    ) : (
      <>The <em>perks,</em> all of them.</>
    )
  );

  return (
    <aside className={`mc ${variant === 'stacked' ? 'mc--stacked' : 'mc--compact'} ${className}`} aria-label="Member card preview">
      {showPerforations && (
        <>
          <span className="mc-perf mc-perf-l" aria-hidden="true" />
          <span className="mc-perf mc-perf-r" aria-hidden="true" />
        </>
      )}

      <header className="mc-head">
        <span>Member card \u00b7 2026</span>
        {variant === 'stacked' ? (
          <img
            src={`${process.env.PUBLIC_URL || ''}/logo.png`}
            alt="Tapas Reading Cafe"
            className="mc-head-logo-img"
          />
        ) : (
          <span>{cardNumber}</span>
        )}
      </header>

      {variant === 'stacked' && <span className="mc-rule" aria-hidden="true" />}

      <h3 className="mc-title">{resolvedTitle}</h3>

      <ul className="mc-list">
        {perks.map((p) => (
          <li key={p}>
            <span className="mc-bullet" aria-hidden="true" />
            {p}
          </li>
        ))}
      </ul>

      {variant === 'stacked' ? (
        <>
          <span className="mc-rule mc-rule-foot" aria-hidden="true" />
          <div className="mc-foot-blocks">
            <div>
              <div className="mc-foot-title">{leftBlock.title}</div>
              <div className="mc-foot-sub">{leftBlock.sub}</div>
            </div>
            <div>
              <div className="mc-foot-title">{rightBlock.title}</div>
              <div className="mc-foot-sub">{rightBlock.sub}</div>
            </div>
          </div>
        </>
      ) : (
        <div className="mc-foot">
          <span>{priceLine}</span>
          <span className="mc-foot-plus" aria-hidden="true">+</span>
        </div>
      )}
    </aside>
  );
}

// Export a CSS string the pages can drop into their own style blocks
// so we don't need a global stylesheet for this tiny component.
export const MEMBER_CARD_CSS = `
.mc {
  position: relative;
  background: #1a1a1a;
  color: #fff;
  border-radius: 20px;
  padding: 26px 28px;
  box-shadow: 0 30px 60px -28px rgba(0,0,0,0.45);
}
.mc--stacked {
  padding: 36px 40px 32px;
  border-radius: 28px;
}
.mc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.72);
}
.mc-head-logo-img {
  height: 48px;
  width: auto;
  display: block;
  /* Logo is dark-on-transparent; the card is #1a1a1a. Invert turns
     the ink white so the mark reads cleanly on the dark field. */
  filter: brightness(0) invert(1);
}
.mc-rule {
  display: block;
  height: 1px;
  background: rgba(255,255,255,0.15);
  margin: 14px 0 0;
}
.mc-rule-foot { margin: 26px 0 0; }
.mc-title {
  font-family: "Fraunces", Georgia, serif;
  font-weight: 700;
  font-size: 24px;
  line-height: 1.2;
  letter-spacing: -0.01em;
  margin: 14px 0 12px;
  color: #fff;
}
.mc--stacked .mc-title { font-size: 30px; margin-top: 20px; margin-bottom: 22px; }
.mc-title em { color: #caf27e; font-style: italic; font-weight: 500; }
.mc-list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-family: "Inter", system-ui, sans-serif;
  font-size: 13px;
  color: rgba(255,255,255,0.92);
}
.mc--stacked .mc-list { font-size: 14px; }
.mc-list li {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 5px 0;
  line-height: 1.5;
}
.mc--stacked .mc-list li { padding: 7px 0; line-height: 1.7; }
.mc-bullet {
  width: 6px; height: 6px;
  border-radius: 999px;
  background: #E0004F;
  flex-shrink: 0;
  transform: translateY(-2px);
}
.mc-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 18px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.15);
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: rgba(255,255,255,0.7);
}
.mc-foot-plus {
  width: 26px; height: 26px;
  border-radius: 999px;
  background: rgba(255,255,255,0.1);
  color: #fff;
  display: inline-grid;
  place-items: center;
  font-size: 14px;
}
.mc-foot-blocks {
  display: flex;
  gap: 60px;
  margin-top: 18px;
}
.mc-foot-title {
  font-family: "Fraunces", Georgia, serif;
  font-weight: 700;
  font-size: 20px;
  color: #fff;
  letter-spacing: -0.01em;
  line-height: 1.1;
}
.mc-foot-sub {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #caf27e;
  margin-top: 6px;
}
.mc-perf {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 14px; height: 14px;
  border-radius: 999px;
  background: #caf27e;
  box-shadow: inset 0 0 0 2px rgba(0,0,0,0.15);
}
.mc-perf-l { left: -7px; }
.mc-perf-r { right: -7px; }
`;
