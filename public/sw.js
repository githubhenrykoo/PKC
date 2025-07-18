// Service Worker for PKC PWA
self.addEventListener('install', (event) => {
  // Skip waiting to activate the new service worker immediately
  self.skipWaiting();
  
  // Cache important files
  event.waitUntil(
    caches.open('pkc-cache-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/global.css',
        '/icons/icon-192x192.png',
        '/icons/icon-512x512.png'
      ]);
    })
  );
});

// Serve cached content when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
