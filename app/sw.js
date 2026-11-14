// Service worker: makes the app load offline and installable.
// Bump VERSION (and APP_VERSION in js/version.js) on every release.
const VERSION = '0.2.0';
const CACHE = `bjj-flow-${VERSION}`;

// Everything needed to run the app with no connection.
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/data.js',
  './js/store.js',
  './js/ratings.js',
  './js/sessions.js',
  './js/ui.js',
  './js/version.js',
  './js/views/home.js',
  './js/views/map.js',
  './js/views/glossary.js',
  './js/views/notes.js',
  './js/views/notes-ui.js',
  './js/views/session-detail.js',
  './js/views/session-edit.js',
  './js/views/game.js',
  './js/views/settings.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k.startsWith('bjj-flow-') && k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

// Stale-while-revalidate: serve from cache instantly (works offline, fast on bad gym wifi),
// then refresh the cached copy in the background so the next load is current.
self.addEventListener('fetch', event=>{
  const req = event.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if(!sameOrigin && !FONT_HOSTS.includes(url.hostname)) return;

  event.respondWith((async ()=>{
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, {ignoreSearch: sameOrigin});
    const network = fetch(req).then(res=>{
      if(res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    }).catch(()=>null);

    if(cached){
      event.waitUntil(network);
      return cached;
    }
    const res = await network;
    if(res) return res;
    if(req.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
    return Response.error();
  })());
});
