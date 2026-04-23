const EVENTS_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,700;0,9..144,800;1,9..144,500&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

.ev-root {
  --ev-lime:   #caf27e;
  --ev-orange: #FF934A;
  --ev-purple: #8F4FD6;
  --ev-pink:   #E0004F;
  --ev-ink:    #1a1a1a;
  --ev-ink-2:  #3a3a3a;
  --ev-muted:  #6e6e6e;
  --ev-rule:   #ececea;
  --ev-bg:     #faf8f4;
  --ev-card:   #ffffff;

  --chip-lavender:  #E8D9FF;
  --chip-sage:      #D9F2BC;
  --chip-pink:      #FFD6E0;
  --chip-peach:     #FFE4CC;
  --chip-softPink:  #FCCEE0;

  --ev-f-display: "Fraunces", Georgia, serif;
  --ev-f-ui:      "Inter", system-ui, sans-serif;
  --ev-f-mono:    "JetBrains Mono", ui-monospace, monospace;

  font-family: var(--ev-f-ui);
  color: var(--ev-ink);
  background: var(--ev-bg);
  -webkit-font-smoothing: antialiased;
  font-size: 16px;
  min-height: 100vh;
}
.ev-root * { box-sizing: border-box; }

.ev-wrap {
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 64px;
}

/* ---- Hero ---- */
.ev-hero {
  position: relative;
  background: var(--ev-lime);
  padding: 72px 0 96px;
  overflow: hidden;
}
.ev-hero-inner {
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 64px;
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 64px;
  align-items: end;
}
.ev-hero-kicker {
  font-family: var(--ev-f-mono);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ev-ink-2);
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 22px;
}
.ev-hero-dot {
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 999px;
  background: var(--ev-pink);
}
.ev-hero-title {
  font-family: var(--ev-f-display);
  font-weight: 800;
  font-size: clamp(40px, 6vw, 96px);
  line-height: 1.02;
  letter-spacing: -0.02em;
  color: var(--ev-ink);
  margin: 0;
}
.ev-hero-title em {
  color: var(--ev-purple);
  font-style: italic;
  font-weight: 500;
  display: block;
}
.ev-hero-lede {
  font-size: 15px;
  line-height: 1.6;
  color: var(--ev-ink-2);
  margin: 0;
  max-width: 44ch;
}
.ev-hero-curve {
  position: absolute;
  bottom: -1px; left: 0; right: 0;
  width: 100%; height: 80px;
  display: block;
}
.ev-hero-curve path { fill: var(--ev-bg); }

/* ---- Filter + toggle row ---- */
.ev-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin: 40px 0 24px;
  flex-wrap: wrap;
}
.ev-pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.ev-pill {
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid var(--ev-rule);
  color: var(--ev-ink-2);
  cursor: pointer;
  transition: background 150ms, color 150ms, border-color 150ms;
  white-space: nowrap;
}
.ev-pill:hover { border-color: var(--ev-ink); }
.ev-pill.is-on {
  background: var(--ev-ink);
  color: #fff;
  border-color: var(--ev-ink);
}

.ev-toggle {
  display: inline-flex;
  background: var(--ev-lime);
  border-radius: 999px;
  padding: 4px;
  gap: 4px;
}
.ev-toggle button {
  border: 0;
  background: transparent;
  padding: 8px 18px;
  border-radius: 999px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: var(--ev-ink);
  cursor: pointer;
  transition: background 150ms, color 150ms;
}
.ev-toggle button.is-on {
  background: #fff;
}

