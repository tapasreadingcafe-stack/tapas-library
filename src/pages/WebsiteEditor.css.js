// =====================================================================
// compileClassesToCSS — emit CSS text from the v2 ClassDef map.
//
// Walks draftContent.classes, outputs one stylesheet covering base
// styles, pseudo-state overrides, breakpoints, and mode overrides.
// The editor's canvas injects the result into a <style> tag; cutover
// will run the same compiler server-side during publish.
//
// Order matters: base → hover → pressed → focused → focus-visible →
// focus-within → visited, then breakpoints (desktop then narrower),
// then mode wrappers. Later rules win, matching Webflow's cascade.
// =====================================================================

const STATE_ORDER = [
  { key: 'base',           suffix: '' },
  { key: 'hover',          suffix: ':hover' },
  { key: 'pressed',        suffix: ':active' },
  { key: 'focused',        suffix: ':focus' },
  { key: 'focus-visible',  suffix: ':focus-visible' },
  { key: 'focus-within',   suffix: ':focus-within' },
  { key: 'visited',        suffix: ':visited' },
];

const BREAKPOINT_MEDIA = {
  tablet:  '@media (max-width: 991px)',
  mobileL: '@media (max-width: 767px)',
  mobileP: '@media (max-width: 479px)',
};

function declsFrom(styleBlock) {
  if (!styleBlock || typeof styleBlock !== 'object') return '';
  const decls = [];
  for (const [prop, value] of Object.entries(styleBlock)) {
    if (value === undefined || value === null || value === '') continue;
    const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
    decls.push(`${cssProp}: ${value}`);
  }
  return decls.join('; ');
}

export function compileClassesToCSS(classes) {
  if (!classes || typeof classes !== 'object') return '';
  const rules = [];

  for (const [name, cls] of Object.entries(classes)) {
    const safe = String(name).replace(/[^a-zA-Z0-9_-]/g, '-');

    // 1. States (base + hover + etc) — stored on cls.styles
    for (const { key, suffix } of STATE_ORDER) {
      const decls = declsFrom(cls?.styles?.[key]);
      if (decls) rules.push(`.${safe}${suffix} { ${decls}; }`);
    }

    // 2. Breakpoint overrides — stored on cls.breakpoints
    for (const [bp, media] of Object.entries(BREAKPOINT_MEDIA)) {
      const decls = declsFrom(cls?.breakpoints?.[bp]);
      if (decls) rules.push(`${media} { .${safe} { ${decls}; } }`);
    }

    // 3. Mode overrides — stored on cls.modes, keyed by mode name
    for (const [modeName, modeStyles] of Object.entries(cls?.modes || {})) {
      const decls = declsFrom(modeStyles);
      if (decls) rules.push(`[data-mode="${modeName}"] .${safe} { ${decls}; }`);
    }
  }

  return rules.join('\n');
}
