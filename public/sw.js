/* Tapas Reading Cafe — staff dashboard service worker.
 * Phase 0 of the offline-first plan (docs/offline-first-plan.md): the "app shell".
 * Its only job here is to let the UI LOAD with no network. Offline DATA
 * (billing, books) is handled separately by the local SQLite + sync layer.
 *
 * Strategy: network-first for everything same-origin, so development stays
 * fresh (you always get the latest code when online) while a cached copy is
 * kept as a fallback for when the network is gone.
 */
const CACHE = 'tapas-shell-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.json', '/favicon.ico', '/logo192.png', '/logo512.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // Cache each shell file independently so one missing file can't abort install.
      Promise.all(APP_SHELL.map((url) => cache.add(url).catch(() => {})))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // never touch writes (POST/PATCH/etc.)

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // ignore Supabase & other cross-origin calls

  // Leave the dev server's live-reload / HMR machinery alone.
  if (
    url.pathname.startsWith('/ws') ||
    url.pathname.includes('sockjs') ||
    url.pathname.includes('hot-update')
  ) {
    return;
  }

  // Client-side route navigations: try network, fall back to the cached shell offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/').then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  // Static assets (JS/CSS/images): network-first, cache as we go, serve cache offline.
  event.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
        return res;
      })
      .catch(() => caches.match(request))
  );
});
