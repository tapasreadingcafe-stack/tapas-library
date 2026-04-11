import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// =====================================================================
// StoreEditorSync
//
// Invisible component that listens for postMessage events from the
// dashboard's Edit Website iframe host. Lets the dashboard editor
// drive the store in three ways:
//
//   1. `tapas:navigate`     → react-router navigate('/about')
//   2. `tapas:scroll-to`    → smooth-scroll to a section id
//   3. `tapas:highlight`    → temporarily outline a section in gold
//
// Security: only processes messages whose origin is the dashboard
// subdomain or localhost. Ignores everything else.
// =====================================================================

const ALLOWED_ORIGINS = [
  'https://dashboard.tapasreadingcafe.com',
  'https://tapas-library.vercel.app',       // Vercel preview/default URL for dashboard
  'http://localhost:3000',
  'http://localhost:3001',
];

export default function StoreEditorSync() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handler = (event) => {
      if (!ALLOWED_ORIGINS.some(o => event.origin === o || event.origin.endsWith('.vercel.app'))) {
        return;
      }
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'tapas:navigate' && typeof msg.path === 'string') {
        if (location.pathname !== msg.path) {
          navigate(msg.path);
        }
        return;
      }

      if (msg.type === 'tapas:scroll-to' && typeof msg.sectionId === 'string') {
        // Delay a tick in case navigation just happened.
        setTimeout(() => {
          const el = document.getElementById(msg.sectionId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
        return;
      }

      if (msg.type === 'tapas:highlight' && typeof msg.sectionId === 'string') {
        const el = document.getElementById(msg.sectionId);
        if (!el) return;
        const prev = el.style.outline;
        const prevOffset = el.style.outlineOffset;
        el.style.outline = '3px solid #D4A853';
        el.style.outlineOffset = '-3px';
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => {
          el.style.outline = prev;
          el.style.outlineOffset = prevOffset;
        }, 2000);
        return;
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [navigate, location.pathname]);

  // Tell the parent (if any) that the store is ready to receive messages.
  useEffect(() => {
    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage({ type: 'tapas:ready', path: location.pathname }, '*');
      } catch {}
    }
  }, [location.pathname]);

  return null;
}
