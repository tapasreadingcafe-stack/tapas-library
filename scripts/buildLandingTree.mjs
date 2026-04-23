#!/usr/bin/env node
// =====================================================================
// buildLandingTree — emits the v2 Node tree + classes JSON for the
// Tapas landing page, ready to upsert into app_settings.store_content_v2.
//
// Usage:
//   node scripts/buildLandingTree.mjs > landing_tree.json
//
// The tree follows the schema in src/pages/WebsiteEditor.tree.js and
// tapas-store/src/blocks/Node.jsx. Raw CSS that the class compiler
// can't express (keyframes, ::before/::after, radial gradients) lives
// in a <style> node as the first child of <body> — the Node renderer
// allows <style> tags since Phase 11.
// =====================================================================

let __id = 0;
const id = (prefix = 'n') => `${prefix}_${(++__id).toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

const node = (tag, { classes = [], attributes, textContent, children = [] } = {}) => ({
  id: id(),
  tag,
  classes,
  children,
  ...(attributes ? { attributes } : { attributes: {} }),
  ...(textContent != null ? { textContent } : {}),
});

const text = (content) => ({ text: content, marks: [] });

const styleNode = (css) => node('style', { textContent: css });

// ---------------------------------------------------------------------
// Raw CSS — the parts of the design that classes alone can't express.
// Scoped to .tapas-landing so class names don't leak across the store.
// ---------------------------------------------------------------------
const RAW_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,700;0,9..144,800;1,9..144,500&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

.tapas-landing {
  --lime: #caf27e; --lime-2: #DCF59A;
  --orange: #FF934A; --purple: #8F4FD6; --pink: #E0004F;
  --ink: #1a1a1a; --ink-2: #3a3a3a; --muted: #6e6e6e;
  --rule: #ececea; --landing-bg: #faf8f4; --card: #ffffff;
  --f-display: "Fraunces", Georgia, serif;
  --f-ui: "Inter", system-ui, sans-serif;
  --f-mono: "JetBrains Mono", ui-monospace, monospace;
  --pad-section: 100px; --pad-gutter: 64px;
  font-family: var(--f-ui);
  color: var(--ink);
  background: var(--landing-bg);
  -webkit-font-smoothing: antialiased;
  font-size: 16px;
}
.tapas-landing * { box-sizing: border-box; }
.tapas-landing a { color: inherit; text-decoration: none; }
.tapas-landing img { max-width: 100%; display: block; }
.tapas-landing .wrap { max-width: 1320px; margin: 0 auto; padding: 0 var(--pad-gutter); }
.tapas-landing h1, .tapas-landing h2, .tapas-landing h3, .tapas-landing h4 {
  font-family: var(--f-display); font-weight: 700; margin: 0;
  letter-spacing: -0.015em; color: var(--ink);
}
.tapas-landing h1 em, .tapas-landing h2 em, .tapas-landing h3 em { font-style: italic; font-weight: 500; }
.tapas-landing p { line-height: 1.6; margin: 0; }

.tapas-landing .hero-band { background: var(--lime); position: relative; overflow: hidden; }
.tapas-landing .hero { display: grid; grid-template-columns: 1.05fr 1fr; gap: 64px; align-items: center; padding: 40px 0 80px; }
.tapas-landing .hero-copy .tag { display: inline-flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.55); padding: 8px 14px; border-radius: 999px; font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-2); margin-bottom: 22px; border: 1px solid rgba(0,0,0,0.06); }
.tapas-landing .hero-copy .tag::before { content: ""; width: 8px; height: 8px; background: var(--pink); border-radius: 999px; display: inline-block; }
.tapas-landing .hero h1 { font-size: clamp(56px, 6.4vw, 92px); line-height: 0.98; letter-spacing: -0.025em; margin-bottom: 24px; text-wrap: balance; }
.tapas-landing .hero h1 .accent { color: var(--purple); font-style: italic; font-weight: 500; }
.tapas-landing .hero h1 .u { position: relative; display: inline-block; }
.tapas-landing .hero h1 .u::after { content: ""; position: absolute; left: 0; right: 0; bottom: 4px; height: 10px; background: var(--orange); opacity: 0.55; z-index: -1; border-radius: 3px; }
.tapas-landing .hero-copy p { font-size: 17px; color: var(--ink-2); max-width: 48ch; margin-bottom: 32px; line-height: 1.55; }
.tapas-landing .hero-ctas { display: flex; gap: 14px; align-items: center; }
.tapas-landing .btn { display: inline-flex; align-items: center; gap: 10px; padding: 15px 24px; border-radius: 999px; font-family: var(--f-ui); font-weight: 600; font-size: 14.5px; border: 0; cursor: pointer; }
.tapas-landing .btn.primary { background: var(--ink); color: #fff; }
.tapas-landing .btn.primary:hover { background: var(--pink); }
.tapas-landing .btn.ghost { background: transparent; color: var(--ink); border: 1.5px solid var(--ink); }
.tapas-landing .btn.ghost:hover { background: var(--ink); color: #fff; }
.tapas-landing .btn .arrow { width: 22px; height: 22px; border-radius: 999px; background: var(--pink); display: inline-grid; place-items: center; color: #fff; font-size: 12px; }
.tapas-landing .btn.primary .arrow { background: var(--lime); color: var(--ink); }
.tapas-landing .hero-meta { display: flex; gap: 40px; margin-top: 48px; }
.tapas-landing .hero-meta .stat b { display: block; font-family: var(--f-display); font-weight: 700; font-size: 32px; letter-spacing: -0.02em; color: var(--ink); }
.tapas-landing .hero-meta .stat span { font-size: 12.5px; color: var(--ink-2); letter-spacing: 0.04em; }
.tapas-landing .hero-art { position: relative; aspect-ratio: 1/1; border-radius: 24px; overflow: hidden; background: #d9d2c5; box-shadow: 0 30px 60px -30px rgba(0,0,0,0.3); }
.tapas-landing .hero-art .ph { position: absolute; inset: 0; background: radial-gradient(ellipse at 30% 35%, rgba(255,147,74,0.25), transparent 55%), radial-gradient(ellipse at 75% 60%, rgba(143,79,214,0.22), transparent 60%), repeating-linear-gradient(135deg, #cfc5b0 0 16px, #c6bba3 16px 32px); }
.tapas-landing .shelf { position: absolute; left: 8%; right: 8%; bottom: 10%; display: flex; gap: 6px; align-items: flex-end; height: 62%; }
.tapas-landing .book { flex: 1; border-radius: 3px 3px 1px 1px; box-shadow: inset -4px 0 0 rgba(0,0,0,0.08), 0 2px 0 rgba(0,0,0,0.15); position: relative; }
.tapas-landing .book::after { content: ""; position: absolute; top: 12%; left: 10%; right: 10%; height: 8%; background: rgba(255,255,255,0.35); }
.tapas-landing .book::before { content: ""; position: absolute; top: 28%; left: 10%; right: 10%; height: 4%; background: rgba(0,0,0,0.1); }
.tapas-landing .hero-art .ph-label { position: absolute; bottom: 14px; left: 14px; font-family: var(--f-mono); font-size: 11px; background: rgba(255,255,255,0.9); color: var(--ink); padding: 5px 10px; border-radius: 6px; letter-spacing: 0.04em; }
.tapas-landing .hero-sticker { position: absolute; top: -8px; right: -8px; width: 120px; height: 120px; border-radius: 999px; background: var(--pink); color: #fff; display: grid; place-items: center; text-align: center; font-family: var(--f-display); font-weight: 700; font-size: 15px; line-height: 1.1; padding: 14px; transform: rotate(12deg); box-shadow: 0 10px 30px -10px rgba(224,0,79,0.5); }
.tapas-landing .hero-sticker i { font-style: italic; font-weight: 500; display: block; font-size: 12px; opacity: 0.9; }
.tapas-landing .curve { display: block; width: 100%; height: 100px; }

.tapas-landing .marquee { background: var(--ink); color: #fff; padding: 18px 0; overflow: hidden; border-top: 1px solid rgba(255,255,255,0.08); border-bottom: 1px solid rgba(255,255,255,0.08); }
.tapas-landing .marquee-row { display: flex; gap: 44px; font-family: var(--f-display); font-style: italic; font-weight: 500; font-size: 28px; white-space: nowrap; animation: tapas-scroll 40s linear infinite; }
.tapas-landing .marquee-row span { display: inline-flex; align-items: center; gap: 44px; }
.tapas-landing .marquee-row .dot { width: 8px; height: 8px; border-radius: 999px; background: var(--lime); display: inline-block; }
@keyframes tapas-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }

.tapas-landing .section { padding: var(--pad-section) 0; }
.tapas-landing .head { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: end; margin-bottom: 56px; }
.tapas-landing .head .kicker { font-family: var(--f-mono); font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--purple); margin-bottom: 14px; display: inline-flex; align-items: center; gap: 10px; }
.tapas-landing .head .kicker::before { content: "●"; color: var(--pink); font-size: 10px; }
.tapas-landing .head h2 { font-size: clamp(40px, 4.6vw, 64px); line-height: 1.02; letter-spacing: -0.022em; text-wrap: balance; }
.tapas-landing .head h2 .p { color: var(--purple); font-style: italic; font-weight: 500; }
.tapas-landing .head .lede { font-size: 16px; color: var(--ink-2); max-width: 44ch; }

.tapas-landing .services { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.tapas-landing .service { background: var(--card); border: 1px solid var(--rule); border-radius: 22px; padding: 32px 28px 28px; display: flex; flex-direction: column; gap: 18px; transition: transform .2s, box-shadow .2s; position: relative; overflow: hidden; }
.tapas-landing .service:hover { transform: translateY(-4px); box-shadow: 0 20px 40px -20px rgba(0,0,0,0.15); }
.tapas-landing .service .ic { width: 56px; height: 56px; border-radius: 16px; display: grid; place-items: center; font-family: var(--f-display); font-weight: 700; font-size: 28px; }
.tapas-landing .service:nth-child(1) .ic { background: var(--lime); color: var(--ink); }
.tapas-landing .service:nth-child(2) .ic { background: var(--orange); color: #fff; }
.tapas-landing .service:nth-child(3) .ic { background: var(--purple); color: #fff; }
.tapas-landing .service h3 { font-size: 26px; line-height: 1.1; }
.tapas-landing .service p { color: var(--ink-2); font-size: 15px; }
.tapas-landing .service .more { margin-top: auto; display: inline-flex; align-items: center; gap: 10px; font-weight: 600; font-size: 13.5px; padding-top: 10px; }
.tapas-landing .service .more .a { width: 28px; height: 28px; border-radius: 999px; background: var(--ink); color: #fff; display: grid; place-items: center; font-size: 12px; }
.tapas-landing .service:hover .a { background: var(--pink); }

.tapas-landing .arrivals { display: grid; grid-template-columns: repeat(4, 1fr); gap: 22px; }
.tapas-landing .book-card { background: var(--card); border: 1px solid var(--rule); border-radius: 20px; padding: 18px; display: flex; flex-direction: column; gap: 14px; cursor: pointer; transition: transform .2s; }
.tapas-landing .book-card:hover { transform: translateY(-4px); }
.tapas-landing .cover { aspect-ratio: 3/4; border-radius: 12px; position: relative; overflow: hidden; }
.tapas-landing .cover .title-line { position: absolute; left: 14px; right: 14px; top: 18px; font-family: var(--f-display); font-weight: 700; font-size: 17px; line-height: 1.08; letter-spacing: -0.01em; color: #fff; }
.tapas-landing .cover .author-line { position: absolute; left: 14px; bottom: 14px; font-size: 11px; font-weight: 500; letter-spacing: 0.06em; color: rgba(255,255,255,0.9); text-transform: uppercase; }
.tapas-landing .cover-1 { background: linear-gradient(155deg, #8F4FD6 0%, #5a2b9a 100%); }
.tapas-landing .cover-2 { background: linear-gradient(155deg, #FF934A 0%, #c65a1e 100%); }
.tapas-landing .cover-3 { background: linear-gradient(155deg, #1a1a1a 0%, #3a3a3a 100%); }
.tapas-landing .cover-4 { background: linear-gradient(155deg, #E0004F 0%, #8a002f 100%); }
.tapas-landing .cover-5 { background: linear-gradient(155deg, #C9F27F 0%, #8ac13a 100%); }
.tapas-landing .cover-5 .title-line, .tapas-landing .cover-5 .author-line { color: var(--ink); }
.tapas-landing .cover-6 { background: linear-gradient(155deg, #3a3a3a 0%, #1a1a1a 100%); }
.tapas-landing .book-card .name { font-family: var(--f-display); font-weight: 700; font-size: 18px; line-height: 1.15; }
.tapas-landing .book-card .author { font-size: 13px; color: var(--muted); }
.tapas-landing .book-card .row { display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px dashed var(--rule); }
.tapas-landing .book-card .badge { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--purple); }
.tapas-landing .book-card .add { background: var(--ink); color: #fff; width: 34px; height: 34px; border-radius: 999px; display: grid; place-items: center; font-size: 14px; border: 0; cursor: pointer; }
.tapas-landing .book-card:hover .add { background: var(--pink); }

.tapas-landing .split { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.tapas-landing .panel { border-radius: 28px; padding: 48px; display: flex; flex-direction: column; gap: 22px; min-height: 420px; }
.tapas-landing .panel.lime { background: var(--lime); color: var(--ink); }
.tapas-landing .panel.ink  { background: var(--ink); color: #fff; }
.tapas-landing .panel h3 { font-size: 40px; line-height: 1.02; letter-spacing: -0.02em; color: inherit; }
.tapas-landing .panel.ink h3 { color: #fff; }
.tapas-landing .panel .k { font-family: var(--f-mono); font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; }
.tapas-landing .panel.lime .k { color: var(--purple); }
.tapas-landing .panel.ink .k { color: var(--lime); }
.tapas-landing .panel p { color: inherit; opacity: 0.85; max-width: 42ch; font-size: 15.5px; }
.tapas-landing .panel .list { display: flex; flex-direction: column; gap: 10px; margin: 6px 0; padding: 0; }
.tapas-landing .panel .list li { list-style: none; display: flex; gap: 12px; align-items: center; font-size: 15px; }
.tapas-landing .panel .list li::before { content: "✓"; width: 22px; height: 22px; border-radius: 999px; display: grid; place-items: center; font-size: 11px; font-weight: 700; }
.tapas-landing .panel.lime .list li::before { background: var(--ink); color: var(--lime); }
.tapas-landing .panel.ink .list li::before { background: var(--pink); color: #fff; }
.tapas-landing .panel .foot { display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; gap: 20px; }
.tapas-landing .panel .price-big { font-family: var(--f-display); font-weight: 800; font-size: 54px; line-height: 1; letter-spacing: -0.03em; }
.tapas-landing .panel .price-big small { font-size: 16px; font-weight: 500; opacity: 0.7; margin-left: 6px; }
.tapas-landing .panel .btn-local { background: var(--ink); color: #fff; border: 0; padding: 14px 22px; border-radius: 999px; font-weight: 600; font-size: 14.5px; display: inline-flex; align-items: center; gap: 10px; }
.tapas-landing .panel.lime .btn-local { background: var(--ink); color: #fff; }
.tapas-landing .panel.ink  .btn-local { background: var(--lime); color: var(--ink); }
.tapas-landing .panel .btn-local .a { width: 22px; height: 22px; border-radius: 999px; background: var(--pink); color: #fff; display: grid; place-items: center; font-size: 11px; }
.tapas-landing .panel.ink .btn-local .a { background: var(--ink); color: var(--lime); }

.tapas-landing .calendar { display: grid; grid-template-columns: 1fr; gap: 0; background: var(--card); border: 1px solid var(--rule); border-radius: 24px; overflow: hidden; }
.tapas-landing .row-ev { display: grid; grid-template-columns: 120px 1.4fr 1fr auto; gap: 32px; align-items: center; padding: 24px 32px; border-top: 1px solid var(--rule); cursor: pointer; transition: background .15s; }
.tapas-landing .row-ev:first-child { border-top: 0; }
.tapas-landing .row-ev:hover { background: #fbf7ec; }
.tapas-landing .row-ev .d { font-family: var(--f-display); font-weight: 700; font-size: 14px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--purple); }
.tapas-landing .row-ev .d b { display: block; font-size: 40px; color: var(--ink); letter-spacing: -0.02em; text-transform: none; margin-top: 2px; line-height: 1; }
.tapas-landing .row-ev .t h4 { font-size: 22px; line-height: 1.15; }
.tapas-landing .row-ev .t h4 em { color: var(--purple); font-style: italic; font-weight: 500; }
.tapas-landing .row-ev .t p { font-size: 14px; color: var(--muted); margin-top: 4px; }
.tapas-landing .row-ev .tag { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; padding: 6px 12px; border-radius: 999px; justify-self: start; }
.tapas-landing .tag.o { background: #ffeedd; color: #a84a0f; }
.tapas-landing .tag.p { background: #f0e3ff; color: #5a2b9a; }
.tapas-landing .tag.l { background: #e4f5bf; color: #4a6418; }
.tapas-landing .tag.k { background: #ffe1eb; color: #a30039; }
.tapas-landing .row-ev .go { width: 38px; height: 38px; border-radius: 999px; background: var(--ink); color: #fff; display: grid; place-items: center; font-size: 14px; }
.tapas-landing .row-ev:hover .go { background: var(--pink); }

.tapas-landing .testimonial { background: var(--orange); border-radius: 28px; padding: 72px 64px; display: grid; grid-template-columns: 1fr 1.2fr; gap: 48px; align-items: center; color: #1a1a1a; }
.tapas-landing .testimonial .quote-mark { font-family: var(--f-display); font-weight: 800; font-size: 160px; line-height: 0.7; color: #1a1a1a; }
.tapas-landing .testimonial blockquote { margin: 0; font-family: var(--f-display); font-weight: 500; font-style: italic; font-size: 28px; line-height: 1.25; letter-spacing: -0.01em; color: var(--ink); }
.tapas-landing .testimonial .who { margin-top: 28px; display: flex; align-items: center; gap: 14px; }
.tapas-landing .testimonial .who .ava { width: 48px; height: 48px; border-radius: 999px; background: var(--ink); color: var(--lime); display: grid; place-items: center; font-weight: 700; font-family: var(--f-display); font-size: 18px; }
.tapas-landing .testimonial .who b { display: block; font-weight: 600; font-size: 15px; }
.tapas-landing .testimonial .who span { font-size: 13px; opacity: 0.7; }

.tapas-landing .newsletter { background: var(--ink); color: #fff; border-radius: 32px; padding: 64px; display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; }
.tapas-landing .newsletter h3 { color: #fff; font-size: 48px; line-height: 1.0; letter-spacing: -0.02em; }
.tapas-landing .newsletter h3 em { color: var(--lime); font-style: italic; font-weight: 500; }
.tapas-landing .newsletter p { color: rgba(255,255,255,0.7); max-width: 40ch; margin-top: 14px; }
.tapas-landing .nl-form { display: flex; gap: 0; background: #fff; border-radius: 999px; padding: 6px; }
.tapas-landing .nl-form input { flex: 1; border: 0; outline: none; background: transparent; padding: 14px 20px; font-family: var(--f-ui); font-size: 15px; color: var(--ink); }
.tapas-landing .nl-form button { background: var(--pink); color: #fff; border: 0; cursor: pointer; padding: 12px 24px; border-radius: 999px; font-weight: 600; font-size: 14px; }
.tapas-landing .nl-form button:hover { background: var(--lime); color: var(--ink); }

.tapas-landing footer.site-foot { padding: 80px 0 40px; }
.tapas-landing .foot-grid { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr; gap: 48px; padding-bottom: 48px; border-bottom: 1px solid var(--rule); }
.tapas-landing .foot-brand .name { font-family: var(--f-display); font-weight: 700; font-size: 26px; line-height: 1.05; }
.tapas-landing .foot-brand .name i { font-style: italic; font-weight: 500; display: block; font-size: 17px; color: var(--muted); }
.tapas-landing .foot-brand p { color: var(--muted); margin-top: 16px; max-width: 32ch; font-size: 14.5px; }
.tapas-landing .foot-col h5 { font-family: var(--f-ui); font-weight: 600; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink); margin: 0 0 16px; }
.tapas-landing .foot-col ul { list-style: none; padding: 0; margin: 0; }
.tapas-landing .foot-col li { margin-bottom: 10px; font-size: 14.5px; color: var(--ink-2); }
.tapas-landing .foot-col a:hover { color: var(--pink); }
.tapas-landing .foot-bottom { display: flex; justify-content: space-between; align-items: center; padding-top: 24px; font-family: var(--f-mono); font-size: 12px; color: var(--muted); letter-spacing: 0.04em; }
.tapas-landing .socials { display: flex; gap: 10px; }
.tapas-landing .socials a { width: 36px; height: 36px; border-radius: 999px; background: var(--lime); display: grid; place-items: center; color: var(--ink); font-size: 13px; font-weight: 700; }
.tapas-landing .socials a:hover { background: var(--pink); color: #fff; }
`.trim();

