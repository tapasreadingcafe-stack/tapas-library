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
import { supabase } from '../utils/supabase';
import { BLOCK_REGISTRY } from './index';

// ---------------------------------------------------------------------
// Phase 7: A/B testing. Blocks with an `ab_variant` prop (values 'A' or
// 'B') are only rendered to visitors in the matching group. We assign
// visitors to a group once on first load and persist in localStorage so
// the same visitor consistently sees the same variant across sessions.
// ---------------------------------------------------------------------
const AB_STORAGE_KEY = 'tapas_ab_group';
function getVisitorGroup() {
  if (typeof window === 'undefined') return 'A';
  try {
    let g = window.localStorage.getItem(AB_STORAGE_KEY);
    if (g !== 'A' && g !== 'B') {
      g = Math.random() < 0.5 ? 'A' : 'B';
      window.localStorage.setItem(AB_STORAGE_KEY, g);
    }
    return g;
  } catch {
    return Math.random() < 0.5 ? 'A' : 'B';
  }
}
// Impression dedup: once per block per visitor per day.
function shouldLogImpression(blockId) {
  if (typeof window === 'undefined') return false;
  const today = new Date().toISOString().slice(0, 10);
  const key = `tapas_abi_${blockId}_${today}`;
  try {
    if (window.localStorage.getItem(key)) return false;
    window.localStorage.setItem(key, '1');
    return true;
  } catch {
    return false;
  }
}
// Log a fire-and-forget A/B event.
export function logAbEvent({ kind, blockId, variant, group, pageKey }) {
  try {
    supabase.from('ab_events').insert([{
      kind, block_id: blockId, variant, visitor_group: group, page_key: pageKey,
    }]).then(() => {}, () => {});
  } catch {}
}

// Module-level registry of every A/B-varianted block the current visitor
// has seen on this page. Form/newsletter blocks call `logAbConversions`
// on successful submit so each visible variant on the page gets a
// conversion credit. Cleared on route change.
const ACTIVE_VARIANTS = new Map(); // blockId → { variant, group, pageKey }
export function registerAbImpression(blockId, meta) {
  ACTIVE_VARIANTS.set(blockId, meta);
}
export function clearAbImpressions() {
  ACTIVE_VARIANTS.clear();
}
export function logAbConversions() {
  for (const [blockId, meta] of ACTIVE_VARIANTS.entries()) {
    logAbEvent({ kind: 'conversion', blockId, ...meta });
  }
}

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

// Phase 7: per-block scheduling. A block is rendered only if the
// current time is inside [schedule_start, schedule_end]. Either end
// can be blank. Storefront checks every 30s so visitors viewing the
// page at a boundary see the transition without a full reload.
function useNowTicker(everyMs = 30000) {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return Date.now();
}

function isWithinSchedule(p, now) {
  const startRaw = p.schedule_start;
  const endRaw = p.schedule_end;
  if (!startRaw && !endRaw) return true;
  const start = startRaw ? Date.parse(startRaw) : null;
  const end = endRaw ? Date.parse(endRaw) : null;
  if (start && Number.isFinite(start) && now < start) return false;
  if (end && Number.isFinite(end) && now > end) return false;
  return true;
}

// Phase 6: Component reference — looks up a named component in
// content.components and renders its block tree. The definition is
// stored once on draftContent.components; every instance on the page
// is a tiny `{ type: 'component_ref', props: { name } }` stub, so
// editing the definition updates every instance at once.
export function ComponentRef({ props = {}, pageKey }) {
  const content = useSiteContent();
  const name = props?.name;
  const def = name ? content?.components?.[name] : null;
  const blocks = Array.isArray(def?.blocks) ? def.blocks : [];
  const editorMode = typeof window !== 'undefined' && /[?&]preview=draft\b/.test(window.location.search || '');
  if (!def) {
    // Dev / editor fallback so staff can recognize a broken reference.
    if (editorMode) {
      return (
        <div style={{
          margin: '12px', padding: '14px 18px',
          background: '#fef3c7', border: '1px solid #fde68a',
          color: '#92400e', borderRadius: '8px', fontSize: '13px',
        }}>
          Unknown component: <code>{String(name) || '(unnamed)'}</code>
        </div>
      );
    }
    return null;
  }
  return (
    <>
      {blocks.map((child, idx) => (
        <BlockView
          key={child.id || idx}
          block={child}
          pageKey={pageKey}
          blockIndex={idx}
          totalBlocks={blocks.length}
          editorMode={editorMode}
        />
      ))}
    </>
  );
}

