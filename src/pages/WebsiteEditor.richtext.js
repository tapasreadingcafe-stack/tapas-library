// =====================================================================
// WebsiteEditor.richtext — Phase D.
//
// Shared between the editor canvas and the storefront renderer so
// rendering + parsing stays in one place. Three surfaces:
//
//   1. runsFromElement(el)   — walks a contentEditable DOM, returning
//                              the canonical TextRun[] representation.
//   2. renderRuns(arr, React) — turns TextRun[] into JSX wrapped in
//                              the correct mark tags. Used by both
//                              Node renderers.
//   3. FloatingTextToolbar   — editor-only B/I/U/S/link/clear popover
//                              that follows the user's selection.
//
// We use document.execCommand for mark application. It's deprecated
// but still the cheapest way to toggle styles inside a contentEditable
// without shipping a full editor library. The commit parser normalises
// whatever the browser produced back into our canonical shape.
// =====================================================================

import React, { useCallback, useEffect, useRef, useState } from 'react';

// Mark ↔ HTML tag mapping. The rendered tags use semantic HTML so the
// storefront gets correct a11y out of the box.
const MARK_TAGS = {
  bold:      'strong',
  italic:    'em',
  underline: 'u',
  strike:    's',
  code:      'code',
  sup:       'sup',
  sub:       'sub',
};

// Reverse lookup — used by the parser to classify DOM ancestors.
const TAG_TO_MARK = {
  b: 'bold', strong: 'bold',
  i: 'italic', em: 'italic',
  u: 'underline',
  s: 'strike', strike: 'strike', del: 'strike',
  code: 'code',
  sup: 'sup',
  sub: 'sub',
};

// A consistent mark order so identical mark sets serialise identically
// (equality short-circuits the mutation pipeline).
const MARK_ORDER = ['bold', 'italic', 'underline', 'strike', 'code', 'sup', 'sub'];
function orderMarks(marks) {
  const set = new Set(marks || []);
  return MARK_ORDER.filter((m) => set.has(m));
}

// ---------------------------------------------------------------------
// Parse — contentEditable DOM -> TextRun[]
// ---------------------------------------------------------------------
// Walks the DOM subtree under `root`, collecting text nodes and
// accumulating the active marks / href from their ancestor chain.
// Treats <br> as a newline character so Shift+Enter round-trips.
// Normalisation (merging neighbour runs with identical marks, dropping
// zero-length runs) is handled by mutations.setNodeRuns so we stay
// permissive here and let it canonicalise on write.
export function runsFromElement(root) {
  if (!root) return [];
  const runs = [];
  const walk = (node, activeMarks, activeHref) => {
    if (node.nodeType === 3 /* Text */) {
      const text = node.nodeValue || '';
      if (!text) return;
      const run = { text, marks: orderMarks(activeMarks) };
      if (activeHref) run.href = activeHref;
      runs.push(run);
      return;
    }
    if (node.nodeType !== 1 /* Element */) return;
    const tag = node.tagName.toLowerCase();

    // <br> → hard break represented as "\n" in the source run.
    if (tag === 'br') {
      runs.push({ text: '\n', marks: orderMarks(activeMarks) });
      return;
    }

    // Figure out what this element adds to the mark stack.
    const nextMarks = new Set(activeMarks || []);
    if (TAG_TO_MARK[tag]) nextMarks.add(TAG_TO_MARK[tag]);
    // Respect inline style/bold-weight (execCommand sometimes emits
    // <span style="font-weight: bold"> instead of <b>).
    const fw = node.style?.fontWeight;
    if (fw === 'bold' || fw === '700' || Number(fw) >= 600) nextMarks.add('bold');
    if (node.style?.fontStyle === 'italic') nextMarks.add('italic');
    const td = (node.style?.textDecoration || '') + (node.style?.textDecorationLine || '');
    if (/underline/.test(td)) nextMarks.add('underline');
    if (/line-through/.test(td)) nextMarks.add('strike');

    let nextHref = activeHref;
    if (tag === 'a') {
      const href = node.getAttribute('href');
      if (href) nextHref = href;
    }

    for (const c of node.childNodes) {
      walk(c, nextMarks, nextHref);
    }
  };
  for (const c of root.childNodes) walk(c, new Set(), null);
  return runs;
}

// ---------------------------------------------------------------------
// Render — TextRun[] -> JSX
// ---------------------------------------------------------------------
// Wraps the run's text in the applied mark tags in a deterministic
// order so matching runs produce identical DOM and hydration remains
// stable. Link wraps outermost so the whole run is clickable.
export function renderRuns(runs) {
  if (!Array.isArray(runs)) return null;
  return runs.map((run, i) => renderRun(run, i));
}

