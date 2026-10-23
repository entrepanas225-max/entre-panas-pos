/* Service worker: cache-first para que el POS abra sin internet. */
const CACHE = 'entre-panas-v2';
const ARCHIVOS = [
  './',
  'index.html',
  'app.js',
  'assets/estilos.css',
  'assets/icono.svg',
  'manifest.webmanifest'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cacheada => {
      const red = fetch(e.request)
        .then(resp => {
          if (resp && resp.ok && e.request.url.startsWith(self.location.origin)) {
            const copia = resp.clone();
            caches.open(CACHE).then(c => c.put(e.request, copia));
          }
          return resp;
        })
        .catch(() => cacheada || caches.match('index.html'));
      return cacheada || red;
    })
  );
});
