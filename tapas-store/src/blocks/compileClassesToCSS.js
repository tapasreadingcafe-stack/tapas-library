// =====================================================================
// compileClassesToCSS — storefront mirror of staff-app WebsiteEditor.css.
//
// Copied intentionally rather than shared because tapas-store and the
// staff app are two independent CRA apps (no monorepo tooling). Keep
// this file byte-identical in behaviour to the staff-app original:
// states in STATE_ORDER order, breakpoints applied via @media, and
// modes scoped under [data-mode="…"].
//
// Used by PageRenderer's v2 branch to emit a stylesheet for the
// currently-loaded SiteContent.classes. Called on every render, but
// cheap: flat walk over the classes object, no regex, no allocations
// beyond the string build-up.
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

    for (const { key, suffix } of STATE_ORDER) {
      const decls = declsFrom(cls?.styles?.[key]);
      if (decls) rules.push(`.${safe}${suffix} { ${decls}; }`);
    }

    for (const [bp, media] of Object.entries(BREAKPOINT_MEDIA)) {
      const decls = declsFrom(cls?.breakpoints?.[bp]);
      if (decls) rules.push(`${media} { .${safe} { ${decls}; } }`);
    }

    for (const [modeName, modeStyles] of Object.entries(cls?.modes || {})) {
      const decls = declsFrom(modeStyles);
      if (decls) rules.push(`[data-mode="${modeName}"] .${safe} { ${decls}; }`);
    }
  }

  return rules.join('\n');
}
