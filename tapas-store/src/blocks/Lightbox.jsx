// =====================================================================
// Lightbox — storefront runtime for <lightbox> composite nodes
// (Phase F). The editor emits a wrapper node whose first child is the
// clickable image; at runtime we:
//   * render the trigger inline (the image)
//   * on click, portal a full-screen backdrop + full-size image into
//     document.body
//   * if multiple lightboxes share the same `group` attribute, the
//     modal gains prev/next arrows that walk the gallery
//
// Keyboard: Esc closes, ← / → page through the gallery. Click on the
// backdrop closes; click on the image does nothing (so a mis-tap
// doesn't bounce the user out).
// =====================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

// Registry — every mounted Lightbox registers itself under its
// `group` so open() knows the siblings to page through. Attached to
// window so CRA's hot-module-replace doesn't allocate a new Map on
// every save while stale entries from the previous module instance
// still live in the DOM. In production this is a plain singleton.
const GROUPS_KEY = '__tapasLightboxGroups';
const groups = (() => {
  if (typeof window === 'undefined') return new Map();
  if (!window[GROUPS_KEY]) window[GROUPS_KEY] = new Map();
  return window[GROUPS_KEY];
})();

function register(group, entry) {
  if (!group) return () => {};
  let set = groups.get(group);
  if (!set) { set = new Set(); groups.set(group, set); }
  set.add(entry);
  return () => {
    const s = groups.get(group);
    if (!s) return;
    s.delete(entry);
    if (s.size === 0) groups.delete(group);
  };
}

function siblingsOf(group) {
  if (!group) return [];
  const s = groups.get(group);
  return s ? Array.from(s) : [];
}

// Extract the first <img> in the subtree so the registry / modal can
// show it. Staff-authored lightboxes wrap a single image; gracefully
// falls through for richer wrappers (text overlays, badges).
function findFirstImageAttrs(node) {
  if (!node) return null;
  if (node.tag === 'img') {
    const a = node.attributes || {};
    return { src: a.src || '', alt: a.alt || '' };
  }
  for (const child of node.children || []) {
    const hit = findFirstImageAttrs(child);
    if (hit) return hit;
  }
  return null;
}

export default function Lightbox({ node, renderChild, components }) {
  const attrs = node?.attributes || {};
  const group = attrs.group || '';
  const className = (node.classes || []).join(' ');

  const imageAttrs = useMemo(() => findFirstImageAttrs(node), [node]);
  const entry = useMemo(
    () => ({ id: node.id, src: imageAttrs?.src || '', alt: imageAttrs?.alt || '' }),
    [node.id, imageAttrs?.src, imageAttrs?.alt]
  );

  useEffect(() => register(group, entry), [group, entry]);

  const [open, setOpen] = useState(false);
  // Index within the group when open. Defaults to this node's own
  // entry; ← / → update it.
  const [index, setIndex] = useState(0);

  const openWithThis = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const sibs = group ? siblingsOf(group) : [entry];
    const idx = Math.max(0, sibs.findIndex((s) => s.id === node.id));
    setIndex(idx === -1 ? 0 : idx);
    setOpen(true);
  };

  return (
    <>
      <span
        className={className}
        data-tapas-lightbox=""
        onClick={openWithThis}
        style={{ cursor: 'zoom-in', display: 'inline-block' }}
      >
        {(node.children || []).map((child, i) => (
          <React.Fragment key={child.id || i}>
            {renderChild(child, { components })}
          </React.Fragment>
        ))}
      </span>
      {open && (
        <LightboxModal
          group={group}
          index={index}
          setIndex={setIndex}
          onClose={() => setOpen(false)}
          fallback={entry}
        />
      )}
    </>
  );
}

function LightboxModal({ group, index, setIndex, onClose, fallback }) {
  const sibs = group ? siblingsOf(group) : [fallback];
  const count = sibs.length || 1;
  const current = sibs[index] || sibs[0] || fallback;
  const hasGallery = count > 1;

  const page = (dir) => {
    setIndex((i) => {
      const next = i + dir;
      if (next < 0) return count - 1;
      if (next >= count) return 0;
      return next;
    });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); e.stopPropagation(); return; }
      if (!hasGallery) return;
      if (e.key === 'ArrowLeft')  { page(-1); e.stopPropagation(); }
      if (e.key === 'ArrowRight') { page(1);  e.stopPropagation(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  // Lock body scroll while the modal is up — matches native <dialog>
  // behaviour without depending on it.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (typeof document === 'undefined') return null;

  const node = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={current?.alt || 'Image preview'}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 4000,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '4vh 4vw',
      }}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        style={{
          position: 'absolute', top: '16px', right: '16px',
          width: '36px', height: '36px',
          background: 'rgba(255,255,255,0.14)', color: '#fff',
          border: 'none', borderRadius: '50%',
          fontSize: '20px', cursor: 'pointer',
        }}
      >×</button>

      {hasGallery && (
        <button
          type="button"
          aria-label="Previous image"
          onClick={(e) => { e.stopPropagation(); page(-1); }}
          style={arrowStyle('left')}
        >‹</button>
      )}

      {current?.src ? (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <img
          src={current.src}
          alt={current.alt || ''}
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: '100%', maxHeight: '100%',
            objectFit: 'contain', display: 'block',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          }}
        />
      ) : (
        <div style={{ color: '#fff', fontFamily: 'ui-monospace, monospace' }}>
          No image found.
        </div>
      )}

      {hasGallery && (
        <button
          type="button"
          aria-label="Next image"
          onClick={(e) => { e.stopPropagation(); page(1); }}
          style={arrowStyle('right')}
        >›</button>
      )}

      {hasGallery && (
        <div style={{
          position: 'absolute', bottom: '18px', left: 0, right: 0,
          textAlign: 'center', color: '#fff',
          fontSize: '12px', letterSpacing: '0.05em',
          fontFamily: 'ui-monospace, monospace', opacity: 0.7,
        }}>
          {index + 1} / {count}
        </div>
      )}
    </div>
  );

  return createPortal(node, document.body);
}

function arrowStyle(side) {
  return {
    position: 'absolute',
    top: '50%', transform: 'translateY(-50%)',
    [side]: '18px',
    width: '48px', height: '48px', padding: 0,
    background: 'rgba(255,255,255,0.14)', color: '#fff',
    border: 'none', borderRadius: '50%',
    fontSize: '28px', cursor: 'pointer',
  };
}
