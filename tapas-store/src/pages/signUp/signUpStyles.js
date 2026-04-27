const SIGN_UP_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

.su-root {
  --su-lime:   #caf27e;
  --su-orange: #FF934A;
  --su-purple: #8F4FD6;
  --su-pink:   #E0004F;
  --su-ink:    #1a1a1a;
  --su-ink-2:  #3a3a3a;
  --su-muted:  #6e6e6e;
  --su-rule:   #ececea;
  --su-bg:     #faf8f4;
  --su-card:   #ffffff;
  --su-f-display: "DM Serif Display", Georgia, serif;
  --su-f-ui:      "Inter", system-ui, sans-serif;
  --su-f-mono:    "JetBrains Mono", ui-monospace, monospace;

  font-family: var(--su-f-ui);
  color: var(--su-ink);
  background: var(--su-bg);
  -webkit-font-smoothing: antialiased;
  font-size: 16px;
  min-height: 100vh;
}
.su-root * { box-sizing: border-box; }

.su-wrap {
  max-width: 1280px;
  margin: 0 auto;
  padding: 48px 32px 80px;
}
.su-grid {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 48px;
  align-items: start;
}

.su-oauth {
  margin-top: 0;
}
.su-oauth-btn {
  width: 100%;
  background: #fff;
  border: 1px solid var(--su-rule);
  border-radius: 999px;
  padding: 12px 0;
  font-family: inherit;
  font-size: 14px;
  color: var(--su-ink);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: border-color 150ms, background 150ms;
}
.su-oauth-btn:hover {
  border-color: var(--su-ink);
  background: #fafaf5;
}
.su-divider {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 28px 0;
  font-family: var(--su-f-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--su-muted);
}
.su-divider::before,
.su-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--su-rule);
}

/* ---- Heading ---- */
.su-kicker {
  font-family: var(--su-f-mono);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--su-purple);
  margin-bottom: 14px;
}
.su-title {
  font-family: var(--su-f-display);
  font-weight: 400;
  font-size: clamp(40px, 5.2vw, 64px);
  line-height: 1.02;
  letter-spacing: -0.02em;
  color: var(--su-ink);
  margin: 0 0 16px;
}
.su-title em {
  color: var(--su-purple);
  font-style: italic;
  font-weight: 500;
}
.su-lede {
  color: var(--su-ink-2);
  font-size: 14.5px;
  line-height: 1.6;
  margin: 0 0 28px;
  max-width: 60ch;
}

/* ---- Pricing tiers ---- */
.su-tiers {
  background: #fff;
  border: 1px solid var(--su-rule);
  border-radius: 22px;
  padding: 10px;
  display: grid;
  grid-template-columns: 1fr 1.15fr 1fr;
  gap: 0;
  position: relative;
}
.su-tier {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
  padding: 22px 24px 24px;
  background: #fff;
  border: 1px solid transparent;
  border-radius: 16px;
  cursor: pointer;
  font-family: inherit;
  color: var(--su-ink);
  text-align: left;
  transition: background 150ms, border-color 150ms, transform 150ms;
}
.su-tier:hover { background: #fafaf5; }
.su-tier-kicker {
  font-family: var(--su-f-mono);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--su-muted);
}
.su-tier-name {
  font-family: var(--su-f-display);
  font-weight: 400;
  font-size: 20px;
  letter-spacing: -0.01em;
  color: var(--su-ink);
}
.su-tier-price {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 4px;
}
.su-tier-price-num {
  font-family: var(--su-f-display);
  font-weight: 400;
  font-size: 36px;
  letter-spacing: -0.02em;
  color: var(--su-ink);
}
.su-tier-price-sfx {
  font-family: var(--su-f-mono);
  font-size: 12px;
  color: var(--su-muted);
  letter-spacing: 0.06em;
}
.su-tier.is-highlight { transform: scale(1.03); }
.su-tier.is-selected {
  background: var(--su-lime);
  border-color: var(--su-pink);
}
.su-tier.is-selected .su-tier-kicker { color: var(--su-pink); }

/* ---- Stepper ---- */
.su-form {
  background: #fff;
  border: 1px solid var(--su-rule);
  border-radius: 28px;
  padding: 40px 44px;
  margin-top: 40px;
}
.su-stepper {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
  flex-wrap: wrap;
}
.su-step {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: transparent;
  border: 0;
  padding: 0;
  cursor: default;
  font-family: inherit;
  color: var(--su-muted);
}
.su-step[data-clickable="true"] { cursor: pointer; }
.su-step-circle {
  width: 32px; height: 32px;
  border-radius: 999px;
  display: inline-grid;
  place-items: center;
  font-family: var(--su-f-mono);
  font-size: 12px;
  font-weight: 500;
  background: #fff;
  border: 1px solid var(--su-rule);
  color: var(--su-muted);
}
.su-step.is-active .su-step-circle {
  background: var(--su-ink);
  color: #fff;
  border-color: var(--su-ink);
}
.su-step.is-done .su-step-circle {
  background: var(--su-pink);
  color: #fff;
  border-color: var(--su-pink);
}
.su-step-label {
  font-family: var(--su-f-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--su-muted);
}
.su-step.is-active .su-step-label { color: var(--su-ink); font-weight: 500; }
.su-step-rule {
  flex: 1;
  min-width: 20px;
  height: 1px;
  background: var(--su-rule);
}

