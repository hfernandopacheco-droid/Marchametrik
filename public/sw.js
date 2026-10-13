// LitroMetrik PRO - Service Worker litrometrik-v2.9
const CACHE_VERSION = 'litrometrik-v2.9';
const CACHE_NAME = 'litrometrik-cache-' + CACHE_VERSION;

const ASSETS_TO_CACHE = [
  './',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png',
  './telemetry-worker.js'
];

// Install: Cache essential assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing new service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching essential offline assets...');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[SW] Cache addAll warning:', err);
      });
    })
  );
});

// Activate: Purge ALL previous caches and claim clients
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating new service worker...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting legacy cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch handler: Network-first for app shell, pass-through for APIs & database
self.addEventListener('fetch', (event) => {
  // Only handle GET requests with http/https schemes
  if (event.request.method !== 'GET') return;

  let url;
  try {
    url = new URL(event.request.url);
  } catch (_) {
    return;
  }

  // Always bypass cache for APIs, cloud database, map tiles and external resources
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/route/') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('supabase') ||
    url.hostname.includes('identitytoolkit') ||
    url.hostname.includes('google') ||
    url.hostname.includes('openstreetmap') ||
    url.hostname.includes('cartocdn') ||
    url.hostname.includes('mapbox')
  ) {
    return;
  }

  // Network first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          event.request.method === 'GET' &&
          (url.protocol === 'http:' || url.protocol === 'https:') &&
          !url.pathname.endsWith('.ts') &&
          !url.pathname.endsWith('.tsx')
        ) {
          try {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone).catch(() => {});
            });
          } catch (_) {}
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Listen for messages from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
