// All CSS for the /library page. Scoped to .library-root so none of
// it leaks to other pages. Cover-gradient classes (.c-purple etc.)
// are intentionally duplicated from shopStyles.js — duplicating the
// handful of lines is cheaper than building a shared stylesheet that
// every page has to import.

const LIBRARY_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

.library-root {
  --lib-lime:   #caf27e;
  --lib-orange: #FF934A;
  --lib-purple: #8F4FD6;
  --lib-pink:   #E0004F;
  --lib-green-dot: #22c55e;
  --lib-ink:    #1a1a1a;
  --lib-ink-2:  #3a3a3a;
  --lib-muted:  #6e6e6e;
  --lib-rule:   #ececea;
  --lib-bg:     #faf8f4;
  --lib-card:   #ffffff;
  --lib-f-display: "DM Serif Display", Georgia, serif;
  --lib-f-ui:      "Inter", system-ui, sans-serif;
  --lib-f-mono:    "JetBrains Mono", ui-monospace, monospace;

  font-family: var(--lib-f-ui);
  color: var(--lib-ink);
  background: var(--lib-bg);
  -webkit-font-smoothing: antialiased;
  font-size: 16px;
  min-height: 100vh;
}
.library-root * { box-sizing: border-box; }

.library-wrap {
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 64px;
}

/* ---- Hero ---- */
.library-hero {
  position: relative;
  background: var(--lib-lime);
  padding: 72px 0 96px;
  overflow: hidden;
}
.library-hero-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 32px;
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 32px;
  align-items: end;
}
.library-hero-inner > div:first-child { grid-column: 1 / span 7; }
.library-hero-kicker {
  font-family: var(--lib-f-mono);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--lib-ink-2);
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}
.library-hero-dot {
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 999px;
  background: var(--lib-pink);
}
.library-hero-title {
  font-family: var(--lib-f-display);
  font-weight: 400;
  font-size: clamp(48px, 6vw, 80px);
  line-height: 1.05;
  letter-spacing: -0.015em;
  color: var(--lib-ink);
  margin: 0;
}
.library-hero-title em {
  color: var(--lib-purple);
  font-style: italic;
  font-weight: 500;
}
.library-hero-lede {
  font-size: 15px;
  line-height: 1.6;
  color: var(--lib-ink-2);
  margin: 0;
  max-width: 42ch;
  grid-column: 8 / span 5;
  padding-bottom: 12px;
}
.library-hero-curve {
  position: absolute;
  bottom: -1px; left: 0; right: 0;
  width: 100%; height: 80px;
  display: block;
}
.library-hero-curve path { fill: var(--lib-bg); }

/* ---- Stats row ---- */
.library-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-top: 24px;
}
.library-stat {
  background: #fff;
  border: 1px solid var(--lib-rule);
  border-radius: 20px;
  padding: 28px 28px 24px;
  min-height: 140px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.library-stat.is-accent {
  background: var(--lib-lime);
  border-color: transparent;
}
.library-stat-value {
  font-family: var(--lib-f-display);
  font-weight: 400;
  font-size: 48px;
  line-height: 1;
  letter-spacing: -0.01em;
  color: var(--lib-ink);
}
.library-stat-label {
  font-family: var(--lib-f-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--lib-muted);
  margin-top: 18px;
}
.library-stat.is-accent .library-stat-label { color: var(--lib-ink); }

/* ---- Filter row ---- */
.library-filter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-top: 24px;
  flex-wrap: wrap;
}
.library-filter-pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.library-pill {
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid var(--lib-rule);
  color: var(--lib-ink-2);
  cursor: pointer;
  transition: background 150ms, color 150ms, border-color 150ms;
  white-space: nowrap;
}
.library-pill:hover { border-color: var(--lib-ink); }
.library-pill.is-on {
  background: var(--lib-ink);
  color: #fff;
  border-color: var(--lib-ink);
}
.library-filter-search {
  width: min(320px, 100%);
  padding: 10px 16px;
  border-radius: 999px;
  border: 1px solid var(--lib-rule);
  background: #fff;
  font-family: inherit;
  font-size: 13px;
  color: var(--lib-ink);
  outline: none;
}
.library-filter-search:focus { border-color: var(--lib-ink); }

