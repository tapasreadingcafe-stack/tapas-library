import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const ThemeContext = createContext();

export function useTheme() {
  return useContext(ThemeContext);
}

// Colors to replace in dark mode
const LIGHT_BG = ['white', '#fff', '#ffffff', 'rgb(255, 255, 255)', '#f8f9fa', '#f5f7fa', '#f8f9ff', '#f0f0f0', '#f5f5f5', '#f0f2f5', '#f0f3ff', '#f9f9f9', '#fafafa'];
const LIGHT_BG_SET = new Set(LIGHT_BG);

const DARK = {
  cardBg: '#16213e',
  pageBg: '#1a1a2e',
  nestedBg: '#1a2744',
  text: '#d0d8e8',
  textMuted: '#8899bb',
  border: '#2a3a5a',
  inputBg: '#0f1a30',
};

function isLightBg(color) {
  if (!color) return false;
  const c = color.trim().toLowerCase();
  if (LIGHT_BG_SET.has(c)) return true;
  // Catch rgb(248, 249, 250) etc.
  const m = c.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (m && parseInt(m[1]) > 230 && parseInt(m[2]) > 230 && parseInt(m[3]) > 230) return true;
  return false;
}

function isDarkText(color) {
  if (!color) return false;
  const c = color.trim().toLowerCase();
  if (c === '#333' || c === '#333333' || c === '#555' || c === '#555555' || c === '#666' || c === '#666666') return true;
  const m = c.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (m && parseInt(m[1]) < 120 && parseInt(m[2]) < 120 && parseInt(m[3]) < 120) return true;
  return false;
}

function applyDarkToElement(el) {
  if (!el.style) return;
  const computed = el.style;

  // Fix backgrounds
  if (isLightBg(computed.background)) computed.background = DARK.cardBg;
  if (isLightBg(computed.backgroundColor)) computed.backgroundColor = DARK.cardBg;

  // Fix text colors
  if (isDarkText(computed.color)) computed.color = DARK.text;

  // Fix borders
  const bc = computed.borderColor;
  if (bc && (bc.includes('#e0e0e0') || bc.includes('#ddd') || bc.includes('#eee') || bc.includes('#f0f0f0'))) {
    computed.borderColor = DARK.border;
  }
}

function revertDarkFromElement(el) {
  // We can't easily revert since we modified inline styles directly.
  // The simplest approach: force a page re-render by React handles it.
}

function walkAndApplyDark(root) {
  if (!root) return;
  const els = root.querySelectorAll('*');
  els.forEach(el => applyDarkToElement(el));
}

const DARK_CSS = `
/* Base dark overrides via CSS */
[data-theme="dark"] body { background: ${DARK.pageBg}; color: ${DARK.text}; }
[data-theme="dark"] .sidebar { background: #0f3460; border-right-color: ${DARK.border}; }
[data-theme="dark"] .nav-link { color: #9aa8c0; }
[data-theme="dark"] .nav-link:hover, [data-theme="dark"] .nav-link.active { background: rgba(102,126,234,0.2); color: #667eea; }
[data-theme="dark"] .nav-group-header { color: #9aa8c0; }
[data-theme="dark"] .nav-group-header:hover, [data-theme="dark"] .nav-group-header.has-active { color: #667eea; }
[data-theme="dark"] .main-content { background: ${DARK.pageBg}; color: ${DARK.text}; }
[data-theme="dark"] .navbar { background: linear-gradient(135deg, #0f3460 0%, #533483 100%); }
[data-theme="dark"] .modal-overlay { background: rgba(0,0,0,0.7); }
[data-theme="dark"] .sidebar-overlay { background: rgba(0,0,0,0.6); }

/* Global element overrides */
[data-theme="dark"] h1, [data-theme="dark"] h2, [data-theme="dark"] h3, [data-theme="dark"] h4 { color: #e8ecf4 !important; }
[data-theme="dark"] p { color: #9aa8c0; }
[data-theme="dark"] label { color: #8899bb !important; }
[data-theme="dark"] th { color: #8899cc !important; background: #0d1b3e !important; }
[data-theme="dark"] td { color: #c8d0e0 !important; }
[data-theme="dark"] table { background: ${DARK.cardBg} !important; }
[data-theme="dark"] thead, [data-theme="dark"] thead tr { background: #0d1b3e !important; }
[data-theme="dark"] tbody tr { background: ${DARK.cardBg} !important; }
[data-theme="dark"] tbody tr:hover { background: #1e3050 !important; }
[data-theme="dark"] input, [data-theme="dark"] select, [data-theme="dark"] textarea {
  background: ${DARK.inputBg} !important; color: ${DARK.text} !important; border-color: ${DARK.border} !important;
}
[data-theme="dark"] input::placeholder, [data-theme="dark"] textarea::placeholder { color: #556080 !important; }
[data-theme="dark"] .btn-secondary { background: #2a3a5a !important; color: #c8d0e0 !important; }
[data-theme="dark"] ::-webkit-scrollbar { width: 8px; }
[data-theme="dark"] ::-webkit-scrollbar-track { background: ${DARK.pageBg}; }
[data-theme="dark"] ::-webkit-scrollbar-thumb { background: #2a3a5a; border-radius: 4px; }
`;

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('theme') === 'dark'; } catch { return false; }
  });
  const observerRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');

    // Inject CSS
    const cssId = 'dark-mode-css';
    let cssEl = document.getElementById(cssId);
    if (dark) {
      if (!cssEl) {
        cssEl = document.createElement('style');
        cssEl.id = cssId;
        cssEl.textContent = DARK_CSS;
        document.head.appendChild(cssEl);
      }
    } else {
      if (cssEl) cssEl.remove();
    }

    // Use MutationObserver to catch React re-renders and apply dark fixes
    if (dark) {
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        // Initial pass
        walkAndApplyDark(mainContent);

        // Watch for changes
        observerRef.current = new MutationObserver((mutations) => {
          mutations.forEach(m => {
            // Apply to newly added nodes
            m.addedNodes.forEach(node => {
              if (node.nodeType === 1) {
                applyDarkToElement(node);
                walkAndApplyDark(node);
              }
            });
            // Apply to attribute changes (style changes)
            if (m.type === 'attributes' && m.attributeName === 'style') {
              applyDarkToElement(m.target);
            }
          });
        });

        observerRef.current.observe(mainContent, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['style'],
        });
      }
    } else {
      // Disconnect observer and reload to reset inline styles
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [dark]);

  // Re-apply dark mode after route changes (React re-renders content)
  useEffect(() => {
    if (dark) {
      const timer = setTimeout(() => {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) walkAndApplyDark(mainContent);
      }, 100);
      return () => clearTimeout(timer);
    }
  });

  const toggleTheme = () => {
    setDark(prev => {
      const next = !prev;
      if (!next) {
        // Switching to light — need to reload to clear inline style modifications
        setTimeout(() => window.location.reload(), 50);
      }
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ dark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
