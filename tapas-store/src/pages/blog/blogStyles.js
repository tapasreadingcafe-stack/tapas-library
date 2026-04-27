const BLOG_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

.blog-root {
  --bl-lime:   #caf27e;
  --bl-orange: #FF934A;
  --bl-purple: #8F4FD6;
  --bl-pink:   #E0004F;
  --bl-ink:    #1a1a1a;
  --bl-ink-2:  #3a3a3a;
  --bl-muted:  #6e6e6e;
  --bl-rule:   #ececea;
  --bl-bg:     #faf8f4;
  --bl-f-display: "DM Serif Display", Georgia, serif;
  --bl-f-ui:      "Inter", system-ui, sans-serif;
  --bl-f-mono:    "JetBrains Mono", ui-monospace, monospace;

  font-family: var(--bl-f-ui);
  color: var(--bl-ink);
  background: var(--bl-bg);
  -webkit-font-smoothing: antialiased;
  font-size: 16px;
  min-height: 100vh;
}
.blog-root * { box-sizing: border-box; }

.blog-wrap {
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 64px;
}

/* ---- Hero ---- */
.blog-hero {
  position: relative;
  background: var(--bl-lime);
  padding: 72px 0 96px;
  overflow: hidden;
}
.blog-hero-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 32px;
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 32px;
  align-items: end;
}
.blog-hero-inner > div:first-child { grid-column: 1 / span 7; }
.blog-hero-kicker {
  font-family: var(--bl-f-mono);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--bl-ink-2);
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}
.blog-hero-dot {
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 999px;
  background: var(--bl-pink);
}
.blog-hero-title {
  font-family: var(--bl-f-display);
  font-weight: 400;
  font-size: clamp(29px, 3.6vw, 48px);
  line-height: 1.05;
  letter-spacing: -0.015em;
  color: var(--bl-ink);
  margin: 0;
}
.blog-hero-title em {
  color: var(--bl-purple);
  font-style: italic;
  font-weight: 500;
  display: block;
}
.blog-hero-lede {
  font-size: 15px;
  line-height: 1.6;
  color: var(--bl-ink-2);
  margin: 0;
  max-width: 42ch;
  grid-column: 8 / span 5;
  padding-bottom: 12px;
}
.blog-hero-curve {
  position: absolute;
  bottom: -1px; left: 0; right: 0;
  width: 100%; height: 80px;
  display: block;
}
.blog-hero-curve path { fill: var(--bl-bg); }

/* ---- Top row ---- */
.blog-top {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 32px;
  margin: 40px 0 56px;
}

