// =====================================================================
// Interaction presets + keyframes — Phase 8 MVP.
//
// The editor stores interactions as plain data-* attributes on the
// node (data-tapas-anim, data-tapas-hover, -duration, -delay, -easing).
// The Canvas injects ANIM_CSS as a <style> tag and an
// IntersectionObserver flips data-tapas-anim-in on visible elements
// so the scroll-in keyframes actually fire.
//
// Keeping presets declarative lets the InteractionsPanel render the
// picker from the same list, and lets the eventual storefront cutover
// use the exact same CSS.
// =====================================================================

// Scroll-in presets: element starts in the "from" state (opacity/
// transform), reverts to natural state when data-tapas-anim-in is set.
export const ENTRANCE_PRESETS = [
  { key: 'fade',        label: 'Fade',        desc: 'Opacity 0 → 1' },
  { key: 'slide-up',    label: 'Slide up',    desc: 'Rises into place' },
  { key: 'slide-down',  label: 'Slide down',  desc: 'Drops into place' },
  { key: 'slide-left',  label: 'Slide left',  desc: 'From the right' },
  { key: 'slide-right', label: 'Slide right', desc: 'From the left' },
  { key: 'zoom',        label: 'Zoom',        desc: 'Grows from 95%' },
];

export const HOVER_PRESETS = [
  { key: 'lift',  label: 'Lift',  desc: '4px up + subtle shadow' },
  { key: 'scale', label: 'Scale', desc: 'Grows to 1.04' },
  { key: 'glow',  label: 'Glow',  desc: 'Accent-colour ring' },
  { key: 'tilt',  label: 'Tilt',  desc: 'Slight 2° rotation' },
];

export const EASING_PRESETS = [
  { key: 'ease',        label: 'Ease' },
  { key: 'ease-in',     label: 'Ease in' },
  { key: 'ease-out',    label: 'Ease out' },
  { key: 'ease-in-out', label: 'Ease in-out' },
  { key: 'linear',      label: 'Linear' },
  { key: 'cubic-bezier(0.2, 0.9, 0.2, 1)', label: 'Standard' },
];

// ---------------------------------------------------------------------
// The CSS. One <style> injection covers all preset keyframes plus
// the hover rules. Variables (--tapas-anim-duration etc.) are written
// via setAttribute on the node in the editor (done here via inline
// style in the attribute compiler below).
// ---------------------------------------------------------------------
export const ANIM_CSS = `
@keyframes tapas-fade        { from { opacity: 0 } to { opacity: 1 } }
@keyframes tapas-slide-up    { from { opacity: 0; transform: translateY(24px)  } to { opacity: 1; transform: translateY(0)  } }
@keyframes tapas-slide-down  { from { opacity: 0; transform: translateY(-24px) } to { opacity: 1; transform: translateY(0)  } }
@keyframes tapas-slide-left  { from { opacity: 0; transform: translateX(24px)  } to { opacity: 1; transform: translateX(0)  } }
@keyframes tapas-slide-right { from { opacity: 0; transform: translateX(-24px) } to { opacity: 1; transform: translateX(0)  } }
@keyframes tapas-zoom        { from { opacity: 0; transform: scale(0.95)       } to { opacity: 1; transform: scale(1)       } }

/* Initial pre-animation state — element is invisible until the
   IntersectionObserver flips data-tapas-anim-in. */
[data-tapas-anim]:not([data-tapas-anim-in]) {
  opacity: 0;
}
[data-tapas-anim][data-tapas-anim-in] {
  animation-name: var(--tapas-anim-name, tapas-fade);
  animation-duration: var(--tapas-anim-duration, 600ms);
  animation-delay:    var(--tapas-anim-delay, 0ms);
  animation-timing-function: var(--tapas-anim-easing, ease-out);
  animation-fill-mode: both;
}
[data-tapas-anim="fade"]        { --tapas-anim-name: tapas-fade        }
[data-tapas-anim="slide-up"]    { --tapas-anim-name: tapas-slide-up    }
[data-tapas-anim="slide-down"]  { --tapas-anim-name: tapas-slide-down  }
[data-tapas-anim="slide-left"]  { --tapas-anim-name: tapas-slide-left  }
[data-tapas-anim="slide-right"] { --tapas-anim-name: tapas-slide-right }
[data-tapas-anim="zoom"]        { --tapas-anim-name: tapas-zoom        }

/* Hover presets — pure CSS, no observer needed. */
[data-tapas-hover]       { transition: transform 200ms ease, box-shadow 200ms ease; }
[data-tapas-hover="lift"]:hover  { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.12); }
[data-tapas-hover="scale"]:hover { transform: scale(1.04); }
[data-tapas-hover="glow"]:hover  { box-shadow: 0 0 0 3px rgba(20,110,245,0.35); }
[data-tapas-hover="tilt"]:hover  { transform: rotate(-2deg); }
`;

// Used by InteractionsPanel's dropdowns and Canvas's observer.
export const ANIM_PRESET_KEYS = ENTRANCE_PRESETS.map((p) => p.key);
export const HOVER_PRESET_KEYS = HOVER_PRESETS.map((p) => p.key);
