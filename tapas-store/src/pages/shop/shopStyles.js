// All CSS for the Shop page in a single string. Kept outside the
// component so re-renders don't re-stringify it. Classes are
// prefixed with `shop-` (or `c-` for cover variants, matching the
// spec) so they don't collide with other pages.

const SHOP_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

.shop-root {
  --shop-lime:   #caf27e;
  --shop-orange: #FF934A;
  --shop-purple: #8F4FD6;
  --shop-pink:   #E0004F;
  --shop-ink:    #1a1a1a;
  --shop-ink-2:  #3a3a3a;
  --shop-muted:  #6e6e6e;
  --shop-rule:   #ececea;
  --shop-bg:     #faf8f4;
  --shop-card:   #ffffff;
  --shop-f-display: "DM Serif Display", Georgia, serif;
  --shop-f-ui:      "Inter", system-ui, sans-serif;
  --shop-f-mono:    "JetBrains Mono", ui-monospace, monospace;

  font-family: var(--shop-f-ui);
  color: var(--shop-ink);
  background: var(--shop-bg);
  -webkit-font-smoothing: antialiased;
  font-size: 16px;
  min-height: 100vh;
}
.shop-root * { box-sizing: border-box; }

/* ---- Hero band ---- */
.shop-hero-band {
  position: relative;
  background: var(--shop-lime);
  padding: 72px 0 96px;
  overflow: hidden;
}
.shop-hero-wrap {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 32px;
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 32px;
  align-items: end;
}
.shop-hero-wrap > div:first-child { grid-column: 1 / span 7; }
.shop-hero-_placeholder

.shop-hero-kicker {
  font-family: var(--shop-f-mono);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--shop-ink-2);
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}
.shop-hero-dot {
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 999px;
  background: var(--shop-pink);
}
.shop-hero-title {
  font-family: var(--shop-f-display);
  font-weight: 400;
  font-size: clamp(29px, 3.6vw, 48px);
  line-height: 1.05;
  letter-spacing: -0.015em;
  color: var(--shop-ink);
  margin: 0;
}
.shop-hero-title em {
  color: var(--shop-purple);
  font-style: italic;
  font-weight: 500;
}
.shop-hero-lede {
  font-size: 15px;
  line-height: 1.6;
  color: var(--shop-ink-2);
  margin: 0;
  max-width: 42ch;
  grid-column: 8 / span 5;
  padding-bottom: 12px;
}
.shop-hero-curve {
  position: absolute;
  bottom: -1px; left: 0; right: 0;
  width: 100%; height: 80px;
  display: block;
}
.shop-hero-curve path { fill: var(--shop-bg); }

/* ---- Page gutter ---- */
.shop-wrap {
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 64px;
}

/* ---- Featured ---- */
.shop-featured {
  background: var(--shop-orange);
  border-radius: 24px;
  padding: 28px 36px;
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 32px;
  align-items: center;
  margin: 16px 0 56px;
}
.shop-featured-kicker {
  font-family: var(--shop-f-mono);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  margin-bottom: 14px;
  color: var(--shop-ink);
}
.shop-featured-title {
  font-family: var(--shop-f-display);
  font-weight: 400;
  font-size: 38px;
  line-height: 1.08;
  letter-spacing: -0.015em;
  margin: 0;
  color: var(--shop-ink);
}
.shop-featured-title em {
  font-style: italic;
  font-weight: 500;
  color: var(--shop-ink);
}
.shop-featured-body {
  margin: 14px 0 22px;
  font-size: 16px;
  line-height: 1.55;
  color: var(--shop-ink);
  max-width: 46ch;
}
.shop-featured-cta {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  background: var(--shop-ink);
  color: #fff;
  padding: 12px 14px 12px 24px;
  border-radius: 999px;
  border: 0;
  font: inherit;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  transition: transform 150ms, background 150ms;
}
.shop-featured-cta:hover {
  background: #000;
  transform: translateY(-1px);
}
.shop-featured-cta-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px; height: 30px;
  border-radius: 999px;
  background: var(--shop-lime);
  color: var(--shop-ink);
}
.shop-featured-cover-wrap {
  display: flex;
  justify-content: center;
}
.shop-featured-cover {
  aspect-ratio: 3 / 4;
  width: 100%;
  max-width: 220px;
  border-radius: 14px;
  box-shadow: 0 24px 48px -18px rgba(0,0,0,0.45),
              0 4px 10px -4px rgba(0,0,0,0.25);
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: #fff;
}
/* Photo cover gets a white "picture frame" around the artwork. */
.shop-featured-cover.shop-cover-photo {
  background: #fff;
  padding: 8px;
  box-shadow: 0 24px 48px -18px rgba(0,0,0,0.45),
              0 4px 10px -4px rgba(0,0,0,0.25),
              inset 0 0 0 1px rgba(0,0,0,0.06);
}
.shop-featured-cover.shop-cover-photo img {
  border-radius: 8px;
}
.shop-featured-cover-title {
  font-family: var(--shop-f-display);
  font-weight: 400;
  font-size: 36px;
  line-height: 1.05;
  letter-spacing: -0.01em;
}
.shop-featured-cover-author {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.92);
}

