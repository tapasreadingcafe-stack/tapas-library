import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const TOUR_STEPS = [
  { path: '/', target: '.db-metrics', title: '📊 Dashboard Overview', desc: 'Your daily snapshot — members, books, checkouts, revenue, overdue counts, and fines at a glance.', position: 'bottom' },
  { path: '/', target: '[data-tour="shift-notes"]', title: '📝 Shift Notes', desc: 'Leave notes for the next shift. Quick handoff messages visible to all staff.', position: 'left' },
  { path: '/books', target: '[data-tour="add-book"]', title: '📚 Add Books', desc: 'Add books by scanning ISBN barcode or entering details manually. Auto-fills from Google Books & Open Library.', position: 'bottom' },
  { path: '/books', target: '[data-tour="import-export"]', title: '📥 Import / Export', desc: 'Bulk import books from CSV or export your entire catalog for backup.', position: 'bottom' },
  { path: '/Borrow', target: '[data-tour="checkout-tab"]', title: '🔄 Checkout Books', desc: 'Search for a member, select a book, and check it out. Barcode scanning supported.', position: 'bottom' },
  { path: '/Borrow', target: '[data-tour="active-tab"]', title: '📖 Active Borrows', desc: 'View all currently checked-out books. Filter by overdue, due today, or due this week.', position: 'bottom' },
  { path: '/members', target: '[data-tour="add-member"]', title: '👥 Add Members', desc: 'Create member profiles with plans, borrow limits, and discounts. Supports family accounts.', position: 'bottom' },
  { path: '/members', target: '[data-tour="expiry-filter"]', title: '⚠️ Expiry Filters', desc: 'Quick filters to find expiring or expired memberships. Bulk renew multiple members at once.', position: 'bottom' },
  { path: '/overdue', target: '[data-tour="overdue-table"]', title: '🔴 Overdue Books', desc: 'Track all overdue books. Collect fines via Cash/Card/UPI, send email or WhatsApp reminders.', position: 'top' },
  { path: '/barcodes', target: '[data-tour="direct-print"]', title: '🖨️ Direct Print', desc: 'Print barcode labels directly to your Zebra thermal printer. Select copies and hit print.', position: 'bottom' },
  { path: '/barcodes', target: '[data-tour="template-select"]', title: '🏷️ Label Templates', desc: 'Choose a label template to control the layout. Design custom templates in the Template Editor.', position: 'bottom' },
  { path: '/cafe/menu', target: '.cafe-item-grid', title: '☕ Cafe POS', desc: 'Take cafe orders — tap items to add to cart, select payment method, print receipt.', position: 'right' },
  { path: '/pos', target: '[data-tour="pos-services"]', title: '🛒 Library POS', desc: 'Process memberships, fines, printing charges, and other services. Prices synced across all devices.', position: 'bottom' },
  { path: '/settings/app', target: '[data-tour="email-settings"]', title: '📧 Email & WhatsApp', desc: 'Configure Gmail SMTP for email notifications and WhatsApp for member reminders.', position: 'top' },
  { path: '/settings/app', target: '[data-tour="module-toggles"]', title: '⚙️ Module Toggles', desc: 'Enable or disable Cafe, Events, Marketing, and Online Store modules from the navigation.', position: 'top' },
];

const PAD = 10; // padding around spotlight

