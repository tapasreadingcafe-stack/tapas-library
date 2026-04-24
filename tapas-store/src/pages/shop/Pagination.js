import React from 'react';

// Build the compact page-window used in the spec: first, last, a
// window of 4 around the current page, and "..." gaps where needed.
function buildPageWindow(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const out = [1];
  const start = Math.max(2, current - 1);
  const end   = Math.min(total - 1, current + 2);
  if (start > 2) out.push('gap-l');
  for (let p = start; p <= end; p++) out.push(p);
  if (end < total - 1) out.push('gap-r');
  out.push(total);
  return out;
}

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const window = buildPageWindow(page, totalPages);
  return (
    <nav className="shop-pag" aria-label="Shop pagination">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onChange(Math.max(1, page - 1))}
        aria-label="Previous page"
      >\u2039</button>
      {window.map((p, idx) => {
        if (p === 'gap-l' || p === 'gap-r') {
          return <span key={`${p}-${idx}`} className="shop-pag-gap" aria-hidden="true">â¦</span>;
        }
        return (
          <button
            key={p}
            type="button"
            className={p === page ? 'is-on' : ''}
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        );
      })}
      <button
        type="button"
        disabled={page === totalPages}
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        aria-label="Next page"
      >\u203A</button>
    </nav>
  );
}
