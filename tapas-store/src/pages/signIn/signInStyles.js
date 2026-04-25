const SIGN_IN_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

.si-root {
  --si-lime:   #caf27e;
  --si-orange: #FF934A;
  --si-purple: #8F4FD6;
  --si-pink:   #E0004F;
  --si-ink:    #1a1a1a;
  --si-ink-2:  #3a3a3a;
  --si-muted:  #6e6e6e;
  --si-rule:   #ececea;
  --si-bg:     #faf8f4;
  --si-f-display: "DM Serif Display", Georgia, serif;
  --si-f-ui:      "Inter", system-ui, sans-serif;
  --si-f-mono:    "JetBrains Mono", ui-monospace, monospace;

  font-family: var(--si-f-ui);
  color: var(--si-ink);
  background: var(--si-bg);
  -webkit-font-smoothing: antialiased;
  font-size: 16px;
}
.si-root * { box-sizing: border-box; }

.si-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 100vh;
}

/* ---- Left form column ---- */
.si-left {
  display: grid;
  place-items: center;
  padding: 48px;
  background: var(--si-bg);
}
.si-form-wrap { width: 100%; max-width: 420px; }

.si-kicker {
  font-family: var(--si-f-mono);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--si-purple);
  margin-bottom: 14px;
}
.si-title {
  font-family: var(--si-f-display);
  font-weight: 400;
  font-size: clamp(40px, 5vw, 56px);
  line-height: 1.02;
  letter-spacing: -0.02em;
  color: var(--si-ink);
  margin: 0 0 16px;
}
.si-title em {
  color: var(--si-purple);
  font-style: italic;
  font-weight: 500;
}
.si-lede {
  color: var(--si-ink-2);
  font-size: 14.5px;
  line-height: 1.6;
  margin: 0 0 28px;
}

.si-form { display: flex; flex-direction: column; gap: 16px; }

.si-field { display: flex; flex-direction: column; gap: 6px; }
.si-field label {
  font-family: var(--si-f-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--si-muted);
}
.si-input {
  background: #fff;
  border: 1px solid var(--si-rule);
  border-radius: 14px;
  padding: 14px 16px;
  font-family: inherit;
  font-size: 15px;
  color: var(--si-ink);
  outline: none;
  transition: border-color 150ms, box-shadow 150ms;
}
.si-input::placeholder { color: var(--si-muted); }
.si-input:focus {
  border-color: var(--si-ink);
  box-shadow: 0 0 0 3px rgba(26,26,26,0.04);
}
.si-input:disabled { opacity: 0.6; }

.si-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 6px;
  flex-wrap: wrap;
}
.si-check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--si-ink-2);
  cursor: pointer;
}
.si-check input { accent-color: var(--si-pink); }
.si-forgot {
  font-size: 13px;
  color: var(--si-pink);
  text-decoration: none;
  font-weight: 500;
}
.si-forgot:hover { text-decoration: underline; }

.si-error {
  font-family: var(--si-f-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--si-pink);
  margin: 4px 0 0;
}

.si-submit {
  margin-top: 20px;
  width: 100%;
  background: var(--si-ink);
  color: #fff;
  border: 0;
  padding: 14px 18px;
  border-radius: 999px;
  font-family: inherit;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  transition: transform 150ms, background 150ms;
}
.si-submit:hover:not(:disabled) {
  background: #000;
  transform: translateY(-1px);
}
.si-submit:disabled { cursor: default; opacity: 0.9; }
.si-submit-arrow {
  width: 22px; height: 22px;
  border-radius: 999px;
  background: var(--si-lime);
  color: var(--si-ink);
  display: inline-grid;
  place-items: center;
  transition: background 150ms, color 150ms;
}
.si-submit:hover:not(:disabled) .si-submit-arrow {
  background: var(--si-pink);
  color: #fff;
}

.si-divider {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 28px 0;
  font-family: var(--si-f-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--si-muted);
}
.si-divider::before,
.si-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--si-rule);
}

