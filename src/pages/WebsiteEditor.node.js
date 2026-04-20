// =====================================================================
// Node — canvas-side primitive tree renderer for the v2 editor.
//
// Mirrors tapas-store/src/blocks/Node.jsx but lives inside the staff
// app so the editor canvas can render v2 trees without depending on
// the storefront app. Both will converge after Phase 10 cutover.
//
// Phase 1 scope: emit the DOM, add data-tapas-node-id on every node
// so the Canvas click handler can route selections. Selection outline
// and label tab land in Phase 2.
// =====================================================================

import React from 'react';

const VOID_TAGS = new Set([
  'img', 'input', 'br', 'hr', 'meta', 'link', 'source', 'area', 'base',
  'col', 'embed', 'param', 'track', 'wbr',
]);

const ALLOWED_TAGS = new Set([
  'div', 'section', 'header', 'nav', 'aside', 'main', 'article', 'footer',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'span', 'a', 'ul', 'ol', 'li',
  'img', 'video', 'iframe', 'audio', 'picture', 'source',
  'button', 'form', 'input', 'textarea', 'select', 'option', 'label',
  'blockquote', 'code', 'pre', 'em', 'strong', 'small',
  'br', 'hr',
  'body', // compiler uses body as the page root; we rewrite to div
]);

const ATTR_ALIASES = { class: 'className', for: 'htmlFor' };

function attrsToProps(attrs) {
  const out = {};
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null) continue;
    out[ATTR_ALIASES[k] || k] = v;
  }
  return out;
}

export function Node({ node, selectedId }) {
  if (!node || typeof node !== 'object') return null;

  const rawTag = node.tag || 'div';
  const Tag = rawTag === 'body' ? 'div' : (ALLOWED_TAGS.has(rawTag) ? rawTag : 'div');
  const className = (node.classes || []).join(' ') || undefined;
  const attrs = attrsToProps(node.attributes);
  attrs['data-tapas-node-id'] = node.id;
  if (node.id === selectedId) attrs['data-tapas-selected'] = '';

  if (VOID_TAGS.has(Tag)) {
    return <Tag className={className} {...attrs} />;
  }

  const children = node.children || [];
  const hasText = typeof node.textContent === 'string' && node.textContent.length > 0;

  if (hasText && children.length === 0) {
    return <Tag className={className} {...attrs}>{node.textContent}</Tag>;
  }

  return (
    <Tag className={className} {...attrs}>
      {hasText ? node.textContent : null}
      {children.map((child) => (
        <Node key={child.id} node={child} selectedId={selectedId} />
      ))}
    </Tag>
  );
}
