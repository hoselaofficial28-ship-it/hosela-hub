const CACHE_NAME = 'hosela-hub-20260523b';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/manifest.js',
  './js/payroll.js',
  './js/preview.js',
  './assets/logo.png',
  './assets/icon-512.png',
  './manifest.webmanifest'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS).catch(() => undefined))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.hostname.includes('script.google.com')) return;
  if (event.request.method !== 'GET') return;
  if (url.pathname.endsWith('/reset.html') || url.searchParams.get('reset') === '1') {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }
  event.respondWith(
    fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => undefined);
      return response;
    }).catch(() => caches.match(event.request))
  );
});