/* ---- Featured shelf ---- */
.library-featured {
  margin-top: 40px;
  background: var(--lib-ink);
  color: #fff;
  border-radius: 28px;
  padding: 56px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: center;
}
.library-featured-kicker {
  font-family: var(--lib-f-mono);
  color: var(--lib-lime);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  margin-bottom: 14px;
}
.library-featured-title {
  font-family: var(--lib-f-display);
  font-weight: 400;
  font-size: clamp(30px, 3.6vw, 46px);
  line-height: 1.08;
  letter-spacing: -0.015em;
  margin: 0;
  color: #fff;
}
.library-featured-title em {
  font-style: italic;
  font-weight: 500;
  color: var(--lib-lime);
  display: block;
}
.library-featured-body {
  margin: 18px 0 28px;
  font-size: 15px;
  line-height: 1.6;
  color: rgba(255,255,255,0.82);
  max-width: 48ch;
}
.library-featured-cta {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: #fff;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
  padding: 10px 4px;
  cursor: pointer;
  background: transparent;
  border: 0;
  font-family: inherit;
  transition: color 150ms;
}
.library-featured-cta:hover { color: var(--lib-lime); }
.library-featured-cta-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px; height: 30px;
  border-radius: 999px;
  background: var(--lib-lime);
  color: var(--lib-ink);
  transition: transform 150ms;
}
.library-featured-cta:hover .library-featured-cta-arrow {
  transform: translateX(4px);
}

/* Right column — colorful book-spine illustration. Each spine is a
   div at a preset height sitting on a common baseline. */
.library-featured-spines {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 6px;
  align-items: end;
  background: #222;
  border-radius: 16px;
  padding: 22px 22px 18px;
  min-height: 260px;
}
.library-featured-spine {
  border-radius: 4px 4px 0 0;
  min-height: 40%;
  position: relative;
  overflow: hidden;
}
.library-featured-spine::after {
  content: '';
  position: absolute;
  left: 6px; right: 6px;
  top: 38%;
  height: 14px;
  background: rgba(255,255,255,0.18);
  border-radius: 2px;
}

/* ---- Shelves ---- */
.library-shelves { margin: 56px 0 80px; display: grid; gap: 28px; }
.library-shelf {
  background: #fff;
  border: 1px solid var(--lib-rule);
  border-radius: 24px;
  padding: 28px 32px 32px;
  scroll-margin-top: 96px; /* account for the sticky nav */
}
.library-shelf-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--lib-rule);
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.library-shelf-title {
  font-family: var(--lib-f-display);
  font-weight: 400;
  font-size: 24px;
  color: var(--lib-ink);
  margin: 0;
  letter-spacing: -0.01em;
}
.library-shelf-title em {
  color: var(--lib-purple);
  font-style: italic;
  font-weight: 500;
  margin-left: 6px;
}
.library-shelf-meta {
  font-family: var(--lib-f-mono);
  font-size: 12px;
  color: var(--lib-muted);
}
.library-shelf-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
}

/* ---- Library book card ---- */
.library-book {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
  font: inherit;
  text-align: left;
  color: inherit;
  transition: transform 180ms;
}
.library-book:hover { transform: translateY(-3px); }
.library-book:focus-visible {
  outline: 2px solid var(--lib-ink);
  outline-offset: 4px;
  border-radius: 16px;
}

.library-cover {
  aspect-ratio: 3 / 4;
  width: 100%;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  color: #fff;
  box-shadow: 0 10px 30px -18px rgba(0,0,0,0.4);
}
/* Photo cover (uploaded book_image from dashboard). */
.library-cover-photo {
  padding: 0;
  background: #f0ebe1;
}
.library-cover-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.library-cover-title {
  font-family: var(--lib-f-display);
  font-weight: 400;
  font-size: 19px;
  line-height: 1.08;
  letter-spacing: -0.01em;
}
.library-cover-author {
  font-family: var(--lib-f-ui);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.92);
}

/* Cover gradients — duplicated from shopStyles, scoped to
   .library-root so we don't collide with .shop-root. */
