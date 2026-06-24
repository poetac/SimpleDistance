// Minimal offline-first service worker for SimpleDistance.
// Strategy: stale-while-revalidate for same-origin GET requests, with a
// cached navigation fallback so the app shell loads offline after a first
// online visit. All user data already lives in IndexedDB (no network needed).

const CACHE = "simpledistance-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok && res.type === "basic") cache.put(req, res.clone());
          return res;
        })
        .catch(() => undefined);

      // Serve cache immediately when present; otherwise wait for the network.
      const fresh = network;
      if (cached) {
        fresh.catch(() => {});
        return cached;
      }
      const res = await fresh;
      if (res) return res;

      // Offline and uncached: fall back to the cached app shell for navigations.
      if (req.mode === "navigate") {
        const shell = await cache.match("/");
        if (shell) return shell;
      }
      return new Response("Offline", { status: 503, statusText: "Offline" });
    })(),
  );
});