// ---- Content arrays -------------------------------------------------
const ARRIVALS = [
  { cover: 'cover-1', title: 'The Magic Mountain',   author: 'Thomas Mann',            badge: 'Slow Fiction' },
  { cover: 'cover-2', title: 'The Years',            author: 'Annie Ernaux',           badge: 'Memoir' },
  { cover: 'cover-3', title: 'Solenoid',             author: 'Mircea Cărtărescu',      badge: 'Translation' },
  { cover: 'cover-4', title: 'Bluets',               author: 'Maggie Nelson',          badge: 'Poetry' },
  { cover: 'cover-5', title: "A Room of One's Own",  author: 'Virginia Woolf',         badge: 'Essays' },
  { cover: 'cover-6', title: 'The Waves',            author: 'Virginia Woolf',         badge: 'Novel' },
  { cover: 'cover-2', title: 'Minor Detail',         author: 'Adania Shibli',          badge: 'Translation' },
  { cover: 'cover-1', title: 'Checkout 19',          author: 'Claire-Louise Bennett',  badge: 'Novel' },
];

const EVENTS = [
  { m: 'Apr', d: '23', title: 'Slow Fiction',   emph: 'Club',           copy: 'Opening pages of The Magic Mountain. Sherry & olives.',        t: 'p', tag: 'Weekly · Thu 7p' },
  { m: 'Apr', d: '27', title: 'Translators &',  emph: 'Twilight',       copy: 'An evening with translator Margaret Jull Costa on Saramago.',   t: 'o', tag: 'Guest · Mon 7:30p' },
  { m: 'May', d: '02', title: 'Saturday',       emph: 'Silent Reading', copy: 'Two quiet hours, a pot of coffee, a plate of toast. No phones.', t: 'l', tag: 'Weekly · Sat 10a' },
  { m: 'May', d: '08', title: 'Poetry on',      emph: 'Small Plates',   copy: 'A tasting menu paired to six poems. Lorca, Szymborska, Berry.',  t: 'k', tag: 'Prix Fixe · Fri 8p' },
  { m: 'May', d: '15', title: 'First-Draft',    emph: 'Friday',         copy: 'One page of work-in-progress. Two minutes each, then we eat.',   t: 'p', tag: 'Members · Fri 7p' },
  { m: 'May', d: '21', title: 'The',            emph: 'Novella',        copy: 'Read a novella that afternoon; meet for dinner to discuss.',     t: 'o', tag: 'Single Session · Thu 4p', suffix: ' Supper' },
];

