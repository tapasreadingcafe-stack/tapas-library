import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// ── Tour follows exact NAV sidebar order ──
const TOUR_SECTIONS = [
  { section: 'Dashboard', icon: '📊', steps: [
    { path: '/', target: '.db-metrics', title: 'Key Metrics', desc: 'Total books, members, checkouts, overdue, fines, and revenue at a glance. Drag cards to reorder.' },
    { path: '/', target: '[data-tour="shift-notes"]', title: 'Shift Notes', desc: 'Leave notes for next shift staff. Click "+ Add Note". Latest 5 notes visible to everyone.' },
  ]},
  { section: 'Library', icon: '📖', steps: [
    { path: '/books', target: '[data-tour="add-book"]', title: 'Add Books', desc: 'Add by ISBN scan (auto-fills from Google Books) or manual entry. Supports bulk CSV import.' },
    { path: '/books', target: '[data-tour="import-export"]', title: 'Import / Export', desc: 'Bulk import books from CSV. Export catalog as backup. Great for initial setup.' },
    { path: '/Borrow', target: '[data-tour="checkout-tab"]', title: 'Checkout', desc: 'Search member → select book → confirm. Supports barcode scanning.' },
    { path: '/Borrow', target: '[data-tour="active-tab"]', title: 'Active Borrows', desc: 'All checked-out books. Filter: Overdue, Due Today, This Week, Due in 3 Days.' },
    { path: '/overdue', target: '[data-tour="overdue-table"]', title: 'Overdue Books', desc: 'Track overdue with fine amounts. Collect fines (Cash/Card/UPI/Waive). Send email or WhatsApp reminders.' },
    { path: '/availability', target: null, title: 'Availability Search', desc: 'Quick search to check if a specific book is available and see all copy statuses.' },
    { path: '/statistics', target: null, title: 'Statistics', desc: 'Visual charts — borrowing trends, popular categories, peak hours, reading patterns.' },
    { path: '/recommendations', target: null, title: 'Recommendations', desc: 'AI-powered book recommendations based on member borrowing history and preferences.' },
    { path: '/wishlist', target: null, title: 'Wishlist', desc: 'Track books members have requested. Helps with purchasing decisions.' },
    { path: '/reviews', target: null, title: 'Reviews', desc: 'Member book reviews and ratings. Helps other members discover great reads.' },
    { path: '/reservations', target: null, title: 'Reservations', desc: 'Reserve checked-out books. Auto-notifies next person via email & WhatsApp when returned (48h pickup).' },
    { path: '/pos', target: '[data-tour="pos-services"]', title: 'Library POS', desc: 'Memberships, fines, printing, stationery. Prices synced across all devices.' },
    { path: '/barcodes', target: '[data-tour="direct-print"]', title: 'Barcode Print', desc: 'Select copies → choose template → Direct Print to Zebra thermal printer.' },
    { path: '/barcodes', target: '[data-tour="template-select"]', title: 'Label Templates', desc: 'Choose saved templates. Design custom ones in Template Editor with drag & drop.' },
  ]},
  { section: 'Cafe', icon: '☕', steps: [
    { path: '/cafe/menu', target: '.cafe-item-grid', title: 'Cafe POS', desc: 'Tap items → add to cart → Walk-in or member → Cash/Card/UPI → print receipt.' },
    { path: '/cafe/manage', target: null, title: 'Manage Menu', desc: 'Add/edit menu items, prices, cost prices (for profit tracking), categories, availability.' },
    { path: '/cafe/orders', target: null, title: 'Order History', desc: 'View all cafe orders. Filter by date, search by customer.' },
    { path: '/cafe/reports', target: null, title: 'Cafe Reports', desc: 'Daily/weekly/monthly cafe revenue, top items, peak hours.' },
  ]},
  { section: 'Members', icon: '👥', steps: [
    { path: '/members', target: '[data-tour="add-member"]', title: 'Add Member', desc: 'Create profiles with plans (Basic/Premium/Family/Student), borrow limits, discounts.' },
    { path: '/members', target: '[data-tour="expiry-filter"]', title: 'Renewals', desc: 'Filter expiring/expired → Bulk Renew. Send email or WhatsApp renewal reminders.' },
    { path: '/fines', target: null, title: 'Fines Dashboard', desc: 'Outstanding, collected, waived fines. Export as CSV. Configure rate & grace in Settings.' },
  ]},
  { section: 'Inventory', icon: '📦', steps: [
    { path: '/inventory/library', target: null, title: 'Library Stock', desc: 'Physical book inventory — total, low stock, out-of-stock. What needs restocking.' },
    { path: '/inventory/cafe', target: null, title: 'Cafe Stock', desc: 'Ingredients & supplies. Auto-deducts on POS orders. Low stock warnings.' },
  ]},
  { section: 'Events', icon: '🎉', steps: [
    { path: '/events', target: null, title: 'All Events', desc: 'Story time, book clubs, author visits. Registrations, capacity, tickets.' },
    { path: '/events/create', target: null, title: 'Create Event', desc: 'One-time or recurring. Set capacity, pricing, waitlist, location.' },
    { path: '/events/attendance', target: null, title: 'Attendance', desc: 'Track event check-ins. See who showed up vs registered.' },
  ]},
  { section: 'Reports', icon: '📑', steps: [
    { path: '/reports', target: null, title: 'Reports', desc: 'Revenue trends, top books, member activity, overdue tracking, expiring memberships.' },
  ]},
  { section: 'Online Store', icon: '🛒', steps: [
    { path: '/store/orders', target: null, title: 'Online Orders', desc: 'View and manage orders placed through your online store. Track order status and fulfillment.' },
  ]},
  { section: 'Marketing', icon: '📣', steps: [
    { path: '/marketing-dashboard', target: null, title: 'Marketing Overview', desc: 'Dashboard showing campaign performance, member engagement, promo code usage, and growth metrics.' },
    { path: '/promo-codes', target: null, title: 'Promo Codes', desc: 'Create discount codes for memberships and services. Set usage limits and expiry dates.' },
    { path: '/loyalty', target: null, title: 'Loyalty & Rewards', desc: 'Points-based loyalty system. Members earn points on borrows and purchases, redeem for rewards.' },
    { path: '/campaigns', target: null, title: 'Campaigns', desc: 'Create email/WhatsApp campaigns to engage members. Schedule and track performance.' },
    { path: '/automations', target: null, title: 'Automations', desc: 'Set up automated triggers — welcome emails, birthday wishes, inactivity follow-ups.' },
    { path: '/newsletter', target: null, title: 'Newsletter', desc: 'Send newsletters to all members. New arrivals, events, reading recommendations.' },
  ]},
  { section: 'Tasks', icon: '📒', steps: [
    { path: '/tasks', target: null, title: 'Tasks & Notes', desc: 'Personal and team notes. Kanban-style task board for library operations and planning.' },
  ]},
  { section: 'Accounts', icon: '💳', steps: [
    { path: '/accounts/overview', target: null, title: 'Financial Overview', desc: 'Total revenue, expenses, profit. All income streams in one view.' },
    { path: '/accounts/pnl', target: null, title: 'P&L Statement', desc: 'Income breakdown, expense categories, GST, cafe COGS. Compare periods.' },
    { path: '/accounts/transactions', target: null, title: 'Transactions', desc: 'All financial transactions — sales, fines, memberships, cafe orders.' },
    { path: '/accounts/invoices', target: null, title: 'Invoices', desc: 'Generate and manage invoices for members and vendors.' },
    { path: '/accounts/expenses', target: null, title: 'Expenses', desc: 'Track all business expenses — rent, utilities, supplies, salaries.' },
  ]},
  { section: 'Staff', icon: '👤', steps: [
    { path: '/staff', target: null, title: 'Staff Management', desc: 'Add accounts, set roles (Admin/Staff), granular per-module permissions.' },
  ]},
  { section: 'Vendors', icon: '🏪', steps: [
    { path: '/vendors', target: null, title: 'Vendor List', desc: 'Manage book suppliers and cafe vendors. Track contact details and purchase history.' },
    { path: '/vendors/orders', target: null, title: 'Purchase Orders', desc: 'Create and track purchase orders to vendors for restocking books and supplies.' },
  ]},
  { section: 'Settings', icon: '⚙️', steps: [
    { path: '/settings/health', target: null, title: 'System Health', desc: 'Check database status, table health, and run setup migrations if needed.' },
    // App Config — follows exact top-to-bottom order of the settings page
    { path: '/settings/app', target: '[data-tour="setting-library-name"]', title: '1. Library Name', desc: 'Your library/cafe name. Used in emails, receipts, barcode labels, and the public catalog.' },
    { path: '/settings/app', target: '[data-tour="setting-fine-rate"]', title: '2. Fine Rate Per Day', desc: 'How much to charge per day when a book is overdue. Example: ₹10/day means 5 days late = ₹50 fine.' },
    { path: '/settings/app', target: '[data-tour="setting-loan-days"]', title: '3. Default Loan Period', desc: 'How many days members can keep a book. Set to 14 = 2 weeks. Can be different per plan.' },
    { path: '/settings/app', target: '[data-tour="module-toggles"]', title: '4. Module Toggles', desc: 'Turn ON/OFF: Cafe, Events, Marketing, Online Store. Disabled modules disappear from sidebar for everyone.' },
    { path: '/settings/app', target: '[data-tour="setting-grace-period"]', title: '5. Grace Period', desc: 'Free days after due date before fine starts. Grace = 3 means no fine for first 3 late days.' },
    { path: '/settings/app', target: '[data-tour="email-settings"]', title: '6. Email Notifications', desc: 'Enable email → enter Gmail address + App Password. Sends overdue reminders, expiry alerts, fine notifications.' },
    { path: '/settings/app', target: '[data-tour="setting-email-toggle"]', title: '7. Email Toggle', desc: 'This switch turns email notifications ON or OFF globally. When OFF, no emails are sent from the system.' },
    { path: '/settings/app', target: '[data-tour="whatsapp-settings"]', title: '8. WhatsApp Setup', desc: '"wa.me Link" = free, staff clicks to open WhatsApp. "Business API" = auto-send, needs Meta account + API token.' },
    // Other settings pages
    { path: '/settings/profile', target: null, title: 'Your Profile', desc: 'Update your name, avatar, and change password. Personal settings for your staff account.' },
    { path: '/settings/activity', target: null, title: 'Activity Log', desc: 'Full audit trail — who did what, when. Every checkout, return, fine, edit, and login is logged.' },
    { path: '/settings/devices', target: null, title: 'Devices', desc: 'Connect barcode scanners (USB/Bluetooth), receipt printers, and Zebra label printers. Test each device.' },
    { path: '/catalog', target: null, title: 'Public Catalog', desc: 'Your public book catalog. Members can browse, search, and see availability online.' },
    { path: '/kiosk', target: null, title: 'Kiosk Mode', desc: 'Self-service tablet. Members search by name/phone, view their borrows, return books — no staff needed.' },
    { path: '/settings/app', target: null, title: '🎉 Tour Complete!', desc: 'You\'ve seen everything! Restart anytime: Settings → "Start Interactive Tour". Happy managing!' },
  ]},
];

