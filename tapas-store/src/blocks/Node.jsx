// =====================================================================
// Node renderer — renders a v2 tree Node to DOM.
//
// Takes a { tag, classes[], attributes, children[], textContent }
// object and emits the matching JSX. No React state, no hooks — pure
// traversal so staff can stack arbitrary Node trees with zero runtime
// cost per node.
//
// Phase 0 scope: NOT hooked into any live page. PageRenderer continues
// to dispatch to BLOCK_REGISTRY as before. This file exists so the
// Phase 1 editor shell can call <Node tree={page.tree} /> against the
// v2 store_content without any other piece of production being ready.
// =====================================================================

import React, { useState, useEffect, useRef } from 'react';
import Slider from './Slider';
import Lightbox from './Lightbox';
import CollectionList from './CollectionList';
import { mountTimelineRuntime } from '../runtime/timeline';

// Tags that are self-closing in HTML. React handles most of this for us
// but keeping the list explicit avoids passing `children` to them.
const VOID_TAGS = new Set([
  'img', 'input', 'br', 'hr', 'meta', 'link', 'source', 'area', 'base',
  'col', 'embed', 'param', 'track', 'wbr',
]);

// Resolve bare asset filenames to root-relative URLs so a single v2
// tree works across the staff app (/store/content-v2) and the
// storefront without per-app rewriting. Scheme-qualified or already-
// absolute paths pass through untouched.
function resolveAssetUrl(src) {
  if (!src || typeof src !== 'string') return src;
  if (/^(https?:|data:|blob:|file:)/i.test(src)) return src;
  if (src.startsWith('/')) return src;
  return `/${src}`;
}

// <img> wrapper with a visible broken-image fallback so future
// migrations stop silently hiding missing assets. Keeps the element
// in-tree so editor selection / outlines continue to work.
function SmartImage({ className, attrs }) {
  const rawSrc = attrs.src;
  const resolvedSrc = resolveAssetUrl(rawSrc);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [resolvedSrc]);
  if (failed || !resolvedSrc) {
    const label = typeof rawSrc === 'string' && rawSrc
      ? rawSrc.split('/').pop()
      : '(no src set)';
    return (
      <span
        className={className}
        {...attrs}
        style={{
          ...(attrs.style || {}),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'repeating-linear-gradient(45deg, #FEF3C7 0 14px, #FBBF24 14px 28px)',
          color: '#78350F',
          fontFamily: 'ui-monospace, monospace',
          fontSize: '12px', fontWeight: 700, textAlign: 'center', padding: '10px',
          minHeight: '120px', wordBreak: 'break-all',
          border: '2px dashed #D97706',
        }}
        title={`Missing image: ${rawSrc || '(empty)'}`}
      >
        ⚠ No image · {label}
      </span>
    );
  }
  return (
    <img
      alt=""
      className={className}
      {...attrs}
      src={resolvedSrc}
      loading={attrs.loading || 'lazy'}
      onError={() => setFailed(true)}
    />
  );
}

// ---- Rich text (Phase D) -------------------------------------------
// Runs arrive as { text, marks[], href? }. A leaf whose children are
// all runs renders them wrapped in the applied mark tags. Everything
// else keeps the pre-Phase-D code path.
const RUN_MARK_TAG = {
  bold: 'strong', italic: 'em', underline: 'u', strike: 's',
  code: 'code', sup: 'sup', sub: 'sub',
};
const RUN_MARK_ORDER = ['bold', 'italic', 'underline', 'strike', 'code', 'sup', 'sub'];

function isRunArray(children) {
  return Array.isArray(children)
    && children.length > 0
    && children.every((c) => c && typeof c.text === 'string' && !c.tag);
}

function renderRuns(runs) {
  return runs.map((run, i) => renderRun(run, i));
}

function renderRun(run, key) {
  if (!run || typeof run.text !== 'string') return null;
  const pieces = run.text.split('\n');
  let content = pieces.reduce((acc, piece, idx) => {
    if (idx > 0) acc.push(React.createElement('br', { key: `br-${idx}` }));
    if (piece) acc.push(piece);
    return acc;
  }, []);
  const marks = new Set(run.marks || []);
  for (const mark of RUN_MARK_ORDER) {
    if (!marks.has(mark)) continue;
    const tag = RUN_MARK_TAG[mark];
    if (!tag) continue;
    content = React.createElement(tag, { key: `m-${mark}` }, content);
  }
  if (run.href) {
    content = React.createElement(
      'a',
      { key: `a-${run.href}`, href: run.href, rel: 'noreferrer' },
      content
    );
  }
  return React.createElement(React.Fragment, { key }, content);
}

// Tags we'll accept as-is. Anything else falls back to `<div>` with a
// data-warning attribute so staff see it in devtools.
const ALLOWED_TAGS = new Set([
  'div', 'section', 'header', 'nav', 'aside', 'main', 'article', 'footer',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'span', 'a', 'ul', 'ol', 'li',
  'img', 'video', 'iframe', 'audio', 'picture', 'source',
  'button', 'form', 'input', 'textarea', 'select', 'option', 'label',
  'blockquote', 'code', 'pre', 'em', 'strong', 'small',
  'details', 'summary',
  'u', 's', 'code', 'sup', 'sub',   // rich-text mark tags (Phase D)
  'br', 'hr',
  // <style> inside the tree is the escape hatch for raw CSS that the
  // class compiler can't express: @keyframes, ::before / ::after, @font-face
  // imports, complex gradients. Staff can keep the style node in the
  // tree and the class compiler's output layers on top — cascade wins
  // follow normal CSS precedence (order in the tree + specificity).
  'style',
  // body is used by the compiler as the tree root; React won't render a
  // nested <body> so we rewrite it to <div class="tapas-page-root">.
  'body',
]);

