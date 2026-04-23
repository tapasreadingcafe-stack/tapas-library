const ABOUT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,700;0,9..144,800;1,9..144,500&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

.ab-root {
  --ab-lime:   #caf27e;
  --ab-orange: #FF934A;
  --ab-purple: #8F4FD6;
  --ab-pink:   #E0004F;
  --ab-ink:    #1a1a1a;
  --ab-ink-2:  #3a3a3a;
  --ab-muted:  #6e6e6e;
  --ab-rule:   #ececea;
  --ab-bg:     #faf8f4;
  --ab-f-display: "Fraunces", Georgia, serif;
  --ab-f-ui:      "Inter", system-ui, sans-serif;
  --ab-f-mono:    "JetBrains Mono", ui-monospace, monospace;

  font-family: var(--ab-f-ui);
  color: var(--ab-ink);
  background: var(--ab-bg);
  -webkit-font-smoothing: antialiased;
  font-size: 16px;
  min-height: 100vh;
}
.ab-root * { box-sizing: border-box; }

.ab-wrap {
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 64px;
}

/* ---- Hero ---- */
.ab-hero {
  position: relative;
  background: var(--ab-lime);
  padding: 72px 0 96px;
  overflow: hidden;
}
.ab-hero-inner {
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 64px;
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 64px;
  align-items: end;
}
.ab-hero-kicker {
  font-family: var(--ab-f-mono);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ab-ink-2);
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 22px;
}
.ab-hero-dot {
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 999px;
  background: var(--ab-pink);
}
.ab-hero-title {
  font-family: var(--ab-f-display);
  font-weight: 800;
  font-size: clamp(40px, 5.8vw, 88px);
  line-height: 1.02;
  letter-spacing: -0.02em;
  color: var(--ab-ink);
  margin: 0;
}
.ab-hero-title em {
  color: var(--ab-purple);
  font-style: italic;
  font-weight: 500;
  display: block;
}
.ab-hero-lede {
  font-size: 15px;
  line-height: 1.6;
  color: var(--ab-ink-2);
  margin: 0;
  max-width: 44ch;
}
.ab-hero-curve {
  position: absolute;
  bottom: -1px; left: 0; right: 0;
  width: 100%; height: 80px;
  display: block;
}
.ab-hero-curve path { fill: var(--ab-bg); }

/* ---- Manifesto ---- */
.ab-manifesto {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 60px;
  margin: 60px 0 80px;
}
.ab-section-kicker {
  font-family: var(--ab-f-mono);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ab-purple);
  margin-bottom: 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.ab-section-kicker-dot {
  width: 6px; height: 6px;
  border-radius: 999px;
  background: var(--ab-pink);
}
.ab-section-title {
  font-family: var(--ab-f-display);
  font-weight: 700;
  font-size: clamp(32px, 5vw, 72px);
  line-height: 1.02;
  letter-spacing: -0.02em;
  color: var(--ab-ink);
  margin: 0;
}
.ab-section-title em {
  color: var(--ab-purple);
  font-style: italic;
  font-weight: 500;
}
.ab-manifesto-body {
  display: flex;
  flex-direction: column;
  gap: 22px;
}
.ab-paragraph {
  font-size: 16px;
  line-height: 1.65;
  color: var(--ab-ink-2);
  margin: 0;
}
.ab-paragraph::first-letter {
  font-family: var(--ab-f-display);
  font-weight: 700;
  float: left;
  font-size: 72px;
  line-height: 0.9;
  padding: 4px 14px 0 0;
  color: var(--ab-pink);
  letter-spacing: -0.02em;
}

/* ---- Stats strip ---- */
.ab-stats {
  background: var(--ab-lime);
  border-radius: 28px;
  padding: 48px 56px;
  margin-bottom: 80px;
}
.ab-stats-title {
  font-family: var(--ab-f-display);
  font-weight: 700;
  font-size: clamp(28px, 3.6vw, 44px);
  line-height: 1.05;
  letter-spacing: -0.015em;
  color: var(--ab-ink);
  margin: 0 0 28px;
}
.ab-stats-title em {
  color: var(--ab-purple);
  font-style: italic;
  font-weight: 500;
}
.ab-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border: 1px solid rgba(26,26,26,0.2);
  border-radius: 18px;
  overflow: hidden;
  background: rgba(255,255,255,0.15);
}
.ab-stat {
  padding: 28px 32px;
  border-left: 1px solid rgba(26,26,26,0.2);
}
.ab-stat:first-child { border-left: 0; }
.ab-stat-value {
  font-family: var(--ab-f-display);
  font-weight: 700;
  font-size: 52px;
  line-height: 0.95;
  letter-spacing: -0.02em;
  color: var(--ab-ink);
}
.ab-stat-label {
  font-family: var(--ab-f-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ab-ink-2);
  margin-top: 14px;
}

