/**
 * Service worker: робота без інтернету.
 *  - оболонка сайту (HTML, зібрані JS/CSS, шрифти, іконки) кешується під час встановлення;
 *  - сторінка: спершу мережа, без зв’язку — збережена копія;
 *  - статичні файли: спершу кеш;
 *  - фото страв: кеш із поступовим оновленням (до 80 штук);
 *  - API не кешується тут — дані без зв’язку бере actions.js зі свого знімка.
 * Список файлів і версію підставляє плагін у vite.config.js.
 */
const VERSION = "dev";
const PRECACHE = [];
const SHELL = `shell-${VERSION}`;
const IMAGES = "images-v1";
const MAX_IMAGES = 80;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(["/", ...PRECACHE])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith("shell-") && key !== SHELL) await caches.delete(key);
    await self.clients.claim();
  })());
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(key);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // сторінка: мережа → кеш
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        const cache = await caches.open(SHELL);
        cache.put("/", res.clone());
        return res;
      } catch {
        return (await caches.match("/")) || Response.error();
      }
    })());
    return;
  }

  if (url.origin === location.origin) {
    if (url.pathname.startsWith("/api/")) return; // дані — без кешу SW
    if (/^\/(assets|fonts|icons)\//.test(url.pathname) || url.pathname === "/manifest.webmanifest") {
      event.respondWith((async () => {
        const hit = await caches.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) (await caches.open(SHELL)).put(req, res.clone());
        return res;
      })());
    }
    return;
  }

  // фото страв із Vercel Blob: віддаємо з кешу й оновлюємо у фоні
  if (req.destination === "image" && /blob\.vercel-storage\.com$/.test(url.hostname)) {
    event.respondWith((async () => {
      const cache = await caches.open(IMAGES);
      const hit = await cache.match(req);
      const fresh = fetch(req).then((res) => {
        if (res.ok || res.type === "opaque") cache.put(req, res.clone()).then(() => trim(IMAGES, MAX_IMAGES));
        return res;
      }).catch(() => hit);
      return hit || fresh;
    })());
  }
});
