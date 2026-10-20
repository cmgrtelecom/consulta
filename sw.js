// CR Telecom Consulta — service worker (permite instalar como app e receber notificações da pré-venda).
// Só guarda a própria página para abrir sem rede; os dados (Supabase) vão sempre à rede.
const CACHE = "cr-consulta-v18";
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

// ---------- notificações da pré-venda (enviadas pela função "prevenda" do Supabase)
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: "CR Telecom", body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "CR Telecom · Pré-venda", {
    body: d.body || "", tag: d.tag || undefined, renotify: !!d.tag, icon: "./icon-192.png", badge: "./icon-192.png",
    data: { url: d.url || "./" }, vibrate: [120, 60, 120],
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "./", self.registration.scope).href;
  const id = (/#pv=([0-9a-f-]{36})/i.exec(url) || [])[1];
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    for (const c of cs) if (c.url.startsWith(self.registration.scope)) { c.postMessage({ pv: id }); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
