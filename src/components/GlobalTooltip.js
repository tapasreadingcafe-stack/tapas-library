import React, { useState, useEffect, useRef } from 'react';

// ── All hints: nav items + buttons + tabs + custom user hints ────────────────

const DEFAULT_HINTS = {
  // Sidebar nav items (matched by href or text)
  'dashboard': 'Overview of your library & cafe — key metrics and activity',
  'books': 'Manage your book catalog — add, edit, search, and track inventory',
  'borrow': 'Check out books to members, manage returns, and track borrows',
  'overdue': 'View all overdue books with fine calculations',
  'availability': 'Real-time stock status — available, low stock, or out',
  'statistics': 'Borrowing trends and metrics over 7, 30, and 90 days',
  'recommend': 'Smart book suggestions based on member history',
  'recommendations': 'Smart book suggestions based on member history',
  'wishlist': 'Member book wishlists — see what books are in demand',
  'reviews': 'Book ratings and reviews from members (1-5 stars)',
  'reservations': 'Book reservation queue for out-of-stock books',
  'pos': 'Point of Sale — process payments for memberships, fines, printing',
  'menu pos': 'Cafe POS — take orders for tea, coffee, bakery items',
  'menu & pos': 'Cafe POS — take orders for tea, coffee, bakery items',
  'manage menu': 'Add, edit, and manage cafe menu items with prices',
  'orders': 'View order history, filter by date/status',
  'cafe reports': 'Cafe sales analytics — daily revenue, top items',
  'members list': 'Manage library members — add, edit, search, view details',
  'members': 'Manage library members — add, edit, search, view details',
  'fines': 'Track and collect overdue fines, view payment history',
  'library stock': 'Monitor book stock levels — low stock alerts',
  'cafe stock': 'Track cafe ingredient stock, set reorder levels',
  'all events': 'View and manage all upcoming and past events',
  'create event': 'Set up a new library or cafe event',
  'attendance': 'Check in registered members at events',
  'reports': 'Revenue, top books, overdue, and expiring memberships',
  'overview': 'Financial dashboard — income vs expenses breakdown',
  'transactions': 'Unified transaction log for all sales and payments',
  'expenses': 'Track and categorize business expenses',
  'staff': 'Manage staff accounts, roles, and access',
  'vendor list': 'Supplier directory — manage book and cafe vendors',
  'purchase orders': 'Create and track purchase orders to vendors',
  'app config': 'Configure fine rates, loan periods, working hours',
  'profile': 'Edit your staff profile and change password',
  'activity log': 'View audit trail — who did what and when',
  'public catalog': 'Public book catalog — browse without login',
  'kiosk mode': 'Self-checkout — members borrow/return books themselves',
  'library': 'Books, borrowing, returns, and all library operations',
  'cafe': 'Cafe menu, orders, and reports',
  'inventory': 'Stock management for library and cafe',
  'events': 'Create and manage events, registrations, attendance',
  'accounts': 'Financial overview, transactions, and expenses',
  'vendors': 'Supplier directory and purchase orders',
  'settings': 'App configuration, profile, and activity log',

  // Buttons
  'add member': 'Create a new library member with name, phone, and plan',
  '+ add member': 'Create a new library member with name, phone, and plan',
  'add book': 'Add a new book to the catalog',
  '+ add book': 'Add a new book to the catalog',
  'import csv': 'Bulk import books from a CSV file',
  'refresh': 'Reload the latest data',
  'save': 'Save your changes',
  'save changes': 'Save all modified settings',
  'cancel': 'Discard changes and go back',
  'close': 'Close this window',
  'delete': 'Permanently remove this item',
  'edit': 'Modify this item',
  'view': 'See full details',
  'export csv': 'Download as CSV spreadsheet',
  'export': 'Download this data',
  'checkout': 'Issue a book to a member',
  'return': 'Process a book return',
  'renew': 'Extend the due date',
  'check in': 'Mark member as attended',
  'register': 'Sign up member for event',
  'place order': 'Complete and submit order',
  'new checkout': 'Start issuing a book',
  '+ new checkout': 'Start issuing a book',
  'create event': 'Set up a new event',
  '+ create event': 'Set up a new event',
  'start tour': 'Walk through all features step by step',
  'add item': 'Add a new item',
  '+ add item': 'Add a new item',
  'add service': 'Create a new POS service',
  '+ add service': 'Create a new POS service',
  'add vendor': 'Register a new supplier',
  '+ add vendor': 'Register a new supplier',
  'add expense': 'Record a new expense',
  '+ add expense': 'Record a new expense',
  'new po': 'Create a purchase order',
  '+ new po': 'Create a purchase order',
  'print': 'Print this document',
  'lookup': 'Search book details by ISBN',

  // Tabs & filters
  'all': 'Show all items',
  'active': 'Show active items only',
  'due today': 'Items due today',
  'this week': 'Items due this week',
  'upcoming': 'Future events',
  'past': 'Past events',
  'cancelled': 'Cancelled items',
  'revenue': 'View revenue data',
  'top books': 'Most borrowed books',
  'expiring soon': 'Memberships expiring in 7 days',
  'daily': 'Today\'s summary',
  'weekly': 'This week\'s trends',
  'top items': 'Best selling items',
  'membership': 'Membership services',
  'printing': 'Print & lamination services',
  'stationery': 'Stationery for sale',
  'donations': 'Accept donations',
  'other': 'Miscellaneous items',
  'tea': 'Tea items',
  'coffee': 'Coffee items',
  'juice': 'Juice items',
  'bakery': 'Bakery items',
  'snacks': 'Snack items',
  'available': 'In stock items',
  'unavailable': 'Out of stock items',
  'completed': 'Completed orders',
  'pending': 'Pending orders',
  'low stock': 'Low inventory items',
  'out of stock': 'Zero inventory items',
};

