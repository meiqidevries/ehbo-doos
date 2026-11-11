/* EHBO-doos · werkt ook zonder internet.
 * De pagina zelf halen we bij voorkeur vers op (zodat een nieuwe versie meteen zichtbaar is);
 * lukt dat niet, dan komt hij uit de opslag van het toestel. */
var VERSIE = 'ehbo-doos-2026-11-11b';
var SCHIL = ['./', 'index.html', 'app.js', 'kaarten.js', 'live.js', 'qr.js', 'manifest.webmanifest',
  'fonts/fraunces.woff2', 'fonts/plex-sans-400.woff2', 'fonts/plex-sans-500.woff2', 'fonts/plex-mono-500.woff2',
  'icons/favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSIE).then(function (c) { return c.addAll(SCHIL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (namen) {
    return Promise.all(namen.filter(function (n) { return n !== VERSIE; }).map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== self.location.origin) return;   // live sessies en al het andere: niet aankomen
  e.respondWith(
    fetch(r).then(function (antwoord) {
      if (antwoord && antwoord.ok) { var kopie = antwoord.clone(); caches.open(VERSIE).then(function (c) { c.put(r, kopie); }); }
      return antwoord;
    }).catch(function () {
      return caches.match(r, { ignoreSearch: true }).then(function (m) { return m || (r.mode === 'navigate' ? caches.match('index.html') : Response.error()); });
    })
  );
});