.library-root .c-purple { background: linear-gradient(155deg, #8F4FD6 0%, #5a2b9a 100%); }
.library-root .c-orange { background: linear-gradient(155deg, #FF934A 0%, #c65a1e 100%); }
.library-root .c-ink    { background: linear-gradient(155deg, #1a1a1a 0%, #3a3a3a 100%); }
.library-root .c-pink   { background: linear-gradient(155deg, #E0004F 0%, #8a002f 100%); }
.library-root .c-lime   { background: linear-gradient(155deg, #C9F27F 0%, #8ac13a 100%); color: var(--lib-ink); }
.library-root .c-lime .library-cover-author { color: rgba(26,26,26,0.72); }
.library-root .c-taupe  { background: linear-gradient(155deg, #5b4d3d 0%, #2c241b 100%); }
.library-root .c-cream  { background: linear-gradient(155deg, #e8dfcb 0%, #bfb29a 100%); color: var(--lib-ink); }

.library-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--lib-f-mono);
  font-size: 12px;
  color: var(--lib-muted);
  padding: 4px 2px;
}
.library-status-dot {
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 999px;
}
.library-status.is-available .library-status-dot { background: var(--lib-green-dot); }
.library-status.is-out       .library-status-dot { background: var(--lib-pink); }

/* ---- Empty state ---- */
.library-empty {
  padding: 80px 20px;
  text-align: center;
  color: var(--lib-muted);
  background: #fff;
  border: 1px solid var(--lib-rule);
  border-radius: 24px;
}
.library-empty-emoji { font-size: 40px; margin-bottom: 10px; }
.library-empty h3 {
  font-family: var(--lib-f-display);
  font-weight: 400;
  font-size: 22px;
  color: var(--lib-ink);
  margin: 0 0 8px;
}
.library-empty p { margin: 0; font-size: 14px; }

/* ---- House rules ---- */
.library-rules { margin-bottom: 0 !important;
  background: var(--lib-lime);
  border-radius: 28px;
  padding: 56px;
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: 48px;
  align-items: start;
  margin-bottom: 0;
}
.library-rules-kicker {
  font-family: var(--lib-f-mono);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--lib-purple);
  margin-bottom: 14px;
}
.library-rules-title {
  font-family: var(--lib-f-display);
  font-weight: 400;
  font-size: clamp(28px, 3.4vw, 40px);
  line-height: 1.06;
  letter-spacing: -0.015em;
  color: var(--lib-ink);
  margin: 0 0 18px;
}
.library-rules-body {
  font-size: 15px;
  line-height: 1.6;
  color: var(--lib-ink-2);
  max-width: 42ch;
  margin: 0;
}
.library-rules-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.library-rules-item {
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 18px;
  align-items: start;
  padding: 20px 0;
  border-top: 1px solid rgba(26,26,26,0.2);
}
.library-rules-item:first-child { border-top: 0; padding-top: 0; }
.library-rules-num {
  font-family: var(--lib-f-display);
  font-weight: 400;
  font-size: 28px;
  color: var(--lib-ink);
  letter-spacing: -0.015em;
  line-height: 1;
}
.library-rules-item-title {
  font-family: var(--lib-f-display);
  font-weight: 400;
  font-size: 18px;
  color: var(--lib-ink);
  margin: 0 0 4px;
  letter-spacing: -0.01em;
}
.library-rules-item-body {
  font-size: 14px;
  line-height: 1.55;
  color: var(--lib-ink-2);
  margin: 0;
}

/* ---- Responsive ---- */
@media (max-width: 1200px) {
  .library-hero-inner { padding: 0 40px; gap: 40px; }
  .library-wrap { padding: 0 40px; }
  .library-featured, .library-rules { margin-bottom: 0 !important; padding: 44px; }
}
@media (max-width: 1023px) {
  .library-stats { grid-template-columns: repeat(2, 1fr); }
  .library-shelf-grid { grid-template-columns: repeat(3, 1fr); }
  .library-featured, .library-rules { margin-bottom: 0 !important;
    grid-template-columns: 1fr;
    gap: 32px;
  }
  .library-featured-title { font-size: 32px; }
}
@media (max-width: 767px) {
  .library-hero { padding: 56px 0 72px; }
  .library-hero-inner { grid-template-columns: 1fr; gap: 24px; padding: 0 24px; }
  .library-wrap { padding: 0 20px; }
  .library-stats { grid-template-columns: 1fr; }
  .library-shelf-grid { grid-template-columns: repeat(2, 1fr); }
  .library-featured, .library-rules { margin-bottom: 0 !important;
    padding: 28px;
    border-radius: 22px;
  }
  .library-featured-spines { min-height: 180px; padding: 14px; }
  .library-filter {
    flex-direction: column;
    align-items: stretch;
  }
  .library-filter-pills {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding: 4px 0 8px;
    margin: 0 -20px;
    padding-left: 20px;
    padding-right: 20px;
    scrollbar-width: none;
  }
  .library-filter-pills::-webkit-scrollbar { display: none; }
  .library-filter-search { width: 100%; }
  .library-rules-item {
    grid-template-columns: 48px 1fr;
    gap: 12px;
  }
  .library-rules-num { font-size: 24px; }
}

@media (max-width: 1023px) {
  .library-hero-inner { grid-template-columns: 1fr !important; gap: 20px !important; }
  .library-hero-inner > div:first-child { grid-column: auto !important; }
  .library-hero-lede { grid-column: auto !important; padding-bottom: 0 !important; max-width: 100% !important; }
}
@media (max-width: 767px) {
  .library-hero { padding: 48px 0 64px !important; }
  .library-hero-title { font-size: clamp(36px, 7vw, 44px) !important; line-height: 1.08 !important; }
}
`;

export default LIBRARY_CSS;
