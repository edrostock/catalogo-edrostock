/**
 * ============================================================================
 * SERVICE WORKER DE LA PWA (sw.js)
 * ============================================================================
 * 
 * Gestiona el almacenamiento en caché y permite el funcionamiento offline.
 * 
 * @author Tu Nombre / Desarrollador Full Stack
 * @version 3.1.0
 */

const CACHE_NAME = 'catalogo-v3.1.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './producto.html',
  './css/style.css',
  './js/config.js',
  './js/api.js',
  './js/ui.js',
  './js/filters.js',
  './js/app.js',
  './js/product-detail.js',
  './manifest.json',
  './robots.txt',
  './sitemap.xml',
  './assets/logo.png',
  './assets/favicon.ico',
  './assets/placeholder.png'
];

// 1. Instalación del Service Worker y precarga de archivos estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activación y limpieza de versiones antiguas de caché
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Intercepción de peticiones de red (Network First para API / Stale-While-Revalidate para assets)
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  if (requestUrl.hostname.includes('script.google.com') || requestUrl.hostname.includes('googleusercontent.com')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {});

      return cachedResponse || fetchPromise;
    })
  );
});
