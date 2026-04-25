const CART_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

.ct-root {
  --ct-lime:   #caf27e;
  --ct-orange: #FF934A;
  --ct-purple: #8F4FD6;
  --ct-pink:   #E0004F;
  --ct-ink:    #1a1a1a;
  --ct-ink-2:  #3a3a3a;
  --ct-muted:  #6e6e6e;
  --ct-rule:   #ececea;
  --ct-bg:     #faf8f4;
  --ct-f-display: "DM Serif Display", Georgia, serif;
  --ct-f-ui:      "Inter", system-ui, sans-serif;
  --ct-f-mono:    "JetBrains Mono", ui-monospace, monospace;

  font-family: var(--ct-f-ui);
  color: var(--ct-ink);
  background: var(--ct-bg);
  -webkit-font-smoothing: antialiased;
  font-size: 16px;
  min-height: 100vh;
}
.ct-root * { box-sizing: border-box; }

.ct-wrap { max-width: 1320px; margin: 0 auto; padding: 0 64px; }

/* ---- Hero ---- */
.ct-hero {
  position: relative;
  background: var(--ct-lime);
  padding: 72px 0 96px;
  overflow: hidden;
}
.ct-hero-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 32px;
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 32px;
  align-items: end;
}
.ct-hero-inner > div:first-child { grid-column: 1 / span 7; }
.ct-hero-kicker {
  font-family: var(--ct-f-mono);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ct-ink-2);
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}
.ct-hero-dot {
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 999px;
  background: var(--ct-pink);
}
.ct-hero-title {
  font-family: var(--ct-f-display);
  font-weight: 400;
  font-size: clamp(48px, 6vw, 80px);
  line-height: 1.05;
  letter-spacing: -0.015em;
  color: var(--ct-ink);
  margin: 0;
}
.ct-hero-title em {
  color: var(--ct-purple);
  font-style: italic;
  font-weight: 500;
  display: block;
}
.ct-hero-lede {
  font-size: 15px;
  line-height: 1.6;
  color: var(--ct-ink-2);
  margin: 0;
  max-width: 46ch;
}
.ct-hero-curve {
  position: absolute;
  bottom: -1px; left: 0; right: 0;
  width: 100%; height: 80px;
  display: block;
}
.ct-hero-curve path { fill: var(--ct-bg); }

/* ---- Layout ---- */
.ct-layout {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 48px;
  margin: 40px 0 0;
  align-items: start;
}

/* ---- Toolbar ---- */
.ct-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
}
.ct-toolbar-count {
  font-family: var(--ct-f-mono);
  font-size: 13px;
  color: var(--ct-muted);
}
.ct-toolbar-clear {
  background: transparent;
  border: 0;
  font-family: inherit;
  font-size: 13px;
  color: var(--ct-pink);
  cursor: pointer;
  padding: 2px 4px;
}
.ct-toolbar-clear:hover { text-decoration: underline; }

/* ---- Cart items ---- */
.ct-items {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.ct-item {
  position: relative;
  background: #fff;
  border: 1px solid var(--ct-rule);
  border-radius: 22px;
  padding: 20px 24px;
  display: grid;
  grid-template-columns: 100px 1fr auto auto;
  gap: 24px;
  align-items: center;
  transition: border-color 200ms, box-shadow 200ms;
}
.ct-item:hover {
  border-color: #d8d8d6;
  box-shadow: 0 12px 30px -22px rgba(0,0,0,0.18);
}
.ct-item-cover {
  width: 100px;
  aspect-ratio: 3 / 4;
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: #fff;
}
.ct-item-cover.is-lime,
.ct-item-cover.is-cream { color: var(--ct-ink); }
.ct-item-cover-title {
  font-family: var(--ct-f-display);
  font-weight: 400;
  font-size: 13px;
  line-height: 1.1;
  letter-spacing: -0.005em;
}
.ct-item-cover-author {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.88);
}
.ct-item-cover.is-lime .ct-item-cover-author,
.ct-item-cover.is-cream .ct-item-cover-author { color: rgba(26,26,26,0.68); }

