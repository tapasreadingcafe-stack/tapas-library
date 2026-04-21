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

/* Click presets — one-shot. A delegated click listener in the Canvas
   sets data-tapas-click-playing which triggers the keyframe; an
   animationend listener removes it so the next click can re-fire. */
[data-tapas-click-anim][data-tapas-click-playing] {
  animation-name: var(--tapas-click-name, tapas-fade);
  animation-duration: var(--tapas-click-duration, 400ms);
  animation-timing-function: var(--tapas-click-easing, ease-out);
  animation-fill-mode: both;
}
[data-tapas-click-anim="fade"]        { --tapas-click-name: tapas-fade        }
[data-tapas-click-anim="slide-up"]    { --tapas-click-name: tapas-slide-up    }
[data-tapas-click-anim="slide-down"]  { --tapas-click-name: tapas-slide-down  }
[data-tapas-click-anim="slide-left"]  { --tapas-click-name: tapas-slide-left  }
[data-tapas-click-anim="slide-right"] { --tapas-click-name: tapas-slide-right }
[data-tapas-click-anim="zoom"]        { --tapas-click-name: tapas-zoom        }

/* Page-load presets — fires once when the page renders. Uses the
   same keyframes; the runtime adds data-tapas-load-in on mount. */
[data-tapas-load-anim]:not([data-tapas-load-in]) { opacity: 0; }
[data-tapas-load-anim][data-tapas-load-in] {
  animation-name: var(--tapas-load-name, tapas-fade);
  animation-duration: var(--tapas-load-duration, 600ms);
  animation-delay:    var(--tapas-load-delay, 0ms);
  animation-timing-function: var(--tapas-load-easing, ease-out);
  animation-fill-mode: both;
}
[data-tapas-load-anim="fade"]        { --tapas-load-name: tapas-fade        }
[data-tapas-load-anim="slide-up"]    { --tapas-load-name: tapas-slide-up    }
[data-tapas-load-anim="slide-down"]  { --tapas-load-name: tapas-slide-down  }
[data-tapas-load-anim="slide-left"]  { --tapas-load-name: tapas-slide-left  }
[data-tapas-load-anim="slide-right"] { --tapas-load-name: tapas-slide-right }
[data-tapas-load-anim="zoom"]        { --tapas-load-name: tapas-zoom        }

/* Navbar composite (Lane C1). Styling is intentionally minimal —
   users layer their own classes on top via the Style panel. These
   rules only solve what the class system can't express: the
   responsive-toggle relationship between the hamburger button and
   the menu list at narrow viewports. */
[data-tapas-navbar] {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 14px 22px;
  background: #fff;
  border-bottom: 1px solid rgba(0,0,0,0.08);
  position: relative;
}
[data-tapas-navbar] .tapas-navbar-brand {
  font-weight: 700;
  font-size: 18px;
}
[data-tapas-navbar] .tapas-navbar-menu {
  display: flex;
  list-style: none;
  margin: 0 0 0 auto;
  padding: 0;
  gap: 24px;
}
[data-tapas-navbar] .tapas-navbar-menu > li { margin: 0; padding: 0; }
[data-tapas-navbar] .tapas-navbar-link {
  text-decoration: none;
  color: inherit;
  font-size: 14px;
  line-height: 1.4;
}
[data-tapas-navbar] .tapas-navbar-toggle {
  display: none;
  margin-left: auto;
  background: transparent;
  border: 0;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  padding: 4px 8px;
  color: inherit;
}
@media (max-width: 767px) {
  [data-tapas-navbar] { flex-wrap: wrap; }
  [data-tapas-navbar] .tapas-navbar-toggle { display: block; }
  [data-tapas-navbar] .tapas-navbar-menu {
    display: none;
    width: 100%;
    flex-direction: column;
    order: 10;
    margin-left: 0;
    padding-top: 8px;
    gap: 10px;
  }
  [data-tapas-navbar][data-tapas-navbar-open] .tapas-navbar-menu {
    display: flex;
  }
}
`;

// Used by InteractionsPanel's dropdowns and Canvas's observer.
export const ANIM_PRESET_KEYS = ENTRANCE_PRESETS.map((p) => p.key);
export const HOVER_PRESET_KEYS = HOVER_PRESETS.map((p) => p.key);
