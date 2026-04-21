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

function compileTapasNewArrivals(props = {}) {
  const { eyebrow = 'New Arrivals', items = [] } = props;
  const classes = {
    ...cls('tapas-arrivals', { background: LIME, padding: '0 20px clamp(60px, 8vw, 110px)' }),
    ...cls('tapas-arrivals-inner', { 'max-width': '1180px', margin: '0 auto' }),
    ...cls('tapas-arrivals-header', { 'text-align': 'center', 'margin-bottom': '38px' }),
    ...cls('tapas-arrivals-eyebrow', {
      color: '#7E22CE', 'font-weight': '700', 'font-size': '12px',
      'letter-spacing': '2.5px', 'text-transform': 'uppercase',
    }),
    ...cls('tapas-arrivals-grid', {
      display: 'grid',
      'grid-template-columns': 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '20px',
    }),
    ...cls('tapas-arrival-card', {
      background: '#fff', 'border-radius': '4px', overflow: 'hidden',
      position: 'relative', cursor: 'pointer',
      'box-shadow': '0 4px 14px rgba(31,41,55,0.06)',
    }),
    ...cls('tapas-arrival-media', { position: 'relative' }),
    ...cls('tapas-arrival-img', {
      width: '100%', height: '100%', 'aspect-ratio': '1 / 1',
      'object-fit': 'cover', display: 'block', background: '#E5E7EB',
    }),
    ...cls('tapas-arrival-badge', {
      position: 'absolute', top: '14px', right: '14px',
      background: PINK, color: '#fff',
      width: '46px', height: '46px', 'border-radius': '50%',
      display: 'inline-flex', 'align-items': 'center', 'justify-content': 'center',
      'font-size': '12px', 'font-weight': '700',
    }),
    ...cls('tapas-arrival-badge-new', {
      background: '#2BB673',
    }),
    ...cls('tapas-arrival-body', { padding: '16px 18px 22px' }),
    ...cls('tapas-arrival-title', { 'font-size': '20px', 'font-weight': '700', color: INK }),
    ...cls('tapas-arrival-sub', { 'margin-top': '4px', 'font-size': '13px', color: '#9CA3AF' }),
    ...cls('tapas-arrival-price-row', {
      'margin-top': '10px', display: 'flex',
      'align-items': 'baseline', gap: '10px',
    }),
    ...cls('tapas-arrival-price', { 'font-size': '17px', 'font-weight': '700', color: INK }),
    ...cls('tapas-arrival-strike', {
      'font-size': '12px', color: '#9CA3AF', 'text-decoration': 'line-through',
    }),
  };

  const cardNodes = items.map((a) => {
    const badgeClasses = ['tapas-arrival-badge'];
    if (a.badge === 'New') badgeClasses.push('tapas-arrival-badge-new');
    return makeNode({
      tag: 'article', classes: ['tapas-arrival-card'],
      children: [
        makeNode({
          tag: 'div', classes: ['tapas-arrival-media'],
          children: [
            makeNode({
              tag: 'img', classes: ['tapas-arrival-img'],
              attributes: { src: a.image_url || '', alt: a.title || '' },
            }),
            a.badge
              ? makeNode({ tag: 'span', classes: badgeClasses, textContent: a.badge })
              : null,
          ].filter(Boolean),
        }),
        makeNode({
          tag: 'div', classes: ['tapas-arrival-body'],
          children: [
            makeNode({ tag: 'div', classes: ['tapas-arrival-title'], textContent: a.title || '' }),
            makeNode({ tag: 'div', classes: ['tapas-arrival-sub'], textContent: a.sub || '' }),
            makeNode({
              tag: 'div', classes: ['tapas-arrival-price-row'],
              children: [
                makeNode({ tag: 'span', classes: ['tapas-arrival-price'], textContent: a.price || '' }),
                a.strike
                  ? makeNode({ tag: 'span', classes: ['tapas-arrival-strike'], textContent: a.strike })
                  : null,
              ].filter(Boolean),
            }),
          ],
        }),
      ],
    });
  });

  const root = makeNode({
    tag: 'section', classes: ['tapas-arrivals'],
    children: [
      makeNode({
        tag: 'div', classes: ['tapas-arrivals-inner'],
        children: [
          makeNode({
            tag: 'div', classes: ['tapas-arrivals-header'],
            children: [
              makeNode({ tag: 'div', classes: ['tapas-arrivals-eyebrow'], textContent: eyebrow }),
            ],
          }),
          makeNode({ tag: 'div', classes: ['tapas-arrivals-grid'], children: cardNodes }),
        ],
      }),
    ],
  });

  return { root, classes };
}

