import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { DEFAULT_CONTENT } from '../utils/defaultContent';

// =====================================================================
// SiteContentContext
//
// Loads the `store_content` row from app_settings on mount, deep-merges
// it with DEFAULT_CONTENT, and exposes the result via useSiteContent().
//
// Also applies brand colors as CSS custom properties on :root, so any
// component that wants to be themeable can use var(--tapas-primary)
// etc. instead of hardcoding hex values. Fonts are auto-loaded from
// Google Fonts when they differ from the defaults.
// =====================================================================

const SiteContentCtx = createContext(DEFAULT_CONTENT);

export function useSiteContent() {
  return useContext(SiteContentCtx);
}

// Deep merge of two plain objects. Right side wins. Arrays are replaced.
function deepMerge(base, override) {
  if (!override || typeof override !== 'object') return base;
  const out = { ...base };
  for (const k of Object.keys(override)) {
    const bv = base[k];
    const ov = override[k];
    if (bv && typeof bv === 'object' && !Array.isArray(bv) && ov && typeof ov === 'object' && !Array.isArray(ov)) {
      out[k] = deepMerge(bv, ov);
    } else if (ov !== null && ov !== undefined && ov !== '') {
      out[k] = ov;
    }
  }
  return out;
}

// Apply brand tokens to :root as CSS custom properties.
function applyTheme(content) {
  const b = content?.brand;
  if (!b) return;
  const root = document.documentElement;
  root.style.setProperty('--tapas-primary',        b.primary_color);
  root.style.setProperty('--tapas-primary-dark',   b.primary_color_dark);
  root.style.setProperty('--tapas-primary-light',  b.primary_color_light);
  root.style.setProperty('--tapas-accent',         b.accent_color);
  root.style.setProperty('--tapas-accent-dark',    b.accent_color_dark);
  root.style.setProperty('--tapas-cream',          b.cream_color);
  root.style.setProperty('--tapas-sand',           b.sand_color);
  root.style.setProperty('--tapas-heading-font',   `"${b.heading_font}", serif`);
  root.style.setProperty('--tapas-body-font',      `"${b.body_font}", sans-serif`);
}

// Load any Google Fonts the user has picked that aren't already loaded.
// We track loaded families to avoid injecting duplicate <link> tags.
const loadedFonts = new Set(['Playfair Display', 'Lato']);
function loadGoogleFont(family) {
  if (!family || loadedFonts.has(family)) return;
  loadedFonts.add(family);
  const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@400;600;700;800&display=swap`;
  const existing = document.querySelector(`link[data-tapas-font="${family}"]`);
  if (existing) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.setAttribute('data-tapas-font', family);
  document.head.appendChild(link);
}

export function SiteContentProvider({ children }) {
  const [content, setContent] = useState(DEFAULT_CONTENT);

  useEffect(() => {
    let mounted = true;

    // Apply defaults immediately so CSS vars are set even before DB load.
    applyTheme(DEFAULT_CONTENT);

    (async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'store_content')
          .maybeSingle();
        if (!mounted) return;
        if (data?.value) {
          const raw = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          const merged = deepMerge(DEFAULT_CONTENT, raw);
          setContent(merged);
          applyTheme(merged);
          if (merged.brand?.heading_font) loadGoogleFont(merged.brand.heading_font);
          if (merged.brand?.body_font)    loadGoogleFont(merged.brand.body_font);
        }
      } catch (err) {
        // Table missing or row missing — keep defaults, store will render
        // identically to pre-editor state.
        console.warn('[SiteContent] load failed, using defaults:', err?.message || err);
      }
    })();

    return () => { mounted = false; };
  }, []);

  return (
    <SiteContentCtx.Provider value={content}>
      {children}
    </SiteContentCtx.Provider>
  );
}
