// =====================================================================
// Timeline runtime — storefront copy of
// src/pages/WebsiteEditor.timeline.js (Phase G).
//
// Duplicated rather than shared because the staff app and the
// storefront are separate CRA bundles without a packages/ folder yet.
// Edits must stay in sync with the editor copy — if the shape of a
// step ever changes there, change it here too.
//
// Two entry points:
//   * compileTimeline(steps, rootEl)  — returns a controller with
//                                        play() / cancel() / onFinish()
//   * mountTimelineRuntime(rootEl)    — wires a single
//     IntersectionObserver + a load-frame callback to auto-play every
//     [data-tapas-timeline-scroll] / [data-tapas-timeline-load] node
//     inside the given root. Returns a cleanup function.
// =====================================================================

function propertyChannel(prop) {
  return prop === 'opacity' ? 'opacity' : 'transform';
}

function formatValue(prop, raw, unit) {
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

function buildKeyframes(step) {
  const channel = propertyChannel(step.property);
  const unit = step.unit ?? '';
  const from = formatValue(step.property, step.from, unit);
  const to   = formatValue(step.property, step.to,   unit);
  if (from == null || to == null) return null;
  if (channel === 'opacity') return [{ opacity: from }, { opacity: to }];
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

export function parseTimelineAttr(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function compileTimeline(steps, rootEl, opts = {}) {
  const plan = [];
  for (const step of (Array.isArray(steps) ? steps : [])) {
    if (!step || !step.property) continue;
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
        composite: propertyChannel(step.property) === 'transform' ? 'add' : 'replace',
      },
    });
  }

  let live = [];
  const finishCallbacks = [];

  const controller = {
    play() {
      controller.cancel();
      if (plan.length === 0) {
        finishCallbacks.forEach((cb) => cb());
        return;
      }
      live = plan.map(({ el, keyframes, options }) => el.animate(keyframes, options));
      const longest = live.reduce((a, b) => {
        const aT = (a.effect?.getTiming?.().duration || 0) + (a.effect?.getTiming?.().delay || 0);
        const bT = (b.effect?.getTiming?.().duration || 0) + (b.effect?.getTiming?.().delay || 0);
        return bT > aT ? b : a;
      }, live[0]);
      const done = () => finishCallbacks.forEach((cb) => cb());
      longest.addEventListener?.('finish', done, { once: true });
      longest.onfinish = longest.onfinish || done;
    },
    cancel() {
      for (const a of live) { try { a.cancel(); } catch { /* no-op */ } }
      live = [];
    },
    onFinish(cb) { if (typeof cb === 'function') finishCallbacks.push(cb); return controller; },
    get length() { return plan.length; },
  };

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

// Idempotent mount: scans the given root for timeline-carrying
// elements and wires up triggers. Safe to call repeatedly; we mark
// each processed element with __tapasTimelineMounted so a later
// scan doesn't double-animate. Returns a cleanup function callers
// should invoke before the DOM subtree unmounts.
export function mountTimelineRuntime(rootEl) {
  if (!rootEl || typeof window === 'undefined') return () => {};
  const controllers = [];
  let io = null;

  // Scroll-in: observe; play once on first intersection.
  const scrollEls = rootEl.querySelectorAll('[data-tapas-timeline-scroll]:not([data-tapas-timeline-mounted])');
  if (scrollEls.length && typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.__tapasTimelineCtrl?.play();
        io.unobserve(e.target);
      }
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    scrollEls.forEach((el) => {
      const steps = parseTimelineAttr(el.getAttribute('data-tapas-timeline-scroll'));
      if (!steps.length) return;
      const ctrl = compileTimeline(steps, el, { resetToInitial: true });
      el.__tapasTimelineCtrl = ctrl;
      el.setAttribute('data-tapas-timeline-mounted', '');
      controllers.push(ctrl);
      io.observe(el);
    });
  }

  // Page-load: play on next frame.
  const loadCtrls = [];
  rootEl.querySelectorAll('[data-tapas-timeline-load]:not([data-tapas-timeline-mounted])').forEach((el) => {
    const steps = parseTimelineAttr(el.getAttribute('data-tapas-timeline-load'));
    if (!steps.length) return;
    const ctrl = compileTimeline(steps, el, { resetToInitial: true });
    el.setAttribute('data-tapas-timeline-mounted', '');
    loadCtrls.push(ctrl);
    controllers.push(ctrl);
  });
  const frame = requestAnimationFrame(() => {
    loadCtrls.forEach((c) => c.play());
  });

  return () => {
    if (io) io.disconnect();
    cancelAnimationFrame(frame);
    controllers.forEach((c) => c.cancel());
  };
}