// Tapas Group container — renders nested child blocks via BlockView.
// Defined here (not in TapasFigmaBlocks.js) so it has direct access to
// BlockView without a require() that breaks CRA's module resolution.
export function TapasGroup({ props = {}, pageKey }) {
  const {
    children = [],
    background_color = 'transparent',
    padding_y = 0,
    padding_x = 0,
    max_width = 0,
    align = 'stretch',
    direction = 'column',
    gap = 0,
  } = props;
  const kids = Array.isArray(children) ? children.filter(Boolean) : [];
  const editorMode = typeof window !== 'undefined' && /[?&]preview=draft\b/.test(window.location.search || '');
  const wrapperStyle = {
    background: background_color,
    padding: `${padding_y || 0}px ${padding_x || 0}px`,
  };
  const innerStyle = {
    display: 'flex',
    flexDirection: direction === 'row' ? 'row' : 'column',
    alignItems: align === 'stretch' ? 'stretch' : align === 'center' ? 'center' : align === 'end' ? 'flex-end' : 'flex-start',
    gap: `${gap || 0}px`,
    maxWidth: max_width > 0 ? `${max_width}px` : undefined,
    margin: max_width > 0 ? '0 auto' : undefined,
  };
  return (
    <section style={wrapperStyle}>
      <div style={innerStyle}>
        {kids.map((child, idx) => (
          <BlockView
            key={child.id || idx}
            block={child}
            pageKey={pageKey}
            blockIndex={idx}
            totalBlocks={kids.length}
            editorMode={editorMode}
          />
        ))}
      </div>
    </section>
  );
}

// Renders one block by dispatching to its registry entry. Exposed as a
// separate component so the on-canvas toolbar (Phase 3) can
// decorate individual blocks without touching PageRenderer.
export function BlockView({ block, pageKey, blockIndex, totalBlocks, editorMode }) {
  // Hooks — must be called unconditionally in the same order on every
  // render, even for invalid blocks. Read every value defensively.
  const now = useNowTicker(30000);
  const visitorGroup = React.useMemo(() => getVisitorGroup(), []);
  const p = block?.props || {};
  const variant = p.ab_variant === 'A' || p.ab_variant === 'B' ? p.ab_variant : null;
  const variantMatches = !variant || variant === visitorGroup;
  const blockId = block?.id;
  React.useEffect(() => {
    if (!blockId) return;
    if (editorMode || !variant || !variantMatches) return;
    registerAbImpression(blockId, { variant, group: visitorGroup, pageKey });
    if (shouldLogImpression(blockId)) {
      logAbEvent({ kind: 'impression', blockId, variant, group: visitorGroup, pageKey });
    }
  }, [editorMode, variant, variantMatches, visitorGroup, blockId, pageKey]);

  // After hooks — bail on invalid blocks or unknown types.
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
  const classes = [];
  if (p.hide_mobile)  classes.push('tapas-hide-mobile');
  if (p.hide_tablet)  classes.push('tapas-hide-tablet');
  if (p.hide_desktop) classes.push('tapas-hide-desktop');
  // Phase 4 closer: per-breakpoint padding & alignment overrides. Built
  // as a scoped <style> next to the block so unused blocks inject no
  // CSS at all.
  const responsiveCss = buildResponsiveCSS(block.id, pageKey, p);
  // Phase 7: per-block scheduling. In the live storefront, outside the
  // window we hide the block entirely. In the editor preview we dim it
  // with a yellow tag so staff can still edit blocks that aren't
  // currently live.
  const scheduled = isWithinSchedule(p, now);
  if (!scheduled && !editorMode) return null;
  // Phase 7: A/B testing. A block with `ab_variant` set to 'A' or 'B'
  // is only shown to the matching group in live mode.
  if (variant && !variantMatches && !editorMode) return null;
  return (
    <BlockErrorBoundary blockType={block.type}>
      {responsiveCss && <style>{responsiveCss}</style>}
      <div
        className={classes.join(' ') || undefined}
        style={editorMode && (variant || !scheduled)
          ? { position: 'relative' }
          : { display: 'contents' }
        }
      >
        {!scheduled && editorMode && (
          <div style={{
            position: 'sticky', top: '50%', zIndex: 5,
            margin: '12px auto', maxWidth: '380px',
            padding: '6px 12px',
            background: '#fef3c7', color: '#92400e',
            border: '1px solid #fde68a', borderRadius: '999px',
            fontSize: '12px', fontWeight: 700, textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}>
            ⏰ Scheduled block — not live right now
          </div>
        )}
        {editorMode && variant && (
          <div style={{
            position: 'absolute', top: '8px', right: '8px', zIndex: 5,
            padding: '4px 10px',
            background: variant === 'A' ? '#dbeafe' : '#fce7f3',
            color: variant === 'A' ? '#1e40af' : '#9d174d',
            border: `1px solid ${variant === 'A' ? '#bfdbfe' : '#fbcfe8'}`,
            borderRadius: '999px',
            fontSize: '11px', fontWeight: 700,
            letterSpacing: '0.5px',
          }}>
            Variant {variant}
          </div>
        )}
        <div style={!scheduled && editorMode ? { opacity: 0.45, pointerEvents: 'auto' } : {}}>
          <Renderer id={block.id} pageKey={pageKey} props={p} blockIndex={blockIndex} totalBlocks={totalBlocks} />
        </div>
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
// Upserts a <link rel="canonical"> tag, or removes it if href is empty.
function upsertCanonical(href) {
  let link = document.querySelector('link[rel="canonical"]');
  if (!href) {
    if (link) link.remove();
    return;
  }
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function usePageMeta(meta) {
  const title = meta?.title;
  const description = meta?.description;
  const ogImage = meta?.og_image;
  const canonicalUrl = meta?.canonical_url;
  const noindex = meta?.robots_noindex;
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
    // Canonical + robots
    upsertCanonical(canonicalUrl || (typeof window !== 'undefined' ? window.location.href : ''));
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
  }, [title, description, ogImage, canonicalUrl, noindex]);
}

// Rough editor-mode detector: the staff dashboard loads the store with
// `?preview=draft` in the iframe, so props scheduled outside their
// window stay visible (dimmed) in the editor.
function isEditorMode() {
  if (typeof window === 'undefined') return false;
  try {
    if (window.self !== window.top) return true;
    return /[?&]preview=draft\b/.test(window.location.search || '');
  } catch {
    return false;
  }
}

// Editor-only empty state. Real visitors never reach this branch
// because we route around it (see PageRenderer below). The hint asks
// the user to drag a block in from the Block Library on the left.
function EmptyPageState({ pageKey, allHidden }) {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '60px 24px', textAlign: 'center',
      color: '#5c3a1e', background: 'rgba(38,23,12,0.03)',
      backgroundImage: 'repeating-linear-gradient(45deg, rgba(38,23,12,0.04) 0 1px, transparent 1px 12px)',
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.6 }}>
        {allHidden ? '👁' : '✨'}
      </div>
      <div style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>
        {allHidden ? 'Every block on this page is hidden' : 'This page is empty'}
      </div>
      <div style={{ fontSize: '14px', maxWidth: '420px', lineHeight: 1.55, opacity: 0.75 }}>
        {allHidden
          ? 'Toggle the 👁 in the Layers panel to show a block again.'
          : 'Open the Block Library on the left and click a section to add it. You can drag to reorder, hover for variant chips, and click any text to edit it.'}
      </div>
    </div>
  );
}

