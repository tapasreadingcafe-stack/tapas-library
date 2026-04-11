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
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        clearSelection();
        try { window.parent.postMessage({ type: 'tapas:deselect' }, '*'); } catch {}
      }
    };

    // Small legend bottom-right.
    const legend = document.createElement('div');
    legend.textContent = '✏️ Click any element to select';
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

    return () => {
      document.removeEventListener('mouseover', onMouseOver);
      document.removeEventListener('mouseout',  onMouseOut);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown);
      setHover(null);
      clearSelection();
      if (legend.parentNode) legend.parentNode.removeChild(legend);
    };
  }, []);

  return null;
}