.ct-item-meta { min-width: 0; }
.ct-item-title {
  font-family: var(--ct-f-display);
  font-weight: 400;
  font-size: 18px;
  line-height: 1.15;
  color: var(--ct-ink);
  letter-spacing: -0.005em;
  margin: 0;
}
.ct-item-author {
  color: var(--ct-muted);
  font-size: 13px;
  margin-top: 2px;
}
.ct-item-info {
  font-family: var(--ct-f-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--ct-muted);
  margin-top: 6px;
}
.ct-item-info.is-oos { color: var(--ct-pink); }
.ct-item-disc {
  display: inline-block;
  margin-top: 8px;
  font-family: var(--ct-f-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: var(--ct-lime);
  color: var(--ct-ink);
  padding: 4px 10px;
  border-radius: 999px;
}

.ct-qty {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--ct-rule);
  border-radius: 999px;
  background: #fff;
  padding: 2px;
}
.ct-qty button {
  width: 34px; height: 34px;
  border-radius: 999px;
  border: 0;
  background: transparent;
  font-family: inherit;
  font-size: 16px;
  color: var(--ct-ink);
  cursor: pointer;
  transition: background 150ms;
}
.ct-qty button:disabled { color: #c9c9c6; cursor: not-allowed; }
.ct-qty button:hover:not(:disabled) { background: #f2f1ec; }
.ct-qty-n {
  min-width: 40px;
  text-align: center;
  font-family: var(--ct-f-display);
  font-weight: 400;
  font-size: 18px;
  color: var(--ct-ink);
  font-variant-numeric: tabular-nums;
}

.ct-price {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.ct-price-strike {
  display: block;
  font-family: var(--ct-f-display);
  font-size: 15px;
  color: var(--ct-muted);
  text-decoration: line-through;
}
.ct-price-now {
  font-family: var(--ct-f-display);
  font-weight: 400;
  font-size: 20px;
  color: var(--ct-ink);
  letter-spacing: -0.01em;
}
.ct-price-each {
  display: block;
  font-family: var(--ct-f-mono);
  font-size: 11px;
  color: var(--ct-muted);
  margin-top: 2px;
  letter-spacing: 0.04em;
}

.ct-item-remove {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 32px; height: 32px;
  border-radius: 999px;
  border: 0;
  background: transparent;
  color: var(--ct-muted);
  cursor: pointer;
  display: inline-grid;
  place-items: center;
  transition: background 150ms, color 150ms;
}
.ct-item-remove:hover { background: #fde8ef; color: var(--ct-pink); }

/* ---- Empty state ---- */
.ct-empty {
  background: #fff;
  border: 1px solid var(--ct-rule);
  border-radius: 22px;
  padding: 60px 40px;
  text-align: center;
}
.ct-empty h3 {
  font-family: var(--ct-f-display);
  font-weight: 400;
  font-size: 28px;
  letter-spacing: -0.01em;
  margin: 0 0 8px;
  color: var(--ct-ink);
}
.ct-empty h3 em { color: var(--ct-purple); font-style: italic; font-weight: 500; }
.ct-empty p {
  color: var(--ct-muted);
  font-size: 14.5px;
  line-height: 1.55;
  margin: 0 0 20px;
}
.ct-empty-actions {
  display: inline-flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}
.ct-btn-dark, .ct-btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  padding: 12px 20px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: transform 150ms, background 150ms, border-color 150ms;
}
.ct-btn-dark { background: var(--ct-ink); color: #fff; border: 1px solid var(--ct-ink); }
.ct-btn-dark:hover { transform: translateY(-1px); background: #000; }
.ct-btn-outline { background: #fff; color: var(--ct-ink); border: 1px solid var(--ct-rule); }
.ct-btn-outline:hover { border-color: var(--ct-ink); }

/* ---- Paired-with ---- */
.ct-paired { margin-top: 44px; }
.ct-paired-title {
  font-family: var(--ct-f-display);
  font-weight: 400;
  font-size: 22px;
  letter-spacing: -0.005em;
  color: var(--ct-ink);
  margin: 0 0 16px;
}
.ct-paired-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.ct-paired-card {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid var(--ct-rule);
  border-radius: 18px;
  padding: 14px;
  gap: 10px;
  transition: transform 200ms, border-color 200ms;
}
.ct-paired-card:hover { transform: translateY(-2px); border-color: #d8d8d6; }
.ct-paired-cover {
  aspect-ratio: 3 / 4;
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: #fff;
}
.ct-paired-cover.is-lime,
.ct-paired-cover.is-cream { color: var(--ct-ink); }
.ct-paired-cover-title {
  font-family: var(--ct-f-display);
  font-weight: 400;
  font-size: 14px;
  line-height: 1.1;
}
.ct-paired-cover-author {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.ct-paired-meta { font-size: 12px; color: var(--ct-muted); }
.ct-paired-meta b {
  display: block;
  font-family: var(--ct-f-display);
  font-weight: 400;
  font-size: 14px;
  color: var(--ct-ink);
}
.ct-paired-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px dashed var(--ct-rule);
}
.ct-paired-price {
  font-family: var(--ct-f-display);
  font-weight: 400;
  font-size: 15px;
  color: var(--ct-ink);
}
.ct-paired-add {
  width: 28px; height: 28px;
  border-radius: 999px;
  border: 0;
  background: var(--ct-ink);
  color: #fff;
  cursor: pointer;
  font-size: 14px;
}
.ct-paired-card:hover .ct-paired-add { background: var(--ct-pink); }

/* ---- Summary (right col) ---- */
.ct-side {
  position: sticky;
  top: 120px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.ct-summary {
  background: #fff;
  border: 1px solid var(--ct-rule);
  border-radius: 22px;
  padding: 28px 32px;
}
.ct-summary-kicker {
  font-family: var(--ct-f-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ct-purple);
  margin-bottom: 10px;
}
.ct-summary-title {
  font-family: var(--ct-f-display);
  font-weight: 400;
  font-size: 26px;
  line-height: 1.1;
  letter-spacing: -0.01em;
  color: var(--ct-ink);
  margin: 0 0 20px;
}
.ct-summary-title em { color: var(--ct-purple); font-style: italic; font-weight: 500; }

.ct-line {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 10px 0;
  border-top: 1px solid var(--ct-rule);
  font-size: 14px;
}
.ct-line:first-of-type { border-top: 0; }
.ct-line-label {
  font-family: var(--ct-f-mono);
  font-size: 13px;
  color: var(--ct-muted);
}
.ct-line-value {
  font-family: var(--ct-f-display);
  font-weight: 400;
  font-size: 15px;
  color: var(--ct-ink);
  font-variant-numeric: tabular-nums;
}
.ct-line-value.is-discount { color: var(--ct-pink); }
.ct-line-value.is-free { color: #22c55e; font-family: var(--ct-f-mono); font-size: 13px; letter-spacing: 0.04em; }

.ct-line-total {
  padding-top: 16px;
  margin-top: 6px;
  border-top: 1px dashed var(--ct-rule);
  border-bottom: 0;
}
.ct-line-total .ct-line-label {
  font-family: var(--ct-f-mono);
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ct-ink);
}
.ct-line-total .ct-line-value {
  font-family: var(--ct-f-display);
  font-weight: 400;
  font-size: 24px;
  color: var(--ct-ink);
}

/* Promo */
.ct-promo { margin-top: 18px; }
.ct-promo-toggle {
  background: transparent;
  border: 0;
  color: var(--ct-pink);
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  padding: 2px 0;
}
.ct-promo-toggle:hover { text-decoration: underline; }
.ct-promo-form {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.ct-promo-input {
  flex: 1;
  padding: 10px 14px;
  border-radius: 999px;
  border: 1px solid var(--ct-rule);
  background: #fff;
  font-family: inherit;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  outline: none;
}
.ct-promo-input:focus { border-color: var(--ct-ink); }
.ct-promo-apply {
  background: var(--ct-ink);
  color: #fff;
  border: 0;
  border-radius: 999px;
  padding: 10px 16px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.ct-promo-msg {
  margin-top: 8px;
  font-family: var(--ct-f-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.ct-promo-msg.is-err { color: var(--ct-pink); }
.ct-promo-msg.is-ok  { color: #0f9b4a; }
.ct-promo-applied {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  padding: 10px 14px;
  background: #f4fbe8;
  border: 1px solid #d3eaa9;
  border-radius: 12px;
  font-size: 13px;
  color: var(--ct-ink);
}
.ct-promo-applied button {
  background: transparent;
  border: 0;
  color: var(--ct-pink);
  font-size: 13px;
  cursor: pointer;
}

/* Checkout button */
.ct-checkout {
  width: 100%;
  margin-top: 24px;
  background: var(--ct-ink);
  color: #fff;
  border: 0;
  border-radius: 999px;
  padding: 16px 20px;
  font-family: inherit;
  font-size: 15.5px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  transition: background 150ms, transform 150ms, opacity 150ms;
}
.ct-checkout:hover:not(:disabled) { background: #000; transform: translateY(-1px); }
.ct-checkout:disabled { opacity: 0.5; cursor: not-allowed; }
.ct-checkout-arrow {
  width: 22px; height: 22px;
  border-radius: 999px;
  background: var(--ct-lime);
  color: var(--ct-ink);
  display: inline-grid;
  place-items: center;
}

.ct-secure {
  margin-top: 14px;
  text-align: center;
  font-size: 12px;
  color: var(--ct-muted);
}

.ct-trust {
  display: flex;
  justify-content: center;
  gap: 14px;
  margin-top: 16px;
  font-family: var(--ct-f-mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ct-muted);
  flex-wrap: wrap;
}

/* Pickup / gift-wrap / note cards */
.ct-side-card {
  background: #fff;
  border: 1px solid var(--ct-rule);
  border-radius: 22px;
  padding: 22px 26px;
}
.ct-side-card.is-lime { background: var(--ct-lime); border-color: transparent; }
.ct-side-card-title {
  font-family: var(--ct-f-display);
  font-weight: 400;
  font-size: 18px;
  letter-spacing: -0.005em;
  margin: 0 0 6px;
  color: var(--ct-ink);
}
.ct-side-card-title em { color: var(--ct-purple); font-style: italic; font-weight: 500; }
.ct-side-card p {
  color: var(--ct-ink-2);
  font-size: 13.5px;
  line-height: 1.55;
  margin: 0;
}
.ct-pickup-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  font-size: 13px;
  color: var(--ct-ink);
}
.ct-pickup-row input { accent-color: var(--ct-pink); }

/* Gift-wrap switch */
.ct-giftwrap-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}
.ct-gw-label b {
  font-family: var(--ct-f-display);
  font-weight: 400;
  font-size: 16px;
  color: var(--ct-ink);
  display: block;
  margin-bottom: 2px;
}
.ct-gw-label span { font-size: 12px; color: var(--ct-muted); }
.ct-switch {
  position: relative;
  width: 46px;
  height: 26px;
  background: #d8d8d6;
  border-radius: 999px;
  border: 0;
  cursor: pointer;
  padding: 0;
  transition: background 150ms;
  flex-shrink: 0;
}
.ct-switch.is-on { background: var(--ct-pink); }
.ct-switch::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 3px;
  width: 20px; height: 20px;
  border-radius: 999px;
  background: #fff;
  transition: left 180ms ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.15);
}
.ct-switch.is-on::after { left: 23px; }

/* Note card */
.ct-note-label {
  font-family: var(--ct-f-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ct-purple);
  margin-bottom: 10px;
}
.ct-note-input {
  width: 100%;
  background: rgba(0,0,0,0.02);
  border: 1px solid var(--ct-rule);
  border-radius: 10px;
  padding: 10px 12px;
  font-family: inherit;
  font-size: 14px;
  color: var(--ct-ink);
  line-height: 1.5;
  resize: vertical;
  min-height: 72px;
  outline: none;
}
.ct-note-input:focus { border-color: var(--ct-pink); background: #fff; }
.ct-note-count {
  font-family: var(--ct-f-mono);
  font-size: 11px;
  color: var(--ct-muted);
  margin-top: 6px;
  text-align: right;
}

/* ---- Remove toast ---- */
.ct-toast-root {
  position: fixed;
  bottom: 24px;
  left: 0; right: 0;
  display: grid;
  place-items: center;
  z-index: 80;
  pointer-events: none;
}
.ct-toast {
  pointer-events: auto;
  background: var(--ct-ink);
  color: #fff;
  border-radius: 999px;
  padding: 12px 16px;
  display: inline-flex;
  align-items: center;
  gap: 14px;
  font-size: 14px;
  box-shadow: 0 14px 40px -10px rgba(0,0,0,0.4);
}
.ct-toast button {
  background: transparent;
  border: 0;
  color: var(--ct-lime);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: 0.04em;
}
.ct-toast button:hover { text-decoration: underline; }

/* ---- Clear-cart modal ---- */
.ct-modal-root {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  background: rgba(26,26,26,0.45);
  padding: 20px;
}
.ct-modal {
  background: #fff;
  border-radius: 22px;
  padding: 28px 32px;
  max-width: 420px;
  text-align: center;
  box-shadow: 0 30px 60px -30px rgba(0,0,0,0.5);
}
.ct-modal h3 {
  font-family: var(--ct-f-display);
  font-weight: 400;
  font-size: 22px;
  margin: 0 0 8px;
  color: var(--ct-ink);
}
.ct-modal p {
  color: var(--ct-muted);
  font-size: 14px;
  margin: 0 0 20px;
}
.ct-modal-actions {
  display: inline-flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

/* ---- Mobile checkout bar ---- */
.ct-mobile-bar {
  display: none;
  position: fixed;
  left: 0; right: 0;
  bottom: 0;
  padding: 12px 16px 16px;
  background: rgba(250,248,244,0.95);
  backdrop-filter: blur(6px);
  border-top: 1px solid var(--ct-rule);
  box-shadow: 0 -8px 24px -12px rgba(0,0,0,0.15);
  z-index: 70;
}
.ct-mobile-bar button {
  width: 100%;
  background: var(--ct-lime);
  color: var(--ct-ink);
  border: 0;
  border-radius: 999px;
  padding: 14px 20px;
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.ct-mobile-bar-arrow {
  width: 22px; height: 22px;
  border-radius: 999px;
  background: var(--ct-pink);
  color: #fff;
  display: inline-grid;
  place-items: center;
}

/* ---- Checkout stub ---- */
.ct-checkout-stub {
  max-width: 720px;
  margin: 0 auto;
  padding: 72px 20px 120px;
}
.ct-checkout-stub h1 {
  font-family: var(--ct-f-display);
  font-weight: 400;
  font-size: clamp(48px, 6vw, 80px);
  line-height: 1.05;
  letter-spacing: -0.015em;
  margin: 0 0 12px;
}
.ct-checkout-stub h1 em { color: var(--ct-purple); font-style: italic; font-weight: 500; }
.ct-checkout-stub .ct-summary-kicker { margin-bottom: 16px; }
.ct-checkout-stub-box {
  margin-top: 28px;
  background: #fff;
  border: 1px solid var(--ct-rule);
  border-radius: 22px;
  padding: 24px 28px;
}
.ct-checkout-stub-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
  border-top: 1px solid var(--ct-rule);
}
.ct-checkout-stub-row:first-child { border-top: 0; }
.ct-checkout-stub-total {
  display: flex;
  justify-content: space-between;
  padding: 14px 0 0;
  margin-top: 8px;
  border-top: 1px dashed var(--ct-rule);
  font-family: var(--ct-f-display);
  font-weight: 400;
  font-size: 20px;
}
.ct-checkout-stub-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 24px;
  font-family: var(--ct-f-mono);
  font-size: 13px;
  color: var(--ct-ink);
  text-decoration: none;
}
.ct-checkout-stub-back:hover { color: var(--ct-purple); }

/* ---- Cover gradient variants (shared with the rest of the site) ---- */
.ct-root .c-purple { background: linear-gradient(155deg, #8F4FD6 0%, #5a2b9a 100%); }
.ct-root .c-orange { background: linear-gradient(155deg, #FF934A 0%, #c65a1e 100%); }
.ct-root .c-ink    { background: linear-gradient(155deg, #1a1a1a 0%, #3a3a3a 100%); }
.ct-root .c-pink   { background: linear-gradient(155deg, #E0004F 0%, #8a002f 100%); }
.ct-root .c-lime   { background: linear-gradient(155deg, #C9F27F 0%, #8ac13a 100%); }
.ct-root .c-taupe  { background: linear-gradient(155deg, #5b4d3d 0%, #2c241b 100%); }
.ct-root .c-cream  { background: linear-gradient(155deg, #e8dfcb 0%, #bfb29a 100%); }

/* ---- Responsive ---- */
@media (max-width: 1200px) {
  .ct-hero-inner { padding: 0 40px; gap: 40px; }
  .ct-wrap { padding: 0 40px; }
}
@media (max-width: 1023px) {
  .ct-layout { grid-template-columns: 1fr; gap: 32px; }
  .ct-side { position: static; }
  .ct-paired-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 767px) {
  .ct-hero { padding: 56px 0 80px; }
  .ct-hero-inner { grid-template-columns: 1fr; gap: 24px; padding: 0 24px; }
  .ct-wrap { padding: 0 20px; }
  .ct-item {
    grid-template-columns: 80px 1fr;
    grid-template-rows: auto auto;
    padding: 16px 18px 18px;
    gap: 14px;
  }
  .ct-item-cover { width: 80px; padding: 10px 12px; }
  .ct-qty {
    grid-column: 1 / -1;
    justify-self: start;
  }
  .ct-price {
    grid-column: 1 / -1;
    text-align: left;
  }
  .ct-paired-grid { grid-template-columns: 1fr; }
  .ct-summary { padding: 24px 22px; }
  .ct-mobile-bar { display: block; }
  .ct-wrap { padding-bottom: 80px; }
}

@media (max-width: 1023px) {
  .ct-hero-inner { grid-template-columns: 1fr !important; gap: 20px !important; }
  .ct-hero-inner > div:first-child { grid-column: auto !important; }
  .ct-hero-lede { grid-column: auto !important; padding-bottom: 0 !important; max-width: 100% !important; }
}
@media (max-width: 767px) {
  .ct-hero { padding: 48px 0 64px !important; }
  .ct-hero-title { font-size: clamp(36px, 7vw, 44px) !important; line-height: 1.08 !important; }
}
`;

export default CART_CSS;