function compileTapasInspiration(props = {}) {
  const {
    heading_line1 = '50+ Beautiful rooms',
    heading_line2 = 'inspiration',
    description = '',
    cta_text = 'Explore More',
    cta_href = '/blog',
    image_1_url = 'room-1.jpg',
    image_2_url = 'room-2.jpg',
    badge_eyebrow = '',
    badge_title = '',
    background_color = '#FBF8EE',
  } = props;

  const classes = {
    ...cls('tapas-inspiration', {
      background: background_color, padding: 'clamp(60px, 8vw, 100px) 20px',
    }),
    ...cls('tapas-inspiration-grid', {
      display: 'grid', 'grid-template-columns': '1fr 1.4fr',
      gap: 'clamp(24px, 4vw, 60px)', 'align-items': 'center',
      'max-width': '1180px', margin: '0 auto',
    }),
    ...cls('tapas-inspiration-heading', {
      margin: '0', 'font-family': 'var(--tapas-heading-font, Newsreader, serif)',
      'font-size': 'clamp(28px, 3.6vw, 40px)', color: INK,
      'font-weight': '700', 'line-height': '1.2', 'letter-spacing': '-0.01em',
    }),
    ...cls('tapas-inspiration-desc', {
      'margin-top': '14px', color: INK_DIM,
      'font-size': '14px', 'line-height': '1.65', 'max-width': '320px',
    }),
    ...cls('tapas-inspiration-cta', {
      display: 'inline-block', 'margin-top': '24px',
      padding: '12px 26px', 'border-radius': '6px',
      background: PINK, color: '#fff', 'font-weight': '700',
      'font-size': '13px', 'text-decoration': 'none',
      'letter-spacing': '0.5px', 'text-transform': 'uppercase',
    }),
    ...cls('tapas-inspiration-images', {
      display: 'flex', gap: '20px', overflow: 'hidden', position: 'relative',
    }),
    ...cls('tapas-inspiration-big', { flex: '0 0 60%', position: 'relative' }),
    ...cls('tapas-inspiration-big-img', {
      width: '100%', 'aspect-ratio': '3 / 4',
      'object-fit': 'cover', display: 'block', background: '#EAE3D2',
    }),
    ...cls('tapas-inspiration-badge', {
      position: 'absolute', bottom: '16px', left: '16px',
      background: 'rgba(255,255,255,0.92)',
      padding: '14px 18px', 'border-radius': '6px',
    }),
    ...cls('tapas-inspiration-badge-eyebrow', {
      'font-size': '11px', color: '#9CA3AF', 'letter-spacing': '1px',
    }),
    ...cls('tapas-inspiration-badge-title', {
      'font-size': '18px', 'font-weight': '700', color: INK,
    }),
    ...cls('tapas-inspiration-side', { flex: '1' }),
    ...cls('tapas-inspiration-side-img', {
      width: '100%', 'aspect-ratio': '3 / 4',
      'object-fit': 'cover', display: 'block', background: '#F0EAD8',
    }),
  };

  const badgeNode = (badge_eyebrow || badge_title)
    ? makeNode({
        tag: 'div', classes: ['tapas-inspiration-badge'],
        children: [
          makeNode({ tag: 'div', classes: ['tapas-inspiration-badge-eyebrow'], textContent: badge_eyebrow }),
          makeNode({ tag: 'div', classes: ['tapas-inspiration-badge-title'], textContent: badge_title }),
        ],
      })
    : null;

  const root = makeNode({
    tag: 'section', classes: ['tapas-inspiration'],
    children: [
      makeNode({
        tag: 'div', classes: ['tapas-inspiration-grid'],
        children: [
          makeNode({
            tag: 'div',
            children: [
              makeNode({
                tag: 'h2', classes: ['tapas-inspiration-heading'],
                textContent: `${heading_line1}\n${heading_line2}`,
              }),
              makeNode({ tag: 'p', classes: ['tapas-inspiration-desc'], textContent: description }),
              cta_text
                ? makeNode({
                    tag: 'a', classes: ['tapas-inspiration-cta'],
                    attributes: { href: cta_href },
                    textContent: cta_text,
                  })
                : null,
            ].filter(Boolean),
          }),
          makeNode({
            tag: 'div', classes: ['tapas-inspiration-images'],
            children: [
              makeNode({
                tag: 'div', classes: ['tapas-inspiration-big'],
                children: [
                  makeNode({
                    tag: 'img', classes: ['tapas-inspiration-big-img'],
                    attributes: { src: image_1_url, alt: 'inspiration-1' },
                  }),
                  badgeNode,
                ].filter(Boolean),
              }),
              makeNode({
                tag: 'div', classes: ['tapas-inspiration-side'],
                children: [
                  makeNode({
                    tag: 'img', classes: ['tapas-inspiration-side-img'],
                    attributes: { src: image_2_url, alt: 'inspiration-2' },
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  return { root, classes };
}

function compileTapasTestimonials(props = {}) {
  const { items = [], background_color = LIME } = props;
  const classes = {
    ...cls('tapas-testimonials', {
      background: background_color, padding: 'clamp(60px, 8vw, 100px) 20px',
    }),
    ...cls('tapas-testimonials-grid', {
      'max-width': '1080px', margin: '0 auto',
      display: 'grid',
      'grid-template-columns': 'repeat(auto-fit, minmax(320px, 1fr))',
      gap: '40px', 'text-align': 'center',
    }),
    ...cls('tapas-testimonial-avatar', {
      width: '64px', height: '64px', 'border-radius': '50%',
      background: '#D1D5DB', margin: '0 auto 18px',
      display: 'flex', 'align-items': 'center', 'justify-content': 'center',
      color: '#6B7280', 'font-size': '28px',
    }),
    ...cls('tapas-testimonial-quote', {
      'font-family': 'var(--tapas-heading-font, Newsreader, serif)',
      'font-size': '20px', 'font-weight': '700', color: INK,
    }),
    ...cls('tapas-testimonial-body', {
      'margin-top': '10px', color: INK_DIM,
      'font-size': '14px', 'line-height': '1.6',
      'max-width': '320px', 'margin-inline': 'auto',
    }),
    ...cls('tapas-testimonial-author', {
      'margin-top': '18px', 'font-weight': '700', color: INK, 'font-size': '14px',
    }),
    ...cls('tapas-testimonial-role', { color: '#9CA3AF', 'font-size': '12px' }),
  };

  const cardNodes = items.map((r) =>
    makeNode({
      tag: 'div',
      children: [
        makeNode({ tag: 'div', classes: ['tapas-testimonial-avatar'], textContent: '👤' }),
        makeNode({ tag: 'div', classes: ['tapas-testimonial-quote'], textContent: `"${r.quote || ''}"` }),
        makeNode({ tag: 'p', classes: ['tapas-testimonial-body'], textContent: r.body || '' }),
        makeNode({ tag: 'div', classes: ['tapas-testimonial-author'], textContent: r.author || '' }),
        makeNode({ tag: 'div', classes: ['tapas-testimonial-role'], textContent: r.role || '' }),
      ],
    })
  );

  const root = makeNode({
    tag: 'section', classes: ['tapas-testimonials'],
    children: [
      makeNode({ tag: 'div', classes: ['tapas-testimonials-grid'], children: cardNodes }),
    ],
  });

  return { root, classes };
}

function compileTapasSection(props = {}) {
  const {
    eyebrow = '',
    heading = 'Section heading',
    subtext = '',
    text_color = INK,
    background_color = '#FBF8EE',
    padding_y = 80,
    max_width = 960,
    align = 'center',
  } = props;
  const textAlign = align === 'left' ? 'left' : align === 'right' ? 'right' : 'center';
  const classes = {
    ...cls('tapas-section', {
      background: background_color, padding: `${padding_y}px 20px`,
    }),
    ...cls('tapas-section-inner', {
      'max-width': `${max_width}px`, margin: textAlign === 'center' ? '0 auto' : '0',
      'text-align': textAlign,
    }),
    ...cls('tapas-section-eyebrow', {
      color: '#7E22CE', 'font-weight': '700', 'font-size': '12px',
      'letter-spacing': '2.5px', 'text-transform': 'uppercase',
      'margin-bottom': '14px',
    }),
    ...cls('tapas-section-heading', {
      margin: '0', 'font-family': 'var(--tapas-heading-font, Newsreader, serif)',
      'font-size': 'clamp(28px, 3.6vw, 44px)', color: text_color,
      'font-weight': '700', 'line-height': '1.2', 'letter-spacing': '-0.01em',
    }),
    ...cls('tapas-section-subtext', {
      'margin-top': '18px', color: text_color, opacity: '0.75',
      'font-size': '16px', 'line-height': '1.7',
      'max-width': textAlign === 'center' ? '640px' : '100%',
      margin: textAlign === 'center' ? '18px auto 0' : '18px 0 0',
    }),
  };
  const root = makeNode({
    tag: 'section', classes: ['tapas-section'],
    children: [
      makeNode({
        tag: 'div', classes: ['tapas-section-inner'],
        children: [
          eyebrow ? makeNode({ tag: 'div', classes: ['tapas-section-eyebrow'], textContent: eyebrow }) : null,
          makeNode({ tag: 'h2', classes: ['tapas-section-heading'], textContent: heading }),
          subtext ? makeNode({ tag: 'p', classes: ['tapas-section-subtext'], textContent: subtext }) : null,
        ].filter(Boolean),
      }),
    ],
  });
  return { root, classes };
}

function compileTapasGroup(props = {}) {
  const {
    children: groupChildren = [],
    background_color = 'transparent',
    padding_y = 0, padding_x = 0,
    max_width = 0,
    align = 'stretch',
    direction = 'column',
    gap = 0,
  } = props;
  const classes = {
    ...cls('tapas-group', {
      background: background_color,
      padding: `${padding_y || 0}px ${padding_x || 0}px`,
    }),
    ...cls('tapas-group-inner', {
      display: 'flex',
      'flex-direction': direction === 'row' ? 'row' : 'column',
      'align-items':
        align === 'stretch' ? 'stretch' :
        align === 'center' ? 'center' :
        align === 'end' ? 'flex-end' : 'flex-start',
      gap: `${gap || 0}px`,
      ...(max_width > 0 ? { 'max-width': `${max_width}px`, margin: '0 auto' } : {}),
    }),
  };
  // Recursively compile each child block. Any classes the children emit
  // merge into the caller's class map — walkTree at migration time
  // ensures no duplicates.
  const childResults = (groupChildren || []).map(compileBlock);
  const mergedClasses = childResults.reduce(
    (acc, r) => Object.assign(acc, r.classes || {}),
    classes
  );
  const root = makeNode({
    tag: 'section', classes: ['tapas-group'],
    children: [
      makeNode({
        tag: 'div', classes: ['tapas-group-inner'],
        children: childResults.map(r => r.root),
      }),
    ],
  });
  return { root, classes: mergedClasses };
}

// ---- Navbar ---------------------------------------------------------
// Global chrome in v1 was rendered outside the blocks array; here we
// compile to a real tree so v2 pages own their own nav. Class names
// follow the Webflow-parity spec: tapas-navbar / -logo / -links /
// -link / -toggle. The mobile hamburger is a button with a data-*
// hook so the Canvas runtime (see WebsiteEditor.js surface click
// handler) can flip data-tapas-navbar-open on the nav root.

function compileTapasNavbar(props = {}) {
  const {
    brand_name = 'TAPAS',
    logo_emoji = '',
    links = [
      { label: 'Home',    href: '/' },
      { label: 'About',   href: '/about' },
      { label: 'Books',   href: '/books' },
      { label: 'Events',  href: '/events' },
      { label: 'Contact', href: '/contact' },
    ],
    login_label = 'Login',
  } = props;

  const classes = {
    ...cls('tapas-navbar', {
      position: 'sticky', top: '0', 'z-index': '50',
      background: '#ffffff',
      'border-bottom': '1px solid #E5E7EB',
      display: 'flex', 'align-items': 'center',
      'justify-content': 'space-between',
      padding: '14px clamp(20px, 5vw, 48px)',
      'font-family': 'Inter, -apple-system, sans-serif',
    }),
    ...cls('tapas-navbar-logo', {
      'font-family': 'var(--tapas-heading-font, Newsreader, serif)',
      'font-size': '22px', 'font-weight': '700',
      color: INK, 'text-decoration': 'none',
      'letter-spacing': '0.01em',
    }),
    ...cls('tapas-navbar-links', {
      display: 'flex', gap: '28px', 'align-items': 'center',
      'list-style': 'none', margin: '0', padding: '0',
    }),
    ...cls('tapas-navbar-link', {
      color: INK, 'text-decoration': 'none',
      'font-size': '14px', 'font-weight': '500',
    }),
    ...cls('tapas-navbar-toggle', {
      display: 'none', background: 'transparent', border: 'none',
      cursor: 'pointer', padding: '8px', color: INK,
      'font-size': '20px',
    }),
  };

  const linkItems = (links || []).map((l) =>
    makeNode({
      tag: 'li',
      children: [
        makeNode({
          tag: 'a', classes: ['tapas-navbar-link'],
          attributes: { href: l.href || '/' },
          textContent: l.label || 'Link',
        }),
      ],
    })
  );

  // Login/CTA appended to the links list so the whole row shares the
  // same mobile collapse.
  if (login_label) {
    linkItems.push(
      makeNode({
        tag: 'li',
        children: [
          makeNode({
            tag: 'a', classes: ['tapas-navbar-link'],
            attributes: { href: '/login' },
            textContent: login_label,
          }),
        ],
      })
    );
  }

  const root = makeNode({
    tag: 'nav', classes: ['tapas-navbar'],
    attributes: { 'data-tapas-navbar': '' },
    children: [
      makeNode({
        tag: 'a', classes: ['tapas-navbar-logo'],
        attributes: { href: '/' },
        textContent: logo_emoji ? `${logo_emoji} ${brand_name}` : brand_name,
      }),
      makeNode({
        tag: 'ul', classes: ['tapas-navbar-links'],
        children: linkItems,
      }),
      makeNode({
        tag: 'button', classes: ['tapas-navbar-toggle'],
        attributes: { 'data-tapas-navbar-toggle': '', 'aria-label': 'Open menu' },
        textContent: '☰',
      }),
    ],
  });

  return { root, classes };
}

// ---- Footer ---------------------------------------------------------
// Site-wide footer, compiled into the per-page tree. Four columns of
// links + a copyright bar. Matches the 'classic' v1 template.

function compileTapasFooter(props = {}) {
  const {
    tagline = '',
    brand_name = 'TAPAS',
    copyright_text = 'All rights reserved.',
    quick_links_heading = 'Quick Links',
    contact_heading = 'Contact',
    hours_heading = 'Opening Hours',
    columns = [
      { heading: 'Shop',  links: [
        { label: 'All books', href: '/books' },
        { label: 'New arrivals', href: '/books?sort=new' },
        { label: 'Offers', href: '/offers' },
      ] },
      { heading: 'About', links: [
        { label: 'Our story', href: '/about' },
        { label: 'Events',    href: '/events' },
        { label: 'Blog',      href: '/blog' },
      ] },
      { heading: 'Visit', links: [
        { label: 'Contact',  href: '/contact' },
        { label: 'Hours',    href: '/about#hours' },
      ] },
    ],
  } = props;

  const classes = {
    ...cls('tapas-footer', {
      background: '#1F1F1F', color: '#E5E7EB',
      padding: 'clamp(48px, 7vw, 96px) clamp(20px, 5vw, 48px) 32px',
    }),
    ...cls('tapas-footer-cols', {
      'max-width': '1180px', margin: '0 auto',
      display: 'grid',
      'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '48px',
      'padding-bottom': '36px',
      'border-bottom': '1px solid #333',
    }),
    ...cls('tapas-footer-col', {
      display: 'flex', 'flex-direction': 'column', gap: '14px',
    }),
    ...cls('tapas-footer-heading', {
      'font-size': '13px', 'font-weight': '700',
      'letter-spacing': '0.1em', 'text-transform': 'uppercase',
      color: '#ffffff', margin: '0 0 4px 0',
    }),
    ...cls('tapas-footer-link', {
      color: '#A0A0A0', 'text-decoration': 'none',
      'font-size': '14px', 'line-height': '1.8',
    }),
    ...cls('tapas-footer-copyright', {
      'max-width': '1180px', margin: '28px auto 0',
      display: 'flex', 'justify-content': 'space-between',
      'flex-wrap': 'wrap', gap: '12px',
      color: '#6A6A6A', 'font-size': '12px',
    }),
  };

  const columnNodes = (columns || []).map((col) =>
    makeNode({
      tag: 'div', classes: ['tapas-footer-col'],
      children: [
        makeNode({
          tag: 'h4', classes: ['tapas-footer-heading'],
          textContent: col.heading || '',
        }),
        ...((col.links || []).map((l) =>
          makeNode({
            tag: 'a', classes: ['tapas-footer-link'],
            attributes: { href: l.href || '/' },
            textContent: l.label || '',
          })
        )),
      ],
    })
  );

  // Prepend a brand/tagline column if tagline is set.
  if (tagline || brand_name) {
    columnNodes.unshift(
      makeNode({
        tag: 'div', classes: ['tapas-footer-col'],
        children: [
          makeNode({
            tag: 'h4', classes: ['tapas-footer-heading'],
            textContent: brand_name,
          }),
          tagline
            ? makeNode({
                tag: 'p', classes: ['tapas-footer-link'],
                textContent: tagline,
              })
            : null,
        ].filter(Boolean),
      })
    );
  }

  const year = new Date().getFullYear();
  const root = makeNode({
    tag: 'footer', classes: ['tapas-footer'],
    children: [
      makeNode({
        tag: 'div', classes: ['tapas-footer-cols'],
        children: columnNodes,
      }),
      makeNode({
        tag: 'div', classes: ['tapas-footer-copyright'],
        children: [
          makeNode({
            tag: 'span',
            textContent: `© ${year} ${brand_name}. ${copyright_text}`,
          }),
        ],
      }),
    ],
  });

  // Classes referenced by hidden headings so callers can override them
  // without re-plumbing — kept to match the spec's named class list.
  void quick_links_heading; void contact_heading; void hours_heading;

  return { root, classes };
}

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
  tapas_hero:         compileTapasHero,
  tapas_services:     compileTapasServices,
  tapas_new_arrivals: compileTapasNewArrivals,
  tapas_inspiration:  compileTapasInspiration,
  tapas_testimonials: compileTapasTestimonials,
  tapas_newsletter:   compileTapasNewsletter,
  tapas_section:      compileTapasSection,
  tapas_group:        compileTapasGroup,
  // v1 block-level navbar / footer overrides. The default site-wide
  // chrome lives outside page blocks (see scripts/migrateNavFooter.mjs);
  // these handle the rare per-page override case.
  navbar:             compileTapasNavbar,
  footer:             compileTapasFooter,
  tapas_navbar:       compileTapasNavbar,
  tapas_footer:       compileTapasFooter,
};

// Export defaults so the nav/footer migration script can reuse them.
export { compileTapasNavbar, compileTapasFooter };

// =====================================================================
// ensureSiteDefaults
//
// Runs on every editor load (see WebsiteEditor.js) so staff don't have
// to remember the migration script. Two guarantees:
//
//   1. Every standard page exists (home, catalog, about, offers,
//      contact, blog, events). Missing ones are minted with an empty
//      body that the self-heal then populates with navbar + footer.
//   2. Every page's tree starts with a tapas-navbar and ends with a
//      tapas-footer. Classes merge additively (existing wins) so
//      user customisations aren't clobbered.
//
// Idempotent — re-running against already-healed content returns the
// same reference identity so autosave can diff and skip the write.
// =====================================================================

const STANDARD_PAGES = [
  { key: 'home',    slug: '/',         name: 'Home' },
  { key: 'catalog', slug: '/catalog',  name: 'Catalog' },
  { key: 'about',   slug: '/about',    name: 'About' },
  { key: 'offers',  slug: '/offers',   name: 'Offers' },
  { key: 'contact', slug: '/contact',  name: 'Contact' },
  { key: 'blog',    slug: '/blog',     name: 'Blog' },
  { key: 'events',  slug: '/events',   name: 'Events' },
];

// Previously walked the full subtree, which meant a nested
// `tapas-navbar` class buried inside a slider satisfied the check
// and the heal skipped seeding the real chrome. Now strict: looks
// at a single child node (first for navbar, last for footer).
function childHasClass(child, name) {
  return !!child
    && Array.isArray(child.classes)
    && child.classes.includes(name);
}

function seedPage({ key, slug, name, brandName }) {
  return {
    id: `p_${key}`,
    name,
    slug,
    tree: makeNode({
      id: `body_${key}`,
      tag: 'body',
      children: [],
    }),
    meta: {
      title: name, description: '', og_image: '',
      canonical_url: '', robots_noindex: false,
    },
  };
}

export function ensureSiteDefaults(content) {
  if (!content || typeof content !== 'object') return content;

  const brandName = content.brand?.name || 'TAPAS';
  const navProps    = { brand_name: brandName };
  const footerProps = { brand_name: brandName };

  let nextPages = content.pages || {};
  let nextClasses = content.classes || {};
  let mutated = false;

  // Step 1: seed the standard page set ONLY when the content has no
  // pages at all. Once the site has been initialised, missing
  // individual pages stay missing — staff might have deleted them on
  // purpose and we'd be "possessing" the editor by re-seeding them
  // on every reload.
  if (Object.keys(nextPages).length === 0) {
    nextPages = {};
    for (const def of STANDARD_PAGES) {
      nextPages[def.key] = seedPage({ ...def, brandName });
    }
    mutated = true;
  }

  // Step 2: each page gets a navbar + footer if missing.
  for (const [key, page] of Object.entries(nextPages)) {
    if (!page?.tree || !Array.isArray(page.tree.children)) continue;

    const kids = page.tree.children;
    const needsNav    = !childHasClass(kids[0], 'tapas-navbar');
    const needsFooter = !childHasClass(kids[kids.length - 1], 'tapas-footer');
    if (!needsNav && !needsFooter) continue;

    if (!mutated) {
      nextPages = { ...nextPages };
      nextClasses = { ...nextClasses };
      mutated = true;
    }
    const newChildren = page.tree.children.slice();

    if (needsNav) {
      const { root, classes } = compileTapasNavbar(navProps);
      newChildren.unshift(root);
      for (const [k, def] of Object.entries(classes)) {
        if (!nextClasses[k]) nextClasses[k] = def;
      }
    }
    if (needsFooter) {
      const { root, classes } = compileTapasFooter(footerProps);
      newChildren.push(root);
      for (const [k, def] of Object.entries(classes)) {
        if (!nextClasses[k]) nextClasses[k] = def;
      }
    }

    nextPages[key] = {
      ...page,
      tree: { ...page.tree, children: newChildren },
    };
  }

  if (!mutated) return content;
  return { ...content, pages: nextPages, classes: nextClasses };
}

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
