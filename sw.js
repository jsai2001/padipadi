// PadiPadi service worker: keeps the whole app on the device so it works offline.
// `python3 build.py` rewrites VERSION from a hash of the SHELL files, so every content
// change ships as a new cache and old caches are deleted on activate.
const VERSION = "pp-65d1cf114b";
const FONT_CACHE = "pp-fonts";
const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./data.js",
  "./js/lexicon.js",
  "./js/lexicon-te.js",
  "./js/builder.js",
  "./js/app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
];

self.addEventListener("install", (event) => {
  // cache: "reload" skips the HTTP cache so a new version never stores stale files.
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(SHELL.map((url) => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== FONT_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "version") event.source.postMessage({ version: VERSION });
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Google Fonts: serve the saved copy, refresh it in the background.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        const fresh = fetch(req)
          .then((res) => { if (res.ok || res.type === "opaque") cache.put(req, res.clone()); return res; })
          .catch(() => hit);
        return hit || fresh;
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // App files: cache first (they are versioned as a set), network as a fallback.
  // Page loads fall back to the cached index.html, so any #/route opens offline.
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).catch(() =>
        req.mode === "navigate" ? caches.match("./index.html") : Response.error()
      );
    })
  );
});