const ALL_STEPS = [];
const SECTION_INDICES = [];
TOUR_SECTIONS.forEach(sec => {
  SECTION_INDICES.push(ALL_STEPS.length);
  sec.steps.forEach(s => ALL_STEPS.push({ ...s, sectionName: sec.section, sectionIcon: sec.icon }));
});

const PAD = 10;

export default function AppTour({ active, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 100, left: 100 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const timerRef = useRef(null);

  const current = ALL_STEPS[step] || {};
  const secIdx = SECTION_INDICES.findIndex((si, i) => step >= si && step < (SECTION_INDICES[i + 1] ?? ALL_STEPS.length));
  const secStart = SECTION_INDICES[secIdx] || 0;
  const secEnd = SECTION_INDICES[secIdx + 1] ?? ALL_STEPS.length;

  // Sidebar highlight
  useEffect(() => {
    if (!active) return;
    document.querySelectorAll('.tour-nav-highlight').forEach(el => el.classList.remove('tour-nav-highlight'));
    document.querySelectorAll('.sidebar-nav a, .sidebar-nav button').forEach(link => {
      if (link.getAttribute('href') === current.path) {
        link.classList.add('tour-nav-highlight');
        link.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
    return () => document.querySelectorAll('.tour-nav-highlight').forEach(el => el.classList.remove('tour-nav-highlight'));
  }, [active, step, current.path]);

  // Find target & position tooltip
  const findTarget = useCallback(() => {
    if (!active || !current.target) { setRect(null); return; }
    const el = document.querySelector(current.target);
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      if (dragging) return; // don't reposition if user is dragging
      const tw = 370, th = 260;
      let t, l;
      if (r.top - PAD > th + 20) { t = r.top - PAD - th - 12; l = Math.max(16, Math.min(r.left, window.innerWidth - tw - 16)); }
      else if (window.innerHeight - r.bottom - PAD > th + 20) { t = r.bottom + PAD + 12; l = Math.max(16, Math.min(r.left, window.innerWidth - tw - 16)); }
      else { t = Math.max(16, r.top); l = r.right + PAD + 12; if (l + tw > window.innerWidth - 16) l = r.left - tw - PAD - 12; }
      if (t < 16) t = 16; if (l < 16) l = 16;
      setTooltipPos({ top: t, left: l });
    }, 300);
  }, [active, current.target, dragging]);

  useEffect(() => {
    if (!active) return;
    if (location.pathname !== current.path) navigate(current.path);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(findTarget, 700);
    return () => clearTimeout(timerRef.current);
  }, [active, step, location.pathname, current.path, navigate, findTarget]);

  useEffect(() => {
    if (!active) return;
    const h = () => findTarget();
    window.addEventListener('resize', h);
    window.addEventListener('scroll', h, true);
    return () => { window.removeEventListener('resize', h); window.removeEventListener('scroll', h, true); };
  }, [active, findTarget]);

  // Keyboard
  useEffect(() => {
    if (!active) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight' || e.key === 'Enter') goNext(); if (e.key === 'ArrowLeft') goBack(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  // Drag handlers
  const onDragStart = (e) => {
    setDragging(true);
    dragOffset.current = { x: e.clientX - tooltipPos.left, y: e.clientY - tooltipPos.top };
  };
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => setTooltipPos({ top: e.clientY - dragOffset.current.y, left: e.clientX - dragOffset.current.x });
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging]);

  const goNext = () => { if (step < ALL_STEPS.length - 1) setStep(step + 1); else onClose(); };
  const goBack = () => { if (step > 0) setStep(step - 1); };
  const goSkip = () => { const n = SECTION_INDICES.find(i => i > step); if (n !== undefined) setStep(n); else onClose(); };

  if (!active) return null;
  const progress = ((step + 1) / ALL_STEPS.length) * 100;

  return (
    <>
      {/* Overlay */}
      {rect ? (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, pointerEvents: 'none' }}>
          <div style={{ position: 'fixed', top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2, borderRadius: '10px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)', transition: 'all 0.3s', zIndex: 10001, pointerEvents: 'none' }} />
          <div style={{ position: 'fixed', top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2, borderRadius: '10px', border: '2px solid #667eea', animation: 'tour-pulse 2s infinite', zIndex: 10002, pointerEvents: 'none' }} />
        </div>
      ) : (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 10000 }} />
      )}

      <div onClick={goNext} style={{ position: 'fixed', inset: 0, zIndex: 10003, cursor: 'pointer' }} />

      {/* Tooltip — draggable */}
      <div onClick={e => e.stopPropagation()} style={{
        position: 'fixed', top: tooltipPos.top, left: tooltipPos.left,
        width: '370px', background: '#fff', borderRadius: '14px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.3)', zIndex: 10004,
        overflow: 'hidden', transition: dragging ? 'none' : 'top 0.3s, left 0.3s',
        userSelect: 'none',
      }}>
        {/* Drag handle + close button */}
        <div onMouseDown={onDragStart} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 14px 4px', cursor: 'grab', background: '#fafafa', borderBottom: '1px solid #f0f0f0',
        }}>
          <span style={{ fontSize: '10px', color: '#ccc', letterSpacing: '2px' }}>⠿⠿ DRAG TO MOVE</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#999', padding: '0 2px', lineHeight: 1 }} title="End tour">✕</button>
        </div>

        {/* Progress bar */}
        <div style={{ height: '3px', background: '#e8e8e8' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #667eea, #764ba2)', transition: 'width 0.3s' }} />
        </div>

        <div style={{ padding: '16px 20px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#667eea', background: '#f0f3ff', padding: '3px 10px', borderRadius: '10px' }}>
              {current.sectionIcon} {current.sectionName} ({step - secStart + 1}/{secEnd - secStart})
            </span>
            <span style={{ fontSize: '10px', color: '#bbb' }}>{step + 1}/{ALL_STEPS.length}</span>
          </div>

          <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: '700', color: '#222' }}>{current.title}</h3>
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#555', lineHeight: 1.65 }}>{current.desc}</p>

          <div style={{ display: 'flex', gap: '6px', justifyContent: 'space-between' }}>
            <button onClick={goBack} disabled={step === 0} style={{ padding: '7px 14px', border: '1px solid #e0e0e0', borderRadius: '7px', background: '#fafafa', cursor: step === 0 ? 'default' : 'pointer', fontSize: '12px', fontWeight: '600', color: step === 0 ? '#ccc' : '#666', opacity: step === 0 ? 0.5 : 1 }}>← Back</button>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={goSkip} style={{ padding: '7px 14px', border: 'none', borderRadius: '7px', background: '#f0f0f0', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: '#999' }}>Skip →</button>
              <button onClick={goNext} style={{ padding: '7px 18px', border: 'none', borderRadius: '7px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>{step === ALL_STEPS.length - 1 ? '✓ Finish' : 'Next →'}</button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', marginTop: '12px', flexWrap: 'wrap' }}>
            {TOUR_SECTIONS.map((sec, i) => (
              <button key={sec.section} onClick={() => setStep(SECTION_INDICES[i])} title={sec.section} style={{
                padding: '2px 5px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                fontSize: '9px', transition: 'all 0.2s',
                background: i === secIdx ? '#667eea' : i < secIdx ? '#d4edda' : '#f0f0f0',
                color: i === secIdx ? 'white' : i < secIdx ? '#155724' : '#aaa',
              }}>{sec.icon}</button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes tour-pulse { 0%,100%{border-color:rgba(102,126,234,0.5)} 50%{border-color:rgba(102,126,234,1);box-shadow:0 0 16px rgba(102,126,234,0.3)} }
        .tour-nav-highlight { background: rgba(102,126,234,0.15) !important; border-left: 3px solid #667eea !important; font-weight: 700 !important; }
      `}</style>
    </>
  );
}
