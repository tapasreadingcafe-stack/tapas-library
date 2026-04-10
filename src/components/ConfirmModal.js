import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ConfirmContext = createContext(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be inside ConfirmProvider');
  return ctx;
}

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback(({ title, message, confirmText, cancelText, variant } = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({
        title: title || 'Confirm',
        message: message || 'Are you sure?',
        confirmText: confirmText || (variant === 'danger' ? 'Delete' : 'Confirm'),
        cancelText: cancelText || 'Cancel',
        variant: variant || 'primary', // primary, danger, warning
      });
    });
  }, []);

  const handleConfirm = () => {
    resolveRef.current?.(true);
    setState(null);
  };

  const handleCancel = () => {
    resolveRef.current?.(false);
    setState(null);
  };

  const variantColors = {
    primary: { bg: '#667eea', hover: '#5a6fd6' },
    danger:  { bg: '#ef4444', hover: '#dc2626' },
    warning: { bg: '#f59e0b', hover: '#d97706' },
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999, padding: '20px',
          animation: 'confirmFadeIn 0.15s ease',
        }}>
          <style>{`
            @keyframes confirmFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes confirmSlideIn { from { transform: scale(0.95) translateY(10px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
          `}</style>
          <div style={{
            background: 'white', borderRadius: '16px', maxWidth: '400px', width: '100%',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)', overflow: 'hidden',
            animation: 'confirmSlideIn 0.2s ease',
          }}>
            {/* Header */}
            <div style={{
              padding: '20px 24px 0',
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                background: state.variant === 'danger' ? '#fef2f2' : state.variant === 'warning' ? '#fffbeb' : '#eff6ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
              }}>
                {state.variant === 'danger' ? '🗑️' : state.variant === 'warning' ? '⚠️' : '❓'}
              </div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#111827' }}>
                {state.title}
              </h3>
            </div>

            {/* Body */}
            <div style={{ padding: '14px 24px 20px', fontSize: '14px', color: '#6b7280', lineHeight: 1.5 }}>
              {state.message}
            </div>

            {/* Actions */}
            <div style={{
              padding: '12px 24px 20px', display: 'flex', gap: '10px', justifyContent: 'flex-end',
            }}>
              <button onClick={handleCancel} style={{
                padding: '10px 20px', background: '#f3f4f6', color: '#374151',
                border: 'none', borderRadius: '8px', cursor: 'pointer',
                fontWeight: '600', fontSize: '14px', transition: 'all 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = '#e5e7eb'}
                onMouseLeave={e => e.currentTarget.style.background = '#f3f4f6'}
              >
                {state.cancelText}
              </button>
              <button onClick={handleConfirm} style={{
                padding: '10px 20px',
                background: variantColors[state.variant]?.bg || '#667eea',
                color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer',
                fontWeight: '700', fontSize: '14px', transition: 'all 0.15s',
                boxShadow: `0 2px 8px ${variantColors[state.variant]?.bg || '#667eea'}44`,
              }}
                onMouseEnter={e => e.currentTarget.style.background = variantColors[state.variant]?.hover || '#5a6fd6'}
                onMouseLeave={e => e.currentTarget.style.background = variantColors[state.variant]?.bg || '#667eea'}
              >
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
