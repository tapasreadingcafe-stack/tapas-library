// CSS for the /contact page. Scoped to .contact-root so styles
// don't leak. Design tokens mirror the other pages for visual parity.

const CONTACT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,700;0,9..144,800;1,9..144,500&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

.contact-root {
  --ct-lime:   #caf27e;
  --ct-orange: #FF934A;
  --ct-purple: #8F4FD6;
  --ct-pink:   #E0004F;
  --ct-ink:    #1a1a1a;
  --ct-ink-2:  #3a3a3a;
  --ct-muted:  #6e6e6e;
  --ct-rule:   #ececea;
  --ct-bg:     #faf8f4;
  --ct-f-display: "Fraunces", Georgia, serif;
  --ct-f-ui:      "Inter", system-ui, sans-serif;
  --ct-f-mono:    "JetBrains Mono", ui-monospace, monospace;

  font-family: var(--ct-f-ui);
  color: var(--ct-ink);
  background: var(--ct-bg);
  -webkit-font-smoothing: antialiased;
  font-size: 16px;
  min-height: 100vh;
}
.contact-root * { box-sizing: border-box; }

.contact-wrap {
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 64px;
}

/* ---- Hero ---- */
.contact-hero {
  position: relative;
  background: var(--ct-lime);
  padding: 72px 0 96px;
  overflow: hidden;
}
.contact-hero-inner {
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 64px;
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 64px;
  align-items: end;
}
.contact-hero-kicker {
  font-family: var(--ct-f-mono);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ct-ink-2);
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 22px;
}
.contact-hero-dot {
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 999px;
  background: var(--ct-pink);
}
.contact-hero-title {
  font-family: var(--ct-f-display);
  font-weight: 800;
  font-size: clamp(40px, 5.4vw, 80px);
  line-height: 1.02;
  letter-spacing: -0.02em;
  color: var(--ct-ink);
  margin: 0;
}
.contact-hero-title em {
  color: var(--ct-purple);
  font-style: italic;
  font-weight: 500;
}
.contact-hero-lede {
  font-size: 15px;
  line-height: 1.6;
  color: var(--ct-ink-2);
  margin: 0;
  max-width: 48ch;
}
.contact-hero-curve {
  position: absolute;
  bottom: -1px; left: 0; right: 0;
  width: 100%; height: 80px;
  display: block;
}
.contact-hero-curve path { fill: var(--ct-bg); }

/* ---- Hours strip ---- */
.contact-hours {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0;
  border: 1px solid var(--ct-rule);
  border-radius: 18px;
  overflow: hidden;
  margin: 60px 0;
  background: #fff;
}
.contact-hours-day {
  padding: 18px 14px;
  text-align: center;
  border-left: 1px solid var(--ct-rule);
}
.contact-hours-day:first-child { border-left: 0; }
.contact-hours-day.is-today { background: var(--ct-lime); }
.contact-hours-name {
  font-family: var(--ct-f-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ct-muted);
}
.contact-hours-day.is-today .contact-hours-name { color: var(--ct-ink); }
.contact-hours-value {
  font-family: var(--ct-f-display);
  font-weight: 700;
  font-size: 18px;
  margin-top: 6px;
  color: var(--ct-ink);
  letter-spacing: -0.01em;
}
.contact-hours-value.is-closed { color: var(--ct-pink); }

