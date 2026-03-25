const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const store = {};

export function cacheGet(key) {
  const entry = store[key];
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    delete store[key];
    return null;
  }
  return entry.data;
}

export function cacheSet(key, data) {
  store[key] = { data, ts: Date.now() };
}

export function cacheClear(...keys) {
  if (keys.length === 0) {
    Object.keys(store).forEach(k => delete store[k]);
  } else {
    keys.forEach(k => delete store[k]);
  }
}
