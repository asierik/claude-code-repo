// Minimal service worker. Its only job is to exist with a fetch handler so the
// browser treats MealMate as an installable PWA ("Add to Home screen"). It does
// not cache — requests pass straight through to the network.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {
  // No respondWith → the browser handles the request normally.
});
