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

import React, { useRef, useLayoutEffect, useState, useEffect } from 'react';
import { renderRuns, isRunArray, runsFromElement } from './WebsiteEditor.richtext';
import EditorSliderPreview from './WebsiteEditor.slider.preview';

const VOID_TAGS = new Set([
  'img', 'input', 'br', 'hr', 'meta', 'link', 'source', 'area', 'base',
  'col', 'embed', 'param', 'track', 'wbr',
]);

// Resolve raw asset filenames (e.g. "HERO-LIBRARY.png") to a URL both
// the staff editor and the storefront can load. Anything already
// absolute or scheme-qualified passes through untouched. Bare
// filenames get a leading slash so they resolve from the web root
// regardless of the current route (/store/content-v2 etc.).
function resolveAssetUrl(src) {
  if (!src || typeof src !== 'string') return src;
  if (/^(https?:|data:|blob:|file:)/i.test(src)) return src;
  if (src.startsWith('/')) return src;
  return `/${src}`;
}

// <img> with a visible fallback so a 404 is diagnosable instead of
// looking like "nothing rendered". On error, swap to an inline SVG
// showing the intended filename — matches v1's ImageOrPlaceholder
// behavior but stays in-tree so the editor still highlights the node.
function SmartImage({ className, attrs }) {
  const rawSrc = attrs.src;
  const resolvedSrc = resolveAssetUrl(rawSrc);
  const [failed, setFailed] = useState(false);
  // Reset on src change so replacing an image clears a stale failure.
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
          // Bright orange stripes — deliberately loud so "missing image"
          // can never be mistaken for a dark-green photo or a blank
          // wrapper. Staff can't miss it.
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
      className={className}
      {...attrs}
      src={resolvedSrc}
      onError={() => setFailed(true)}
    />
  );
}

const ALLOWED_TAGS = new Set([
  'div', 'section', 'header', 'nav', 'aside', 'main', 'article', 'footer',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'span', 'a', 'ul', 'ol', 'li',
  'img', 'video', 'iframe', 'audio', 'picture', 'source',
  'button', 'form', 'input', 'textarea', 'select', 'option', 'label',
  'blockquote', 'code', 'pre', 'em', 'strong', 'small',
  'details', 'summary',
  'u', 's', 'code', 'sup', 'sub', // rich-text mark tags (Phase D)
  'br', 'hr',
  // <style> is the escape hatch for raw CSS (keyframes, ::before,
  // gradients) that the class compiler can't express. The editor
  // renders it too so the canvas matches the storefront.
  'style',
  'body', // compiler uses body as the page root; we rewrite to div
]);

