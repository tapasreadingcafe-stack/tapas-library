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
      live = plan.map(({ el, keyframes, options }) => {
        try {
          return el.animate(keyframes, options);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('Timeline step failed to animate, falling back to ease-out:', err);
          try {
            return el.animate(keyframes, { ...options, easing: 'ease-out' });
          } catch {
            return { addEventListener() {}, cancel() {}, effect: null };
          }
        }
      });
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

  // Phase H drive triggers — continuous, so we just install them
  // and keep the cleanup functions for the unmount return path.
  const driveCleanups = [];
  rootEl.querySelectorAll('[data-tapas-timeline-scroll-drive]:not([data-tapas-drive-mounted])').forEach((el) => {
    const steps = parseTimelineAttr(el.getAttribute('data-tapas-timeline-scroll-drive'));
    if (!steps.length) return;
    el.setAttribute('data-tapas-drive-mounted', '');
    driveCleanups.push(driveScrollTimeline(steps, el));
  });
  rootEl.querySelectorAll('[data-tapas-timeline-mouse]:not([data-tapas-drive-mounted])').forEach((el) => {
    const steps = parseTimelineAttr(el.getAttribute('data-tapas-timeline-mouse'));
    if (!steps.length) return;
    el.setAttribute('data-tapas-drive-mounted', '');
    driveCleanups.push(driveMouseTimeline(steps, el));
  });

  return () => {
    if (io) io.disconnect();
    cancelAnimationFrame(frame);
    controllers.forEach((c) => c.cancel());
    driveCleanups.forEach((fn) => fn());
  };
}

// ---------------------------------------------------------------------
// driveScrollTimeline / driveMouseTimeline — storefront copies of the
// editor's continuous-input runtimes. Kept in sync with
// src/pages/WebsiteEditor.timeline.js.
// ---------------------------------------------------------------------
function applyDriveProperty(el, property, rawVal, unit) {
  const num = Number(rawVal);
  if (property === 'opacity') {
    el.style.opacity = Number.isFinite(num) ? num : rawVal;
    return;
  }
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
  let last = -1;
  const tick = () => {
    const rect = rootEl.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    const total = vh + rect.height;
    const scrolled = vh - rect.top;
    const progress = total > 0 ? clamp01(scrolled / total) : 0;
    if (progress !== last) {
      last = progress;
      for (const p of plan) {
        const span = p.tp - p.fp;
        let t;
        if (progress <= p.fp)      t = 0;
        else if (progress >= p.tp) t = 1;
        else                       t = span > 0 ? (progress - p.fp) / span : 1;
        applyDriveProperty(p.el, p.step.property, interp(p.from, p.to, t), p.step.unit);
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
  let cx = 0, cy = 0, rafId = null, dirty = true;
  const onMove = (e) => {
    const rect = rootEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    cx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    cy = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
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
        const t = (input + 1) / 2;
        applyDriveProperty(p.el, p.step.property, interp(p.from, p.to, t), p.step.unit);
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