const SHELF = [
  { h: '82%', c: '#8F4FD6' }, { h: '96%', c: '#1a1a1a' }, { h: '70%', c: '#FF934A' },
  { h: '88%', c: '#E0004F' }, { h: '76%', c: '#C9F27F' }, { h: '92%', c: '#3a3a3a' },
  { h: '80%', c: '#FF934A' }, { h: '68%', c: '#8F4FD6' }, { h: '94%', c: '#1a1a1a' },
  { h: '72%', c: '#E0004F' }, { h: '86%', c: '#C9F27F' }, { h: '78%', c: '#3a3a3a' },
];

// ---- Section builders ----------------------------------------------
// No nav here — the primary navbar now lives outside the v2 tree in
// tapas-store/src/components/TapasStickyNav.js so it can react to the
// current route (active-state coloring, responsive hamburger menu).
// The tree still owns the hero band and everything below.

const hero = () => node('section', {
  classes: ['hero'],
  children: [
    node('div', { classes: ['hero-copy'], children: [
      node('div', { classes: ['tag'], textContent: 'Reading room · Book club · Small plates' }),
      node('h1', { children: [
        { text: 'A quiet room for ', marks: [] },
        node('span', { classes: ['accent'], textContent: 'big books' }),
        { text: ' & ', marks: [] },
        node('span', { classes: ['u'], textContent: 'small plates.' }),
      ]}),
      node('p', { textContent: "Tapas Reading Cafe is a neighborhood library-cafe — borrow a book, order a plate, and stay as long as the chapter asks for. Weekly book clubs, silent reading hours, and a shelf that's always rotating." }),
      node('div', { classes: ['hero-ctas'], children: [
        node('a', { classes: ['btn', 'primary'], attributes: { href: '/books' }, children: [
          { text: 'Browse the library', marks: [] },
          node('span', { classes: ['arrow'], textContent: '→' }),
        ]}),
        node('a', { classes: ['btn', 'ghost'], attributes: { href: '#events' }, textContent: 'See events' }),
      ]}),
      node('div', { classes: ['hero-meta'], children: [
        ...[
          { v: '2,400+', l: 'BOOKS ON SHELF' },
          { v: '6',      l: 'WEEKLY CLUBS' },
          { v: '312',    l: 'ACTIVE MEMBERS' },
        ].map(s => node('div', { classes: ['stat'], children: [
          node('b', { textContent: s.v }),
          node('span', { textContent: s.l }),
        ]})),
      ]}),
    ]}),
    node('div', { classes: ['hero-art'], children: [
      node('div', { classes: ['ph'] }),
      node('div', { classes: ['shelf'], children: SHELF.map(b => node('div', {
        classes: ['book'],
        attributes: { style: `height:${b.h}; background:${b.c};` },
      })) }),
      node('div', { classes: ['ph-label'], textContent: 'library.jpg — our wall of books' }),
      node('div', { classes: ['hero-sticker'], children: [
        { text: 'Open today', marks: [] },
        node('i', { textContent: '10a – 11p' }),
      ]}),
    ]}),
  ],
});

