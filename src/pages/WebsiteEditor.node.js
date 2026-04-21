// =====================================================================
// Node — canvas-side primitive tree renderer for the v2 editor.
//
// Mirrors tapas-store/src/blocks/Node.jsx but lives inside the staff
// app so the editor canvas can render v2 trees without depending on
// the storefront app. Both will converge after Phase 10 cutover.
//
// Phase 1 scope: emit the DOM, add data-tapas-node-id on every node
// so the Canvas click handler can route selections.
//
// Lane D (inline text editor): when editingNodeId matches and the
// node is a text leaf, render the element with contentEditable on so
// the user can type directly on the canvas. On blur / Enter the
// caller commits the new innerText through onCommitText.
// =====================================================================

import React, { useRef, useLayoutEffect } from 'react';

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
  'details', 'summary',
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

// Inline editor wrapper — only used for text-leaf nodes that are being
// edited. React stays hands-off: we seed textContent via a ref once on
// mount, then let the browser own the DOM until blur so the caret
// never gets clobbered by a re-render.
function EditableText({ Tag, className, attrs, initialText, onCommit, onCancel }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.textContent = initialText || '';
    el.focus();
    // Select all so the very first keystroke replaces the placeholder
    // content — matches Webflow's double-click-to-edit behavior.
    try {
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    } catch {}
  }, []);
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (onCancel) onCancel();
    }
    // Stop keydowns from bubbling to the document-level shortcut
    // handler — Cmd+D / Delete would otherwise hijack typing.
    e.stopPropagation();
  };
  const onBlur = (e) => {
    onCommit(e.currentTarget.innerText);
  };
  // Don't let clicks on the editable element re-fire canvas selection.
  const stop = (e) => e.stopPropagation();
  return (
    <Tag
      ref={ref}
      className={className}
      {...attrs}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      data-tapas-editing=""
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      onMouseDown={stop}
      onClick={stop}
      onDoubleClick={stop}
      style={{ ...(attrs.style || {}), cursor: 'text', outline: 'none' }}
    />
  );
}

export function Node({ node, selectedId, editingNodeId, onCommitText, onCancelEdit }) {
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
  const isTextLeaf = children.length === 0;

  // Inline-edit branch — only text-leaf nodes. Nested nodes with
  // children keep their regular render so the user edits descendants
  // individually instead of losing structure.
  if (editingNodeId && node.id === editingNodeId && isTextLeaf) {
    return (
      <EditableText
        Tag={Tag}
        className={className}
        attrs={attrs}
        initialText={hasText ? node.textContent : ''}
        onCommit={(text) => onCommitText?.(node.id, text)}
        onCancel={onCancelEdit}
      />
    );
  }

  if (hasText && isTextLeaf) {
    return <Tag className={className} {...attrs}>{node.textContent}</Tag>;
  }

  return (
    <Tag className={className} {...attrs}>
      {hasText ? node.textContent : null}
      {children.map((child) => (
        <Node
          key={child.id}
          node={child}
          selectedId={selectedId}
          editingNodeId={editingNodeId}
          onCommitText={onCommitText}
          onCancelEdit={onCancelEdit}
        />
      ))}
    </Tag>
  );
}