// Load user-customized hints from localStorage
function loadCustomHints() {
  try {
    const saved = localStorage.getItem('custom_hints');
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
}

function saveCustomHints(hints) {
  localStorage.setItem('custom_hints', JSON.stringify(hints));
}

function getAllHints() {
  return { ...DEFAULT_HINTS, ...loadCustomHints() };
}

// ── Export for Settings page ─────────────────────────────────────────────────
export { DEFAULT_HINTS, loadCustomHints, saveCustomHints, getAllHints };

// ── Get hint for an element ──────────────────────────────────────────────────
function getSmartHint(el) {
  if (el.dataset?.hint) return el.dataset.hint;
  if (el.title && el.title.length > 3) return el.title;

  const allHints = getAllHints();
  const text = (el.innerText || el.textContent || '').trim();
  const cleanText = text.replace(/[^\w\s/&+]/g, '').trim().toLowerCase();

  if (!cleanText || cleanText.length > 40) return null;

  // Direct match
  if (allHints[cleanText]) return allHints[cleanText];

  // Check each key
  for (const [key, hint] of Object.entries(allHints)) {
    if (cleanText === key) return hint;
    if (cleanText.length < 25 && cleanText.includes(key) && key.length > 2) return hint;
  }

  // Table headers
  if (el.tagName === 'TH') {
    const h = text.replace(/[^\w\s]/g, '').trim();
    if (h) return `Sort or filter by ${h}`;
  }

  return null;
}

function isHintable(el) {
  const tag = el.tagName?.toLowerCase();
  if (!tag) return false;
  if (tag === 'button') return true;
  if (tag === 'a') return true;
  if (tag === 'th') return true;
  if (el.role === 'button' || el.role === 'tab') return true;
  if (el.dataset?.hint || el.title) return true;
  if (el.classList?.contains('nav-link') || el.classList?.contains('nav-link-child') || el.classList?.contains('nav-group-header')) return true;
  // Clickable elements
  if (el.onclick || el.style?.cursor === 'pointer') return true;
  try { if (window.getComputedStyle(el).cursor === 'pointer') return true; } catch {}
  return false;
}

// ── Main component ───────────────────────────────────────────────────────────
export default function GlobalTooltip() {
  const [tooltip, setTooltip] = useState(null);
  const timerRef = useRef(null);
  const elRef = useRef(null);

  useEffect(() => {
    const enabled = () => {
      try { return localStorage.getItem('hints_enabled') !== 'false'; } catch { return true; }
    };

    const onOver = (e) => {
      if (!enabled()) return;
      let el = e.target;
      for (let i = 0; i < 5 && el && el !== document.body; i++) {
        if (isHintable(el)) {
          const hint = getSmartHint(el);
          if (hint && el !== elRef.current) {
            clearTimeout(timerRef.current);
            elRef.current = el;
            timerRef.current = setTimeout(() => {
              const r = el.getBoundingClientRect();
              setTooltip({ text: hint, x: r.left + r.width / 2, y: r.top, h: r.height });
            }, 400);
          }
          return;
        }
        el = el.parentElement;
      }
    };

    const onOut = (e) => {
      let el = e.target;
      for (let i = 0; i < 5 && el && el !== document.body; i++) {
        if (el === elRef.current) {
          clearTimeout(timerRef.current);
          setTooltip(null);
          elRef.current = null;
          return;
        }
        el = el.parentElement;
      }
    };

    const hide = () => { clearTimeout(timerRef.current); setTooltip(null); elRef.current = null; };

    document.addEventListener('mouseover', onOver, true);
    document.addEventListener('mouseout', onOut, true);
    document.addEventListener('click', hide, true);
    document.addEventListener('scroll', hide, true);
    return () => {
      document.removeEventListener('mouseover', onOver, true);
      document.removeEventListener('mouseout', onOut, true);
      document.removeEventListener('click', hide, true);
      document.removeEventListener('scroll', hide, true);
      clearTimeout(timerRef.current);
    };
  }, []);

  if (!tooltip) return null;

  const left = Math.max(8, Math.min(tooltip.x, window.innerWidth - 120));
  const below = tooltip.y < 45;

  return (
    <div style={{
      position: 'fixed', left, top: below ? tooltip.y + tooltip.h + 6 : tooltip.y - 4,
      transform: below ? 'translateX(-50%)' : 'translateX(-50%) translateY(-100%)',
      background: '#1a1a2e', color: '#e8ecf4', padding: '5px 10px',
      borderRadius: '6px', fontSize: '11px', lineHeight: '1.4', maxWidth: '200px',
      whiteSpace: 'normal', zIndex: 99999, pointerEvents: 'none',
      boxShadow: '0 3px 12px rgba(0,0,0,0.4)', border: '1px solid #2a3a5a',
      animation: 'ttFade 0.1s ease', textAlign: 'center',
    }}>
      <style>{`@keyframes ttFade{from{opacity:0}to{opacity:1}}`}</style>
      <div style={{
        position: 'absolute', [below ? 'top' : 'bottom']: '-4px', left: '50%',
        transform: 'translateX(-50%) rotate(45deg)', width: '7px', height: '7px',
        background: '#1a1a2e',
        borderBottom: below ? 'none' : '1px solid #2a3a5a',
        borderRight: below ? 'none' : '1px solid #2a3a5a',
        borderTop: below ? '1px solid #2a3a5a' : 'none',
        borderLeft: below ? '1px solid #2a3a5a' : 'none',
      }} />
      {tooltip.text}
    </div>
  );
}
