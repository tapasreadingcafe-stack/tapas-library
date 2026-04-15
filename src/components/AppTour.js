import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// ── Tour organized by SECTIONS (nav tabs) ──
// Each section has a name, icon, and steps within it
// "Skip" jumps to the next section
const TOUR_SECTIONS = [
  {
    section: 'Dashboard', icon: '📊',
    steps: [
      { path: '/', target: '.db-metrics', title: 'Key Metrics', desc: 'Your daily snapshot — total books, members, checkouts, overdue, fines, and revenue at a glance. Cards are draggable to reorder.', position: 'bottom' },
      { path: '/', target: '[data-tour="shift-notes"]', title: 'Shift Handoff Notes', desc: 'Leave notes for the next shift. Quick messages visible to all staff when they open the app.', position: 'left' },
      { path: '/', target: '.db-refresh', title: 'Send Daily Report', desc: 'Send yourself a morning email summary with all key metrics. Configure in Settings.', position: 'bottom' },
    ],
  },
  {
    section: 'Library', icon: '📖',
    steps: [
      { path: '/books', target: '[data-tour="add-book"]', title: 'Add Books', desc: 'Add books by scanning ISBN barcode or entering details manually. Auto-fills title, author, cover from Google Books & Open Library.', position: 'bottom' },
      { path: '/books', target: '[data-tour="import-export"]', title: 'Import / Export', desc: 'Bulk import books from CSV or export your entire catalog. Great for initial setup or backups.', position: 'bottom' },
      { path: '/Borrow', target: '[data-tour="checkout-tab"]', title: 'Checkout Books', desc: 'The main checkout flow — search member, select book, confirm. Supports barcode scanning for speed.', position: 'bottom' },
      { path: '/Borrow', target: '[data-tour="active-tab"]', title: 'Active Borrows', desc: 'View all currently checked-out books. Filter by overdue, due today, this week, or due in 3 days.', position: 'bottom' },
      { path: '/overdue', target: '[data-tour="overdue-table"]', title: 'Overdue Books', desc: 'Track overdue books with fine calculations. Collect fines via Cash/Card/UPI, send email or WhatsApp reminders.', position: 'top' },
      { path: '/reservations', target: null, title: 'Reservations', desc: 'Members can reserve checked-out books. When the book is returned, the next person in queue is notified automatically via email & WhatsApp.', position: 'bottom' },
      { path: '/barcodes', target: '[data-tour="direct-print"]', title: 'Direct Print Labels', desc: 'Print barcode labels directly to your Zebra thermal printer. Select copies, choose a template, and print.', position: 'bottom' },
      { path: '/barcodes', target: '[data-tour="template-select"]', title: 'Label Templates', desc: 'Choose from saved templates or design custom ones in the Template Editor. Controls layout, fonts, and pricing display.', position: 'bottom' },
      { path: '/pos', target: '[data-tour="pos-services"]', title: 'Library POS', desc: 'Process memberships, fines, printing charges, stationery, and custom services. Prices synced across all devices.', position: 'bottom' },
      { path: '/availability', target: null, title: 'Search Availability', desc: 'Quick search to check if a specific book is available. Shows all copies and their current status.', position: 'bottom' },
      { path: '/statistics', target: null, title: 'Library Statistics', desc: 'Visual charts showing borrowing trends, popular categories, peak hours, and reading patterns.', position: 'bottom' },
      { path: '/wishlist', target: null, title: 'Wishlist', desc: 'Track books that members have requested. Helps with purchasing decisions.', position: 'bottom' },
    ],
  },
  {
    section: 'Cafe', icon: '☕',
    steps: [
      { path: '/cafe/menu', target: '.cafe-item-grid', title: 'Cafe POS', desc: 'Take cafe orders — tap items to add to cart, search members or use Walk-in, select payment method, and print receipt.', position: 'right' },
      { path: '/cafe/manage', target: null, title: 'Manage Menu', desc: 'Add, edit, or remove menu items. Set prices, cost prices, categories, and availability. Controls what shows in the POS.', position: 'bottom' },
      { path: '/cafe/orders', target: null, title: 'Cafe Orders', desc: 'View all cafe order history. Filter by date, search by customer name, and see daily totals.', position: 'bottom' },
    ],
  },
  {
    section: 'Members', icon: '👥',
    steps: [
      { path: '/members', target: '[data-tour="add-member"]', title: 'Add Members', desc: 'Create member profiles with plans (Basic, Premium, Family, Student), borrow limits, and discounts.', position: 'bottom' },
      { path: '/members', target: '[data-tour="expiry-filter"]', title: 'Expiry Management', desc: 'Quick filters for expiring/expired memberships. Select multiple and Bulk Renew. Send email or WhatsApp renewal reminders.', position: 'bottom' },
      { path: '/fines', target: null, title: 'Fines Dashboard', desc: 'Track outstanding, collected, and waived fines. Fine rates and grace periods are configurable in Settings.', position: 'bottom' },
    ],
  },
  {
    section: 'Inventory', icon: '📦',
    steps: [
      { path: '/inventory/library', target: null, title: 'Library Stock', desc: 'Track physical inventory of books. Monitor stock levels, damaged items, and reorder needs.', position: 'bottom' },
      { path: '/inventory/cafe', target: null, title: 'Cafe Inventory', desc: 'Track cafe ingredients and supplies. Auto-deducts when orders are placed. Low stock warnings appear automatically.', position: 'bottom' },
    ],
  },
  {
    section: 'Events', icon: '🎉',
    steps: [
      { path: '/events', target: null, title: 'All Events', desc: 'View and manage all library events — story time, book clubs, author visits. See registrations and attendance.', position: 'bottom' },
      { path: '/events/create', target: null, title: 'Create Event', desc: 'Create one-time or recurring events. Set capacity, ticket pricing, waitlist, and location.', position: 'bottom' },
    ],
  },
  {
    section: 'Reports', icon: '📑',
    steps: [
      { path: '/reports', target: null, title: 'Reports & Analytics', desc: 'Revenue trends, top borrowed books, member activity, overdue tracking, and expiring subscriptions — all in one view.', position: 'bottom' },
    ],
  },
  {
    section: 'Accounts', icon: '💳',
    steps: [
      { path: '/accounts/overview', target: null, title: 'Financial Overview', desc: 'Total revenue, expenses, and profit at a glance. Tracks library sales, cafe sales, memberships, and fines.', position: 'bottom' },
      { path: '/accounts/pnl', target: null, title: 'Profit & Loss', desc: 'Detailed P&L statement with income categories, expense breakdown, GST calculations, and cafe cost of goods sold.', position: 'bottom' },
    ],
  },
  {
    section: 'Staff', icon: '👤',
    steps: [
      { path: '/staff', target: null, title: 'Staff Management', desc: 'Add staff accounts, set roles (Admin/Staff), and manage permissions per module. Reset passwords and track last login.', position: 'bottom' },
    ],
  },
  {
    section: 'Settings', icon: '⚙️',
    steps: [
      { path: '/settings/app', target: '[data-tour="module-toggles"]', title: 'Module Toggles', desc: 'Enable/disable Cafe, Events, Marketing, and Online Store modules. Hidden modules disappear from the navigation.', position: 'top' },
      { path: '/settings/app', target: '[data-tour="email-settings"]', title: 'Email Notifications', desc: 'Configure Gmail SMTP to send overdue reminders, membership expiry alerts, and fine notifications to members.', position: 'top' },
      { path: '/settings/devices', target: null, title: 'Devices', desc: 'Connect barcode scanners, receipt printers, and label printers. Test device connectivity.', position: 'bottom' },
      { path: '/kiosk', target: null, title: 'Kiosk Mode', desc: 'Self-service mode — put a tablet at the counter. Members can search themselves, view borrows, and return books.', position: 'bottom' },
    ],
  },
];

