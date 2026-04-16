// =====================================================================
// PageRenderer
//
// Walks `content.pages[pageKey].blocks` and renders each block by
// looking up its type in BLOCK_REGISTRY. This is the single integration
// point between the storefront and the Webflow-style page builder —
// every page that opts into blocks calls <PageRenderer pageKey="home"/>
// and everything else flows from there.
//
// Error isolation: each block is wrapped in a tiny error boundary so a
// buggy block (e.g. a dynamic block hitting a Supabase error) doesn't
// take down the whole page. The boundary renders a compact error card
// in dev and a silent empty space in production.
// =====================================================================

import React from 'react';
import { useSiteContent } from '../context/SiteContent';
import { BLOCK_REGISTRY } from './index';

class BlockErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[PageRenderer] block crashed:', this.props.blockType, error, info);
  }
  render() {
    if (this.state.error) {
      if (process.env.NODE_ENV !== 'production') {
        return (
          <div style={{
            margin: '16px', padding: '16px 20px',
            background: '#fef2f2', border: '1px solid #fecaca',
            color: '#991b1b', borderRadius: '8px', fontSize: '13px',
          }}>
            <strong>Block crashed:</strong> {this.props.blockType}<br />
            {String(this.state.error?.message || this.state.error)}
          </div>
        );
      }
      return null;
    }
    return this.props.children;
  }
}

// Build a per-block <style> string with scoped media queries for the
// "resp_*" overrides. We target the section rendered by BlockFrame
// via `[data-editable="pages.{pageKey}.blocks.{id}"]` — that attribute
// is already on every block for the canvas click-to-edit selector. The
// rules use !important because BlockFrame uses inline `style` which
// would otherwise win.
const BP = {
  mobile:  '@media (max-width: 639px)',
  tablet:  '@media (min-width: 640px) and (max-width: 1023px)',
  desktop: '@media (min-width: 1024px)',
};

const ALLOWED_TEXT_ALIGN = new Set(['left', 'center', 'right']);

function buildResponsiveCSS(id, pageKey, p) {
  const selector = `[data-editable="pages.${pageKey || 'unknown'}.blocks.${id}"]`;
  const chunks = [];
  for (const bp of ['mobile', 'tablet', 'desktop']) {
    const rules = [];
    // Padding Y override (number in px). 0 is a legal value.
    const padY = p[`resp_padding_y_${bp}`];
    if (padY !== undefined && padY !== null && padY !== '') {
      const n = Number(padY);
      if (!Number.isNaN(n) && n >= 0 && n <= 400) {
        rules.push(`padding-top:${n}px !important;padding-bottom:${n}px !important;`);
      }
    }
    // Padding X override
    const padX = p[`resp_padding_x_${bp}`];
    if (padX !== undefined && padX !== null && padX !== '') {
      const n = Number(padX);
      if (!Number.isNaN(n) && n >= 0 && n <= 200) {
        rules.push(`padding-left:${n}px !important;padding-right:${n}px !important;`);
      }
    }
    // Text alignment override
    const align = p[`resp_text_align_${bp}`];
    if (align && ALLOWED_TEXT_ALIGN.has(align)) {
      rules.push(`text-align:${align} !important;`);
    }
    if (rules.length) chunks.push(`${BP[bp]}{${selector}{${rules.join('')}}}`);
  }
  return chunks.join('\n');
}

