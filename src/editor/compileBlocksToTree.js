// =====================================================================
// compileBlocksToTree
//
// One-way compiler: takes the current composite block array and emits a
// Node tree of DOM primitives per the v2 schema. Also produces the
// matching ClassDef map so every visual element has a named class.
//
// Called once by scripts/migrateBlocksToTree.mjs to populate
// store_content_v2 without touching the live store_content row.
//
// Every handler below is a pure function (block → { nodes, classes })
// so migration is idempotent: running twice produces byte-identical
// output. If a block type has no handler, we emit a placeholder div
// with a visible warning class so staff can spot gaps in QA.
// =====================================================================

import { makeNode, newId } from './schema.js';

// ---- Shared style presets (the look of the current Tapas site) ------

const LIME = '#CFF389';
const PINK = '#EF3D7B';
const INK  = '#1F2937';
const INK_DIM = '#4B5563';

// Styles that every handler seeds into `classes`. The compiler emits
// `ClassDef`s in the shape the new editor understands. All written to
// the `base` style block + `desktop` breakpoint; mode/responsive
// overrides stay empty so the editor can layer them on later.
function cls(name, styles) {
  return {
    [name]: {
      name,
      isGlobal: false,
      styles: { base: styles },
      breakpoints: { desktop: styles },
      modes: {},
    },
  };
}

// ---- Per-block compilers --------------------------------------------
// Each compiler takes (props) and returns { root: Node, classes: {..} }.
// They mirror the visual output of the current TapasFigmaBlocks
// components so the v2 page renders pixel-identically.

function compileTapasHero(props = {}) {
  const {
    headline_line1 = 'Discover Our',
    headline_line2 = 'New Collection',
    description = '',
    cta_text = 'Join now!',
    cta_href = '/books',
    image_url = 'HERO-LIBRARY.png',
  } = props;

  const classes = {
    ...cls('tapas-hero', {
      position: 'relative', overflow: 'hidden', background: LIME,
      'margin-top': '-64px',
    }),
    ...cls('tapas-hero-wrap', {
      display: 'grid',
      'grid-template-columns': '0.9fr 1.3fr',
      'min-height': '720px',
    }),
    ...cls('tapas-hero-copy', {
      background: LIME, position: 'relative',
      padding: 'clamp(40px, 6vw, 96px) clamp(20px, 6vw, 80px)',
      display: 'flex', 'flex-direction': 'column', 'justify-content': 'center',
    }),
    ...cls('tapas-hero-headline', {
      margin: '0',
      'font-family': 'var(--tapas-heading-font, Newsreader, serif)',
      'font-size': 'clamp(34px, 4.5vw, 58px)',
      'line-height': '1.05',
      color: INK, 'font-weight': '700', 'letter-spacing': '-0.01em',
    }),
    ...cls('tapas-hero-desc', {
      'margin-top': '18px', 'max-width': '440px',
      color: INK_DIM, 'font-size': '15px', 'line-height': '1.65',
    }),
    ...cls('tapas-hero-cta', {
      display: 'inline-block', padding: '14px 30px',
      'border-radius': '999px',
      background: PINK, color: '#fff',
      'font-weight': '700', 'font-size': '14px', 'letter-spacing': '0.5px',
      'text-decoration': 'none', 'text-transform': 'uppercase',
      'box-shadow': '0 8px 20px rgba(239,61,123,0.35)',
    }),
    ...cls('tapas-hero-cta-wrap', { 'margin-top': '28px' }),
    ...cls('tapas-hero-photo', { background: LIME, position: 'relative' }),
    ...cls('tapas-hero-photo-img', {
      width: '100%', height: '100%', 'object-fit': 'cover', display: 'block',
    }),
  };

  const root = makeNode({
    tag: 'section', classes: ['tapas-hero'],
    children: [
      makeNode({
        tag: 'div', classes: ['tapas-hero-wrap'],
        children: [
          makeNode({
            tag: 'div', classes: ['tapas-hero-copy'],
            children: [
              makeNode({
                tag: 'h1', classes: ['tapas-hero-headline'],
                textContent: `${headline_line1}\n${headline_line2}`,
              }),
              makeNode({
                tag: 'p', classes: ['tapas-hero-desc'],
                textContent: description,
              }),
              makeNode({
                tag: 'div', classes: ['tapas-hero-cta-wrap'],
                children: [
                  makeNode({
                    tag: 'a', classes: ['tapas-hero-cta'],
                    attributes: { href: cta_href },
                    textContent: cta_text,
                  }),
                ],
              }),
            ],
          }),
          makeNode({
            tag: 'div', classes: ['tapas-hero-photo'],
            children: [
              makeNode({
                tag: 'img', classes: ['tapas-hero-photo-img'],
                attributes: { src: image_url, alt: 'Hero photo' },
              }),
            ],
          }),
        ],
      }),
    ],
  });

  return { root, classes };
}

