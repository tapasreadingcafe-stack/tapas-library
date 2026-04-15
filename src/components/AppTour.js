import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// ── Tour organized by SECTIONS — ordered by daily usage importance ──
// Sidebar auto-scrolls to highlight the matching nav item
const TOUR_SECTIONS = [
  {
    section: 'Dashboard', icon: '📊', navLabel: 'Dashboard',
    steps: [
      { path: '/', target: '.db-metrics', title: 'Your Daily Overview', desc: 'See everything at a glance — total books, members, active checkouts, overdue count, fines outstanding, and monthly revenue. Drag cards to reorder.', position: 'bottom' },
      { path: '/', target: '[data-tour="shift-notes"]', title: 'Shift Handoff Notes', desc: 'Leave notes for the next shift. Click "+ Add Note" to write a message. All staff see the latest 5 notes when they open the dashboard.', position: 'left' },
    ],
  },
  {
    section: 'Books', icon: '📚', navLabel: 'Books',
    steps: [
      { path: '/books', target: '[data-tour="add-book"]', title: 'Add a New Book', desc: 'Click here to add books. Enter ISBN and it auto-fills title, author, and cover image from Google Books & Open Library. Or enter details manually.', position: 'bottom' },
      { path: '/books', target: '[data-tour="import-export"]', title: 'Import / Export Books', desc: 'Bulk import hundreds of books from a CSV file. Or export your entire catalog as a backup. Great for initial library setup.', position: 'bottom' },
    ],
  },
  {
    section: 'Borrow & Return', icon: '🔄', navLabel: 'Borrow',
    steps: [
      { path: '/Borrow', target: '[data-tour="checkout-tab"]', title: 'Checkout a Book', desc: 'The main daily workflow — search for a member by name/phone, select a book, and check it out. Supports barcode scanning for fast operation.', position: 'bottom' },
      { path: '/Borrow', target: '[data-tour="active-tab"]', title: 'View Active Borrows', desc: 'See all currently checked-out books. Filter by: All, Overdue, Due Today, This Week, or Due in 3 Days. Click any row to return or renew.', position: 'bottom' },
    ],
  },
  {
    section: 'Overdue & Fines', icon: '⚠️', navLabel: 'Overdue',
    steps: [
      { path: '/overdue', target: '[data-tour="overdue-table"]', title: 'Track Overdue Books', desc: 'All overdue books listed with member name, days overdue, and fine amount. Fine respects your configured rate and grace period from Settings.', position: 'top' },
      { path: '/overdue', target: null, title: 'Collect Fines & Send Reminders', desc: 'Click "💰 Collect Fine" to record payment (Cash/Card/UPI/Waive). Click "📧 Remind" for email or "📱 WhatsApp" to send reminder directly.', position: 'bottom' },
      { path: '/fines', target: null, title: 'Fines Dashboard', desc: 'Full view of all outstanding, collected, and waived fines. Export as CSV for follow-up. Rate and grace period are configurable in Settings.', position: 'bottom' },
    ],
  },
  {
    section: 'Members', icon: '👥', navLabel: 'Members',
    steps: [
      { path: '/members', target: '[data-tour="add-member"]', title: 'Add New Member', desc: 'Create member profiles with name, phone, email, date of birth. Assign plans (Basic, Premium, Family, Student) with borrow limits and discounts.', position: 'bottom' },
      { path: '/members', target: '[data-tour="expiry-filter"]', title: 'Manage Renewals', desc: 'Quick filters: "Expiring This Week" and "Expired". Select multiple members → click "Bulk Renew". Send email or WhatsApp renewal reminders individually.', position: 'bottom' },
    ],
  },
  {
    section: 'Barcodes & Printing', icon: '🏷️', navLabel: 'Barcodes',
    steps: [
      { path: '/barcodes', target: '[data-tour="template-select"]', title: 'Choose Label Template', desc: 'Select a saved template from the dropdown. Templates control the layout — brand name, barcode size, title position, and price display mode.', position: 'bottom' },
      { path: '/barcodes', target: '[data-tour="direct-print"]', title: 'Print Barcode Labels', desc: 'Select book copies with checkboxes, then click "Direct Print" to send labels to your Zebra thermal printer. No browser print dialog needed.', position: 'bottom' },
      { path: '/barcodes/editor', target: null, title: 'Template Editor', desc: 'Design custom label templates by dragging elements — brand, barcode, title, price, copy code, lines, and rectangles. Save and use across the app.', position: 'bottom' },
    ],
  },
  {
    section: 'Library POS', icon: '🛒', navLabel: 'POS',
    steps: [
      { path: '/pos', target: '[data-tour="pos-services"]', title: 'Library Services POS', desc: 'Process memberships, fines, printing charges, lamination, stationery, and custom services. Prices are synced across all devices via database.', position: 'bottom' },
    ],
  },
  {
    section: 'Cafe', icon: '☕', navLabel: 'Cafe',
    steps: [
      { path: '/cafe/menu', target: '.cafe-item-grid', title: 'Cafe POS — Take Orders', desc: 'Tap menu items to add to cart. Use "🚶 Walk-in" for quick orders without member lookup. Choose Cash/Card/UPI and print receipt.', position: 'right' },
      { path: '/cafe/manage', target: null, title: 'Manage Cafe Menu', desc: 'Add, edit, or remove menu items. Set prices, cost prices (for profit tracking), categories, and toggle availability.', position: 'bottom' },
    ],
  },
  {
    section: 'Reservations', icon: '🔖', navLabel: 'Reservations',
    steps: [
      { path: '/reservations', target: null, title: 'Book Reservations', desc: 'Members can reserve books that are currently checked out. When the book is returned, the next person is auto-notified via email and WhatsApp with a 48-hour pickup window.', position: 'bottom' },
    ],
  },
  {
    section: 'Events', icon: '🎉', navLabel: 'Events',
    steps: [
      { path: '/events', target: null, title: 'Library Events', desc: 'Manage all events — story time, book clubs, author visits. Track registrations, capacity, and ticket sales. Supports recurring events (weekly/monthly).', position: 'bottom' },
      { path: '/events/create', target: null, title: 'Create New Event', desc: 'Set title, dates, location, capacity, and ticket pricing. Enable waitlist for popular events. Choose one-time or recurring schedule.', position: 'bottom' },
    ],
  },
  {
    section: 'Inventory', icon: '📦', navLabel: 'Inventory',
    steps: [
      { path: '/inventory/library', target: null, title: 'Library Book Stock', desc: 'Monitor physical inventory — total titles, low stock items, and out-of-stock books. Quick view of what needs restocking.', position: 'bottom' },
      { path: '/inventory/cafe', target: null, title: 'Cafe Inventory', desc: 'Track cafe ingredients and supplies. Stock auto-deducts when POS orders are placed. Low stock warnings appear in the Cafe POS.', position: 'bottom' },
    ],
  },
  {
    section: 'Reports', icon: '📑', navLabel: 'Reports',
    steps: [
      { path: '/reports', target: null, title: 'Reports & Analytics', desc: 'Revenue trends, top borrowed books, member activity, overdue tracking, and expiring memberships — all in one visual dashboard.', position: 'bottom' },
    ],
  },
  {
    section: 'Accounts', icon: '💳', navLabel: 'Accounts',
    steps: [
      { path: '/accounts/overview', target: null, title: 'Financial Overview', desc: 'Total revenue (library + cafe + memberships + fines), expenses, and net profit. Covers all income streams in one view.', position: 'bottom' },
      { path: '/accounts/pnl', target: null, title: 'Profit & Loss Statement', desc: 'Detailed P&L with income breakdown, expense categories, GST calculations, and cafe cost of goods sold. Compare with previous periods.', position: 'bottom' },
    ],
  },
  {
    section: 'Staff', icon: '👤', navLabel: 'Staff',
    steps: [
      { path: '/staff', target: null, title: 'Staff Management', desc: 'Add staff accounts (email + password). Set roles (Admin/Staff). Admins have full access. Staff permissions are granular — per module and per feature.', position: 'bottom' },
    ],
  },
  {
    section: 'Settings', icon: '⚙️', navLabel: 'Settings',
    steps: [
      { path: '/settings/app', target: '[data-tour="module-toggles"]', title: 'Module Toggles', desc: 'Enable or disable entire sections: Cafe, Events, Marketing, Online Store. Disabled modules disappear from the navigation for all staff.', position: 'top' },
      { path: '/settings/app', target: null, title: 'Fine Rates & Loan Period', desc: 'Set fine rate per day (₹), grace period (days before fine starts), max fine cap, and default loan period. Different rates for Student/Premium/Family plans.', position: 'bottom' },
      { path: '/settings/app', target: '[data-tour="email-settings"]', title: 'Email Notifications', desc: 'Configure Gmail SMTP: enter your Gmail address and App Password. Enable to send overdue reminders, membership expiry alerts, and fine notifications.', position: 'top' },
      { path: '/settings/app', target: '[data-tour="whatsapp-settings"]', title: 'WhatsApp Notifications', desc: 'Two modes: "wa.me Link" (free — opens WhatsApp with pre-filled message) or "Business API" (automated — requires Meta Business account and API token).', position: 'top' },
      { path: '/settings/app', target: null, title: 'Daily Morning Report', desc: 'Enable daily auto-report sent to your email at 8:30 AM. Shows: books due today, overdue count, outstanding fines, yesterday\'s revenue, expiring memberships.', position: 'bottom' },
      { path: '/settings/devices', target: null, title: 'Device Setup', desc: 'Connect barcode scanners (USB/Bluetooth), receipt printers, and Zebra label printers. Test each device to verify connectivity.', position: 'bottom' },
      { path: '/kiosk', target: null, title: 'Kiosk Mode (Self-Service)', desc: 'Put a tablet at the counter for self-service. Members search themselves by name/phone, view their borrowed books, and can return books — no staff needed.', position: 'bottom' },
      { path: '/settings/app', target: null, title: '🎉 Tour Complete!', desc: 'You\'ve seen all the features! Remember: you can always restart this tour from Settings → "Start Interactive Tour". Happy managing!', position: 'bottom' },
    ],
  },
];

