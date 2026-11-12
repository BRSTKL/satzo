// Satzo web uygulaması: kabuk dosyaları önbellekten, katalog/altyazı (data.json) önce ağdan
const V = 'satzo-app-1';
const SHELL = ['./', 'index.html', 'feed.css', 'app.css', 'host.js', 'feed.js', 'manifest.webmanifest', 'icons/icon192.png', 'icons/icon180.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  // Her şey önce ağdan (güncellemeler hemen gelsin), ağ yoksa önbellekten
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
});
