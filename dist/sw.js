/* Offline app shell. Build replaces 242648e54b617d34 with a source-content hash. */
const VERSION = '242648e54b617d34';
const SCOPE_KEY = encodeURIComponent(new URL(self.registration.scope).pathname);
const CACHE_PREFIX = `weektable:${SCOPE_KEY}:`;
const CACHE_NAME = `${CACHE_PREFIX}${VERSION}`;
const REQUIRED_FILES = [
  './', './index.html', './src/app.js', './src/core.js', './src/storage.js', './src/styles.css',
  './data/recipes.json', './manifest.webmanifest',
  './assets/icon-180.png', './assets/icon-192.png', './assets/icon-512.png',
  './assets/icon-maskable-512.png', './assets/icon.svg'
];
const scoped = path => new URL(path, self.registration.scope).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // No activation until the whole minimum offline shell is present.
    await cache.addAll(REQUIRED_FILES.map(scoped));
    try {
      const response = await fetch(scoped('./offline-assets.json'), { cache: 'no-store' });
      if (response.ok) {
        const manifest = await response.json();
        const paths = Array.isArray(manifest.assets) ? manifest.assets : [];
        const optional = paths.filter(path => typeof path === 'string' && path.startsWith('./assets/'));
        await Promise.allSettled(optional.map(path => cache.add(scoped(path))));
      }
    } catch (_) { /* The source checkout works without a build manifest. */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  if (request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      // A consistent cached shell is used until a new service worker installs.
      const cached = await cache.match(scoped('./index.html'));
      return cached || fetch(request);
    })());
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const response = await fetch(request);
    // Personal data is in IndexedDB; no API data or external photos is cached.
    if (response.ok && /^\/(?:.*\/)?(?:assets|src|data)\//.test(url.pathname)) {
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
