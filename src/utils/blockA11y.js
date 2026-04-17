// =====================================================================
// blockA11y — accessibility warnings for editor blocks
//
// Pure functions (no React, no DOM) that inspect a block's `props` and
// `meta` and return a list of warning objects to surface in the
// BlockInspector. Heuristic by design: false negatives are fine but we
// avoid false positives — every check requires the block to actually
// have the relevant fields, so generic blocks without images won't
// scream "missing alt text" forever.
//
// Each warning shape: { severity, field, message, fix }.
//   severity: 'warning' | 'error'
//   field   : the prop key the user should jump to to fix it
//   message : short human description (one line)
//   fix     : optional follow-up sentence shown smaller
// =====================================================================

// Compute relative luminance for a hex color.
function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return null;
  let h = hex.trim().replace(/^#/, '');
  // alpha channel — strip it; we compare opaque-on-opaque
  if (h.length === 8) h = h.slice(0, 6);
  if (h.length === 4) h = h.slice(0, 3);
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function relLuminance(rgb) {
  const a = rgb.map(v => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

// WCAG 2.1 contrast ratio. Returns null if either color is unparseable.
export function contrastRatio(c1, c2) {
  const r1 = hexToRgb(c1);
  const r2 = hexToRgb(c2);
  if (!r1 || !r2) return null;
  const l1 = relLuminance(r1);
  const l2 = relLuminance(r2);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

// Pairs to check for text-on-background contrast. Format: [textKey, bgKey, label].
// Order matters — first match per pair wins, no double-warnings.
const CONTRAST_PAIRS = [
  ['text_color',         'bg_color',         'Body text on background'],
  ['headline_color',     'bg_color',         'Headline on background'],
  ['eyebrow_color',      'bg_color',         'Eyebrow on background'],
  ['cta_text_color',     'cta_bg_color',     'Button text on button background'],
  ['button_text_color',  'button_bg_color',  'Button text on button background'],
];

// Helper: read a prop, falling back to the registry default.
function readProp(props, defaults, key) {
  if (props && key in props && props[key] !== undefined && props[key] !== '') return props[key];
  if (defaults && key in defaults) return defaults[key];
  return undefined;
}

// Schema fields can declare `usedBy`/`hideFor` to gate themselves to
// specific presets. A11y checks must respect that gating — otherwise
// we warn about fields that the active variant doesn't even render
// (e.g. "Secondary button text has no label" on a Hero with the
// Centered preset, which doesn't show a secondary button at all).
function isFieldActive(field, activePreset) {
  if (!field) return true;
  if (Array.isArray(field.usedBy) && activePreset && !field.usedBy.includes(activePreset)) return false;
  if (Array.isArray(field.hideFor) && activePreset && field.hideFor.includes(activePreset)) return false;
  return true;
}

// Check 1 — image without alt text. We only warn when the schema or
// defaults actually define a corresponding alt key, so blocks that
// never had an alt field stay silent (no spurious warnings).
function checkImageAlts(block, meta, warnings) {
  const props = block.props || {};
  const defaults = meta.defaultProps || {};
  const schema = meta.schema || [];
  const activePreset = props.preset || defaults.preset;
  for (const field of schema) {
    if (field.type !== 'image') continue;
    if (!isFieldActive(field, activePreset)) continue;
    const value = readProp(props, defaults, field.key);
    if (!value) continue; // image not set → not a problem
    // Try a few alt naming conventions.
    const altKeys = [
      field.key.replace(/_url$/, '_alt'),
      `${field.key}_alt`,
      'alt',
      'image_alt',
    ];
    const altKeyExists = altKeys.some(k => k in defaults || schema.some(f => f.key === k));
    if (!altKeyExists) continue; // schema doesn't model alt — silent
    const hasAlt = altKeys.some(k => {
      const v = readProp(props, defaults, k);
      return v && String(v).trim();
    });
    if (!hasAlt) {
      warnings.push({
        severity: 'warning',
        field: field.key,
        message: `Image "${field.label || field.key}" has no alt text.`,
        fix: 'Screen readers can\'t describe this image to visually impaired visitors.',
      });
    }
  }
}

// Check 2 — button-shaped fields with a destination but no visible
// label. Catches common patterns: cta_text + cta_url, button_text +
// button_url, etc.
function checkButtonNames(block, meta, warnings) {
  const props = block.props || {};
  const defaults = meta.defaultProps || {};
  const schema = meta.schema || [];
  const activePreset = props.preset || defaults.preset;
  const isButtonText = (key) => /(_text|_label)$/.test(key) &&
    (key.startsWith('cta_') || key.startsWith('button_') || key.startsWith('link_') || key === 'cta_label');
  for (const field of schema) {
    if (!isButtonText(field.key)) continue;
    if (!isFieldActive(field, activePreset)) continue;
    const value = readProp(props, defaults, field.key);
    if (value && String(value).trim()) continue;
    // Find a paired URL — if one is set, this button is broken.
    const urlKeys = [
      field.key.replace(/_text$|_label$/, '_url'),
      field.key.replace(/_text$|_label$/, '_link'),
      field.key.replace(/_text$|_label$/, '_href'),
      'cta_url', 'button_url', 'link_url',
    ];
    const hasUrl = urlKeys.some(k => {
      const v = readProp(props, defaults, k);
      return v && String(v).trim();
    });
    if (hasUrl) {
      warnings.push({
        severity: 'warning',
        field: field.key,
        message: `Button "${field.label || field.key}" has no visible text.`,
        fix: 'Sighted visitors won\'t see a label, and screen readers will say "link" with no context.',
      });
    }
  }
}

// Check 3 — text/background contrast against WCAG AA (4.5:1 for body
// text). Drops to "error" severity below 3:1 (which fails even Large
// Text AA). Only warns when both colors are explicitly set.
function checkContrast(block, meta, warnings) {
  const props = block.props || {};
  const defaults = meta.defaultProps || {};
  for (const [textKey, bgKey, label] of CONTRAST_PAIRS) {
    const text = readProp(props, defaults, textKey);
    const bg   = readProp(props, defaults, bgKey);
    if (!text || !bg) continue;
    const ratio = contrastRatio(text, bg);
    if (ratio === null) continue;
    if (ratio >= 4.5) continue;
    warnings.push({
      severity: ratio < 3 ? 'error' : 'warning',
      field: textKey,
      message: `${label} contrast is ${ratio.toFixed(2)}:1 (WCAG AA needs ≥4.5:1).`,
      fix: 'Try a darker or lighter color for either side of the pair.',
    });
  }
}

// Top-level — runs every check and returns a flat array. Memo-friendly:
// inputs are immutable shapes from the registry + draft state.
export function getBlockA11yWarnings(block, meta) {
  if (!block || !meta) return [];
  const warnings = [];
  checkImageAlts(block, meta, warnings);
  checkButtonNames(block, meta, warnings);
  checkContrast(block, meta, warnings);
  return warnings;
}