// Renders one block by dispatching to its registry entry. Exposed as a
// separate component so the on-canvas toolbar (Phase 3) can
// decorate individual blocks without touching PageRenderer.
export function BlockView({ block, pageKey, blockIndex, totalBlocks }) {
  if (!block || !block.type) return null;
  const entry = BLOCK_REGISTRY[block.type];
  if (!entry) {
    if (process.env.NODE_ENV !== 'production') {
      return (
        <div style={{
          margin: '16px', padding: '12px 16px',
          background: '#fef3c7', border: '1px solid #fde68a',
          color: '#92400e', borderRadius: '8px', fontSize: '13px',
        }}>
          Unknown block type: <code>{block.type}</code>
        </div>
      );
    }
    return null;
  }
  const Renderer = entry.Renderer;
  // Phase 4: responsive visibility — wrap each block in a div that
  // gets CSS classes based on props.hide_mobile/tablet/desktop. The
  // actual hiding is done by global media queries injected once in
  // PageRenderer. The wrapper is display:contents so it doesn't affect
  // layout when visible.
  const p = block.props || {};
  const classes = [];
  if (p.hide_mobile)  classes.push('tapas-hide-mobile');
  if (p.hide_tablet)  classes.push('tapas-hide-tablet');
  if (p.hide_desktop) classes.push('tapas-hide-desktop');
  // Phase 4 closer: per-breakpoint padding & alignment overrides. Built
  // as a scoped <style> next to the block so unused blocks inject no
  // CSS at all.
  const responsiveCss = buildResponsiveCSS(block.id, pageKey, p);
  return (
    <BlockErrorBoundary blockType={block.type}>
      {responsiveCss && <style>{responsiveCss}</style>}
      <div className={classes.join(' ') || undefined} style={{ display: 'contents' }}>
        <Renderer id={block.id} pageKey={pageKey} props={p} blockIndex={blockIndex} totalBlocks={totalBlocks} />
      </div>
    </BlockErrorBoundary>
  );
}

// Global CSS for responsive visibility classes — injected once per
// page by PageRenderer so it's always present when blocks render.
const RESPONSIVE_CSS = `
@media (max-width: 639px) {
  .tapas-hide-mobile > * { display: none !important; }
}
@media (min-width: 640px) and (max-width: 1023px) {
  .tapas-hide-tablet > * { display: none !important; }
}
@media (min-width: 1024px) {
  .tapas-hide-desktop > * { display: none !important; }
}
`;

// Upserts a single <meta> tag (name=/property=/whatever) in <head>.
function upsertMeta(attr, attrValue, content) {
  if (content === undefined || content === null) return;
  let tag = document.querySelector(`meta[${attr}="${attrValue}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, attrValue);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', String(content));
}

// Applies per-page SEO meta (title + description + og_image) to the
// document & the <head>. Each route's <PageRenderer> overrides the
// previous route's tags on mount, so we don't need to undo on unmount.
function usePageMeta(meta) {
  const title = meta?.title;
  const description = meta?.description;
  const ogImage = meta?.og_image;
  React.useEffect(() => {
    if (title) document.title = title;
    if (typeof description === 'string') {
      upsertMeta('name', 'description', description);
    }
    // Open Graph
    if (title) upsertMeta('property', 'og:title', title);
    if (typeof description === 'string') upsertMeta('property', 'og:description', description);
    if (ogImage) {
      upsertMeta('property', 'og:image', ogImage);
      upsertMeta('property', 'og:image:width', '1200');
      upsertMeta('property', 'og:image:height', '630');
    }
    upsertMeta('property', 'og:type', 'website');
    if (typeof window !== 'undefined') {
      upsertMeta('property', 'og:url', window.location.href);
    }
    // Twitter card
    upsertMeta('name', 'twitter:card', ogImage ? 'summary_large_image' : 'summary');
    if (title) upsertMeta('name', 'twitter:title', title);
    if (typeof description === 'string') upsertMeta('name', 'twitter:description', description);
    if (ogImage) upsertMeta('name', 'twitter:image', ogImage);
  }, [title, description, ogImage]);
}

export default function PageRenderer({ pageKey, fallback = null }) {
  const content = useSiteContent();
  const page = content?.pages?.[pageKey];
  const blocks = Array.isArray(page?.blocks) ? page.blocks : [];

  // Apply SEO meta even when the page falls back to legacy JSX — the
  // meta fields should take effect regardless of whether blocks are
  // rendered.
  usePageMeta(page?.meta);

  // If the page has no blocks defined, fall through to whatever the
  // caller passed as `fallback` — typically the legacy JSX of the
  // original hardcoded page. This lets us ship the block system
  // incrementally without breaking any page that hasn't been migrated.
  if (blocks.length === 0) return fallback;

  return (
    <>
      <style>{RESPONSIVE_CSS}</style>
      {blocks.map((b, idx) => (
        <BlockView key={b.id} block={b} pageKey={pageKey} blockIndex={idx} totalBlocks={blocks.length} />
      ))}
    </>
  );
}
