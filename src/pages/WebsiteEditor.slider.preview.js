// =====================================================================
// EditorSliderPreview — lightweight slider runtime for the editor
// canvas. Used only when staff clicks "Preview slider" in the
// Settings tab; otherwise the canvas shows all slides stacked so they
// stay editable inline.
//
// Mirrors the public-facing tapas-store/src/blocks/Slider.jsx minus
// tree-walking concerns: it receives pre-rendered React children
// (one per slide) and handles arrows, dots, autoplay, and swipe.
// Duplicating ~120 lines here is the pragmatic cost of the fact that
// the staff app and the storefront are separate CRA builds without a
// shared packages/ folder yet.
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

export default function EditorSliderPreview({ node, slides, className, dataAttrs }) {
  const attrs = node?.attributes || {};
  const autoplay   = PARSE_BOOL(attrs.autoplay);
  const loop       = PARSE_BOOL(attrs.loop ?? true);
  const showArrows = PARSE_BOOL(attrs.show_arrows ?? true);
  const showDots   = PARSE_BOOL(attrs.show_dots ?? true);
  const interval   = PARSE_INT(attrs.interval, 4500);
  const transition = attrs.transition === 'fade' ? 'fade' : 'slide';

  const count = slides.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const ptr = useRef(null);

  const go = useCallback((dir) => {
    setActive((i) => {
      const next = i + dir;
      if (next < 0) return loop ? count - 1 : 0;
      if (next >= count) return loop ? 0 : count - 1;
      return next;
    });
  }, [count, loop]);

  useEffect(() => {
    if (!autoplay || paused || count < 2) return undefined;
    const id = setInterval(() => go(1), interval);
    return () => clearInterval(id);
  }, [autoplay, paused, interval, go, count]);

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    ptr.current = { startX: e.clientX, dx: 0, active: true };
    setPaused(true);
  };
  const onPointerMove = (e) => {
    if (!ptr.current?.active) return;
    ptr.current.dx = e.clientX - ptr.current.startX;
  };
  const onPointerUp = () => {
    if (!ptr.current?.active) return;
    if (Math.abs(ptr.current.dx) > 40) go(ptr.current.dx < 0 ? 1 : -1);
    ptr.current.active = false;
    setPaused(false);
  };

  const trackStyle = useMemo(() => {
    if (transition === 'fade') return {};
    return {
      display: 'flex', width: '100%',
      transform: `translateX(-${active * 100}%)`,
      transition: 'transform 400ms cubic-bezier(0.22, 0.61, 0.36, 1)',
    };
  }, [active, transition]);

  if (count === 0) return <section className={className} {...dataAttrs} />;

  return (
    <section
      className={className}
      {...dataAttrs}
      data-tapas-slider=""
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ position: 'relative', overflow: 'hidden', touchAction: 'pan-y' }}
    >
      {transition === 'slide' ? (
        <div style={trackStyle}>
          {slides.map((child, i) => (
            <div key={i} style={{ flex: '0 0 100%', width: '100%' }}>{child}</div>
          ))}
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {slides.map((child, i) => (
            <div key={i} style={{
              position: i === active ? 'relative' : 'absolute',
              inset: 0,
              opacity: i === active ? 1 : 0,
              pointerEvents: i === active ? 'auto' : 'none',
              transition: 'opacity 500ms ease',
            }}>{child}</div>
          ))}
        </div>
      )}

      {showArrows && count > 1 && (
        <>
          <button
            type="button" onClick={() => go(-1)} aria-label="Previous slide"
            style={arrowStyle('left')}
          >‹</button>
          <button
            type="button" onClick={() => go(1)} aria-label="Next slide"
            style={arrowStyle('right')}
          >›</button>
        </>
      )}

      {showDots && count > 1 && (
        <div style={{
          position: 'absolute', bottom: '14px', left: 0, right: 0,
          display: 'flex', justifyContent: 'center', gap: '8px',
          pointerEvents: 'none',
        }}>
          {slides.map((_, i) => (
            <button
              key={i} onClick={() => setActive(i)}
              aria-label={`Go to slide ${i + 1}`}
              style={{
                width: '9px', height: '9px', padding: 0,
                borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: i === active ? '#fff' : 'rgba(255,255,255,0.5)',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.25)',
                pointerEvents: 'auto',
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function arrowStyle(side) {
  return {
    position: 'absolute',
    top: '50%', transform: 'translateY(-50%)',
    [side]: '12px',
    width: '36px', height: '36px', padding: 0,
    border: 'none', borderRadius: '50%',
    background: 'rgba(0,0,0,0.45)', color: '#fff',
    fontSize: '18px', fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 2,
  };
}