/* ---- Step content ---- */
.su-step-title {
  font-family: var(--su-f-display);
  font-weight: 400;
  font-size: clamp(26px, 3vw, 36px);
  line-height: 1.05;
  letter-spacing: -0.015em;
  color: var(--su-ink);
  margin: 0 0 8px;
}
.su-step-title em {
  color: var(--su-purple);
  font-style: italic;
  font-weight: 500;
}
.su-step-sub {
  color: var(--su-ink-2);
  font-size: 13px;
  line-height: 1.5;
  margin: 0 0 24px;
}

.su-fields { display: flex; flex-direction: column; gap: 18px; }
.su-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.su-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }

.su-field { display: flex; flex-direction: column; gap: 6px; }
.su-field label {
  font-family: var(--su-f-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--su-muted);
}
.su-input, .su-select, .su-textarea {
  background: rgba(0,0,0,0.02);
  border: 1px solid var(--su-rule);
  border-radius: 12px;
  padding: 12px 14px;
  font-family: inherit;
  font-size: 14.5px;
  color: var(--su-ink);
  outline: none;
  transition: border-color 150ms, box-shadow 150ms, background 150ms;
}
.su-input:focus, .su-select:focus, .su-textarea:focus {
  border-color: var(--su-pink);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(224,0,79,0.08);
}
.su-textarea { min-height: 96px; resize: vertical; }
.su-help { font-size: 12px; color: var(--su-muted); margin-top: 4px; }
.su-error {
  font-family: var(--su-f-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--su-pink);
  margin-top: 2px;
}

.su-chip-row { display: flex; gap: 8px; flex-wrap: wrap; }
.su-chip {
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 14px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid var(--su-rule);
  color: var(--su-ink-2);
  cursor: pointer;
  transition: background 150ms, color 150ms, border-color 150ms, box-shadow 150ms;
  white-space: nowrap;
}
.su-chip:hover { border-color: var(--su-ink); }
.su-chip.is-on {
  background: var(--su-ink);
  color: #fff;
  border-color: var(--su-ink);
}
.su-chip.is-on.is-default {
  box-shadow: 0 0 0 2px var(--su-lime);
}

.su-seg {
  display: inline-flex;
  background: rgba(0,0,0,0.04);
  border-radius: 999px;
  padding: 4px;
  gap: 4px;
  flex-wrap: wrap;
}
.su-seg button {
  background: transparent;
  border: 0;
  padding: 8px 14px;
  border-radius: 999px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--su-ink-2);
  cursor: pointer;
  transition: background 150ms, color 150ms;
}
.su-seg button.is-on {
  background: #fff;
  color: var(--su-ink);
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.su-radio-row {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}
.su-radio {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--su-ink-2);
  cursor: pointer;
  padding: 6px 2px;
}
.su-radio input { accent-color: var(--su-pink); }

/* ---- Payment card-number with brand icon ---- */
.su-card-wrap { position: relative; }
.su-card-input { padding-right: 62px; font-variant-numeric: tabular-nums; }
.su-brand-tag {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-family: var(--su-f-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  padding: 4px 8px;
  border-radius: 999px;
  background: var(--su-ink);
  color: #fff;
  pointer-events: none;
}

/* ---- Form action bar ---- */
.su-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--su-rule);
  flex-wrap: wrap;
}
.su-consent {
  display: inline-flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;
  color: var(--su-ink-2);
  line-height: 1.5;
  max-width: 46ch;
}
.su-consent input { accent-color: var(--su-pink); margin-top: 3px; }
.su-consent a { color: var(--su-pink); }

.su-next {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: var(--su-ink);
  color: #fff;
  border: 0;
  padding: 12px 20px;
  border-radius: 999px;
  font-family: inherit;
  font-size: 14.5px;
  font-weight: 500;
  cursor: pointer;
  transition: background 150ms, transform 150ms, opacity 150ms;
}
.su-next.is-final {
  background: var(--su-ink);
  color: #fff;
  width: 100%;
  justify-content: center;
  padding: 16px 24px;
  font-size: 16px;
}
.su-next:hover:not(:disabled) { transform: translateY(-1px); }
.su-next:disabled { opacity: 0.5; cursor: not-allowed; }
.su-next-arrow {
  width: 22px; height: 22px;
  border-radius: 999px;
  background: var(--su-pink);
  color: #fff;
  display: inline-grid;
  place-items: center;
}
.su-next.is-final .su-next-arrow {
  background: var(--su-lime);
  color: var(--su-ink);
}
.su-back {
  background: transparent;
  border: 0;
  color: var(--su-ink-2);
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  padding: 8px 2px;
}
.su-back:hover { color: var(--su-ink); }

