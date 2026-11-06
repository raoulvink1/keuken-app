// Houdt de app beschikbaar als de wifi in de keuken even wegvalt.
const CACHE = "keukenbord-v9";
const BESTANDEN = ["./", "index.html", "css/app.css", "js/app.js", "data/voorbeeld.json", "manifest.webmanifest", "icons/icon.svg"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BESTANDEN))); self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  // Eerst het netwerk (altijd de nieuwste versie), anders de opgeslagen kopie.
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok && new URL(e.request.url).origin === location.origin) { const kopie = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, kopie)); }
    return r;
  }).catch(() => caches.match(e.request)));
});