const marquee = () => {
  const phrases = 'Borrow a book · stay for a plate · join a club · read on the house · Borrow a book · stay for a plate · join a club · read on the house';
  const span = () => node('span', { children: phrases.split(' · ').flatMap(p => [
    { text: `${p} `, marks: [] },
    node('span', { classes: ['dot'] }),
    { text: ' ', marks: [] },
  ])});
  return node('div', { classes: ['marquee'], children: [
    node('div', { classes: ['marquee-row'], children: [span(), span()] }),
  ]});
};

const head = (kicker, lead, accent, lede) => node('div', {
  classes: ['head'], children: [
    node('div', { children: [
      node('div', { classes: ['kicker'], textContent: kicker }),
      node('h2', { children: [
        { text: `${lead} `, marks: [] },
        node('span', { classes: ['p'], textContent: accent }),
      ]}),
    ]}),
    node('p', { classes: ['lede'], textContent: lede }),
  ],
});

const services = () => node('section', {
  classes: ['section'], attributes: { id: 'services' }, children: [
    node('div', { classes: ['wrap'], children: [
      head('Our Services', 'Everything a reader needs,', 'under one roof.',
        'Three ways to use the room: take a book home, borrow one for a week, or come read with a group. Coffee, wine, and tapas served throughout.'),
      node('div', { classes: ['services'], children: [
        ...[
          { icon: 'Aa', title: 'Buying Books',        copy: 'A small, carefully-chosen shelf for purchase — new releases, small presses, and staff favorites. Always 10% off for members.', cta: 'Visit the shop',      href: '/books' },
          { icon: '↺',  title: 'Lending Library',     copy: 'Over 2,400 books you can borrow on the honor system. Take two home at a time, return within three weeks.',                      cta: 'Browse the library',  href: '/books' },
          { icon: '☕', title: 'Events & Book Clubs', copy: 'Six weekly clubs, poetry suppers, and silent reading Saturdays. Come once as a guest — decide later.',                            cta: 'See the calendar',    href: '#events' },
        ].map(s => node('div', { classes: ['service'], children: [
          node('div', { classes: ['ic'], textContent: s.icon }),
          node('h3', { textContent: s.title }),
          node('p', { textContent: s.copy }),
          node('a', { classes: ['more'], attributes: { href: s.href }, children: [
            { text: `${s.cta} `, marks: [] },
            node('span', { classes: ['a'], textContent: '→' }),
          ]}),
        ]})),
      ]}),
    ]}),
  ],
});