.su-below-form {
  text-align: center;
  margin-top: 18px;
  font-size: 13px;
  color: var(--su-muted);
}
.su-below-form a { color: var(--su-pink); margin-left: 4px; text-decoration: none; }
.su-below-form a:hover { text-decoration: underline; }

/* ---- Right column ---- */
.su-side { position: sticky; top: 32px; display: flex; flex-direction: column; gap: 24px; }

.su-week {
  background: var(--su-lime);
  border-radius: 22px;
  padding: 32px 36px;
}
.su-week-kicker {
  font-family: var(--su-f-mono);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--su-purple);
  margin-bottom: 8px;
}
.su-week-title {
  font-family: var(--su-f-display);
  font-weight: 400;
  font-size: 26px;
  line-height: 1.1;
  letter-spacing: -0.01em;
  color: var(--su-ink);
  margin: 0 0 20px;
}
.su-week-title em { color: var(--su-purple); font-style: italic; font-weight: 500; }
.su-week-row {
  display: grid;
  grid-template-columns: 14px 1fr;
  gap: 14px;
  padding: 12px 0;
  border-top: 1px dashed rgba(26,26,26,0.18);
}
.su-week-row:first-of-type { border-top: 0; padding-top: 0; }
.su-week-dot {
  width: 8px; height: 8px;
  border-radius: 999px;
  background: var(--su-pink);
  margin-top: 8px;
}
.su-week-when {
  font-family: var(--su-f-mono);
  font-size: 12px;
  color: var(--su-ink);
  letter-spacing: 0.04em;
}
.su-week-copy {
  font-family: var(--su-f-display);
  font-size: 15px;
  color: var(--su-ink);
  margin-top: 2px;
  line-height: 1.4;
}
.su-week-copy em { font-style: italic; color: var(--su-ink); }

.su-info {
  background: #fff;
  border: 1px solid var(--su-rule);
  border-radius: 22px;
  padding: 28px 32px;
}
.su-info h3 {
  font-family: var(--su-f-display);
  font-weight: 400;
  font-size: 22px;
  line-height: 1.15;
  letter-spacing: -0.01em;
  color: var(--su-ink);
  margin: 0 0 10px;
}
.su-info h3 em { color: var(--su-purple); font-style: italic; font-weight: 500; }
.su-info p {
  color: var(--su-ink-2);
  font-size: 14.5px;
  line-height: 1.55;
  margin: 0;
}

/* Stubs (shared by /welcome, /code-of-the-room, /privacy) */
.su-stub-page {
  min-height: 70vh;
  display: grid;
  place-items: center;
  padding: 48px 20px;
  background: var(--su-bg);
  text-align: center;
}
.su-stub-inner { max-width: 520px; }
.su-stub-inner h1 {
  font-family: var(--su-f-display);
  font-weight: 400;
  font-size: clamp(32px, 4vw, 48px);
  line-height: 1.05;
  letter-spacing: -0.02em;
  color: var(--su-ink);
  margin: 0 0 14px;
}
.su-stub-inner h1 em { color: var(--su-purple); font-style: italic; font-weight: 500; }
.su-stub-inner p {
  font-family: var(--su-f-ui);
  font-size: 15px;
  line-height: 1.6;
  color: var(--su-ink-2);
  margin: 0 0 24px;
}
.su-stub-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--su-ink);
  text-decoration: none;
  font-family: var(--su-f-mono);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.04em;
}
.su-stub-back:hover { color: var(--su-purple); }

/* ---- Responsive ---- */
@media (max-width: 1023px) {
  .su-wrap { padding: 32px 24px 60px; }
  .su-grid { grid-template-columns: 1fr; gap: 32px; }
  .su-side { position: static; }
  .su-form { padding: 32px; }
  .su-tiers { grid-template-columns: 1fr; gap: 6px; }
  .su-tier.is-highlight { transform: none; }
}
@media (max-width: 767px) {
  .su-wrap { padding: 24px 16px 48px; }
  .su-form { padding: 24px 20px; border-radius: 22px; }
  .su-row-2, .su-row-3 { grid-template-columns: 1fr; }
  .su-stepper { gap: 10px; }
  .su-step-label { display: none; }
  .su-step.is-active .su-step-label { display: inline; }
  .su-actions { flex-direction: column; align-items: stretch; }
  .su-consent { max-width: 100%; }
  .su-next { justify-content: center; }
}
`;

export default SIGN_UP_CSS;
