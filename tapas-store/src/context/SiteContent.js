import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { DEFAULT_CONTENT } from '../utils/defaultContent';

// =====================================================================
// SiteContentContext
//
// Loads the `store_content` row from app_settings on mount, deep-merges
// it with DEFAULT_CONTENT, and exposes the result via useSiteContent().
//
// To avoid a "flash of old content" on page load, the last-fetched
// content is cached in localStorage. On mount we use the cached value
// as the initial state so the very first render already has the right
// headlines/colors/fonts, then we fetch from Supabase in the background
// and only re-render if anything actually changed.
//
// Also applies brand colors as CSS custom properties on :root, so any
// component that wants to be themeable can use var(--tapas-primary)
// etc. instead of hardcoding hex values. Fonts are auto-loaded from
// Google Fonts when they differ from the defaults.
// =====================================================================

const CACHE_KEY = 'tapas_store_content_v1';

function loadFromCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return deepMerge(DEFAULT_CONTENT, parsed);
  } catch {
    return null;
  }
}

function saveToCache(rawValue) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(rawValue));
  } catch {}
}

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
  // Initial state: cached content if we have it, otherwise defaults.
  // useState's lazy initializer runs exactly once on first render,
  // so this is synchronous — no flash.
  const [content, setContent] = useState(() => loadFromCache() || DEFAULT_CONTENT);

  // Apply theme from whatever we have RIGHT NOW (cache or defaults).
  // This runs on first render, before any paint, so CSS variables
  // and fonts are in place before the browser draws anything.
  useEffect(() => {
    applyTheme(content);
    if (content.brand?.heading_font) loadGoogleFont(content.brand.heading_font);
    if (content.brand?.body_font)    loadGoogleFont(content.brand.body_font);
    // Only needs to re-run when the cached/default content first loads.
    // Subsequent theme updates happen inside the fetch effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Background fetch: pull latest from Supabase, update only if different.
  useEffect(() => {
    let mounted = true;

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
          // Only update state if the DB actually differs from what we're
          // already showing. Avoids a pointless re-render for returning
          // visitors whose cache matches production.
          const currentStr = JSON.stringify(content);
          const mergedStr  = JSON.stringify(merged);
          if (currentStr !== mergedStr) {
            setContent(merged);
            applyTheme(merged);
            if (merged.brand?.heading_font) loadGoogleFont(merged.brand.heading_font);
            if (merged.brand?.body_font)    loadGoogleFont(merged.brand.body_font);
          }
          // Cache the raw DB value (not the merged one) so we can re-merge
          // against future DEFAULT_CONTENT changes on next load.
          saveToCache(raw);
        }
      } catch (err) {
        console.warn('[SiteContent] load failed, using cached/defaults:', err?.message || err);
      }
    })();

    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SiteContentCtx.Provider value={content}>
      {children}
    </SiteContentCtx.Provider>
  );
}
