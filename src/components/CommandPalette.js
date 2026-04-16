import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// =====================================================================
// CommandPalette (Cmd/Ctrl + K)
//
// Fuzzy-filter the 80-ish routes in this app and jump to any of them
// with a couple of keystrokes. Navigate with arrow keys, Enter to open,
// Esc to close. Stays completely client-side; no backing store.
// =====================================================================

// Kept separate from the sidebar nav so future routes only need to be
// added in one place here. Keywords help when the label doesn't match
// what people search for (e.g. "pos" → Cafe POS).
const COMMANDS = [
  { label: 'Dashboard',              path: '/',                     icon: '📊', keywords: 'home overview' },
  // Library
  { label: 'Books',                  path: '/books',                icon: '📚', keywords: 'library catalog' },
  { label: 'Borrow',                 path: '/borrow',               icon: '🔄', keywords: 'checkout lending' },
  { label: 'Overdue books',          path: '/overdue',              icon: '🔴', keywords: 'late return' },
  { label: 'Book availability',      path: '/availability',         icon: '🔍' },
  { label: 'Borrow statistics',      path: '/statistics',           icon: '📈' },
  { label: 'Recommendations',        path: '/recommendations',      icon: '💡' },
  { label: 'Wishlist',               path: '/wishlist',             icon: '📋' },
  { label: 'Reviews',                path: '/reviews',              icon: '⭐' },
  { label: 'Reservations',           path: '/reservations',         icon: '🔖' },
  { label: 'Library POS',            path: '/pos',                  icon: '🛒', keywords: 'sell books checkout' },
  { label: 'Barcodes',               path: '/barcodes',             icon: '🏷️' },
  // Cafe
  { label: 'Cafe menu & POS',        path: '/cafe/menu',            icon: '🍰', keywords: 'coffee food order' },
  { label: 'Cafe — manage menu',     path: '/cafe/manage',          icon: '📝' },
  { label: 'Cafe orders',            path: '/cafe/orders',          icon: '📋' },
  { label: 'Cafe reports',           path: '/cafe/reports',         icon: '📊' },
  // Members
  { label: 'Members',                path: '/members',              icon: '👥' },
  { label: 'Fines',                  path: '/fines',                icon: '💰' },
  // Store (Phase 5-6)
  { label: 'Online orders',          path: '/store/orders',         icon: '📦', keywords: 'customer order' },
  { label: 'Contact inbox',          path: '/store/inbox',          icon: '📨', keywords: 'form submissions messages' },
  { label: 'Newsletter subscribers', path: '/store/newsletter',     icon: '💌', keywords: 'emails list subscribers' },
  { label: 'Store analytics',        path: '/store/analytics',      icon: '📊', keywords: 'stats dashboard revenue' },
  { label: 'Edit website',           path: '/store/content',        icon: '🎨', keywords: 'site content blocks pages editor' },
  // Marketing
  { label: 'Marketing dashboard',    path: '/marketing-dashboard',  icon: '📣' },
  { label: 'Promo codes',            path: '/promo-codes',          icon: '🏷️' },
  { label: 'Loyalty & rewards',      path: '/loyalty',              icon: '🏆' },
  { label: 'Growth tools',           path: '/growth',               icon: '🌱' },
  { label: 'Campaigns',              path: '/campaigns',            icon: '📬' },
  { label: 'Automations',            path: '/automations',          icon: '⚙️' },
  { label: 'Engagement tools',       path: '/engagement',           icon: '💬' },
  { label: 'Newsletter (broadcast)', path: '/newsletter',           icon: '✉️' },
  { label: 'Communications',         path: '/communications',       icon: '📲' },
  { label: 'Community blog',         path: '/community',            icon: '📝' },
  { label: 'Marketing hub',          path: '/marketing-hub',        icon: '🎯' },
  // Accounts
  { label: 'Accounts overview',      path: '/accounts',             icon: '💼' },
  { label: 'Invoices',               path: '/accounts/invoices',    icon: '🧾' },
  { label: 'Expenses',               path: '/accounts/expenses',    icon: '📉' },
  { label: 'P&L',                    path: '/accounts/pnl',         icon: '💹' },
  { label: 'Transactions',           path: '/accounts/transactions', icon: '💳' },
  { label: 'Member payments',        path: '/accounts/members',     icon: '💸' },
  { label: 'Vendor payments',        path: '/accounts/vendors',     icon: '📤' },
  // Settings
  { label: 'Settings',               path: '/settings',             icon: '⚙️' },
  { label: 'Staff management',       path: '/settings/staff',       icon: '👤' },
  { label: 'Activity log',           path: '/settings/activity',    icon: '📜' },
  { label: 'Device manager',         path: '/settings/devices',     icon: '💻' },
  { label: 'Health check',           path: '/settings/health',      icon: '🩺' },
  { label: 'Integrations',           path: '/integrations',         icon: '🔌' },
  { label: 'Tasks',                  path: '/tasks',                icon: '✓' },
  // Inventory
  { label: 'Inventory — library',    path: '/inventory/library',    icon: '📦' },
  { label: 'Inventory — cafe',       path: '/inventory/cafe',       icon: '🥐' },
  { label: 'Purchase orders',        path: '/purchase-orders',      icon: '📋' },
  { label: 'Vendors',                path: '/vendors',              icon: '🏢' },
  // Events
  { label: 'Event listing',          path: '/events',               icon: '📅' },
  { label: 'Create event',           path: '/events/new',           icon: '➕' },
  { label: 'Event attendance',       path: '/events/attendance',    icon: '👥' },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();

  // Global hotkey
  useEffect(() => {
    const onKey = (e) => {
      const isCmd = e.metaKey || e.ctrlKey;
      if (isCmd && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen(o => !o);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Autofocus the input when the palette opens
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
    if (!open) { setQuery(''); setCursor(0); }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS.slice(0, 12);
    // Simple scoring: label startswith > label includes > keyword includes.
    const scored = [];
    for (const c of COMMANDS) {
      const label = c.label.toLowerCase();
      const kws = (c.keywords || '').toLowerCase();
      let score = 0;
      if (label.startsWith(q)) score = 100;
      else if (label.includes(q)) score = 60;
      else if (kws.includes(q)) score = 30;
      if (score > 0) scored.push({ ...c, _score: score });
    }
    return scored.sort((a, b) => b._score - a._score).slice(0, 14);
  }, [query]);

  // Keep cursor in range when filter changes
  useEffect(() => {
    if (cursor >= filtered.length) setCursor(0);
  }, [filtered.length, cursor]);

  // Scroll the cursor row into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[cursor];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const run = (cmd) => {
    if (!cmd) return;
    setOpen(false);
    navigate(cmd.path);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor(c => (c + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor(c => (c - 1 + Math.max(1, filtered.length)) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(filtered[cursor]);
    }
  };

  if (!open) return null;
  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(15,23,42,0.55)',
        backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '12vh', paddingLeft: '20px', paddingRight: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '560px',
          background: '#fff', borderRadius: '12px',
          boxShadow: '0 25px 80px rgba(0,0,0,0.35)',
          overflow: 'hidden',
          fontFamily: '-apple-system, system-ui, sans-serif',
        }}
      >
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <span style={{ fontSize: '18px' }}>⌘</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
            onKeyDown={onKeyDown}
            placeholder="Jump to…"
            style={{
              flex: 1, fontSize: '15px',
              border: 'none', outline: 'none',
              background: 'transparent', color: '#111827',
              fontFamily: 'inherit',
            }}
          />
          <kbd style={{
            fontSize: '11px', fontFamily: 'ui-monospace, monospace',
            padding: '2px 6px', background: '#f3f4f6',
            color: '#6b7280', borderRadius: '4px',
          }}>esc</kbd>
        </div>
        <div ref={listRef} style={{ maxHeight: '60vh', overflowY: 'auto', padding: '6px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
              No matches for "{query}"
            </div>
          ) : filtered.map((c, idx) => (
            <button
              key={c.path}
              onClick={() => run(c)}
              onMouseEnter={() => setCursor(idx)}
              style={{
                width: '100%', textAlign: 'left',
                padding: '10px 14px',
                background: idx === cursor ? '#eff6ff' : 'transparent',
                border: 'none', borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '12px',
                color: '#111827', fontSize: '14px',
              }}
            >
              <span style={{ fontSize: '18px' }}>{c.icon || '↗'}</span>
              <span style={{ flex: 1 }}>{c.label}</span>
              <span style={{
                fontSize: '11px', color: '#9ca3af',
                fontFamily: 'ui-monospace, monospace',
              }}>{c.path}</span>
            </button>
          ))}
        </div>
        <div style={{
          padding: '8px 14px', borderTop: '1px solid #e5e7eb',
          display: 'flex', gap: '14px', alignItems: 'center',
          fontSize: '11px', color: '#9ca3af',
          background: '#fafafa',
        }}>
          <span><kbd style={{ padding: '1px 5px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '3px', fontFamily: 'ui-monospace, monospace' }}>↑↓</kbd> navigate</span>
          <span><kbd style={{ padding: '1px 5px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '3px', fontFamily: 'ui-monospace, monospace' }}>↵</kbd> open</span>
          <span style={{ marginLeft: 'auto' }}>{filtered.length} {filtered.length === 1 ? 'match' : 'matches'}</span>
        </div>
      </div>
    </div>
  );
}
