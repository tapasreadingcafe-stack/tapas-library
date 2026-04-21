// =====================================================================
// Timeline — Phase G multi-step interaction runtime.
//
// A `timeline` is an ordered array of steps. Each step targets a DOM
// element (self / a child by selector / any element with a given
// class), animates a single property (translateY, opacity, scale, …)
// and carries its own duration, delay, easing.
//
// compileTimeline() turns a step list + root element into a list of
// WAAPI Animations (one per step) so browser layering / composite
// behaviour does the right thing automatically. Returns a controller
// object with play / cancel / onFinish so callers can wire preview
// buttons, IntersectionObservers, or hover listeners on top.
//
// Pure JS (no React) so the same file powers the editor preview AND
// the eventual storefront runtime — duplicated to tapas-store/src/
// runtime/timeline.js because the two CRA bundles don't yet share a
// packages/ folder.
// =====================================================================

// Serialised shape stored on a node's data-tapas-timeline-<trigger>
// attribute. Kept narrow so the schema stays legible in saved JSON.
export const TIMELINE_PROPERTIES = [
  { key: 'translateY', label: 'Move Y',  unit: 'px',  defaults: { from: 40,  to: 0 } },
  { key: 'translateX', label: 'Move X',  unit: 'px',  defaults: { from: 40,  to: 0 } },
  { key: 'opacity',    label: 'Opacity', unit: '',    defaults: { from: 0,   to: 1 } },
  { key: 'scale',      label: 'Scale',   unit: '',    defaults: { from: 0.9, to: 1 } },
  { key: 'rotate',     label: 'Rotate',  unit: 'deg', defaults: { from: -6,  to: 0 } },
  { key: 'scaleX',     label: 'Scale X', unit: '',    defaults: { from: 0.9, to: 1 } },
  { key: 'scaleY',     label: 'Scale Y', unit: '',    defaults: { from: 0.9, to: 1 } },
];

export const TIMELINE_TARGETS = [
  { key: 'self',  label: 'Self (this element)' },
  { key: 'child', label: 'Child (CSS selector)' },
  { key: 'class', label: 'Any element with class' },
];

// Whether a step's rendered output goes into the CSS `transform` or
// `opacity` property — matters because browsers composite transforms
// additively, so we can layer several steps onto the same element.
function propertyChannel(prop) {
  return prop === 'opacity' ? 'opacity' : 'transform';
}

function formatValue(prop, raw, unit) {
  // Accept numbers or numeric strings — the editor inputs are text.
  const n = raw === '' || raw == null ? NaN : Number(raw);
  const v = Number.isFinite(n) ? n : raw;
  switch (prop) {
    case 'translateX': return `translateX(${v}${unit || 'px'})`;
    case 'translateY': return `translateY(${v}${unit || 'px'})`;
    case 'rotate':     return `rotate(${v}${unit || 'deg'})`;
    case 'scale':      return `scale(${v})`;
    case 'scaleX':     return `scaleX(${v})`;
    case 'scaleY':     return `scaleY(${v})`;
    case 'opacity':    return Number.isFinite(n) ? n : v;
    default:           return null;
  }
}

// Build the two-keyframe array WAAPI expects. For `transform`
// animations we use composite: 'add' at call time so multiple steps
// targeting the same element layer instead of clobbering each other.
function buildKeyframes(step) {
  const channel = propertyChannel(step.property);
  const unit = step.unit ?? '';
  const from = formatValue(step.property, step.from, unit);
  const to   = formatValue(step.property, step.to,   unit);
  if (from == null || to == null) return null;
  if (channel === 'opacity') {
    return [{ opacity: from }, { opacity: to }];
  }
  return [{ transform: from }, { transform: to }];
}

function resolveTarget(rootEl, target, value) {
  if (!rootEl) return null;
  if (!target || target === 'self') return rootEl;
  const v = (value || '').trim();
  if (!v) return null;
  try {
    if (target === 'child') return rootEl.querySelector(v);
    if (target === 'class') {
      const cls = v.startsWith('.') ? v : `.${v}`;
      return rootEl.querySelector(cls) || document.querySelector(cls);
    }
  } catch {
    return null;
  }
  return null;
}

