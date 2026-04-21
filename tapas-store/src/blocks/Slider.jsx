// =====================================================================
// Slider — storefront runtime for <slider> composite nodes (Phase F).
//
// Wraps a slider node's children in a swipeable carousel. Kept
// framework-free so the storefront bundle stays small:
//   * pure React + a few refs, no GSAP / swiper.js
//   * touch gestures via pointerdown/move/up (works on mouse too)
//   * keyboard ←/→ when focused
//   * autoplay with pause on hover / focus / touch
//
// Expected node shape (emitted by the editor):
//   { tag: 'slider',
//     attributes: { autoplay, interval, loop, show_arrows,
//                   show_dots, transition }
//     children: [ { tag: 'slide', ... }, ... ] }
//
// Each child is rendered through renderChild() — passed in so the
// storefront Node.jsx stays the only piece that knows how to walk
// the v2 tree (avoids a circular import between Node → Slider → Node).
// =====================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const PARSE_BOOL = (v) => {
  if (v === true || v === false) return v;
  const s = String(v ?? '').trim().toLowerCase();
  if (s === 'false' || s === '0' || s === '') return false;
  return true;
};
const PARSE_INT = (v, fallback) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export default function Slider({ node, renderChild, components }) {
  const attrs = node?.attributes || {};
  const autoplay    = PARSE_BOOL(attrs.autoplay);
  const loop        = PARSE_BOOL(attrs.loop ?? true);
  const showArrows  = PARSE_BOOL(attrs.show_arrows ?? true);
  const showDots    = PARSE_BOOL(attrs.show_dots ?? true);
  const interval    = PARSE_INT(attrs.interval, 4500);
  const transition  = attrs.transition === 'fade' ? 'fade' : 'slide';

  const slides = (node.children || []).filter(Boolean);
  const count = slides.length;

  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tabHidden, setTabHidden] = useState(
    typeof document !== 'undefined' && document.visibilityState === 'hidden'
  );
  const rootRef = useRef(null);
  const pointerRef = useRef(null); // { startX, startY, dx, dy, active }

  // Don't burn CPU on carousels in background tabs. Also helpful for
  // users on battery power: a tab with a visible slider wakes the GPU
  // every `interval` ms even when hidden.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onVis = () => setTabHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const go = useCallback((dir) => {
    setActive((i) => {
      const next = i + dir;
      if (next < 0) return loop ? count - 1 : 0;
      if (next >= count) return loop ? 0 : count - 1;
      return next;
    });
  }, [count, loop]);

  const jump = useCallback((i) => {
    if (i < 0 || i >= count) return;
    setActive(i);
  }, [count]);

  // Autoplay — paused while the user is hovering, focused, or mid-
  // swipe. rAF-based tick would smooth out resume but the 250ms
  // re-trigger from hover-off is imperceptible, so setInterval is
  // fine and avoids reinventing a scheduler.
  useEffect(() => {
    if (!autoplay || paused || tabHidden || count < 2) return undefined;
    const id = setInterval(() => go(1), interval);
    return () => clearInterval(id);
  }, [autoplay, paused, tabHidden, interval, go, count]);

  // Pointer swipe. We capture on pointerdown so the slider owns the
  // gesture even if the pointer leaves the element mid-drag. Threshold
  // is 40px or 25% of the rendered width, whichever is less — matches
  // what feels natural on mobile across screen sizes.
  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointerRef.current = {
      startX: e.clientX, startY: e.clientY,
      dx: 0, dy: 0, active: true,
    };
    setPaused(true);
  };
  const onPointerMove = (e) => {
    const p = pointerRef.current;
    if (!p?.active) return;
    p.dx = e.clientX - p.startX;
    p.dy = e.clientY - p.startY;
  };
  const onPointerUp = (e) => {
    const p = pointerRef.current;
    if (!p?.active) return;
    const rect = rootRef.current?.getBoundingClientRect();
    const width = rect?.width || 320;
    const threshold = Math.min(40, width * 0.25);
    const horizontal = Math.abs(p.dx) > Math.abs(p.dy);
    if (horizontal && Math.abs(p.dx) > threshold) {
      go(p.dx < 0 ? 1 : -1);
    }
    pointerRef.current.active = false;
    setPaused(false);
    try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch {}
  };

  // Keyboard ←/→ when the slider has focus. A focus outline isn't
  // visible by default because we don't add one — consistent with the
  // rest of the site's inline buttons.
  const onKeyDown = (e) => {
    if (count < 2) return;
    if (e.key === 'ArrowLeft')  { go(-1); e.preventDefault(); }
    if (e.key === 'ArrowRight') { go(1);  e.preventDefault(); }
  };

  const className = (node.classes || []).join(' ');

  // Track style — slide transition translates; fade transition fades
  // the active slide over the others via absolute positioning.
  const trackStyle = useMemo(() => {
    if (transition === 'fade') return {};
    return {
      display: 'flex', width: '100%', height: '100%',
      transform: `translateX(-${active * 100}%)`,
      transition: 'transform 400ms cubic-bezier(0.22, 0.61, 0.36, 1)',
    };
  }, [active, transition]);

  if (count === 0) {
    return <section className={className}>{null}</section>;
  }

  return (
    // No tabIndex on the section — the internal arrows + dots are
    // already keyboard-focusable buttons, so adding a tab stop here
    // would make screen readers announce "slider / slide 1 button /
    // slide 2 button / …" for every carousel on the page. Keyboard
    // ←/→ still works: onKeyDown fires whenever the active focus
    // lives inside the slider (event bubbles).
    <section
      ref={rootRef}
      className={className}
      data-tapas-slider=""
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ position: 'relative', overflow: 'hidden', outline: 'none', touchAction: 'pan-y' }}
    >
      {transition === 'slide' ? (
        <div style={trackStyle}>
          {slides.map((slide, i) => (
            <SlideFrame key={slide.id || i}>
              {renderChild(slide, { components })}
            </SlideFrame>
          ))}
        </div>
      ) : (
        <div style={{ position: 'relative', width: '100%' }}>
          {slides.map((slide, i) => (
            <div
              key={slide.id || i}
              style={{
                position: i === active ? 'relative' : 'absolute',
                inset: 0,
                opacity: i === active ? 1 : 0,
                pointerEvents: i === active ? 'auto' : 'none',
                transition: 'opacity 500ms ease',
              }}
            >
              {renderChild(slide, { components })}
            </div>
          ))}
        </div>
      )}

      {showArrows && count > 1 && (
        <>
          <Arrow direction="prev" onClick={() => go(-1)} />
          <Arrow direction="next" onClick={() => go(1)} />
        </>
      )}

      {showDots && count > 1 && (
        <div
          role="tablist"
          aria-label="Slide selector"
          style={{
            position: 'absolute', bottom: '14px', left: 0, right: 0,
            display: 'flex', justifyContent: 'center', gap: '8px',
            pointerEvents: 'none',
          }}
        >
          {slides.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === active}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => jump(i)}
              style={{
                width: '9px', height: '9px', padding: 0,
                borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: i === active ? '#fff' : 'rgba(255,255,255,0.5)',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.25)',
                pointerEvents: 'auto',
                transition: 'background 160ms ease',
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function SlideFrame({ children }) {
  return (
    <div style={{ flex: '0 0 100%', width: '100%' }}>
      {children}
    </div>
  );
}

function Arrow({ direction, onClick }) {
  const isPrev = direction === 'prev';
  return (
    <button
      type="button"
      aria-label={isPrev ? 'Previous slide' : 'Next slide'}
      onClick={onClick}
      style={{
        position: 'absolute',
        top: '50%', transform: 'translateY(-50%)',
        [isPrev ? 'left' : 'right']: '12px',
        width: '36px', height: '36px', padding: 0,
        border: 'none', borderRadius: '50%',
        background: 'rgba(0,0,0,0.45)', color: '#fff',
        fontSize: '18px', fontWeight: 600, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(2px)',
        zIndex: 2,
      }}
    >
      {isPrev ? '‹' : '›'}
    </button>
  );
}
