import React, { useState, useEffect, useRef } from 'react';

// Smart hints for common button/tab text patterns
const SMART_HINTS = {
  // Buttons
  'add member': 'Create a new library member with name, phone, and plan',
  'add book': 'Add a new book to the catalog with title, author, ISBN',
  '+ add book': 'Add a new book to the catalog with title, author, ISBN',
  'import csv': 'Bulk import books from a CSV spreadsheet file',
  'refresh': 'Reload the latest data from database',
  'save': 'Save your changes',
  'save changes': 'Save all modified settings to database',
  'cancel': 'Discard changes and go back',
  'close': 'Close this window',
  'delete': 'Permanently remove this item',
  'edit': 'Modify this item',
  'view': 'See full details',
  'export csv': 'Download this data as a CSV spreadsheet file',
  'export': 'Download this data as a file',
  'search': 'Find items matching your query',
  'filter': 'Narrow down results by criteria',
  'borrow': 'Check out books to members, manage returns, and track active borrows',
  'checkout': 'Issue a book to a member',
  'return': 'Process a book return from member',
  'renew': 'Extend the due date for this borrow',
  'check in': 'Mark this member as attended',
  'register': 'Sign up a member for this event',
  'place order': 'Complete and submit this order',
  'new checkout': 'Start issuing a book to a member',
  '+ new checkout': 'Start issuing a book to a member',
  'create event': 'Set up a new library or cafe event',
  '+ create event': 'Set up a new library or cafe event',
  'start tour': 'Walk through all features step by step',
  'add item': 'Add a new item to the list',
  '+ add item': 'Add a new item to the list',
  'add service': 'Create a new POS service/charge',
  '+ add service': 'Create a new POS service/charge',
  'add vendor': 'Register a new supplier/vendor',
  '+ add vendor': 'Register a new supplier/vendor',
  'add expense': 'Record a new business expense',
  '+ add expense': 'Record a new business expense',
  'new po': 'Create a new purchase order for a vendor',
  '+ new po': 'Create a new purchase order for a vendor',
  'print': 'Print this receipt or document',
  'lookup': 'Search online for book details by ISBN',
  'mark all read': 'Dismiss all notifications',
  'go there': 'Navigate to this feature page',
  'next': 'Go to the next step',
  'back': 'Go to the previous step',
  'finish': 'Complete the tour',
  'done': 'Finish and return to start',

  // Tabs
  'all': 'Show all items without filtering',
  'active': 'Show currently active items only',
  'overdue': 'Show overdue/late items',
  'due today': 'Show items due today',
  'this week': 'Show items due this week',
  'upcoming': 'Events that haven\'t happened yet',
  'past': 'Events that already happened',
  'cancelled': 'Events that were cancelled',
  'revenue': 'View revenue and income data',
  'top books': 'Most borrowed books ranking',
  'expiring soon': 'Memberships expiring within 7 days',
  'daily': 'View today\'s summary',
  'weekly': 'View this week\'s trends',
  'top items': 'Best selling menu items',
  'membership': 'Membership-related services',
  'fines': 'Fine and penalty charges',
  'printing': 'Print and lamination services',
  'stationery': 'Stationery items for sale',
  'donations': 'Accept donations from members',
  'other': 'Miscellaneous items',
  'books': 'Book-related items',

  // Category filters
  'tea': 'Filter to show tea items only',
  'coffee': 'Filter to show coffee items only',
  'juice': 'Filter to show juice items only',
  'bakery': 'Filter to show bakery items only',
  'snacks': 'Filter to show snack items only',

  // Status filters
  'available': 'Items currently in stock',
  'unavailable': 'Items currently out of stock',
  'completed': 'Orders that are done',
  'pending': 'Orders waiting to be processed',
  'low stock': 'Items running low on inventory',
  'out of stock': 'Items with zero inventory',

  // View toggles
  'grid': 'Show items in a grid layout',
  'list': 'Show items in a list layout',
};

function getSmartHint(el) {
  // Skip if element already has a visible tooltip showing
  if (el.dataset?.hintShown) return null;

  // Get text content
  let text = '';

  // Check for title first
  if (el.title) return el.title;

  // Check data-hint
  if (el.dataset?.hint) return el.dataset.hint;

  // Get the visible text
  text = (el.innerText || el.textContent || '').trim().toLowerCase();

  // Remove emojis and special chars for matching
  const cleanText = text.replace(/[^\w\s/+]/g, '').trim().toLowerCase();

  // Direct match
  if (SMART_HINTS[cleanText]) return SMART_HINTS[cleanText];

  // Partial match — check if any key is contained in the text
  for (const [key, hint] of Object.entries(SMART_HINTS)) {
    if (cleanText.includes(key) && cleanText.length < 30) return hint;
  }

  // For table headers, generate a hint
  if (el.tagName === 'TH') {
    const headerText = text.replace(/[^\w\s]/g, '').trim();
    if (headerText) return `Sort or view by ${headerText}`;
  }

  return null;
}

