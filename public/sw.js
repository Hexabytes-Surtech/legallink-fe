// LegalLink service worker — enables installability + basic offline support.
// Bump CACHE when changing precached assets to invalidate old caches.
const CACHE = 'legallink-v1';
const OFFLINE_URL = '/offline.html';
const PRECACHE = [OFFLINE_URL, '/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Only handle same-origin requests — never intercept the API (different origin)
  // or any cross-origin resource.
  if (url.origin !== self.location.origin) return;

  // Page navigations: network-first, fall back to the offline page when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(CACHE);
          return (await cache.match(OFFLINE_URL)) || Response.error();
        }
      })(),
    );
    return;
  }

  // Static build assets, images and fonts: cache-first for speed/offline.
  const isStatic =
    url.pathname.startsWith('/_next/static') ||
    /\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?)$/.test(url.pathname);

  if (isStatic) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const net = await fetch(request);
          if (net.ok) cache.put(request, net.clone());
          return net;
        } catch {
          return cached || Response.error();
        }
      })(),
    );
  }
});