/* ---- Map ---- */
.contact-map {
  background: var(--ct-lime);
  border-radius: 24px;
  height: 380px;
  position: relative;
  overflow: hidden;
  margin-bottom: 60px;
}
.contact-map::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    repeating-linear-gradient(0deg,  rgba(0,0,0,0.08) 0 1px, transparent 1px 40px),
    repeating-linear-gradient(90deg, rgba(0,0,0,0.08) 0 1px, transparent 1px 40px);
  pointer-events: none;
}
.contact-map-label {
  position: absolute;
  top: 20px; left: 20px;
  font-family: var(--ct-f-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(0,0,0,0.5);
}
.contact-map-roads {
  position: absolute;
  inset: 0;
  pointer-events: none;
  width: 100%;
  height: 100%;
}
.contact-map-pin {
  position: absolute;
  left: 48%; top: 50%;
  transform: translate(-50%, -100%);
}
.contact-map-pin-label {
  background: #fff;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 4px 14px rgba(0,0,0,0.1);
  transform: translateY(-100%);
  margin-bottom: 6px;
  color: var(--ct-ink);
}
.contact-map-pin-label i {
  font-style: normal;
  color: var(--ct-muted);
  font-weight: 400;
  font-size: 11px;
  display: block;
  margin-top: 2px;
}
.contact-map-pin-stalk {
  width: 2px;
  height: 18px;
  background: var(--ct-pink);
  margin: 0 auto;
}
.contact-map-pin-dot {
  width: 20px; height: 20px;
  border-radius: 999px;
  background: var(--ct-pink);
  border: 4px solid #fff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  margin: 0 auto;
}

/* ---- Contact layout ---- */
.contact-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  margin: 0 0 80px;
}

/* Info card */
.contact-info {
  background: #fff;
  border: 1px solid var(--ct-rule);
  border-radius: 22px;
  padding: 36px;
}
.contact-info-kicker {
  font-family: var(--ct-f-mono);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ct-purple);
  margin-bottom: 14px;
}
.contact-info-title {
  font-family: var(--ct-f-display);
  font-weight: 700;
  font-size: 28px;
  line-height: 1.1;
  letter-spacing: -0.01em;
  margin: 0 0 10px;
  color: var(--ct-ink);
}
.contact-info-title em {
  color: var(--ct-purple);
  font-style: italic;
  font-weight: 500;
}
.contact-info-lede {
  color: var(--ct-ink-2);
  font-size: 15px;
  margin: 0 0 20px;
}
.contact-info-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 16px;
  padding: 14px 0;
  border-top: 1px solid var(--ct-rule);
  align-items: baseline;
}
.contact-info-row:first-of-type { border-top: 0; padding-top: 0; }
.contact-info-key {
  font-family: var(--ct-f-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ct-muted);
}
.contact-info-value {
  font-size: 15px;
  color: var(--ct-ink);
  line-height: 1.45;
}
.contact-info-value b {
  display: block;
  font-weight: 600;
}
.contact-info-value a {
  color: var(--ct-ink);
  text-decoration: underline;
  text-decoration-color: rgba(0,0,0,0.25);
  text-underline-offset: 3px;
}
.contact-info-value a:hover { text-decoration-color: var(--ct-purple); }

/* Form card */
.contact-form {
  background: var(--ct-ink);
  color: #fff;
  border-radius: 22px;
  padding: 36px;
}
.contact-form-kicker {
  font-family: var(--ct-f-mono);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ct-lime);
  margin-bottom: 14px;
}
.contact-form-title {
  font-family: var(--ct-f-display);
  font-weight: 700;
  font-size: 28px;
  line-height: 1.1;
  letter-spacing: -0.01em;
  margin: 0 0 8px;
  color: #fff;
}
.contact-form-title em {
  color: var(--ct-lime);
  font-style: italic;
  font-weight: 500;
}
.contact-form-lede {
  color: rgba(255,255,255,0.7);
  font-size: 15px;
  margin: 0 0 24px;
}
.contact-form label {
  display: block;
  font-family: var(--ct-f-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ct-lime);
  margin: 16px 0 6px;
}
.contact-form input,
.contact-form textarea,
.contact-form select {
  width: 100%;
  background: transparent;
  border: 0;
  border-bottom: 1px solid rgba(255,255,255,0.3);
  color: #fff;
  padding: 10px 0;
  font-family: inherit;
  font-size: 15px;
  outline: none;
  border-radius: 0;
}
.contact-form input::placeholder,
.contact-form textarea::placeholder {
  color: rgba(255,255,255,0.4);
}
.contact-form input:focus,
.contact-form textarea:focus,
.contact-form select:focus {
  border-bottom-color: var(--ct-lime);
}
.contact-form textarea {
  resize: vertical;
  min-height: 80px;
}
.contact-form select option { color: var(--ct-ink); }
.contact-form-row2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.contact-form-error {
  font-family: var(--ct-f-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ct-pink);
  margin-top: 16px;
}
.contact-form button {
  margin-top: 28px;
  background: var(--ct-lime);
  color: var(--ct-ink);
  border: 0;
  padding: 14px 24px;
  border-radius: 999px;
  font-weight: 600;
  font-family: inherit;
  font-size: 14.5px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  transition: background 150ms, color 150ms, transform 150ms;
}
.contact-form button:hover:not(:disabled) {
  background: var(--ct-pink);
  color: #fff;
  transform: translateY(-1px);
}
.contact-form button:disabled {
  cursor: default;
  opacity: 0.92;
}
.contact-form button:disabled:hover { transform: none; }
.contact-form-arrow {
  width: 22px; height: 22px;
  border-radius: 999px;
  background: var(--ct-pink);
  color: #fff;
  display: inline-grid;
  place-items: center;
  font-size: 11px;
}
.contact-form button:hover .contact-form-arrow { background: var(--ct-ink); }