/* Featured card */
.blog-featured {
  position: relative;
  overflow: hidden;
  background: var(--bl-ink);
  color: #fff;
  border-radius: 28px;
  padding: 48px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 560px;
  text-decoration: none;
  transition: transform 200ms;
}
.blog-featured:hover { transform: translateY(-3px); }
.blog-featured-blob {
  position: absolute;
  right: -120px;
  bottom: -120px;
  width: 360px; height: 360px;
  border-radius: 999px;
  background: radial-gradient(circle at 30% 30%, #7a3bc2 0%, #5a2b9a 60%, rgba(90,43,154,0) 75%);
  pointer-events: none;
}
.blog-featured-kicker {
  font-family: var(--bl-f-mono);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--bl-lime);
  margin-bottom: 20px;
  position: relative;
}
.blog-featured-title {
  font-family: var(--bl-f-display);
  font-weight: 400;
  font-size: clamp(32px, 3.8vw, 52px);
  line-height: 1.05;
  letter-spacing: -0.015em;
  color: #fff;
  margin: 0 0 28px;
  max-width: 14ch;
  position: relative;
}
.blog-featured-title em { font-style: italic; font-weight: 500; }
.blog-featured-title em.is-lime  { color: var(--bl-lime); }
.blog-featured-title em.is-white { color: #fff; }

.blog-featured-author {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
}
.blog-avatar {
  display: inline-grid;
  place-items: center;
  width: 32px; height: 32px;
  border-radius: 999px;
  background: var(--bl-orange);
  color: var(--bl-ink);
  font-family: var(--bl-f-display);
  font-weight: 400;
  font-size: 14px;
  flex-shrink: 0;
}
.blog-featured-author-name {
  color: rgba(255,255,255,0.92);
  font-size: 14px;
}
.blog-featured-author-name .dim {
  color: rgba(255,255,255,0.55);
}

/* Sidebar cards */
.blog-sidebar {
  display: grid;
  grid-template-rows: 1fr 1fr;
  gap: 22px;
}
.blog-card {
  background: #fff;
  border: 1px solid var(--bl-rule);
  border-radius: 22px;
  padding: 26px 28px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-decoration: none;
  color: inherit;
  transition: transform 200ms, box-shadow 200ms, border-color 200ms;
}
.blog-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 30px -18px rgba(0,0,0,0.2);
  border-color: #d8d8d6;
}
.blog-card-kicker {
  font-family: var(--bl-f-mono);
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.blog-card-kicker.is-pink   { color: var(--bl-pink); }
.blog-card-kicker.is-purple { color: var(--bl-purple); }
.blog-card-title {
  font-family: var(--bl-f-display);
  font-weight: 400;
  font-size: 22px;
  line-height: 1.2;
  letter-spacing: -0.01em;
  color: var(--bl-ink);
  margin: 0;
}
.blog-card-title em.is-purple {
  color: var(--bl-purple);
  font-style: italic;
  font-weight: 500;
}
.blog-card-excerpt {
  color: var(--bl-ink-2);
  font-size: 14.5px;
  line-height: 1.55;
  margin: 0;
}
.blog-card-author-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--bl-f-mono);
  font-size: 13px;
  color: var(--bl-muted);
  border-top: 1px dashed var(--bl-rule);
  padding-top: 12px;
  margin-top: auto;
}

/* ---- Archive ---- */
.blog-archive-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  margin-bottom: 16px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--bl-rule);
  flex-wrap: wrap;
}
.blog-archive-kicker {
  font-family: var(--bl-f-mono);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--bl-purple);
  margin-bottom: 12px;
}
.blog-archive-title {
  font-family: var(--bl-f-display);
  font-weight: 400;
  font-size: clamp(28px, 3.6vw, 44px);
  line-height: 1.06;
  letter-spacing: -0.015em;
  color: var(--bl-ink);
  margin: 0;
}
.blog-archive-title em {
  color: var(--bl-purple);
  font-style: italic;
  font-weight: 500;
}
.blog-archive-lede {
  font-size: 15px;
  line-height: 1.6;
  color: var(--bl-ink-2);
  max-width: 40ch;
  margin: 0;
}
.blog-archive-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-top: 32px;
  flex-wrap: wrap;
}
.blog-pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.blog-pill {
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid var(--bl-rule);
  color: var(--bl-ink-2);
  cursor: pointer;
  transition: background 150ms, color 150ms, border-color 150ms;
  white-space: nowrap;
}
.blog-pill:hover { border-color: var(--bl-ink); }
.blog-pill.is-on {
  background: var(--bl-ink);
  color: #fff;
  border-color: var(--bl-ink);
}
.blog-search {
  width: min(300px, 100%);
  padding: 10px 16px;
  border-radius: 999px;
  border: 1px solid var(--bl-rule);
  background: #fff;
  font-family: inherit;
  font-size: 13px;
  color: var(--bl-ink);
  outline: none;
}
.blog-search:focus { border-color: var(--bl-ink); }

.blog-archive-count {
  font-family: var(--bl-f-mono);
  font-size: 12px;
  color: var(--bl-muted);
  margin: 18px 0 0;
}
.blog-archive-empty {
  padding: 80px 20px;
  text-align: center;
  color: var(--bl-muted);
  background: #fff;
  border: 1px solid var(--bl-rule);
  border-radius: 22px;
  margin-top: 32px;
}
.blog-archive-empty-title {
  font-family: var(--bl-f-display);
  font-size: 22px;
  font-weight: 400;
  color: var(--bl-ink);
  margin: 0;
}