const arrivals = () => node('section', {
  classes: ['section'], attributes: { id: 'library', style: 'padding-top:20px;' }, children: [
    node('div', { classes: ['wrap'], children: [
      head('New on the shelf', "This week's", 'arrivals.',
        "Freshly unpacked from the small-press boxes and the translators' stacks. Borrow for free, or take one home."),
      node('div', { classes: ['arrivals'], children: ARRIVALS.map(b => node('div', {
        classes: ['book-card'], children: [
          node('div', { classes: ['cover', b.cover], children: [
            node('div', { classes: ['title-line'], textContent: b.title }),
            node('div', { classes: ['author-line'], textContent: b.author }),
          ]}),
          node('div', { children: [
            node('div', { classes: ['name'], textContent: b.title }),
            node('div', { classes: ['author'], textContent: b.author }),
          ]}),
          node('div', { classes: ['row'], children: [
            node('span', { classes: ['badge'], textContent: b.badge }),
            node('button', { classes: ['add'], attributes: { 'aria-label': 'Add' }, textContent: '+' }),
          ]}),
        ],
      })) }),
    ]}),
  ],
});

const membership = () => {
  const panel = (variant, p) => node('div', { classes: ['panel', variant], children: [
    node('div', { classes: ['k'], textContent: p.k }),
    node('h3', { textContent: p.title }),
    node('p', { textContent: p.copy }),
    node('ul', { classes: ['list'], children: p.items.map(it => node('li', { textContent: it })) }),
    node('div', { classes: ['foot'], children: [
      node('div', { classes: ['price-big'], children: [
        { text: p.price, marks: [] },
        p.priceSuffix ? node('small', { textContent: p.priceSuffix }) : node('small'),
      ]}),
      node('a', { classes: ['btn-local'], attributes: { href: p.cta_href }, children: [
        { text: `${p.cta} `, marks: [] },
        node('span', { classes: ['a'], textContent: '→' }),
      ]}),
    ]}),
  ]});
  return node('section', {
    classes: ['section'], attributes: { id: 'membership', style: 'padding-top:40px;' }, children: [
      node('div', { classes: ['wrap'], children: [
        head('Pricing & Plans', 'Two ways to', 'pull up a chair.',
          'Drop in whenever you like — or become a member and unlock every club, a quarterly book, and 10% off the kitchen.'),
        node('div', { classes: ['split'], children: [
          panel('lime', {
            k: 'Drop-in',
            title: 'The Reading Room',
            copy: 'Free to enter. Borrow one book at a time, read all afternoon. Buy a coffee or a plate if the mood strikes.',
            items: ['Lending library, honor system', 'Wi-Fi, quiet tables, long hours', 'One guest club visit per month'],
            price: 'Free', priceSuffix: '',
            cta: 'Visit today', cta_href: '#visit',
          }),
          panel('ink', {
            k: 'Membership',
            title: 'The Chair',
            copy: 'A seat at every club, a book of your choice each quarter, 10% off the kitchen, and first dibs on supper events.',
            items: ['All six weekly book clubs', 'One book per quarter, on us', '10% off food, wine & coffee', 'Priority RSVP for supper events'],
            price: '$18', priceSuffix: '/month',
            cta: 'Become a member', cta_href: '#join',
          }),
        ]}),
      ]}),
    ],
  });
};

