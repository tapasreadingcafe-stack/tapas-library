import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

const ToastContext = createContext();

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur),
    warning: (msg, dur) => addToast(msg, 'warning', dur),
    info: (msg, dur) => addToast(msg, 'info', dur),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, removeToast }) {
  return (
    <div style={{
      position: 'fixed', top: '70px', right: '20px', zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '380px', width: '100%',
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onClose, 300);
    }, toast.duration || 3000);
    return () => clearTimeout(timer);
  }, [toast.duration, onClose]);

  const config = {
    success: { bg: '#d4edda', border: '#28a745', color: '#155724', icon: '✓' },
    error:   { bg: '#f8d7da', border: '#dc3545', color: '#721c24', icon: '✕' },
    warning: { bg: '#fff3cd', border: '#ffc107', color: '#856404', icon: '!' },
    info:    { bg: '#d1ecf1', border: '#17a2b8', color: '#0c5460', icon: 'i' },
  }[toast.type] || { bg: '#d4edda', border: '#28a745', color: '#155724', icon: '✓' };

  return (
    <div style={{
      background: config.bg, borderLeft: `4px solid ${config.border}`, color: config.color,
      padding: '12px 16px', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      display: 'flex', alignItems: 'center', gap: '10px', pointerEvents: 'auto',
      transform: visible && !exiting ? 'translateX(0)' : 'translateX(120%)',
      opacity: visible && !exiting ? 1 : 0,
      transition: 'all 0.3s ease',
    }}>
      <span style={{
        width: '24px', height: '24px', borderRadius: '50%', background: config.border,
        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '13px', fontWeight: '700', flexShrink: 0,
      }}>
        {config.icon}
      </span>
      <span style={{ flex: 1, fontSize: '14px', fontWeight: '500', lineHeight: '1.3' }}>{toast.message}</span>
      <button onClick={() => { setExiting(true); setTimeout(onClose, 300); }}
        style={{ background: 'none', border: 'none', color: config.color, cursor: 'pointer', fontSize: '18px', padding: '0 2px', opacity: 0.6 }}>
        ×
      </button>
    </div>
  );
}
