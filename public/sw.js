const CACHE_NAME = 'nexapos-shell-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/nexapos-mark.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  // Never cache API/auth requests or cross-origin traffic: POS data must stay fresh.
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/.netlify/') || url.pathname.startsWith('/rest/') || url.pathname.startsWith('/auth/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/index.html')));
    return;
  }
  if (['script', 'style', 'image', 'font'].includes(request.destination)) {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    }).catch(() => caches.match(request)));
  }
});
