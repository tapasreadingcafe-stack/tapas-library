/* Offline-first — top-bar sync status light (Phase 0, Step 5).
 * 🟢 Synced · 🟡 Offline / N queued · 🔵 Syncing… so staff always know the
 * state of their (money) data. See docs/offline-first-plan.md.
 */
import React, { useEffect, useState } from 'react';
import { subscribe, refreshPending } from '../offline/status';

// Inject the pulse keyframe once into <head> (not into the pill, so it never
// shows up in the element's text content).
if (typeof document !== 'undefined' && !document.getElementById('tapas-sync-kf')) {
  const el = document.createElement('style');
  el.id = 'tapas-sync-kf';
  el.textContent = '@keyframes tapasSyncPulse{0%,100%{opacity:1}50%{opacity:.3}}';
  document.head.appendChild(el);
}

export default function SyncStatus() {
  const [s, setS] = useState({ online: true, syncing: false, pending: 0, lastSyncedAt: null });

  useEffect(() => {
    const unsub = subscribe(setS);
    refreshPending();
    const iv = setInterval(refreshPending, 4000); // safety net if an event is missed
    return () => { unsub(); clearInterval(iv); };
  }, []);

  let color, label, title;
  if (s.syncing) {
    color = '#3b82f6';
    label = 'Syncing…';
    title = 'Uploading queued changes';
  } else if (!s.online) {
    color = '#f59e0b';
    label = s.pending ? `Offline · ${s.pending}` : 'Offline';
    title = s.pending ? `Working offline — ${s.pending} change(s) queued to sync` : 'Working offline';
  } else if (s.pending) {
    color = '#f59e0b';
    label = `${s.pending} to sync`;
    title = `${s.pending} change(s) waiting to upload`;
  } else {
    color = '#10b981';
    label = 'Synced';
    title = s.lastSyncedAt
      ? `Last synced ${new Date(s.lastSyncedAt).toLocaleTimeString()}`
      : 'Online — all changes saved';
  }

  return (
    <div
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', borderRadius: 999,
        background: 'rgba(120,120,120,0.15)',
        color: 'inherit', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 8, height: 8, borderRadius: '50%', background: color,
          boxShadow: `0 0 0 3px ${color}22`,
          animation: s.syncing ? 'tapasSyncPulse 1s ease-in-out infinite' : 'none',
        }}
      />
      {label}
    </div>
  );
}
