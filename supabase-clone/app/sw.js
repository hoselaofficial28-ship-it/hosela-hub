const APP_VERSION = '20261017a';
const CACHE_NAME = 'hosela-hub-' + APP_VERSION;
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/dashboard-reports.js',
  './js/mock-backend.js',
  './js/payroll.js',
  './js/photo-storage.js',
  './js/preview.js',
  './js/real-backend.js',
  './js/supabase-client.js',
  './assets/logo.png',
  './assets/logo-icon.svg',
  './assets/icon-512.png',
  './manifest.webmanifest'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
