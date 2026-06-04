/*
 * PlotVerse service worker (Req 40.1).
 *
 * A service worker registration is one of the browser prerequisites for the
 * "Add to Home Screen" / installability prompt. This worker is intentionally
 * minimal and conservative: it takes control quickly and uses a network-first
 * passthrough for navigation requests, never caching API or Firebase traffic.
 * Keeping it simple avoids serving stale app data while still satisfying the
 * installability requirement.
 */

const CACHE_NAME = "plotverse-static-v1";

// Activate a freshly installed worker immediately rather than waiting for all
// existing tabs to close.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Claim open clients and clean up any caches from previous versions.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

// Network-first passthrough. We only ever read/write the cache for navigation
// (HTML document) requests, and we fall back to a cached shell only when the
// network is unavailable. All other requests (API calls, Firebase, assets) are
// passed straight through to the network untouched.
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle same-origin GET navigations; let everything else hit the
  // network directly so we never interfere with real-time/API traffic.
  if (request.method !== "GET" || request.mode !== "navigate") {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(request);
        // Cache a copy of successful navigations for offline fallback.
        if (networkResponse && networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        const cached = await caches.match(request);
        if (cached) {
          return cached;
        }
        throw error;
      }
    })()
  );
});