function compileTapasServices(props = {}) {
  const {
    eyebrow = 'Our Services',
    heading = 'We provide great services for our customers based on',
    items = [],
  } = props;
  const classes = {
    ...cls('tapas-services', {
      background: LIME, padding: 'clamp(60px, 8vw, 110px) 20px',
    }),
    ...cls('tapas-services-inner', {
      'max-width': '1180px', margin: '0 auto',
    }),
    ...cls('tapas-services-header', {
      'text-align': 'center', 'margin-bottom': '54px',
    }),
    ...cls('tapas-services-eyebrow', {
      color: '#7E22CE', 'font-weight': '700', 'font-size': '12px',
      'letter-spacing': '2.5px', 'text-transform': 'uppercase',
    }),
    ...cls('tapas-services-heading', {
      'margin-top': '12px',
      'font-family': 'var(--tapas-heading-font, Newsreader, serif)',
      'font-size': 'clamp(28px, 3.6vw, 40px)',
      color: INK, 'font-weight': '700', 'line-height': '1.2',
      'max-width': '720px', 'margin-inline': 'auto',
    }),
    ...cls('tapas-services-grid', {
      display: 'grid',
      'grid-template-columns': 'repeat(auto-fit, minmax(260px, 1fr))',
      gap: '24px',
    }),
    ...cls('tapas-service-card', {
      background: '#fff', 'border-radius': '12px',
      padding: '36px 28px 28px', 'text-align': 'center',
      'box-shadow': '0 8px 30px rgba(31,41,55,0.08)',
    }),
    ...cls('tapas-service-icon', {
      'font-size': '64px', 'line-height': '1', 'margin-bottom': '20px',
    }),
    ...cls('tapas-service-title', {
      margin: '0', 'font-size': '17px', 'font-weight': '700', color: INK,
      'letter-spacing': '0.5px', 'text-transform': 'uppercase',
    }),
    ...cls('tapas-service-body', {
      'margin-top': '14px', color: INK_DIM,
      'font-size': '14px', 'line-height': '1.6', 'min-height': '64px',
    }),
    ...cls('tapas-service-link', {
      display: 'inline-flex', 'align-items': 'center', gap: '6px',
      'margin-top': '18px', color: '#7E22CE', 'font-weight': '700',
      'font-size': '13px', 'text-decoration': 'none',
    }),
  };

  const cardNodes = (items.length ? items : []).map((s) =>
    makeNode({
      tag: 'div', classes: ['tapas-service-card'],
      children: [
        makeNode({ tag: 'div', classes: ['tapas-service-icon'], textContent: s.icon || '✨' }),
        makeNode({ tag: 'h3', classes: ['tapas-service-title'], textContent: s.title || '' }),
        makeNode({ tag: 'p', classes: ['tapas-service-body'], textContent: s.body || '' }),
        s.cta_text && s.cta_href
          ? makeNode({
              tag: 'a', classes: ['tapas-service-link'],
              attributes: { href: s.cta_href },
              textContent: `${s.cta_text} →`,
            })
          : null,
      ].filter(Boolean),
    })
  );

  const root = makeNode({
    tag: 'section', classes: ['tapas-services'],
    children: [
      makeNode({
        tag: 'div', classes: ['tapas-services-inner'],
        children: [
          makeNode({
            tag: 'div', classes: ['tapas-services-header'],
            children: [
              makeNode({ tag: 'div', classes: ['tapas-services-eyebrow'], textContent: eyebrow }),
              makeNode({ tag: 'h2', classes: ['tapas-services-heading'], textContent: heading }),
            ],
          }),
          makeNode({ tag: 'div', classes: ['tapas-services-grid'], children: cardNodes }),
        ],
      }),
    ],
  });

  return { root, classes };
}