// Main compile entry. Returns a controller exposing play() and
// cancel() so callers can trigger from observers / preview buttons
// without reimplementing lifecycle each time.
export function compileTimeline(steps, rootEl, opts = {}) {
  const validSteps = (Array.isArray(steps) ? steps : [])
    .filter((s) => s && s.property);

  const plan = [];
  for (const step of validSteps) {
    const el = resolveTarget(rootEl, step.target, step.targetValue);
    if (!el) continue;
    const keyframes = buildKeyframes(step);
    if (!keyframes) continue;
    plan.push({
      el,
      keyframes,
      options: {
        duration: Math.max(0, Number(step.duration) || 400),
        delay:    Math.max(0, Number(step.delay) || 0),
        easing:   step.easing || 'ease-out',
        fill:     'forwards',
        // Transforms layer additively via 'add'; opacity replaces so
        // the last step on the element wins (expected behaviour).
        composite: propertyChannel(step.property) === 'transform' ? 'add' : 'replace',
      },
    });
  }

  let live = [];
  const finishCallbacks = [];
  let playing = false;

  const controller = {
    get playing() { return playing; },
    play() {
      controller.cancel();
      playing = true;
      if (plan.length === 0) {
        finishCallbacks.forEach((cb) => cb());
        playing = false;
        return;
      }
      // Any single step with an invalid easing / keyframe should not
      // take down the whole timeline. If Element.animate() throws
      // (for example, easing="cubic-bezier(2, 0, 1, 1)" — out-of-
      // range y-coords), retry once with a conservative fallback so
      // staff still see the rest of the sequence play.
      live = plan.map(({ el, keyframes, options }) => {
        try {
          return el.animate(keyframes, options);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('Timeline step failed to animate, falling back to ease-out:', err);
          try {
            return el.animate(keyframes, { ...options, easing: 'ease-out' });
          } catch {
            // If even the fallback throws, return a dummy so the
            // longest-animation reducer below doesn't blow up.
            return { addEventListener() {}, cancel() {}, effect: null };
          }
        }
      });
      // When the longest animation finishes, flush callbacks.
      const longest = live.reduce((a, b) => {
        const aTime = (a.effect?.getTiming?.().duration || 0) + (a.effect?.getTiming?.().delay || 0);
        const bTime = (b.effect?.getTiming?.().duration || 0) + (b.effect?.getTiming?.().delay || 0);
        return bTime > aTime ? b : a;
      }, live[0]);
      const done = () => {
        playing = false;
        finishCallbacks.forEach((cb) => cb());
      };
      longest.addEventListener?.('finish', done, { once: true });
      longest.onfinish = longest.onfinish || done; // safety for older browsers
    },
    cancel() {
      for (const anim of live) {
        try { anim.cancel(); } catch { /* no-op */ }
      }
      live = [];
      playing = false;
    },
    onFinish(cb) {
      if (typeof cb === 'function') finishCallbacks.push(cb);
      return controller;
    },
    get length() { return plan.length; },
  };

  // Optional: when opts.resetToInitial is true, apply the `from` state
  // immediately by playing with duration 0 so the element doesn't flash
  // its final style before the observer kicks in.
  if (opts.resetToInitial && plan.length) {
    for (const { el, keyframes, options } of plan) {
      const anim = el.animate(
        [keyframes[0], keyframes[0]],
        { duration: 1, fill: 'forwards', composite: options.composite }
      );
      try { anim.finish(); } catch { /* no-op */ }
    }
  }

  return controller;
}

// Attribute helpers — the editor stores timelines as JSON strings on
// data-tapas-timeline-<trigger>. Serialise / parse in one place so
// typos can't drift between the editor and the runtime.
//
// Triggers split into two runtime families:
//   * "playback" triggers (scroll / load / click / hover) — fire
//     once per activation, use duration + delay + easing, driven by
//     compileTimeline() + WAAPI.
//   * "drive" triggers (scroll-drive / mouse) — continuously sampled
//     and interpolated against a 0..1 or -1..1 input, driven by
//     driveTimeline(). Property values are written to the target's
//     inline style every frame.
export const TIMELINE_TRIGGERS = ['scroll', 'load', 'click', 'hover', 'scroll-drive', 'mouse'];
export const DRIVE_TRIGGERS    = ['scroll-drive', 'mouse'];
export function isDriveTrigger(key) { return DRIVE_TRIGGERS.includes(key); }

export function timelineAttrName(trigger) {
  return `data-tapas-timeline-${trigger}`;
}