.blog-archive-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
  margin-top: 32px;
}

/* Archive card */
.blog-archive-card {
  background: #fff;
  border: 1px solid var(--bl-rule);
  border-radius: 22px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
  transition: transform 200ms, box-shadow 200ms, border-color 200ms;
}
.blog-archive-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 30px -18px rgba(0,0,0,0.22);
  border-color: #d8d8d6;
}
.blog-archive-banner {
  aspect-ratio: 4 / 3;
  position: relative;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: #fff;
}
.blog-archive-banner.is-lime,
.blog-archive-banner.is-cream { color: var(--bl-ink); }

.blog-archive-tag {
  align-self: flex-start;
  font-family: var(--bl-f-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background: rgba(255,255,255,0.25);
  color: #fff;
  padding: 4px 10px;
  border-radius: 999px;
}
.blog-archive-banner.is-lime .blog-archive-tag,
.blog-archive-banner.is-cream .blog-archive-tag {
  background: rgba(0,0,0,0.15);
  color: var(--bl-ink);
}
.blog-archive-title-text {
  font-family: var(--bl-f-display);
  font-weight: 400;
  font-size: 22px;
  line-height: 1.15;
  letter-spacing: -0.005em;
  margin: 0;
}
.blog-archive-title-text em {
  font-style: italic;
  font-weight: 500;
  opacity: 0.94;
}

.blog-archive-body {
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  flex: 1;
}
.blog-archive-excerpt {
  color: var(--bl-ink-2);
  font-size: 14px;
  line-height: 1.55;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.blog-archive-author {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px dashed var(--bl-rule);
  margin-top: 14px;
  padding-top: 12px;
  font-family: var(--bl-f-mono);
  font-size: 13px;
  color: var(--bl-muted);
}
.blog-archive-author-left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--bl-ink);
}
.blog-avatar.is-sm {
  width: 28px; height: 28px;
  background: var(--bl-lime);
  color: var(--bl-ink);
  font-size: 12px;
}