/* ---- Shop layout ---- */
.shop-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 48px;
  padding: 0;
}

/* ---- Filter sidebar ---- */
.shop-filters { font-size: 14px; }
.shop-filter-group {
  border-top: 1px solid var(--shop-rule);
  padding: 18px 0;
}
.shop-filter-group:first-child { border-top: 0; padding-top: 0; }
.shop-filter-group h4 {
  font-family: var(--shop-f-ui);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  margin: 0 0 14px;
  color: var(--shop-ink);
}
.shop-filter-search {
  width: 100%;
  padding: 10px 14px;
  border-radius: 999px;
  border: 1px solid var(--shop-rule);
  background: #fff;
  font-family: inherit;
  font-size: 13px;
  color: var(--shop-ink);
  outline: none;
}
.shop-filter-search:focus { border-color: var(--shop-ink); }
.shop-filter-check {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--shop-ink-2);
  padding: 5px 0;
  cursor: pointer;
}
.shop-filter-check input { accent-color: var(--shop-pink); }
.shop-filter-check-label { flex: 1; }
.shop-filter-check-count {
  color: var(--shop-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.shop-filter-price {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--shop-ink-2);
}
.shop-filter-price input[type=range] {
  flex: 1;
  accent-color: var(--shop-purple);
}
.shop-filter-price-bound {
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  color: var(--shop-muted);
}

/* ---- Chips ---- */
.shop-chip-row { display: flex; gap: 8px; flex-wrap: wrap; }
.shop-chip {
  font-size: 12px;
  font-family: inherit;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid var(--shop-rule);
  color: var(--shop-ink-2);
  cursor: pointer;
  transition: background 150ms, color 150ms, border-color 150ms;
}
.shop-chip:hover { border-color: var(--shop-ink); }
.shop-chip.is-on {
  background: var(--shop-ink);
  color: #fff;
  border-color: var(--shop-ink);
}

/* ---- Toolbar ---- */
.shop-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
}
.shop-toolbar-count {
  font-family: var(--shop-f-mono);
  font-size: 13px;
  color: var(--shop-muted);
}
.shop-toolbar-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}
.shop-toolbar-filters-btn {
  display: none;
  background: #fff;
  border: 1px solid var(--shop-rule);
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 13px;
  font-family: inherit;
  font-weight: 600;
  color: var(--shop-ink);
  cursor: pointer;
}
.shop-toolbar-filters-btn:hover { border-color: var(--shop-ink); }
.shop-toolbar-sort {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--shop-ink-2);
}
.shop-toolbar-sort select {
  border: 1px solid var(--shop-rule);
  border-radius: 999px;
  padding: 8px 30px 8px 14px;
  background: #fff;
  font-family: inherit;
  font-size: 13px;
  color: var(--shop-ink);
  outline: none;
  appearance: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='none' stroke='%231a1a1a' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' d='M1 1l4 4 4-4'/></svg>");
  background-repeat: no-repeat;
  background-position: right 12px center;
}

/* ---- Book grid ---- */
.shop-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 22px;
}

.shop-empty {
  padding: 80px 20px;
  text-align: center;
  color: var(--shop-muted);
  background: #fff;
  border: 1px solid var(--shop-rule);
  border-radius: 20px;
}
.shop-empty-emoji { font-size: 40px; margin-bottom: 10px; }
.shop-empty h3 {
  font-family: var(--shop-f-display);
  font-weight: 400;
  font-size: 22px;
  color: var(--shop-ink);
  margin: 0 0 8px;
}
.shop-empty p { margin: 0; font-size: 14px; }

