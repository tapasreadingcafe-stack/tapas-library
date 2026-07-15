// =====================================================================
// HomeSections
//
// The six on-brand sections that sit between the LandingHero and the
// global SiteFooter on the home page. Ported from the original
// hand-authored landing layout (commit ae96245), restyled to:
//   * pull books from shop_books (CMS Phase 3),
//   * pull events from tapas_events,
//   * pull the featured testimonial from home_testimonials,
//   * keep Pricing/Plans + Services hardcoded since the layout is the
//     designed composition (Phase 4 dashboard can lift them later).
//
// CSS is scoped to a single `.home-sections` wrapper so it doesn't
// bleed into other routes. The newsletter "Dispatch" pattern is
// shared with the Blog page via <DispatchNewsletter />.
// =====================================================================
import React from 'react';
import { Link } from 'react-router-dom';
import {
  useShopBooks,
  useEvents,
} from '../cms/hooks';
import { adaptShopBooks, splitEvents } from '../cms/adapters';

// --- styles -----------------------------------------------------------
const HOME_SECTIONS_CSS = `
  .home-sections {
    --hs-lime: #C9F27F;
    --hs-orange: #FF934A;
    --hs-purple: #8F4FD6;
    --hs-pink: #E0004F;
    --hs-ink: #1a1a1a;
    --hs-ink-2: #3a3a3a;
    --hs-muted: #6e6e6e;
    --hs-rule: #ececea;
    --hs-bg: #caf27e;
    --hs-card: #ffffff;
    --hs-display: 'Poppins', system-ui, sans-serif;
    --hs-ui: 'Poppins', system-ui, sans-serif;
    --hs-mono: 'Poppins', system-ui, sans-serif;
    background: var(--hs-bg);
    color: var(--hs-ink);
    font-family: var(--hs-ui);
  }
  .home-sections * { box-sizing: border-box; }
  .home-sections h2, .home-sections h3, .home-sections h4 {
    font-family: var(--hs-display); font-weight: 700; margin: 0;
    letter-spacing: -0.018em; color: var(--hs-ink);
  }
  .home-sections h2 em, .home-sections h3 em, .home-sections h4 em {
    font-style: italic; font-weight: 700;
  }
  .home-sections p { line-height: 1.6; margin: 0; }
  .home-sections a { color: inherit; text-decoration: none; }

  .hs-wrap { max-width: 1320px; margin: 0 auto; padding: 0 64px; }
  .hs-section { padding: 100px 0; }
  .hs-head {
    display: grid; grid-template-columns: 1fr 1fr; gap: 60px;
    align-items: center; margin-bottom: 56px;
  }
  .hs-head .hs-lede { max-width: 44ch; text-align: center; }
  .hs-kicker {
    font-family: var(--hs-mono); font-size: 12px; letter-spacing: 0.18em;
    text-transform: uppercase; color: var(--hs-purple); margin-bottom: 14px;
    font-weight: 600;
    display: inline-flex; align-items: center; gap: 10px;
  }
  .hs-kicker::before { content: "●"; color: var(--hs-pink); font-size: 10px; }
  .hs-head h2 { font-size: clamp(40px, 4.6vw, 64px); line-height: 1.02; letter-spacing: -0.022em; }
  .hs-head h2 .p { color: var(--hs-purple); font-style: italic; font-weight: 700; }
  .hs-lede { font-size: 18px; line-height: 1.55; color: var(--hs-ink-2); max-width: 44ch; }
  .hs-head-centered {
    grid-template-columns: 1fr; gap: 14px; text-align: center;
    justify-items: center; max-width: 880px; margin: 0 auto 46px;
  }
  .hs-head-centered .hs-kicker {
    font-size: 24px; font-weight: 600; letter-spacing: 1.63px;
    line-height: 1.2; color: #8A58DB; margin-bottom: 0;
  }
  .hs-head-centered .hs-kicker::before { display: none; }
  .hs-head-arrivals {
    display: grid; grid-template-columns: 1fr auto 1fr;
    align-items: center; margin-bottom: 36px; gap: 24px;
  }
  .hs-head-arrivals .hs-kicker {
    grid-column: 2; justify-self: center;
    font-size: 24px; font-weight: 600; letter-spacing: 0;
    line-height: 1.2; color: #8A58DB; margin-bottom: 0;
  }
  .hs-head-arrivals .hs-kicker::before { display: none; }
  a.hs-head-viewall {
    grid-column: 3; justify-self: end;
    color: var(--hs-pink); font-weight: 600; font-size: 15px;
    display: inline-flex; align-items: center; gap: 8px;
    text-decoration: none;
  }
  .hs-head-viewall .a { transition: transform .2s; display: inline-block; }
  .hs-head-viewall:hover .a { transform: translateX(4px); }
  .hs-head-centered .hs-head-headline {
    font-size: 24px; font-weight: 500;
    line-height: 1.3; letter-spacing: 0; color: var(--hs-ink);
    max-width: 56ch; text-wrap: balance;
  }
  .hs-head-centered .hs-head-sublede {
    font-size: 16px; font-weight: 400; line-height: 1.55;
    color: var(--hs-ink-2); max-width: 52ch; text-wrap: balance;
  }

  /* ---------- SERVICES ---------- */
  .hs-services { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .hs-service {
    background: var(--hs-card); border: 1px solid var(--hs-rule); border-radius: 18px;
    padding: 28px 24px 22px; display: flex; flex-direction: column; gap: 8px;
    text-align: center; align-items: center;
    transition: transform .2s, box-shadow .2s;
  }
  .hs-service:hover { transform: translateY(-4px); box-shadow: 0 20px 40px -20px rgba(0,0,0,0.15); }
  .hs-service-icon {
    width: 76px; height: 76px;
    display: grid; place-items: center;
    color: var(--hs-ink);
    margin-bottom: 4px;
  }
  .hs-service-icon svg { width: auto; height: 56px; max-width: 100%; }
  h3.hs-service-cat {
    font-size: 13px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.11em;
    line-height: 1.25; color: var(--hs-pink); margin: 0;
  }
  .hs-service-name {
    font-size: 19px; font-weight: 600; letter-spacing: -0.3px;
    line-height: 1.3; color: #111; margin-top: 2px;
  }
  .hs-service p  {
    font-size: 13px; font-weight: 400; letter-spacing: -0.1px;
    line-height: 1.5; color: #000; margin: 0;
  }
  .hs-service-cta {
    margin-top: auto; padding-top: 12px;
    display: inline-flex; align-items: center; gap: 8px;
    color: var(--hs-pink); font-weight: 700; font-size: 13.5px;
    transition: gap .2s;
  }
  .hs-service-cta .a { transition: transform .2s; display: inline-block; }
  .hs-service:hover .hs-service-cta .a { transform: translateX(4px); }

  /* ---------- ARRIVALS (book grid) ---------- */
  .hs-arrivals { display: grid; grid-template-columns: repeat(5, 1fr); gap: 24px; }
  .hs-book-card {
    background: #fff; border: 1px solid var(--hs-rule); border-radius: 14px;
    padding: 14px 14px 18px; display: flex; flex-direction: column; gap: 14px;
    transition: transform .2s, box-shadow .2s;
    text-decoration: none;
  }
  .hs-book-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 14px 36px rgba(0,0,0,0.08);
  }
  .hs-cover {
    aspect-ratio: 240 / 370; border-radius: 14px; position: relative; overflow: hidden;
    box-shadow: 0 6px 20px -10px rgba(0,0,0,0.18);
  }
  .hs-cover .title-line {
    position: absolute; left: 14px; right: 14px; top: 18px;
    font-family: var(--hs-display); font-weight: 700; font-size: 17px;
    line-height: 1.08; letter-spacing: -0.01em; color: #fff;
  }
  .hs-cover .author-line {
    position: absolute; left: 14px; bottom: 14px;
    font-size: 11px; font-weight: 500; letter-spacing: 0.06em;
    color: rgba(255,255,255,0.9); text-transform: uppercase;
  }
  .hs-cover.c-purple { background: linear-gradient(155deg, #8F4FD6 0%, #5a2b9a 100%); }
  .hs-cover.c-orange { background: linear-gradient(155deg, #FF934A 0%, #c65a1e 100%); }
  .hs-cover.c-ink    { background: linear-gradient(155deg, #1a1a1a 0%, #3a3a3a 100%); }
  .hs-cover.c-pink   { background: linear-gradient(155deg, #E0004F 0%, #8a002f 100%); }
  .hs-cover.c-lime   { background: linear-gradient(155deg, #C9F27F 0%, #8ac13a 100%); }
  .hs-cover.c-lime .title-line, .hs-cover.c-lime .author-line { color: var(--hs-ink); }
  .hs-cover.c-taupe  { background: linear-gradient(155deg, #5b4d3d 0%, #2e251c 100%); }
  .hs-cover.c-cream  { background: linear-gradient(155deg, #e8dfcb 0%, #c5b89c 100%); }
  .hs-cover.c-cream .title-line, .hs-cover.c-cream .author-line { color: var(--hs-ink); }
  /* Photo cover (uploaded book_image from dashboard). */
  .hs-cover.hs-cover-photo { background: #f0ebe1; padding: 0; }
  .hs-cover-photo img { width: 100%; height: 100%; object-fit: cover; display: block; border-radius: 12px; }

  .hs-book-card .hs-book-title {
    font-family: var(--hs-ui); font-weight: 500; font-size: 16px;
    line-height: 1.3; color: #000; text-align: center; padding: 0 4px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-height: calc(1.3em * 2);
  }
  .hs-book-card .hs-book-price {
    font-family: var(--hs-ui); font-weight: 500; font-size: 14px;
    color: var(--hs-purple); text-align: center;
  }
  .hs-book-viewall { display: none; }

  /* ---------- PRICING SPLIT ---------- */
  .hs-split { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .hs-panel {
    border-radius: 28px; padding: 48px;
    display: flex; flex-direction: column; gap: 22px; min-height: 420px;
  }
  .hs-panel.lime { background: #ffffff; color: var(--hs-ink); border: 1px solid var(--hs-rule); }
  .hs-panel.ink  { background: var(--hs-ink);  color: #fff; }
  .hs-panel h3 { font-size: 40px; line-height: 1.02; letter-spacing: -0.02em; color: inherit; }
  .hs-panel.ink h3 { color: #fff; }
  .hs-panel .k {
    font-family: var(--hs-mono); font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase;
  }
  .hs-panel.lime .k { color: var(--hs-purple); }
  .hs-panel.ink  .k { color: var(--hs-lime); }
  .hs-panel p { color: inherit; opacity: 0.85; max-width: 42ch; font-size: 15.5px; }
  .hs-list { display: flex; flex-direction: column; gap: 10px; margin: 6px 0; padding: 0; }
  .hs-list li {
    list-style: none; display: flex; gap: 12px; align-items: center; font-size: 15px;
  }
  .hs-list li::before {
    content: "✓"; width: 22px; height: 22px; border-radius: 999px;
    display: grid; place-items: center; font-size: 11px; font-weight: 700; flex-shrink: 0;
  }
  .hs-panel.lime .hs-list li::before { background: var(--hs-ink); color: var(--hs-lime); }
  .hs-panel.ink  .hs-list li::before { background: var(--hs-pink); color: #fff; }
  .hs-panel-foot {
    display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; gap: 20px;
  }
  .hs-price-big {
    font-family: var(--hs-display); font-weight: 700; font-size: 54px;
    line-height: 1; letter-spacing: -0.03em;
  }
  .hs-price-big small { font-size: 16px; font-weight: 500; opacity: 0.7; margin-left: 6px; font-family: var(--hs-ui); }
  .hs-btn-local {
    border: 0; padding: 14px 22px; border-radius: 999px;
    font-weight: 600; font-size: 14.5px;
    display: inline-flex; align-items: center; gap: 10px;
    cursor: pointer; font-family: inherit;
  }
  .hs-panel.lime .hs-btn-local { background: var(--hs-ink);  color: #fff; }
  .hs-panel.ink  .hs-btn-local { background: var(--hs-lime); color: var(--hs-ink); }
  .hs-btn-local .a {
    width: 22px; height: 22px; border-radius: 999px;
    display: grid; place-items: center; font-size: 11px;
  }
  .hs-panel.lime .hs-btn-local .a { background: var(--hs-pink); color: #fff; }
  .hs-panel.ink  .hs-btn-local .a { background: var(--hs-ink); color: var(--hs-lime); }

  /* ---------- PRICING (4-tier) ---------- */
  .hs-pricing {
    display: grid; grid-template-columns: repeat(2, minmax(0, 380px)); justify-content: center;
    gap: 18px;
    align-items: stretch;
    position: relative;
    background: transparent;
    padding: 0;
    border: 0;
  }
  .hs-pricing-card {
    padding: 36px 26px 28px; display: flex; flex-direction: column; gap: 18px;
    border-radius: 22px; position: relative; min-width: 0;
    background: var(--hs-card);
    border: 1px solid var(--hs-rule);
    transition: background .25s ease, color .25s ease, transform .25s ease, box-shadow .25s ease;
    cursor: default;
    overflow: hidden;
  }
  /* Hover state — any card becomes the "selected" purple card */
  .hs-pricing-card:hover {
    background: var(--hs-purple);
    color: #fff;
    transform: translateY(-4px);
    box-shadow: 0 28px 60px -20px rgba(143,79,214,0.45);
    border-color: transparent;
  }
  .hs-pricing-card:hover::after {
    content: ""; position: absolute; right: -60px; top: -60px;
    width: 280px; height: 280px;
    background: radial-gradient(circle, var(--hs-lime) 0%, transparent 60%);
    opacity: 0.18; pointer-events: none;
  }
  .hs-pricing-card:hover > * { position: relative; z-index: 1; }
  .hs-pricing-card:hover .price,
  .hs-pricing-card:hover h3 { color: #fff; }
  .hs-pricing-card:hover .price small { color: rgba(255,255,255,0.8); }
  .hs-pricing-card:hover > p { color: rgba(255,255,255,0.92); opacity: 1; }
  .hs-pricing-card:hover li { color: rgba(255,255,255,0.95); }
  .hs-pricing-card:hover .deposit { color: rgba(255,255,255,0.78); }
  .hs-pricing-card:hover .fineprint { color: rgba(255,255,255,0.85); opacity: 0.9; }
  .hs-pricing-card:hover .hs-pricing-btn { background: var(--hs-lime); color: var(--hs-ink); }
  .hs-pricing-card:hover .hs-pricing-btn:hover { background: #fff; color: var(--hs-purple); }
  .hs-pricing-card .price {
    font-family: var(--hs-display); font-weight: 700; font-size: 44px;
    line-height: 1; color: var(--hs-ink); letter-spacing: -0.025em;
  }
  .hs-pricing-card .price small {
    font-size: 14px; color: var(--hs-muted); font-weight: 500;
    margin-left: 6px; font-family: var(--hs-mono);
    letter-spacing: 0.04em; text-transform: lowercase;
  }
  .hs-pricing-card h3 {
    font-family: var(--hs-display); font-weight: 600; font-size: 26px;
    color: var(--hs-ink); letter-spacing: -0.018em; line-height: 1.1;
  }
  .hs-pricing-card > p {
    color: var(--hs-ink-2); font-size: 14.5px; line-height: 1.55;
    margin: -4px 0 0; max-width: none; opacity: 0.85;
  }
  .hs-pricing-card ul {
    list-style: none; padding: 0; margin: 4px 0 0;
    display: flex; flex-direction: column; gap: 12px;
  }
  .hs-pricing-card li {
    display: flex; gap: 12px; align-items: flex-start;
    font-size: 14.5px; color: var(--hs-ink-2); line-height: 1.4;
  }
  .hs-pricing-card li::before {
    content: "✓"; flex-shrink: 0;
    width: 22px; height: 22px; border-radius: 999px;
    background: var(--hs-lime); color: var(--hs-ink);
    display: grid; place-items: center;
    font-size: 12px; font-weight: 700;
    margin-top: 1px;
  }
  .hs-pricing a.hs-pricing-btn {
    margin-top: auto; display: inline-flex; align-items: center; justify-content: center;
    gap: 10px;
    background: var(--hs-ink); color: #fff; font-weight: 600;
    padding: 16px 22px; border-radius: 999px; font-size: 14.5px;
    transition: background .2s, transform .2s, color .2s;
    font-family: var(--hs-ui);
    text-decoration: none;
  }
  .hs-pricing-btn::after {
    content: "→"; display: inline-block;
    transition: transform .2s;
  }
  .hs-pricing-btn:hover { background: var(--hs-pink); transform: translateY(-1px); }
  .hs-pricing-btn:hover::after { transform: translateX(3px); }


  .hs-pricing-card .deposit {
    font-family: var(--hs-mono); font-size: 12px; letter-spacing: 0.04em;
    color: var(--hs-muted); margin: -12px 0 0;
  }
  .hs-pricing-card .fineprint {
    font-size: 12.5px; line-height: 1.5; color: var(--hs-muted);
    font-style: italic; margin: 0; opacity: 0.85;
  }

  .hs-pricing-extras {
    display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 20px;
  }
  .hs-pricing-extra {
    background: var(--hs-card); border: 1px solid var(--hs-rule);
    border-radius: 22px; padding: 28px 32px;
    display: flex; flex-direction: column; gap: 8px;
  }
  .hs-pricing-extra .kicker {
    font-family: var(--hs-mono); font-size: 11px;
    letter-spacing: 0.18em; color: var(--hs-purple);
    text-transform: uppercase; font-weight: 700;
  }
  .hs-pricing-extra .title {
    font-family: var(--hs-display); font-weight: 600; font-size: 24px;
    color: var(--hs-ink); line-height: 1.15; letter-spacing: -0.018em;
  }
  .hs-pricing-extra p {
    font-size: 14.5px; color: var(--hs-ink-2); line-height: 1.55; margin: 0;
  }
  .hs-pricing-extra--featured {
    background: linear-gradient(135deg, #fff 0%, var(--hs-lime) 110%);
    border-color: transparent;
  }
  .hs-pricing-extra--featured .kicker { color: var(--hs-pink); }

  .hs-pricing-card .badge {
    position: absolute; top: 14px; right: 14px;
    background: var(--hs-pink); color: #fff;
    font-size: 8px; padding: 3px 8px; border-radius: 999px;
    font-weight: 700; letter-spacing: 0.14em;
    font-family: var(--hs-mono); display: inline-flex; align-items: center; gap: 4px;
  }
  .hs-pricing-card .badge::before {
    content: "●"; color: var(--hs-lime); font-size: 6px;
  }

  /* ---------- EVENTS CALENDAR ---------- */
  .hs-calendar {
    display: grid; grid-template-columns: 1fr; gap: 0;
    background: var(--hs-card); border: 1px solid var(--hs-rule); border-radius: 24px; overflow: hidden;
  }
  .hs-row-ev {
    display: grid; grid-template-columns: 120px 1.4fr 1fr auto;
    gap: 32px; align-items: center; padding: 24px 32px;
    border-top: 1px solid var(--hs-rule); cursor: pointer; transition: background .15s;
    text-align: left;
  }
  .hs-row-ev:first-child { border-top: 0; }
  .hs-row-ev:hover { background: #fbf7ec; }
  .hs-row-ev .d {
    font-family: var(--hs-display); font-weight: 700; font-size: 14px;
    letter-spacing: 0.04em; text-transform: uppercase; color: var(--hs-purple);
  }
  .hs-row-ev .d b {
    display: block; font-size: 40px; color: var(--hs-ink);
    letter-spacing: -0.02em; text-transform: none; margin-top: 2px; line-height: 1;
  }
  .hs-row-ev .t h4 { font-size: 22px; line-height: 1.15; }
  .hs-row-ev .t h4 em { color: var(--hs-purple); font-style: italic; font-weight: 700; }
  .hs-row-ev .t p { font-size: 14px; color: var(--hs-muted); margin-top: 4px; }
  .hs-row-ev .tag {
    font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
    padding: 6px 12px; border-radius: 999px; justify-self: start;
  }
  .hs-tag-sage    { background: #e4f5bf; color: #4a6418; }
  .hs-tag-peach   { background: #ffeedd; color: #a84a0f; }
  .hs-tag-lavender{ background: #f0e3ff; color: #5a2b9a; }
  .hs-tag-pink    { background: #ffe1eb; color: #a30039; }
  .hs-tag-soft    { background: #ffe1eb; color: #a30039; }
  .hs-row-ev .go {
    width: 38px; height: 38px; border-radius: 999px; background: var(--hs-ink); color: #fff;
    display: grid; place-items: center; font-size: 14px;
    transition: background .2s;
  }
  .hs-row-ev:hover .go { background: var(--hs-pink); }

  /* ---------- TESTIMONIAL ---------- */
  .hs-testimonial {
    background: var(--hs-orange); border-radius: 28px; padding: 72px 64px;
    display: grid; grid-template-columns: 1fr 1.2fr; gap: 48px;
    align-items: center; color: #1a1a1a;
  }
  .hs-quote-mark {
    font-family: var(--hs-display); font-weight: 700; font-size: 160px;
    line-height: 0.7; color: #1a1a1a;
  }
  .hs-tm-kicker {
    font-family: var(--hs-mono); font-size: 12px; letter-spacing: 0.18em;
    text-transform: uppercase; margin-top: 10px;
  }
  .hs-testimonial blockquote {
    margin: 0; font-family: var(--hs-display); font-weight: 500; font-style: italic;
    font-size: 26px; line-height: 1.3; letter-spacing: -0.012em; color: var(--hs-ink);
  }
  .hs-testimonial blockquote em { font-style: italic; }
  .hs-testimonial .who { margin-top: 28px; display: flex; align-items: center; gap: 14px; }
  .hs-testimonial .who .ava {
    width: 48px; height: 48px; border-radius: 999px;
    background: var(--hs-ink); color: var(--hs-lime);
    display: grid; place-items: center; font-weight: 700;
    font-family: var(--hs-display); font-size: 18px;
  }
  .hs-testimonial .who b { display: block; font-weight: 600; font-size: 15px; }
  .hs-testimonial .who span { font-size: 13px; opacity: 0.7; }

  /* ---------- DISPATCH (shared with Blog page) ---------- */
  /* Blog's stylesheet only loads on /blog — duplicate the rules here
     so the same component renders correctly when used on home. */
  .home-sections .blog-dispatch {
    background: var(--hs-ink);
    border-radius: 28px;
    padding: 48px 56px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 48px;
    align-items: center;
    color: #fff;
  }
  .home-sections .blog-dispatch-kicker {
    font-family: var(--hs-mono); font-size: 12px;
    letter-spacing: 0.18em; text-transform: uppercase;
    color: var(--hs-lime); margin-bottom: 12px;
  }
  .home-sections .blog-dispatch-title {
    font-family: var(--hs-display); font-weight: 700;
    font-size: clamp(30px, 3.4vw, 44px); line-height: 1.05;
    letter-spacing: -0.018em; color: #fff; margin: 0 0 14px;
  }
  .home-sections .blog-dispatch-title em {
    color: var(--hs-lime); font-style: italic; font-weight: 700;
  }
  .home-sections .blog-dispatch-lede {
    color: rgba(255,255,255,0.75); font-size: 15px; line-height: 1.6;
    margin: 0; max-width: 44ch;
  }
  .home-sections .blog-dispatch-form {
    display: flex; align-items: center; background: #fff;
    border-radius: 999px; padding: 6px;
  }
  .home-sections .blog-dispatch-form input {
    flex: 1; background: transparent; border: 0; outline: none;
    padding: 12px 20px; font-family: inherit; font-size: 15px;
    color: var(--hs-ink); min-width: 0;
  }
  .home-sections .blog-dispatch-form input::placeholder { color: var(--hs-muted); }
  .home-sections .blog-dispatch-form button {
    background: var(--hs-pink); color: #fff; border: 0;
    border-radius: 999px; padding: 12px 24px;
    font-family: inherit; font-weight: 600; font-size: 14px;
    cursor: pointer; transition: background 150ms;
  }
  .home-sections .blog-dispatch-form button:hover { background: var(--hs-lime); color: var(--hs-ink); }
  .home-sections .blog-dispatch-success {
    background: rgba(202,242,126,0.15); color: var(--hs-lime);
    border-radius: 18px; padding: 18px 24px; font-size: 15px;
  }
  .home-sections .blog-dispatch-error {
    color: #ffa8b8; font-size: 13px; margin-top: 8px; padding: 0 12px;
  }

  /* ---------- responsive ---------- */
  @media (max-width: 1023px) {
    .hs-wrap { padding: 0 32px; }
    .hs-section { padding: 72px 0; }
    .hs-head { grid-template-columns: 1fr; gap: 24px; align-items: start; }
    .hs-services { grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .hs-service { padding: 22px 18px 18px; border-radius: 16px; }
    .hs-service-icon { width: 62px; height: 62px; margin-bottom: 2px; }
    .hs-service-icon svg { height: 44px; }
    h3.hs-service-cat { font-size: 12px; }
    .hs-service-name { font-size: 17px; }
    .hs-service p { font-size: 12.5px; line-height: 1.45; }
    .hs-service-cta { font-size: 12.5px; padding-top: 8px; }
    .hs-head-arrivals .hs-head-viewall { display: none; }
    .hs-arrivals {
      display: flex;
      grid-template-columns: none;
      overflow-x: auto;
      gap: 18px;
      padding: 4px 32px 12px;
      margin: 0 -32px;
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }
    .hs-arrivals::-webkit-scrollbar { display: none; }
    .hs-arrivals > .hs-book-card {
      flex: 0 0 220px;
      scroll-snap-align: start;
    }
    .hs-arrivals > .hs-book-viewall {
      flex: 0 0 120px;
      scroll-snap-align: start;
    }
    .hs-book-viewall {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      background: transparent;
      color: var(--hs-ink);
      text-decoration: none;
      padding: 0;
    }
    .hs-book-viewall-circle {
      width: 56px; height: 56px; border-radius: 999px;
      background: var(--hs-purple, #8F4FD6);
      color: #fff;
      display: grid; place-items: center;
      font-size: 24px; font-weight: 700;
      transition: background .2s, transform .2s, box-shadow .2s;
    }
    .hs-book-viewall-circle svg { width: 22px; height: 22px; stroke: #fff; fill: none; }
    .hs-book-viewall:hover .hs-book-viewall-circle {
      transform: translateX(4px);
      box-shadow: 0 10px 28px -8px rgba(143,79,214,0.5);
    }
    .hs-book-viewall-label {
      font-family: var(--hs-ui); font-weight: 600; font-size: 15px;
      letter-spacing: 0.02em;
    }
    .hs-split { grid-template-columns: 1fr; }
    .hs-panel { padding: 36px; min-height: 0; }
    .hs-pricing { grid-template-columns: repeat(2, 1fr); padding: 16px; }
    .hs-pricing-extras { grid-template-columns: 1fr; }
    .hs-pricing-extra { padding: 24px; }
    .hs-pricing-extra .title { font-size: 22px; }
    .hs-head-arrivals { grid-template-columns: 1fr; gap: 12px; text-align: center; }
    .hs-head-arrivals .hs-kicker { grid-column: 1; }
    a.hs-head-viewall { grid-column: 1; justify-self: center; }
    .hs-row-ev { grid-template-columns: 80px 1fr auto; gap: 16px; padding: 20px; }
    .hs-row-ev .tag { display: none; }
    .hs-testimonial { grid-template-columns: 1fr; padding: 48px 36px; gap: 24px; }
    .hs-quote-mark { font-size: 96px; }
    .hs-testimonial blockquote { font-size: 22px; }
  }

  @media (max-width: 639px) {
    .hs-wrap { padding: 0 20px; }
    .hs-pricing { grid-template-columns: 1fr; gap: 14px; padding: 12px; }
    .hs-pricing-card { padding: 28px 22px 24px; gap: 14px; border-radius: 18px; }
    .hs-pricing-card .price { font-size: 36px; }
    .hs-pricing-card .price small { font-size: 13px; margin-left: 4px; }
    .hs-pricing-card h3 { font-size: 22px; }
    .hs-pricing-card > p { font-size: 13.5px; line-height: 1.5; }
    .hs-pricing-card ul { gap: 10px; }
    .hs-pricing-card li { font-size: 13.5px; gap: 10px; }
    .hs-pricing-card li::before { width: 20px; height: 20px; font-size: 11px; }
    .hs-pricing a.hs-pricing-btn { padding: 13px 20px; font-size: 13.5px; }

    .hs-services { grid-template-columns: 1fr; gap: 12px; }
    .hs-service { padding: 18px 16px 16px; gap: 6px; border-radius: 14px; }
    .hs-service-icon { width: 56px; height: 56px; margin-bottom: 0; }
    .hs-service-icon svg { height: 42px; }
    h3.hs-service-cat { font-size: 11.5px; }
    .hs-service-name { font-size: 15px; }
    .hs-service p { font-size: 12px; line-height: 1.45; }
    .hs-service-cta { display: none; }
    .hs-head-centered { gap: 8px; }
    .hs-head-centered .hs-kicker { font-size: 18px; letter-spacing: 1.2px; margin-bottom: 6px; }
    .hs-head-centered .hs-head-headline { font-size: 18px; max-width: none; }
    .hs-head-centered .hs-head-sublede { font-size: 14px; margin-top: -2px; }
    #membership .hs-head-headline { font-size: 16px; white-space: nowrap; font-weight: 600; }

    .hs-arrivals {
      padding-left: 20px;
      padding-right: 20px;
      margin: 0 -20px;
    }
    .hs-arrivals > .hs-book-card { flex: 0 0 180px; }
    .hs-arrivals > .hs-book-viewall { flex: 0 0 96px; }
    .hs-book-viewall-circle { width: 52px; height: 52px; }
    .hs-book-viewall-circle svg { width: 20px; height: 20px; }
    .hs-book-viewall-label { font-size: 14px; }
  }
`;

