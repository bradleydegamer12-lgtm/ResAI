var CACHE_NAME = 'resumeai-v1';
var PRECACHE = ['/', '/index.html', '/css/styles.css'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE_NAME).then(function (c) { return c.addAll(PRECACHE); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  if (e.request.url.indexOf('firebaseio.com') >= 0) return;
  if (e.request.url.indexOf('googleapis.com') >= 0) return;
  if (e.request.url.indexOf('gstatic.com') >= 0) return;

  e.respondWith(
    fetch(e.request).then(function (r) {
      var clone = r.clone();
      caches.open(CACHE_NAME).then(function (c) { c.put(e.request, clone); });
      return r;
    }).catch(function () {
      return caches.match(e.request);
    })
  );
});
