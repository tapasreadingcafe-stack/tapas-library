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
  const [editModal, setEditModal] = useState(null); // { key, value, el }

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

  // ── Global double-click handler for dev mode ──
  useEffect(() => {
    if (!devMode) return;

    const handleDblClick = (e) => {
      const el = e.target;
      // Only edit text-containing elements
      const tag = el.tagName?.toLowerCase();
      const isTextEl = ['h1','h2','h3','h4','h5','h6','p','span','div','td','th','label','button','a'].includes(tag);
      if (!isTextEl) return;

      // Must have direct text content (not just child elements)
      const text = el.childNodes.length === 1 && el.childNodes[0].nodeType === 3
        ? el.textContent.trim()
        : el.innerText?.trim();

      if (!text || text.length > 60 || text.length < 1) return;

      // Skip inputs, modals we created
      if (el.closest('.dev-edit-modal')) return;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return;

      e.preventDefault();
      e.stopPropagation();

      // Generate a key from the element's path
      const key = generateKey(el, text);
      const currentValue = customLabels[key] || text;

      setEditModal({ key, value: currentValue, originalText: text });
    };

    document.addEventListener('dblclick', handleDblClick, true);
    return () => document.removeEventListener('dblclick', handleDblClick, true);
  }, [devMode, customLabels]);

  // ── Apply saved labels to DOM ──
  const applyLabels = useCallback(() => {
    if (!devMode || Object.keys(customLabels).length === 0) return;

    const walker = document.createTreeWalker(
      document.querySelector('.main-content') || document.body,
      NodeFilter.SHOW_TEXT, null, false
    );

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = node.textContent.trim();
      // Check all custom labels
      for (const [key, newVal] of Object.entries(customLabels)) {
        const origText = key.split('__').pop();
        if (text === origText && text !== newVal) {
          node.textContent = node.textContent.replace(origText, newVal);
        }
      }
    }
  }, [devMode, customLabels]);

  // Apply labels after renders
  useEffect(() => {
    if (devMode) {
      const timer = setTimeout(applyLabels, 200);
      return () => clearTimeout(timer);
    }
  });

  return (
    <DevModeContext.Provider value={{
      devMode, toggleDevMode,
      getLabel, customLabels, saveLabel, resetLabel, resetAll,
    }}>
      {children}

      {/* Dev mode indicator */}
      {devMode && (
        <div style={{
          position: 'fixed', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
          background: '#667eea', color: 'white', padding: '6px 16px',
          borderRadius: '20px', fontSize: '12px', fontWeight: '600',
          zIndex: 99998, boxShadow: '0 4px 12px rgba(102,126,234,0.4)',
          display: 'flex', alignItems: 'center', gap: '8px',
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
              <h3 style={{ margin: 0, fontSize: '16px' }}>Edit Text</h3>
            </div>
            <p style={{ fontSize: '11px', color: '#999', margin: '0 0 4px' }}>Original: <em>"{editModal.originalText}"</em></p>
            <p style={{ fontSize: '10px', color: '#bbb', margin: '0 0 10px', wordBreak: 'break-all' }}>Key: {editModal.key}</p>
            <input
              value={editModal.value}
              onChange={e => setEditModal({ ...editModal, value: e.target.value })}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  saveLabel(editModal.key, editModal.value);
                  setEditModal(null);
                  setTimeout(applyLabels, 100);
                }
                if (e.key === 'Escape') setEditModal(null);
              }}
              style={{ width: '100%', padding: '10px 12px', border: '2px solid #667eea', borderRadius: '8px', fontSize: '16px', marginBottom: '12px' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => {
                saveLabel(editModal.key, editModal.value);
                setEditModal(null);
                // Force re-apply
                setTimeout(applyLabels, 100);
              }} style={{ flex: 1, padding: '10px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                Save
              </button>
              <button onClick={() => {
                resetLabel(editModal.key);
                setEditModal(null);
              }} style={{ padding: '10px 16px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
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

// Generate a unique key for a DOM element's text
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

// ── Editable wrapper (for explicit use in App.js sidebar) ────────────────────
export function Editable({ id, children, as: Tag = 'span', style = {} }) {
  const { devMode, getLabel } = useDevMode();
  const defaultText = typeof children === 'string' ? children : '';
  const displayText = getLabel(id, defaultText);

  return <Tag style={style}>{displayText || children}</Tag>;
}