function renderRun(run, key) {
  if (!run || typeof run.text !== 'string') return null;
  // Preserve soft breaks — the parser records them as "\n" inside a
  // single run. We split and interleave <br> so the displayed layout
  // matches what the staff typed with Shift+Enter.
  const pieces = run.text.split('\n');
  let content = pieces.reduce((acc, piece, idx) => {
    if (idx > 0) acc.push(React.createElement('br', { key: `br-${idx}` }));
    if (piece) acc.push(piece);
    return acc;
  }, []);

  // Wrap inside out — innermost mark first → outermost.
  const ordered = orderMarks(run.marks);
  for (const mark of ordered) {
    const tag = MARK_TAGS[mark];
    if (!tag) continue;
    content = React.createElement(tag, { key: `m-${mark}` }, content);
  }

  // Link wraps everything so the entire marked region is the target.
  if (run.href) {
    content = React.createElement(
      'a',
      { key: `a-${run.href}`, href: run.href, rel: 'noreferrer' },
      content
    );
  }

  return React.createElement(React.Fragment, { key }, content);
}

// Branch vs run leaf classifier used by both Node renderers. A leaf
// with children that start with a run object is a rich text leaf;
// anything else (including the legacy textContent shape) renders the
// old-fashioned way.
export function isRunArray(children) {
  return Array.isArray(children)
    && children.length > 0
    && children.every((c) => c && typeof c.text === 'string' && !c.tag);
}

// ---------------------------------------------------------------------
// Commands — operate on the current window selection inside the
// active contentEditable. execCommand is deprecated but the only
// way short of a full editor framework to toggle inline marks without
// reimplementing selection math. It's gated to only run while an
// editable element is focused so we don't corrupt static DOM.
// ---------------------------------------------------------------------
const MARK_COMMAND = {
  bold:      'bold',
  italic:    'italic',
  underline: 'underline',
  strike:    'strikeThrough',
  code:      null,   // fall-through: wrap via inline <code>
  sup:       'superscript',
  sub:       'subscript',
};

export function toggleMark(mark) {
  const cmd = MARK_COMMAND[mark];
  if (cmd) {
    try { document.execCommand(cmd, false, null); } catch { /* no-op */ }
    return;
  }
  // `code` has no execCommand equivalent in any browser. Wrap the
  // selection in a <code> tag manually. Toggling off isn't covered
  // here — the floating toolbar's clear button handles removal.
  if (mark === 'code') wrapSelectionIn('code');
}

function wrapSelectionIn(tagName) {
  const sel = window.getSelection?.();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return;
  const el = document.createElement(tagName);
  try {
    el.appendChild(range.extractContents());
    range.insertNode(el);
  } catch {
    // extractContents throws on invalid ranges (e.g. across a table
    // cell) — user can retry; we swallow so the app doesn't crash.
  }
}

// Apply or replace a link on the current selection. Empty href =
// remove.
export function applyLink(href) {
  const sel = window.getSelection?.();
  if (!sel || sel.rangeCount === 0) return;
  if (!href) {
    try { document.execCommand('unlink', false, null); } catch {}
    return;
  }
  try { document.execCommand('createLink', false, href); } catch {}
}

// Clear all formatting from the selection (removeFormat + unlink).
export function clearFormatting() {
  try { document.execCommand('removeFormat', false, null); } catch {}
  try { document.execCommand('unlink', false, null); } catch {}
}

// Check whether a mark is currently applied to the selection — drives
// the "active" state on toolbar buttons.
export function isMarkActive(mark) {
  const cmd = MARK_COMMAND[mark];
  if (!cmd) {
    // For `code`, walk up the DOM from the anchor.
    const sel = window.getSelection?.();
    let node = sel?.anchorNode;
    while (node && node.nodeType !== 1) node = node.parentNode;
    while (node) {
      if (node.tagName?.toLowerCase() === 'code') return true;
      node = node.parentNode;
    }
    return false;
  }
  try { return document.queryCommandState(cmd); }
  catch { return false; }
}

