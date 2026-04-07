import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function useTheme() {
  return useContext(ThemeContext);
}

// Dark mode inline style overrides — these use !important to beat React inline styles
const DARK_OVERRIDE_CSS = `
[data-theme="dark"] .main-content div[style],
[data-theme="dark"] .main-content table[style],
[data-theme="dark"] .main-content form[style],
[data-theme="dark"] .main-content section[style] {
  background-color: #16213e !important;
  color: #d0d8e8 !important;
}

[data-theme="dark"] .main-content tr[style] {
  background-color: transparent !important;
}

[data-theme="dark"] .main-content td[style] {
  color: #c8d0e0 !important;
}

[data-theme="dark"] .main-content th[style] {
  color: #8899cc !important;
  background-color: #0d1b3e !important;
}

[data-theme="dark"] .main-content span[style*="color"] {
  opacity: 0.95;
}

[data-theme="dark"] .main-content div[style*="border"] {
  border-color: #2a3a5a !important;
}

[data-theme="dark"] .main-content input[style],
[data-theme="dark"] .main-content select[style],
[data-theme="dark"] .main-content textarea[style] {
  background-color: #0f1a30 !important;
  color: #d0d8e8 !important;
  border-color: #2a3a5a !important;
}

/* Keep colored elements readable */
[data-theme="dark"] .main-content span[style*="background: #d4edda"],
[data-theme="dark"] .main-content span[style*="background: #fff3cd"],
[data-theme="dark"] .main-content span[style*="background: #f8d7da"],
[data-theme="dark"] .main-content span[style*="background: #cce5ff"] {
  background-color: inherit !important;
  color: inherit !important;
}

/* Don't override buttons with specific colors (primary, success, warning, danger) */
[data-theme="dark"] .main-content button[style*="background: #667eea"],
[data-theme="dark"] .main-content button[style*="background: #1dd1a1"],
[data-theme="dark"] .main-content button[style*="background: #f39c12"],
[data-theme="dark"] .main-content button[style*="background: #ff6b6b"],
[data-theme="dark"] .main-content button[style*="background: #e74c3c"],
[data-theme="dark"] .main-content button[style*="background: #27ae60"],
[data-theme="dark"] .main-content button[style*="background: linear-gradient"],
[data-theme="dark"] .main-content a[style*="background: #667eea"] {
  background-color: unset !important;
  color: white !important;
}

/* Lighter dark for nested cards */
[data-theme="dark"] .main-content div[style] div[style] {
  background-color: #1a2744 !important;
}

/* Metric cards - keep border-top colors visible */
[data-theme="dark"] .main-content div[style*="border-top"] {
  background-color: #16213e !important;
}

/* Don't break images */
[data-theme="dark"] .main-content img {
  background-color: transparent !important;
}

/* Navbar stays as-is */
[data-theme="dark"] .navbar {
  background: linear-gradient(135deg, #0f3460 0%, #533483 100%) !important;
}
`;

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('theme') === 'dark'; } catch { return false; }
  });

  useEffect(() => {
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');

    // Inject/remove dark override stylesheet
    const id = 'dark-mode-overrides';
    let styleEl = document.getElementById(id);
    if (dark) {
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = id;
        styleEl.textContent = DARK_OVERRIDE_CSS;
        document.head.appendChild(styleEl);
      }
    } else {
      if (styleEl) styleEl.remove();
    }
  }, [dark]);

  const toggleTheme = () => setDark(prev => !prev);

  return (
    <ThemeContext.Provider value={{ dark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
