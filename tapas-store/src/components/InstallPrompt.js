import React, { useEffect, useState } from 'react';

// =====================================================================
// InstallPrompt — dismissible banner that appears after the 2nd visit
// when the browser has offered a PWA install.
//
// beforeinstallprompt is captured once at module load (before React
// mounts) so we don't miss the event on fast loads; the stored prompt
// is handed off to whichever InstallPrompt instance mounts first.
// =====================================================================

let deferredPrompt = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });
}

const VISIT_KEY = 'tapas_store_visit_count';
const DISMISS_KEY = 'tapas_store_install_dismissed_at';
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Bump visit count.
    try {
      const n = parseInt(localStorage.getItem(VISIT_KEY) || '0', 10) + 1;
      localStorage.setItem(VISIT_KEY, String(n));

      const dismissedAt = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
      const cooledDown = !dismissedAt || (Date.now() - dismissedAt) > DISMISS_COOLDOWN_MS;

      const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
      if (standalone) { setInstalled(true); return; }

      if (n >= 2 && cooledDown) {
        // Wait a tick for the browser to fire beforeinstallprompt if it hasn't.
        setTimeout(() => {
          if (deferredPrompt) setVisible(true);
        }, 600);
      }
    } catch {}

    const installedHandler = () => { setInstalled(true); setVisible(false); };
    window.addEventListener('appinstalled', installedHandler);
    return () => window.removeEventListener('appinstalled', installedHandler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice.catch(() => null);
    if (choice?.outcome === 'accepted') {
      setInstalled(true);
    }
    setVisible(false);
    deferredPrompt = null;
  };

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setVisible(false);
  };

  if (installed || !visible) return null;

  return (
    <div style={{
      position: 'fixed', left: 16, right: 16, bottom: 16,
      maxWidth: 420, margin: '0 auto',
      background: 'var(--bg-card, #ede8d0)',
      color: 'var(--text, #26170c)',
      borderRadius: 14,
      padding: '14px 16px',
      boxShadow: '0 12px 36px rgba(38,23,12,0.22)',
      display: 'flex', alignItems: 'center', gap: 12,
      zIndex: 9999,
      fontFamily: 'var(--font-body)',
    }}>
      <span style={{ fontSize: 24 }}>📚</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
          Install Tapas
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted, #5c4a3a)' }}>
          Faster browsing, offline access, order updates.
        </div>
      </div>
      <button onClick={install} style={{
        background: 'var(--secondary, #006a6a)', color: '#fff', border: 'none',
        borderRadius: 10, padding: '8px 14px',
        fontWeight: 700, fontSize: 13, cursor: 'pointer',
      }}>Install</button>
      <button onClick={dismiss} aria-label="Dismiss" style={{
        background: 'transparent', border: 'none',
        color: 'var(--text-subtle, #8b7355)', cursor: 'pointer', fontSize: 18,
        padding: 4,
      }}>×</button>
    </div>
  );
}