// Phase F slides — rendered inside Slider via renderChild. Treated
// as plain divs by the static renderer so slide styling (via
// classes) still works.
const COMPOSITE_TAG_REWRITE = { slide: 'div' };

// Page-root wrapper mounted when the tree's body renders. Owns the
// one-time Phase G timeline runtime mount + cleanup for its subtree.
// Every other node is still rendered via the pure Node() function,
// so the added runtime cost only applies to the outermost element.
function PageRoot({ className, attrs, children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return undefined;
    return mountTimelineRuntime(ref.current);
  }, []);
  return (
    <div ref={ref} className={className} {...attrs}>{children}</div>
  );
}

// Phase F composites — the storefront hands these off to interactive
// runtime wrappers. The wrappers render the slot children back through
// Node so the rest of the tree (styles, classes, nested composites)
// keeps working. Done before the componentRef branch so a component
// whose root is a slider still activates the carousel.
function renderComposite(node, components) {
  const renderChild = (child, opts) => (
    <Node node={child} components={opts?.components ?? components} />
  );
  if (node.tag === 'slider') {
    return <Slider node={node} renderChild={renderChild} components={components} />;
  }
  if (node.tag === 'lightbox') {
    return <Lightbox node={node} renderChild={renderChild} components={components} />;
  }
  if (node.tag === 'collection_list') {
    return <CollectionList node={node} renderChild={renderChild} components={components} />;
  }
  return null;
}

// Max component-instance nesting depth. Mirrors
// src/pages/WebsiteEditor.node.js — bumps here should be copied
// there so editor + storefront agree on cycle detection.
const MAX_COMPONENT_DEPTH = 16;

export function Node({ node, components, componentDepth = 0 }) {
  if (!node || typeof node !== 'object') return null;

  // Component instance — render the referenced component's tree instead.
  if (node.componentRef) {
    const def = components?.[node.componentRef];
    if (componentDepth >= MAX_COMPONENT_DEPTH) {
      return (
        <div style={{
          padding: '12px 16px', background: '#FEE2E2',
          border: '1px dashed #DC2626', color: '#7F1D1D',
          fontSize: '13px', margin: '8px 0',
          fontFamily: 'ui-monospace, monospace',
        }}>
          Component recursion limit reached.
        </div>
      );
    }
    if (!def?.root) {
      return (
        <div style={{
          padding: '12px 16px', background: '#FEF3C7',
          border: '1px dashed #F59E0B', color: '#92400E',
          fontSize: '13px', margin: '8px 0',
          fontFamily: 'ui-monospace, monospace',
        }}>
          Unknown component: {String(node.componentRef)}
        </div>
      );
    }
    return <Node node={def.root} components={components} componentDepth={componentDepth + 1} />;
  }

  // Phase F + I2: slider / lightbox / collection_list route through
  // their own runtimes; the rest of this function never sees them.
  if (node.tag === 'slider' || node.tag === 'lightbox' || node.tag === 'collection_list') {
    return renderComposite(node, components);
  }

  const rawTag = node.tag || 'div';
  // A nested <body> inside React would be ignored; rewrite it.
  const composite = COMPOSITE_TAG_REWRITE[rawTag];
  const Tag = composite
    ? composite
    : (rawTag === 'body' ? 'div' : (ALLOWED_TAGS.has(rawTag) ? rawTag : 'div'));
  const className = (node.classes || []).join(' ') || undefined;

  // Attributes — React uses camelCase for some, kebab for data-*/aria-*.
  // Translate the common ones; pass through anything we don't recognize
  // via dangerouslySet-style spreading. The compiler only emits well-
  // known attrs so the set is small.
  const attrs = attrsToReactProps(node.attributes || {});

  // Tag-rewrite warning marker when we silently downgraded the tag —
  // skipped for intentional composite rewrites (slide → div).
  if (rawTag !== Tag && !composite) attrs['data-tapas-unknown-tag'] = rawTag;
  if (composite) attrs['data-tapas-composite'] = rawTag;

  // Void tags can't carry children.
  if (VOID_TAGS.has(Tag)) {
    if (Tag === 'img') {
      return <SmartImage className={className} attrs={attrs} />;
    }
    return <Tag className={className} {...attrs} />;
  }

  const children = node.children || [];
  const hasText = typeof node.textContent === 'string' && node.textContent.length > 0;

  // Rich-text leaf — children are TextRuns.
  if (isRunArray(children)) {
    return <Tag className={className} {...attrs}>{renderRuns(children)}</Tag>;
  }

  // Legacy plain-text leaf.
  if (hasText && children.length === 0) {
    return <Tag className={className} {...attrs}>{node.textContent}</Tag>;
  }

  // Mixed or branch node.
  const renderedChildren = (
    <>
      {hasText ? node.textContent : null}
      {children.map((child, idx) => (
        <Node key={child.id || idx} node={child} components={components} componentDepth={componentDepth} />
      ))}
    </>
  );

  // Top-level <body> render — use PageRoot so Phase G timelines and
  // any future one-time runtime work mount correctly. Everything
  // else stays in the pure-function path.
  if (rawTag === 'body') {
    return (
      <PageRoot className={className} attrs={attrs}>
        {renderedChildren}
      </PageRoot>
    );
  }

  return (
    <Tag className={className} {...attrs}>{renderedChildren}</Tag>
  );
}

// Keep this tiny — the migration compiler only produces a known set of
// attribute names. Extend as new block types land.
const ATTR_ALIASES = {
  class: 'className',
  for:   'htmlFor',
};

function attrsToReactProps(attrs) {
  const out = {};
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null) continue;
    const outKey = ATTR_ALIASES[k] || k;
    out[outKey] = v;
  }
  return out;
}

export default Node;
