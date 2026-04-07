import React, { useState, useRef, useEffect, useCallback } from 'react';

// ── Hint descriptions for sidebar nav items ──────────────────────────────────
const NAV_HINTS = {
  '/': 'Overview of your library & cafe — key metrics, charts, and recent activity at a glance.',
  '/books': 'Manage your book catalog — add, edit, search, and track inventory.',
  '/Borrow': 'Check out books to members, manage returns, and track active borrows.',
  '/overdue': 'View all overdue books with fine calculations and member details.',
  '/availability': 'Real-time stock status — see which books are available, low stock, or out.',
  '/statistics': 'Borrowing trends and metrics over 7, 30, and 90 day periods.',
  '/recommendations': 'Smart book suggestions based on member history and trending titles.',
  '/wishlist': 'Member book wishlists — see what books are in demand.',
  '/reviews': 'Book ratings and reviews from members (1-5 stars).',
  '/reservations': 'Book reservation queue — members can reserve out-of-stock books.',
  '/pos': 'Point of Sale — process payments for memberships, fines, printing, and more.',
  '/cafe/menu': 'Cafe POS — take orders for tea, coffee, bakery items, and process payments.',
  '/cafe/manage': 'Add, edit, and manage your cafe menu items with prices and categories.',
  '/cafe/orders': 'View cafe order history, filter by date/status, and manage orders.',
  '/cafe/reports': 'Cafe sales analytics — daily revenue, weekly trends, and top selling items.',
  '/members': 'Manage library members — add, edit, search, and view membership details.',
  '/fines': 'Track and collect overdue fines, view payment history.',
  '/inventory/library': 'Monitor book stock levels — low stock and out of stock alerts.',
  '/inventory/cafe': 'Track cafe ingredient stock, set reorder levels, and restock.',
  '/events': 'Create and manage events — book clubs, workshops, readings, and more.',
  '/events/create': 'Create new one-time or recurring events with capacity and pricing.',
  '/events/attendance': 'Check in registered members at events and track attendance.',
  '/reports': 'Comprehensive reports — revenue, top books, overdue, and expiring memberships.',
  '/accounts/overview': 'Financial dashboard — income vs expenses across library, cafe, and events.',
  '/accounts/transactions': 'Unified transaction log for all sales and payments.',
  '/accounts/expenses': 'Track and categorize business expenses.',
  '/staff': 'Manage staff accounts, roles, and access.',
  '/vendors': 'Supplier directory — manage book and cafe vendors.',
  '/vendors/orders': 'Create and track purchase orders to vendors.',
  '/settings/app': 'Configure library settings — fine rates, loan periods, working hours.',
  '/settings/profile': 'Edit your staff profile and change password.',
  '/settings/activity': 'View audit trail — who did what and when across the system.',
  '/catalog': 'Public book catalog — members can search and browse books without login.',
  '/kiosk': 'Self-checkout kiosk — members scan their card and borrow/return books themselves.',
};

export function getHint(path) {
  return NAV_HINTS[path] || '';
}

export function isHintsEnabled() {
  try { return localStorage.getItem('hints_enabled') !== 'false'; } catch { return true; }
}

export function setHintsEnabled(val) {
  localStorage.setItem('hints_enabled', val ? 'true' : 'false');
}

// ── HintBubble: Sidebar nav item tooltip ─────────────────────────────────────
export function HintBubble({ path, children }) {
  const [show, setShow] = useState(false);
  const timerRef = useRef(null);
  const hint = getHint(path);
  const enabled = isHintsEnabled();

  const handleEnter = () => {
    if (!enabled || !hint) return;
    timerRef.current = setTimeout(() => setShow(true), 2000);
  };
  const handleLeave = () => {
    clearTimeout(timerRef.current);
    setShow(false);
  };

  if (!enabled || !hint) return children;

  return (
    <div style={{ position: 'relative' }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}>
      {children}
      {show && (
        <div style={{
          position: 'absolute', left: '100%', top: '50%', transform: 'translateY(-50%)',
          marginLeft: '10px', background: '#1a1a2e', color: '#e0e8f4', padding: '10px 14px',
          borderRadius: '8px', fontSize: '12px', lineHeight: '1.5', maxWidth: '240px',
          whiteSpace: 'normal', zIndex: 10000, boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
          pointerEvents: 'none', animation: 'hintFadeIn 0.2s ease',
          border: '1px solid #2a3a5a',
        }}>
          <div style={{ position: 'absolute', left: '-5px', top: '50%', transform: 'translateY(-50%) rotate(45deg)', width: '10px', height: '10px', background: '#1a1a2e', border: '1px solid #2a3a5a', borderRight: 'none', borderTop: 'none' }} />
          {hint}
        </div>
      )}
    </div>
  );
}

