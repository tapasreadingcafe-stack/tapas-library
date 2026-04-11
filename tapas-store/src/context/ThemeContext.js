// =====================================================================
// ThemeContext — light/dark mode toggle with system preference + persistence
// =====================================================================
// Stores the user's choice in localStorage under `tapas_theme`.
// Values: 'light' | 'dark' | 'system' (default).
// When 'system', we follow `prefers-color-scheme`.
// The active theme is written to <body data-theme="..."> so CSS variables
// in App.css kick in.
// =====================================================================

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'tapas_theme';
const ThemeContext = createContext({ theme: 'light', setTheme: () => {}, toggleTheme: () => {} });

function readStored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {}
  return 'system';
}

function resolveActive(pref) {
  if (pref === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }
  return pref;
}

function applyTheme(active) {
  if (typeof document === 'undefined') return;
  document.body.setAttribute('data-theme', active);
}

export function ThemeProvider({ children }) {
  const [pref, setPref] = useState(() => readStored());
  const [active, setActive] = useState(() => resolveActive(readStored()));

  // Apply on mount + whenever preference changes.
  useEffect(() => {
    const next = resolveActive(pref);
    setActive(next);
    applyTheme(next);
    try { localStorage.setItem(STORAGE_KEY, pref); } catch {}
  }, [pref]);

  // Re-apply when system preference changes (only matters when pref === 'system').
  useEffect(() => {
    if (pref !== 'system' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      const next = e.matches ? 'dark' : 'light';
      setActive(next);
      applyTheme(next);
    };
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, [pref]);

  const toggleTheme = useCallback(() => {
    // Simple two-state toggle (ignores 'system' and flips directly).
    setPref((p) => (resolveActive(p) === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: active, pref, setTheme: setPref, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
