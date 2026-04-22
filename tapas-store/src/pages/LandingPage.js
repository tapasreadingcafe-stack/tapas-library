// =====================================================================
// LandingPage
//
// Hand-authored Tapas Reading Cafe landing page. Ported straight from
// the HTML design in /Users/vinayak/Downloads/Landing Page.html so the
// layout, typography, and brand palette match the approved mockup.
//
// The CSS is embedded in a single <style> block scoped by the body
// attribute selectors on the outer wrapper — keeps the styling aligned
// with the design token system (--lime, --pink, --purple, etc.) without
// spilling into the rest of the storefront.
//
// Chrome: this page renders its own nav and footer, so AppShell's
// GlobalHeader / GlobalFooter detect the `/` route and step aside.
// =====================================================================
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

// Styles kept as a single template string so the 500+ line CSS stays
// readable. Loaded via dangerouslySetInnerHTML to avoid JSX curly-brace
// escaping.
const LANDING_CSS = `
  :root {
    --lime: #C9F27F;
    --lime-2: #DCF59A;
    --orange: #FF934A;
    --purple: #8F4FD6;
    --pink: #E0004F;
    --ink: #1a1a1a;
    --ink-2: #3a3a3a;
    --muted: #6e6e6e;
    --rule: #ececea;
    --landing-bg: #faf8f4;
    --card: #ffffff;
    --f-display: "Fraunces", Georgia, serif;
    --f-ui: "Inter", system-ui, sans-serif;
    --f-mono: "JetBrains Mono", ui-monospace, monospace;
    --pad-section: 100px;
    --pad-gutter: 64px;
  }
  .landing * { box-sizing: border-box; }
  .landing {
    font-family: var(--f-ui);
    color: var(--ink);
    background: var(--landing-bg);
    -webkit-font-smoothing: antialiased;
    font-size: 16px;
  }
  .landing a { color: inherit; text-decoration: none; }
  .landing img { max-width: 100%; display: block; }
  .landing .wrap { max-width: 1320px; margin: 0 auto; padding: 0 var(--pad-gutter); }
  .landing h1, .landing h2, .landing h3, .landing h4 {
    font-family: var(--f-display); font-weight: 700; margin: 0;
    letter-spacing: -0.015em; color: var(--ink);
  }
  .landing h1 em, .landing h2 em, .landing h3 em { font-style: italic; font-weight: 500; }
  .landing p { line-height: 1.6; margin: 0; }

  /* NAV */
  .landing .nav-band { background: var(--lime); }
  .landing .nav {
    display: grid; grid-template-columns: 1fr auto 1fr;
    align-items: center; padding: 20px 0; gap: 40px;
  }
  .landing .nav .links { display: flex; gap: 36px; align-items: center; font-size: 14.5px; font-weight: 500; color: var(--ink); }
  .landing .nav .links a:hover { color: var(--pink); }
  .landing .nav .brand {
    font-family: var(--f-display); font-weight: 700;
    font-size: 22px; line-height: 1.05; text-align: center;
    color: var(--ink); letter-spacing: -0.01em; white-space: nowrap;
  }
  .landing .nav .brand .row1 { font-style: italic; font-weight: 500; font-size: 17px; display: block; }
  .landing .nav .brand .row2 { display: block; }
  .landing .nav .right { display: flex; gap: 16px; justify-content: flex-end; align-items: center; font-size: 14.5px; font-weight: 500; }
  .landing .nav .pill {
    background: var(--pink); color: #fff; padding: 10px 22px;
    border-radius: 999px; font-weight: 600; font-size: 14px;
  }
  .landing .nav .pill:hover { background: var(--ink); }
  .landing .nav .cart {
    width: 38px; height: 38px; border-radius: 999px; background: #fff;
    display: inline-grid; place-items: center;
    border: 1px solid rgba(0,0,0,0.08);
  }

  /* HERO */
  .landing .hero-band { background: var(--lime); position: relative; overflow: hidden; }
  .landing .hero {
    display: grid; grid-template-columns: 1.05fr 1fr; gap: 64px;
    align-items: center; padding: 40px 0 80px;
  }
  .landing .hero-copy .tag {
    display: inline-flex; align-items: center; gap: 10px;
    background: rgba(255,255,255,0.55); padding: 8px 14px;
    border-radius: 999px; font-size: 12px; font-weight: 600;
    letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-2);
    margin-bottom: 22px; border: 1px solid rgba(0,0,0,0.06);
  }
  .landing .hero-copy .tag::before {
    content: ""; width: 8px; height: 8px;
    background: var(--pink); border-radius: 999px; display: inline-block;
  }
  .landing .hero h1 {
    font-size: clamp(56px, 6.4vw, 92px); line-height: 0.98;
    letter-spacing: -0.025em; margin-bottom: 24px; text-wrap: balance;
  }
  .landing .hero h1 .accent { color: var(--purple); font-style: italic; font-weight: 500; }
  .landing .hero h1 .u { position: relative; display: inline-block; }
  .landing .hero h1 .u::after {
    content: ""; position: absolute; left: 0; right: 0; bottom: 4px;
    height: 10px; background: var(--orange); opacity: 0.55; z-index: -1; border-radius: 3px;
  }
  .landing .hero-copy p {
    font-size: 17px; color: var(--ink-2); max-width: 48ch;
    margin-bottom: 32px; line-height: 1.55;
  }
  .landing .hero-ctas { display: flex; gap: 14px; align-items: center; }
  .landing .btn {
    display: inline-flex; align-items: center; gap: 10px;
    padding: 15px 24px; border-radius: 999px;
    font-family: var(--f-ui); font-weight: 600; font-size: 14.5px;
    border: 0; cursor: pointer;
  }
  .landing .btn.primary { background: var(--ink); color: #fff; }
  .landing .btn.primary:hover { background: var(--pink); }
  .landing .btn.ghost { background: transparent; color: var(--ink); border: 1.5px solid var(--ink); }
  .landing .btn.ghost:hover { background: var(--ink); color: #fff; }
  .landing .btn .arrow {
    width: 22px; height: 22px; border-radius: 999px; background: var(--pink);
    display: inline-grid; place-items: center; color: #fff; font-size: 12px;
  }
  .landing .btn.primary .arrow { background: var(--lime); color: var(--ink); }

  .landing .hero-meta { display: flex; gap: 40px; margin-top: 48px; }
  .landing .hero-meta .stat b {
    display: block; font-family: var(--f-display); font-weight: 700;
    font-size: 32px; letter-spacing: -0.02em; color: var(--ink);
  }
  .landing .hero-meta .stat span { font-size: 12.5px; color: var(--ink-2); letter-spacing: 0.04em; }

  /* hero art */
  .landing .hero-art {
    position: relative; aspect-ratio: 1/1; border-radius: 24px;
    overflow: hidden; background: #d9d2c5;
    box-shadow: 0 30px 60px -30px rgba(0,0,0,0.3);
  }
  .landing .hero-art .ph {
    position: absolute; inset: 0;
    background:
      radial-gradient(ellipse at 30% 35%, rgba(255,147,74,0.25), transparent 55%),
      radial-gradient(ellipse at 75% 60%, rgba(143,79,214,0.22), transparent 60%),
      repeating-linear-gradient(135deg, #cfc5b0 0 16px, #c6bba3 16px 32px);
  }
  .landing .shelf {
    position: absolute; left: 8%; right: 8%; bottom: 10%;
    display: flex; gap: 6px; align-items: flex-end; height: 62%;
  }
  .landing .book {
    flex: 1; border-radius: 3px 3px 1px 1px;
    box-shadow: inset -4px 0 0 rgba(0,0,0,0.08), 0 2px 0 rgba(0,0,0,0.15);
    position: relative;
  }
  .landing .book::after {
    content: ""; position: absolute; top: 12%; left: 10%; right: 10%;
    height: 8%; background: rgba(255,255,255,0.35);
  }
  .landing .book::before {
    content: ""; position: absolute; top: 28%; left: 10%; right: 10%;
    height: 4%; background: rgba(0,0,0,0.1);
  }
  .landing .hero-art .ph-label {
    position: absolute; bottom: 14px; left: 14px;
    font-family: var(--f-mono); font-size: 11px;
    background: rgba(255,255,255,0.9); color: var(--ink);
    padding: 5px 10px; border-radius: 6px; letter-spacing: 0.04em;
  }
  .landing .hero-sticker {
    position: absolute; top: -8px; right: -8px;
    width: 120px; height: 120px; border-radius: 999px;
    background: var(--pink); color: #fff;
    display: grid; place-items: center; text-align: center;
    font-family: var(--f-display); font-weight: 700; font-size: 15px;
    line-height: 1.1; padding: 14px; transform: rotate(12deg);
    box-shadow: 0 10px 30px -10px rgba(224,0,79,0.5);
  }
  .landing .hero-sticker i { font-style: italic; font-weight: 500; display: block; font-size: 12px; opacity: 0.9; }

  .landing .curve { display: block; width: 100%; height: 100px; }

  /* MARQUEE */
  .landing .marquee {
    background: var(--ink); color: #fff; padding: 18px 0; overflow: hidden;
    border-top: 1px solid rgba(255,255,255,0.08);
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .landing .marquee-row {
    display: flex; gap: 44px;
    font-family: var(--f-display); font-style: italic; font-weight: 500; font-size: 28px;
    white-space: nowrap; animation: tapas-scroll 40s linear infinite;
  }
  .landing .marquee-row span { display: inline-flex; align-items: center; gap: 44px; }
  .landing .marquee-row .dot {
    width: 8px; height: 8px; border-radius: 999px; background: var(--lime); display: inline-block;
  }
  @keyframes tapas-scroll {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }

  /* SECTION HEAD */
  .landing .section { padding: var(--pad-section) 0; }
  .landing .head {
    display: grid; grid-template-columns: 1fr 1fr; gap: 60px;
    align-items: end; margin-bottom: 56px;
  }
  .landing .head .kicker {
    font-family: var(--f-mono); font-size: 12px; letter-spacing: 0.18em;
    text-transform: uppercase; color: var(--purple); margin-bottom: 14px;
    display: inline-flex; align-items: center; gap: 10px;
  }
  .landing .head .kicker::before { content: "●"; color: var(--pink); font-size: 10px; }
  .landing .head h2 {
    font-size: clamp(40px, 4.6vw, 64px); line-height: 1.02;
    letter-spacing: -0.022em; text-wrap: balance;
  }
  .landing .head h2 .p { color: var(--purple); font-style: italic; font-weight: 500; }
  .landing .head .lede { font-size: 16px; color: var(--ink-2); max-width: 44ch; }

  /* SERVICES */
  .landing .services { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
  .landing .service {
    background: var(--card); border: 1px solid var(--rule); border-radius: 22px;
    padding: 32px 28px 28px; display: flex; flex-direction: column; gap: 18px;
    transition: transform .2s, box-shadow .2s; position: relative; overflow: hidden;
  }
  .landing .service:hover { transform: translateY(-4px); box-shadow: 0 20px 40px -20px rgba(0,0,0,0.15); }
  .landing .service .ic {
    width: 56px; height: 56px; border-radius: 16px;
    display: grid; place-items: center;
    font-family: var(--f-display); font-weight: 700; font-size: 28px;
  }
  .landing .service:nth-child(1) .ic { background: var(--lime); color: var(--ink); }
  .landing .service:nth-child(2) .ic { background: var(--orange); color: #fff; }
  .landing .service:nth-child(3) .ic { background: var(--purple); color: #fff; }
  .landing .service h3 { font-size: 26px; line-height: 1.1; }
  .landing .service p { color: var(--ink-2); font-size: 15px; }
  .landing .service .more {
    margin-top: auto; display: inline-flex; align-items: center; gap: 10px;
    font-weight: 600; font-size: 13.5px; padding-top: 10px;
  }
  .landing .service .more .a {
    width: 28px; height: 28px; border-radius: 999px; background: var(--ink); color: #fff;
    display: grid; place-items: center; font-size: 12px;
  }
  .landing .service:hover .a { background: var(--pink); }

  /* ARRIVALS */
  .landing .arrivals { display: grid; grid-template-columns: repeat(4, 1fr); gap: 22px; }
  .landing .book-card {
    background: var(--card); border: 1px solid var(--rule); border-radius: 20px;
    padding: 18px; display: flex; flex-direction: column; gap: 14px;
    cursor: pointer; transition: transform .2s;
  }
  .landing .book-card:hover { transform: translateY(-4px); }
  .landing .cover {
    aspect-ratio: 3/4; border-radius: 12px; position: relative; overflow: hidden;
  }
  .landing .cover .title-line {
    position: absolute; left: 14px; right: 14px; top: 18px;
    font-family: var(--f-display); font-weight: 700; font-size: 17px;
    line-height: 1.08; letter-spacing: -0.01em; color: #fff;
  }
  .landing .cover .author-line {
    position: absolute; left: 14px; bottom: 14px;
    font-size: 11px; font-weight: 500; letter-spacing: 0.06em;
    color: rgba(255,255,255,0.9); text-transform: uppercase;
  }
  .landing .cover-1 { background: linear-gradient(155deg, #8F4FD6 0%, #5a2b9a 100%); }
  .landing .cover-2 { background: linear-gradient(155deg, #FF934A 0%, #c65a1e 100%); }
  .landing .cover-3 { background: linear-gradient(155deg, #1a1a1a 0%, #3a3a3a 100%); }
  .landing .cover-4 { background: linear-gradient(155deg, #E0004F 0%, #8a002f 100%); }
  .landing .cover-5 { background: linear-gradient(155deg, #C9F27F 0%, #8ac13a 100%); }
  .landing .cover-5 .title-line, .landing .cover-5 .author-line { color: var(--ink); }
  .landing .cover-6 { background: linear-gradient(155deg, #3a3a3a 0%, #1a1a1a 100%); }

  .landing .book-card .meta { display: flex; justify-content: space-between; align-items: baseline; }
  .landing .book-card .name { font-family: var(--f-display); font-weight: 700; font-size: 18px; line-height: 1.15; }
  .landing .book-card .author { font-size: 13px; color: var(--muted); }
  .landing .book-card .price { font-family: var(--f-display); font-weight: 700; font-size: 18px; color: var(--ink); }
  .landing .book-card .row {
    display: flex; justify-content: space-between; align-items: center;
    padding-top: 10px; border-top: 1px dashed var(--rule);
  }
  .landing .book-card .badge {
    font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--purple);
  }
  .landing .book-card .add {
    background: var(--ink); color: #fff; width: 34px; height: 34px;
    border-radius: 999px; display: grid; place-items: center;
    font-size: 14px; border: 0; cursor: pointer;
  }
  .landing .book-card:hover .add { background: var(--pink); }

  /* SPLIT */
  .landing .split { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .landing .panel {
    border-radius: 28px; padding: 48px;
    display: flex; flex-direction: column; gap: 22px; min-height: 420px;
  }
  .landing .panel.lime { background: var(--lime); color: var(--ink); }
  .landing .panel.ink  { background: var(--ink); color: #fff; }
  .landing .panel h3 { font-size: 40px; line-height: 1.02; letter-spacing: -0.02em; color: inherit; }
  .landing .panel.ink h3 { color: #fff; }
  .landing .panel .k {
    font-family: var(--f-mono); font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase;
  }
  .landing .panel.lime .k { color: var(--purple); }
  .landing .panel.ink .k { color: var(--lime); }
  .landing .panel p { color: inherit; opacity: 0.85; max-width: 42ch; font-size: 15.5px; }
  .landing .panel .list { display: flex; flex-direction: column; gap: 10px; margin: 6px 0; padding: 0; }
  .landing .panel .list li {
    list-style: none; display: flex; gap: 12px; align-items: center; font-size: 15px;
  }
  .landing .panel .list li::before {
    content: "✓"; width: 22px; height: 22px; border-radius: 999px;
    display: grid; place-items: center; font-size: 11px; font-weight: 700;
  }
  .landing .panel.lime .list li::before { background: var(--ink); color: var(--lime); }
  .landing .panel.ink  .list li::before { background: var(--pink); color: #fff; }
  .landing .panel .foot {
    display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; gap: 20px;
  }
  .landing .panel .price-big {
    font-family: var(--f-display); font-weight: 800; font-size: 54px;
    line-height: 1; letter-spacing: -0.03em;
  }
  .landing .panel .price-big small { font-size: 16px; font-weight: 500; opacity: 0.7; margin-left: 6px; }
  .landing .panel .btn-local {
    background: var(--ink); color: #fff; border: 0;
    padding: 14px 22px; border-radius: 999px;
    font-weight: 600; font-size: 14.5px;
    display: inline-flex; align-items: center; gap: 10px;
  }
  .landing .panel.lime .btn-local { background: var(--ink); color: #fff; }
  .landing .panel.ink  .btn-local { background: var(--lime); color: var(--ink); }
  .landing .panel .btn-local .a {
    width: 22px; height: 22px; border-radius: 999px;
    background: var(--pink); color: #fff;
    display: grid; place-items: center; font-size: 11px;
  }
  .landing .panel.ink .btn-local .a { background: var(--ink); color: var(--lime); }

  /* EVENTS CALENDAR */
  .landing .calendar {
    display: grid; grid-template-columns: 1fr; gap: 0;
    background: var(--card); border: 1px solid var(--rule); border-radius: 24px; overflow: hidden;
  }
  .landing .row-ev {
    display: grid; grid-template-columns: 120px 1.4fr 1fr auto;
    gap: 32px; align-items: center; padding: 24px 32px;
    border-top: 1px solid var(--rule); cursor: pointer; transition: background .15s;
  }
  .landing .row-ev:first-child { border-top: 0; }
  .landing .row-ev:hover { background: #fbf7ec; }
  .landing .row-ev .d {
    font-family: var(--f-display); font-weight: 700; font-size: 14px;
    letter-spacing: 0.04em; text-transform: uppercase; color: var(--purple);
  }
  .landing .row-ev .d b {
    display: block; font-size: 40px; color: var(--ink);
    letter-spacing: -0.02em; text-transform: none; margin-top: 2px; line-height: 1;
  }
  .landing .row-ev .t h4 { font-size: 22px; line-height: 1.15; }
  .landing .row-ev .t h4 em { color: var(--purple); font-style: italic; font-weight: 500; }
  .landing .row-ev .t p { font-size: 14px; color: var(--muted); margin-top: 4px; }
  .landing .row-ev .tag {
    font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
    padding: 6px 12px; border-radius: 999px; justify-self: start;
  }
  .landing .tag.o { background: #ffeedd; color: #a84a0f; }
  .landing .tag.p { background: #f0e3ff; color: #5a2b9a; }
  .landing .tag.l { background: #e4f5bf; color: #4a6418; }
  .landing .tag.k { background: #ffe1eb; color: #a30039; }
  .landing .row-ev .go {
    width: 38px; height: 38px; border-radius: 999px; background: var(--ink); color: #fff;
    display: grid; place-items: center; font-size: 14px;
  }
  .landing .row-ev:hover .go { background: var(--pink); }

  /* TESTIMONIAL */
  .landing .testimonial {
    background: var(--orange); border-radius: 28px; padding: 72px 64px;
    display: grid; grid-template-columns: 1fr 1.2fr; gap: 48px;
    align-items: center; color: #1a1a1a;
  }
  .landing .testimonial .quote-mark {
    font-family: var(--f-display); font-weight: 800; font-size: 160px;
    line-height: 0.7; color: #1a1a1a;
  }
  .landing .testimonial blockquote {
    margin: 0; font-family: var(--f-display); font-weight: 500; font-style: italic;
    font-size: 28px; line-height: 1.25; letter-spacing: -0.01em; color: var(--ink);
  }
  .landing .testimonial .who { margin-top: 28px; display: flex; align-items: center; gap: 14px; }
  .landing .testimonial .who .ava {
    width: 48px; height: 48px; border-radius: 999px;
    background: var(--ink); color: var(--lime);
    display: grid; place-items: center; font-weight: 700;
    font-family: var(--f-display); font-size: 18px;
  }
  .landing .testimonial .who b { display: block; font-weight: 600; font-size: 15px; }
  .landing .testimonial .who span { font-size: 13px; opacity: 0.7; }

  /* NEWSLETTER + FOOTER */
  .landing .newsletter {
    background: var(--ink); color: #fff; border-radius: 32px; padding: 64px;
    display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center;
  }
  .landing .newsletter h3 { color: #fff; font-size: 48px; line-height: 1.0; letter-spacing: -0.02em; }
  .landing .newsletter h3 em { color: var(--lime); font-style: italic; font-weight: 500; }
  .landing .newsletter p { color: rgba(255,255,255,0.7); max-width: 40ch; margin-top: 14px; }
  .landing .nl-form {
    display: flex; gap: 0; background: #fff; border-radius: 999px; padding: 6px;
  }
  .landing .nl-form input {
    flex: 1; border: 0; outline: none; background: transparent;
    padding: 14px 20px; font-family: var(--f-ui); font-size: 15px; color: var(--ink);
  }
  .landing .nl-form button {
    background: var(--pink); color: #fff; border: 0; cursor: pointer;
    padding: 12px 24px; border-radius: 999px; font-weight: 600; font-size: 14px;
  }
  .landing .nl-form button:hover { background: var(--lime); color: var(--ink); }

  .landing footer.site-foot { padding: 80px 0 40px; }
  .landing .foot-grid {
    display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr; gap: 48px;
    padding-bottom: 48px; border-bottom: 1px solid var(--rule);
  }
  .landing .foot-brand .name {
    font-family: var(--f-display); font-weight: 700; font-size: 26px; line-height: 1.05;
  }
  .landing .foot-brand .name i {
    font-style: italic; font-weight: 500; display: block; font-size: 17px; color: var(--muted);
  }
  .landing .foot-brand p { color: var(--muted); margin-top: 16px; max-width: 32ch; font-size: 14.5px; }
  .landing .foot-col h5 {
    font-family: var(--f-ui); font-weight: 600; font-size: 12px; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--ink); margin: 0 0 16px;
  }
  .landing .foot-col ul { list-style: none; padding: 0; margin: 0; }
  .landing .foot-col li { margin-bottom: 10px; font-size: 14.5px; color: var(--ink-2); }
  .landing .foot-col a:hover { color: var(--pink); }
  .landing .foot-bottom {
    display: flex; justify-content: space-between; align-items: center;
    padding-top: 24px; font-family: var(--f-mono); font-size: 12px;
    color: var(--muted); letter-spacing: 0.04em;
  }
  .landing .socials { display: flex; gap: 10px; }
  .landing .socials a {
    width: 36px; height: 36px; border-radius: 999px; background: var(--lime);
    display: grid; place-items: center; color: var(--ink); font-size: 13px; font-weight: 700;
  }
  .landing .socials a:hover { background: var(--pink); color: #fff; }
`;

const FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,700;0,9..144,800;1,9..144,500&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap';

const NEW_ARRIVALS = [
  { cover: 'cover-1', title: 'The Magic Mountain', author: 'Thomas Mann',             badge: 'Slow Fiction' },
  { cover: 'cover-2', title: 'The Years',          author: 'Annie Ernaux',            badge: 'Memoir' },
  { cover: 'cover-3', title: 'Solenoid',           author: 'Mircea Cărtărescu',       badge: 'Translation' },
  { cover: 'cover-4', title: 'Bluets',             author: 'Maggie Nelson',           badge: 'Poetry' },
  { cover: 'cover-5', title: "A Room of One's Own", author: 'Virginia Woolf',         badge: 'Essays', coverTitleBreak: true },
  { cover: 'cover-6', title: 'The Waves',          author: 'Virginia Woolf',          badge: 'Novel' },
  { cover: 'cover-2', title: 'Minor Detail',       author: 'Adania Shibli',           badge: 'Translation' },
  { cover: 'cover-1', title: 'Checkout 19',        author: 'C.-L. Bennett',           badge: 'Novel', coverAuthor: 'Claire-Louise Bennett' },
];

const EVENTS = [
  { m: 'Apr', d: '23', title: 'Slow Fiction',           emph: 'Club',            copy: 'Opening pages of The Magic Mountain. Sherry & olives.',        tag: 'p', tagText: 'Weekly · Thu 7p' },
  { m: 'Apr', d: '27', title: 'Translators &',          emph: 'Twilight',        copy: 'An evening with translator Margaret Jull Costa on Saramago.',   tag: 'o', tagText: 'Guest · Mon 7:30p' },
  { m: 'May', d: '02', title: 'Saturday',               emph: 'Silent Reading',  copy: 'Two quiet hours, a pot of coffee, a plate of toast. No phones.', tag: 'l', tagText: 'Weekly · Sat 10a' },
  { m: 'May', d: '08', title: 'Poetry on',              emph: 'Small Plates',    copy: 'A tasting menu paired to six poems. Lorca, Szymborska, Berry.',  tag: 'k', tagText: 'Prix Fixe · Fri 8p' },
  { m: 'May', d: '15', title: 'First-Draft',            emph: 'Friday',          copy: 'One page of work-in-progress. Two minutes each, then we eat.',   tag: 'p', tagText: 'Members · Fri 7p' },
  { m: 'May', d: '21', title: 'The',                    emph: 'Novella',         copy: 'Read a novella that afternoon; meet for dinner to discuss.',    tag: 'o', tagText: 'Single Session · Thu 4p',  titleAfterEmph: 'Supper' },
];