/* ---- Card gradient colors ---- */
.blog-root .c-purple { background: linear-gradient(155deg, #8F4FD6 0%, #5a2b9a 100%); }
.blog-root .c-orange { background: linear-gradient(155deg, #FF934A 0%, #c65a1e 100%); }
.blog-root .c-ink    { background: linear-gradient(155deg, #1a1a1a 0%, #3a3a3a 100%); }
.blog-root .c-pink   { background: linear-gradient(155deg, #E0004F 0%, #8a002f 100%); }
.blog-root .c-lime   { background: linear-gradient(155deg, #C9F27F 0%, #8ac13a 100%); }
.blog-root .c-taupe  { background: linear-gradient(155deg, #5b4d3d 0%, #2c241b 100%); }

/* ---- Dispatch ---- */
.blog-dispatch {
  background: var(--bl-lime);
  border-radius: 28px;
  padding: 48px 56px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: center;
  margin: 48px 0 0;
}
.blog-dispatch-kicker {
  font-family: var(--bl-f-mono);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--bl-purple);
  margin-bottom: 12px;
}
.blog-dispatch-title {
  font-family: var(--bl-f-display);
  font-weight: 400;
  font-size: clamp(30px, 3.4vw, 44px);
  line-height: 1.05;
  letter-spacing: -0.015em;
  color: var(--bl-ink);
  margin: 0 0 14px;
}
.blog-dispatch-title em {
  color: var(--bl-purple);
  font-style: italic;
  font-weight: 500;
}
.blog-dispatch-lede {
  color: var(--bl-ink-2);
  font-size: 15px;
  line-height: 1.6;
  margin: 0;
  max-width: 44ch;
}
.blog-dispatch-form {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 999px;
  padding: 6px;
  border: 1px solid rgba(0,0,0,0.06);
}
.blog-dispatch-form input {
  flex: 1;
  background: transparent;
  border: 0;
  outline: none;
  padding: 12px 20px;
  font-family: inherit;
  font-size: 15px;
  color: var(--bl-ink);
  min-width: 0;
}
.blog-dispatch-form input::placeholder { color: var(--bl-muted); }
.blog-dispatch-form button {
  background: var(--bl-pink);
  color: #fff;
  border: 0;
  border-radius: 999px;
  padding: 12px 24px;
  font-family: inherit;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background 150ms, transform 150ms;
}
.blog-dispatch-form button:hover:not(:disabled) {
  background: #b80042;
  transform: translateY(-1px);
}
.blog-dispatch-error {
  font-family: var(--bl-f-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--bl-pink);
  margin-top: 10px;
}
.blog-dispatch-success {
  font-family: var(--bl-f-display);
  font-weight: 400;
  font-size: 18px;
  color: var(--bl-ink);
  line-height: 1.4;
  background: #fff;
  border-radius: 18px;
  padding: 18px 22px;
  border: 1px solid rgba(0,0,0,0.06);
}

/* ---- Detail stub ---- */
.blog-detail {
  max-width: 720px;
  margin: 0 auto;
  padding: 80px 20px 120px;
}
.blog-detail-kicker {
  font-family: var(--bl-f-mono);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--bl-purple);
  margin-bottom: 14px;
}
.blog-detail-title {
  font-family: var(--bl-f-display);
  font-weight: 400;
  font-size: clamp(30px, 4vw, 48px);
  line-height: 1.08;
  letter-spacing: -0.015em;
  color: var(--bl-ink);
  margin: 0 0 18px;
}
.blog-detail-title em {
  color: var(--bl-purple);
  font-style: italic;
  font-weight: 500;
}
.blog-detail-note {
  font-size: 16px;
  line-height: 1.6;
  color: var(--bl-ink-2);
  margin: 0 0 24px;
}
.blog-detail-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--bl-ink);
  text-decoration: none;
  font-weight: 600;
  font-family: var(--bl-f-mono);
  font-size: 13px;
  letter-spacing: 0.04em;
}
.blog-detail-back:hover { color: var(--bl-purple); }

/* ---- Responsive ---- */
@media (max-width: 1200px) {
  .blog-hero-inner { padding: 0 40px; gap: 40px; }
  .blog-wrap { padding: 0 40px; }
}
@media (max-width: 1023px) {
  .blog-top { grid-template-columns: 1fr; }
  .blog-sidebar { grid-template-rows: auto; grid-template-columns: 1fr 1fr; }
  .blog-archive-grid { grid-template-columns: 1fr 1fr; }
  .blog-dispatch {
    grid-template-columns: 1fr;
    gap: 28px;
    padding: 40px 44px;
  }
}
@media (max-width: 767px) {
  .blog-hero { padding: 56px 0 80px; }
  .blog-hero-inner {
    grid-template-columns: 1fr;
    gap: 24px;
    padding: 0 24px;
  }
  .blog-wrap { padding: 0 20px; }
  .blog-top { margin: 40px 0 56px; }
  .blog-featured { padding: 32px 28px; min-height: 420px; }
  .blog-sidebar { grid-template-columns: 1fr; }
  .blog-archive-grid { grid-template-columns: 1fr; }
  .blog-dispatch {
    padding: 32px 26px;
    border-radius: 22px;
  }
  .blog-archive-controls { flex-direction: column; align-items: stretch; }
  .blog-pills {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding: 4px 0 8px;
    margin: 0 -20px;
    padding-left: 20px;
    padding-right: 20px;
    scrollbar-width: none;
  }
  .blog-pills::-webkit-scrollbar { display: none; }
  .blog-search { width: 100%; }
}

@media (max-width: 1023px) {
  .blog-hero-inner { grid-template-columns: 1fr !important; gap: 20px !important; }
  .blog-hero-inner > div:first-child { grid-column: auto !important; }
  .blog-hero-lede { grid-column: auto !important; padding-bottom: 0 !important; max-width: 100% !important; }
}
@media (max-width: 767px) {
  .blog-hero { padding: 48px 0 64px !important; }
  .blog-hero-title { font-size: clamp(22px, 4.2vw, 26px) !important; line-height: 1.08 !important; }
}
`;

export default BLOG_CSS;