// ── GlobalHintTooltip: Shows tooltip on ANY element after 2s hover ────────────
// Attach this ONCE at the app level. It listens to mouseover/mouseout globally.
export function GlobalHintTooltip() {
  const [tooltip, setTooltip] = useState(null);
  const timerRef = useRef(null);
  const currentElRef = useRef(null);

  const getHintText = useCallback((el) => {
    // Priority: data-hint > title > aria-label > inner text for small elements
    if (el.dataset?.hint) return el.dataset.hint;
    if (el.title) return el.title;
    if (el.getAttribute?.('aria-label')) return el.getAttribute('aria-label');

    // For buttons, tabs, links with short text — generate a hint
    const tag = el.tagName?.toLowerCase();
    const isInteractive = tag === 'button' || tag === 'a' || el.role === 'tab' || el.role === 'button' || tag === 'th';
    if (!isInteractive) return null;

    const text = el.innerText?.trim();
    if (!text || text.length > 50 || text.length < 2) return null;

    // Don't show hint for elements that already show their purpose clearly
    if (el.closest('.modal-overlay') || el.closest('.modal-content')) return null;

    return null; // Only show hints for elements with explicit data-hint or title
  }, []);

  useEffect(() => {
    if (!isHintsEnabled()) return;

    const handleMouseOver = (e) => {
      // Walk up to find the nearest hintable element
      let el = e.target;
      let hint = null;
      for (let i = 0; i < 5 && el && el !== document.body; i++) {
        hint = getHintText(el);
        if (hint) break;
        el = el.parentElement;
      }

      if (!hint || el === currentElRef.current) return;

      // Clear any existing timer
      clearTimeout(timerRef.current);
      setTooltip(null);
      currentElRef.current = el;

      // Show after 2 seconds
      timerRef.current = setTimeout(() => {
        const rect = el.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top - 8;
        setTooltip({ text: hint, x, y, below: y < 60 });
      }, 2000);
    };

    const handleMouseOut = (e) => {
      let el = e.target;
      for (let i = 0; i < 5 && el && el !== document.body; i++) {
        if (el === currentElRef.current) {
          clearTimeout(timerRef.current);
          setTooltip(null);
          currentElRef.current = null;
          return;
        }
        el = el.parentElement;
      }
    };

    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('click', () => { clearTimeout(timerRef.current); setTooltip(null); }, true);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver, true);
      document.removeEventListener('mouseout', handleMouseOut, true);
      clearTimeout(timerRef.current);
    };
  }, [getHintText]);

  if (!tooltip) return null;

  const top = tooltip.below ? tooltip.y + 50 : tooltip.y;

  return (
    <div style={{
      position: 'fixed',
      left: Math.min(tooltip.x, window.innerWidth - 260),
      top: top,
      transform: tooltip.below ? 'translateX(-50%)' : 'translateX(-50%) translateY(-100%)',
      background: '#1a1a2e', color: '#e0e8f4', padding: '8px 14px',
      borderRadius: '8px', fontSize: '12px', lineHeight: '1.5', maxWidth: '260px',
      whiteSpace: 'normal', zIndex: 99999, boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
      pointerEvents: 'none', animation: 'hintFadeIn 0.2s ease',
      border: '1px solid #2a3a5a',
    }}>
      <style>{`@keyframes hintFadeIn { from { opacity: 0; transform: translateX(-50%) translateY(${tooltip.below ? '-4px' : 'calc(-100% + 4px)'}); } to { opacity: 1; transform: translateX(-50%) translateY(${tooltip.below ? '0' : '-100%'}); } }`}</style>
      {tooltip.text}
    </div>
  );
}
