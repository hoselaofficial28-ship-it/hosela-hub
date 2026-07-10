const APP_VERSION = '20260710a';
const CACHE_NAME = 'hosela-hub-' + APP_VERSION;
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
    ))
    .then(() => self.clients.claim())
    .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
    .then(clients => Promise.all(clients.map(client => {
      try {
        const url = new URL(client.url);
        if (!url.hostname.includes('github.io')) return undefined;
        if (url.searchParams.get('v') === APP_VERSION && url.searchParams.has('swrefresh')) return undefined;
        url.searchParams.set('v', APP_VERSION);
        url.searchParams.set('swrefresh', Date.now().toString());
        return client.navigate(url.href).catch(() => undefined);
      } catch (e) {
        return undefined;
      }
    })))
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.hostname.includes('script.google.com')) return;
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() => caches.match('./index.html') || caches.match(event.request))
    );
    return;
  }
  if (url.pathname.endsWith('/reset.html') || url.searchParams.get('reset') === '1') {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }
  event.respondWith(
    fetch(event.request, { cache: 'no-store' }).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => undefined);
      return response;
    }).catch(() => caches.match(event.request))
  );
});
