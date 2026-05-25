const CACHE = 'villa-jardines-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/main.css',
  '/js/config.js',
  '/js/utils.js',
  '/js/modal.js',
  '/js/auth.js',
  '/js/app.js',
  '/js/admin/index.js',
  '/js/admin/inicio.js',
  '/js/admin/asistencia.js',
  '/js/admin/vecinos.js',
  '/js/admin/pagos.js',
  '/js/admin/documentos.js',
  '/js/vecino/index.js',
  '/js/vecino/inicio.js',
  '/js/vecino/faltas.js',
  '/js/vecino/pagos.js',
  '/js/vecino/documentos.js',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Solo interceptar navegación y assets estáticos, NO las llamadas a Supabase
  const url = new URL(e.request.url);
  if (url.hostname.includes('supabase') || url.hostname.includes('googleapis') || url.hostname.includes('jsdelivr')) {
    return; // dejar pasar directo
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => caches.match('/index.html')))
  );
});
