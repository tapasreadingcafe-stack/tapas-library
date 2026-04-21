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

import React from 'react';

// Tags that are self-closing in HTML. React handles most of this for us
// but keeping the list explicit avoids passing `children` to them.
const VOID_TAGS = new Set([
  'img', 'input', 'br', 'hr', 'meta', 'link', 'source', 'area', 'base',
  'col', 'embed', 'param', 'track', 'wbr',
]);

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
    return <Tag className={className} {...attrs} />;
  }

  const children = node.children || [];
  const hasText = typeof node.textContent === 'string' && node.textContent.length > 0;

  // Leaf text node (no children).
  if (hasText && children.length === 0) {
    return <Tag className={className} {...attrs}>{node.textContent}</Tag>;
  }

  // Mixed or branch node.
  return (
    <Tag className={className} {...attrs}>
      {hasText ? node.textContent : null}
      {children.map((child) => (
        <Node key={child.id} node={child} components={components} />
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
