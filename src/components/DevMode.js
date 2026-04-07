import React, { createContext, useContext, useState, useEffect } from 'react';

const DevModeContext = createContext();

export function useDevMode() {
  return useContext(DevModeContext);
}

// Load custom labels from localStorage
function loadCustomLabels() {
  try {
    const saved = localStorage.getItem('dev_custom_labels');
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
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
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    localStorage.setItem('dev_mode', devMode ? 'true' : 'false');
  }, [devMode]);

  const toggleDevMode = () => setDevMode(prev => !prev);

  const getLabel = (key, defaultLabel) => {
    return customLabels[key] || defaultLabel;
  };

  const startEdit = (key, currentValue) => {
    setEditingKey(key);
    setEditValue(currentValue);
  };

  const saveEdit = () => {
    if (editingKey) {
      const updated = { ...customLabels, [editingKey]: editValue };
      setCustomLabels(updated);
      saveCustomLabels(updated);
      setEditingKey(null);
      setEditValue('');
    }
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditValue('');
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

  return (
    <DevModeContext.Provider value={{
      devMode, toggleDevMode,
      getLabel, customLabels,
      startEdit, saveEdit, cancelEdit, resetLabel, resetAll,
      editingKey, editValue, setEditValue,
    }}>
      {children}
      {/* Floating edit modal */}
      {editingKey && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999,
        }} onClick={cancelEdit}>
          <div style={{
            background: 'white', borderRadius: '12px', padding: '20px', maxWidth: '400px', width: '90%',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', color: '#667eea' }}>🛠 Edit Label</h3>
            <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#999' }}>Key: <code style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '3px' }}>{editingKey}</code></p>
            <input
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
              style={{ width: '100%', padding: '10px 12px', border: '2px solid #667eea', borderRadius: '8px', fontSize: '15px', marginBottom: '12px' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={saveEdit} style={{ flex: 1, padding: '10px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Save</button>
              <button onClick={() => { resetLabel(editingKey); cancelEdit(); }} style={{ padding: '10px 14px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Reset</button>
              <button onClick={cancelEdit} style={{ padding: '10px 14px', background: '#e0e0e0', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </DevModeContext.Provider>
  );
}

// ── Editable component — wraps any text that can be customized in dev mode ───
export function Editable({ id, children, as: Tag = 'span', style = {} }) {
  const { devMode, getLabel, startEdit } = useDevMode();
  const defaultText = typeof children === 'string' ? children : '';
  const displayText = getLabel(id, defaultText);

  if (!devMode) {
    return <Tag style={style}>{displayText || children}</Tag>;
  }

  return (
    <Tag
      style={{
        ...style,
        position: 'relative',
        cursor: 'pointer',
        outline: '1px dashed #667eea40',
        outlineOffset: '2px',
        borderRadius: '3px',
      }}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        startEdit(id, displayText || defaultText);
      }}
      title="Click to edit (Dev Mode)"
    >
      {displayText || children}
      <span style={{
        position: 'absolute', top: '-8px', right: '-8px',
        width: '16px', height: '16px', borderRadius: '50%',
        background: '#667eea', color: 'white',
        fontSize: '9px', fontWeight: '700',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        pointerEvents: 'none',
      }}>✎</span>
    </Tag>
  );
}