// Flatten steps with section info
const ALL_STEPS = [];
const SECTION_INDICES = []; // index of first step in each section
TOUR_SECTIONS.forEach(sec => {
  SECTION_INDICES.push(ALL_STEPS.length);
  sec.steps.forEach(step => {
    ALL_STEPS.push({ ...step, sectionName: sec.section, sectionIcon: sec.icon });
  });
});

const PAD = 10;

export default function AppTour({ active, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const timerRef = useRef(null);

  const current = ALL_STEPS[step] || {};
  const currentSectionIdx = SECTION_INDICES.findIndex((startIdx, i) => {
    const nextStart = SECTION_INDICES[i + 1] ?? ALL_STEPS.length;
    return step >= startIdx && step < nextStart;
  });

  // Find and position the target element
  const findTarget = useCallback(() => {
    if (!active || !current.target) { setRect(null); return; }
    const el = document.querySelector(current.target);
    if (el) {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      const tooltipW = 360, tooltipH = 220;
      let top, left;
      const pos = current.position || 'bottom';
      if (pos === 'bottom') { top = r.bottom + PAD + 8; left = Math.max(16, Math.min(r.left, window.innerWidth - tooltipW - 16)); }
      else if (pos === 'top') { top = r.top - PAD - tooltipH - 8; left = Math.max(16, Math.min(r.left, window.innerWidth - tooltipW - 16)); }
      else if (pos === 'left') { top = r.top; left = r.left - tooltipW - PAD - 8; if (left < 16) left = r.right + PAD + 8; }
      else { top = r.top; left = r.right + PAD + 8; }
      if (top < 16) top = 16;
      if (top + tooltipH > window.innerHeight - 16) top = window.innerHeight - tooltipH - 16;
      if (left < 16) left = 16;
      if (left + tooltipW > window.innerWidth - 16) left = window.innerWidth - tooltipW - 16;
      setTooltipPos({ top, left });
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setRect(null);
    }
  }, [active, current.target, current.position]);

  useEffect(() => {
    if (!active) return;
    if (location.pathname !== current.path) navigate(current.path);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(findTarget, 700);
    return () => clearTimeout(timerRef.current);
  }, [active, step, location.pathname, current.path, navigate, findTarget]);

  useEffect(() => {
    if (!active) return;
    const handler = () => findTarget();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => { window.removeEventListener('resize', handler); window.removeEventListener('scroll', handler, true); };
  }, [active, findTarget]);

  useEffect(() => {
    if (!active) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === 'Enter') goNext();
      if (e.key === 'ArrowLeft') goBack();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const goNext = () => { if (step < ALL_STEPS.length - 1) setStep(step + 1); else onClose(); };
  const goBack = () => { if (step > 0) setStep(step - 1); };
  // Skip = jump to next section
  const goSkip = () => {
    const nextSec = SECTION_INDICES.find(idx => idx > step);
    if (nextSec !== undefined) setStep(nextSec);
    else onClose();
  };

  if (!active) return null;

  const progress = ((step + 1) / ALL_STEPS.length) * 100;
  const sectionProgress = currentSectionIdx >= 0
    ? `${current.sectionIcon} ${current.sectionName}`
    : '';

  return (
    <>
      {/* Overlay + spotlight */}
      {rect ? (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, pointerEvents: 'none' }}>
          <div style={{
            position: 'fixed', top: rect.top - PAD, left: rect.left - PAD,
            width: rect.width + PAD * 2, height: rect.height + PAD * 2,
            borderRadius: '10px', boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
            transition: 'all 0.35s ease', zIndex: 10001, pointerEvents: 'none',
          }} />
          <div style={{
            position: 'fixed', top: rect.top - PAD, left: rect.left - PAD,
            width: rect.width + PAD * 2, height: rect.height + PAD * 2,
            borderRadius: '10px', border: '2px solid #667eea',
            animation: 'tour-pulse 2s ease-in-out infinite',
            zIndex: 10002, pointerEvents: 'none',
          }} />
        </div>
      ) : (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10000 }} />
      )}

      {/* Click blocker */}
      <div onClick={goNext} style={{ position: 'fixed', inset: 0, zIndex: 10003, cursor: 'pointer' }} />

      {/* Tooltip card */}
      <div onClick={e => e.stopPropagation()} style={{
        position: 'fixed',
        top: rect ? tooltipPos.top : '50%',
        left: rect ? tooltipPos.left : '50%',
        transform: rect ? 'none' : 'translate(-50%, -50%)',
        width: '360px', background: '#fff', borderRadius: '14px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.3)', zIndex: 10004,
        overflow: 'hidden', transition: 'top 0.35s, left 0.35s',
      }}>
        {/* Progress bar */}
        <div style={{ height: '4px', background: '#e8e8e8' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #667eea, #764ba2)', transition: 'width 0.3s' }} />
        </div>

        <div style={{ padding: '20px 22px' }}>
          {/* Section badge + step counter */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#667eea', background: '#f0f3ff', padding: '3px 10px', borderRadius: '12px' }}>
              {sectionProgress}
            </span>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#bbb' }}>
              {step + 1} / {ALL_STEPS.length}
            </span>
          </div>

          {/* Title */}
          <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700', color: '#222' }}>
            {current.title}
          </h3>

          {/* Description */}
          <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#555', lineHeight: 1.65 }}>
            {current.desc}
          </p>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
            <button onClick={goBack} disabled={step === 0} style={{
              padding: '9px 16px', border: '1px solid #e0e0e0', borderRadius: '8px',
              background: '#fafafa', cursor: step === 0 ? 'default' : 'pointer',
              fontSize: '13px', fontWeight: '600', color: step === 0 ? '#ccc' : '#666',
              opacity: step === 0 ? 0.5 : 1,
            }}>← Back</button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={goSkip} style={{
                padding: '9px 16px', border: 'none', borderRadius: '8px',
                background: '#f5f5f5', cursor: 'pointer', fontSize: '13px',
                fontWeight: '600', color: '#999',
              }}>Skip Section →</button>
              <button onClick={goNext} style={{
                padding: '9px 22px', border: 'none', borderRadius: '8px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '700',
              }}>{step === ALL_STEPS.length - 1 ? '✓ Finish Tour' : 'Next →'}</button>
            </div>
          </div>

          {/* Section dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '16px', flexWrap: 'wrap' }}>
            {TOUR_SECTIONS.map((sec, i) => (
              <button key={sec.section} onClick={() => setStep(SECTION_INDICES[i])}
                title={sec.section}
                style={{
                  padding: '3px 8px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                  fontSize: '11px', fontWeight: '600', transition: 'all 0.2s',
                  background: i === currentSectionIdx ? '#667eea' : i < currentSectionIdx ? '#d4edda' : '#f0f0f0',
                  color: i === currentSectionIdx ? 'white' : i < currentSectionIdx ? '#155724' : '#999',
                }}>
                {sec.icon} {sec.section}
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes tour-pulse {
          0%, 100% { border-color: rgba(102, 126, 234, 0.5); }
          50% { border-color: rgba(102, 126, 234, 1); box-shadow: 0 0 16px rgba(102, 126, 234, 0.3); }
        }
      `}</style>
    </>
  );
}