function isHintableElement(el) {
  const tag = el.tagName?.toLowerCase();
  if (!tag) return false;

  // Buttons
  if (tag === 'button') return true;

  // Links with text
  if (tag === 'a' && el.innerText?.trim()) return true;

  // Table headers
  if (tag === 'th') return true;

  // Elements with role=button or role=tab
  if (el.role === 'button' || el.role === 'tab') return true;

  // Elements with title or data-hint
  if (el.title || el.dataset?.hint) return true;

  // Clickable divs/spans that look like tabs/filters (have cursor:pointer)
  const cursor = window.getComputedStyle?.(el)?.cursor;
  if (cursor === 'pointer' && (tag === 'div' || tag === 'span') && el.innerText?.trim().length < 30) return true;

  return false;
}

export default function GlobalTooltip() {
  const [tooltip, setTooltip] = useState(null);
  const timerRef = useRef(null);
  const currentElRef = useRef(null);

  useEffect(() => {
    const enabled = () => {
      try { return localStorage.getItem('hints_enabled') !== 'false'; } catch { return true; }
    };

    const handleMouseEnter = (e) => {
      if (!enabled()) return;

      // Walk up to find hintable element
      let el = e.target;
      for (let i = 0; i < 4 && el && el !== document.body; i++) {
        if (isHintableElement(el)) {
          const hint = getSmartHint(el);
          if (hint && el !== currentElRef.current) {
            clearTimeout(timerRef.current);
            currentElRef.current = el;

            timerRef.current = setTimeout(() => {
              const rect = el.getBoundingClientRect();
              setTooltip({
                text: hint,
                x: rect.left + rect.width / 2,
                y: rect.top,
                w: rect.width,
              });
            }, 400); // 0.4 seconds
          }
          return;
        }
        el = el.parentElement;
      }
    };

    const handleMouseLeave = (e) => {
      let el = e.target;
      for (let i = 0; i < 4 && el && el !== document.body; i++) {
        if (el === currentElRef.current) {
          clearTimeout(timerRef.current);
          setTooltip(null);
          currentElRef.current = null;
          return;
        }
        el = el.parentElement;
      }
    };

    const handleClick = () => {
      clearTimeout(timerRef.current);
      setTooltip(null);
      currentElRef.current = null;
    };

    const handleScroll = () => {
      clearTimeout(timerRef.current);
      setTooltip(null);
    };

    document.addEventListener('mouseover', handleMouseEnter, true);
    document.addEventListener('mouseout', handleMouseLeave, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mouseover', handleMouseEnter, true);
      document.removeEventListener('mouseout', handleMouseLeave, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('scroll', handleScroll, true);
      clearTimeout(timerRef.current);
    };
  }, []);

  if (!tooltip) return null;

  // Position: directly above element, tight gap
  const left = Math.max(10, Math.min(tooltip.x, window.innerWidth - 130));
  const showBelow = tooltip.y < 45;
  const topPos = showBelow ? tooltip.y + 36 : tooltip.y - 4;

  return (
    <div style={{
      position: 'fixed',
      left: left,
      top: topPos,
      transform: showBelow ? 'translateX(-50%)' : 'translateX(-50%) translateY(-100%)',
      background: '#1a1a2e',
      color: '#e8ecf4',
      padding: '6px 12px',
      borderRadius: '6px',
      fontSize: '11px',
      lineHeight: '1.4',
      maxWidth: '220px',
      whiteSpace: 'normal',
      zIndex: 99999,
      pointerEvents: 'none',
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      border: '1px solid #2a3a5a',
      animation: 'ttIn 0.12s ease',
      textAlign: 'center',
    }}>
      <style>{`@keyframes ttIn{from{opacity:0}to{opacity:1}}`}</style>
      <div style={{
        position: 'absolute',
        [showBelow ? 'top' : 'bottom']: '-4px',
        left: '50%',
        transform: 'translateX(-50%) rotate(45deg)',
        width: '8px', height: '8px',
        background: '#1a1a2e',
        borderBottom: showBelow ? 'none' : '1px solid #2a3a5a',
        borderRight: showBelow ? 'none' : '1px solid #2a3a5a',
        borderTop: showBelow ? '1px solid #2a3a5a' : 'none',
        borderLeft: showBelow ? '1px solid #2a3a5a' : 'none',
      }} />
      {tooltip.text}
    </div>
  );
}
