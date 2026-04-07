import React, { useState } from 'react';

// Hint descriptions for each sidebar nav item / feature
const HINTS = {
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
  return HINTS[path] || '';
}

export function isHintsEnabled() {
  try { return localStorage.getItem('hints_enabled') !== 'false'; } catch { return true; }
}

export function setHintsEnabled(val) {
  localStorage.setItem('hints_enabled', val ? 'true' : 'false');
}

export function HintBubble({ path, children }) {
  const [show, setShow] = useState(false);
  const hint = getHint(path);
  const enabled = isHintsEnabled();

  if (!enabled || !hint) return children;

  return (
    <div style={{ position: 'relative' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div style={{
          position: 'absolute', left: '100%', top: '50%', transform: 'translateY(-50%)',
          marginLeft: '8px', background: '#333', color: 'white', padding: '8px 12px',
          borderRadius: '6px', fontSize: '12px', lineHeight: '1.4', maxWidth: '220px',
          whiteSpace: 'normal', zIndex: 10000, boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          pointerEvents: 'none',
        }}>
          <div style={{ position: 'absolute', left: '-4px', top: '50%', transform: 'translateY(-50%) rotate(45deg)', width: '8px', height: '8px', background: '#333' }} />
          {hint}
        </div>
      )}
    </div>
  );
}
