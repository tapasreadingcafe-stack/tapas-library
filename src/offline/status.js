/* Offline-first — sync status store (Phase 0, Step 5).
 * A tiny observable so the top-bar indicator can reflect: online/offline,
 * whether a sync is running, and how many changes are still queued.
 *
 * One-directional deps only (status -> localDb), so there are no import cycles:
 * sync.js and billing.js call INTO this; localDb.js knows nothing about it.
 */
import { pendingCount } from './localDb';

const listeners = new Set();
const state = {
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  syncing: false,
  pending: 0,
  lastSyncedAt: null,
};

function emit() {
  const snap = getState();
  listeners.forEach((l) => {
    try { l(snap); } catch (e) { /* ignore listener errors */ }
  });
}

export function getState() {
  return { ...state };
}

export function subscribe(cb) {
  listeners.add(cb);
  cb(getState());
  return () => listeners.delete(cb);
}

/** Recompute the queued-change count from the outbox. */
export async function refreshPending() {
  try {
    state.pending = await pendingCount();
  } catch (e) {
    /* db not ready yet */
  }
  emit();
}

export function setSyncing(v) {
  if (state.syncing !== v) { state.syncing = v; emit(); }
}

export function setOnline(v) {
  if (state.online !== v) { state.online = v; emit(); }
}

export function markSyncedNow() {
  state.lastSyncedAt = Date.now();
  emit();
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => setOnline(true));
  window.addEventListener('offline', () => setOnline(false));
}
