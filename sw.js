const CACHE = 'keys-v8';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

// install: always pull fresh copies, bypassing the HTTP cache
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(FILES.map(f =>
        fetch(new Request(f, { cache: 'reload' })).then(r => (r.ok ? c.put(f, r) : null)).catch(() => null)
      )))
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

// network-first (3 s timeout) so updates show up immediately; cache is the offline fallback
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const net = await Promise.race([
        fetch(new Request(req.url, { cache: 'no-cache' })),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
      ]);
      if (net && net.ok) cache.put(req, net.clone());
      return net;
    } catch (_) {
      const hit = await cache.match(req, { ignoreSearch: true });
      return hit || Response.error();
    }
  })());
});
