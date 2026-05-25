const CACHE = 'villa-jardines-v2';
const SHELL = [
  './', './index.html', './manifest.json', './icon.svg', './css/main.css',
  './js/config.js', './js/utils.js', './js/modal.js', './js/auth.js', './js/app.js',
  './js/admin/inicio.js', './js/admin/asistencia.js', './js/admin/vecinos.js',
  './js/admin/pagos.js', './js/admin/documentos.js', './js/admin/index.js',
  './js/vecino/inicio.js', './js/vecino/faltas.js', './js/vecino/pagos.js',
  './js/vecino/documentos.js', './js/vecino/index.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('supabase.co') || e.request.url.includes('googleapis')) return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