// Phase F composite tags. Rewritten to layout elements in the editor
// so every native DOM feature (selection outline, drag-drop target,
// drag-drop indicator) keeps working against plain div-like nodes.
// Storefront has its own runtime renderer that activates carousel /
// lightbox behaviour for the same tags.
const COMPOSITE_TAG_REWRITE = {
  slider: 'section',
  slide:  'div',
  lightbox: 'span',
  collection_list: 'section',
};

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
// edited. React stays hands-off: we seed the initial DOM once on
// mount, then let the browser own the DOM until blur so the caret
// never gets clobbered by a re-render.
//
// Phase D: commits TextRuns (parsed from the DOM) via onCommitRuns.
// Falls back to onCommitText for backward compatibility.
function EditableText({
  Tag, className, attrs,
  initialRuns, initialText,
  onCommit, onCancel,
  editableRef,
}) {
  const ref = useRef(null);
  // Expose the contentEditable DOM element to the parent so the
  // FloatingTextToolbar can anchor to it without prop drilling.
  useEffect(() => {
    if (editableRef) editableRef.current = ref.current;
    return () => { if (editableRef) editableRef.current = null; };
  }, [editableRef]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Seed DOM from TextRun[] if we have one; otherwise the plain
    // string still renders for un-migrated content.
    if (Array.isArray(initialRuns) && initialRuns.length) {
      el.innerHTML = '';
      for (const run of initialRuns) {
        el.appendChild(elementFromRun(run));
      }
    } else {
      el.textContent = initialText || '';
    }
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
    // handler so Cmd+D / Delete / palette don't hijack typing. The
    // editor re-binds Cmd+B / Cmd+I / Cmd+U / Cmd+K at its own layer
    // so those still work while editing.
    e.stopPropagation();
  };
  const onBlur = (e) => {
    const runs = runsFromElement(e.currentTarget);
    onCommit(runs, e.currentTarget.innerText);
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

// Build a DOM node from a TextRun, wrapping in mark tags + link in the
// same order renderRuns uses so seed and re-parse are round-trip safe.
const RUN_MARK_TAG = {
  bold: 'strong', italic: 'em', underline: 'u', strike: 's',
  code: 'code', sup: 'sup', sub: 'sub',
};
function elementFromRun(run) {
  // Innermost: raw text with soft-break handling.
  const frag = document.createDocumentFragment();
  const pieces = (run.text || '').split('\n');
  pieces.forEach((piece, idx) => {
    if (idx > 0) frag.appendChild(document.createElement('br'));
    if (piece) frag.appendChild(document.createTextNode(piece));
  });
  // Wrap inside out (matches renderRuns order).
  let current = frag;
  const marks = Array.from(new Set(run.marks || []));
  const order = ['bold', 'italic', 'underline', 'strike', 'code', 'sup', 'sub'];
  for (const m of order) {
    if (!marks.includes(m)) continue;
    const tag = RUN_MARK_TAG[m];
    const el = document.createElement(tag);
    el.appendChild(current);
    current = el;
  }
  if (run.href) {
    const a = document.createElement('a');
    a.href = run.href;
    a.rel = 'noreferrer';
    a.appendChild(current);
    current = a;
  }
  // Ensure we return a single Node so the caller can appendChild.
  if (current.nodeType === 11 /* DocumentFragment */) return current;
  const wrapper = document.createDocumentFragment();
  wrapper.appendChild(current);
  return wrapper;
}

// Maximum component-instance nesting depth. Prevents a cycle like
// "component A references component B references component A" from
// recursing until the stack blows up. 16 is generous — a real design
// rarely nests components past 3 or 4 levels.
const MAX_COMPONENT_DEPTH = 16;

export function Node({
  node, selectedId, editingNodeId,
  onCommitText, onCommitRuns, onCancelEdit,
  editableRef,
  components,
  previewSliderId,
  componentDepth = 0,
}) {
  if (!node || typeof node !== 'object') return null;

  // Component instance — render the referenced component's tree in
  // the instance's slot, but keep the instance's own id and classes
  // on the outer wrapper so selection, styling, and drag-drop still
  // target the instance (not the shared def). A missing ref falls
  // through to a visible warning so staff can spot orphans in QA.
  if (node.componentRef) {
    const def = components?.[node.componentRef];
    const className = (node.classes || []).join(' ') || undefined;
    const outer = attrsToProps(node.attributes);
    outer['data-tapas-node-id'] = node.id;
    outer['data-tapas-component'] = node.componentRef;
    if (node.id === selectedId) outer['data-tapas-selected'] = '';
    if (componentDepth >= MAX_COMPONENT_DEPTH) {
      return (
        <div className={className} {...outer} style={{
          padding: '12px 16px', background: '#FEE2E2',
          border: '1px dashed #DC2626', color: '#7F1D1D',
          fontSize: '13px', margin: '8px 0',
          fontFamily: 'ui-monospace, monospace',
        }}>
          Component recursion limit ({MAX_COMPONENT_DEPTH}) reached — check for a cycle.
        </div>
      );
    }
    if (!def?.root) {
      return (
        <div className={className} {...outer} style={{
          padding: '12px 16px', background: '#FEF3C7',
          border: '1px dashed #F59E0B', color: '#92400E',
          fontSize: '13px', margin: '8px 0',
          fontFamily: 'ui-monospace, monospace',
        }}>
          Unknown component: {String(node.componentRef)}
        </div>
      );
    }
    return (
      <div className={className} {...outer}>
        <Node
          node={def.root}
          components={components}
          componentDepth={componentDepth + 1}
          // Descendants inside a rendered instance are read-only —
          // never pass selection/edit props through. Staff edit the
          // definition explicitly via the Components panel.
        />
      </div>
    );
  }

  const rawTag = node.tag || 'div';
  // Composite tags (slider / slide / lightbox) get rewritten to real
  // HTML elements for the editor canvas but keep their identity in a
  // data-tapas-composite attr so staff see what they're editing.
  const composite = COMPOSITE_TAG_REWRITE[rawTag];
  const Tag = composite
    ? composite
    : (rawTag === 'body' ? 'div' : (ALLOWED_TAGS.has(rawTag) ? rawTag : 'div'));
  const className = (node.classes || []).join(' ') || undefined;
  const attrs = attrsToProps(node.attributes);
  attrs['data-tapas-node-id'] = node.id;
  if (composite) attrs['data-tapas-composite'] = rawTag;
  if (node.id === selectedId) attrs['data-tapas-selected'] = '';

  // Slider — preview mode runs the editor-side carousel so staff can
  // sanity-check the autoplay / swipe behaviour without leaving the
  // canvas. Default view stays stacked so every slide is editable.
  if (rawTag === 'slider' && previewSliderId === node.id) {
    const childNodes = (node.children || []).map((child) => (
      <Node
        key={child.id}
        node={child}
        selectedId={selectedId}
        editingNodeId={editingNodeId}
        onCommitText={onCommitText}
        onCommitRuns={onCommitRuns}
        onCancelEdit={onCancelEdit}
        editableRef={editableRef}
        components={components}
        previewSliderId={previewSliderId}
        componentDepth={componentDepth}
      />
    ));
    return (
      <EditorSliderPreview
        node={node}
        slides={childNodes}
        className={className}
        dataAttrs={attrs}
      />
    );
  }

  // Collection list editor affordance: show the template as-is with
  // a corner badge so staff know they're editing one row that repeats
  // at runtime. Binding tokens like {{title}} render verbatim so the
  // author can see where each field will land.
  if (rawTag === 'collection_list') {
    const clChildren = node.children || [];
    const slug = node.attributes?.collection_slug || '(no slug)';
    return (
      <Tag className={className} {...attrs} style={{ ...(attrs.style || {}), position: 'relative' }}>
        {clChildren.map((child) => (
          <Node
            key={child.id}
            node={child}
            selectedId={selectedId}
            editingNodeId={editingNodeId}
            onCommitText={onCommitText}
            onCommitRuns={onCommitRuns}
            onCancelEdit={onCancelEdit}
            editableRef={editableRef}
            components={components}
            previewSliderId={previewSliderId}
        componentDepth={componentDepth}
          />
        ))}
        <span
          aria-hidden
          style={{
            position: 'absolute', top: '8px', right: '8px',
            padding: '2px 6px',
            background: 'rgba(20, 110, 245, 0.9)', color: '#fff',
            fontSize: '10px', fontWeight: 700, borderRadius: '3px',
            fontFamily: 'ui-monospace, monospace',
            pointerEvents: 'none', letterSpacing: '0.04em',
            boxShadow: '0 1px 2px rgba(0,0,0,0.35)',
          }}
        >▦ CMS · {slug}</span>
      </Tag>
    );
  }

  // Lightbox editor affordance: render normally but overlay a ⛶ badge
  // so staff can tell the image is click-through on the storefront.
  if (rawTag === 'lightbox') {
    const lbChildren = node.children || [];
    return (
      <Tag className={className} {...attrs} style={{ ...(attrs.style || {}), position: 'relative', display: 'inline-block' }}>
        {lbChildren.map((child) => (
          <Node
            key={child.id}
            node={child}
            selectedId={selectedId}
            editingNodeId={editingNodeId}
            onCommitText={onCommitText}
            onCommitRuns={onCommitRuns}
            onCancelEdit={onCancelEdit}
            editableRef={editableRef}
            components={components}
            previewSliderId={previewSliderId}
        componentDepth={componentDepth}
          />
        ))}
        <span
          aria-hidden
          style={{
            position: 'absolute', top: '6px', right: '6px',
            padding: '2px 5px',
            background: 'rgba(20, 110, 245, 0.9)', color: '#fff',
            fontSize: '10px', fontWeight: 700, borderRadius: '3px',
            fontFamily: 'ui-monospace, monospace',
            pointerEvents: 'none', letterSpacing: '0.04em',
            boxShadow: '0 1px 2px rgba(0,0,0,0.35)',
          }}
        >⛶ LIGHTBOX</span>
      </Tag>
    );
  }

  if (VOID_TAGS.has(Tag)) {
    if (Tag === 'img') {
      return <SmartImage className={className} attrs={attrs} />;
    }
    return <Tag className={className} {...attrs} />;
  }

  const children = node.children || [];
  const hasText = typeof node.textContent === 'string' && node.textContent.length > 0;
  const runChildren = isRunArray(children) ? children : null;
  // A "text leaf" is any node that holds either plain textContent or
  // TextRuns only — no child Nodes. Rich-text editing only applies here.
  const isTextLeaf = runChildren !== null || children.length === 0;

  // Inline-edit branch — only text-leaf nodes. Nested nodes with
  // children keep their regular render so the user edits descendants
  // individually instead of losing structure.
  if (editingNodeId && node.id === editingNodeId && isTextLeaf) {
    return (
      <EditableText
        Tag={Tag}
        className={className}
        attrs={attrs}
        initialRuns={runChildren}
        initialText={hasText ? node.textContent : ''}
        editableRef={editableRef}
        onCommit={(runs, plainText) => {
          if (onCommitRuns) onCommitRuns(node.id, runs);
          else if (onCommitText) onCommitText(node.id, plainText);
        }}
        onCancel={onCancelEdit}
      />
    );
  }

  if (runChildren) {
    return <Tag className={className} {...attrs}>{renderRuns(runChildren)}</Tag>;
  }

  if (hasText && children.length === 0) {
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
          onCommitRuns={onCommitRuns}
          onCancelEdit={onCancelEdit}
          editableRef={editableRef}
          components={components}
          previewSliderId={previewSliderId}
        componentDepth={componentDepth}
        />
      ))}
    </Tag>
  );
}