export default function AppTour({ active, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const timerRef = useRef(null);

  const currentStep = TOUR_STEPS[step] || {};

  // Find and position the target element
  const findTarget = useCallback(() => {
    if (!active) return;
    const el = document.querySelector(currentStep.target);
    if (el) {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });

      // Calculate tooltip position
      const tooltipW = 340;
      const tooltipH = 180;
      let top, left;
      const pos = currentStep.position || 'bottom';

      if (pos === 'bottom') {
        top = r.bottom + PAD + 8;
        left = Math.max(16, Math.min(r.left, window.innerWidth - tooltipW - 16));
      } else if (pos === 'top') {
        top = r.top - PAD - tooltipH - 8;
        left = Math.max(16, Math.min(r.left, window.innerWidth - tooltipW - 16));
      } else if (pos === 'left') {
        top = r.top;
        left = r.left - tooltipW - PAD - 8;
        if (left < 16) { left = r.right + PAD + 8; } // flip to right
      } else {
        top = r.top;
        left = r.right + PAD + 8;
      }

      // Keep within viewport
      if (top < 16) top = 16;
      if (top + tooltipH > window.innerHeight - 16) top = window.innerHeight - tooltipH - 16;
      if (left < 16) left = 16;

      setTooltipPos({ top, left });

      // Scroll element into view
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setRect(null);
    }
  }, [active, currentStep.target, currentStep.position]);

  // Navigate to correct page and find target after delay
  useEffect(() => {
    if (!active) return;
    if (location.pathname !== currentStep.path) {
      navigate(currentStep.path);
    }
    // Wait for page to render
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(findTarget, 600);
    return () => clearTimeout(timerRef.current);
  }, [active, step, location.pathname, currentStep.path, navigate, findTarget]);

  // Re-position on scroll/resize
  useEffect(() => {
    if (!active) return;
    const handler = () => findTarget();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [active, findTarget]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!active) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === 'Enter') goNext();
      if (e.key === 'ArrowLeft') goBack();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, step]);

  const goNext = () => {
    if (step < TOUR_STEPS.length - 1) setStep(step + 1);
    else onClose();
  };
  const goBack = () => { if (step > 0) setStep(step - 1); };
  const goSkip = () => onClose();

  if (!active) return null;

  const progress = ((step + 1) / TOUR_STEPS.length) * 100;

  return (
    <>
      {/* Dark overlay with spotlight cutout */}
      {rect ? (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            pointerEvents: 'none',
          }}
        >
          {/* Spotlight hole via box-shadow */}
          <div style={{
            position: 'fixed',
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            borderRadius: '10px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
            transition: 'all 0.3s ease',
            zIndex: 10001,
            pointerEvents: 'none',
          }} />

          {/* Pulsing border around target */}
          <div style={{
            position: 'fixed',
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            borderRadius: '10px',
            border: '2px solid #667eea',
            animation: 'tour-pulse 2s ease-in-out infinite',
            zIndex: 10002,
            pointerEvents: 'none',
          }} />
        </div>
      ) : (
        // Fallback: full dark overlay when target not found
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 10000 }} />
      )}

      {/* Click blocker (except for close) */}
      <div
        onClick={goNext}
        style={{ position: 'fixed', inset: 0, zIndex: 10003, cursor: 'pointer' }}
      />

      {/* Tooltip card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: rect ? tooltipPos.top : '50%',
          left: rect ? tooltipPos.left : '50%',
          transform: rect ? 'none' : 'translate(-50%, -50%)',
          width: '340px',
          background: '#fff',
          borderRadius: '14px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          zIndex: 10004,
          overflow: 'hidden',
          transition: 'top 0.3s, left 0.3s',
        }}
      >
        {/* Progress bar */}
        <div style={{ height: '4px', background: '#e0e0e0' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #667eea, #764ba2)', transition: 'width 0.3s' }} />
        </div>

        <div style={{ padding: '20px' }}>
          {/* Step counter */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#999', letterSpacing: '1px' }}>
              STEP {step + 1} OF {TOUR_STEPS.length}
            </span>
            <button onClick={goSkip} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#999', padding: '0', lineHeight: 1 }} title="Skip tour">×</button>
          </div>

          {/* Title */}
          <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700', color: '#333' }}>
            {currentStep.title}
          </h3>

          {/* Description */}
          <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#666', lineHeight: 1.6 }}>
            {currentStep.desc}
          </p>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
            <button
              onClick={goBack}
              disabled={step === 0}
              style={{
                padding: '8px 16px', border: '1px solid #ddd', borderRadius: '8px',
                background: '#f8f8f8', cursor: step === 0 ? 'default' : 'pointer',
                fontSize: '13px', fontWeight: '600', color: step === 0 ? '#ccc' : '#666',
                opacity: step === 0 ? 0.5 : 1,
              }}
            >
              ← Back
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={goSkip}
                style={{
                  padding: '8px 16px', border: 'none', borderRadius: '8px',
                  background: '#f0f0f0', cursor: 'pointer', fontSize: '13px',
                  fontWeight: '600', color: '#999',
                }}
              >
                Skip
              </button>
              <button
                onClick={goNext}
                style={{
                  padding: '8px 20px', border: 'none', borderRadius: '8px',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '700',
                }}
              >
                {step === TOUR_STEPS.length - 1 ? '✓ Finish' : 'Next →'}
              </button>
            </div>
          </div>

          {/* Step dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '14px' }}>
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                onClick={() => setStep(i)}
                style={{
                  width: i === step ? '16px' : '6px',
                  height: '6px',
                  borderRadius: '3px',
                  background: i < step ? '#27ae60' : i === step ? '#667eea' : '#ddd',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes tour-pulse {
          0%, 100% { border-color: rgba(102, 126, 234, 0.6); }
          50% { border-color: rgba(102, 126, 234, 1); box-shadow: 0 0 12px rgba(102, 126, 234, 0.3); }
        }
      `}</style>
    </>
  );
}
