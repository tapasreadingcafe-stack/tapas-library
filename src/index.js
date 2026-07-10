import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmModal';
import { ThemeProvider } from './components/ThemeProvider';
import { DevModeProvider } from './components/DevMode';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './offline/localDb'; // offline-first: initialize the on-device database
import { startSync } from './offline/sync'; // offline-first: sync engine

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Router>
      <ThemeProvider>
        <DevModeProvider>
          <ToastProvider>
            <ConfirmProvider>
              <AuthProvider>
                <App />
              </AuthProvider>
            </ConfirmProvider>
          </ToastProvider>
        </DevModeProvider>
      </ThemeProvider>
    </Router>
  </React.StrictMode>
);

// Offline-first (Phase 0): register the app-shell service worker and ask the
// browser to keep our local data durable so queued bills aren't evicted.
// See docs/offline-first-plan.md.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {});
    }
  });
}

// Replay any bills queued while offline once the network is back. An empty
// outbox makes each tick a no-op (no network calls), so this is inert until a
// bill is actually saved offline.
startSync();