// LegalLink service worker — installability + basic offline support + Web Push
// (incoming-call notifications that wake a closed app).
// Bump CACHE when changing precached assets to invalidate old caches.
const CACHE = 'legallink-v2';
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

  // Local development: never serve from cache — always hit the network so a rebuild
  // shows up immediately instead of a stale cached page/asset.
  if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') return;

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

// ── Web Push: incoming-call notification (wakes a closed app) ─────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  if (data.type !== 'incoming-call') return;

  event.waitUntil(
    (async () => {
      // If an app window is already open AND visible, the in-app ring handles it —
      // don't double-alert with a system notification.
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const isVisible = windows.some((c) => c.visibilityState === 'visible');
      if (isVisible) return;

      const isVideo = data.mode === 'video';
      const title = data.fromName || 'Incoming call';
      await self.registration.showNotification(title, {
        body: `Incoming ${isVideo ? 'video' : 'voice'} call`,
        tag: 'incoming-call', // a re-ring replaces, never stacks
        renotify: true,
        requireInteraction: true, // stays until acted on (Android/desktop)
        icon: data.fromAvatar || '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [350, 250, 350],
        data: { callId: data.callId, consultationId: data.consultationId },
        actions: [
          { action: 'answer', title: 'Answer' },
          { action: 'decline', title: 'Decline' },
        ],
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  const info = event.notification.data || {};
  const action = event.action;
  event.notification.close();

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

      if (action === 'decline') {
        // Reaches the app only if a window is open; otherwise the call just times out.
        for (const c of windows) c.postMessage({ type: 'call-decline', callId: info.callId });
        return;
      }

      // "Answer" or a body tap: focus an existing window (or open one). The app
      // re-rings via its `call:pending` check on (re)connect, then the user accepts.
      const existing = windows.find((c) => 'focus' in c);
      if (existing) {
        await existing.focus();
        existing.postMessage({ type: 'call-focus', callId: info.callId });
      } else if (self.clients.openWindow) {
        await self.clients.openWindow('/');
      }
    })(),
  );
});