export function parseTimelineAttr(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function stringifyTimeline(steps) {
  if (!Array.isArray(steps) || steps.length === 0) return '';
  return JSON.stringify(steps);
}

// Factory for a brand-new step seeded with sensible defaults. Used by
// the "+ Add step" button in the InteractionsPanel. Accepts the
// active trigger so drive-mode steps start with the fields the UI
// actually uses (progress window for scroll-drive, axis for mouse).
export function makeStep({ property = 'translateY', trigger = 'scroll' } = {}) {
  const meta = TIMELINE_PROPERTIES.find((p) => p.key === property) || TIMELINE_PROPERTIES[0];
  const base = {
    id: 's_' + Math.random().toString(36).slice(2, 9),
    target: 'self',
    targetValue: '',
    property: meta.key,
    from: String(meta.defaults.from),
    to:   String(meta.defaults.to),
    unit: meta.unit,
  };
  if (trigger === 'scroll-drive') {
    return { ...base, fromProgress: '0', toProgress: '1' };
  }
  if (trigger === 'mouse') {
    return { ...base, axis: 'x' };
  }
  return { ...base, duration: 600, delay: 0, easing: 'ease-out' };
}

// ---------------------------------------------------------------------
// driveTimeline — continuous-input runtime for scroll-drive / mouse.
//
// steps[] is the same JSON shape, with these additions per trigger:
//   scroll-drive: { fromProgress, toProgress }   // 0..1 window
//   mouse:        { axis: 'x' | 'y' }             // input direction
//
// Returns a cleanup function the caller runs on unmount.
// ---------------------------------------------------------------------
function applyDriveProperty(el, property, rawVal, unit) {
  const num = Number(rawVal);
  if (property === 'opacity') {
    el.style.opacity = Number.isFinite(num) ? num : rawVal;
    return;
  }
  // Multiple transform-channel steps on the same element layer into
  // a single `transform` string. We scratch per-element so scroll
  // steps and mouse steps on the same target don't clobber each other.
  if (!el.__tapasDriveXform) el.__tapasDriveXform = {};
  const u = unit || (property === 'rotate' ? 'deg' : (property.startsWith('translate') ? 'px' : ''));
  const value = Number.isFinite(num) ? num : 0;
  let fragment;
  switch (property) {
    case 'translateX': fragment = `translateX(${value}${u})`; break;
    case 'translateY': fragment = `translateY(${value}${u})`; break;
    case 'rotate':     fragment = `rotate(${value}${u})`;     break;
    case 'scale':      fragment = `scale(${value || 1})`;     break;
    case 'scaleX':     fragment = `scaleX(${value || 1})`;    break;
    case 'scaleY':     fragment = `scaleY(${value || 1})`;    break;
    default:           return;
  }
  el.__tapasDriveXform[property] = fragment;
  el.style.transform = Object.values(el.__tapasDriveXform).join(' ');
}

function clamp01(n) { return Math.max(0, Math.min(1, n)); }

function interp(from, to, t) {
  const a = Number(from), b = Number(to);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return b;
  return a + (b - a) * t;
}

export function driveScrollTimeline(steps, rootEl) {
  if (!rootEl || !Array.isArray(steps) || steps.length === 0) return () => {};
  const plan = [];
  for (const step of steps) {
    if (!step || !step.property) continue;
    const el = resolveTarget(rootEl, step.target, step.targetValue);
    if (!el) continue;
    const fp = Number(step.fromProgress ?? 0);
    const tp = Number(step.toProgress ?? 1);
    plan.push({
      el, step,
      from: Number(step.from),
      to:   Number(step.to),
      fp: Number.isFinite(fp) ? clamp01(fp) : 0,
      tp: Number.isFinite(tp) ? clamp01(tp) : 1,
    });
  }
  if (plan.length === 0) return () => {};

  let rafId = null;
  let lastProgress = -1;

  const tick = () => {
    const rect = rootEl.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    // 0 = element's top just entered the viewport bottom;
    // 1 = element's bottom just exited the viewport top.
    const total = vh + rect.height;
    const scrolled = vh - rect.top;
    const progress = total > 0 ? clamp01(scrolled / total) : 0;

    if (progress !== lastProgress) {
      lastProgress = progress;
      for (const p of plan) {
        const span = p.tp - p.fp;
        let t;
        if (progress <= p.fp)      t = 0;
        else if (progress >= p.tp) t = 1;
        else                       t = span > 0 ? (progress - p.fp) / span : 1;
        const val = interp(p.from, p.to, t);
        applyDriveProperty(p.el, p.step.property, val, p.step.unit);
      }
    }
    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);
  return () => { if (rafId != null) cancelAnimationFrame(rafId); };
}

export function driveMouseTimeline(steps, rootEl) {
  if (!rootEl || !Array.isArray(steps) || steps.length === 0) return () => {};
  const plan = [];
  for (const step of steps) {
    if (!step || !step.property) continue;
    const el = resolveTarget(rootEl, step.target, step.targetValue);
    if (!el) continue;
    plan.push({ el, step, from: Number(step.from), to: Number(step.to), axis: step.axis === 'y' ? 'y' : 'x' });
  }
  if (plan.length === 0) return () => {};

  let cx = 0, cy = 0;
  let rafId = null;
  let dirty = true;

  const onMove = (e) => {
    const rect = rootEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    cx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;   // -1..1
    cy = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;
    dirty = true;
  };
  const onLeave = () => { cx = 0; cy = 0; dirty = true; };

  rootEl.addEventListener('mousemove', onMove);
  rootEl.addEventListener('mouseleave', onLeave);

  const tick = () => {
    if (dirty) {
      dirty = false;
      for (const p of plan) {
        const input = p.axis === 'y' ? cy : cx;
        // Input [-1..1] mapped onto [from..to] with `from` at -1 and
        // `to` at +1. Linear; smoothing left to CSS `transition`
        // which the target can opt into via the Style panel.
        const t = (input + 1) / 2;
        const val = interp(p.from, p.to, t);
        applyDriveProperty(p.el, p.step.property, val, p.step.unit);
      }
    }
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);

  return () => {
    rootEl.removeEventListener('mousemove', onMove);
    rootEl.removeEventListener('mouseleave', onLeave);
    if (rafId != null) cancelAnimationFrame(rafId);
  };
}

export function driveTimeline(trigger, steps, rootEl) {
  if (trigger === 'scroll-drive') return driveScrollTimeline(steps, rootEl);
  if (trigger === 'mouse')        return driveMouseTimeline(steps, rootEl);
  return () => {};
}
