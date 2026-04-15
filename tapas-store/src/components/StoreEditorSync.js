import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// =====================================================================
// StoreEditorSync
//
// Bridges the storefront iframe and the dashboard Site Content editor.
// Active only when the store is running inside an iframe.
//
// Incoming (dashboard → store)
//   tapas:navigate            → react-router navigate
//   tapas:scroll-to           → scroll to a section id
//   tapas:highlight           → scroll + 2s flash outline
//   tapas:apply-content       → hot-apply a new content blob
//   tapas:set-selection       → programmatically select an element
//   tapas:clear-selection     → deselect
//
// Outgoing (store → dashboard)
//   tapas:ready               → mounted and route changed
//   tapas:select              → user clicked a [data-editable] element
//   tapas:deselect            → user clicked empty canvas
//
// Canvas affordances (when in iframe mode):
//   - Hover: 1.5px solid Figma blue outline with offset
//   - Selected: 2px solid Figma blue outline + corner marks
//   - Click on empty canvas: deselect
// =====================================================================

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/dashboard\.tapasreadingcafe\.com$/,
  /^https:\/\/.*\.vercel\.app$/,
  /^http:\/\/localhost:\d+$/,
];
const HOVER_COLOR    = '#0D99FF';   // Figma blue
const SELECTED_COLOR = '#0D99FF';

function isAllowedOrigin(origin) {
  return ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
}
function isInIframe() {
  try { return window.self !== window.top; } catch { return true; }
}

// Hover + selection state as module-level closures — one instance only.
let hoverEl = null;
let selectedEl = null;
// Inline edit state: the element currently in contentEditable mode, the
// text we captured before editing started (for cancel/Escape), and the
// field path the element represents.
let editingEl = null;
let editingOriginal = '';
let editingPath = '';

function cleanOutline(el) {
  if (!el) return;
  if (el.dataset.__tapasPrevOutline !== undefined) {
    el.style.outline = el.dataset.__tapasPrevOutline;
    delete el.dataset.__tapasPrevOutline;
  }
  if (el.dataset.__tapasPrevOffset !== undefined) {
    el.style.outlineOffset = el.dataset.__tapasPrevOffset;
    delete el.dataset.__tapasPrevOffset;
  }
  if (el.dataset.__tapasPrevCursor !== undefined) {
    el.style.cursor = el.dataset.__tapasPrevCursor;
    delete el.dataset.__tapasPrevCursor;
  }
}

function applyOutline(el, color, width, style = 'solid') {
  if (!el) return;
  if (el.dataset.__tapasPrevOutline === undefined) {
    el.dataset.__tapasPrevOutline = el.style.outline || '';
    el.dataset.__tapasPrevOffset = el.style.outlineOffset || '';
    el.dataset.__tapasPrevCursor = el.style.cursor || '';
  }
  el.style.outline = `${width}px ${style} ${color}`;
  el.style.outlineOffset = '2px';
  el.style.cursor = 'pointer';
}

function setHover(el) {
  if (hoverEl === el) return;
  if (hoverEl && hoverEl !== selectedEl) cleanOutline(hoverEl);
  hoverEl = el;
  // Don't overwrite the selected outline with the hover outline.
  if (el && el !== selectedEl) applyOutline(el, HOVER_COLOR, 1.5, 'solid');
}

function setSelected(el, _path) {
  if (selectedEl && selectedEl !== el) cleanOutline(selectedEl);
  selectedEl = el;
  if (el) applyOutline(el, SELECTED_COLOR, 2, 'solid');
}

function clearSelection() {
  if (selectedEl) cleanOutline(selectedEl);
  selectedEl = null;
}

// An element is safely inline-editable if every child is a text node —
// i.e. no nested <span>, <img>, etc. We don't want contentEditable to
// let the user clobber structured markup like an icon button.
function isPlainTextEditable(el) {
  if (!el) return false;
  for (const node of el.childNodes) {
    if (node.nodeType !== Node.TEXT_NODE) return false;
  }
  return el.textContent.trim().length > 0;
}