/* ---- Brief history (dark card) ---- */
.ab-history {
  background: var(--ab-ink);
  color: #fff;
  border-radius: 28px;
  padding: 56px;
  margin-bottom: 80px;
}
.ab-history-kicker {
  font-family: var(--ab-f-mono);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ab-lime);
  margin-bottom: 14px;
}
.ab-history-title {
  font-family: var(--ab-f-display);
  font-weight: 700;
  font-size: clamp(28px, 3.6vw, 44px);
  line-height: 1.05;
  letter-spacing: -0.015em;
  color: #fff;
  margin: 0 0 14px;
}
.ab-history-title em {
  color: var(--ab-lime);
  font-style: italic;
  font-weight: 500;
}
.ab-history-lede {
  color: rgba(255,255,255,0.72);
  font-size: 15px;
  line-height: 1.6;
  margin: 0 0 32px;
  max-width: 70ch;
}
.ab-history-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 18px;
  overflow: hidden;
  background: rgba(255,255,255,0.02);
}
.ab-history-cell {
  padding: 28px 32px;
  border-left: 1px solid rgba(255,255,255,0.15);
}
.ab-history-cell:first-child { border-left: 0; }
.ab-history-year {
  font-family: var(--ab-f-display);
  font-weight: 700;
  font-size: 44px;
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--ab-lime);
  margin-bottom: 12px;
}
.ab-history-heading {
  font-family: var(--ab-f-display);
  font-weight: 700;
  font-size: 17px;
  color: #fff;
  margin: 0 0 8px;
  letter-spacing: -0.005em;
}
.ab-history-body {
  color: rgba(255,255,255,0.72);
  font-size: 14px;
  line-height: 1.55;
  margin: 0;
}

/* ---- Compromises ---- */
.ab-head-row {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 48px;
  align-items: end;
  margin-bottom: 28px;
}
.ab-head-title {
  font-family: var(--ab-f-display);
  font-weight: 700;
  font-size: clamp(28px, 3.6vw, 44px);
  line-height: 1.06;
  letter-spacing: -0.015em;
  color: var(--ab-ink);
  margin: 0;
}
.ab-head-title em {
  color: var(--ab-purple);
  font-style: italic;
  font-weight: 500;
}
.ab-head-lede {
  font-size: 15px;
  line-height: 1.6;
  color: var(--ab-ink-2);
  max-width: 40ch;
  margin: 0;
}