const events = () => node('section', {
  classes: ['section'], attributes: { id: 'events', style: 'padding-top:40px;' }, children: [
    node('div', { classes: ['wrap'], children: [
      head('Upcoming Events', 'On the calendar', 'this season.',
        'Weekly clubs, translator evenings, poetry suppers, and the occasional quiet Saturday. All welcome, members first.'),
      node('div', { classes: ['calendar'], children: EVENTS.map(e => node('div', {
        classes: ['row-ev'], children: [
          node('div', { classes: ['d'], children: [
            { text: e.m, marks: [] },
            node('b', { textContent: e.d }),
          ]}),
          node('div', { classes: ['t'], children: [
            node('h4', { children: [
              { text: `${e.title} `, marks: [] },
              node('em', { textContent: e.emph }),
              { text: e.suffix || '', marks: [] },
            ]}),
            node('p', { textContent: e.copy }),
          ]}),
          node('span', { classes: ['tag', e.t], textContent: e.tag }),
          node('span', { classes: ['go'], textContent: '→' }),
        ],
      })) }),
    ]}),
  ],
});

const testimonial = () => node('section', {
  classes: ['section'], attributes: { style: 'padding-top:0;' }, children: [
    node('div', { classes: ['wrap'], children: [
      node('div', { classes: ['testimonial'], children: [
        node('div', { children: [
          node('div', { classes: ['quote-mark'], textContent: '"' }),
          node('div', { attributes: { style: 'font-family:var(--f-mono); font-size:12px; letter-spacing:0.18em; text-transform:uppercase; margin-top:10px;' }, textContent: 'What readers say' }),
        ]}),
        node('div', { children: [
          node('blockquote', { children: [
            { text: "I came in on a Tuesday for a coffee and ended up finishing my novel. Three months later I'm hosting the Silent Reading club. It is the ", marks: [] },
            node('i', { textContent: 'warmest quiet place' }),
            { text: " I've ever found.", marks: [] },
          ]}),
          node('div', { classes: ['who'], children: [
            node('div', { classes: ['ava'], textContent: 'RK' }),
            node('div', { children: [
              node('b', { textContent: 'Rukmini K.' }),
              node('span', { textContent: 'Member since 2024 · Silent Reading host' }),
            ]}),
          ]}),
        ]}),
      ]}),
    ]}),
  ],
});