const SHELF_BOOKS = [
  { h: '82%', c: '#8F4FD6' }, { h: '96%', c: '#1a1a1a' }, { h: '70%', c: '#FF934A' },
  { h: '88%', c: '#E0004F' }, { h: '76%', c: '#C9F27F' }, { h: '92%', c: '#3a3a3a' },
  { h: '80%', c: '#FF934A' }, { h: '68%', c: '#8F4FD6' }, { h: '94%', c: '#1a1a1a' },
  { h: '72%', c: '#E0004F' }, { h: '86%', c: '#C9F27F' }, { h: '78%', c: '#3a3a3a' },
];

export default function LandingPage() {
  const [newsletterState, setNewsletterState] = useState('idle'); // idle | done
  const onNewsletter = (e) => {
    e.preventDefault();
    setNewsletterState('done');
  };

  return (
    <div className="landing">
      {/* Inject Google Fonts once — stylesheet is idempotent. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={FONTS_HREF} />
      <style dangerouslySetInnerHTML={{ __html: LANDING_CSS }} />

      {/* NAV + HERO share the lime band */}
      <div className="nav-band hero-band">
        <div className="wrap">
          <nav className="nav">
            <div className="links">
              <Link to="/">Home</Link>
              <a href="#services">Services</a>
              <Link to="/books">Library</Link>
              <a href="#events">Events</a>
              <a href="#blog">Journal</a>
            </div>
            <div className="brand">
              <span className="row1">Tapas reading</span>
              <span className="row2">cafe</span>
            </div>
            <div className="right">
              <Link to="/login" className="sign">Sign in</Link>
              <a className="pill" href="#join">Sign up</a>
              <Link to="/cart" className="cart" aria-label="Cart">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 6h14" />
                  <circle cx="9" cy="21" r="1.5" />
                  <circle cx="18" cy="21" r="1.5" />
                </svg>
              </Link>
            </div>
          </nav>

          <section className="hero">
            <div className="hero-copy">
              <div className="tag">Reading room · Book club · Small plates</div>
              <h1>
                A quiet room for <span className="accent">big books</span> &amp;{' '}
                <span className="u">small plates.</span>
              </h1>
              <p>
                Tapas Reading Cafe is a neighborhood library-cafe — borrow a book, order a plate,
                and stay as long as the chapter asks for. Weekly book clubs, silent reading hours,
                and a shelf that's always rotating.
              </p>
              <div className="hero-ctas">
                <Link className="btn primary" to="/books">
                  Browse the library
                  <span className="arrow">→</span>
                </Link>
                <a className="btn ghost" href="#events">See events</a>
              </div>
              <div className="hero-meta">
                <div className="stat"><b>2,400+</b><span>BOOKS ON SHELF</span></div>
                <div className="stat"><b>6</b><span>WEEKLY CLUBS</span></div>
                <div className="stat"><b>312</b><span>ACTIVE MEMBERS</span></div>
              </div>
            </div>
            <div className="hero-art">
              <div className="ph" />
              <div className="shelf">
                {SHELF_BOOKS.map((b, i) => (
                  <div key={i} className="book" style={{ height: b.h, background: b.c }} />
                ))}
              </div>
              <div className="ph-label">library.jpg — our wall of books</div>
              <div className="hero-sticker">Open today<i>10a – 11p</i></div>
            </div>
          </section>
        </div>
        <svg className="curve" viewBox="0 0 1440 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,0 C360,100 1080,100 1440,0 L1440,100 L0,100 Z" fill="#faf8f4" />
        </svg>
      </div>

      {/* MARQUEE */}
      <div className="marquee">
        <div className="marquee-row">
          <span>
            Borrow a book <span className="dot" /> stay for a plate <span className="dot" /> join a club <span className="dot" /> read on the house <span className="dot" />
            Borrow a book <span className="dot" /> stay for a plate <span className="dot" /> join a club <span className="dot" /> read on the house <span className="dot" />
          </span>
          <span>
            Borrow a book <span className="dot" /> stay for a plate <span className="dot" /> join a club <span className="dot" /> read on the house <span className="dot" />
            Borrow a book <span className="dot" /> stay for a plate <span className="dot" /> join a club <span className="dot" /> read on the house <span className="dot" />
          </span>
        </div>
      </div>

      {/* SERVICES */}
      <section className="section" id="services">
        <div className="wrap">
          <div className="head">
            <div>
              <div className="kicker">Our Services</div>
              <h2>Everything a reader needs, <span className="p">under one roof.</span></h2>
            </div>
            <p className="lede">
              Three ways to use the room: take a book home, borrow one for a week, or come read with a group.
              Coffee, wine, and tapas served throughout.
            </p>
          </div>
          <div className="services">
            <div className="service">
              <div className="ic">Aa</div>
              <h3>Buying Books</h3>
              <p>A small, carefully-chosen shelf for purchase — new releases, small presses, and staff favorites. Always 10% off for members.</p>
              <Link className="more" to="/books">Visit the shop <span className="a">→</span></Link>
            </div>
            <div className="service">
              <div className="ic">↺</div>
              <h3>Lending Library</h3>
              <p>Over 2,400 books you can borrow on the honor system. Take two home at a time, return within three weeks.</p>
              <Link className="more" to="/books">Browse the library <span className="a">→</span></Link>
            </div>
            <div className="service">
              <div className="ic">☕</div>
              <h3>Events &amp; Book Clubs</h3>
              <p>Six weekly clubs, poetry suppers, and silent reading Saturdays. Come once as a guest — decide later.</p>
              <a className="more" href="#events">See the calendar <span className="a">→</span></a>
            </div>
          </div>
        </div>
      </section>

      {/* NEW ARRIVALS */}
      <section className="section" id="library" style={{ paddingTop: '20px' }}>
        <div className="wrap">
          <div className="head">
            <div>
              <div className="kicker">New on the shelf</div>
              <h2>This week's <span className="p">arrivals.</span></h2>
            </div>
            <p className="lede">
              Freshly unpacked from the small-press boxes and the translators' stacks. Borrow for free, or take one home.
            </p>
          </div>
          <div className="arrivals">
            {NEW_ARRIVALS.map((b, i) => (
              <div key={i} className="book-card">
                <div className={`cover ${b.cover}`}>
                  <div className="title-line">
                    {b.coverTitleBreak ? (<>A Room of<br />One's Own</>) : b.title}
                  </div>
                  <div className="author-line">{b.coverAuthor || b.author}</div>
                </div>
                <div>
                  <div className="name">{b.title}</div>
                  <div className="author">{b.author}</div>
                </div>
                <div className="row">
                  <span className="badge">{b.badge}</span>
                  <button className="add" aria-label="Add">+</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MEMBERSHIP SPLIT */}
      <section className="section" id="membership" style={{ paddingTop: '40px' }}>
        <div className="wrap">
          <div className="head">
            <div>
              <div className="kicker">Pricing &amp; Plans</div>
              <h2>Two ways to <span className="p">pull up a chair.</span></h2>
            </div>
            <p className="lede">
              Drop in whenever you like — or become a member and unlock every club, a quarterly book, and 10% off the kitchen.
            </p>
          </div>
          <div className="split">
            <div className="panel lime">
              <div className="k">Drop-in</div>
              <h3>The Reading Room</h3>
              <p>Free to enter. Borrow one book at a time, read all afternoon. Buy a coffee or a plate if the mood strikes.</p>
              <ul className="list">
                <li>Lending library, honor system</li>
                <li>Wi-Fi, quiet tables, long hours</li>
                <li>One guest club visit per month</li>
              </ul>
              <div className="foot">
                <div className="price-big">Free<small /></div>
                <a className="btn-local" href="#visit">Visit today <span className="a">→</span></a>
              </div>
            </div>
            <div className="panel ink">
              <div className="k">Membership</div>
              <h3>The Chair</h3>
              <p>A seat at every club, a book of your choice each quarter, 10% off the kitchen, and first dibs on supper events.</p>
              <ul className="list">
                <li>All six weekly book clubs</li>
                <li>One book per quarter, on us</li>
                <li>10% off food, wine &amp; coffee</li>
                <li>Priority RSVP for supper events</li>
              </ul>
              <div className="foot">
                <div className="price-big">$18<small>/month</small></div>
                <a className="btn-local" href="#join">Become a member <span className="a">→</span></a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EVENTS */}
      <section className="section" id="events" style={{ paddingTop: '40px' }}>
        <div className="wrap">
          <div className="head">
            <div>
              <div className="kicker">Upcoming Events</div>
              <h2>On the calendar <span className="p">this season.</span></h2>
            </div>
            <p className="lede">
              Weekly clubs, translator evenings, poetry suppers, and the occasional quiet Saturday. All welcome, members first.
            </p>
          </div>
          <div className="calendar">
            {EVENTS.map((e, i) => (
              <div key={i} className="row-ev">
                <div className="d">{e.m}<b>{e.d}</b></div>
                <div className="t">
                  <h4>{e.title} <em>{e.emph}</em>{e.titleAfterEmph ? ` ${e.titleAfterEmph}` : ''}</h4>
                  <p>{e.copy}</p>
                </div>
                <span className={`tag ${e.tag}`}>{e.tagText}</span>
                <span className="go">→</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="testimonial">
            <div>
              <div className="quote-mark">"</div>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: '10px' }}>
                What readers say
              </div>
            </div>
            <div>
              <blockquote>
                I came in on a Tuesday for a coffee and ended up finishing my novel. Three months later I'm
                hosting the Silent Reading club. It is the <i>warmest quiet place</i> I've ever found.
              </blockquote>
              <div className="who">
                <div className="ava">RK</div>
                <div>
                  <b>Rukmini K.</b>
                  <span>Member since 2024 · Silent Reading host</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="section" id="join" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="newsletter">
            <div>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--lime)', marginBottom: '14px' }}>
                The Dispatch
              </div>
              <h3>A letter on <em>what we're reading.</em></h3>
              <p>One email a month. This week's shelf, next week's clubs, and a paragraph we couldn't stop thinking about.</p>
            </div>
            <form className="nl-form" onSubmit={onNewsletter}>
              <input type="email" placeholder="your@email.com" required />
              <button type="submit">{newsletterState === 'done' ? 'Thanks — see you soon' : 'Subscribe'}</button>
            </form>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="wrap site-foot">
        <div className="foot-grid">
          <div className="foot-brand">
            <div className="name">Tapas reading cafe<i>a small room for big books</i></div>
            <p>A neighborhood library-cafe serving small plates, natural wine, and six weekly book clubs.</p>
          </div>
          <div className="foot-col">
            <h5>Visit</h5>
            <ul>
              <li>14 Haven Street</li>
              <li>Reading, MA 01867</li>
              <li>Tue–Sun · 10a–11p</li>
            </ul>
          </div>
          <div className="foot-col">
            <h5>Read</h5>
            <ul>
              <li><Link to="/books">Library</Link></li>
              <li><a href="#events">Book Clubs</a></li>
              <li><Link to="/blog">The Journal</Link></li>
              <li><a href="#archive">Archive</a></li>
            </ul>
          </div>
          <div className="foot-col">
            <h5>More</h5>
            <ul>
              <li><a href="#events">Private Events</a></li>
              <li><a href="#gift">Gift Cards</a></li>
              <li><a href="#careers">Careers</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© {new Date().getFullYear()} Tapas Reading Cafe · Reading, MA</span>
          <div className="socials">
            <a href="#ig">IG</a><a href="#fb">FB</a><a href="#sp">SP</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
