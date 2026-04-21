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

import React, { useState, useEffect } from 'react';

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
      : 'image';
    return (
      <span
        className={className}
        {...attrs}
        style={{
          ...(attrs.style || {}),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'repeating-linear-gradient(45deg, #F3F4F6 0 10px, #E5E7EB 10px 20px)',
          color: '#6B7280',
          fontFamily: 'ui-monospace, monospace',
          fontSize: '11px', textAlign: 'center', padding: '8px',
          minHeight: '80px', wordBreak: 'break-all',
        }}
        title={`Missing image: ${rawSrc || '(empty)'}`}
      >
        ⛌ {label}
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
  'br', 'hr',
  // body is used by the compiler as the tree root; React won't render a
  // nested <body> so we rewrite it to <div class="tapas-page-root">.
  'body',
]);

export function Node({ node, components }) {
  if (!node || typeof node !== 'object') return null;

  // Component instance — render the referenced component's tree instead.
  if (node.componentRef) {
    const def = components?.[node.componentRef];
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
    return <Node node={def.root} components={components} />;
  }

  const rawTag = node.tag || 'div';
  // A nested <body> inside React would be ignored; rewrite it.
  const Tag = rawTag === 'body' ? 'div' : (ALLOWED_TAGS.has(rawTag) ? rawTag : 'div');
  const className = (node.classes || []).join(' ') || undefined;

  // Attributes — React uses camelCase for some, kebab for data-*/aria-*.
  // Translate the common ones; pass through anything we don't recognize
  // via dangerouslySet-style spreading. The compiler only emits well-
  // known attrs so the set is small.
  const attrs = attrsToReactProps(node.attributes || {});

  // Tag-rewrite warning marker when we silently downgraded the tag.
  if (rawTag !== Tag) attrs['data-tapas-unknown-tag'] = rawTag;

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
  return (
    <Tag className={className} {...attrs}>
      {hasText ? node.textContent : null}
      {children.map((child, idx) => (
        <Node key={child.id || idx} node={child} components={components} />
      ))}
    </Tag>
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
