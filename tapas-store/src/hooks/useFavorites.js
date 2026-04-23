import { useCallback, useEffect, useSyncExternalStore } from 'react';

// Per-browser favorites, persisted in localStorage. Not tied to auth —
// when we later add a member-scoped favorites table in Supabase, this
// hook is the swap point.

const STORAGE_KEY = 'tapas_favorites_v1';

const readSet = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
};

// useSyncExternalStore wants a stable snapshot. We cache a JSON string
// so repeat reads with no changes return the same reference — avoids
// tearing the subtree on every render.
let cache = { json: null, set: new Set() };
const emitters = new Set();

function refresh() {
  const next = readSet();
  const json = JSON.stringify([...next]);
  if (json !== cache.json) {
    cache = { json, set: next };
    emitters.forEach((fn) => fn());
  }
}

function subscribe(onChange) {
  emitters.add(onChange);
  const storageListener = (e) => { if (e.key === STORAGE_KEY) refresh(); };
  window.addEventListener('storage', storageListener);
  return () => {
    emitters.delete(onChange);
    window.removeEventListener('storage', storageListener);
  };
}

function getSnapshot() {
  if (cache.json === null) refresh();
  return cache.json;
}

export function useFavorites() {
  // Subscribing to the JSON string avoids re-rendering every consumer
  // every time a different consumer toggles a book — they only
  // re-render when the favorites list changes.
  useSyncExternalStore(subscribe, getSnapshot, () => '[]');
  // Force refresh on mount so the first render doesn't miss a write
  // that happened before the subscription started.
  useEffect(() => { refresh(); }, []);

  const isFavorite = useCallback((id) => cache.set.has(id), []);

  const toggleFavorite = useCallback((id) => {
    const next = new Set(cache.set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch (err) {
      console.warn('[favorites] persist failed', err);
    }
    refresh();
  }, []);

  return { isFavorite, toggleFavorite };
}