.ab-compromises {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 80px;
}
.ab-compromise {
  border-radius: 22px;
  padding: 26px 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 260px;
}
.ab-compromise.is-lime {
  background: var(--ab-lime);
  color: var(--ab-ink);
}
.ab-compromise.is-white {
  background: #fff;
  border: 1px solid var(--ab-rule);
  color: var(--ab-ink);
}
.ab-compromise.is-orange {
  background: var(--ab-orange);
  color: #fff;
}
.ab-compromise-n {
  font-family: var(--ab-f-display);
  font-weight: 700;
  font-size: 52px;
  line-height: 0.9;
  letter-spacing: -0.02em;
}
.ab-compromise.is-lime   .ab-compromise-n { color: var(--ab-ink); }
.ab-compromise.is-white  .ab-compromise-n { color: var(--ab-pink); }
.ab-compromise.is-orange .ab-compromise-n { color: #fff; }
.ab-compromise-title {
  font-family: var(--ab-f-display);
  font-weight: 700;
  font-size: 20px;
  line-height: 1.2;
  letter-spacing: -0.01em;
  margin: 0;
}
.ab-compromise.is-orange .ab-compromise-title { color: #fff; }
.ab-compromise-title em { font-style: italic; font-weight: 500; }
.ab-compromise-title em.is-purple { color: var(--ab-purple); }
.ab-compromise-title em.is-lime   { color: var(--ab-lime); }
.ab-compromise-body {
  font-size: 14.5px;
  line-height: 1.55;
  margin: 0;
}
.ab-compromise.is-lime   .ab-compromise-body { color: var(--ab-ink-2); }
.ab-compromise.is-white  .ab-compromise-body { color: var(--ab-ink-2); }
.ab-compromise.is-orange .ab-compromise-body { color: rgba(255,255,255,0.85); }

/* ---- Team ---- */
.ab-team {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 80px;
}
.ab-member {
  background: #fff;
  border: 1px solid var(--ab-rule);
  border-radius: 22px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 320px;
}
.ab-member-avatar {
  aspect-ratio: 1 / 1;
  display: grid;
  place-items: center;
  font-family: var(--ab-f-display);
  font-weight: 700;
  font-size: 96px;
  letter-spacing: -0.02em;
  color: rgba(0,0,0,0.15);
}
.ab-member-body {
  padding: 20px 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ab-member-name {
  font-family: var(--ab-f-display);
  font-weight: 700;
  font-size: 18px;
  color: var(--ab-ink);
  letter-spacing: -0.005em;
  margin: 0;
}
.ab-member-role {
  font-family: var(--ab-f-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ab-muted);
  margin: 0;
}
.ab-member-reading {
  font-family: var(--ab-f-display);
  font-style: italic;
  font-size: 13px;
  color: var(--ab-muted);
  border-top: 1px dashed var(--ab-rule);
  margin-top: 14px;
  padding-top: 12px;
}
.ab-member-reading b {
  font-family: var(--ab-f-mono);
  font-style: normal;
  font-weight: 500;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ab-ink-2);
  display: block;
  margin-bottom: 4px;
}

/* ---- Press ---- */
.ab-press {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 80px;
}
.ab-press-card {
  background: #fff;
  border: 1px solid var(--ab-rule);
  border-radius: 22px;
  padding: 24px 26px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ab-press-source {
  font-family: var(--ab-f-display);
  font-style: italic;
  font-weight: 500;
  font-size: 14px;
  color: var(--ab-purple);
  letter-spacing: -0.005em;
}
.ab-press-body {
  font-size: 14.5px;
  line-height: 1.55;
  color: var(--ab-ink);
  margin: 0;
  font-family: var(--ab-f-ui);
  flex: 1;
}
.ab-press-body::before { content: '\\201C'; }
.ab-press-body::after  { content: '\\201D'; }
.ab-press-foot {
  font-family: var(--ab-f-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ab-muted);
  border-top: 1px dashed var(--ab-rule);
  margin-top: 4px;
  padding-top: 12px;
}

/* ---- Responsive ---- */
@media (max-width: 1200px) {
  .ab-hero-inner { padding: 0 40px; gap: 40px; }
  .ab-wrap { padding: 0 40px; }
  .ab-stats, .ab-history { padding: 40px; }
}
@media (max-width: 1023px) {
  .ab-manifesto { grid-template-columns: 1fr; gap: 36px; }
  .ab-stats-grid { grid-template-columns: repeat(2, 1fr); }
  .ab-stat:nth-child(3) { border-left: 0; }
  .ab-stat:nth-child(3), .ab-stat:nth-child(4) {
    border-top: 1px solid rgba(26,26,26,0.2);
  }
  .ab-history-grid { grid-template-columns: repeat(2, 1fr); }
  .ab-history-cell:nth-child(3) { border-left: 0; }
  .ab-history-cell:nth-child(3), .ab-history-cell:nth-child(4) {
    border-top: 1px solid rgba(255,255,255,0.15);
  }
  .ab-compromises { grid-template-columns: 1fr; }
  .ab-team, .ab-press { grid-template-columns: repeat(2, 1fr); }
  .ab-head-row { grid-template-columns: 1fr; gap: 20px; }
}
@media (max-width: 767px) {
  .ab-hero { padding: 56px 0 80px; }
  .ab-hero-inner {
    grid-template-columns: 1fr;
    gap: 24px;
    padding: 0 24px;
  }
  .ab-wrap { padding: 0 20px; }
  .ab-manifesto { margin: 40px 0 60px; }
  .ab-paragraph::first-letter { font-size: 56px; padding-right: 10px; }
  .ab-stats, .ab-history { padding: 28px 24px; border-radius: 22px; }
  .ab-stats-grid { grid-template-columns: 1fr; }
  .ab-stat { border-left: 0; border-top: 1px solid rgba(26,26,26,0.2); }
  .ab-stat:first-child { border-top: 0; }
  .ab-history-grid { grid-template-columns: 1fr; }
  .ab-history-cell { border-left: 0; border-top: 1px solid rgba(255,255,255,0.15); }
  .ab-history-cell:first-child { border-top: 0; }
  .ab-team, .ab-press { grid-template-columns: 1fr; }
}
`;

export default ABOUT_CSS;
