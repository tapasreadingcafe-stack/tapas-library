import React, { useEffect } from 'react';
import FilterSidebar from './FilterSidebar';

// Slide-in drawer used at tablet/mobile widths where the sidebar is
// hidden. Shares the actual control markup with FilterSidebar so the
// two can't drift.
export default function FilterDrawer({ open, onClose, filters, setFilters, categoryCounts }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    // Lock background scroll while the drawer is open so the sidebar
    // content scrolls independently on narrow screens.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <div className={`shop-drawer-root${open ? ' is-open' : ''}`} aria-hidden={!open}>
      <button
        type="button"
        className="shop-drawer-scrim"
        aria-label="Close filters"
        onClick={onClose}
        tabIndex={open ? 0 : -1}
      />
      <aside
        className="shop-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
      >
        <div className="shop-drawer-head">
          <h3>Filters</h3>
          <button
            type="button"
            className="shop-drawer-close"
            onClick={onClose}
            aria-label="Close filters"
          >
            ✕
          </button>
        </div>
        <div className="shop-drawer-body">
          <FilterSidebar filters={filters} setFilters={setFilters} categoryCounts={categoryCounts} />
        </div>
        <div className="shop-drawer-foot">
          <button type="button" className="shop-drawer-apply" onClick={onClose}>
            View results
          </button>
        </div>
      </aside>
    </div>
  );
}
