// =====================================================================
// ThemeContext — locked to dark mode.
// =====================================================================
// The light/dark toggle was removed; the storefront ships dark-only.
// Kept as a context to preserve `useTheme()` consumers without a refactor.
// =====================================================================

import React, { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext({ theme: 'light', setTheme: () => {}, toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.setAttribute('data-theme', 'light');
    }
  }, []);
  return (
    <ThemeContext.Provider value={{ theme: 'light', pref: 'light', setTheme: () => {}, toggleTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
