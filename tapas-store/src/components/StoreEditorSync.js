import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// =====================================================================
// StoreEditorSync
//
// Invisible component that bridges the storefront iframe and the
// dashboard Site Content editor. Only active when the store is
// running inside an iframe (window.parent !== window).
//
// Two directions of communication:
//
// 1. Dashboard → Store (incoming messages)
//    tapas:navigate    → react-router navigate
//    tapas:scroll-to   → smooth-scroll to a section id
//    tapas:highlight   → scroll + 2-second gold outline flash
//
// 2. Store → Dashboard (outgoing messages)
//    tapas:ready       → sent on mount and on route change
//    tapas:edit-field  → sent when the user clicks any
//                        [data-editable] element inside the iframe
//
// When the store is running in iframe mode it also injects a hover
// outline + click handler on every [data-editable] element so the
// user can point-and-click on any text and jump to the matching field
// in the dashboard sidebar.
// =====================================================================

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/dashboard\.tapasreadingcafe\.com$/,
  /^https:\/\/.*\.vercel\.app$/,
  /^http:\/\/localhost:\d+$/,
];

function isAllowedOrigin(origin) {
  return ALLOWED_ORIGIN_PATTERNS.some(re => re.test(origin));
}

function isInIframe() {
  try { return window.self !== window.top; } catch { return true; }
}

export default function StoreEditorSync() {
  const navigate = useNavigate();
  const location = useLocation();

  // ------------------------------------------------------------------
  // 1. Listen for commands from the dashboard
  // ------------------------------------------------------------------
  useEffect(() => {
    const handler = (event) => {
      if (!isAllowedOrigin(event.origin)) return;
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'tapas:navigate' && typeof msg.path === 'string') {
        if (location.pathname !== msg.path) navigate(msg.path);
        return;
      }

      if (msg.type === 'tapas:scroll-to' && typeof msg.sectionId === 'string') {
        setTimeout(() => {
          const el = document.getElementById(msg.sectionId);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
        return;
      }

      if (msg.type === 'tapas:highlight' && typeof msg.sectionId === 'string') {
        const el = document.getElementById(msg.sectionId);
        if (!el) return;
        const prev = { outline: el.style.outline, offset: el.style.outlineOffset };
        el.style.outline = '3px solid #D4A853';
        el.style.outlineOffset = '-3px';
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => {
          el.style.outline = prev.outline;
          el.style.outlineOffset = prev.offset;
        }, 2000);
        return;
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [navigate, location.pathname]);

  // ------------------------------------------------------------------
  // 2. Announce "ready" to the parent on mount and route change
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!isInIframe()) return;
    try {
      window.parent.postMessage({ type: 'tapas:ready', path: location.pathname }, '*');
    } catch {}
  }, [location.pathname]);

  // ------------------------------------------------------------------
  // 3. Click-to-edit: attach hover outlines + click handlers to every
  //    [data-editable] element in the page, but only when inside an
  //    iframe. Uses event delegation so new elements are picked up.
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!isInIframe()) return;

    let lastHovered = null;

    const applyHover = (el) => {
      if (lastHovered && lastHovered !== el) {
        lastHovered.style.outline = lastHovered.dataset.__prevOutline || '';
        lastHovered.style.outlineOffset = lastHovered.dataset.__prevOffset || '';
        lastHovered.style.cursor = lastHovered.dataset.__prevCursor || '';
      }
      if (el) {
        el.dataset.__prevOutline = el.style.outline || '';
        el.dataset.__prevOffset = el.style.outlineOffset || '';
        el.dataset.__prevCursor = el.style.cursor || '';
        el.style.outline = '2px dashed #D4A853';
        el.style.outlineOffset = '4px';
        el.style.cursor = 'pointer';
      }
      lastHovered = el;
    };

    const onMouseOver = (e) => {
      const el = e.target.closest('[data-editable]');
      applyHover(el);
    };

    const onClick = (e) => {
      const el = e.target.closest('[data-editable]');
      if (!el) return;
      // Don't fire if clicking an actual link/button — let it navigate.
      if (e.target.closest('a, button, input, textarea, select, label')) return;
      e.preventDefault();
      e.stopPropagation();
      try {
        window.parent.postMessage(
          { type: 'tapas:edit-field', fieldPath: el.dataset.editable },
          '*'
        );
      } catch {}
    };

    // Inject a small legend in the bottom-right so the user knows
    // they're in editor mode.
    const legend = document.createElement('div');
    legend.textContent = '✏️ Click any text to edit';
    Object.assign(legend.style, {
      position: 'fixed',
      bottom: '16px',
      right: '16px',
      background: 'rgba(44,24,16,0.92)',
      color: '#F5DEB3',
      padding: '10px 16px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      zIndex: '99999',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      pointerEvents: 'none',
      letterSpacing: '0.3px',
    });
    document.body.appendChild(legend);

    document.addEventListener('mouseover', onMouseOver);
    document.addEventListener('click', onClick, true);

    return () => {
      document.removeEventListener('mouseover', onMouseOver);
      document.removeEventListener('click', onClick, true);
      if (lastHovered) applyHover(null);
      if (legend.parentNode) legend.parentNode.removeChild(legend);
    };
  }, []);

  return null;
}