.si-oauth {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.si-oauth button {
  background: #fff;
  border: 1px solid var(--si-rule);
  border-radius: 999px;
  padding: 12px 0;
  font-family: inherit;
  font-size: 14px;
  color: var(--si-ink);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: border-color 150ms, background 150ms;
}
.si-oauth button:hover {
  border-color: var(--si-ink);
  background: #fafaf5;
}

.si-foot {
  margin-top: 28px;
  font-size: 13px;
  color: var(--si-muted);
  text-align: center;
}
.si-foot a {
  color: var(--si-pink);
  text-decoration: none;
  font-weight: 500;
  margin-left: 4px;
}
.si-foot a:hover { text-decoration: underline; }

/* ---- Right lime panel ---- */
.si-right {
  position: relative;
  overflow: hidden;
  background: var(--si-lime);
  min-height: 100vh;
  padding: 48px;
}
.si-shape {
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
}
.si-shape-pink {
  width: 420px; height: 420px;
  background: var(--si-pink);
  right: -160px;
  top: -140px;
}
.si-shape-orange {
  width: 280px; height: 280px;
  background: var(--si-orange);
  left: -120px;
  bottom: -120px;
}

/* Member card positioning (shared MemberCard component supplies the
   card's own styling; we just place it inside the lime panel). */
.si-memcard {
  position: relative;
  margin: 40px auto 0;
  width: min(460px, 100%);
  z-index: 2;
}
/* Legacy .si-card selectors — kept so the style block parses the
   same whether or not the shared MemberCard is in use yet. */
.si-card {
  position: relative;
  margin: 40px auto 0;
  width: min(460px, 100%);
  background: var(--si-ink);
  color: #fff;
  border-radius: 20px;
  padding: 26px 28px;
  box-shadow: 0 30px 60px -28px rgba(0,0,0,0.45);
  z-index: 2;
}
.si-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--si-f-mono);
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.72);
}
.si-card-title {
  font-family: var(--si-f-display);
  font-weight: 400;
  font-size: 24px;
  line-height: 1.2;
  letter-spacing: -0.01em;
  margin: 14px 0 12px;
  color: #fff;
}
.si-card-title em {
  color: var(--si-lime);
  font-style: italic;
  font-weight: 500;
}
.si-card-list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-family: var(--si-f-ui);
  font-size: 13px;
  color: rgba(255,255,255,0.92);
}
.si-card-list li {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 5px 0;
  line-height: 1.5;
}
.si-card-bullet {
  width: 6px; height: 6px;
  border-radius: 999px;
  background: var(--si-pink);
  flex-shrink: 0;
  transform: translateY(-2px);
}
.si-card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 18px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.15);
  font-family: var(--si-f-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  color: rgba(255,255,255,0.7);
}
.si-card-foot-plus {
  width: 26px; height: 26px;
  border-radius: 999px;
  background: rgba(255,255,255,0.1);
  color: #fff;
  display: inline-grid;
  place-items: center;
  font-size: 14px;
}

/* Testimonial */
.si-testimonial {
  position: absolute;
  bottom: 40px;
  right: 40px;
  max-width: 320px;
  background: #fff;
  border-radius: 20px;
  padding: 22px 24px;
  box-shadow: 0 24px 40px -24px rgba(0,0,0,0.35);
  z-index: 3;
}
.si-testimonial-quote {
  font-family: var(--si-f-display);
  font-style: italic;
  font-size: 15px;
  line-height: 1.45;
  color: var(--si-ink);
  margin: 0;
}
.si-testimonial-author {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
}
.si-avatar {
  width: 32px; height: 32px;
  border-radius: 999px;
  background: var(--si-orange);
  color: var(--si-ink);
  display: inline-grid;
  place-items: center;
  font-family: var(--si-f-display);
  font-weight: 400;
  font-size: 14px;
  flex-shrink: 0;
}
.si-testimonial-name {
  font-family: var(--si-f-display);
  font-weight: 400;
  font-size: 14px;
  color: var(--si-ink);
}
.si-testimonial-meta {
  font-family: var(--si-f-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--si-muted);
  margin-top: 2px;
}

/* ---- Stub pages (forgot / sign up) ---- */
.si-stub {
  min-height: 70vh;
  display: grid;
  place-items: center;
  padding: 48px 20px;
  text-align: center;
}
.si-stub-inner { max-width: 480px; }
.si-stub h1 {
  font-family: var(--si-f-display);
  font-weight: 400;
  font-size: clamp(32px, 4vw, 48px);
  line-height: 1.05;
  letter-spacing: -0.02em;
  color: var(--si-ink);
  margin: 0 0 14px;
}
.si-stub h1 em {
  color: var(--si-purple);
  font-style: italic;
  font-weight: 500;
}
.si-stub p {
  font-size: 15px;
  line-height: 1.6;
  color: var(--si-ink-2);
  margin: 0 0 24px;
}
.si-stub-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--si-ink);
  text-decoration: none;
  font-family: var(--si-f-mono);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.04em;
}
.si-stub-back:hover { color: var(--si-purple); }

/* ---- Responsive ---- */
@media (max-width: 1023px) {
  .si-testimonial {
    position: static;
    margin: 40px auto 0;
    max-width: min(460px, 100%);
  }
  .si-right { display: flex; flex-direction: column; align-items: center; }
  .si-card { margin: 60px auto 0; }
}
@media (max-width: 767px) {
  .si-split { grid-template-columns: 1fr; min-height: auto; }
  .si-right { display: none; }
  .si-left { padding: 40px 24px; min-height: 80vh; }
}
`;

export default SIGN_IN_CSS;