/* ---- FAQ ---- */
.contact-faq-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}
.contact-faq-kicker {
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
.contact-faq-dot {
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 999px;
  background: var(--ct-pink);
}
.contact-faq-title {
  font-family: var(--ct-f-display);
  font-weight: 700;
  font-size: clamp(28px, 3.6vw, 44px);
  line-height: 1.06;
  letter-spacing: -0.015em;
  margin: 0;
  color: var(--ct-ink);
}
.contact-faq-title em {
  color: var(--ct-purple);
  font-style: italic;
  font-weight: 500;
}
.contact-faq-lede {
  font-size: 15px;
  line-height: 1.6;
  color: var(--ct-ink-2);
  max-width: 36ch;
  margin: 0;
}
.contact-faq-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin-bottom: 80px;
}
.contact-faq {
  background: #fff;
  border: 1px solid var(--ct-rule);
  border-radius: 18px;
  padding: 22px 26px;
}
.contact-faq summary {
  font-family: var(--ct-f-display);
  font-weight: 700;
  font-size: 18px;
  color: var(--ct-ink);
  cursor: pointer;
  list-style: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  letter-spacing: -0.005em;
}
.contact-faq summary::-webkit-details-marker { display: none; }
.contact-faq summary::after {
  content: "+";
  font-size: 22px;
  color: var(--ct-pink);
  font-weight: 500;
  transition: transform 200ms;
}
.contact-faq[open] summary::after { content: "\u2212"; }
.contact-faq p {
  margin: 12px 0 0;
  color: var(--ct-ink-2);
  font-size: 14.5px;
  line-height: 1.6;
}

/* ---- Responsive ---- */
@media (max-width: 1200px) {
  .contact-hero-inner { padding: 0 40px; gap: 40px; }
  .contact-wrap { padding: 0 40px; }
}
@media (max-width: 1023px) {
  .contact-layout { grid-template-columns: 1fr; }
  .contact-faq-grid { grid-template-columns: 1fr; }
  .contact-hours-day { padding: 14px 6px; }
  .contact-hours-value { font-size: 15px; }
  .contact-hours-name { font-size: 10px; }
  .contact-faq-head { align-items: flex-start; }
}
@media (max-width: 767px) {
  .contact-hero { padding: 56px 0 80px; }
  .contact-hero-inner {
    grid-template-columns: 1fr;
    gap: 24px;
    padding: 0 24px;
  }
  .contact-wrap { padding: 0 20px; }
  .contact-hours {
    grid-template-columns: repeat(7, minmax(88px, 1fr));
    overflow-x: auto;
    scrollbar-width: none;
  }
  .contact-hours::-webkit-scrollbar { display: none; }
  .contact-map { height: 280px; }
  .contact-info, .contact-form { padding: 26px; }
  .contact-form-row2 { grid-template-columns: 1fr; }
  .contact-info-row { grid-template-columns: 96px 1fr; gap: 12px; }
}
`;

export default CONTACT_CSS;