/* ---- Calendar ---- */
.ev-cal {
  background: #fff;
  border: 1px solid var(--ev-rule);
  border-radius: 22px;
  padding: 20px 20px 24px;
  margin-bottom: 60px;
  overflow: hidden;
}
.ev-cal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 6px 16px;
}
.ev-cal-title {
  font-family: var(--ev-f-display);
  font-weight: 700;
  font-size: 20px;
  color: var(--ev-ink);
  letter-spacing: -0.01em;
}
.ev-cal-nav {
  display: inline-flex;
  gap: 8px;
}
.ev-cal-nav button {
  width: 34px; height: 34px;
  border-radius: 999px;
  border: 1px solid var(--ev-rule);
  background: #fff;
  font-family: var(--ev-f-mono);
  font-size: 14px;
  color: var(--ev-ink);
  cursor: pointer;
  transition: background 150ms, border-color 150ms;
}
.ev-cal-nav button:hover { border-color: var(--ev-ink); }
.ev-cal-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}
.ev-cal-head-row {
  border-bottom: 1px solid var(--ev-rule);
}
.ev-cal-weekday {
  font-family: var(--ev-f-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ev-muted);
  padding: 8px 10px;
  text-align: left;
}
.ev-cal-cell {
  min-height: 110px;
  border-top: 1px solid var(--ev-rule);
  border-right: 1px solid var(--ev-rule);
  padding: 8px 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: default;
}
.ev-cal-cell:nth-child(7n) { border-right: 0; }
.ev-cal-cell.is-out { background: #fafaf7; }
.ev-cal-cell.is-out .ev-cal-num { color: #c9c9c6; }
.ev-cal-cell.has-events { cursor: pointer; }
.ev-cal-cell.has-events:hover { background: #fdfcf6; }
.ev-cal-num {
  font-family: var(--ev-f-display);
  font-weight: 700;
  font-size: 16px;
  color: var(--ev-ink);
  letter-spacing: -0.01em;
  align-self: flex-start;
  width: 28px; height: 28px;
  display: inline-grid;
  place-items: center;
  border-radius: 999px;
}
.ev-cal-cell.is-today .ev-cal-num {
  background: var(--ev-pink);
  color: #fff;
}
.ev-cal-chip {
  display: block;
  padding: 3px 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 500;
  color: var(--ev-ink);
  text-align: left;
  border: 0;
  cursor: pointer;
  line-height: 1.2;
  font-family: inherit;
  transition: filter 150ms;
}
.ev-cal-chip:hover { filter: brightness(0.96); }
.ev-cal-chip-more {
  font-family: var(--ev-f-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  color: var(--ev-muted);
  padding: 2px 4px;
  text-align: left;
}

/* ---- Section heads ---- */
.ev-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.ev-head-kicker {
  font-family: var(--ev-f-mono);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ev-purple);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.ev-head-dot {
  width: 6px; height: 6px;
  border-radius: 999px;
  background: var(--ev-pink);
}
.ev-head-title {
  font-family: var(--ev-f-display);
  font-weight: 700;
  font-size: clamp(28px, 3.6vw, 44px);
  line-height: 1.06;
  letter-spacing: -0.015em;
  margin: 0;
  color: var(--ev-ink);
}
.ev-head-title em {
  color: var(--ev-purple);
  font-style: italic;
  font-weight: 500;
}
.ev-head-lede {
  font-size: 15px;
  line-height: 1.6;
  color: var(--ev-ink-2);
  max-width: 40ch;
  margin: 0;
}

/* ---- Upcoming event cards ---- */
.ev-list {
  display: grid;
  gap: 18px;
  margin-bottom: 72px;
  scroll-margin-top: 96px;
}
.ev-card {
  background: #fff;
  border: 1px solid var(--ev-rule);
  border-radius: 22px;
  padding: 28px 32px;
  display: grid;
  grid-template-columns: 120px 1fr auto auto;
  gap: 32px;
  align-items: center;
  scroll-margin-top: 96px;
  transition: border-color 200ms, box-shadow 200ms;
}
.ev-card.is-focus {
  border-color: var(--ev-ink);
  box-shadow: 0 16px 40px -24px rgba(26,26,26,0.4);
}
.ev-card-date {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ev-card-date-month {
  font-family: var(--ev-f-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ev-purple);
}
.ev-card-date-day {
  font-family: var(--ev-f-display);
  font-weight: 700;
  font-size: 54px;
  line-height: 0.95;
  letter-spacing: -0.02em;
  color: var(--ev-ink);
}
.ev-card-cta {
  margin-top: 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--ev-ink);
  color: #fff;
  border: 0;
  padding: 10px 18px;
  border-radius: 999px;
  font-family: var(--ev-f-mono);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  align-self: flex-start;
  transition: background 150ms, transform 150ms;
}
.ev-card-cta:hover {
  background: var(--ev-pink);
  transform: translateY(-1px);
}
.ev-card-title {
  font-family: var(--ev-f-display);
  font-weight: 700;
  font-size: 26px;
  line-height: 1.15;
  letter-spacing: -0.01em;
  margin: 0 0 6px;
  color: var(--ev-ink);
}
.ev-card-title em {
  color: var(--ev-purple);
  font-style: italic;
  font-weight: 500;
}
.ev-card-body {
  color: var(--ev-ink-2);
  font-size: 14.5px;
  line-height: 1.55;
  margin: 0;
  max-width: 54ch;
}
.ev-card-time {
  font-family: var(--ev-f-mono);
  font-size: 13px;
  text-align: right;
  color: var(--ev-ink-2);
  line-height: 1.4;
  min-width: 150px;
}
.ev-card-time-top { color: var(--ev-ink); font-weight: 500; }
.ev-card-time-bottom { color: var(--ev-muted); margin-top: 4px; }
.ev-badge {
  font-family: var(--ev-f-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 6px 12px;
  border-radius: 999px;
  white-space: nowrap;
}

/* ---- Clubs grid ---- */
.ev-clubs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
  margin-bottom: 60px;
}
.ev-club {
  background: #fff;
  border: 1px solid var(--ev-rule);
  border-radius: 22px;
  padding: 26px 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.ev-club-head {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--ev-f-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ev-muted);
}
.ev-club-dot {
  width: 8px; height: 8px;
  border-radius: 999px;
  background: var(--ev-pink);
}
.ev-club-title {
  font-family: var(--ev-f-display);
  font-weight: 700;
  font-size: 24px;
  line-height: 1.15;
  letter-spacing: -0.01em;
  color: var(--ev-ink);
  margin: 0;
}
.ev-club-title em {
  color: var(--ev-purple);
  font-style: italic;
  font-weight: 500;
}
.ev-club-body {
  font-size: 14.5px;
  line-height: 1.55;
  color: var(--ev-ink-2);
  margin: 0;
}
.ev-club-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: auto;
  padding-top: 14px;
  border-top: 1px dashed var(--ev-rule);
  font-family: var(--ev-f-mono);
  font-size: 12px;
  color: var(--ev-muted);
}
.ev-club-seats {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  color: var(--ev-ink);
}
.ev-club-seats-n {
  font-family: var(--ev-f-display);
  font-weight: 700;
  font-size: 20px;
  color: var(--ev-ink);
  letter-spacing: -0.01em;
}
.ev-club-status {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--ev-bg);
  color: var(--ev-ink-2);
  white-space: nowrap;
}

/* ---- Featured supper ---- */
.ev-supper {
  background: var(--ev-ink);
  color: #fff;
  border-radius: 28px;
  padding: 56px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: center;
  margin: 60px 0;
}
.ev-supper-kicker {
  font-family: var(--ev-f-mono);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ev-lime);
  margin-bottom: 14px;
}
.ev-supper-title {
  font-family: var(--ev-f-display);
  font-weight: 700;
  font-size: clamp(32px, 3.8vw, 52px);
  line-height: 1.05;
  letter-spacing: -0.02em;
  margin: 0 0 20px;
  color: #fff;
}
.ev-supper-title em {
  color: var(--ev-lime);
  font-style: italic;
  font-weight: 500;
}
.ev-supper-body {
  color: rgba(255,255,255,0.72);
  font-size: 15px;
  line-height: 1.6;
  margin: 0 0 28px;
  max-width: 46ch;
}
.ev-supper-cta {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background: var(--ev-lime);
  color: var(--ev-ink);
  border: 0;
  padding: 14px 22px 14px 26px;
  border-radius: 999px;
  font-family: inherit;
  font-weight: 600;
  font-size: 14.5px;
  cursor: pointer;
  transition: transform 150ms, background 150ms;
}
.ev-supper-cta:hover { background: #b4e46e; transform: translateY(-1px); }
.ev-supper-cta-arrow {
  width: 30px; height: 30px;
  border-radius: 999px;
  background: var(--ev-pink);
  color: #fff;
  display: inline-grid;
  place-items: center;
}

/* Menu card */
.ev-menu {
  background: var(--ev-lime);
  border-radius: 22px;
  padding: 36px;
  color: var(--ev-ink);
}
.ev-menu-kicker {
  font-family: var(--ev-f-mono);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ev-purple);
  margin-bottom: 10px;
}
.ev-menu-title {
  font-family: var(--ev-f-display);
  font-weight: 700;
  font-size: 22px;
  line-height: 1.2;
  margin: 0 0 16px;
  color: var(--ev-ink);
}
.ev-menu-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.ev-menu-row {
  display: grid;
  grid-template-columns: 44px 1fr auto;
  gap: 12px;
  align-items: baseline;
  padding: 12px 0;
  border-top: 1px dashed rgba(26,26,26,0.25);
}
.ev-menu-row:first-child { border-top: 0; padding-top: 0; }
.ev-menu-n {
  font-family: var(--ev-f-display);
  font-weight: 700;
  font-size: 22px;
  color: var(--ev-purple);
  letter-spacing: -0.01em;
}
.ev-menu-dish {
  font-size: 15px;
  font-weight: 500;
  color: var(--ev-ink);
  line-height: 1.3;
}
.ev-menu-dish i {
  font-style: italic;
  font-weight: 400;
  color: var(--ev-ink-2);
  font-size: 13px;
  display: block;
  margin-top: 2px;
}
.ev-menu-bullet {
  color: var(--ev-purple);
  font-size: 14px;
}

/* ---- Empty states ---- */
.ev-empty {
  background: #fff;
  border: 1px solid var(--ev-rule);
  border-radius: 20px;
  padding: 56px 24px;
  text-align: center;
  color: var(--ev-muted);
  margin-bottom: 40px;
}
.ev-empty h3 {
  font-family: var(--ev-f-display);
  font-weight: 700;
  font-size: 22px;
  color: var(--ev-ink);
  margin: 0 0 8px;
}

/* ---- Responsive ---- */
@media (max-width: 1200px) {
  .ev-hero-inner { padding: 0 40px; gap: 40px; }
  .ev-wrap { padding: 0 40px; }
}
@media (max-width: 1023px) {
  .ev-clubs { grid-template-columns: repeat(2, 1fr); }
  .ev-supper { grid-template-columns: 1fr; padding: 40px; }
  .ev-card {
    grid-template-columns: 96px 1fr;
    grid-template-rows: auto auto auto;
    gap: 16px 24px;
  }
  .ev-card-time {
    grid-column: 1 / -1;
    text-align: left;
    min-width: 0;
  }
  .ev-badge {
    grid-column: 1 / -1;
    justify-self: start;
  }
  .ev-cal-cell { min-height: 88px; }
  .ev-cal-chip { font-size: 10px; padding: 2px 6px; }
}
@media (max-width: 767px) {
  .ev-hero { padding: 56px 0 80px; }
  .ev-hero-inner {
    grid-template-columns: 1fr;
    gap: 24px;
    padding: 0 24px;
  }
  .ev-wrap { padding: 0 20px; }
  .ev-controls { flex-direction: column; align-items: stretch; }
  .ev-pills {
    flex-wrap: nowrap;
    overflow-x: auto;
    margin: 0 -20px;
    padding: 4px 20px 8px;
    scrollbar-width: none;
  }
  .ev-pills::-webkit-scrollbar { display: none; }
  .ev-toggle { align-self: flex-end; }
  .ev-cal { display: none; }
  .ev-cal-hint {
    background: #fff;
    border: 1px dashed var(--ev-rule);
    border-radius: 18px;
    padding: 20px;
    text-align: center;
    color: var(--ev-muted);
    font-size: 14px;
    margin-bottom: 40px;
  }
  .ev-clubs { grid-template-columns: 1fr; }
  .ev-supper { padding: 32px 26px; border-radius: 22px; }
  .ev-menu { padding: 26px; }
  .ev-card {
    grid-template-columns: 1fr;
    padding: 22px 22px 24px;
    gap: 14px;
  }
  .ev-card-date { flex-direction: row; align-items: baseline; gap: 10px; }
  .ev-card-date-day { font-size: 42px; }
  .ev-card-time { text-align: left; }
}
@media (min-width: 768px) {
  .ev-cal-hint { display: none; }
}
`;

export default EVENTS_CSS;
