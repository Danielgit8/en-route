// Offline-Speicher für En route. Seite, Code und Inhalte zuerst aus dem Netz (Updates kommen sofort an),
// offline aus dem Speicher. Audio und Schriften ändern sich nicht: zuerst aus dem Speicher.
const CACHE = "en-route-v1";
const SHELL = ["./", "./index.html", "./app.css", "./app.js", "./supabase.js", "./manifest.webmanifest", "./content/etappen.json", "./content/audio.json", "./icon.svg"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.hostname.endsWith("supabase.co")) return;
  const fest = u.pathname.includes("/audio/") || u.hostname.includes("fonts.g");
  if (fest) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok || r.type === "opaque") { const k = r.clone(); caches.open(CACHE).then(c => c.put(e.request, k)); } return r; })));
    return;
  }
  e.respondWith(fetch(e.request).then(r => { if (r.ok && u.origin === location.origin) { const k = r.clone(); caches.open(CACHE).then(c => c.put(e.request, k)); } return r; })
    .catch(() => caches.match(e.request).then(hit => hit || caches.match("./index.html"))));
});