// Flatten steps with section info
const ALL_STEPS = [];
const SECTION_INDICES = [];
TOUR_SECTIONS.forEach(sec => {
  SECTION_INDICES.push(ALL_STEPS.length);
  sec.steps.forEach(step => {
    ALL_STEPS.push({ ...step, sectionName: sec.section, sectionIcon: sec.icon, navLabel: sec.navLabel });
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

  // Highlight sidebar nav item matching current step
  useEffect(() => {
    if (!active) return;
    // Remove previous highlights
    document.querySelectorAll('.tour-nav-highlight').forEach(el => el.classList.remove('tour-nav-highlight'));

    // Find sidebar link matching current path and highlight it
    const sidebarLinks = document.querySelectorAll('.sidebar-nav a, .sidebar-nav button');
    sidebarLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === current.path) {
        link.classList.add('tour-nav-highlight');
        link.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });

    return () => {
      document.querySelectorAll('.tour-nav-highlight').forEach(el => el.classList.remove('tour-nav-highlight'));
    };
  }, [active, step, current.path]);

  // Find and position the target element
  const findTarget = useCallback(() => {
    if (!active || !current.target) { setRect(null); return; }
    const el = document.querySelector(current.target);
    if (el) {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      const tooltipW = 380, tooltipH = 260;
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
  const goSkip = () => {
    const nextSec = SECTION_INDICES.find(idx => idx > step);
    if (nextSec !== undefined) setStep(nextSec);
    else onClose();
  };

  if (!active) return null;

  const progress = ((step + 1) / ALL_STEPS.length) * 100;

  // Steps within current section
  const secStart = SECTION_INDICES[currentSectionIdx] || 0;
  const secEnd = SECTION_INDICES[currentSectionIdx + 1] ?? ALL_STEPS.length;
  const stepInSection = step - secStart + 1;
  const totalInSection = secEnd - secStart;

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

      <div onClick={goNext} style={{ position: 'fixed', inset: 0, zIndex: 10003, cursor: 'pointer' }} />

      {/* Tooltip card */}
      <div onClick={e => e.stopPropagation()} style={{
        position: 'fixed',
        top: rect ? tooltipPos.top : '50%',
        left: rect ? tooltipPos.left : '50%',
        transform: rect ? 'none' : 'translate(-50%, -50%)',
        width: '380px', background: '#fff', borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', zIndex: 10004,
        overflow: 'hidden', transition: 'top 0.35s, left 0.35s',
      }}>
        {/* Progress bar */}
        <div style={{ height: '4px', background: '#e8e8e8' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #667eea, #764ba2)', transition: 'width 0.3s' }} />
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Section badge + step counter */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#667eea', background: '#f0f3ff', padding: '4px 12px', borderRadius: '12px' }}>
              {current.sectionIcon} {current.sectionName} ({stepInSection}/{totalInSection})
            </span>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#bbb' }}>
              {step + 1} / {ALL_STEPS.length}
            </span>
          </div>

          <h3 style={{ margin: '0 0 10px', fontSize: '18px', fontWeight: '700', color: '#222' }}>{current.title}</h3>
          <p style={{ margin: '0 0 22px', fontSize: '14px', color: '#555', lineHeight: 1.7 }}>{current.desc}</p>

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
              }}>Skip →</button>
              <button onClick={goNext} style={{
                padding: '9px 22px', border: 'none', borderRadius: '8px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '700',
              }}>{step === ALL_STEPS.length - 1 ? '✓ Finish' : 'Next →'}</button>
            </div>
          </div>

          {/* Section pills */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '16px', flexWrap: 'wrap' }}>
            {TOUR_SECTIONS.map((sec, i) => (
              <button key={sec.section} onClick={() => setStep(SECTION_INDICES[i])}
                title={sec.section}
                style={{
                  padding: '2px 7px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontSize: '10px', fontWeight: '600', transition: 'all 0.2s',
                  background: i === currentSectionIdx ? '#667eea' : i < currentSectionIdx ? '#d4edda' : '#f0f0f0',
                  color: i === currentSectionIdx ? 'white' : i < currentSectionIdx ? '#155724' : '#aaa',
                }}>
                {sec.icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CSS for sidebar highlight + pulse animation */}
      <style>{`
        @keyframes tour-pulse {
          0%, 100% { border-color: rgba(102, 126, 234, 0.5); }
          50% { border-color: rgba(102, 126, 234, 1); box-shadow: 0 0 16px rgba(102, 126, 234, 0.3); }
        }
        .tour-nav-highlight {
          background: rgba(102, 126, 234, 0.15) !important;
          border-left: 3px solid #667eea !important;
          font-weight: 700 !important;
          transition: all 0.3s;
        }
      `}</style>
    </>
  );
}