function commitInlineEdit(send) {
  if (!editingEl) return;
  const next = editingEl.textContent;
  const path = editingPath;
  const changed = next !== editingOriginal;
  editingEl.contentEditable = 'false';
  editingEl.style.cursor = '';
  editingEl.style.caretColor = '';
  editingEl = null;
  editingOriginal = '';
  editingPath = '';
  // Clear the pause flag so the SiteContent context resumes applying
  // incoming content updates on the next keystroke-from-elsewhere.
  window.__tapasInlineEditing = false;
  if (changed && path && send) {
    try {
      window.parent.postMessage(
        { type: 'tapas:set-field-value', fieldPath: path, value: next }, '*'
      );
    } catch {}
  }
}

function cancelInlineEdit() {
  if (!editingEl) return;
  // Revert visible text and tell the parent to roll back draftContent.
  const path = editingPath;
  editingEl.textContent = editingOriginal;
  editingEl.contentEditable = 'false';
  editingEl.style.cursor = '';
  editingEl.style.caretColor = '';
  const original = editingOriginal;
  editingEl = null;
  editingOriginal = '';
  editingPath = '';
  window.__tapasInlineEditing = false;
  if (path) {
    try {
      window.parent.postMessage(
        { type: 'tapas:set-field-value', fieldPath: path, value: original }, '*'
      );
    } catch {}
  }
}

function startInlineEdit(el) {
  if (!el || editingEl === el) return;
  if (editingEl) commitInlineEdit(true);
  editingEl = el;
  editingOriginal = el.textContent;
  editingPath = el.dataset.editable || '';
  el.contentEditable = 'true';
  el.style.caretColor = HOVER_COLOR;
  el.style.cursor = 'text';
  // Pause incoming apply-content merges while we edit — otherwise React
  // will re-render this very element on every keystroke round-trip and
  // clobber the caret position.
  window.__tapasInlineEditing = true;
  // Select all text so typing replaces it by default (Figma-like).
  try {
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    el.focus();
  } catch {}
}

