// This file is overwritten by VitePWA's workbox-generated sw.js during build.
// Fallback: clears all old caches and forces update.
globalThis.addEventListener('install', () => globalThis.skipWaiting());
globalThis.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => globalThis.clients.claim())
  );
});