/* ---- Book card ---- */
.shop-card {
  position: relative;
  background: var(--shop-card);
  border: 1px solid var(--shop-rule);
  border-radius: 20px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: transform 200ms, box-shadow 200ms, border-color 200ms;
}
.shop-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 40px -24px rgba(0,0,0,0.25);
  border-color: #d8d8d6;
}
.shop-card-fav {
  position: absolute;
  top: 26px; right: 26px;
  width: 32px; height: 32px;
  border-radius: 999px;
  background: rgba(255,255,255,0.95);
  border: 0;
  display: grid;
  place-items: center;
  font-size: 14px;
  color: var(--shop-pink);
  cursor: pointer;
  z-index: 2;
  transition: transform 150ms, background 150ms;
}
.shop-card-fav:hover { transform: scale(1.08); }
.shop-card-fav.is-on { background: #fff; }

.shop-cover {
  aspect-ratio: 3 / 4;
  border-radius: 12px;
  padding: 18px 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  color: #fff;
}
/* Photo cover (uploaded book_image from dashboard) — fills the same
   3:4 frame as the gradient covers, no padding so the image edges
   meet the rounded corners. */
.shop-cover-photo, .shop-featured-cover.shop-cover-photo {
  padding: 0;
  background: #f0ebe1;
}
.shop-cover-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.shop-cover-title {
  font-family: var(--shop-f-display);
  font-weight: 400;
  font-size: 19px;
  line-height: 1.08;
  letter-spacing: -0.01em;
}
.shop-cover-author {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: rgba(255,255,255,0.92);
  text-transform: uppercase;
}

/* Cover gradient variants. .c-lime and .c-cream flip to dark ink
   text because white would wash out against those backgrounds. */
.shop-cover.c-purple, .shop-featured-cover.c-purple { background: linear-gradient(155deg, #8F4FD6 0%, #5a2b9a 100%); }
.shop-cover.c-orange, .shop-featured-cover.c-orange { background: linear-gradient(155deg, #FF934A 0%, #c65a1e 100%); }
.shop-cover.c-ink,    .shop-featured-cover.c-ink    { background: linear-gradient(155deg, #1a1a1a 0%, #3a3a3a 100%); }
.shop-cover.c-pink,   .shop-featured-cover.c-pink   { background: linear-gradient(155deg, #E0004F 0%, #8a002f 100%); }
.shop-cover.c-lime,   .shop-featured-cover.c-lime   { background: linear-gradient(155deg, #C9F27F 0%, #8ac13a 100%); color: var(--shop-ink); }
.shop-cover.c-lime .shop-cover-author,
.shop-featured-cover.c-lime .shop-featured-cover-author { color: rgba(26,26,26,0.76); }
.shop-cover.c-taupe,  .shop-featured-cover.c-taupe  { background: linear-gradient(155deg, #5b4d3d 0%, #2c241b 100%); }
.shop-cover.c-cream,  .shop-featured-cover.c-cream  { background: linear-gradient(155deg, #e8dfcb 0%, #bfb29a 100%); color: var(--shop-ink); }
.shop-cover.c-cream .shop-cover-author,
.shop-featured-cover.c-cream .shop-featured-cover-author { color: rgba(26,26,26,0.72); }

.shop-card-meta { display: flex; flex-direction: column; gap: 2px; }
.shop-card-title {
  font-family: var(--shop-f-display);
  font-weight: 400;
  font-size: 17px;
  line-height: 1.15;
  color: var(--shop-ink);
}
.shop-card-author {
  font-size: 13px;
  color: var(--shop-muted);
}
.shop-card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  border-top: 1px dashed var(--shop-rule);
}
.shop-card-price {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.shop-card-price-now {
  font-family: var(--shop-f-display);
  font-weight: 400;
  font-size: 18px;
  color: var(--shop-ink);
}
.shop-card-price-strike {
  font-size: 13px;
  color: var(--shop-muted);
  text-decoration: line-through;
}
.shop-card-add {
  background: var(--shop-ink);
  color: #fff;
  width: 34px; height: 34px;
  border-radius: 999px;
  border: 0;
  display: grid;
  place-items: center;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: background 150ms, transform 150ms;
}
.shop-card:hover .shop-card-add { background: var(--shop-pink); }
.shop-card-add:hover { transform: scale(1.08); }

/* ---- Pagination ---- */
.shop-pag {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 48px;
  align-items: center;
}
.shop-pag button {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: 1px solid var(--shop-rule);
  background: #fff;
  font-family: inherit;
  font-weight: 600;
  font-size: 13px;
  color: var(--shop-ink);
  cursor: pointer;
  transition: background 150ms, color 150ms, border-color 150ms;
}
.shop-pag button:hover:not(:disabled) {
  border-color: var(--shop-ink);
}
.shop-pag button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.shop-pag button.is-on {
  background: var(--shop-ink);
  color: #fff;
  border-color: var(--shop-ink);
}
.shop-pag-gap {
  color: var(--shop-muted);
  user-select: none;
  padding: 0 4px;
}

/* ---- Filter drawer (mobile/tablet) ---- */
.shop-drawer-root {
  position: fixed;
  inset: 0;
  z-index: 60;
  pointer-events: none;
}
.shop-drawer-root.is-open { pointer-events: auto; }
.shop-drawer-scrim {
  position: absolute;
  inset: 0;
  background: rgba(26,26,26,0.45);
  opacity: 0;
  transition: opacity 200ms;
  border: 0;
  padding: 0;
  cursor: pointer;
}
.shop-drawer-root.is-open .shop-drawer-scrim { opacity: 1; }
.shop-drawer {
  position: absolute;
  top: 0; bottom: 0; left: 0;
  width: min(340px, 88vw);
  background: var(--shop-bg);
  display: flex;
  flex-direction: column;
  transform: translateX(-100%);
  transition: transform 240ms ease;
  box-shadow: 0 20px 40px rgba(0,0,0,0.18);
}
.shop-drawer-root.is-open .shop-drawer { transform: translateX(0); }
.shop-drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid var(--shop-rule);
}
.shop-drawer-head h3 {
  margin: 0;
  font-family: var(--shop-f-display);
  font-weight: 400;
  font-size: 20px;
  color: var(--shop-ink);
}
.shop-drawer-close {
  background: transparent;
  border: 0;
  font-size: 20px;
  color: var(--shop-ink);
  cursor: pointer;
  padding: 4px 8px;
}
.shop-drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 18px 20px 24px;
}
.shop-drawer-foot {
  padding: 14px 20px;
  border-top: 1px solid var(--shop-rule);
  background: #fff;
}
.shop-drawer-apply {
  width: 100%;
  padding: 12px 16px;
  border-radius: 999px;
  background: var(--shop-ink);
  color: #fff;
  border: 0;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

/* ---- Responsive ---- */
@media (max-width: 1200px) {
  .shop-hero-wrap { padding: 0 40px; gap: 40px; }
  .shop-wrap { padding: 0 40px; }
  .shop-featured { padding: 44px; }
}
@media (max-width: 1023px) {
  .shop-grid { grid-template-columns: repeat(2, 1fr); }
  .shop-layout { grid-template-columns: 1fr; }
  .shop-filters { display: none; }
  .shop-toolbar-filters-btn { display: inline-flex; align-items: center; gap: 8px; }
  .shop-featured-title { font-size: 36px; }
}
@media (max-width: 767px) {
  .shop-hero-band { padding: 56px 0 72px; }
  .shop-hero-wrap { grid-template-columns: 1fr; gap: 24px; padding: 0 24px; }
  .shop-wrap { padding: 0 20px; }
  .shop-featured {
    grid-template-columns: 1fr;
    padding: 28px;
    gap: 28px;
    border-radius: 22px;
  }
  .shop-featured-title { font-size: 30px; }
  .shop-featured-cover { max-width: 240px; }
  .shop-grid { grid-template-columns: 1fr; }
  .shop-toolbar { align-items: flex-start; }
}

@media (max-width: 1023px) {
  .shop-hero-wrap { grid-template-columns: 1fr !important; gap: 20px !important; }
  .shop-hero-wrap > div:first-child { grid-column: auto !important; }
  .shop-hero-lede { grid-column: auto !important; padding-bottom: 0 !important; max-width: 100% !important; }
}
@media (max-width: 767px) {
  .shop-hero-band { padding: 48px 0 64px !important; }
  .shop-hero-title { font-size: clamp(22px, 4.2vw, 26px) !important; line-height: 1.08 !important; }
}
`;

export default SHOP_CSS;
