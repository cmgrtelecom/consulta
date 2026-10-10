// CR Telecom Consulta — service worker (permite instalar como app).
// Só guarda a própria página para abrir sem rede; os dados (Supabase) vão sempre à rede.
const CACHE = "cr-consulta-v9";
const BASE = ["./", "./index.html", "./manifest.webmanifest?v=2", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== self.location.origin) return;  // Supabase, CDNs: direto à rede
  e.respondWith(
    fetch(r).then((resp) => {
      if (resp.ok) { const cp = resp.clone(); caches.open(CACHE).then((c) => c.put(r, cp)); }
      return resp;
    }).catch(() => caches.match(r).then((m) => m || caches.match("./index.html")))
  );
});