// --- helpers ----------------------------------------------------------
function isoToMonthDay(iso) {
  if (!iso) return { m: '', d: '' };
  const [, mm, dd] = String(iso).split('-');
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return { m: months[parseInt(mm, 10) - 1] || '', d: parseInt(dd, 10) || '' };
}
function badgeText(e) {
  const map = {
    'weekly':      'WEEKLY',
    'monthly':     'MONTHLY',
    'prix-fixe':   'PRIX FIXE',
    'drop-in':     'DROP IN',
    'guest-night': 'GUEST',
  };
  const base = map[e.badge] || (e.category || '').toUpperCase();
  const { m, d } = isoToMonthDay(e.iso);
  return `${base} · ${m} ${d}`;
}
function chipClass(e) {
  switch (e.category) {
    case 'silent-reading': return 'hs-tag-sage';
    case 'guest-night':    return 'hs-tag-peach';
    case 'book-club':      return 'hs-tag-lavender';
    case 'poetry-supper':  return 'hs-tag-pink';
    case 'members-only':   return 'hs-tag-soft';
    default:               return 'hs-tag-lavender';
  }
}

// --- subsections ------------------------------------------------------
function ServicesSection() {
  return (
    <section className="hs-section" id="services">
      <div className="hs-wrap">
        <div className="hs-head hs-head-centered">
          <div className="hs-kicker">Our Services</div>
          <h2 className="hs-head-headline">From discovering books to spending quality time together, we&rsquo;ve created a space for both kids and parents.</h2>
        </div>
        <div className="hs-services">
          <a className="hs-service" href="#membership">
            <div className="hs-service-icon">
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="6" y="10" width="36" height="28" rx="4" />
                <circle cx="17" cy="21" r="4.2" />
                <path d="M11 31.5c0-3.2 2.7-4.8 6-4.8s6 1.6 6 4.8" />
                <path d="M28 19h9M28 25h9M28 31h6" />
              </svg>
            </div>
            <h3 className="hs-service-cat">MEMBERSHIP</h3>
            <div className="hs-service-name">Become a Member</div>
            <p>Enjoy unlimited library access, borrow books, work from our cozy caf&eacute;, and receive exclusive member benefits.</p>
            <span className="hs-service-cta">View Membership Plans <span className="a">&rarr;</span></span>
          </a>
          <Link className="hs-service" to="/events">
            <div className="hs-service-icon">
              <svg viewBox="0 14 340 310" fill="currentColor" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" aria-hidden="true">
                <path d="M189.5 24.65H68.989c-.033 0-.064.009-.1.01s-.063-.007-.095-.006c-.3.015-29.945 1.83-29.945 35.688v104.7c-4.8 5.676-12.848 15.17-19.885 23.423a34.15 34.15 0 0 0-7.939 18.2c-1.3 11.041-2.546 27.705-1.061 44.385a49.141 49.141 0 0 0 .813 5.462A133.423 133.423 0 0 0 18.1 280.3a18.389 18.389 0 0 1 1.38 7.1v23.95a4 4 0 0 0 4 4h74.643a4 4 0 0 0 4-4v-32.567a43.356 43.356 0 0 0 8.919-23.226 4 4 0 0 0-7.98-.572A35.114 35.114 0 0 1 95.2 274.6a4 4 0 0 0-1.079 2.733v30.017h-66.64V287.4a26.349 26.349 0 0 0-1.993-10.175 125.178 125.178 0 0 1-6.87-22.317 40.247 40.247 0 0 1-.682-4.568c-1.426-16-.223-32.071 1.037-42.737a26.165 26.165 0 0 1 6.082-13.952c4.562-5.35 9.543-11.217 13.8-16.235v24.934a30.661 30.661 0 0 0-9.33 20.123L28 245.879a4 4 0 0 0 7.983.521l1.517-23.407a22.683 22.683 0 0 1 6.94-14.923 84.957 84.957 0 0 1 18.211-13.215 4.966 4.966 0 0 1 4.012-.318 4.667 4.667 0 0 1 2.808 2.6c3.337 7.915.424 16.34-8.656 25.043a4.023 4.023 0 0 0 .356 6.08c.618.474 15.059 11.955 8.123 40.332a4 4 0 0 0 2.936 4.836 4.057 4.057 0 0 0 .953.115 4 4 0 0 0 3.887-3.043c3.1-12.664 2.422-22.583.33-30.067h112.1a4 4 0 0 0 .971-7.881c-1.038-.268-10.149-2.942-10.149-13.981s9.111-13.712 10.122-13.973c.117-.029.225-.078.337-.116s.219-.065.322-.111a4.11 4.11 0 0 0 .429-.232c.074-.044.153-.079.224-.127a4 4 0 0 0 1.042-1.042c.051-.074.088-.157.134-.234a4.05 4.05 0 0 0 .225-.415c.041-.093.068-.193.1-.29a4.156 4.156 0 0 0 .132-.428c.023-.1.034-.2.05-.309a4.076 4.076 0 0 0 .046-.459c0-.042.012-.082.012-.124V28.65a4 4 0 0 0-3.997-4zM94.036 196.708a4 4 0 0 0 0 8H176.8a21.436 21.436 0 0 0-4.168 9.86h-16.079a4 4 0 0 0 0 8h16.078a21.454 21.454 0 0 0 4.168 9.862H74.269a36.808 36.808 0 0 0-5.028-7.43c11.579-12.742 10.642-23.764 7.605-30.968a12.739 12.739 0 0 0-7.539-7.049 12.978 12.978 0 0 0-10.482.847 96.574 96.574 0 0 0-11.973 7.719V60.342c0-19.263 11.657-25.149 18.137-26.933V171.53a4 4 0 0 0 8 0V32.65H185.5v164.058zM259.543 178.853H233.29a4 4 0 0 0-4 4v82.172h-11.833a4 4 0 0 0-3.292 6.271l28.959 41.974a4 4 0 0 0 6.584 0l28.959-41.97a4 4 0 0 0-3.292-6.271h-11.832v-82.176a4 4 0 0 0-4-4zm8.213 94.172-21.34 30.93-21.339-30.93h8.213a4 4 0 0 0 4-4v-82.172h18.253v82.172a4 4 0 0 0 4 4zM297.749 99.652a4 4 0 0 0-3.292 1.729L265.5 143.354a4 4 0 0 0 3.292 6.272h11.832V231.8a4 4 0 0 0 4 4h26.254a4 4 0 0 0 4-4v-82.174h11.832a4 4 0 0 0 3.29-6.272l-28.959-41.973a4 4 0 0 0-3.292-1.729zm13.127 41.974a4 4 0 0 0-4 4V227.8h-18.254v-82.174a4 4 0 0 0-4-4h-8.212l21.339-30.93 21.34 30.93z" />
                <path d="M135.97 222.568h2.23a4 4 0 0 0 0-8h-2.23a4 4 0 0 0 0 8zM85.348 218.568a4 4 0 0 0 4 4h27.48a4 4 0 0 0 0-8h-27.48a4 4 0 0 0-4 4z" />
              </svg>
            </div>
            <h3 className="hs-service-cat">WORKSHOPS &amp; EVENTS</h3>
            <div className="hs-service-name">Learn, Create &amp;&nbsp;Connect</div>
            <p>Join storytelling sessions, art workshops, book clubs, hobby classes, and community events for all ages.</p>
            <span className="hs-service-cta">Explore Events <span className="a">&rarr;</span></span>
          </Link>
          <Link className="hs-service" to="/contact">
            <div className="hs-service-icon">
              <svg viewBox="5 4 38 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="7" y="10" width="34" height="32" rx="3" />
                <path d="M7 19h34" />
                <path d="M16 6v8M32 6v8" />
                <path d="M24 24l2.4 4.9 5.4.8-3.9 3.8.9 5.4L24 36.4l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z" />
              </svg>
            </div>
            <h3 className="hs-service-cat">RENT OUR SPACE</h3>
            <div className="hs-service-name">Celebrate &amp;&nbsp;Host with Us</div>
            <p>A warm, book-filled venue for birthdays, corporate meetups, workshops, book launches, and small private gatherings.</p>
            <span className="hs-service-cta">Book the Space <span className="a">&rarr;</span></span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function NewArrivalsSection() {
  const { data: rows } = useShopBooks();
  const books = adaptShopBooks(rows).slice(0, 5);

  return (
    <section className="hs-section" id="arrivals" style={{ paddingTop: 20 }}>
      <div className="hs-wrap">
        <div className="hs-head hs-head-arrivals">
          <div className="hs-kicker hs-kicker-mini">Fresh stories just in</div>
          <Link to="/shop" className="hs-head-viewall">View All <span className="a">→</span></Link>
        </div>
        <div className="hs-arrivals">
          {books.map((b) => (
            <Link to="/shop" key={b.id} className="hs-book-card">
              {b.coverUrl ? (
                <div className="hs-cover hs-cover-photo">
                  <img src={b.coverUrl} alt="" loading="lazy" />
                </div>
              ) : (
                <div className={`hs-cover c-${b.coverVariant}`}>
                  <div className="title-line">{b.title}</div>
                  <div className="author-line">{b.author}</div>
                </div>
              )}
              <div className="hs-book-title">{b.title}</div>
              <div className="hs-book-price">Rs. {Number(b.price || 0).toFixed(2)}</div>
            </Link>
          ))}
          <Link to="/shop" className="hs-book-viewall" aria-label="View all books">
            <span className="hs-book-viewall-circle" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6"/>
              </svg>
            </span>
            <span className="hs-book-viewall-label">View All</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section className="hs-section" id="membership" style={{ paddingTop: 40 }}>
      <div className="hs-wrap">
        <div className="hs-head hs-head-centered">
          <div className="hs-kicker">Membership</div>
          <h2 className="hs-head-headline">Choose your membership</h2>
        </div>
        <div className="hs-pricing">
          <div className="hs-pricing-card">
            <div className="price">₹600 <small>/month</small></div>
            <div className="deposit">+ ₹1,000 one-time deposit</div>
            <h3>Monthly</h3>
            <p>Full library membership, billed month to month.</p>
            <ul>
              <li>Full library access</li>
              <li>Borrow 2 books at a time</li>
              <li>10% off the café</li>
            </ul>
            <Link to="/sign-up" className="hs-pricing-btn">Choose plan</Link>
          </div>
          <div className="hs-pricing-card">
            <span className="badge">BEST VALUE</span>
            <div className="price">₹6,000 <small>/year</small></div>
            <div className="deposit">+ ₹1,000 one-time deposit</div>
            <h3>Yearly</h3>
            <p>The same membership for a year, at the best rate.</p>
            <ul>
              <li>Full library access</li>
              <li>Borrow 2 books at a time</li>
              <li>10% off the café</li>
            </ul>
            <Link to="/sign-up" className="hs-pricing-btn">Choose plan</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function UpcomingEventsSection() {
  const { data: rows } = useEvents();
  const upcoming = splitEvents(rows || []).upcoming;
  const today = new Date().toISOString().slice(0, 10);
  const events = upcoming
    .filter((e) => e.iso >= today)
    .sort((a, b) => (a.iso || '').localeCompare(b.iso || ''))
    .slice(0, 5);

  // Hide the whole section when nothing is upcoming.
  if (events.length === 0) return null;

  return (
    <section className="hs-section" id="upcoming" style={{ paddingTop: 40 }}>
      <div className="hs-wrap">
        <div className="hs-head hs-head-centered">
          <div className="hs-kicker">Upcoming Events</div>
          <p className="hs-head-sublede">Weekly clubs, translator evenings, poetry suppers, and the occasional quiet Saturday. All welcome, members first.</p>
        </div>
        <div className="hs-calendar">
          {events.map((e) => {
            const { m, d } = isoToMonthDay(e.iso);
            return (
              <Link key={e.slug} to="/events" className="hs-row-ev">
                <div className="d">{m}<b>{d}</b></div>
                <div className="t">
                  <h4>{e.title} <em>{e.italic}</em></h4>
                  <p>{e.description}</p>
                </div>
                <span className={`tag ${chipClass(e)}`}>{badgeText(e)}</span>
                <span className="go">→</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// --- root -------------------------------------------------------------
export default function HomeSections() {
  return (
    <div className="home-sections">
      <style>{HOME_SECTIONS_CSS}</style>
      <ServicesSection />
      {/* "Fresh stories" teases books for sale — hidden while the shop is Coming Soon. */}
      {false && <NewArrivalsSection />}
      <PricingSection />
      <UpcomingEventsSection />
    </div>
  );
}