export default function StoreEditorSync() {
  const navigate = useNavigate();
  const location = useLocation();

  // Incoming messages
  useEffect(() => {
    const handler = (event) => {
      if (!isAllowedOrigin(event.origin)) return;
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;

      switch (msg.type) {
        case 'tapas:navigate':
          if (typeof msg.path === 'string' && location.pathname !== msg.path) navigate(msg.path);
          break;

        case 'tapas:scroll-to': {
          setTimeout(() => {
            const el = document.getElementById(msg.sectionId);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
          break;
        }

        case 'tapas:highlight': {
          const el = document.getElementById(msg.sectionId);
          if (!el) break;
          const prev = { outline: el.style.outline, offset: el.style.outlineOffset };
          el.style.outline = `3px solid ${SELECTED_COLOR}`;
          el.style.outlineOffset = '-3px';
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setTimeout(() => {
            el.style.outline = prev.outline;
            el.style.outlineOffset = prev.offset;
          }, 2000);
          break;
        }

        case 'tapas:clear-selection':
          clearSelection();
          break;

        case 'tapas:set-selection': {
          if (typeof msg.path !== 'string') break;
          const target = document.querySelector(`[data-editable="${msg.path}"]`);
          if (target) {
            setSelected(target, msg.path);
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          break;
        }

        default:
          break;
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [navigate, location.pathname]);

  // Announce 'ready' on mount + route change.
  useEffect(() => {
    if (!isInIframe()) return;
    try {
      window.parent.postMessage({ type: 'tapas:ready', path: location.pathname }, '*');
    } catch {}
  }, [location.pathname]);

  // Canvas click-to-select + hover highlights. Only in iframe mode.
  useEffect(() => {
    if (!isInIframe()) return;

    const onMouseOver = (e) => {
      const el = e.target.closest('[data-editable]');
      setHover(el);
    };
    const onMouseOut = (e) => {
      // Only clear hover if leaving the iframe entirely.
      if (!e.relatedTarget) setHover(null);
    };
    const onClick = (e) => {
      // If we're already editing and the user clicked outside the
      // editing element, commit and let the new click proceed normally.
      if (editingEl && !editingEl.contains(e.target)) {
        commitInlineEdit(true);
        // fall through to normal click handling
      } else if (editingEl && editingEl.contains(e.target)) {
        // Click inside an actively editing element → just position caret,
        // don't re-select or navigate.
        e.stopPropagation();
        return;
      }
      // Ignore clicks on real controls.
      if (e.target.closest('a, button, input, textarea, select, label')) {
        const el = e.target.closest('[data-editable]');
        if (el) {
          // Still allow link/button clicks to be "selected", but don't
          // prevent the link's navigation.
          setSelected(el, el.dataset.editable);
          try {
            window.parent.postMessage(
              { type: 'tapas:select', fieldPath: el.dataset.editable }, '*'
            );
          } catch {}
        }
        return;
      }
      const el = e.target.closest('[data-editable]');
      if (!el) {
        // Empty canvas click → deselect
        clearSelection();
        try { window.parent.postMessage({ type: 'tapas:deselect' }, '*'); } catch {}
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      setSelected(el, el.dataset.editable);
      try {
        window.parent.postMessage(
          { type: 'tapas:select', fieldPath: el.dataset.editable }, '*'
        );
      } catch {}
      // If the element is simple text, immediately enter inline edit
      // mode — this is the "select text and change there only" flow.
      if (isPlainTextEditable(el)) {
        startInlineEdit(el);
      }
    };
    const onKeyDown = (e) => {
      if (editingEl) {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          cancelInlineEdit();
          return;
        }
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();
          commitInlineEdit(true);
          return;
        }
        // Any other key keeps the contentEditable in edit mode.
        // Live-push every keystroke so the right panel / footer stay
        // in sync while the user is still typing.
        try {
          window.parent.postMessage(
            { type: 'tapas:set-field-value', fieldPath: editingPath, value: editingEl.textContent },
            '*'
          );
        } catch {}
        return;
      }
      if (e.key === 'Escape') {
        clearSelection();
        try { window.parent.postMessage({ type: 'tapas:deselect' }, '*'); } catch {}
      }
    };
    const onBlur = (e) => {
      if (editingEl && e.target === editingEl) {
        // contentEditable lost focus → commit whatever is there now.
        commitInlineEdit(true);
      }
    };
    const onInput = (e) => {
      if (editingEl && e.target === editingEl) {
        // Mirror every keystroke so the parent's draftContent updates
        // live — the preview re-render is triggered on the parent side
        // via apply-content, but because the contentEditable IS the
        // element being re-rendered, we don't want React to clobber it.
        try {
          window.parent.postMessage(
            { type: 'tapas:set-field-value', fieldPath: editingPath, value: editingEl.textContent },
            '*'
          );
        } catch {}
      }
    };

    // Small legend bottom-right.
    const legend = document.createElement('div');
    legend.textContent = '✏️ Click text to edit · Esc to cancel';
    Object.assign(legend.style, {
      position: 'fixed',
      bottom: '14px',
      right: '14px',
      background: 'rgba(13,25,48,0.92)',
      color: '#F5F5F5',
      padding: '8px 14px',
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: '600',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      zIndex: '99999',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      pointerEvents: 'none',
      letterSpacing: '0.2px',
    });
    document.body.appendChild(legend);

    document.addEventListener('mouseover', onMouseOver);
    document.addEventListener('mouseout',  onMouseOut);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('blur',  onBlur, true);
    document.addEventListener('input', onInput, true);

    return () => {
      document.removeEventListener('mouseover', onMouseOver);
      document.removeEventListener('mouseout',  onMouseOut);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('blur',  onBlur, true);
      document.removeEventListener('input', onInput, true);
      cancelInlineEdit();
      setHover(null);
      clearSelection();
      if (legend.parentNode) legend.parentNode.removeChild(legend);
    };
  }, []);

  return null;
}
