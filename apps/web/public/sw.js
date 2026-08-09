/* CafeOS Edge — PWA service worker.
 *
 * Offline-first but NOT a client-side master database: PostgreSQL on the Edge
 * remains the source of truth. This worker only caches static application
 * assets so the tablet UI can survive refresh/network interruptions and be
 * installed as an app.
 */
const CACHE = 'cafeos-edge-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['/', '/manifest.webmanifest', '/icon.svg'])),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept API traffic — those must always hit the Edge API.
  if (url.pathname.startsWith('/api/')) return;
  if (request.method !== 'GET') return;

  // App shell / static assets: cache-first with network fallback.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((resp) => {
          if (resp.ok && url.origin === self.location.origin) {
            const copy = resp.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return resp;
        }),
    ),
  );
});
