import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const DevModeContext = createContext();

export function useDevMode() {
  return useContext(DevModeContext);
}

// Load/save custom labels
function loadCustomLabels() {
  try { return JSON.parse(localStorage.getItem('dev_custom_labels') || '{}'); } catch { return {}; }
}
function saveCustomLabels(labels) {
  localStorage.setItem('dev_custom_labels', JSON.stringify(labels));
}

export function isDevModeEnabled() {
  try { return localStorage.getItem('dev_mode') === 'true'; } catch { return false; }
}

export function DevModeProvider({ children }) {
  const [devMode, setDevMode] = useState(isDevModeEnabled());
  const [customLabels, setCustomLabels] = useState(loadCustomLabels());
  const [editModal, setEditModal] = useState(null);

  useEffect(() => {
    localStorage.setItem('dev_mode', devMode ? 'true' : 'false');
    document.documentElement.setAttribute('data-dev-mode', devMode ? 'true' : 'false');
  }, [devMode]);

  const toggleDevMode = () => setDevMode(prev => !prev);

  const getLabel = (key, defaultLabel) => customLabels[key] || defaultLabel;

  const saveLabel = (key, value) => {
    const updated = { ...customLabels, [key]: value };
    setCustomLabels(updated);
    saveCustomLabels(updated);
  };

  const resetLabel = (key) => {
    const updated = { ...customLabels };
    delete updated[key];
    setCustomLabels(updated);
    saveCustomLabels(updated);
  };

  const resetAll = () => {
    setCustomLabels({});
    saveCustomLabels({});
  };

  // Global double-click handler — ONLY active when devMode is ON
  useEffect(() => {
    if (!devMode) return;

    const handleDblClick = (e) => {
      const el = e.target;
      const tag = el.tagName?.toLowerCase();
      const isTextEl = ['h1','h2','h3','h4','h5','h6','p','span','div','td','th','label','button','a'].includes(tag);
      if (!isTextEl) return;
      if (el.closest('.dev-edit-modal')) return;
      if (['INPUT','TEXTAREA','SELECT'].includes(el.tagName)) return;

      // Only edit elements with direct text (not containers full of children)
      const directText = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
      const text = directText || el.innerText?.trim();
      if (!text || text.length > 80 || text.length < 1) return;

      e.preventDefault();
      e.stopPropagation();

      const key = generateKey(el, text);
      setEditModal({ key, value: customLabels[key] || text, originalText: text });
    };

    document.addEventListener('dblclick', handleDblClick, true);
    return () => document.removeEventListener('dblclick', handleDblClick, true);
  }, [devMode, customLabels]);

  // Apply custom labels to DOM — ALWAYS runs (even with dev mode off)
  // This is purely cosmetic — only replaces visible text, never data attributes or values
  const applyLabelsToNode = useCallback((root) => {
    if (Object.keys(customLabels).length === 0 || !root) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const parent = node.parentElement;
      if (!parent) continue;
      const ptag = parent.tagName;
      if (['INPUT','TEXTAREA','SELECT','SCRIPT','STYLE','CODE','PRE'].includes(ptag)) continue;
      if (parent.dataset?.noEdit) continue;
      if (parent.closest('.dev-edit-modal')) continue;

      const text = node.textContent.trim();
      if (!text) continue;

      for (const [key, newVal] of Object.entries(customLabels)) {
        const origText = key.split('__').pop();
        if (origText && text === origText && text !== newVal) {
          node.textContent = node.textContent.replace(origText, newVal);
          break;
        }
      }
    }
  }, [customLabels]);

  const applyAllLabels = useCallback(() => {
    [document.querySelector('.main-content'), document.querySelector('.sidebar-nav'), document.querySelector('.app-title')]
      .filter(Boolean).forEach(c => applyLabelsToNode(c));
  }, [applyLabelsToNode]);

  // MutationObserver: watch for ANY DOM change and re-apply labels
  useEffect(() => {
    if (Object.keys(customLabels).length === 0) return;

    // Initial apply
    const initTimer = setTimeout(applyAllLabels, 100);

    // Watch for changes (React re-renders, route changes, data loads)
    const observer = new MutationObserver((mutations) => {
      // Debounce: apply after mutations settle
      clearTimeout(observer._timer);
      observer._timer = setTimeout(() => {
        mutations.forEach(m => {
          m.addedNodes.forEach(node => {
            if (node.nodeType === 1) applyLabelsToNode(node);
          });
        });
      }, 50);
    });

    const mainContent = document.querySelector('.main-content');
    const sidebar = document.querySelector('.sidebar-nav');
    if (mainContent) observer.observe(mainContent, { childList: true, subtree: true });
    if (sidebar) observer.observe(sidebar, { childList: true, subtree: true });

    // Also re-apply on a regular interval as safety net
    const interval = setInterval(applyAllLabels, 2000);

    return () => {
      clearTimeout(initTimer);
      clearTimeout(observer._timer);
      clearInterval(interval);
      observer.disconnect();
    };
  }, [customLabels, applyLabelsToNode, applyAllLabels]);

  return (
    <DevModeContext.Provider value={{
      devMode, toggleDevMode,
      getLabel, customLabels, saveLabel, resetLabel, resetAll,
    }}>
      {children}

      {/* Dev mode floating indicator */}
      {devMode && (
        <div style={{
          position: 'fixed', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
          background: '#667eea', color: 'white', padding: '6px 16px',
          borderRadius: '20px', fontSize: '12px', fontWeight: '600',
          zIndex: 99998, boxShadow: '0 4px 12px rgba(102,126,234,0.4)',
          pointerEvents: 'none',
        }}>
          🛠 DEV MODE — Double-click any text to edit
        </div>
      )}

      {/* Edit modal */}
      {editModal && (
        <div className="dev-edit-modal" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999,
        }} onClick={() => setEditModal(null)}>
          <div style={{
            background: 'white', borderRadius: '12px', padding: '20px', maxWidth: '440px', width: '90%',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '20px' }}>🛠</span>
              <h3 style={{ margin: 0, fontSize: '16px' }} data-no-edit="true">Edit Display Name</h3>
            </div>
            <p style={{ fontSize: '12px', color: '#999', margin: '0 0 4px' }} data-no-edit="true">Original: "{editModal.originalText}"</p>
            <p style={{ fontSize: '10px', color: '#667eea', margin: '0 0 10px', background: '#f0f3ff', padding: '4px 8px', borderRadius: '4px' }} data-no-edit="true">
              This only changes the display name. All data and functionality stays the same.
            </p>
            <input
              value={editModal.value}
              onChange={e => setEditModal({ ...editModal, value: e.target.value })}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') { saveLabel(editModal.key, editModal.value); setEditModal(null); }
                if (e.key === 'Escape') setEditModal(null);
              }}
              style={{ width: '100%', padding: '10px 12px', border: '2px solid #667eea', borderRadius: '8px', fontSize: '16px', marginBottom: '12px' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { saveLabel(editModal.key, editModal.value); setEditModal(null); }}
                style={{ flex: 1, padding: '10px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                Save
              </button>
              <button onClick={() => { resetLabel(editModal.key); setEditModal(null); }}
                style={{ padding: '10px 16px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                Reset
              </button>
              <button onClick={() => setEditModal(null)}
                style={{ padding: '10px 16px', background: '#e0e0e0', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DevModeContext.Provider>
  );
}

function generateKey(el, text) {
  const path = [];
  let node = el;
  for (let i = 0; i < 4 && node && node !== document.body; i++) {
    const tag = node.tagName?.toLowerCase() || '';
    const cls = node.className ? '.' + String(node.className).split(' ')[0] : '';
    path.unshift(tag + cls);
    node = node.parentElement;
  }
  return path.join('>') + '__' + text;
}

// Editable wrapper for sidebar labels
export function Editable({ id, children, as: Tag = 'span', style = {} }) {
  const { getLabel } = useDevMode();
  const defaultText = typeof children === 'string' ? children : '';
  const displayText = getLabel(id, defaultText);
  return <Tag style={style}>{displayText || children}</Tag>;
}