// ---------------------------------------------------------------------
// FloatingTextToolbar — renders above the current selection inside
// `anchorRef.current` (the contentEditable element). Mounted once per
// edit session so positioning costs are bounded.
// ---------------------------------------------------------------------
export function FloatingTextToolbar({ anchorRef, active, onChange, onCommand }) {
  const [rect, setRect] = useState(null);
  const [linkMode, setLinkMode] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const toolbarRef = useRef(null);

  const measure = useCallback(() => {
    if (!active) { setRect(null); return; }
    const sel = window.getSelection?.();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setRect(null);
      return;
    }
    const range = sel.getRangeAt(0);
    // Guard: ignore selections that aren't inside the active editable.
    const anchor = anchorRef?.current;
    if (anchor && !anchor.contains(range.commonAncestorContainer)) {
      setRect(null);
      return;
    }
    const r = range.getBoundingClientRect();
    if (!r.width && !r.height) { setRect(null); return; }
    setRect({
      top: r.top + window.scrollY,
      left: r.left + r.width / 2 + window.scrollX,
    });
  }, [active, anchorRef]);

  useEffect(() => {
    if (!active) return undefined;
    measure();
    const onSel = () => measure();
    const onScroll = () => measure();
    document.addEventListener('selectionchange', onSel);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('selectionchange', onSel);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [active, measure]);

  useEffect(() => {
    if (!active) setLinkMode(false);
  }, [active]);

  // Notify on any command so the surrounding editor can persist or
  // keep the toolbar in sync.
  const fire = (cmd) => {
    onCommand?.(cmd);
    // Toolbar state updates after DOM mutates.
    setTimeout(() => measure(), 0);
  };

  if (!active || !rect) return null;

  const submitLink = (e) => {
    e?.preventDefault?.();
    const href = linkValue.trim();
    applyLink(href);
    setLinkMode(false);
    setLinkValue('');
    onChange?.();
  };

  return (
    <div
      ref={toolbarRef}
      onMouseDown={(e) => e.preventDefault() /* keep selection alive */}
      style={{
        position: 'absolute',
        top: rect.top - 40, left: rect.left,
        transform: 'translateX(-50%)',
        zIndex: 2500,
        background: '#1e1e1e', color: '#e5e5e5',
        border: '1px solid #333', borderRadius: '4px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        padding: '4px', display: 'flex', gap: '2px',
        fontFamily: 'ui-monospace, monospace', fontSize: '12px',
      }}
    >
      {linkMode ? (
        <form onSubmit={submitLink} style={{ display: 'flex', gap: '4px' }}>
          <input
            autoFocus
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            placeholder="https://…  (empty to remove)"
            style={{
              width: '220px', background: '#111', color: '#e5e5e5',
              border: '1px solid #333', borderRadius: '3px',
              padding: '3px 6px', fontSize: '11.5px', outline: 'none',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setLinkMode(false); e.stopPropagation(); }
              if (e.key === 'Enter')  { submitLink(e); e.stopPropagation(); }
            }}
          />
          <TBtn onClick={submitLink} title="Apply (Enter)">✓</TBtn>
          <TBtn onClick={() => setLinkMode(false)} title="Cancel (Esc)">×</TBtn>
        </form>
      ) : (
        <>
          <TBtn active={isMarkActive('bold')}      onClick={() => fire('bold')}       title="Bold (⌘B)">B</TBtn>
          <TBtn active={isMarkActive('italic')}    onClick={() => fire('italic')}     title="Italic (⌘I)" style={{ fontStyle: 'italic' }}>I</TBtn>
          <TBtn active={isMarkActive('underline')} onClick={() => fire('underline')}  title="Underline (⌘U)" style={{ textDecoration: 'underline' }}>U</TBtn>
          <TBtn active={isMarkActive('strike')}    onClick={() => fire('strike')}     title="Strikethrough" style={{ textDecoration: 'line-through' }}>S</TBtn>
          <Sep />
          <TBtn onClick={() => setLinkMode(true)} title="Link (⌘K)">🔗</TBtn>
          <Sep />
          <TBtn onClick={() => fire('clear')} title="Clear formatting">✕</TBtn>
        </>
      )}
    </div>
  );
}

function TBtn({ children, onClick, active, title, style }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => { e.preventDefault(); onClick?.(e); }}
      title={title}
      style={{
        minWidth: '22px', height: '22px',
        padding: '0 6px',
        background: active ? '#146ef522' : 'transparent',
        color:      active ? '#146ef5'   : '#e5e5e5',
        border:     active ? '1px solid #146ef5' : '1px solid transparent',
        borderRadius: '3px', cursor: 'pointer',
        fontSize: '12px', fontWeight: 700, lineHeight: 1,
        fontFamily: 'inherit',
        ...(style || {}),
      }}
    >{children}</button>
  );
}

function Sep() {
  return <div style={{ width: '1px', margin: '3px 2px', background: '#333' }} />;
}
