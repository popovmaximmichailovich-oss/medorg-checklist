/* service-worker.js
   Чек-лист визуальной самооценки износа здания медицинской организации
   Версия кэша: v20
*/

const CACHE_NAME = "medorg-checklist-v20";

const APP_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// Установка service worker и первичное кэширование файлов приложения
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(function (cache) {
        return cache.addAll(APP_ASSETS);
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

// Активация service worker и удаление старых кэшей
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (cacheNames) {
        return Promise.all(
          cacheNames.map(function (cacheName) {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
            return Promise.resolve();
          })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

// Обработка запросов.
// Для HTML используем стратегию network-first, чтобы GitHub Pages быстрее отдавал новую версию.
// Для иконок и статических файлов — cache-first с резервной загрузкой из сети.
self.addEventListener("fetch", function (event) {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Не перехватываем сторонние запросы
  if (url.origin !== self.location.origin) {
    return;
  }

  // Для index.html и навигации — сначала сеть, потом кэш
  if (
    request.mode === "navigate" ||
    url.pathname.endsWith("/") ||
    url.pathname.endsWith("/index.html")
  ) {
    event.respondWith(
      fetch(request)
        .then(function (networkResponse) {
          return caches.open(CACHE_NAME).then(function (cache) {
            cache.put("./index.html", networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(function () {
          return caches.match("./index.html");
        })
    );
    return;
  }

  // Для manifest.webmanifest — сначала сеть, потом кэш
  if (url.pathname.endsWith("/manifest.webmanifest")) {
    event.respondWith(
      fetch(request)
        .then(function (networkResponse) {
          return caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(function () {
          return caches.match(request);
        })
    );
    return;
  }

  // Для иконок и прочих статических файлов — сначала кэш, потом сеть
  event.respondWith(
    caches.match(request).then(function (cachedResponse) {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then(function (networkResponse) {
        return caches.open(CACHE_NAME).then(function (cache) {
          cache.put(request, networkResponse.clone());
          return networkResponse;
        });
      });
    })
  );
});
