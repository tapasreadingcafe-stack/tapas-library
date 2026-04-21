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
      live = plan.map(({ el, keyframes, options }) => el.animate(keyframes, options));
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
export const TIMELINE_TRIGGERS = ['scroll', 'load', 'click', 'hover'];

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
// the "+ Add step" button in the InteractionsPanel.
export function makeStep({ property = 'translateY' } = {}) {
  const meta = TIMELINE_PROPERTIES.find((p) => p.key === property) || TIMELINE_PROPERTIES[0];
  return {
    id: 's_' + Math.random().toString(36).slice(2, 9),
    target: 'self',
    targetValue: '',
    property: meta.key,
    from: String(meta.defaults.from),
    to:   String(meta.defaults.to),
    unit: meta.unit,
    duration: 600,
    delay: 0,
    easing: 'ease-out',
  };
}