export default function PageRenderer({ pageKey, fallback = null }) {
  const content = useSiteContent();
  const page = content?.pages?.[pageKey];
  const blocks = Array.isArray(page?.blocks) ? page.blocks : [];
  const editorMode = isEditorMode();
  // Reset the A/B impression registry on every page mount so conversions
  // credit only the variants visible on this page's render.
  React.useEffect(() => {
    clearAbImpressions();
  }, [pageKey]);

  // Apply SEO meta even when the page falls back to legacy JSX — the
  // meta fields should take effect regardless of whether blocks are
  // rendered.
  usePageMeta(page?.meta);

  // If the page has no blocks defined, fall through to whatever the
  // caller passed as `fallback` — typically the legacy JSX of the
  // original hardcoded page. This lets us ship the block system
  // incrementally without breaking any page that hasn't been migrated.
  // In editor mode, show an inviting empty state instead of falling
  // back so new pages don't look broken.
  if (blocks.length === 0) {
    return editorMode ? <EmptyPageState pageKey={pageKey} /> : fallback;
  }

  // Skip blocks the editor has hidden. Editors can re-show via the 👁
  // toggle in the Layers panel; we filter here so production visitors
  // never see them. Hidden blocks remain in `draftContent.pages[*].blocks`
  // so toggling visibility is just a `props.hidden` flip — no destructive
  // delete + recreate.
  const visibleBlocks = blocks.filter(b => !b?.props?.hidden);
  if (visibleBlocks.length === 0) {
    return editorMode ? <EmptyPageState pageKey={pageKey} allHidden /> : fallback;
  }

  return (
    <>
      <style>{RESPONSIVE_CSS}</style>
      {visibleBlocks.map((b, idx) => (
        <BlockView key={b.id} block={b} pageKey={pageKey} blockIndex={idx} totalBlocks={visibleBlocks.length} editorMode={editorMode} />
      ))}
    </>
  );
}