function compileTapasNewsletter(props = {}) {
  const {
    headline = '✉ Subscribe to our Newsletter',
    subtext = 'Monthly book picks, member events, and quiet announcements.',
    placeholder = 'Your email address',
    button_text = 'Subscribe',
    background_color = '#1F1F1F',
  } = props;

  const classes = {
    ...cls('tapas-newsletter', {
      background: background_color, padding: '34px 20px',
    }),
    ...cls('tapas-newsletter-inner', {
      'max-width': '1180px', margin: '0 auto',
      display: 'flex', 'align-items': 'center',
      'justify-content': 'space-between', gap: '24px',
      'flex-wrap': 'wrap', color: '#fff',
    }),
    ...cls('tapas-newsletter-headline', { 'font-size': '18px', 'font-weight': '700' }),
    ...cls('tapas-newsletter-subtext', {
      'font-size': '12px', color: '#A0A0A0', 'margin-top': '4px',
    }),
    ...cls('tapas-newsletter-form', {
      display: 'flex', gap: '8px', flex: '1 1 320px', 'max-width': '520px',
    }),
    ...cls('tapas-newsletter-input', {
      flex: '1', padding: '12px 16px', border: 'none',
      background: '#2A2A2A', color: '#fff',
      'border-radius': '4px', 'font-size': '14px', outline: 'none',
    }),
    ...cls('tapas-newsletter-btn', {
      padding: '12px 24px', border: 'none', background: PINK, color: '#fff',
      'border-radius': '4px', 'font-weight': '700', 'font-size': '13px',
      cursor: 'pointer', 'letter-spacing': '0.5px',
    }),
  };

  const root = makeNode({
    tag: 'section', classes: ['tapas-newsletter'],
    children: [
      makeNode({
        tag: 'div', classes: ['tapas-newsletter-inner'],
        children: [
          makeNode({
            tag: 'div',
            children: [
              makeNode({ tag: 'div', classes: ['tapas-newsletter-headline'], textContent: headline }),
              makeNode({ tag: 'div', classes: ['tapas-newsletter-subtext'], textContent: subtext }),
            ],
          }),
          makeNode({
            tag: 'form', classes: ['tapas-newsletter-form'],
            children: [
              makeNode({
                tag: 'input', classes: ['tapas-newsletter-input'],
                attributes: { type: 'email', placeholder },
              }),
              makeNode({
                tag: 'button', classes: ['tapas-newsletter-btn'],
                attributes: { type: 'submit' },
                textContent: button_text,
              }),
            ],
          }),
        ],
      }),
    ],
  });

  return { root, classes };
}

// Minimal stub — enough to not crash the migration. Real handlers for
// tapas_new_arrivals, tapas_inspiration, tapas_testimonials land in
// session two of Phase 0. Every unhandled block becomes a placeholder
// div that's visually distinct in the editor so staff notice it.
function compilePlaceholder(block) {
  const classes = cls('tapas-compile-placeholder', {
    padding: '40px 20px', background: '#FEF3C7',
    border: '2px dashed #F59E0B', color: '#92400E',
    'text-align': 'center', 'font-family': 'ui-monospace, monospace',
    'font-size': '13px', margin: '12px 20px',
  });
  const root = makeNode({
    tag: 'div', classes: ['tapas-compile-placeholder'],
    textContent: `⚠ No v2 compiler yet for block type: ${block.type}`,
  });
  return { root, classes };
}

const COMPILERS = {
  tapas_hero:        compileTapasHero,
  tapas_services:    compileTapasServices,
  tapas_newsletter:  compileTapasNewsletter,
};

// Compile a single block to a { root, classes } bundle.
export function compileBlock(block) {
  if (!block || !block.type) return compilePlaceholder(block || { type: 'unknown' });
  const fn = COMPILERS[block.type];
  if (!fn) return compilePlaceholder(block);
  const out = fn(block.props || {});
  // Preserve the block's id on the root node so the editor's
  // Undo/Redo history can follow identity across compiles.
  return { root: { ...out.root, id: block.id || out.root.id }, classes: out.classes || {} };
}

// Compile an entire page's block array into a single tree + class map.
// The tree root is a <body> wrapper containing every block's root.
export function compilePageBlocks(blocks) {
  const bodyChildren = [];
  const classes = {};
  for (const b of (blocks || [])) {
    const { root, classes: cs } = compileBlock(b);
    bodyChildren.push(root);
    Object.assign(classes, cs);
  }
  const tree = makeNode({
    id: newId('body'),
    tag: 'body',
    children: bodyChildren,
  });
  return { tree, classes };
}

// Compile every page in a legacy content blob. Merges all class maps
// into a single site-wide `classes` record (per § 8, classes are
// site-wide, not per page).
export function compileSiteContent(legacy) {
  const pages = {};
  const classes = {};
  const legacyPages = (legacy && legacy.pages) || {};
  for (const [key, page] of Object.entries(legacyPages)) {
    const { tree, classes: cs } = compilePageBlocks(page?.blocks || []);
    Object.assign(classes, cs);
    pages[key] = {
      id: `p_${key}`,
      name: page?.meta?.title || key,
      slug: key === 'home' ? '/' : `/${key}`,
      tree,
      meta: {
        title: page?.meta?.title || '',
        description: page?.meta?.description || '',
        og_image: page?.meta?.og_image || '',
        canonical_url: page?.meta?.canonical_url || '',
        robots_noindex: !!page?.meta?.robots_noindex,
      },
    };
  }
  return {
    schema_version: 2,
    pages,
    classes,
    variables: {},
    components: {},
    interactions: {},
    brand: {
      name: legacy?.brand?.name || 'TAPAS reading cafe',
      logo_url: legacy?.brand?.logo_url || '',
      primary_color: legacy?.brand?.primary_color || LIME,
      accent_color:  legacy?.brand?.accent_color  || PINK,
    },
    // Keep the source draft around for one-step rollback during
    // Phase 10 cutover. Stripped after cutover.
    _migrated_from: {
      taken_at: new Date().toISOString(),
      source_keys: Object.keys(legacyPages),
    },
  };
}