const newsletter = () => node('section', {
  classes: ['section'], attributes: { id: 'join', style: 'padding-top:0;' }, children: [
    node('div', { classes: ['wrap'], children: [
      node('div', { classes: ['newsletter'], children: [
        node('div', { children: [
          node('div', { attributes: { style: 'font-family:var(--f-mono); font-size:12px; letter-spacing:0.18em; text-transform:uppercase; color:var(--lime); margin-bottom:14px;' }, textContent: 'The Dispatch' }),
          node('h3', { children: [
            { text: 'A letter on ', marks: [] },
            node('em', { textContent: "what we're reading." }),
          ]}),
          node('p', { textContent: "One email a month. This week's shelf, next week's clubs, and a paragraph we couldn't stop thinking about." }),
        ]}),
        node('form', { classes: ['nl-form'], children: [
          node('input', { attributes: { type: 'email', placeholder: 'your@email.com', required: '' } }),
          node('button', { attributes: { type: 'submit' }, textContent: 'Subscribe' }),
        ]}),
      ]}),
    ]}),
  ],
});

const footer = () => node('footer', {
  classes: ['wrap', 'site-foot'], children: [
    node('div', { classes: ['foot-grid'], children: [
      node('div', { classes: ['foot-brand'], children: [
        node('div', { classes: ['name'], children: [
          { text: 'Tapas reading cafe', marks: [] },
          node('i', { textContent: 'a small room for big books' }),
        ]}),
        node('p', { textContent: 'A neighborhood library-cafe serving small plates, natural wine, and six weekly book clubs.' }),
      ]}),
      node('div', { classes: ['foot-col'], children: [
        node('h5', { textContent: 'Visit' }),
        node('ul', { children: [
          node('li', { textContent: '14 Haven Street' }),
          node('li', { textContent: 'Reading, MA 01867' }),
          node('li', { textContent: 'Tue–Sun · 10a–11p' }),
        ]}),
      ]}),
      node('div', { classes: ['foot-col'], children: [
        node('h5', { textContent: 'Read' }),
        node('ul', { children: [
          node('li', { children: [node('a', { attributes: { href: '/books' },  textContent: 'Library' })] }),
          node('li', { children: [node('a', { attributes: { href: '#events' }, textContent: 'Book Clubs' })] }),
          node('li', { children: [node('a', { attributes: { href: '/blog' },   textContent: 'The Journal' })] }),
          node('li', { children: [node('a', { attributes: { href: '#archive' }, textContent: 'Archive' })] }),
        ]}),
      ]}),
      node('div', { classes: ['foot-col'], children: [
        node('h5', { textContent: 'More' }),
        node('ul', { children: [
          node('li', { children: [node('a', { attributes: { href: '#events' },  textContent: 'Private Events' })] }),
          node('li', { children: [node('a', { attributes: { href: '#gift' },    textContent: 'Gift Cards' })] }),
          node('li', { children: [node('a', { attributes: { href: '#careers' }, textContent: 'Careers' })] }),
          node('li', { children: [node('a', { attributes: { href: '#contact' }, textContent: 'Contact' })] }),
        ]}),
      ]}),
    ]}),
    node('div', { classes: ['foot-bottom'], children: [
      node('span', { textContent: `© ${new Date().getFullYear()} Tapas Reading Cafe · Reading, MA` }),
      node('div', { classes: ['socials'], children: [
        node('a', { attributes: { href: '#ig' }, textContent: 'IG' }),
        node('a', { attributes: { href: '#fb' }, textContent: 'FB' }),
        node('a', { attributes: { href: '#sp' }, textContent: 'SP' }),
      ]}),
    ]}),
  ],
});

const root = () => node('body', {
  classes: ['tapas-landing'],
  children: [
    styleNode(RAW_CSS),
    node('div', { classes: ['hero-band'], children: [
      node('div', { classes: ['wrap'], children: [hero()] }),
    ]}),
    marquee(),
    services(),
    arrivals(),
    membership(),
    events(),
    testimonial(),
    newsletter(),
    footer(),
  ],
});

console.log(JSON.stringify(root(), null, 2));
